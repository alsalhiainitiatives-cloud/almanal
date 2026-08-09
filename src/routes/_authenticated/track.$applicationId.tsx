import { useMemo, useState } from "react";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import qrcode from "qrcode-generator";
import { Archive, GraduationCap, Loader2, Printer, ScanLine, XCircle } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { school } from "@/data/site";
import { PortalLayout } from "@/features/auth/components/PortalLayout";
import {
  getApplication,
  withdrawApplicationFn,
} from "@/features/admissions/application.functions";
import {
  ApplicationStepper,
  ApplicationTimeline,
} from "@/features/admissions/components/ApplicationJourney";
import {
  APPLICATION_STATUS_COLORS,
  APPLICATION_STATUS_LABELS,
  QURRA_STATUS_LABELS,
} from "@/features/admissions/eligibility";

export const Route = createFileRoute("/_authenticated/track/$applicationId")({
  head: () => ({
    meta: [
      { title: "تتبع طلب القبول | مدارس وروضة المنال" },
      { name: "description", content: "تابع حالة طلب القبول والخط الزمني للإجراءات." },
      { name: "robots", content: "noindex" },
    ],
  }),
  errorComponent: () => (
    <div className="section-y text-center">
      <p className="text-xl font-black text-foreground">تعذّر فتح الطلب</p>
      <Button asChild variant="hero" className="mt-6">
        <Link to="/my-applications">طلباتي</Link>
      </Button>
    </div>
  ),
  component: TrackPage,
});

function qrDataUrl(text: string) {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  return qr.createDataURL(5, 8);
}

function TrackPage() {
  const { applicationId } = Route.useParams();
  const fetchApplication = useServerFn(getApplication);
  const withdraw = useServerFn(withdrawApplicationFn);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const appQuery = useMemo(
    () =>
      queryOptions({
        queryKey: ["application", applicationId],
        queryFn: () => fetchApplication({ data: applicationId }),
      }),
    [applicationId, fetchApplication],
  );
  const { data: bundle } = useSuspenseQuery(appQuery);
  const app = bundle.application;

  const isWithdrawn = app.status === "withdrawn";
  const isClosed = ["withdrawn", "rejected", "approved"].includes(app.status);
  const canWithdraw = !isClosed;
  const printedAt = new Date().toLocaleString("ar-SA", { dateStyle: "long", timeStyle: "short" });
  const appNumber = app.application_number ?? app.tracking_number ?? "—";

  const trackUrl = useMemo(() => {
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    return app.application_number && app.track_token
      ? `${origin}/track?no=${encodeURIComponent(app.application_number)}&t=${encodeURIComponent(app.track_token)}`
      : `${origin}/track/${applicationId}`;
  }, [app.application_number, app.track_token, applicationId]);
  const qr = qrDataUrl(trackUrl);

  async function handleWithdraw() {
    setBusy(true);
    try {
      await withdraw({ data: applicationId });
      await queryClient.invalidateQueries({ queryKey: ["application", applicationId] });
      await queryClient.invalidateQueries({ queryKey: ["my-applications"] });
      toast.success("تم إلغاء الطلب وسحب التسجيل");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر سحب الطلب");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PortalLayout
      title="تتبع طلب القبول"
      description="تابع حالة طلبك خطوة بخطوة، واطبع نسخة رسمية من الطلب في أي وقت."
    >
      <div className="space-y-6">
        {/* Print-only letterhead */}
        <div className="print-only mb-6 border-b-2 border-black/70 pb-4">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-lg font-black">{school.name}</p>
              <p className="text-xs">{school.organization}</p>
              <p className="text-xs">
                {school.address.district} — {school.address.city} · {school.phone}
              </p>
            </div>
            <div className="text-left">
              <p className="text-base font-black">نموذج طلب قبول</p>
              <p className="text-xs" dir="ltr">
                {appNumber}
              </p>
              <p className="text-xs">العام الدراسي {app.academic_year}</p>
            </div>
          </div>
        </div>

        {isWithdrawn ? (
          <div className="print-avoid-break flex items-start gap-4 rounded-[2rem] border border-destructive/25 bg-destructive/10 p-6">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-destructive/15 text-destructive">
              <Archive className="size-5" />
            </span>
            <div>
              <p className="text-base font-black text-destructive">تم إلغاء هذا الطلب</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                تم سحب التسجيل وتحرير المقعد المحجوز، ولم يعد بالإمكان تعديل هذا الطلب أو متابعته.
                إذا رغبت في التسجيل مرة أخرى، يلزم تقديم طلب قبول جديد.
              </p>
              <Button asChild variant="soft" className="mt-4 no-print">
                <Link to="/admissions">تقديم طلب جديد</Link>
              </Button>
            </div>
          </div>
        ) : null}

        {/* Summary card */}
        <div className="print-sheet print-avoid-break rounded-[2.5rem] bg-card p-6 shadow-card sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${
                    APPLICATION_STATUS_COLORS[app.status] ?? "bg-beige text-foreground"
                  }`}
                >
                  {APPLICATION_STATUS_LABELS[app.status] ?? app.status}
                </span>
                <span className="text-xs font-bold text-muted-foreground">
                  آخر تحديث: {new Date(app.updated_at).toLocaleDateString("ar-SA")}
                </span>
              </div>
              <p className="mt-4 text-xs font-bold text-muted-foreground">الرقم الأكاديمي / رقم الطلب</p>
              <p className="text-2xl font-black tracking-wide text-primary" dir="ltr">
                {appNumber}
              </p>
              {app.track_token ? (
                <div className="mt-3 rounded-2xl bg-beige/70 px-4 py-3">
                  <p className="text-xs font-bold text-muted-foreground">
                    رمز التحقق للتتبع السريع (بدون تسجيل دخول)
                  </p>
                  <p className="mt-1 break-all text-sm font-black text-foreground" dir="ltr">
                    {app.track_token}
                  </p>
                </div>
              ) : null}

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Info label="العام الدراسي" value={app.academic_year} />
                <Info
                  label="الإجمالي التقديري"
                  value={`${Number(app.grand_total).toLocaleString("ar-SA")} ر.س`}
                />
                {bundle.qurra ? (
                  <Info
                    label="دعم قرة"
                    value={QURRA_STATUS_LABELS[bundle.qurra.status] ?? bundle.qurra.status}
                  />
                ) : null}
                {bundle.children.length > 0 ? (
                  <Info
                    label={bundle.children.length > 1 ? "الأبناء" : "الطالب"}
                    value={bundle.children.map((c) => c.name_ar).join(" · ")}
                  />
                ) : null}
              </div>
            </div>

            <div className="print-avoid-break mx-auto w-full max-w-[15rem] shrink-0 rounded-[2rem] border border-border/60 bg-beige/40 p-5 text-center lg:mx-0">
              <img
                src={qr}
                alt="رمز QR لفتح صفحة تتبع الطلب"
                className="mx-auto size-32 rounded-xl bg-card p-1"
              />
              <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                <ScanLine className="size-3.5" />
                امسح الرمز لفتح صفحة التتبع
              </p>
              <p className="mt-1 break-all text-[10px] leading-relaxed text-muted-foreground" dir="ltr">
                {trackUrl}
              </p>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="print-avoid-break rounded-[2.5rem] bg-card p-6 shadow-soft sm:p-8">
          <h2 className="text-lg font-black text-foreground">مسار الطلب</h2>
          <div className="mt-8 overflow-x-auto pb-2">
            <div className="min-w-[34rem]">
              <ApplicationStepper status={app.status} />
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="rounded-[2.5rem] bg-card p-6 shadow-soft sm:p-8">
          <h2 className="text-lg font-black text-foreground">الخط الزمني للإجراءات</h2>
          <div className="mt-6">
            <ApplicationTimeline events={bundle.events} />
          </div>
        </div>

        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          <Button variant="soft" onClick={() => window.print()}>
            <Printer className="size-4" />
            طباعة الطلب
          </Button>
          <div className="flex gap-2">
            <Button asChild variant="ghost">
              <Link to="/my-applications">طلباتي</Link>
            </Button>
            {canWithdraw ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={busy}>
                    {busy ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
                    سحب الطلب وإلغاء التسجيل
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent dir="rtl" className="text-right">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-destructive">
                      تحذير: سحب الطلب وإلغاء التسجيل نهائيًا
                    </AlertDialogTitle>
                    <AlertDialogDescription className="leading-relaxed">
                      عند تأكيد السحب سيتم إلغاء طلب القبول نهائيًا، وتحرير المقعد المحجوز لطفلك
                      وإتاحته لغيره، وإيقاف مراجعة الطلب من قبل إدارة القبول. لا يمكن التراجع عن
                      هذا الإجراء، وللتسجيل مرة أخرى ستحتاج إلى تقديم طلب جديد من البداية.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="gap-2 sm:flex-row-reverse sm:justify-start">
                    <AlertDialogAction
                      onClick={handleWithdraw}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      نعم، ألغِ التسجيل
                    </AlertDialogAction>
                    <AlertDialogCancel>تراجع</AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
          </div>
        </div>

        {/* Print-only footer */}
        <div className="print-only mt-8 border-t-2 border-black/70 pt-3">
          <div className="flex items-start justify-between gap-6 text-xs">
            <div>
              <p>
                <strong>حالة الطلب:</strong> {APPLICATION_STATUS_LABELS[app.status] ?? app.status}
              </p>
              <p>
                <strong>الرقم الأكاديمي:</strong> <span dir="ltr">{appNumber}</span>
              </p>
              <p>
                <strong>تاريخ الطباعة:</strong> {printedAt}
              </p>
            </div>
            <div className="text-left">
              <p className="flex items-center gap-1 justify-end">
                <GraduationCap className="size-3.5" />
                {school.name}
              </p>
              <p>هذا المستند صادر إلكترونيًا من بوابة القبول ولا يتطلب توقيعًا.</p>
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="print-avoid-break rounded-2xl bg-beige/70 p-4">
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p className="mt-1 font-black text-foreground" dir="auto">
        {value}
      </p>
    </div>
  );
}

import { useMemo, useState } from "react";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import qrcode from "qrcode-generator";
import { CircleDot, Loader2, Printer, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  getApplication,
  withdrawApplicationFn,
} from "@/features/admissions/application.functions";
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
  return qr.createDataURL(6, 8);
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

  const qr = app.tracking_number ? qrDataUrl(app.tracking_number) : null;
  const canWithdraw = !["withdrawn", "rejected", "approved"].includes(app.status);

  async function handleWithdraw() {
    setBusy(true);
    try {
      await withdraw({ data: applicationId });
      await queryClient.invalidateQueries({ queryKey: ["application", applicationId] });
      toast.success("تم سحب الطلب");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر سحب الطلب");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="section-y">
      <div className="mx-auto max-w-4xl px-4 md:px-8">
        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div className="rounded-[2.5rem] bg-card p-7 shadow-card">
            <span
              className={`rounded-full px-3 py-1 text-xs font-black ${
                APPLICATION_STATUS_COLORS[app.status] ?? "bg-beige text-foreground"
              }`}
            >
              {APPLICATION_STATUS_LABELS[app.status] ?? app.status}
            </span>
            <h1 className="mt-4 text-2xl font-black text-foreground">تتبع طلب القبول</h1>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Info label="رقم الطلب" value={app.application_number ?? "—"} />
              <Info label="رقم التتبع" value={app.tracking_number ?? "—"} />
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
            </div>
          </div>

          {qr ? (
            <div className="rounded-[2.5rem] bg-card p-6 text-center shadow-card">
              <img src={qr} alt="رمز تتبع الطلب" className="mx-auto size-36 rounded-2xl" />
              <p className="mt-3 text-xs font-bold text-muted-foreground">امسح للتتبع السريع</p>
            </div>
          ) : null}
        </div>

        {/* Timeline */}
        <div className="mt-8 rounded-[2.5rem] bg-card p-7 shadow-soft">
          <h2 className="text-lg font-black text-foreground">الخط الزمني</h2>
          <ol className="mt-6 space-y-5 border-s-2 border-border ps-6">
            {bundle.events.map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute -start-[1.95rem] top-1 grid size-4 place-items-center rounded-full bg-primary text-primary-foreground">
                  <CircleDot className="size-3" />
                </span>
                <p className="text-sm font-black text-foreground">{e.title}</p>
                {e.body ? (
                  <p className="mt-1 text-sm text-muted-foreground">{e.body}</p>
                ) : null}
                <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
                  {new Date(e.created_at).toLocaleString("ar-SA")}
                </p>
              </li>
            ))}
            {bundle.events.length === 0 ? (
              <li className="text-sm text-muted-foreground">لا توجد أحداث بعد.</li>
            ) : null}
          </ol>
        </div>

        <div className="mt-8 flex flex-wrap justify-between gap-3">
          <Button variant="soft" onClick={() => window.print()}>
            <Printer className="size-4" />
            طباعة الطلب
          </Button>
          <div className="flex gap-2">
            <Button asChild variant="ghost">
              <Link to="/my-applications">طلباتي</Link>
            </Button>
            {canWithdraw ? (
              <Button variant="destructive" disabled={busy} onClick={handleWithdraw}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
                سحب الطلب
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-beige/70 p-4">
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p className="mt-1 font-black text-foreground" dir="auto">
        {value}
      </p>
    </div>
  );
}
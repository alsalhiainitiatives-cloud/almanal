import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  FileUp,
  History,
  Loader2,
  LockKeyhole,
  QrCode,
  RefreshCw,
  Route as RouteIcon,
  Search,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHero } from "@/components/site/PageHero";
import { publicTrackApplication } from "@/features/admissions/track.functions";
import {
  ApplicationStepper,
  ApplicationTimeline,
} from "@/features/admissions/components/ApplicationJourney";
import {
  APPLICATION_STATUS_COLORS,
  APPLICATION_STATUS_LABELS,
} from "@/features/admissions/eligibility";

const title = "التتبع السريع للطلب | مدارس وروضة المنال";
const description =
  "تابع حالة طلب القبول مباشرة برقم الطلب ورمز التحقق أو عبر رمز QR دون الحاجة إلى تسجيل الدخول.";

export const Route = createFileRoute("/track/")({
  validateSearch: z.object({
    no: z.string().trim().max(40).optional(),
    t: z.string().trim().max(120).optional(),
  }),
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PublicTrackPage,
});

const SECTIONS = [
  { id: "track-summary", label: "ملخص الطلب", icon: ShieldCheck },
  { id: "track-path", label: "مسار الطلب", icon: RouteIcon },
  { id: "track-actions", label: "الإجراءات المطلوبة", icon: FileUp },
  { id: "track-timeline", label: "الخط الزمني", icon: History },
];

function loginHref(applicationId: string, reason: "documents" | "action" | "payment" | "details") {
  const next = `/track/${applicationId}`;
  return `/auth?next=${encodeURIComponent(next)}&reason=${reason}`;
}

function PublicTrackPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const track = useServerFn(publicTrackApplication);

  const [number, setNumber] = useState(search.no ?? "");
  const [token, setToken] = useState(search.t ?? "");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setNumber(search.no ?? "");
    setToken(search.t ?? "");
  }, [search.no, search.t]);

  const enabled = !!search.no && !!search.t && search.t.length >= 16;

  const query = useQuery({
    queryKey: ["public-track", search.no, search.t],
    queryFn: () => track({ data: { number: search.no!, token: search.t! } }),
    enabled,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    retry: false,
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const no = number.trim();
    const t = token.trim();
    if (no.length < 4) return setFormError("يرجى إدخال رقم الطلب كاملًا");
    if (t.length < 16) return setFormError("يرجى إدخال رمز التحقق الظاهر على إشعار الطلب أو امسح رمز QR");
    setFormError(null);
    void navigate({ to: "/track", search: { no, t }, replace: true });
  }

  const result = query.data;
  const app = result?.found ? result.application : null;
  const docs = result?.found ? result.documentRequests : [];
  const openDocs = app?.open_document_requests ?? 0;
  const needsLoginAction = !!app && (app.needs_action || openDocs > 0);

  const lookupError = useMemo(() => {
    if (query.error) return query.error instanceof Error ? query.error.message : "تعذّر البحث حاليًا";
    if (result && !result.found)
      return "لا يوجد طلب مطابق لرقم الطلب ورمز التحقق. تأكد من البيانات أو سجّل الدخول لعرض طلباتك.";
    return null;
  }, [query.error, result]);

  return (
    <>
      <PageHero
        eyebrow="تتبع سريع"
        title="تتبع طلب القبول"
        description="أدخل رقم الطلب مع رمز التحقق الخاص به، أو امسح رمز QR الموجود على نموذج الطلب لعرض الحالة فورًا — بدون تسجيل دخول."
      />

      <section className="container mx-auto -mt-20 px-4 pb-20 md:px-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <form onSubmit={submit} className="rounded-[2.5rem] bg-card p-6 shadow-card sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="app-number" className="text-sm font-black text-foreground">
                  رقم الطلب
                </label>
                <p className="mt-1 text-xs text-muted-foreground">
                  مثال: <span dir="ltr">MN-1447-AB12C</span>
                </p>
                <Input
                  id="app-number"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="رقم الطلب"
                  dir="ltr"
                  className="mt-3 h-12 rounded-2xl text-center font-bold tracking-wide"
                />
              </div>
              <div>
                <label htmlFor="app-token" className="text-sm font-black text-foreground">
                  رمز التحقق
                </label>
                <p className="mt-1 text-xs text-muted-foreground">
                  موجود على نموذج الطلب المطبوع وفي حسابك
                </p>
                <Input
                  id="app-token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="رمز التحقق"
                  dir="ltr"
                  className="mt-3 h-12 rounded-2xl text-center font-bold tracking-wide"
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button type="submit" variant="hero" disabled={query.isFetching} className="h-12">
                {query.isFetching ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Search className="size-4" />
                )}
                تتبع الطلب
              </Button>
              {enabled ? (
                <Button
                  type="button"
                  variant="soft"
                  className="h-12"
                  onClick={() => void query.refetch()}
                  disabled={query.isFetching}
                >
                  <RefreshCw className="size-4" />
                  تحديث الحالة
                </Button>
              ) : null}
            </div>

            <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <QrCode className="size-4 text-primary" />
              مسح رمز QR يفتح هذه الصفحة بالرقم ورمز التحقق تلقائيًا — ولا يمكن الوصول لأي طلب برقمه
              وحده.
            </p>

            {formError || lookupError ? (
              <p className="mt-4 rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive">
                {formError ?? lookupError}
              </p>
            ) : null}
          </form>

          {app ? (
            <>
              <nav className="flex flex-wrap gap-2 rounded-[2rem] border border-border/60 bg-beige/40 p-3">
                {SECTIONS.map((s) => {
                  const Icon = s.icon;
                  return (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-card px-3.5 py-2 text-xs font-black text-foreground shadow-soft transition-colors hover:text-primary"
                    >
                      <Icon className="size-3.5 text-primary" />
                      {s.label}
                    </a>
                  );
                })}
              </nav>

              <div id="track-summary" className="scroll-mt-28 rounded-[2.5rem] bg-card p-6 shadow-card sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
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

                <p className="mt-5 text-xs font-bold text-muted-foreground">رقم الطلب</p>
                <p className="text-2xl font-black tracking-wide text-primary" dir="ltr">
                  {app.application_number}
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <Info label="العام الدراسي" value={app.academic_year} />
                  <Info
                    label="تاريخ الإرسال"
                    value={
                      app.submitted_at ? new Date(app.submitted_at).toLocaleDateString("ar-SA") : "—"
                    }
                  />
                  <Info label="الطالب" value={`${app.student_initial}… (بيانات محمية)`} />
                </div>
              </div>

              <div id="track-path" className="scroll-mt-28 rounded-[2.5rem] bg-card p-6 shadow-soft sm:p-8">
                <h2 className="text-lg font-black text-foreground">مسار الطلب</h2>
                <div className="mt-8 overflow-x-auto pb-2">
                  <div className="min-w-[34rem]">
                    <ApplicationStepper status={app.status} />
                  </div>
                </div>
              </div>

              <div id="track-actions" className="scroll-mt-28 space-y-4">
                {needsLoginAction ? (
                  <div className="rounded-[2rem] border border-gold/50 bg-gold/15 p-6">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="text-sm font-black text-foreground">
                          هذا الطلب يتطلب إجراءً منك
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {openDocs > 0
                            ? `مطلوب رفع ${openDocs} مرفق/مستند إضافي لاستكمال مراجعة الطلب.`
                            : "طلبت الإدارة تعديل بعض البيانات في الطلب."}{" "}
                          لحماية خصوصيتك، يلزم تسجيل الدخول لإتمام الإجراء، وسيتم إرجاعك مباشرة إلى
                          صفحة هذا الطلب بعد الدخول.
                        </p>
                      </div>
                    </div>

                    {docs.length > 0 ? (
                      <ul className="mt-4 space-y-2">
                        {docs.map((d) => (
                          <li
                            key={d.id}
                            className="flex items-start gap-3 rounded-2xl bg-card/80 px-4 py-3"
                          >
                            <FileUp className="mt-0.5 size-4 shrink-0 text-primary" />
                            <div className="min-w-0">
                              <p className="text-sm font-black text-foreground">
                                {d.document_name_ar}
                              </p>
                              {d.note ? (
                                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                                  {d.note}
                                </p>
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    <Button asChild variant="hero" className="mt-5">
                      <a href={loginHref(app.id, openDocs > 0 ? "documents" : "action")}>
                        <FileUp className="size-4" />
                        {openDocs > 0
                          ? "تسجيل الدخول ورفع المرفقات المطلوبة"
                          : "تسجيل الدخول لإكمال الإجراء"}
                      </a>
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 rounded-[2rem] border border-border/60 bg-mint/40 p-6">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
                    <div>
                      <p className="text-sm font-black text-foreground">
                        لا توجد مرفقات أو إجراءات مطلوبة حاليًا
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        سيظهر هنا فورًا أي مستند تطلبه إدارة القبول، مع زر مباشر لرفعه بعد تسجيل
                        الدخول.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div id="track-timeline" className="scroll-mt-28 rounded-[2.5rem] bg-card p-6 shadow-soft sm:p-8">
                <h2 className="text-lg font-black text-foreground">الخط الزمني للإجراءات</h2>
                <div className="mt-6">
                  <ApplicationTimeline
                    events={(result?.found ? result.events : []).map((e) => ({
                      id: e.id,
                      title_ar: e.title_ar,
                      body_ar: null,
                      event_type: e.event_type,
                      created_at: e.created_at,
                    }))}
                  />
                </div>
              </div>

              <div className="rounded-[2rem] border border-border/60 bg-beige/40 p-6">
                <p className="flex items-center gap-2 text-sm font-black text-foreground">
                  <LockKeyhole className="size-4 text-primary" />
                  التفاصيل الكاملة داخل حسابك
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  لعرض البيانات الكاملة، تعديل الطلب، رفع المرفقات، أو الانتقال إلى إثبات الدفع
                  وجدولة السداد — يجب تسجيل الدخول إلى حسابك.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild variant="soft">
                    <a href={loginHref(app.id, "payment")}>
                      <CreditCard className="size-4" />
                      الدفع وجدولة السداد
                    </a>
                  </Button>
                  <Button asChild variant="ghost">
                    <a href={loginHref(app.id, "details")}>عرض تفاصيل الطلب</a>
                  </Button>
                  <Button asChild variant="ghost">
                    <Link to="/admissions">تقديم طلب جديد</Link>
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </section>
    </>
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

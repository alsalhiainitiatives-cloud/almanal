import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  AlertTriangle,
  CreditCard,
  FileUp,
  Loader2,
  LockKeyhole,
  QrCode,
  Search,
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
  "تابع حالة طلب القبول مباشرة برقم الطلب أو عبر رمز QR دون الحاجة إلى تسجيل الدخول.";

export const Route = createFileRoute("/track/")({
  validateSearch: z.object({ no: z.string().trim().max(40).optional() }),
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

type Result = Awaited<ReturnType<typeof publicTrackApplication>>;

function PublicTrackPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const track = useServerFn(publicTrackApplication);

  const [value, setValue] = useState(search.no ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function lookup(raw: string) {
    const number = raw.trim();
    if (number.length < 4) {
      setError("يرجى إدخال رقم الطلب كاملًا");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const data = await track({ data: number });
      setResult(data);
      if (!data.found) setError("لا يوجد طلب بهذا الرقم. تأكد من الرقم أو سجّل الدخول لعرض طلباتك.");
      navigate({ to: "/track", search: { no: number }, replace: true });
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : "تعذّر البحث حاليًا");
    } finally {
      setBusy(false);
    }
  }

  const app = result?.found ? result.application : null;
  const needsLoginAction =
    !!app && (app.needs_action || (app.open_document_requests ?? 0) > 0);
  const loginHref = app ? `/auth?next=${encodeURIComponent(`/track/${app.id}`)}` : "/auth";

  return (
    <>
      <PageHero
        eyebrow="تتبع سريع"
        title="تتبع طلب القبول"
        description="أدخل رقم الطلب الظاهر على إشعار التقديم أو امسح رمز QR الخاص بالطلب لعرض حالته فورًا — بدون تسجيل دخول."
      />

      <section className="container mx-auto -mt-20 px-4 pb-20 md:px-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void lookup(value);
            }}
            className="rounded-[2.5rem] bg-card p-6 shadow-card sm:p-8"
          >
            <label htmlFor="app-number" className="text-sm font-black text-foreground">
              رقم الطلب
            </label>
            <p className="mt-1 text-xs text-muted-foreground">
              مثال: <span dir="ltr">MN-1447-AB12C</span>
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Input
                id="app-number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="أدخل رقم الطلب"
                dir="ltr"
                className="h-12 rounded-2xl text-center font-bold tracking-wide"
              />
              <Button type="submit" variant="hero" disabled={busy} className="h-12 shrink-0">
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                تتبع الطلب
              </Button>
            </div>
            <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <QrCode className="size-4 text-primary" />
              عند مسح رمز QR الخاص بالطلب سيتم فتح هذه الصفحة أو صفحة الطلب في حسابك مباشرة.
            </p>
            {error ? (
              <p className="mt-4 rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive">
                {error}
              </p>
            ) : null}
          </form>

          {app ? (
            <>
              <div className="rounded-[2.5rem] bg-card p-6 shadow-card sm:p-8">
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
                      app.submitted_at
                        ? new Date(app.submitted_at).toLocaleDateString("ar-SA")
                        : "—"
                    }
                  />
                  <Info label="الطالب" value={`${app.student_initial}… (بيانات محمية)`} />
                </div>

                <div className="mt-8 overflow-x-auto pb-2">
                  <div className="min-w-[34rem]">
                    <ApplicationStepper status={app.status} />
                  </div>
                </div>
              </div>

              {needsLoginAction ? (
                <div className="flex flex-col gap-4 rounded-[2rem] border border-gold/50 bg-gold/15 p-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 size-5 shrink-0 text-primary" />
                    <div>
                      <p className="text-sm font-black text-foreground">
                        هذا الطلب يتطلب إجراءً منك
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {app.open_document_requests > 0
                          ? `مطلوب رفع ${app.open_document_requests} مرفق/مستند إضافي.`
                          : "طلبت الإدارة تعديل بعض البيانات."}{" "}
                        لحماية خصوصيتك، يلزم تسجيل الدخول لإتمام الإجراء.
                      </p>
                    </div>
                  </div>
                  <Button asChild variant="hero" className="shrink-0">
                    <a href={loginHref}>
                      <FileUp className="size-4" />
                      تسجيل الدخول لإكمال الإجراء
                    </a>
                  </Button>
                </div>
              ) : null}

              <div className="rounded-[2.5rem] bg-card p-6 shadow-soft sm:p-8">
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
                    <a href={loginHref}>
                      <CreditCard className="size-4" />
                      الدفع وجدولة السداد
                    </a>
                  </Button>
                  <Button asChild variant="ghost">
                    <Link to="/admissions">صفحة التسجيل</Link>
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
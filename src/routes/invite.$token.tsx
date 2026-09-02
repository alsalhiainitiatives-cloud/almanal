/**
 * Public guardian invitation landing page.
 *
 * The token is secret: it shows a minimal preview, asks the guardian to sign in
 * or create an account, then links every child sharing the same phone/ID.
 */
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, HeartHandshake, Loader2, LogIn, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/site/PageHero";
import { claimGuardianInvitation } from "@/features/ams/guardians.functions";
import { useAuth } from "@/features/auth/AuthProvider";

export const Route = createFileRoute("/invite/$token")({
  head: () => ({
    meta: [
      { title: "دعوة ولي أمر | مدارس وروضة المنال" },
      {
        name: "description",
        content: "فعّل حساب ولي الأمر في منصة مدارس وروضة المنال لمتابعة أبنائك ودفعاتك المالية.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InvitePage,
});

const BENEFITS = [
  "متابعة الخطط الدراسية والتقارير والتقييمات",
  "الاطلاع على الحضور والغياب اليومي",
  "متابعة الفواتير وسداد الدفعات",
  "التواصل المباشر مع معلمة الفصل",
];

function InvitePage() {
  const { token } = Route.useParams();
  const { isAuthenticated, initializing } = useAuth();
  const navigate = useNavigate();
  const [result, setResult] = useState<{ linked: number; childNames: string[] } | null>(null);

  const claim = useMutation({
    mutationFn: () => claimGuardianInvitation({ data: { token } }),
    onSuccess: (data) => {
      setResult(data);
      toast.success(`تم ربط ${data.linked} من الأبناء بحسابك.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    if (!initializing && isAuthenticated && !result && !claim.isPending && !claim.isError) {
      claim.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initializing, isAuthenticated]);

  return (
    <>
      <PageHero
        eyebrow="دعوة خاصة"
        title="تفعيل حساب ولي الأمر"
        description="أنشئ حسابك لمرة واحدة ليتم ربط جميع أبنائك في المدرسة بحسابك تلقائيًا."
      />

      <section className="container mx-auto max-w-3xl px-4 pb-20">
        <div className="rounded-[2rem] border border-border/60 bg-card p-6 shadow-sm sm:p-8">
          {result ? (
            <div className="space-y-4 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                <CheckCircle2 className="size-7" />
              </span>
              <h2 className="text-lg font-black text-foreground">تم ربط أبنائك بحسابك بنجاح</h2>
              <p className="text-sm text-muted-foreground">
                {result.childNames.length
                  ? result.childNames.join(" · ")
                  : "يمكنك الآن متابعة كل شيء من لوحة ولي الأمر."}
              </p>
              <Button className="rounded-2xl font-black" onClick={() => navigate({ to: "/dashboard" })}>
                الانتقال إلى لوحة ولي الأمر
              </Button>
            </div>
          ) : initializing || claim.isPending ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm font-bold text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              جارٍ التحقق من الدعوة…
            </div>
          ) : claim.isError ? (
            <div className="space-y-4 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
                <ShieldAlert className="size-7" />
              </span>
              <h2 className="text-lg font-black text-foreground">تعذّر إتمام الربط</h2>
              <p className="text-sm text-muted-foreground">{(claim.error as Error).message}</p>
              <Button variant="outline" className="rounded-2xl font-bold" onClick={() => claim.mutate()}>
                إعادة المحاولة
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                <HeartHandshake className="size-7" />
              </span>
              <div className="space-y-2">
                <h2 className="text-lg font-black text-foreground">مرحبًا بك في منصة أولياء الأمور</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  سجّل الدخول أو أنشئ حسابًا بالبريد الإلكتروني، وسنربط أبناءك المسجّلين في المدرسة بحسابك
                  مباشرة — بما في ذلك الأشقاء.
                </p>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {BENEFITS.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 rounded-2xl border border-border/60 bg-background/60 p-3 text-xs font-bold text-foreground"
                  >
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button asChild className="w-full rounded-2xl font-black">
                <Link to="/auth" search={{ next: `/invite/${token}` }}>
                  <LogIn className="size-4" />
                  تسجيل الدخول أو إنشاء حساب
                </Link>
              </Button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Loader2, LogIn, Mail, Phone, Sparkles, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/site/Logo";
import { GoogleButton } from "@/features/auth/components/GoogleButton";
import { PasswordInput } from "@/features/auth/components/PasswordInput";
import { signInWithIdentifier } from "@/features/auth/auth.functions";
import { signInSchema, signUpSchema } from "@/features/auth/schemas";
import { useAuth } from "@/features/auth/AuthProvider";
import { school } from "@/data/site";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (
    search: Record<string, unknown>,
  ): { next?: string | undefined; reason?: string | undefined } => ({
    next: typeof search.next === "string" && search.next.startsWith("/") ? search.next : undefined,
    reason: typeof search.reason === "string" ? search.reason.slice(0, 40) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "تسجيل الدخول | بوابة مدارس وروضة المنال" },
      {
        name: "description",
        content:
          "بوابة الدخول الآمنة لأولياء الأمور وفريق العمل في مدارس وروضة المنال بعنيزة — متابعة الطلبات والفواتير والتقارير.",
      },
      { property: "og:title", content: "تسجيل الدخول | بوابة مدارس وروضة المنال" },
      {
        property: "og:description",
        content: "دخول آمن لأولياء الأمور وفريق العمل في مدارس وروضة المنال بعنيزة.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup";

const REASON_TITLES: Record<string, string> = {
  documents: "مطلوب رفع مرفقات — سجّل الدخول لإكمال رفع المستندات المطلوبة",
  action: "مطلوب إجراء على طلبك — سجّل الدخول لتعديل البيانات المطلوبة",
  payment: "الدفع وجدولة السداد — سجّل الدخول للمتابعة",
  details: "عرض تفاصيل الطلب الكاملة يتطلب تسجيل الدخول",
  default: "يلزم تسجيل الدخول لإكمال الإجراء المطلوب على طلبك",
};

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const { isAuthenticated, initializing } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");

  useEffect(() => {
    if (!initializing && isAuthenticated) {
      navigate({ to: (next ?? "/dashboard") as "/dashboard", replace: true });
    }
  }, [initializing, isAuthenticated, navigate, next]);

  const signup = mode === "signup";

  return (
    <div className="relative flex items-center justify-center overflow-hidden gradient-soft-cream px-4 py-12 lg:py-16">
      <div
        aria-hidden
        className="absolute -top-32 -start-24 size-[26rem] rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -bottom-40 -end-24 size-[30rem] rounded-full bg-gold/20 blur-3xl"
      />

      <div className="relative w-full max-w-5xl">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-border/60 bg-card/90 shadow-soft backdrop-blur-xl sm:rounded-[3rem]">
          {/* Sliding brand panel (desktop) */}
          <div
            className="absolute inset-y-0 start-0 z-20 hidden w-1/2 transition-transform duration-700 ease-[cubic-bezier(0.65,0,0.35,1)] lg:block"
            style={{ transform: signup ? "translateX(-100%)" : "translateX(0)" }}
          >
            <div
              className="relative h-full gradient-burgundy px-10 py-14 text-primary-foreground"
              style={{
                borderStartStartRadius: "3rem",
                borderEndStartRadius: "3rem",
                borderStartEndRadius: signup ? "3rem" : "9rem",
                borderEndEndRadius: signup ? "9rem" : "3rem",
                transition: "border-radius 700ms cubic-bezier(0.65,0,0.35,1)",
              }}
            >
              <div aria-hidden className="pointer-events-none absolute inset-0 pattern-dots opacity-20" />
              <div className="relative flex h-full flex-col items-center justify-center text-center">
                <span className="grid size-16 place-items-center rounded-3xl bg-primary-foreground/15 backdrop-blur">
                  <Sparkles className="size-8 animate-wiggle" />
                </span>
                <h2 className="mt-6 text-3xl font-extrabold sm:text-4xl">
                  {signup ? "مرحبًا بعودتك!" : "أهلًا بك في المنال!"}
                </h2>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-primary-foreground/80">
                  {signup
                    ? "هل لديك حساب بالفعل؟ سجّل الدخول للمتابعة."
                    : "ليس لديك حساب؟ أنشئ حساب في دقيقة واحدة"}
                </p>
                <button
                  type="button"
                  onClick={() => setMode(signup ? "signin" : "signup")}
                  className="mt-7 rounded-2xl border-2 border-primary-foreground/70 px-8 py-3 text-sm font-bold transition-all hover:-translate-y-0.5 hover:bg-primary-foreground hover:text-primary"
                >
                  {signup ? "تسجيل الدخول" : "إنشاء حساب"}
                </button>

                <div className="mt-10 flex items-center gap-2 text-xs text-primary-foreground/70">
                  <ArrowRight className="size-4" />
                  <Link to="/" className="font-bold hover:text-primary-foreground">
                    العودة إلى موقع {school.shortName}
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Forms */}
          <div className="relative grid lg:min-h-[41rem] lg:grid-cols-2">
            <FormPane active={!signup} side="end">
              <SignInForm />
            </FormPane>
            <FormPane active={signup} side="start">
              <SignUpForm />
            </FormPane>
          </div>

          {/* Mobile switcher */}
          <div className="border-t border-border/60 px-6 py-5 text-center lg:hidden">
            <button
              type="button"
              onClick={() => setMode(signup ? "signin" : "signup")}
              className="text-sm font-bold text-primary"
            >
              {signup ? "لديك حساب؟ تسجيل الدخول" : "ليس لديك حساب؟ إنشاء حساب جديد"}
            </button>
            <div className="mt-3">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground"
              >
                <ArrowLeft className="size-3.5" />
                العودة إلى موقع {school.shortName}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * One half of the card. On desktop both panes exist side-by-side and cross-fade
 * as the brand panel slides over them; on mobile only the active one renders.
 */
function FormPane({
  active,
  side,
  children,
}: {
  active: boolean;
  side: "start" | "end";
  children: React.ReactNode;
}) {
  return (
    <div
      aria-hidden={!active}
      className={`px-6 py-10 sm:px-12 sm:py-14 ${
        side === "start" ? "lg:order-1" : "lg:order-2"
      } ${active ? "block" : "hidden lg:block"}`}
      style={{
        opacity: active ? 1 : 0,
        transform: active ? "translateY(0)" : "translateY(1.25rem)",
        pointerEvents: active ? "auto" : "none",
        transition: "opacity 500ms ease, transform 600ms cubic-bezier(0.65,0,0.35,1)",
        transitionDelay: active ? "180ms" : "0ms",
      }}
    >
      <div className="mx-auto w-full max-w-sm">{children}</div>
    </div>
  );
}

function PaneHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <Logo />
      <h1 className="mt-5 text-2xl font-extrabold text-foreground sm:text-3xl">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function OrDivider() {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-border" />
      <span className="text-xs font-bold text-muted-foreground">أو</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function SignInForm() {
  const navigate = useNavigate();
  const { next, reason } = Route.useSearch();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = signInSchema.safeParse({ identifier, password, rememberMe });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const result = await signInWithIdentifier({ data: parsed.data });
      const { error } = await supabase.auth.setSession({
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
      });
      if (error) throw new Error("تعذّر إنشاء الجلسة، حاول مرة أخرى.");
      toast.success("تم تسجيل الدخول بنجاح");
      navigate({ to: (next ?? "/dashboard") as "/dashboard", replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذّر تسجيل الدخول.";
      setErrors({ identifier: message });
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PaneHeader
        title="تسجيل الدخول"
        subtitle=""
      />

      {reason ? (
        <div className="rounded-2xl border border-gold/50 bg-gold/15 px-4 py-3">
          <p className="text-sm font-black text-foreground">{REASON_TITLES[reason] ?? REASON_TITLES.default}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            بعد تسجيل الدخول سيتم نقلك مباشرة إلى صفحة الطلب والخطوة المطلوبة.
          </p>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div className="space-y-2">
          <Label htmlFor="identifier" className="text-sm font-bold">
            البريد الإلكتروني
          </Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="name@example.com"
              autoComplete="username"
              dir="ltr"
              aria-invalid={Boolean(errors.identifier)}
              className="h-12 rounded-2xl border-border/70 bg-background/80 ps-10 text-start text-base focus-visible:ring-4 focus-visible:ring-primary/15"
            />
          </div>
          {errors.identifier && (
            <p className="text-xs font-semibold text-destructive">{errors.identifier}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-bold">
            كلمة المرور
          </Label>
          <PasswordInput
            id="password"
            value={password}
            onChange={setPassword}
            error={errors.password}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Checkbox
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked === true)}
            />
            تذكّرني
          </label>
          <Link
            to="/forgot-password"
            className="text-sm font-bold text-primary transition-colors hover:text-primary/80"
          >
            نسيت كلمة المرور؟
          </Link>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="h-13 w-full rounded-2xl bg-primary py-3.5 text-base font-bold shadow-soft transition-transform hover:scale-[1.01]"
        >
          {loading ? <Loader2 className="size-5 animate-spin" /> : <LogIn className="size-5" />}
          دخول آمن
        </Button>
      </form>

      <OrDivider />
      <GoogleButton label="الدخول باستخدام حساب جوجل" />
    </div>
  );
}

function SignUpForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = signUpSchema.safeParse({ fullName, email, phone, password });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { full_name: parsed.data.fullName, phone: parsed.data.phone },
        },
      });
      if (error) throw new Error(error.message);
      setDone(true);
      toast.success("تم إنشاء الحساب، تحقق من بريدك لتأكيد التسجيل.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر إنشاء الحساب.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-3xl border border-mint/60 bg-mint/20 p-6 text-center">
        <p className="text-base font-bold text-foreground">تم إنشاء حسابك بنجاح 🎉</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          أرسلنا رسالة تأكيد إلى <span dir="ltr">{email}</span>. بعد التأكيد يمكنك الدخول إلى بوابة
          أولياء الأمور.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PaneHeader
        title="إنشاء حساب"
        subtitle="سجّل بيانات ولي الأمر لمتابعة الأبناء والطلبات في بوابة المنال."
      />

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-sm font-bold">
            الاسم الكامل
          </Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="مثال: أحمد بن عبدالله"
            dir="rtl"
            aria-invalid={Boolean(errors.fullName)}
            className="h-12 rounded-2xl border-border/70 bg-background/80 text-start text-base focus-visible:ring-4 focus-visible:ring-primary/15"
          />
          {errors.fullName && (
            <p className="text-xs font-semibold text-destructive">{errors.fullName}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="signupEmail" className="text-sm font-bold">
            البريد الإلكتروني
          </Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="signupEmail"
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              aria-invalid={Boolean(errors.email)}
              className="h-12 rounded-2xl border-border/70 bg-background/80 ps-10 text-start text-base focus-visible:ring-4 focus-visible:ring-primary/15"
            />
          </div>
          {errors.email && <p className="text-xs font-semibold text-destructive">{errors.email}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="signupPhone" className="text-sm font-bold">
            رقم الجوال
          </Label>
          <div className="relative">
            <Phone className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="signupPhone"
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05xxxxxxxx"
              aria-invalid={Boolean(errors.phone)}
              className="h-12 rounded-2xl border-border/70 bg-background/80 ps-10 text-start text-base focus-visible:ring-4 focus-visible:ring-primary/15"
            />
          </div>
          {errors.phone && <p className="text-xs font-semibold text-destructive">{errors.phone}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="signupPassword" className="text-sm font-bold">
            كلمة المرور
          </Label>
          <PasswordInput
            id="signupPassword"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            showStrength
            error={errors.password}
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-primary py-3.5 text-base font-bold shadow-soft transition-transform hover:scale-[1.01]"
        >
          {loading ? <Loader2 className="size-5 animate-spin" /> : <UserPlus className="size-5" />}
          إنشاء حساب ولي أمر
        </Button>
      </form>

      <OrDivider />
      <GoogleButton label="التسجيل باستخدام حساب جوجل" />
      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        بإنشاء الحساب أنت توافق على سياسات الخصوصية وشروط الاستخدام
      </p>
    </div>
  );
}

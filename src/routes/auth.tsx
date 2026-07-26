import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, LogIn, Mail, Phone, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { PasswordInput } from "@/features/auth/components/PasswordInput";
import { signInWithIdentifier } from "@/features/auth/auth.functions";
import { signInSchema, signUpSchema } from "@/features/auth/schemas";
import { useAuth } from "@/features/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
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

function AuthPage() {
  const navigate = useNavigate();
  const { isAuthenticated, initializing } = useAuth();

  useEffect(() => {
    if (!initializing && isAuthenticated) navigate({ to: "/dashboard", replace: true });
  }, [initializing, isAuthenticated, navigate]);

  return (
    <AuthShell
      title="بوابة المنال"
      subtitle="دخول آمن لأولياء الأمور وفريق العمل — تابع الطلبات، المستندات والفواتير في مكان واحد."
    >
      <Tabs defaultValue="signin" className="w-full">
        <TabsList className="grid h-12 w-full grid-cols-2 rounded-2xl bg-muted/70 p-1">
          <TabsTrigger value="signin" className="rounded-xl text-sm font-bold">
            تسجيل الدخول
          </TabsTrigger>
          <TabsTrigger value="signup" className="rounded-xl text-sm font-bold">
            حساب جديد
          </TabsTrigger>
        </TabsList>

        <TabsContent value="signin" className="mt-6">
          <SignInForm />
        </TabsContent>
        <TabsContent value="signup" className="mt-6">
          <SignUpForm />
        </TabsContent>
      </Tabs>
    </AuthShell>
  );
}

function SignInForm() {
  const navigate = useNavigate();
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
      navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر تسجيل الدخول.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="identifier" className="text-sm font-bold">
          البريد الإلكتروني أو رقم الجوال
        </Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="identifier"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="name@example.com أو 05xxxxxxxx"
            autoComplete="username"
            dir="ltr"
            aria-invalid={Boolean(errors.identifier)}
            className="h-12 rounded-2xl border-border/70 bg-background/80 ps-10 text-base focus-visible:ring-4 focus-visible:ring-primary/15"
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
          aria-invalid={Boolean(errors.fullName)}
          className="h-12 rounded-2xl border-border/70 bg-background/80 text-base focus-visible:ring-4 focus-visible:ring-primary/15"
        />
        {errors.fullName && (
          <p className="text-xs font-semibold text-destructive">{errors.fullName}</p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="signupEmail" className="text-sm font-bold">
            البريد الإلكتروني
          </Label>
          <Input
            id="signupEmail"
            type="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            aria-invalid={Boolean(errors.email)}
            className="h-12 rounded-2xl border-border/70 bg-background/80 text-base focus-visible:ring-4 focus-visible:ring-primary/15"
          />
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
              className="h-12 rounded-2xl border-border/70 bg-background/80 ps-10 text-base focus-visible:ring-4 focus-visible:ring-primary/15"
            />
          </div>
          {errors.phone && <p className="text-xs font-semibold text-destructive">{errors.phone}</p>}
        </div>
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
      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        بإنشاء الحساب أنت توافق على سياسة الخصوصية وحفظ بيانات الأسرة بشكل آمن.
      </p>
    </form>
  );
}
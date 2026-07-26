import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { KeyRound, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { PasswordInput } from "@/features/auth/components/PasswordInput";
import { passwordSchema } from "@/features/auth/schemas";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "تعيين كلمة مرور جديدة | بوابة المنال" },
      {
        name: "description",
        content: "أنشئ كلمة مرور جديدة وقوية لحسابك في بوابة مدارس وروضة المنال.",
      },
      { property: "og:title", content: "تعيين كلمة مرور جديدة | بوابة المنال" },
      { property: "og:description", content: "إنشاء كلمة مرور جديدة لحساب بوابة المنال." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // The recovery link puts a session in place; confirm it before allowing a change.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    if (password !== confirm) {
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw new Error(updateError.message);
      toast.success("تم تحديث كلمة المرور بنجاح");
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر تحديث كلمة المرور.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="كلمة مرور جديدة"
      subtitle="اختر كلمة مرور قوية لا تقل عن 8 أحرف، وتحتوي حروفًا وأرقامًا ورموزًا."
      footer={
        <Link to="/auth" className="font-bold text-primary hover:text-primary/80">
          العودة إلى تسجيل الدخول
        </Link>
      }
    >
      {!ready ? (
        <div className="rounded-3xl border border-border/60 bg-muted/40 p-6 text-center">
          <p className="text-sm font-semibold text-muted-foreground">
            نتحقق من رابط الاستعادة… إذا لم يعمل الرابط، اطلب رابطًا جديدًا من صفحة استعادة كلمة
            المرور.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-sm font-bold">
              كلمة المرور الجديدة
            </Label>
            <PasswordInput
              id="newPassword"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              showStrength
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-bold">
              تأكيد كلمة المرور
            </Label>
            <PasswordInput
              id="confirmPassword"
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
              error={error ?? undefined}
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-primary py-3.5 text-base font-bold shadow-soft"
          >
            {loading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <KeyRound className="size-5" />
            )}
            حفظ كلمة المرور
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
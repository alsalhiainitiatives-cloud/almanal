import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, MailCheck, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "استعادة كلمة المرور | بوابة المنال" },
      {
        name: "description",
        content: "استعد كلمة مرور حسابك في بوابة مدارس وروضة المنال عبر رابط آمن يُرسل إلى بريدك.",
      },
      { property: "og:title", content: "استعادة كلمة المرور | بوابة المنال" },
      { property: "og:description", content: "رابط آمن لاستعادة كلمة مرور بوابة المنال." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.includes("@")) {
      toast.error("أدخل بريدًا إلكترونيًا صحيحًا.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw new Error(error.message);
      setSent(true);
    } catch {
      // Never reveal whether the account exists.
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="استعادة كلمة المرور"
      subtitle="أدخل بريدك الإلكتروني وسنرسل لك رابطًا آمنًا لإنشاء كلمة مرور جديدة."
      footer={
        <Link to="/auth" className="font-bold text-primary hover:text-primary/80">
          العودة إلى تسجيل الدخول
        </Link>
      }
    >
      {sent ? (
        <div className="rounded-3xl border border-mint/60 bg-mint/20 p-6 text-center">
          <MailCheck className="mx-auto size-9 text-primary" />
          <p className="mt-3 text-base font-bold text-foreground">تحقّق من بريدك الإلكتروني</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            إذا كان لدينا حساب مرتبط بهذا البريد فستصلك رسالة تحتوي رابط إعادة التعيين. الرابط صالح
            لفترة محدودة لأسباب أمنية.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="resetEmail" className="text-sm font-bold">
              البريد الإلكتروني
            </Label>
            <Input
              id="resetEmail"
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="h-12 rounded-2xl border-border/70 bg-background/80 text-base focus-visible:ring-4 focus-visible:ring-primary/15"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-primary py-3.5 text-base font-bold shadow-soft"
          >
            {loading ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
            إرسال رابط الاستعادة
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
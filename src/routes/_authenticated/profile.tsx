import { createFileRoute } from "@tanstack/react-router";
import { Loader2, LogOut, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/features/auth/AuthProvider";
import { PortalLayout } from "@/features/auth/components/PortalLayout";
import { revokeOtherSessions, updateMyProfile } from "@/features/auth/auth.functions";
import { profileSchema } from "@/features/auth/schemas";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "ملفي الشخصي | بوابة المنال" },
      {
        name: "description",
        content: "تحديث بيانات حسابك ولغة الواجهة وإدارة جلسات الدخول في بوابة مدارس وروضة المنال.",
      },
      { property: "og:title", content: "ملفي الشخصي | بوابة المنال" },
      { property: "og:description", content: "إدارة بيانات الحساب والجلسات في بوابة المنال." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, refresh, isReadOnly } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState<"ar" | "en">("ar");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.fullName ?? "");
    setPhone(profile.phone ?? "");
    setAvatarUrl(profile.avatarUrl ?? "");
    setPreferredLanguage(profile.preferredLanguage === "en" ? "en" : "ar");
  }, [profile]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = profileSchema.safeParse({ fullName, phone, avatarUrl, preferredLanguage });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await updateMyProfile({ data: parsed.data });
      await refresh();
      toast.success("تم حفظ بياناتك بنجاح");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر حفظ البيانات.");
    } finally {
      setSaving(false);
    }
  }

  async function onRevokeOthers() {
    setRevoking(true);
    try {
      await revokeOtherSessions({});
      await supabase.auth.signOut({ scope: "others" });
      await refresh();
      toast.success("تم إنهاء الجلسات الأخرى");
    } catch {
      toast.error("تعذّر إنهاء الجلسات الأخرى.");
    } finally {
      setRevoking(false);
    }
  }

  return (
    <PortalLayout
      title="ملفي الشخصي"
      description="حدّث بياناتك الأساسية ولغة الواجهة، وتحكّم في أمان حسابك وجلسات الدخول."
    >
      <form
        onSubmit={onSubmit}
        className="rounded-[2rem] border border-border/60 bg-card p-6 shadow-soft sm:p-8"
        noValidate
      >
        <h2 className="text-lg font-extrabold text-foreground">البيانات الأساسية</h2>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field label="الاسم الكامل" id="fullName" error={errors.fullName}>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-12 rounded-2xl border-border/70 bg-background/80"
            />
          </Field>
          <Field label="رقم الجوال" id="phone" error={errors.phone}>
            <Input
              id="phone"
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-12 rounded-2xl border-border/70 bg-background/80"
            />
          </Field>
          <Field label="البريد الإلكتروني" id="email">
            <Input
              id="email"
              dir="ltr"
              value={profile?.email ?? ""}
              readOnly
              className="h-12 cursor-not-allowed rounded-2xl border-border/70 bg-muted/60"
            />
          </Field>
          <Field label="لغة الواجهة" id="lang">
            <select
              id="lang"
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value === "en" ? "en" : "ar")}
              className="h-12 w-full rounded-2xl border border-border/70 bg-background/80 px-3 text-sm font-semibold text-foreground"
            >
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="رابط الصورة الشخصية (اختياري)" id="avatar" error={errors.avatarUrl}>
              <Input
                id="avatar"
                dir="ltr"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://…"
                className="h-12 rounded-2xl border-border/70 bg-background/80"
              />
            </Field>
          </div>
        </div>

        <Button
          type="submit"
          disabled={saving || isReadOnly}
          className="mt-7 rounded-2xl px-7 py-3 font-bold shadow-soft"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          حفظ التغييرات
        </Button>
      </form>

      <section className="rounded-[2rem] border border-border/60 bg-card p-6 shadow-soft sm:p-8">
        <h2 className="text-lg font-extrabold text-foreground">أمان الحساب</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          إذا لاحظت جلسة دخول غير مألوفة، أنهِ جميع الجلسات الأخرى فورًا ثم غيّر كلمة المرور.
        </p>
        <Button
          variant="outline"
          onClick={onRevokeOthers}
          disabled={revoking}
          className="mt-5 rounded-2xl border-border/70 font-bold"
        >
          {revoking ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
          إنهاء الجلسات على الأجهزة الأخرى
        </Button>
      </section>
    </PortalLayout>
  );
}

function Field({
  label,
  id,
  error,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-bold">
        {label}
      </Label>
      {children}
      {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
    </div>
  );
}
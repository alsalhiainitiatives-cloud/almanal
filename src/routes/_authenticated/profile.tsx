import { createFileRoute } from "@tanstack/react-router";
import { Clock, KeyRound, Loader2, LogOut, Monitor, Save, ShieldCheck, Sparkles, UserCog } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/features/auth/AuthProvider";
import { PortalLayout } from "@/features/auth/components/PortalLayout";
import { PasswordInput } from "@/features/auth/components/PasswordInput";
import { revokeOtherSessions, updateMyProfile } from "@/features/auth/auth.functions";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/features/auth/rbac";
import { passwordSchema, profileSchema } from "@/features/auth/schemas";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "ملفي الشخصي | بوابة المنال" },
      {
        name: "description",
        content: "بياناتك وصلاحياتك وجلسات الدخول وتغيير كلمة المرور في بوابة مدارس وروضة المنال.",
      },
      { property: "og:title", content: "ملفي الشخصي | بوابة المنال" },
      { property: "og:description", content: "إدارة بيانات الحساب والصلاحيات والجلسات في بوابة المنال." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

function ProfilePage() {
  const { profile } = useAuth();

  return (
    <PortalLayout
      title={`ملفي الشخصي — أهلًا ${profile?.fullName?.split(" ")[0] ?? "بك"} 👋`}
      description="كل ما يتعلق بحسابك في مكان واحد: نظرة عامة على دورك وصلاحياتك، بياناتك الأساسية، وأمان الحساب وكلمة المرور والجلسات."
    >
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="no-print h-auto w-full flex-wrap justify-start gap-1 rounded-2xl bg-card/80 p-1.5">
          <TabsTrigger value="overview" className="gap-2 rounded-xl px-4 py-2 font-bold">
            <Sparkles className="size-4" />
            نظرة عامة
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-2 rounded-xl px-4 py-2 font-bold">
            <UserCog className="size-4" />
            بياناتي
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2 rounded-xl px-4 py-2 font-bold">
            <ShieldCheck className="size-4" />
            الأمان والجلسات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="data" className="mt-6 space-y-6">
          <PersonalDataForm />
        </TabsContent>
        <TabsContent value="security" className="mt-6 space-y-6">
          <PasswordCard />
          <SecurityCard />
          <SessionsCard />
        </TabsContent>
      </Tabs>
    </PortalLayout>
  );
}

function OverviewTab() {
  const { profile, roles, permissions, primaryRole, loadingContext } = useAuth();

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          icon={<ShieldCheck className="size-5" />}
          label="دورك الأساسي"
          value={primaryRole ? ROLE_LABELS[primaryRole] : "—"}
        />
        <StatCard
          icon={<Sparkles className="size-5" />}
          label="الصلاحيات الفعّالة"
          value={loadingContext ? "…" : String(permissions.length)}
        />
        <StatCard
          icon={<Clock className="size-5" />}
          label="آخر تسجيل دخول"
          value={formatDate(profile?.lastLoginAt ?? null)}
        />
      </div>

      {primaryRole && (
        <section className="rounded-[2rem] border border-border/60 bg-card p-6 shadow-soft sm:p-8">
          <h2 className="text-lg font-extrabold text-foreground">نطاق عملك</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {ROLE_DESCRIPTIONS[primaryRole]}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {permissions.map((permission) => (
              <span
                key={permission}
                className="rounded-full bg-muted px-3 py-1 text-[11px] font-bold text-muted-foreground"
                dir="ltr"
              >
                {permission}
              </span>
            ))}
          </div>
          {roles.length > 1 && (
            <p className="mt-4 text-xs font-semibold text-muted-foreground">
              لديك أكثر من دور: {roles.map((r) => ROLE_LABELS[r]).join(" • ")}
            </p>
          )}
        </section>
      )}
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[2rem] border border-border/60 bg-card p-6 shadow-soft">
      <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
        {icon}
      </span>
      <p className="mt-4 text-xs font-bold text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-extrabold text-foreground">{value}</p>
    </div>
  );
}

function PersonalDataForm() {
  const { profile, refresh, isReadOnly } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState<"ar" | "en">("ar");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

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

  return (
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
  );
}

function PasswordCard() {
  const { profile } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!currentPassword) next.currentPassword = "أدخل كلمة المرور الحالية";
    const parsed = passwordSchema.safeParse(newPassword);
    if (!parsed.success) next.newPassword = parsed.error.issues[0]?.message ?? "كلمة مرور غير صالحة";
    if (newPassword !== confirmPassword) next.confirmPassword = "كلمتا المرور غير متطابقتين";
    if (currentPassword && newPassword && currentPassword === newPassword) {
      next.newPassword = "اختر كلمة مرور مختلفة عن الحالية";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const email = profile?.email;
    if (!email) {
      toast.error("تعذّر تحديد بريد الحساب.");
      return;
    }

    setSaving(true);
    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (verifyError) {
        setErrors({ currentPassword: "كلمة المرور الحالية غير صحيحة" });
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("تم تغيير كلمة المرور بنجاح");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر تغيير كلمة المرور.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-[2rem] border border-border/60 bg-card p-6 shadow-soft sm:p-8"
      noValidate
    >
      <h2 className="text-lg font-extrabold text-foreground">تغيير كلمة المرور</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        لأمان حسابك، أدخل كلمة المرور الحالية ثم كلمة مرور جديدة قوية لا تقل عن 8 أحرف.
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="currentPassword" className="text-sm font-bold">
            كلمة المرور الحالية
          </Label>
          <PasswordInput
            id="currentPassword"
            value={currentPassword}
            onChange={setCurrentPassword}
            autoComplete="current-password"
            error={errors.currentPassword}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="newPassword" className="text-sm font-bold">
            كلمة المرور الجديدة
          </Label>
          <PasswordInput
            id="newPassword"
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
            showStrength
            error={errors.newPassword}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-sm font-bold">
            تأكيد كلمة المرور
          </Label>
          <PasswordInput
            id="confirmPassword"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            error={errors.confirmPassword}
          />
        </div>
      </div>

      <Button type="submit" disabled={saving} className="mt-7 rounded-2xl px-7 py-3 font-bold shadow-soft">
        {saving ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
        تحديث كلمة المرور
      </Button>
    </form>
  );
}

function SecurityCard() {
  const { refresh } = useAuth();
  const [revoking, setRevoking] = useState(false);

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
  );
}

function SessionsCard() {
  const { sessions } = useAuth();

  return (
    <section className="rounded-[2rem] border border-border/60 bg-card p-6 shadow-soft sm:p-8">
      <h2 className="text-lg font-extrabold text-foreground">الجلسات النشطة</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        الأجهزة التي سجّلت الدخول منها مؤخرًا.
      </p>
      <ul className="mt-5 space-y-3">
        {sessions.length === 0 && (
          <li className="rounded-2xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
            لا توجد جلسات مسجّلة بعد.
          </li>
        )}
        {sessions.map((session) => (
          <li
            key={session.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/60 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-sky/50 text-foreground">
                <Monitor className="size-4" />
              </span>
              <div>
                <p className="text-sm font-bold text-foreground">
                  {session.device ?? "جهاز غير معروف"} • {session.browser ?? "متصفح"}
                </p>
                <p className="text-xs text-muted-foreground" dir="ltr">
                  {session.ipAddress ?? "—"}
                </p>
              </div>
            </div>
            <p className="text-xs font-semibold text-muted-foreground">
              {formatDate(session.lastSeenAt)}
            </p>
          </li>
        ))}
      </ul>
    </section>
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

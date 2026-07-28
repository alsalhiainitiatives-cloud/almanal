import { Link } from "@tanstack/react-router";
import { LockKeyhole } from "lucide-react";

/** Explains an authorization failure in plain Arabic with clear next steps. */
export function AccessNotice({ message }: { message?: string }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-3 rounded-3xl border border-dashed border-destructive/40 bg-destructive/5 px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
        <LockKeyhole className="size-5" />
      </span>
      <p className="text-sm font-extrabold text-foreground">هذا الحساب غير مصرّح له بعرض هذا الطلب</p>
      <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
        يمكن فتح ملف الطلب فقط من حساب ولي الأمر صاحب الطلب، أو من حساب موظف مصرّح له في المدرسة
        (مسؤول التسجيل، المحاسب، المشرف، المديرة، مدير النظام). إذا كنت تعتقد أن لديك الصلاحية، سجّل
        الخروج ثم سجّل الدخول بالحساب الصحيح، أو تواصل مع مدير النظام لمنحك الصلاحية المناسبة.
      </p>
      {message ? (
        <p className="rounded-2xl bg-background/70 px-3 py-1.5 text-[11px] font-bold text-muted-foreground">
          تفاصيل: {message}
        </p>
      ) : null}
      <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
        <Link
          to="/auth"
          className="rounded-2xl bg-primary px-4 py-2 text-xs font-extrabold text-primary-foreground"
        >
          تسجيل الدخول بحساب آخر
        </Link>
        <Link
          to="/my-applications"
          className="rounded-2xl border border-border/60 px-4 py-2 text-xs font-extrabold text-muted-foreground"
        >
          طلباتي كولي أمر
        </Link>
        <Link
          to="/contact"
          className="rounded-2xl border border-border/60 px-4 py-2 text-xs font-extrabold text-muted-foreground"
        >
          تواصل مع الإدارة
        </Link>
      </div>
    </div>
  );
}

export function isAuthorizationError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /غير مصرح|غير مصرّح|صلاحية|Unauthorized|forbidden/i.test(message);
}
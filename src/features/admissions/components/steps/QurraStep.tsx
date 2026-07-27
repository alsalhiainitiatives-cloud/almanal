import { CheckCircle2, HeartHandshake, Info, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormSection, StatusNote, TextAreaField } from "../fields";
import type { QurraInput } from "../../schemas";

/**
 * Qurra is no longer a data-entry step: the mother's details are captured
 * inline in the guardian step. Here the family only confirms or opts out.
 */
export function QurraStep({
  value,
  eligible,
  reason,
  errors,
  onChange,
  onEditParent,
}: {
  value: QurraInput;
  eligible: boolean;
  reason?: string;
  errors: Record<string, string>;
  onChange: (patch: Partial<QurraInput>) => void;
  onEditParent: () => void;
}) {
  if (!eligible) {
    return (
      <FormSection title="برنامج قرة" icon={HeartHandshake}>
        <div className="py-6 text-center">
          <Info className="mx-auto size-9 text-primary" />
          <p className="mt-4 text-lg font-black text-foreground">برنامج قرة غير متاح لهذا الطلب</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            {reason ??
              "دعم «قرة» مخصص للأمهات السعوديات ولأطفال أقل من 6 سنوات. يمكنك متابعة الطلب بشكل طبيعي."}
          </p>
        </div>
      </FormSection>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4 rounded-[2rem] gradient-burgundy p-6 text-primary-foreground sm:p-8">
        <HeartHandshake className="mt-1 size-7 shrink-0" />
        <div className="min-w-0">
          <p className="text-xl font-black">دعم برنامج قرة للحضانات</p>
          <p className="mt-2 text-sm leading-relaxed text-primary-foreground/85">
            برنامج حكومي يدعم رسوم الحضانة للأمهات العاملات. جمعنا بياناتك في خطوة ولي الأمر — كل
            المطلوب الآن هو تأكيد رغبتك بالتقديم.
          </p>
        </div>
      </div>

      <FormSection
        title="بياناتك المسجّلة"
        icon={CheckCircle2}
        tone="accent"
        action={
          <Button type="button" variant="ghost" size="sm" onClick={onEditParent}>
            <Pencil className="size-3.5" />
            تعديل
          </Button>
        }
      >
        <dl className="grid gap-3 sm:grid-cols-2">
          <Row label="رقم هوية الأم" value={value.motherNationalId || "—"} />
          <Row
            label="الحالة الوظيفية"
            value={
              value.motherEmploymentStatus === "working"
                ? "عاملة"
                : value.motherEmploymentStatus === "not_working"
                  ? "غير عاملة"
                  : "—"
            }
          />
          <Row label="جهة العمل" value={value.motherEmployer || "—"} />
          <Row label="المسمى الوظيفي" value={value.motherJobTitle || "—"} />
        </dl>
      </FormSection>

      <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-border bg-card p-5 transition hover:border-primary/40">
        <Checkbox
          checked={value.requested}
          onCheckedChange={(c) => onChange({ requested: Boolean(c) })}
        />
        <span className="text-sm font-black text-foreground">أرغب بالتقديم على دعم قرة</span>
      </label>

      {value.requested ? (
        <FormSection title="الإقرار النهائي" icon={HeartHandshake}>
          <div className="space-y-5">
            <TextAreaField
              label="ملاحظات إضافية (اختياري)"
              value={value.notes ?? ""}
              onChange={(v) => onChange({ notes: v })}
              placeholder="أي معلومة تودّين إضافتها لطلب الدعم"
            />
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-beige/70 p-5">
              <Checkbox
                checked={value.declarationAccepted}
                onCheckedChange={(c) => onChange({ declarationAccepted: Boolean(c) })}
                className="mt-0.5"
              />
              <span className="text-sm leading-relaxed text-foreground">
                أقر بصحة البيانات المدخلة، وأعلم أن الموافقة على الدعم تصدر من الجهة المختصة، وأن
                المدرسة غير مسؤولة عن قرار الرفض.
              </span>
            </label>
            {errors.declarationAccepted ? (
              <p className="text-xs font-bold text-destructive">{errors.declarationAccepted}</p>
            ) : null}
          </div>
        </FormSection>
      ) : (
        <StatusNote tone="info" title="سيتم استكمال الطلب بدون دعم قرة" icon={Info}>
          يمكنك تفعيل الخيار في أي وقت قبل إرسال الطلب.
        </StatusNote>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border-2 border-border/60 bg-background p-4">
      <dt className="text-xs font-bold text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate text-sm font-black text-foreground">{value}</dd>
    </div>
  );
}
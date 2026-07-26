import { HeartHandshake, Info } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { SelectField, TextAreaField, TextField } from "../fields";
import type { QurraInput } from "../../schemas";

export function QurraStep({
  value,
  eligible,
  errors,
  onChange,
}: {
  value: QurraInput;
  eligible: boolean;
  errors: Record<string, string>;
  onChange: (patch: Partial<QurraInput>) => void;
}) {
  if (!eligible) {
    return (
      <div className="rounded-[2rem] bg-beige/60 p-8 text-center">
        <Info className="mx-auto size-8 text-primary" />
        <p className="mt-4 text-lg font-black text-foreground">برنامج قرة غير متاح لهذا الطلب</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          دعم «قرة» مخصص للأسر السعودية ولأطفال أقل من 6 سنوات. يمكنك متابعة الطلب بشكل طبيعي.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4 rounded-[2rem] gradient-burgundy p-6 text-primary-foreground">
        <HeartHandshake className="mt-1 size-7 shrink-0" />
        <div>
          <p className="text-lg font-black">دعم برنامج قرة للحضانات</p>
          <p className="mt-1 text-sm leading-relaxed text-primary-foreground/85">
            برنامج حكومي يدعم رسوم الحضانة للأمهات العاملات. تقديم الطلب لا يضمن القبول، والدعم يخضع
            لموافقة الجهة المختصة.
          </p>
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border/70 bg-card p-5">
        <Checkbox
          checked={value.requested}
          onCheckedChange={(c) => onChange({ requested: Boolean(c) })}
        />
        <span className="text-sm font-bold text-foreground">أرغب بالتقديم على دعم قرة</span>
      </label>

      {value.requested ? (
        <div className="space-y-5 rounded-[2rem] bg-card p-6 shadow-soft">
          <div className="grid gap-5 md:grid-cols-2">
            <TextField
              label="رقم هوية الأم"
              value={value.motherNationalId ?? ""}
              onChange={(v) => onChange({ motherNationalId: v.replace(/\D/g, "").slice(0, 10) })}
              error={errors.motherNationalId}
              dir="ltr"
              inputMode="numeric"
              required
            />
            <SelectField
              label="الحالة الوظيفية للأم"
              value={value.motherEmploymentStatus ?? ""}
              onChange={(v) => onChange({ motherEmploymentStatus: v })}
              options={[
                { value: "", label: "اختر الحالة" },
                { value: "government", label: "قطاع حكومي" },
                { value: "private", label: "قطاع خاص" },
                { value: "self", label: "عمل حر" },
                { value: "student", label: "طالبة" },
              ]}
              error={errors.motherEmploymentStatus}
              required
            />
            <TextField
              label="جهة العمل"
              value={value.motherEmployer ?? ""}
              onChange={(v) => onChange({ motherEmployer: v })}
              error={errors.motherEmployer}
            />
            <TextField
              label="المسمى الوظيفي"
              value={value.motherJobTitle ?? ""}
              onChange={(v) => onChange({ motherJobTitle: v })}
              error={errors.motherJobTitle}
            />
          </div>
          <TextAreaField
            label="ملاحظات إضافية (اختياري)"
            value={value.notes ?? ""}
            onChange={(v) => onChange({ notes: v })}
          />

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-beige/70 p-5">
            <Checkbox
              checked={value.declarationAccepted}
              onCheckedChange={(c) => onChange({ declarationAccepted: Boolean(c) })}
              className="mt-0.5"
            />
            <span className="text-sm leading-relaxed text-foreground">
              أقر بصحة البيانات المدخلة، وأعلم أن الموافقة على الدعم تصدر من الجهة المختصة، وأن المدرسة
              غير مسؤولة عن قرار الرفض.
            </span>
          </label>
          {errors.declarationAccepted ? (
            <p className="text-xs font-bold text-destructive">{errors.declarationAccepted}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
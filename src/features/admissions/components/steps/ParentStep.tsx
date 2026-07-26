import { BadgeCheck, Globe2 } from "lucide-react";

import { ChoiceChips, SelectField, TextField } from "../fields";
import { detectNationality, NATIONALITY_LABELS } from "../../eligibility";
import type { ParentInfoInput } from "../../schemas";

type Errors = Partial<Record<keyof ParentInfoInput, string>>;

export function ParentStep({
  value,
  errors,
  onChange,
}: {
  value: ParentInfoInput;
  errors: Errors;
  onChange: (patch: Partial<ParentInfoInput>) => void;
}) {
  const detected = detectNationality(value.nationalId);

  return (
    <div className="space-y-8">
      <div className="rounded-[2rem] bg-beige/60 p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <TextField
            label="رقم الهوية / الإقامة"
            value={value.nationalId}
            onChange={(v) => {
              const clean = v.replace(/\D/g, "").slice(0, 10);
              const nat = detectNationality(clean);
              onChange({ nationalId: clean, ...(nat ? { nationality: nat } : {}) });
            }}
            error={errors.nationalId}
            hint="يبدأ بـ 1 للمواطن و 2 للمقيم"
            required
            dir="ltr"
            inputMode="numeric"
            placeholder="1XXXXXXXXX"
          />
          <div className="flex items-end">
            <div
              className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black ${
                detected ? "bg-mint text-foreground" : "bg-card text-muted-foreground"
              }`}
            >
              {detected ? <BadgeCheck className="size-5" /> : <Globe2 className="size-5" />}
              {detected
                ? `تم تحديد الجنسية تلقائيًا: ${NATIONALITY_LABELS[detected]}`
                : "أدخل رقم الهوية لتحديد الجنسية تلقائيًا"}
            </div>
          </div>
          {detected === "resident" ? (
            <TextField
              label="بلد الجنسية"
              value={value.country ?? ""}
              onChange={(v) => onChange({ country: v })}
              error={errors.country}
              placeholder="مثال: مصر"
            />
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <TextField
          label="اسم ولي الأمر الرباعي"
          value={value.fullName}
          onChange={(v) => onChange({ fullName: v })}
          error={errors.fullName}
          required
        />
        <SelectField
          label="صلة القرابة"
          value={value.relationship}
          onChange={(v) => onChange({ relationship: v as ParentInfoInput["relationship"] })}
          options={[
            { value: "father", label: "الأب" },
            { value: "mother", label: "الأم" },
            { value: "guardian", label: "ولي أمر" },
          ]}
          required
        />
        <ChoiceChips
          label="الجنس"
          value={value.gender}
          onChange={(v) => onChange({ gender: v as ParentInfoInput["gender"] })}
          options={[
            { value: "male", label: "ذكر" },
            { value: "female", label: "أنثى" },
          ]}
          error={errors.gender}
          required
        />
        <TextField
          label="تاريخ الميلاد"
          value={value.birthDate}
          onChange={(v) => onChange({ birthDate: v })}
          error={errors.birthDate}
          type="date"
          dir="ltr"
          required
        />
        <TextField
          label="رقم الجوال"
          value={value.mobile}
          onChange={(v) => onChange({ mobile: v.replace(/\D/g, "").slice(0, 10) })}
          error={errors.mobile}
          dir="ltr"
          inputMode="tel"
          placeholder="05XXXXXXXX"
          required
        />
        <TextField
          label="جوال بديل (اختياري)"
          value={value.altMobile ?? ""}
          onChange={(v) => onChange({ altMobile: v.replace(/\D/g, "").slice(0, 10) })}
          error={errors.altMobile}
          dir="ltr"
          inputMode="tel"
          placeholder="05XXXXXXXX"
        />
        <TextField
          label="البريد الإلكتروني"
          value={value.email}
          onChange={(v) => onChange({ email: v })}
          error={errors.email}
          dir="ltr"
          inputMode="email"
          placeholder="name@example.com"
          required
        />
        <TextField
          label="المهنة (اختياري)"
          value={value.occupation ?? ""}
          onChange={(v) => onChange({ occupation: v })}
        />
        <TextField
          label="جهة العمل (اختياري)"
          value={value.employer ?? ""}
          onChange={(v) => onChange({ employer: v })}
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <TextField
          label="العنوان الوطني"
          value={value.nationalAddress}
          onChange={(v) => onChange({ nationalAddress: v })}
          error={errors.nationalAddress}
          required
          className="md:col-span-2"
        />
        <TextField
          label="المدينة"
          value={value.city}
          onChange={(v) => onChange({ city: v })}
          error={errors.city}
          required
        />
        <TextField
          label="الحي"
          value={value.district}
          onChange={(v) => onChange({ district: v })}
          error={errors.district}
          required
        />
        <TextField
          label="رابط الموقع على الخريطة (اختياري)"
          value={value.mapUrl ?? ""}
          onChange={(v) => onChange({ mapUrl: v })}
          error={errors.mapUrl}
          dir="ltr"
          placeholder="https://maps.app.goo.gl/..."
          className="md:col-span-2"
        />
      </div>
    </div>
  );
}
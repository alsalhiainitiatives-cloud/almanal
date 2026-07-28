import {
  BadgeCheck,
  Briefcase,
  CalendarDays,
  Globe2,
  HeartHandshake,
  IdCard,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import {
  ChoiceChips,
  CountryField,
  FieldGrid,
  FormSection,
  LockedField,
  SelectField,
  StatusNote,
  TextField,
} from "../fields";
import { detectNationality, NATIONALITY_LABELS } from "../../eligibility";
import { RELATIONSHIPS, relationshipGender } from "../../relationships";
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
  const impliedGender = relationshipGender(value.relationship);
  const isSaudiMother = value.relationship === "mother" && detected === "saudi";
  const isOtherGuardian = value.relationship !== "mother";
  // Non-mother guardians can still apply on behalf of a working Saudi mother.
  const showSpouseQurra = isOtherGuardian && value.motherIsSaudi === "yes";
  const showQurraDetails = (isSaudiMother || showSpouseQurra) && value.motherIsWorking === "yes";
  const showQurraBlock = isSaudiMother || isOtherGuardian;

  return (
    <div className="space-y-6">
      {/* ---------------------------------------------------------------- */}
      <FormSection
        title="الهوية والجنسية"
        description="نحدد جنسيتك تلقائيًا من أول رقم في الهوية — 1 للمواطن و 2 للمقيم."
        icon={IdCard}
        tone="accent"
      >
        <FieldGrid>
          <TextField
            label="رقم الهوية / الإقامة"
            value={value.nationalId}
            onChange={(v) => {
              const clean = v.replace(/\D/g, "").slice(0, 10);
              const nat = detectNationality(clean);
              onChange({
                nationalId: clean,
                ...(nat ? { nationality: nat } : {}),
                ...(nat === "saudi" ? { country: "" } : {}),
              });
            }}
            error={errors.nationalId}
            hint="10 أرقام بدون فواصل"
            required
            dir="ltr"
            inputMode="numeric"
            maxLength={10}
            placeholder="1XXXXXXXXX"
            icon={IdCard}
          />

          {detected ? (
            <LockedField
              label="الجنسية"
              value={NATIONALITY_LABELS[detected]}
              icon={BadgeCheck}
              note="محدَّدة تلقائيًا من رقم الهوية ولا يمكن تعديلها."
            />
          ) : (
            <div className="flex items-end">
              <div className="flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-border px-4 py-3.5 text-sm font-bold text-muted-foreground">
                <Globe2 className="size-5 shrink-0" />
                أدخل رقم الهوية لتحديد الجنسية
              </div>
            </div>
          )}

          {detected === "resident" ? (
            <CountryField
              label="بلد الجنسية"
              value={value.country ?? ""}
              onChange={(v) => onChange({ country: v })}
              error={errors.country}
              icon={Globe2}
              required
            />
          ) : null}
        </FieldGrid>
      </FormSection>

      {/* ---------------------------------------------------------------- */}
      <FormSection
        title="البيانات الشخصية"
        description="بيانات ولي الأمر المسؤول عن الطلب."
        icon={User}
      >
        <FieldGrid>
          <TextField
            label="الاسم الرباعي"
            value={value.fullName}
            onChange={(v) => onChange({ fullName: v })}
            error={errors.fullName}
            placeholder="الاسم كما في الهوية"
            required
            icon={User}
          />

          <SelectField
            label="صلة القرابة بالطفل"
            value={value.relationship}
            onChange={(v) => {
              const gender = relationshipGender(v);
              onChange({
                relationship: v as ParentInfoInput["relationship"],
                ...(gender ? { gender } : {}),
                ...(v === "other" ? {} : { relationshipOther: "" }),
                ...(v === "mother"
                  ? { motherIsSaudi: undefined, motherNationalId: "" }
                  : { motherIsWorking: undefined, motherDeclaration: false }),
              });
            }}
            options={RELATIONSHIPS.map((r) => ({ value: r.value, label: r.label }))}
            error={errors.relationship}
            required
            icon={Users}
          />

          {value.relationship === "other" ? (
            <TextField
              label="حدّد صلة القرابة"
              value={value.relationshipOther ?? ""}
              onChange={(v) => onChange({ relationshipOther: v })}
              error={errors.relationshipOther}
              placeholder="مثال: كفيل / وصي"
              required
            />
          ) : null}

          {impliedGender ? (
            <LockedField
              label="الجنس"
              value={impliedGender === "male" ? "ذكر" : "أنثى"}
              icon={ShieldCheck}
              note="مستنتج من صلة القرابة."
            />
          ) : (
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
          )}

          <TextField
            label="تاريخ الميلاد"
            value={value.birthDate}
            onChange={(v) => onChange({ birthDate: v })}
            error={errors.birthDate}
            hint="يجب ألا يقل العمر عن 16 سنة"
            type="date"
            dir="ltr"
            required
            icon={CalendarDays}
          />

          <TextField
            label="المهنة (اختياري)"
            value={value.occupation ?? ""}
            onChange={(v) => onChange({ occupation: v })}
            icon={Briefcase}
          />
          <TextField
            label="جهة العمل (اختياري)"
            value={value.employer ?? ""}
            onChange={(v) => onChange({ employer: v })}
          />
        </FieldGrid>
      </FormSection>

      {/* ---------------------------------------------------------------- */}
      <FormSection
        title="بيانات التواصل"
        description="سنستخدمها لإشعارك بكل تحديث على الطلب."
        icon={Phone}
      >
        <FieldGrid>
          <TextField
            label="رقم الجوال"
            value={value.mobile}
            onChange={(v) => onChange({ mobile: v.replace(/\D/g, "").slice(0, 10) })}
            error={errors.mobile}
            dir="ltr"
            inputMode="tel"
            maxLength={10}
            placeholder="05XXXXXXXX"
            required
            icon={Phone}
          />
          <TextField
            label="جوال بديل (اختياري)"
            value={value.altMobile ?? ""}
            onChange={(v) => onChange({ altMobile: v.replace(/\D/g, "").slice(0, 10) })}
            error={errors.altMobile}
            dir="ltr"
            inputMode="tel"
            maxLength={10}
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
            className="md:col-span-2"
            icon={Mail}
          />
        </FieldGrid>
      </FormSection>

      {/* ---------------------------------------------------------------- */}
      <FormSection
        title="العنوان الوطني"
        description="العنوان المختصر مكوّن من 4 أحرف إنجليزية كبيرة يتبعها 4 أرقام."
        icon={MapPin}
      >
        <FieldGrid>
          <TextField
            label="العنوان الوطني المختصر"
            value={value.nationalAddress}
            onChange={(v) =>
              onChange({
                nationalAddress: v
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, "")
                  .slice(0, 8),
              })
            }
            error={errors.nationalAddress}
            hint="مثال: DMAG3000"
            placeholder="DMAG3000"
            dir="ltr"
            maxLength={8}
            required
            icon={MapPin}
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
          />
        </FieldGrid>
      </FormSection>

      {/* ---------------------------------------------------------------- */}
      {showQurraBlock ? (
        <FormSection
          title="بيانات دعم قرة"
          description={
            isSaudiMother
              ? "لأنك الأم وسعودية الجنسية، نجمع بيانات دعم «قرة» هنا مباشرة لتوفير خطوة عليك."
              : "حتى لو لم تكن الأم هي المتقدمة، يمكن فتح ملف دعم «قرة» إذا كانت والدة الطفل سعودية وعاملة."
          }
          icon={HeartHandshake}
          tone="accent"
        >
          <div className="space-y-6">
            <StatusNote tone="info" title="ما هو برنامج قرة؟" icon={HeartHandshake}>
              برنامج حكومي يدعم رسوم الحضانة للأمهات العاملات. التقديم لا يضمن القبول، والقرار يصدر من
              الجهة المختصة.
            </StatusNote>

            <FieldGrid>
              {isOtherGuardian ? (
                <ChoiceChips
                  label="هل والدة الطفل سعودية الجنسية؟"
                  value={value.motherIsSaudi ?? ""}
                  onChange={(v) =>
                    onChange({
                      motherIsSaudi: v as "yes" | "no",
                      ...(v === "no"
                        ? {
                            motherIsWorking: undefined,
                            motherNationalId: "",
                            motherEmployer: "",
                            motherJobTitle: "",
                            motherDeclaration: false,
                          }
                        : {}),
                    })
                  }
                  options={[
                    { value: "yes", label: "نعم، سعودية" },
                    { value: "no", label: "غير سعودية" },
                  ]}
                  error={errors.motherIsSaudi}
                  required
                  className="md:col-span-2"
                />
              ) : null}

              {isSaudiMother || showSpouseQurra ? (
                <ChoiceChips
                  label={isOtherGuardian ? "هل والدة الطفل عاملة؟" : "الحالة الوظيفية"}
                value={value.motherIsWorking ?? ""}
                onChange={(v) =>
                  onChange({
                    motherIsWorking: v as "yes" | "no",
                    ...(v === "no" ? { motherEmployer: "", motherJobTitle: "" } : {}),
                  })
                }
                  options={[
                    { value: "yes", label: isOtherGuardian ? "نعم، تعمل" : "أعمل حاليًا" },
                    { value: "no", label: "غير عاملة" },
                  ]}
                error={errors.motherIsWorking}
                required
                className="md:col-span-2"
                />
              ) : null}

              {showQurraDetails ? (
                <>
                  {isOtherGuardian ? (
                    <>
                    <TextField
                      label="رقم هوية الأم"
                      value={value.motherNationalId ?? ""}
                      onChange={(v) => onChange({ motherNationalId: v.replace(/\D/g, "").slice(0, 10) })}
                      error={
                        errors.motherNationalId ??
                        ((value.motherNationalId ?? "").length > 0 && !(value.motherNationalId ?? "").startsWith("1")
                          ? "رقم هوية الأم يجب أن يبدأ بالرقم 1 للدلالة على أنها سعودية — دعم قرة متاح للأم السعودية فقط"
                          : undefined)
                      }
                      dir="ltr"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="1XXXXXXXXX"
                      required
                      icon={IdCard}
                    />
                    <p className="md:col-span-2 -mt-2 text-xs text-muted-foreground">
                      يبدأ رقم هوية المواطنة السعودية بالرقم 1.
                    </p>
                    </>
                  ) : null}
                  <TextField
                    label={isOtherGuardian ? "جهة عمل الأم" : "جهة العمل"}
                    value={value.motherEmployer ?? ""}
                    onChange={(v) => onChange({ motherEmployer: v })}
                    error={errors.motherEmployer}
                    required
                    icon={Briefcase}
                  />
                  <TextField
                    label="المسمى الوظيفي"
                    value={value.motherJobTitle ?? ""}
                    onChange={(v) => onChange({ motherJobTitle: v })}
                    error={errors.motherJobTitle}
                    required
                  />
                </>
              ) : null}
            </FieldGrid>

            {isSaudiMother || showQurraDetails ? (
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-border bg-background p-5 transition hover:border-primary/40">
              <Checkbox
                checked={Boolean(value.motherDeclaration)}
                onCheckedChange={(c) => onChange({ motherDeclaration: Boolean(c) })}
                className="mt-0.5"
              />
              <span className="text-sm leading-relaxed text-foreground">
                أقر بصحة البيانات المدخلة، وأعلم أن الموافقة على الدعم تصدر من الجهة المختصة، وأن
                إدارة الروضة غير مسؤولة عن قرار الرفض.
              </span>
            </label>
            ) : null}
            {errors.motherDeclaration ? (
              <p className="text-xs font-bold text-destructive">{errors.motherDeclaration}</p>
            ) : null}
          </div>
        </FormSection>
      ) : null}
    </div>
  );
}
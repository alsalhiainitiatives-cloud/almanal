import { AlertTriangle, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { Button } from "@/components/ui/button";
import { ChoiceChips, SelectField, TextAreaField, TextField } from "../fields";
import {
  ageInMonths,
  eligibleClassrooms,
  formatAge,
  isStageEligible,
  seatsLeft,
} from "../../eligibility";
import { emptyChild, type ChildInput } from "../../schemas";

type Stage = { id: string; slug: string; name_ar: string; min_age_months: number; max_age_months: number; total_seats: number; taken_seats: number };
type Classroom = { id: string; stage_id: string; name_ar: string; capacity: number; taken_seats: number; min_age_months: number | null; max_age_months: number | null; color_hex: string };

export function ChildrenStep({
  children,
  errors,
  duplicates,
  stages,
  classrooms,
  onChange,
}: {
  children: ChildInput[];
  errors: Record<string, string>;
  duplicates: Record<number, boolean>;
  stages: Stage[];
  classrooms: Classroom[];
  onChange: (next: ChildInput[]) => void;
}) {
  const patch = (index: number, p: Partial<ChildInput>) =>
    onChange(children.map((c, i) => (i === index ? { ...c, ...p } : c)));

  return (
    <div className="space-y-6">
      <AnimatePresence initial={false}>
        {children.map((child, index) => {
          const months = ageInMonths(child.birthDate);
          const fit = stages.filter((s) => isStageEligible(s, months));
          const rooms = child.stageId
            ? eligibleClassrooms(
                classrooms.filter((c) => c.stage_id === child.stageId),
                months,
              )
            : [];

          return (
            <motion.div
              key={index}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
              className="rounded-[2rem] border border-border/60 bg-card p-6 shadow-soft"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-foreground">الطفل {index + 1}</h3>
                {children.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onChange(children.filter((_, i) => i !== index))}
                    className="text-destructive"
                  >
                    <Trash2 className="size-4" />
                    حذف
                  </Button>
                ) : null}
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <TextField
                  label="اسم الطفل بالعربية"
                  value={child.nameAr}
                  onChange={(v) => patch(index, { nameAr: v })}
                  error={errors[`${index}.nameAr`]}
                  required
                />
                <TextField
                  label="الاسم بالإنجليزية (اختياري)"
                  value={child.nameEn ?? ""}
                  onChange={(v) => patch(index, { nameEn: v })}
                  dir="ltr"
                />
                <TextField
                  label="رقم هوية الطفل"
                  value={child.nationalId}
                  onChange={(v) => patch(index, { nationalId: v.replace(/\D/g, "").slice(0, 10) })}
                  error={errors[`${index}.nationalId`]}
                  dir="ltr"
                  inputMode="numeric"
                  required
                />
                <TextField
                  label="الجنسية"
                  value={child.nationality}
                  onChange={(v) => patch(index, { nationality: v })}
                  error={errors[`${index}.nationality`]}
                  required
                />
                <TextField
                  label="تاريخ الميلاد"
                  value={child.birthDate}
                  onChange={(v) => patch(index, { birthDate: v, stageId: "", classroomId: "" })}
                  error={errors[`${index}.birthDate`]}
                  type="date"
                  dir="ltr"
                  required
                />
                <ChoiceChips
                  label="الجنس"
                  value={child.gender}
                  onChange={(v) => patch(index, { gender: v as ChildInput["gender"] })}
                  options={[
                    { value: "male", label: "ذكر" },
                    { value: "female", label: "أنثى" },
                  ]}
                  required
                />
              </div>

              {duplicates[index] ? (
                <div className="mt-5 flex items-start gap-3 rounded-2xl bg-destructive/10 p-4 text-sm font-bold text-destructive">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  يوجد طلب سابق بنفس رقم الهوية لهذا العام الدراسي — يرجى مراجعة إدارة القبول.
                </div>
              ) : null}

              {months !== null ? (
                <div className="mt-5 rounded-2xl bg-beige/70 p-5">
                  <p className="text-sm font-black text-foreground">
                    عمر الطفل: {formatAge(months)}
                  </p>
                  {fit.length ? (
                    <>
                      <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-mint-foreground">
                        <CheckCircle2 className="size-3.5" />
                        المراحل المناسبة حسب العمر
                      </p>
                      <div className="mt-3 grid gap-4 md:grid-cols-2">
                        <SelectField
                          label="المرحلة"
                          value={child.stageId ?? ""}
                          onChange={(v) => patch(index, { stageId: v, classroomId: "" })}
                          options={[
                            { value: "", label: "اختر المرحلة" },
                            ...fit.map((s) => ({
                              value: s.id,
                              label: `${s.name_ar} (${seatsLeft(s)} مقعد)`,
                            })),
                          ]}
                          error={errors[`${index}.stageId`]}
                          required
                        />
                        <SelectField
                          label="الفصل"
                          value={child.classroomId ?? ""}
                          onChange={(v) => patch(index, { classroomId: v })}
                          options={[
                            { value: "", label: "ترك الاختيار للإدارة" },
                            ...rooms.map((c) => ({
                              value: c.id,
                              label: `${c.name_ar} (${seatsLeft(c)} مقعد)`,
                            })),
                          ]}
                        />
                      </div>
                    </>
                  ) : (
                    <p className="mt-2 flex items-center gap-2 text-xs font-bold text-destructive">
                      <AlertTriangle className="size-4" />
                      لا توجد مرحلة مطابقة لعمر الطفل حاليًا — تواصل مع إدارة القبول لمساعدتك.
                    </p>
                  )}
                </div>
              ) : null}

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <SelectField
                  label="حالة التطعيمات"
                  value={child.vaccinationStatus ?? "complete"}
                  onChange={(v) => patch(index, { vaccinationStatus: v as ChildInput["vaccinationStatus"] })}
                  options={[
                    { value: "complete", label: "مكتملة" },
                    { value: "partial", label: "غير مكتملة" },
                    { value: "none", label: "لا يوجد" },
                  ]}
                />
                <TextField
                  label="فصيلة الدم (اختياري)"
                  value={child.bloodType ?? ""}
                  onChange={(v) => patch(index, { bloodType: v })}
                  dir="ltr"
                  maxLength={6}
                />
                <TextField
                  label="مكان الميلاد (اختياري)"
                  value={child.birthPlace ?? ""}
                  onChange={(v) => patch(index, { birthPlace: v })}
                />
                <TextField
                  label="المدرسة السابقة (اختياري)"
                  value={child.previousSchool ?? ""}
                  onChange={(v) => patch(index, { previousSchool: v })}
                />
                <TextAreaField
                  label="حالات صحية (اختياري)"
                  value={child.medicalConditions ?? ""}
                  onChange={(v) => patch(index, { medicalConditions: v })}
                />
                <TextAreaField
                  label="حساسية (اختياري)"
                  value={child.allergies ?? ""}
                  onChange={(v) => patch(index, { allergies: v })}
                />
                <TextAreaField
                  label="احتياجات خاصة (اختياري)"
                  value={child.specialNeeds ?? ""}
                  onChange={(v) => patch(index, { specialNeeds: v })}
                  className="md:col-span-2"
                />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {children.length < 6 ? (
        <Button
          type="button"
          variant="soft"
          onClick={() => onChange([...children, emptyChild()])}
          className="w-full"
        >
          <Plus className="size-4" />
          إضافة طفل آخر
        </Button>
      ) : null}
    </div>
  );
}
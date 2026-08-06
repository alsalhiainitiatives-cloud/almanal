import {
  AlertTriangle,
  BadgeCheck,
  Baby,
  CalendarDays,
  CheckCircle2,
  Globe2,
  GraduationCap,
  HeartPulse,
  IdCard,
  Layers,
  Plus,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { Button } from "@/components/ui/button";
import {
  ChoiceChips,
  CountryField,
  FieldGrid,
  FormSection,
  LockedField,
  LockedGroup,
  SelectField,
  StatusNote,
  TextAreaField,
  TextField,
} from "../fields";
import {
  ageParts,
  detectNationality,
  eligibleClassrooms,
  formatAgeDetailed,
  isStageEligible,
  seatsLeft,
} from "../../eligibility";
import { SAUDI_PARENT_CHILD_MISMATCH, emptyChild, type ChildInput } from "../../schemas";

type Stage = {
  id: string;
  slug: string;
  name_ar: string;
  min_age_months: number;
  max_age_months: number;
  total_seats: number;
  taken_seats: number;
};
type Classroom = {
  id: string;
  stage_id: string;
  name_ar: string;
  capacity: number;
  taken_seats: number;
  min_age_months: number;
  max_age_months: number;
  color_hex: string;
};

const today = () => new Date().toISOString().slice(0, 10);

export function ChildrenStep({
  children,
  errors,
  duplicates,
  stages,
  classrooms,
  parentNationality,
  locked,
  onChange,
}: {
  children: ChildInput[];
  errors: Record<string, string>;
  duplicates: Record<number, string>;
  stages: Stage[];
  classrooms: Classroom[];
  parentNationality?: string;
  /** Pre-filled from an approved seat reservation → read-only. */
  locked?: boolean;
  onChange: (next: ChildInput[]) => void;
}) {
  const patch = (index: number, p: Partial<ChildInput>) =>
    onChange(children.map((c, i) => (i === index ? { ...c, ...p } : c)));

  return (
    <div className="space-y-6">
      <AnimatePresence initial={false}>
        {children.map((child, index) => {
          const parts = ageParts(child.birthDate);
          const months = parts?.totalMonths ?? null;
          const fit = stages.filter((s) => isStageEligible(s, months));
          const rooms = child.stageId ? eligibleClassrooms(classrooms, child.stageId, months) : [];
          const nat = detectNationality(child.nationalId);
          const nationalityConflict = parentNationality === "saudi" && nat === "resident";
          const selectedStage = stages.find((s) => s.id === child.stageId);
          const roomOption = (c: { id: string; name_ar: string; capacity?: number; taken_seats: number }) => ({
            value: c.id,
            label: `${c.name_ar} — ${seatsLeft(c)} مقعد متاح`,
          });

          return (
            <motion.div
              key={index}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
              className="overflow-hidden rounded-[2rem] border-2 border-border/70 bg-card shadow-soft"
            >
              {/* Child header */}
              <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 gradient-burgundy px-5 py-4 text-primary-foreground sm:px-7">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-foreground/15 text-base font-black">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-black leading-tight">
                      {child.nameAr?.trim() || `الطفل ${index + 1}`}
                    </p>
                    <p className="truncate text-xs font-bold text-primary-foreground/80">
                      {parts ? formatAgeDetailed(parts) : "لم يتم إدخال تاريخ الميلاد بعد"}
                    </p>
                  </div>
                </div>
                {children.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`حذف الطفل ${index + 1}`}
                    onClick={() => onChange(children.filter((_, i) => i !== index))}
                    className="shrink-0 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
                  >
                    <Trash2 className="size-4" />
                    <span className="hidden sm:inline">حذف</span>
                  </Button>
                ) : null}
              </header>

              <div className="space-y-8 p-5 sm:p-7">
                {/* Identity ------------------------------------------------ */}
                <div className="space-y-5">
                  <SubTitle icon={IdCard} title="هوية الطفل" />
                  <LockedGroup locked={locked}>
                  <FieldGrid>
                    <TextField
                      label="اسم الطفل بالعربية"
                      value={child.nameAr}
                      onChange={(v) => patch(index, { nameAr: v })}
                      error={errors[`${index}.nameAr`]}
                      placeholder="الاسم الرباعي كما في شهادة الميلاد"
                      required
                      icon={UserRound}
                    />
                    <TextField
                      label="الاسم بالإنجليزية (اختياري)"
                      value={child.nameEn ?? ""}
                      onChange={(v) => patch(index, { nameEn: v })}
                      dir="ltr"
                      placeholder="Full name in English"
                    />
                    <TextField
                      label="رقم هوية الطفل"
                      value={child.nationalId}
                      onChange={(v) => {
                        const clean = v.replace(/\D/g, "").slice(0, 10);
                        const detected = detectNationality(clean);
                        patch(index, {
                          nationalId: clean,
                          nationality: detected === "saudi" ? "سعودي" : detected ? "مقيم" : "",
                          ...(detected === "saudi" ? { country: "" } : {}),
                        });
                      }}
                      error={
                        nationalityConflict
                          ? SAUDI_PARENT_CHILD_MISMATCH
                          : errors[`${index}.nationalId`]
                      }
                      hint={
                        parentNationality === "saudi"
                          ? "ولي الأمر سعودي — يجب أن يبدأ رقم هوية الطفل بالرقم 1"
                          : "1 للمواطن و 2 للمقيم"
                      }
                      dir="ltr"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="1XXXXXXXXX"
                      required
                      icon={IdCard}
                    />
                    {nat ? (
                      <LockedField
                        label="جنسية الطفل"
                        value={nat === "saudi" ? "سعودي" : "مقيم"}
                        icon={BadgeCheck}
                        note="محدَّدة تلقائيًا من رقم الهوية."
                      />
                    ) : (
                      <LockedField label="جنسية الطفل" value="—" icon={Globe2} note="أدخل رقم الهوية أولًا." />
                    )}
                    {nat === "resident" ? (
                      <CountryField
                        label="بلد الجنسية"
                        value={child.country ?? ""}
                        onChange={(v) => patch(index, { country: v })}
                        error={errors[`${index}.country`]}
                        icon={Globe2}
                        required
                      />
                    ) : null}
                    <TextField
                      label="تاريخ الميلاد"
                      value={child.birthDate}
                      onChange={(v) =>
                        patch(index, {
                          birthDate: v,
                          stageId: "",
                          classroomId: "",
                          preference2: "",
                          preference3: "",
                        })
                      }
                      error={errors[`${index}.birthDate`]}
                      type="date"
                      dir="ltr"
                      required
                      icon={CalendarDays}
                      hint={`لا يمكن اختيار تاريخ بعد ${today()}`}
                    />
                    <ChoiceChips
                      label="الجنس"
                      value={child.gender}
                      onChange={(v) => patch(index, { gender: v as ChildInput["gender"] })}
                      options={[
                        { value: "male", label: "ذكر" },
                        { value: "female", label: "أنثى" },
                      ]}
                      error={errors[`${index}.gender`]}
                      required
                    />
                  </FieldGrid>
                  </LockedGroup>

                  {duplicates[index] ? (
                    <StatusNote tone="error" title="طلب مكرر لنفس رقم الهوية" icon={AlertTriangle}>
                      {duplicates[index]}
                    </StatusNote>
                  ) : null}
                </div>

                {/* Eligibility --------------------------------------------- */}
                <div className="space-y-5">
                  <SubTitle icon={Sparkles} title="ملخص الأهلية والمرحلة" />

                  {parts === null ? (
                    <StatusNote tone="info" title="أدخل تاريخ الميلاد" icon={CalendarDays}>
                      سنحسب العمر بدقة (بالسنوات والأشهر والأيام) ونعرض المراحل والفصول المتاحة تلقائيًا.
                    </StatusNote>
                  ) : (
                    <>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <StatCell label="العمر الحالي" value={formatAgeDetailed(parts)} />
                        <StatCell label="العمر بالأشهر" value={`${parts.totalMonths} شهرًا`} />
                        <StatCell
                          label="المراحل المطابقة"
                          value={fit.length ? `${fit.length} مرحلة` : "لا يوجد"}
                          tone={fit.length ? "ok" : "bad"}
                        />
                      </div>

                      {fit.length ? (
                        <>
                          <StatusNote
                            tone="success"
                            title="الطفل مستوفٍ لشروط العمر"
                            icon={CheckCircle2}
                          >
                            المراحل المتاحة: {fit.map((s) => s.name_ar).join("، ")}
                          </StatusNote>

                          <FieldGrid>
                            <SelectField
                              label="المرحلة الدراسية"
                              value={child.stageId ?? ""}
                              onChange={(v) =>
                                patch(index, {
                                  stageId: v,
                                  classroomId: "",
                                  preference2: "",
                                  preference3: "",
                                })
                              }
                              options={[
                                { value: "", label: "اختر المرحلة" },
                                ...fit.map((s) => ({
                                  value: s.id,
                                  label: `${s.name_ar} — ${seatsLeft(s)} مقعد متاح`,
                                })),
                              ]}
                              error={errors[`${index}.stageId`]}
                              required
                              icon={Layers}
                            />
                            <SelectField
                              label="الرغبة الأولى (الفصل)"
                              value={child.classroomId ?? ""}
                              onChange={(v) => patch(index, { classroomId: v })}
                              options={[
                                { value: "", label: "ترك الاختيار للإدارة" },
                                ...rooms.map(roomOption),
                              ]}
                              error={errors[`${index}.classroomId`]}
                              disabled={!child.stageId}
                              hint={selectedStage ? undefined : "اختر المرحلة أولًا"}
                              icon={GraduationCap}
                            />
                            <SelectField
                              label="الرغبة الثانية (اختياري)"
                              value={child.preference2 ?? ""}
                              onChange={(v) => patch(index, { preference2: v })}
                              options={[
                                { value: "", label: "بدون" },
                                ...rooms.filter((c) => c.id !== child.classroomId).map(roomOption),
                              ]}
                              error={errors[`${index}.preference2`]}
                              disabled={!child.stageId}
                            />
                            <SelectField
                              label="الرغبة الثالثة (اختياري)"
                              value={child.preference3 ?? ""}
                              onChange={(v) => patch(index, { preference3: v })}
                              options={[
                                { value: "", label: "بدون" },
                                ...rooms
                                  .filter(
                                    (c) => c.id !== child.classroomId && c.id !== child.preference2,
                                  )
                                  .map(roomOption),
                              ]}
                              error={errors[`${index}.preference3`]}
                              disabled={!child.stageId}
                            />
                          </FieldGrid>

                          {child.stageId && rooms.length === 0 ? (
                            <StatusNote tone="warning" title="لا توجد فصول شاغرة حاليًا" icon={AlertTriangle}>
                              يمكنك متابعة الطلب وسيتم وضع الطفل على قائمة الانتظار لهذه المرحلة.
                            </StatusNote>
                          ) : null}
                        </>
                      ) : (
                        <StatusNote tone="error" title="لا توجد مرحلة مطابقة لعمر الطفل" icon={AlertTriangle}>
                          يرجى التواصل مع إدارة القبول لمساعدتك في تحديد الخيار الأنسب.
                        </StatusNote>
                      )}
                    </>
                  )}
                </div>

                {/* Health & history ---------------------------------------- */}
                <div className="space-y-5">
                  <SubTitle icon={HeartPulse} title="الحالة الصحية والسجل الدراسي" />
                  <FieldGrid>
                    <SelectField
                      label="حالة التطعيمات"
                      value={child.vaccinationStatus ?? "complete"}
                      onChange={(v) =>
                        patch(index, { vaccinationStatus: v as ChildInput["vaccinationStatus"] })
                      }
                      options={[
                        { value: "complete", label: "مكتملة" },
                        { value: "partial", label: "غير مكتملة" },
                        { value: "none", label: "لا يوجد" },
                      ]}
                      icon={HeartPulse}
                    />
                    <TextField
                      label="فصيلة الدم (اختياري)"
                      value={child.bloodType ?? ""}
                      onChange={(v) => patch(index, { bloodType: v })}
                      dir="ltr"
                      maxLength={6}
                      placeholder="O+"
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
                      icon={GraduationCap}
                    />
                    <TextAreaField
                      label="حالات صحية (اختياري)"
                      value={child.medicalConditions ?? ""}
                      onChange={(v) => patch(index, { medicalConditions: v })}
                      placeholder="اذكر أي حالة صحية يجب أن نعرفها"
                    />
                    <TextAreaField
                      label="حساسية (اختياري)"
                      value={child.allergies ?? ""}
                      onChange={(v) => patch(index, { allergies: v })}
                      placeholder="حساسية طعام، دواء، ..."
                    />
                    <TextAreaField
                      label="احتياجات خاصة (اختياري)"
                      value={child.specialNeeds ?? ""}
                      onChange={(v) => patch(index, { specialNeeds: v })}
                      className="md:col-span-2"
                    />
                  </FieldGrid>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {children.length < 6 ? (
        <button
          type="button"
          onClick={() => onChange([...children, emptyChild()])}
          className="flex w-full items-center justify-center gap-3 rounded-[2rem] border-2 border-dashed border-primary/40 bg-primary/[0.04] p-6 text-base font-black text-primary transition hover:border-primary hover:bg-primary/10"
        >
          <Plus className="size-5" />
          إضافة طفل آخر
          <Baby className="size-5" />
        </button>
      ) : null}

      <FormSection title="ملاحظة" icon={Sparkles} tone="accent">
        <p className="text-sm leading-relaxed text-muted-foreground">
          يمكنك تسجيل حتى 6 أبناء في طلب واحد. لكل طفل بيانات ومستندات مستقلة، ويتم احتساب خصم الإخوة
          تلقائيًا في الملخص المالي.
        </p>
      </FormSection>
    </div>
  );
}

function SubTitle({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-border/60 pb-2.5">
      <Icon className="size-4 text-primary" />
      <h4 className="text-sm font-black uppercase tracking-wide text-foreground">{title}</h4>
    </div>
  );
}

function StatCell({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "ok" | "bad";
}) {
  const toneClass =
    tone === "ok" ? "text-mint-foreground" : tone === "bad" ? "text-destructive" : "text-primary";
  return (
    <div className="rounded-2xl border-2 border-border/70 bg-beige/50 p-4">
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p className={`mt-1 text-sm font-black ${toneClass}`}>{value}</p>
    </div>
  );
}
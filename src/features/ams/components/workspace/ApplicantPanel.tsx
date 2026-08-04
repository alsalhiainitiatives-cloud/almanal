import { Baby, FileText, HeartPulse, Phone, Receipt, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import {
  NATIONALITY_LABELS,
  QURRA_STATUS_LABELS,
  ageParts,
  formatAgeDetailed,
} from "@/features/admissions/eligibility";
import {
  childEligibility,
  classroomOf,
  documentCompletion,
  stageOf,
} from "../../recommendations";
import type { WorkspaceData } from "../../types";
import { Tone, formatDate, money } from "../atoms";
function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/40 py-2 last:border-0">
      <span className="shrink-0 text-[11px] font-bold text-muted-foreground">{label}</span>
      <span className="text-end text-xs font-semibold text-foreground">{value || "—"}</span>
    </div>
  );
}
export function ApplicantPanel({ data }: { data: WorkspaceData }) {
  const [openChild, setOpenChild] = useState<string | null>(data.children[0]?.id ?? null);
  const parentDocs = documentCompletion(data, null);
  const draft = (data.application.draft_data ?? {}) as Record<string, Record<string, string>>;
  const parentDraft = (draft.parent ?? {}) as Record<string, string>;
  const docLabel = (slug: string) => data.documentTypes.find((t) => t.slug === slug)?.name_ar ?? slug;
  return (
    <Accordion type="multiple" defaultValue={["parent", "children"]} className="space-y-3">
      <AccordionItem value="parent" className="rounded-3xl border border-border/60 bg-card px-4">
        <AccordionTrigger className="text-sm font-extrabold">
          <span className="flex items-center gap-2">
            <UserRound className="size-4 text-primary" /> بيانات ولي الأمر
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <Row label="الاسم" value={parentDraft.fullName || data.parent?.fullName} />
          <Row label="رقم الهوية" value={data.application.parent_national_id} />
          <Row
            label="الجنسية"
            value={
              data.application.parent_nationality
                ? (NATIONALITY_LABELS[data.application.parent_nationality as "saudi" | "resident"] ??
                  data.application.parent_nationality)
                : "—"
            }
          />
          <Row label="صلة القرابة" value={data.application.parent_relationship} />
          <Row label="جهة العمل" value={parentDraft.employer} />
          <Row
            label="العنوان"
            value={[parentDraft.city, parentDraft.district, parentDraft.street].filter(Boolean).join(" — ")}
          />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="contact" className="rounded-3xl border border-border/60 bg-card px-4">
        <AccordionTrigger className="text-sm font-extrabold">
          <span className="flex items-center gap-2">
            <Phone className="size-4 text-primary" /> بيانات التواصل
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <Row label="الجوال" value={<span dir="ltr">{parentDraft.mobile || data.parent?.phone || "—"}</span>} />
          <Row label="البريد" value={<span dir="ltr">{parentDraft.email || data.parent?.email || "—"}</span>} />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="children" className="rounded-3xl border border-border/60 bg-card px-4">
        <AccordionTrigger className="text-sm font-extrabold">
          <span className="flex items-center gap-2">
            <Baby className="size-4 text-primary" /> الأبناء ({data.children.length})
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-2.5">
          {data.children.map((child, index) => {
            const docs = documentCompletion(data, index);
            const eligibility = childEligibility(data, child);
            const stage = stageOf(data, child.stage_id);
            const open = openChild === child.id;
            return (
              <div key={child.id} className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                <button
                  type="button"
                  onClick={() => setOpenChild(open ? null : child.id)}
                  className="flex w-full items-center gap-3 text-start"
                >
                  {child.photo_url ? (
                    <img src={child.photo_url} alt={child.name_ar} className="size-11 rounded-2xl object-cover" />
                  ) : (
                    <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-sm font-extrabold text-primary">
                      {child.name_ar.charAt(0)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-extrabold text-foreground">{child.name_ar}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {stage?.name_ar ?? "بدون مرحلة"} · {formatAgeDetailed(ageParts(child.birth_date))}
                    </p>
                  </div>
                  <Tone tone={eligibility.ok ? "green" : "red"}>{eligibility.ok ? "مؤهل" : "غير مؤهل"}</Tone>
                </button>
                <div className="mt-2.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                    <span>اكتمال المستندات</span>
                    <span>{docs.percent}%</span>
                  </div>
                  <Progress value={docs.percent} className="mt-1 h-1.5" />
                </div>
                {open ? (
                  <div className="mt-3 border-t border-border/50 pt-2">
                    <Row label="الهوية / الإقامة" value={child.national_id} />
                    <Row label="تاريخ الميلاد" value={formatDate(child.birth_date)} />
                    <Row
                      label="الجنس"
                      value={child.gender === "male" ? "ذكر" : child.gender === "female" ? "أنثى" : child.gender}
                    />
                    <Row label="الجنسية" value={child.nationality} />
                    <Row label="الرغبة الأولى" value={classroomOf(data, child.preference_1_classroom_id)?.name_ar} />
                    <Row label="الرغبة الثانية" value={classroomOf(data, child.preference_2_classroom_id)?.name_ar} />
                    <Row label="الرغبة الثالثة" value={classroomOf(data, child.preference_3_classroom_id)?.name_ar} />
                    <Row label="الفصل المخصص" value={classroomOf(data, child.classroom_id)?.name_ar} />
                    <Row label="حالة الأهلية" value={eligibility.reason} />
                    <Row label="حالات صحية" value={child.medical_conditions} />
                    <Row label="حساسية" value={child.allergies} />
                    <Row label="احتياج خاص" value={child.special_needs} />
                    <Row label="التطعيمات" value={vaccinationLabel(child.vaccination_status)} />
                    {docs.missing.length > 0 ? (
                      <p className="mt-2 rounded-xl bg-destructive/8 px-3 py-2 text-[11px] font-bold text-destructive">
                        ناقص: {docs.missing.map(docLabel).join("، ")}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="medical" className="rounded-3xl border border-border/60 bg-card px-4">
        <AccordionTrigger className="text-sm font-extrabold">
          <span className="flex items-center gap-2">
            <HeartPulse className="size-4 text-primary" /> الملخص الصحي
          </span>
        </AccordionTrigger>
        <AccordionContent>
          {data.children.map((child) => (
            <Row
              key={child.id}
              label={child.name_ar}
              value={
                [child.medical_conditions, child.allergies, child.special_needs].filter(Boolean).join(" · ") ||
                "لا توجد ملاحظات"
              }
            />
          ))}
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="docs" className="rounded-3xl border border-border/60 bg-card px-4">
        <AccordionTrigger className="text-sm font-extrabold">
          <span className="flex items-center gap-2">
            <FileText className="size-4 text-primary" /> مستندات ولي الأمر ({parentDocs.percent}%)
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <Progress value={parentDocs.percent} className="mb-2 h-1.5" />
          {data.documents
            .filter((doc) => doc.child_index === null)
            .map((doc) => (
              <Row key={doc.id} label={docLabel(doc.document_type_slug)} value={doc.file_name ?? "ملف"} />
            ))}
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="finance" className="rounded-3xl border border-border/60 bg-card px-4">
        <AccordionTrigger className="text-sm font-extrabold">
          <span className="flex items-center gap-2">
            <Receipt className="size-4 text-primary" /> الملخص المالي
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <Row label="رسوم التسجيل" value={money(data.application.admission_fee)} />
          <Row label="الرسوم الدراسية" value={money(data.application.tuition_total)} />
          <Row label="الخدمات" value={money(data.application.services_total)} />
          <Row label="الخصم" value={money(data.application.discount_total)} />
          <Row
            label="الإجمالي"
            value={<span className="font-extrabold text-primary">{money(data.application.grand_total)}</span>}
          />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="qurra" className="rounded-3xl border border-border/60 bg-card px-4">
        <AccordionTrigger className="text-sm font-extrabold">
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" /> ملخص دعم قرة
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <Row label="مطلوب" value={data.qurra?.requested ? "نعم" : "لا"} />
          <Row label="الحالة" value={QURRA_STATUS_LABELS[data.qurra?.status ?? "not_requested"]} />
          <Row label="عمل الأم" value={data.qurra?.mother_employment_status} />
          <Row label="جهة العمل" value={data.qurra?.mother_employer} />
          <Row label="ملاحظات" value={data.qurra?.notes} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
import {
  Baby,
  FileText,
  HeartHandshake,
  Pencil,
  Sparkles,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ageParts, formatAgeDetailed, NATIONALITY_LABELS } from "../../eligibility";
import { relationshipLabel } from "../../relationships";
import { VACCINATION_LABELS } from "../../schemas";
import type { ChildInput, ParentInfoInput, QurraInput } from "../../schemas";

export function ReviewStep({
  parent,
  children,
  qurra,
  serviceNames,
  documentNames,
  classroomNameOf,
  stageNameOf,
  onEdit,
}: {
  parent: ParentInfoInput;
  children: ChildInput[];
  qurra: QurraInput;
  serviceNames: string[];
  documentNames: string[];
  classroomNameOf: (id?: string) => string;
  stageNameOf: (classroomId?: string) => string;
  onEdit: (step: number) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-[2rem] border-2 border-primary/25 bg-primary/[0.04] p-6 text-center">
        <Sparkles className="mx-auto size-7 text-primary" />
        <h2 className="mt-3 text-xl font-black text-foreground">راجع طلبك قبل الإرسال</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
          تأكد من صحة كل البيانات. يمكنك الرجوع لأي خطوة وتعديلها — لن تفقد أي معلومة أدخلتها.
        </p>
      </div>

      <Card title="بيانات ولي الأمر" icon={UserRound} step={3} onEdit={onEdit}>
        <Row label="الاسم" value={parent.fullName} />
        <Row label="رقم الهوية" value={parent.nationalId} />
        <Row label="الجنسية" value={NATIONALITY_LABELS[parent.nationality] ?? parent.nationality} />
        {parent.nationality === "resident" ? (
          <Row label="بلد الجنسية" value={parent.country || "—"} />
        ) : null}
        <Row
          label="صلة القرابة"
          value={
            parent.relationship === "other"
              ? parent.relationshipOther || "أخرى"
              : relationshipLabel(parent.relationship)
          }
        />
        <Row label="الجوال" value={parent.mobile} />
        <Row label="البريد" value={parent.email} />
        <Row label="العنوان الوطني" value={parent.nationalAddress} />
        <Row label="المدينة / الحي" value={`${parent.city} — ${parent.district}`} />
      </Card>

      <Card title="الأبناء" icon={Baby} step={4} onEdit={onEdit}>
        <div className="space-y-4">
          {children.map((c, i) => (
            <div key={i} className="rounded-2xl border-2 border-border/60 bg-beige/50 p-4">
              <p className="mb-2 font-black text-foreground">
                {i + 1}. {c.nameAr}
              </p>
              <Row label="رقم الهوية" value={c.nationalId} />
              <Row label="العمر" value={formatAgeDetailed(ageParts(c.birthDate))} />
              <Row label="الجنس" value={c.gender === "male" ? "ذكر" : "أنثى"} />
              <Row label="الجنسية" value={c.nationality || "—"} />
              <Row label="المرحلة" value={stageNameOf(c.classroomId)} />
              <Row label="الرغبة الأولى" value={classroomNameOf(c.classroomId)} />
              {c.preference2 ? (
                <Row label="الرغبة الثانية" value={classroomNameOf(c.preference2)} />
              ) : null}
              {c.preference3 ? (
                <Row label="الرغبة الثالثة" value={classroomNameOf(c.preference3)} />
              ) : null}
              <Row
                label="التطعيمات"
                value={VACCINATION_LABELS[c.vaccinationStatus ?? "complete"] ?? "—"}
              />
            </div>
          ))}
        </div>
      </Card>

      <Card title="برنامج قرة" icon={HeartHandshake} step={5} onEdit={onEdit}>
        <Row label="الحالة" value={qurra.requested ? "مطلوب" : "غير مطلوب"} />
        {qurra.requested ? <Row label="هوية الأم" value={qurra.motherNationalId || "—"} /> : null}
      </Card>

      <Card title="الخدمات" icon={Sparkles} step={6} onEdit={onEdit}>
        <p className="text-sm font-bold text-foreground">
          {serviceNames.length ? serviceNames.join("، ") : "لم يتم اختيار خدمات إضافية"}
        </p>
      </Card>

      <Card title="المستندات" icon={FileText} step={7} onEdit={onEdit}>
        <p className="text-sm font-bold text-foreground">
          {documentNames.length
            ? `${documentNames.length} مستند مرفوع`
            : "لم يتم رفع مستندات بعد"}
        </p>
      </Card>
    </div>
  );
}

function Card({
  title,
  step,
  icon: Icon,
  onEdit,
  children,
}: {
  title: string;
  step: number;
  icon: React.ComponentType<{ className?: string }>;
  onEdit: (step: number) => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border-2 border-border/70 bg-card p-6 shadow-soft">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border/60 pb-3">
        <h3 className="flex min-w-0 items-center gap-2.5 font-black text-foreground">
          <Icon className="size-4 shrink-0 text-primary" />
          <span className="truncate">{title}</span>
        </h3>
        <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(step)}>
          <Pencil className="size-3.5" />
          تعديل
        </Button>
      </div>
      <div className="mt-4 space-y-2">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-dashed border-border/50 pb-2 text-sm last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-bold text-foreground">{value || "—"}</span>
    </div>
  );
}
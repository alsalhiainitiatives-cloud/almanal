import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatAge, ageInMonths, NATIONALITY_LABELS } from "../../eligibility";
import { RELATIONSHIP_LABELS, VACCINATION_LABELS } from "../../schemas";
import type { ChildInput, ParentInfoInput, QurraInput } from "../../schemas";

export function ReviewStep({
  parent,
  children,
  qurra,
  serviceNames,
  documentNames,
  stageName,
  onEdit,
}: {
  parent: ParentInfoInput;
  children: ChildInput[];
  qurra: QurraInput;
  serviceNames: string[];
  documentNames: string[];
  stageName: string;
  onEdit: (step: number) => void;
}) {
  return (
    <div className="space-y-5">
      <Card title="المرحلة" step={2} onEdit={onEdit}>
        <Row label="المرحلة المختارة" value={stageName} />
      </Card>

      <Card title="بيانات ولي الأمر" step={3} onEdit={onEdit}>
        <Row label="الاسم" value={parent.fullName} />
        <Row label="رقم الهوية" value={parent.nationalId} />
        <Row label="الجنسية" value={NATIONALITY_LABELS[parent.nationality] ?? parent.nationality} />
        <Row label="صلة القرابة" value={RELATIONSHIP_LABELS[parent.relationship]} />
        <Row label="الجوال" value={parent.mobile} />
        <Row label="البريد" value={parent.email} />
        <Row label="العنوان" value={`${parent.city} — ${parent.district}`} />
      </Card>

      <Card title="الأبناء" step={4} onEdit={onEdit}>
        <div className="space-y-4">
          {children.map((c, i) => (
            <div key={i} className="rounded-2xl bg-beige/60 p-4">
              <p className="font-black text-foreground">{c.nameAr}</p>
              <Row label="رقم الهوية" value={c.nationalId} />
              <Row label="العمر" value={formatAge(ageInMonths(c.birthDate))} />
              <Row label="الجنس" value={c.gender === "male" ? "ذكر" : "أنثى"} />
              <Row
                label="التطعيمات"
                value={VACCINATION_LABELS[c.vaccinationStatus ?? "complete"] ?? "—"}
              />
            </div>
          ))}
        </div>
      </Card>

      <Card title="برنامج قرة" step={5} onEdit={onEdit}>
        <Row label="الحالة" value={qurra.requested ? "مطلوب" : "غير مطلوب"} />
        {qurra.requested ? (
          <Row label="هوية الأم" value={qurra.motherNationalId || "—"} />
        ) : null}
      </Card>

      <Card title="الخدمات" step={6} onEdit={onEdit}>
        <p className="text-sm text-foreground">
          {serviceNames.length ? serviceNames.join("، ") : "لم يتم اختيار خدمات إضافية"}
        </p>
      </Card>

      <Card title="المستندات" step={7} onEdit={onEdit}>
        <p className="text-sm text-foreground">
          {documentNames.length ? documentNames.join("، ") : "لم يتم رفع مستندات بعد"}
        </p>
      </Card>
    </div>
  );
}

function Card({
  title,
  step,
  onEdit,
  children,
}: {
  title: string;
  step: number;
  onEdit: (step: number) => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-border/60 bg-card p-6 shadow-soft">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-foreground">{title}</h3>
        <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(step)}>
          <Pencil className="size-3.5" />
          تعديل
        </Button>
      </div>
      <div className="mt-4 space-y-1.5">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold text-foreground">{value || "—"}</span>
    </div>
  );
}
import { ageParts } from "@/features/admissions/eligibility";
import type { WorkspaceData } from "./types";

export type Recommendation = {
  tone: "green" | "yellow" | "red";
  title: string;
  detail?: string;
};

export type Insight = {
  label: string;
  value: string;
  tone: "green" | "yellow" | "red" | "neutral";
};

export function requiredSlugsFor(data: WorkspaceData, childIndex: number | null) {
  const scope = childIndex === null ? "parent" : "child";
  return data.documentTypes.filter((t) => t.scope === scope && t.is_required).map((t) => t.slug);
}

export function documentCompletion(data: WorkspaceData, childIndex: number | null) {
  const required = requiredSlugsFor(data, childIndex);
  if (!required.length) return { percent: 100, missing: [] as string[], rejected: [] as string[] };
  const docs = data.documents.filter((d) =>
    childIndex === null ? d.child_index === null : d.child_index === childIndex,
  );
  const missing = required.filter((slug) => !docs.some((d) => d.document_type_slug === slug));
  const rejected = docs.filter((d) => d.status === "rejected").map((d) => d.document_type_slug);
  const done = required.length - missing.length;
  return { percent: Math.round((done / required.length) * 100), missing, rejected };
}

export function overallCompletion(data: WorkspaceData) {
  const parts = [documentCompletion(data, null).percent];
  data.children.forEach((_, index) => parts.push(documentCompletion(data, index).percent));
  const docs = Math.round(parts.reduce((a, b) => a + b, 0) / Math.max(1, parts.length));
  const hasChildren = data.children.length > 0 ? 100 : 0;
  const hasParent = data.application.parent_national_id ? 100 : 0;
  return Math.round(docs * 0.6 + hasChildren * 0.2 + hasParent * 0.2);
}

export function classroomOf(data: WorkspaceData, id: string | null | undefined) {
  return data.classrooms.find((c) => c.id === id) ?? null;
}

export function stageOf(data: WorkspaceData, id: string | null | undefined) {
  return data.stages.find((s) => s.id === id) ?? null;
}

export function childEligibility(data: WorkspaceData, child: WorkspaceData["children"][number]) {
  const parts = ageParts(child.birth_date);
  const stage = stageOf(data, child.stage_id);
  if (!parts) return { ok: false, reason: "تاريخ الميلاد غير مسجّل" };
  if (!stage) return { ok: false, reason: "لم تُحدَّد المرحلة" };
  if (parts.totalMonths < stage.min_age_months) return { ok: false, reason: "العمر أقل من الحد الأدنى للمرحلة" };
  if (parts.totalMonths > stage.max_age_months) return { ok: false, reason: "العمر يتجاوز الحد الأعلى للمرحلة" };
  return { ok: true, reason: "مستوفٍ لشروط المرحلة" };
}

export function riskLevel(data: WorkspaceData): "green" | "yellow" | "red" {
  const completion = overallCompletion(data);
  const rejected = data.documents.some((d) => d.status === "rejected");
  const ineligible = data.children.some((c) => !childEligibility(data, c).ok);
  if (ineligible || completion < 50) return "red";
  if (rejected || completion < 100) return "yellow";
  return "green";
}

export function insightsFor(data: WorkspaceData): Insight[] {
  const completion = overallCompletion(data);
  const risk = riskLevel(data);
  const eligible = data.children.filter((c) => childEligibility(data, c).ok).length;
  const seats = data.classrooms.filter((c) =>
    data.children.some((child) => child.classroom_id === c.id),
  );
  const seatsLeft = seats.reduce((sum, c) => sum + Math.max(0, c.capacity - c.taken_seats), 0);

  return [
    { label: "حالة الطلب", value: data.application.status, tone: "neutral" },
    {
      label: "الأهلية",
      value: `${eligible} من ${data.children.length}`,
      tone: eligible === data.children.length && data.children.length > 0 ? "green" : "red",
    },
    { label: "الأولوية", value: data.application.priority, tone: data.application.priority === "urgent" ? "red" : "neutral" },
    {
      label: "المستندات",
      value: `${completion}%`,
      tone: completion === 100 ? "green" : completion >= 60 ? "yellow" : "red",
    },
    {
      label: "دعم قرة",
      value: data.qurra?.status ?? "not_requested",
      tone: data.qurra?.status === "approved" ? "green" : data.qurra?.requested ? "yellow" : "neutral",
    },
    {
      label: "المقعد",
      value: data.application.seat_status,
      tone: data.application.seat_status === "reserved" ? "green" : "yellow",
    },
    {
      label: "السداد",
      value: data.application.payment_status,
      tone: data.application.payment_status === "paid" ? "green" : "yellow",
    },
    { label: "مستوى المخاطر", value: risk === "green" ? "منخفض" : risk === "yellow" ? "متوسط" : "مرتفع", tone: risk },
    { label: "المقاعد المتاحة", value: String(seatsLeft), tone: seatsLeft > 2 ? "green" : seatsLeft > 0 ? "yellow" : "red" },
  ];
}

export function recommendationsFor(data: WorkspaceData): Recommendation[] {
  const out: Recommendation[] = [];
  const labelOf = (slug: string) => data.documentTypes.find((t) => t.slug === slug)?.name_ar ?? slug;

  const parentDocs = documentCompletion(data, null);
  if (parentDocs.missing.length) {
    out.push({
      tone: "red",
      title: "مستندات ولي الأمر غير مكتملة",
      detail: parentDocs.missing.map(labelOf).join("، "),
    });
  }

  data.children.forEach((child, index) => {
    const docs = documentCompletion(data, index);
    if (docs.missing.length) {
      out.push({
        tone: "yellow",
        title: `مستندات ناقصة للطالب ${child.name_ar}`,
        detail: docs.missing.map(labelOf).join("، "),
      });
    }
    const eligibility = childEligibility(data, child);
    if (!eligibility.ok) {
      out.push({ tone: "red", title: `${child.name_ar}: ${eligibility.reason}` });
    }
    const classroom = classroomOf(data, child.classroom_id);
    if (classroom) {
      const left = classroom.capacity - classroom.taken_seats;
      if (left <= 0) {
        out.push({ tone: "red", title: `فصل ${classroom.name_ar} مكتمل`, detail: "يُنصح بالنقل إلى قائمة الانتظار." });
      } else if (left <= 3) {
        out.push({
          tone: "yellow",
          title: `فصل ${classroom.name_ar} شبه مكتمل (${left} مقاعد)`,
          detail: "يُفضّل حجز المقعد فورًا.",
        });
      }
    }
  });

  if (data.qurra?.requested && data.qurra.status === "waiting_school_review") {
    out.push({ tone: "yellow", title: "طلب قرة بانتظار مراجعة المدرسة", detail: "حدّث حالة قرة بعد التحقق من بيانات الأم." });
  }
  if (data.qurra?.status === "approved") {
    out.push({ tone: "green", title: "تم اعتماد دعم قرة" });
  }

  if (!data.application.assigned_officer_id) {
    out.push({ tone: "yellow", title: "الطلب غير مُسند لمسؤول تسجيل" });
  }

  const ready =
    overallCompletion(data) === 100 &&
    data.children.length > 0 &&
    data.children.every((c) => childEligibility(data, c).ok) &&
    !data.documents.some((d) => d.status === "rejected");

  if (ready && ["submitted", "under_review"].includes(data.application.status)) {
    out.push({ tone: "green", title: "الطلب جاهز للرفع لاعتماد مدير المدرسة" });
  }
  if (data.application.status === "principal_review") {
    out.push({ tone: "green", title: "بانتظار قرار مدير المدرسة", detail: data.application.officer_recommendation ?? undefined });
  }

  return out;
}
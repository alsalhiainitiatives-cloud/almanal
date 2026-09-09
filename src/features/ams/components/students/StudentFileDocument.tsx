import { useState } from "react";

import { school } from "@/data/site";
import { formatApplicationCode } from "@/features/admissions/application-code";
import { ageInMonths, formatAge } from "@/features/admissions/eligibility";
import { useBrandLogoUrl } from "@/features/site-content/SiteContentProvider";
import {
  GENDER_LABELS,
  QURRA_LABELS,
  ageBandLabel,
  formatFileDate,
  studentIdentifier,
  vaccinationLabel,
  type StudentFileData,
} from "@/features/ams/student-file";

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/60 px-3 py-2 print-avoid-break">
      <p className="text-[10px] font-black text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-foreground">
        {value === null || value === undefined || value === "" ? "—" : value}
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="print-avoid-break space-y-2">
      <h2 className="border-b border-primary/30 pb-1 text-sm font-black text-primary">{title}</h2>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

/** Student portrait with graceful fallback when the signed URL fails to load. */
function StudentPhoto({ src, name }: { src?: string | undefined; name: string }) {
  const [failed, setFailed] = useState(false);
  const show = src && !failed;
  return (
    <div className="grid h-28 w-24 place-items-center overflow-hidden rounded-xl border-2 border-primary/30 bg-muted/40">
      {show ? (
        <img
          src={src}
          alt={name}
          loading="eager"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover object-top"
        />
      ) : (
        <span className="text-2xl font-black text-primary/50">{name.trim().charAt(0)}</span>
      )}
    </div>
  );
}

/** Official, print-ready student file document (shared by staff and parents). */
export function StudentFileDocument({
  data,
  photoSrc,
}: {
  data: StudentFileData;
  photoSrc?: string | undefined;
}) {
  const logoUrl = useBrandLogoUrl();
  const { student, application, parent, stage, classroom, qurra, services, invoice } = data;
  const identifier = studentIdentifier(application, formatApplicationCode(application.applicationNumber));

  return (
    <article className="print-sheet space-y-5 rounded-3xl border border-border/60 bg-card p-6 shadow-sm" dir="rtl">
      <header className="flex items-start justify-between gap-4 border-b-2 border-primary/40 pb-4">
        <div className="flex items-start gap-3">
          {logoUrl && <img src={logoUrl} alt={school.name} className="size-16 object-contain" />}
          <div>
            <p className="text-[11px] font-bold text-muted-foreground">{school.organization}</p>
            <h2 className="text-lg font-black text-primary">{school.name}</h2>
            <p className="text-[11px] text-muted-foreground">
              {school.address.district} — {school.address.city} · هاتف <span dir="ltr">{school.phone}</span>
            </p>
            <p className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-extrabold text-primary">
              ملف الطالب الرسمي · العام الدراسي {application.academicYear}
            </p>
          </div>
        </div>

        <div className="text-center">
          <StudentPhoto src={photoSrc} name={student.name_ar} />
          <p className="mt-1 text-[9px] font-bold text-muted-foreground">صورة الطالب</p>
        </div>
      </header>

      <Section title="بيانات الطالب">
        <Field label="اسم الطالب" value={student.name_ar} />
        <Field label="الرقم الأكاديمي" value={identifier} />
        <Field label="الاسم بالإنجليزية" value={student.name_en} />
        <Field label="رقم الهوية / الإقامة" value={student.national_id} />
        <Field label="الجنس" value={student.gender ? GENDER_LABELS[student.gender] ?? student.gender : null} />
        <Field label="تاريخ الميلاد" value={formatFileDate(student.birth_date)} />
        <Field label="العمر" value={student.birth_date ? formatAge(ageInMonths(student.birth_date)) : null} />
        <Field label="الجنسية" value={student.nationality} />
        <Field label="مكان الميلاد" value={student.birth_place} />
        <Field label="فصيلة الدم" value={student.blood_type} />
        <Field label="حالة التحصينات" value={vaccinationLabel(student.vaccination_status)} />
      </Section>

      <Section title="المرحلة والفصل">
        <Field label="المرحلة" value={stage?.name_ar} />
        <Field label="الفئة العمرية للمرحلة" value={ageBandLabel(stage)} />
        <Field label="الفصل" value={classroom?.name_ar} />
        <Field label="المعلمة المسؤولة" value={classroom?.teacher_name} />
        <Field label="الدوام" value={classroom?.schedule_ar ?? stage?.operating_hours} />
        <Field label="تاريخ الاعتماد" value={formatFileDate(application.decidedAt)} />
      </Section>

      <Section title="السجل الصحي والتعليمي">
        <Field label="حالات صحية" value={student.medical_conditions} />
        <Field label="حساسية" value={student.allergies} />
        <Field label="احتياجات خاصة" value={student.special_needs} />
        <Field label="المدرسة/الروضة السابقة" value={student.previous_school} />
        <Field label="آخر صف دراسي" value={student.last_grade} />
        <Field label="تاريخ التسجيل" value={formatFileDate(student.created_at)} />
      </Section>

      <Section title="بيانات ولي الأمر">
        <Field label="الاسم" value={parent.name} />
        <Field label="صلة القرابة" value={application.relationship} />
        <Field label="رقم الهوية" value={parent.nationalId} />
        <Field label="الجنسية" value={parent.nationality} />
        <Field label="الجوال" value={parent.phone} />
        <Field label="البريد الإلكتروني" value={parent.email} />
        <Field label="المدينة" value={parent.city} />
        <Field label="الحي" value={parent.district} />
        <Field label="جهة العمل" value={parent.job} />
      </Section>

      <Section title="الخدمات والدعم">
        <Field
          label="الخدمات المسجّلة"
          value={services.length ? services.map((s) => s.name).join(" · ") : "لا يوجد"}
        />
        <Field label="دعم قرة" value={qurra ? QURRA_LABELS[qurra.status] ?? qurra.status : "غير مطلوب"} />
        <Field
          label="الحالة المالية"
          value={
            invoice
              ? `${Number(invoice.paid_total).toLocaleString("ar-SA")} / ${Number(invoice.grand_total).toLocaleString("ar-SA")} ريال`
              : "لم تُصدر فاتورة"
          }
        />
      </Section>

      {data.withdrawal && (
        <Section title={data.withdrawal.kind === "graduation" ? "بيانات التخرّج" : "بيانات الانسحاب"}>
          <Field
            label="نوع الإجراء"
            value={WITHDRAWAL_KIND_LABELS[data.withdrawal.kind] ?? data.withdrawal.kind}
          />
          <Field
            label="حالة الإجراء"
            value={WITHDRAWAL_STATUS_LABELS[data.withdrawal.status] ?? data.withdrawal.status}
          />
          <Field
            label={data.withdrawal.kind === "graduation" ? "تاريخ التخرّج" : "تاريخ الانسحاب"}
            value={formatFileDate(data.withdrawal.effectiveDate)}
          />
          <Field label="تاريخ الالتحاق" value={formatFileDate(data.withdrawal.enrolledFrom)} />
          <Field label="السبب" value={data.withdrawal.reason} />
          <Field label="الجهة المنقول إليها" value={data.withdrawal.destinationSchool} />
          <Field label="الوضع المالي" value={data.withdrawal.financeCleared ? "مُسوّى بالكامل" : "غير مُسوّى"} />
          <Field label="رقم الشهادة" value={data.withdrawal.certificateNumber} />
        </Section>
      )}

      {studied.length > 0 && (
        <Section title="المواد والموضوعات التي دُرست">
          {studied.map((s) => (
            <Field
              key={s.subject}
              label={s.topics.length ? `${s.subject} — ${s.topics.join(" · ")}` : s.subject}
              value={s.lessons.join(" · ")}
            />
          ))}
        </Section>
      )}


      <footer className="grid gap-6 border-t border-border/60 pt-6 sm:grid-cols-3">
        {["مسؤول التسجيل", "المشرفة التربوية", "مدير المدرسة"].map((role) => (
          <div key={role} className="text-center">
            <p className="text-[11px] font-black text-foreground">{role}</p>
            <div className="mx-auto mt-8 w-4/5 border-t border-dashed border-foreground/40" />
            <p className="mt-1 text-[9px] text-muted-foreground">الاسم والتوقيع والتاريخ</p>
          </div>
        ))}
      </footer>

      <p className="text-center text-[9px] text-muted-foreground">
        صدر هذا الملف إلكترونيًا من نظام إدارة القبول — {school.name} ·{" "}
        {formatFileDate(new Date().toISOString())}
      </p>
    </article>
  );
}

/** Builds the PDF-engine options for a student file (shared by both screens). */
export function studentFilePdfOptions(data: StudentFileData, logoUrl?: string | null, photoUrl?: string | null) {
  return {
    schoolName: school.name,
    organization: school.organization,
    addressLine: `${school.address.district} — ${school.address.city}`,
    phone: school.phone,
    applicationCode: formatApplicationCode(data.application.applicationNumber),
    ageLabel: data.student.birth_date ? formatAge(ageInMonths(data.student.birth_date)) : null,
    logoUrl: logoUrl ?? null,
    photoUrl: photoUrl ?? null,
  };
}
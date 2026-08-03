import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Camera, Download, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { amsStudentFile, amsStudentPhoto } from "@/features/ams/ams.functions";
import { AmsShell } from "@/features/ams/components/AmsShell";
import { EmptyState, SkeletonRows } from "@/features/ams/components/atoms";
import {
  StudentFileDocument,
  studentFilePdfOptions,
} from "@/features/ams/components/students/StudentFileDocument";
import { buildStudentFileHtml, downloadStudentFilePdf } from "@/features/ams/student-file";
import { uploadClassroomMedia, useClassroomMediaUrls } from "@/lib/classroom-media";
import { useBrandLogoUrl } from "@/features/site-content/SiteContentProvider";

export const Route = createFileRoute("/_authenticated/ams/students/$childId")({
  head: () => ({
    meta: [
      { title: "ملف الطالب — مدارس وروضة المنال" },
      { name: "description", content: "ملف طالب رسمي قابل للطباعة يشمل بيانات الطالب وولي الأمر والمرحلة." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudentFilePage,
});

function StudentFilePage() {
  const { childId } = Route.useParams();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const logoUrl = useBrandLogoUrl();

  const { data, isLoading, error } = useQuery({
    queryKey: ["ams", "student-file", childId],
    queryFn: () => amsStudentFile({ data: childId }),
  });

  const photoPath = data?.student.photo_url ?? null;
  const isStoragePath = !!photoPath && !/^https?:\/\//.test(photoPath);
  const signed = useClassroomMediaUrls(isStoragePath ? [photoPath] : []);
  const photoSrc = photoPath ? (isStoragePath ? signed[photoPath] : photoPath) : undefined;

  const savePhoto = useMutation({
    mutationFn: (photoUrl: string | null) => amsStudentPhoto({ data: { childId, photoUrl } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["ams", "student-file", childId] });
      void queryClient.invalidateQueries({ queryKey: ["ams", "students"] });
      toast.success("تم تحديث صورة الطالب");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function onPickPhoto(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("يرجى اختيار صورة صالحة");
    if (file.size > 4 * 1024 * 1024) return toast.error("حجم الصورة يجب أن يكون أقل من 4 ميجابايت");
    setUploading(true);
    try {
      const path = await uploadClassroomMedia(file, `students/${childId}`);
      await savePhoto.mutateAsync(path);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  if (error) {
    return (
      <AmsShell title="ملف الطالب">
        <EmptyState title="تعذّر التحميل" description={(error as Error).message} />
      </AmsShell>
    );
  }

  if (isLoading || !data) {
    return (
      <AmsShell title="ملف الطالب">
        <SkeletonRows rows={6} />
      </AmsShell>
    );
  }

  const { student, application, parent, stage, classroom, qurra, services, invoice } = data;

  return (
    <AmsShell
      title="ملف الطالب"
      description="مستند رسمي يمكن طباعته وتقديمه عند طلب نقل الطالب إلى روضة أو مدرسة أخرى"
      wide
      actions={
        <div className="flex items-center gap-2 no-print">
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => void onPickPhoto(e.target.files?.[0])}
          />
          <Button
            variant="outline"
            className="rounded-2xl text-xs font-bold"
            disabled={uploading}
            onClick={() => fileInput.current?.click()}
          >
            <Camera className="size-3.5" />
            {uploading ? "جارٍ الرفع…" : photoSrc ? "تغيير الصورة" : "إضافة صورة الطالب"}
          </Button>
          {photoPath && (
            <Button
              variant="ghost"
              className="rounded-2xl text-xs font-bold text-destructive"
              onClick={() => savePhoto.mutate(null)}
            >
              <Trash2 className="size-3.5" />
              حذف الصورة
            </Button>
          )}
          <Button variant="hero" className="rounded-2xl text-xs font-bold" onClick={() => window.print()}>
            <Printer className="size-3.5" />
            طباعة الملف
          </Button>
        </div>
      }
    >
      <article className="print-sheet space-y-5 rounded-3xl border border-border/60 bg-card p-6 shadow-sm" dir="rtl">
        {/* Official header: school identity (right) + student photo (top-left) */}
        <header className="flex items-start justify-between gap-4 border-b-2 border-primary/40 pb-4">
          <div className="flex items-start gap-3">
            {logoUrl && <img src={logoUrl} alt={school.name} className="size-16 object-contain" />}
            <div>
              <p className="text-[11px] font-bold text-muted-foreground">{school.organization}</p>
              <h1 className="text-lg font-black text-primary">{school.name}</h1>
              <p className="text-[11px] text-muted-foreground">
                {school.address.district} — {school.address.city} · هاتف{" "}
                <span dir="ltr">{school.phone}</span>
              </p>
              <p className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-extrabold text-primary">
                ملف الطالب الرسمي · العام الدراسي {application.academicYear}
              </p>
            </div>
          </div>

          <div className="text-center">
            <div className="grid h-28 w-24 place-items-center overflow-hidden rounded-xl border-2 border-primary/30 bg-muted/40">
              {photoSrc ? (
                <img src={photoSrc} alt={student.name_ar} className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-black text-primary/50">
                  {student.name_ar.trim().charAt(0)}
                </span>
              )}
            </div>
            <p className="mt-1 text-[9px] font-bold text-muted-foreground">صورة الطالب</p>
          </div>
        </header>

        <div className="grid gap-2 sm:grid-cols-3">
          <Field label="اسم الطالب" value={student.name_ar} />
          <Field label="رقم الطلب" value={formatApplicationCode(application.applicationNumber)} />
          <Field label="الرقم الأكاديمي" value={application.studentNumber} />
        </div>

        <Section title="بيانات الطالب">
          <Field label="الاسم بالإنجليزية" value={student.name_en} />
          <Field label="رقم الهوية / الإقامة" value={student.national_id} />
          <Field label="الجنس" value={student.gender ? GENDER[student.gender] ?? student.gender : null} />
          <Field label="تاريخ الميلاد" value={formatDate(student.birth_date)} />
          <Field label="العمر" value={student.birth_date ? formatAge(ageInMonths(student.birth_date)) : null} />
          <Field label="الجنسية" value={student.nationality} />
          <Field label="مكان الميلاد" value={student.birth_place} />
          <Field label="فصيلة الدم" value={student.blood_type} />
          <Field label="حالة التحصينات" value={student.vaccination_status} />
        </Section>

        <Section title="المرحلة والفصل">
          <Field label="المرحلة" value={stage?.name_ar} />
          <Field label="الفئة العمرية للمرحلة" value={stage?.age_label} />
          <Field label="الفصل" value={classroom?.name_ar} />
          <Field label="المعلمة المسؤولة" value={classroom?.teacher_name} />
          <Field label="الدوام" value={classroom?.schedule_ar ?? stage?.operating_hours} />
          <Field label="تاريخ الاعتماد" value={formatDate(application.decidedAt)} />
        </Section>

        <Section title="السجل الصحي والتعليمي">
          <Field label="حالات صحية" value={student.medical_conditions} />
          <Field label="حساسية" value={student.allergies} />
          <Field label="احتياجات خاصة" value={student.special_needs} />
          <Field label="المدرسة/الروضة السابقة" value={student.previous_school} />
          <Field label="آخر صف دراسي" value={student.last_grade} />
          <Field label="تاريخ التسجيل" value={formatDate(student.created_at)} />
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
          <Field
            label="دعم قرة"
            value={qurra ? QURRA_LABELS[qurra.status] ?? qurra.status : "غير مطلوب"}
          />
          <Field
            label="الحالة المالية"
            value={
              invoice
                ? `${Number(invoice.paid_total).toLocaleString("ar-SA")} / ${Number(invoice.grand_total).toLocaleString("ar-SA")} ريال`
                : "لم تُصدر فاتورة"
            }
          />
        </Section>

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
          صدر هذا الملف إلكترونيًا من نظام إدارة القبول — {school.name} · {formatDate(new Date().toISOString())}
        </p>
      </article>
    </AmsShell>
  );
}
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Camera, Download, Pencil, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { amsStudentFile, amsStudentPhoto } from "@/features/ams/ams.functions";
import { AmsShell } from "@/features/ams/components/AmsShell";
import { EmptyState, SkeletonRows } from "@/features/ams/components/atoms";
import {
  StudentFileDocument,
  studentFilePdfOptions,
} from "@/features/ams/components/students/StudentFileDocument";
import { StudentEditDialog } from "@/features/ams/components/students/StudentEditDialog";
import { StudentProfileTabs } from "@/features/ams/components/students/StudentProfileTabs";
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
  const photoSrc = photoPath
    ? isStoragePath
      ? signed[photoPath]
      : photoPath
    : (data?.student.photo_signed_url ?? undefined);

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

  async function onDownloadPdf() {
    const html = buildStudentFileHtml(data!, studentFilePdfOptions(data!, logoUrl, photoSrc ?? null));
    await downloadStudentFilePdf(html);
  }

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
          <Button variant="soft" className="rounded-2xl text-xs font-bold" onClick={() => void onDownloadPdf()}>
            <Download className="size-3.5" />
            تنزيل PDF
          </Button>
          <Button variant="hero" className="rounded-2xl text-xs font-bold" onClick={() => window.print()}>
            <Printer className="size-3.5" />
            طباعة الملف
          </Button>
        </div>
      }
    >
      <StudentProfileTabs childId={childId} file={data}>
        <StudentFileDocument data={data} photoSrc={photoSrc} />
      </StudentProfileTabs>
    </AmsShell>
  );
}

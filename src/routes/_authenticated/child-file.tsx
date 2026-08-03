import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PortalLayout } from "@/features/auth/components/PortalLayout";
import { myChildFile, myChildren } from "@/features/ams/ams.functions";
import {
  StudentFileDocument,
  studentFilePdfOptions,
} from "@/features/ams/components/students/StudentFileDocument";
import { buildStudentFileHtml, downloadStudentFilePdf } from "@/features/ams/student-file";
import { useBrandLogoUrl } from "@/features/site-content/SiteContentProvider";
import { useClassroomMediaUrls } from "@/lib/classroom-media";
import { formatApplicationCode } from "@/features/admissions/application-code";

export const Route = createFileRoute("/_authenticated/child-file")({
  head: () => ({
    meta: [
      { title: "ملف الطفل الرسمي | مدارس وروضة المنال" },
      {
        name: "description",
        content: "اطّلع على ملف طفلك الرسمي في مدارس وروضة المنال واطبعه أو نزّله بصيغة PDF.",
      },
      { property: "og:title", content: "ملف الطفل الرسمي | مدارس وروضة المنال" },
      { property: "og:description", content: "ملف طفلك الرسمي جاهز للطباعة والتنزيل بصيغة PDF." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ChildFilePage,
});

function ChildFilePage() {
  const logoUrl = useBrandLogoUrl();
  const [childId, setChildId] = useState<string | null>(null);

  const childrenQuery = useQuery({ queryKey: ["my-children"], queryFn: () => myChildren() });
  const children = childrenQuery.data ?? [];

  useEffect(() => {
    if (!childId && children.length) setChildId(children[0]!.id);
  }, [childId, children]);

  const fileQuery = useQuery({
    queryKey: ["my-child-file", childId],
    queryFn: () => myChildFile({ data: childId! }),
    enabled: !!childId,
  });
  const data = fileQuery.data;

  const photoPath = data?.student.photo_url ?? null;
  const isStoragePath = !!photoPath && !/^https?:\/\//.test(photoPath);
  const signed = useClassroomMediaUrls(isStoragePath ? [photoPath] : []);
  const photoSrc = photoPath ? (isStoragePath ? signed[photoPath] : photoPath) : undefined;

  async function onDownloadPdf() {
    if (!data) return;
    const html = buildStudentFileHtml(data, studentFilePdfOptions(data, logoUrl, photoSrc ?? null));
    await downloadStudentFilePdf(html);
  }

  return (
    <PortalLayout
      title="ملف الطفل"
      description="ملف طفلك الرسمي بعد اعتماد الطلب — يمكنك طباعته أو تنزيله بصيغة PDF وتقديمه كمستند رسمي."
    >
      {childrenQuery.isLoading ? (
        <div className="rounded-[2rem] border border-border/60 bg-card/70 p-8 text-center text-sm text-muted-foreground">
          جارٍ تحميل ملفات الأبناء…
        </div>
      ) : children.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-border bg-card/60 p-10 text-center">
          <p className="text-lg font-black text-foreground">لا يوجد ملف طفل بعد</p>
          <p className="mt-2 text-sm text-muted-foreground">
            يصدر ملف الطفل الرسمي تلقائيًا بعد اعتماد طلب القبول وإسناد المقعد.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="no-print flex flex-wrap items-center gap-2 rounded-[2rem] border border-border/60 bg-card/80 p-4">
            <div className="flex flex-wrap gap-2">
              {children.map((child) => (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => setChildId(child.id)}
                  className={`rounded-2xl px-4 py-2 text-sm font-bold transition-colors ${
                    childId === child.id
                      ? "bg-primary text-primary-foreground shadow-soft"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {child.name_ar}
                  <span className="ms-2 text-[10px] font-black opacity-70" dir="ltr">
                    {formatApplicationCode(child.applicationNumber)}
                  </span>
                </button>
              ))}
            </div>
            <div className="ms-auto flex gap-2">
              <Button variant="soft" disabled={!data} onClick={() => void onDownloadPdf()}>
                <Download className="size-4" />
                تنزيل PDF
              </Button>
              <Button variant="hero" disabled={!data} onClick={() => window.print()}>
                <Printer className="size-4" />
                طباعة الملف
              </Button>
            </div>
          </div>

          {fileQuery.error ? (
            <div className="rounded-[2rem] border border-destructive/30 bg-destructive/5 p-8 text-center text-sm font-bold text-destructive">
              {(fileQuery.error as Error).message}
            </div>
          ) : !data ? (
            <div className="rounded-[2rem] border border-border/60 bg-card/70 p-8 text-center text-sm text-muted-foreground">
              جارٍ تحميل الملف…
            </div>
          ) : (
            <StudentFileDocument data={data} photoSrc={photoSrc} />
          )}
        </div>
      )}
    </PortalLayout>
  );
}
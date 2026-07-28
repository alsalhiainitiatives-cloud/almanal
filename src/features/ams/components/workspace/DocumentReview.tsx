import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  Printer,
  RefreshCcw,
  Sparkles,
  XCircle,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { amsDocumentUrl, amsReviewDocument } from "../../ams.functions";
import { DOC_STATUS_LABELS } from "../../roles";
import type { WorkspaceData, WorkspaceDocument } from "../../types";

const STATUS_TONE: Record<string, string> = {
  approved: "bg-mint/60 text-foreground",
  rejected: "bg-destructive/12 text-destructive",
  replace: "bg-gold/30 text-foreground",
  pending: "bg-muted text-muted-foreground",
};

const isImage = (name: string) => /\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(name);

/** Document review board: preview, zoom, download, print and review decisions. */
export function DocumentReview({ data }: { data: WorkspaceData }) {
  const queryClient = useQueryClient();
  const id = data.application.id;
  const getUrl = useServerFn(amsDocumentUrl);
  const reviewDoc = useServerFn(amsReviewDocument);

  const [preview, setPreview] = useState<{ doc: WorkspaceDocument; url: string } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);

  const docLabel = (slug: string) => data.documentTypes.find((t) => t.slug === slug)?.name_ar ?? slug;
  const ownerLabel = (doc: WorkspaceDocument) =>
    doc.child_index === null
      ? "ولي الأمر"
      : (data.children[doc.child_index]?.name_ar ?? `الطالب ${doc.child_index + 1}`);

  const resolveUrl = async (doc: WorkspaceDocument) => {
    setBusyId(doc.id);
    try {
      return await getUrl({ data: { id, documentId: doc.id } });
    } finally {
      setBusyId(null);
    }
  };

  const openPreview = async (doc: WorkspaceDocument) => {
    try {
      const { url } = await resolveUrl(doc);
      setZoom(1);
      setPreview({ doc, url });
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const download = async (doc: WorkspaceDocument) => {
    try {
      const { url, fileName } = await resolveUrl(doc);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.target = "_blank";
      link.rel = "noopener";
      link.click();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const print = async (doc: WorkspaceDocument) => {
    try {
      const { url } = await resolveUrl(doc);
      const win = window.open(url, "_blank", "noopener");
      if (!win) return toast.error("فضلاً اسمح بالنوافذ المنبثقة للطباعة.");
      win.addEventListener("load", () => win.print(), { once: true });
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const review = useMutation({
    mutationFn: (input: { documentId: string; status: "approved" | "rejected" | "replace"; note?: string }) =>
      reviewDoc({ data: { id, ...input } }),
    onSuccess: () => {
      toast.success("تم تحديث حالة المستند");
      queryClient.invalidateQueries({ queryKey: ["ams"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="rounded-3xl border border-border/60 bg-card p-4">
      <p className="text-sm font-extrabold text-foreground">مراجعة المستندات ({data.documents.length})</p>
      <div className="mt-3 space-y-2.5">
        {data.documents.map((doc) => {
          const name = doc.file_name ?? "ملف";
          const busy = busyId === doc.id || review.isPending;
          return (
            <article key={doc.id} className="rounded-2xl border border-border/60 bg-muted/20 p-3">
              <header className="flex items-start gap-2.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  {isImage(name) ? <ImageIcon className="size-4" /> : <FileText className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-extrabold text-foreground">
                    {docLabel(doc.document_type_slug)}
                  </p>
                  <p className="truncate text-[10px] font-bold text-muted-foreground">
                    {ownerLabel(doc)} · {name}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-extrabold whitespace-nowrap",
                    STATUS_TONE[doc.status] ?? STATUS_TONE.pending,
                  )}
                >
                  {DOC_STATUS_LABELS[doc.status] ?? doc.status}
                </span>
              </header>

              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <Tool icon={<Eye className="size-3" />} label="معاينة" onClick={() => openPreview(doc)} disabled={busy} />
                <Tool
                  icon={<ZoomIn className="size-3" />}
                  label="تكبير"
                  onClick={async () => {
                    await openPreview(doc);
                    setZoom(1.6);
                  }}
                  disabled={busy}
                />
                <Tool icon={<Download className="size-3" />} label="تنزيل" onClick={() => download(doc)} disabled={busy} />
                <Tool icon={<Printer className="size-3" />} label="طباعة" onClick={() => print(doc)} disabled={busy} />
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border/50 pt-2">
                <Tool
                  icon={<CheckCircle2 className="size-3" />}
                  label="اعتماد"
                  active={doc.status === "approved"}
                  disabled={busy}
                  onClick={() => review.mutate({ documentId: doc.id, status: "approved" })}
                />
                <Tool
                  icon={<XCircle className="size-3" />}
                  label="رفض"
                  active={doc.status === "rejected"}
                  disabled={busy}
                  onClick={() => review.mutate({ documentId: doc.id, status: "rejected" })}
                />
                <Tool
                  icon={<RefreshCcw className="size-3" />}
                  label="طلب استبدال"
                  active={doc.status === "replace"}
                  disabled={busy}
                  onClick={() =>
                    review.mutate({ documentId: doc.id, status: "replace", note: "مطلوب استبدال المستند." })
                  }
                />
                <Tool
                  icon={<Sparkles className="size-3" />}
                  label="جودة أفضل"
                  disabled={busy}
                  onClick={() =>
                    review.mutate({
                      documentId: doc.id,
                      status: "replace",
                      note: "الصورة غير واضحة — يرجى رفع نسخة بجودة أعلى.",
                    })
                  }
                />
              </div>

              {doc.note ? (
                <p className="mt-2 rounded-xl bg-background px-2.5 py-1.5 text-[10px] font-bold text-muted-foreground">
                  ملاحظة: {doc.note}
                </p>
              ) : null}
            </article>
          );
        })}
        {data.documents.length === 0 ? (
          <p className="text-[11px] font-bold text-muted-foreground">لم يرفع ولي الأمر أي مستند بعد.</p>
        ) : null}
      </div>

      <Dialog open={!!preview} onOpenChange={(open) => (open ? null : setPreview(null))}>
        <DialogContent dir="rtl" className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {preview ? docLabel(preview.doc.document_type_slug) : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl text-[11px]"
              onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
            >
              <ZoomIn className="size-3.5" /> تكبير
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl text-[11px]"
              onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}
            >
              <ZoomOut className="size-3.5" /> تصغير
            </Button>
            <span className="text-[11px] font-bold text-muted-foreground">{Math.round(zoom * 100)}%</span>
          </div>
          <div className="max-h-[70vh] overflow-auto rounded-2xl border border-border/60 bg-muted/30 p-2">
            {preview && isImage(preview.doc.file_name ?? "") ? (
              <img
                src={preview.url}
                alt={preview.doc.file_name ?? "مستند"}
                style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
                className="mx-auto transition-transform"
              />
            ) : preview ? (
              <iframe
                title="معاينة المستند"
                src={preview.url}
                className="h-[65vh] w-full rounded-xl bg-background"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Tool({
  icon,
  label,
  onClick,
  disabled,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <Button
      size="sm"
      variant={active ? "default" : "outline"}
      className="rounded-xl px-2.5 text-[10px] font-bold"
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
      {label}
    </Button>
  );
}
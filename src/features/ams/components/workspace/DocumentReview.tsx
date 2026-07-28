import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  ChevronDown,
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  Printer,
  RefreshCcw,
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
  const [openId, setOpenId] = useState<string | null>(null);

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

  /** Approves every document that isn't approved yet, in one click. */
  const approveAll = useMutation({
    mutationFn: async () => {
      const pending = data.documents.filter((doc) => doc.status !== "approved");
      for (const doc of pending) {
        await reviewDoc({ data: { id, documentId: doc.id, status: "approved" } });
      }
      return pending.length;
    },
    onSuccess: (count) => {
      toast.success(count > 0 ? `تم اعتماد ${count} مستندًا` : "جميع المستندات معتمدة بالفعل");
      queryClient.invalidateQueries({ queryKey: ["ams"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const pendingCount = data.documents.filter((doc) => doc.status !== "approved").length;

  return (
    <div className="rounded-3xl border border-border/60 bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-extrabold text-foreground">مراجعة المستندات ({data.documents.length})</p>
        {data.documents.length > 0 ? (
          <Button
            size="sm"
            className="rounded-xl text-[11px] font-extrabold"
            disabled={pendingCount === 0 || approveAll.isPending}
            onClick={() => approveAll.mutate()}
          >
            <CheckCircle2 className="size-3.5" />
            {pendingCount === 0 ? "كل المستندات معتمدة" : `اعتماد الكل (${pendingCount})`}
          </Button>
        ) : null}
      </div>
      <div className="mt-3 space-y-2.5">
        {data.documents.map((doc) => {
          const name = doc.file_name ?? "ملف";
          const busy = busyId === doc.id || review.isPending || approveAll.isPending;
          const expanded = openId === doc.id;
          return (
            <article key={doc.id} className="rounded-2xl border border-border/60 bg-muted/20 p-3">
              <button
                type="button"
                onClick={() => setOpenId(expanded ? null : doc.id)}
                aria-expanded={expanded}
                className="flex w-full items-start gap-2.5 text-start"
              >
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
                <ChevronDown
                  className={cn(
                    "mt-1 size-4 shrink-0 text-muted-foreground transition-transform",
                    expanded && "rotate-180",
                  )}
                />
              </button>

              {expanded ? (
                <>
                  <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-border/50 pt-2.5">
                    <Tool icon={<Eye className="size-3" />} label="معاينة وطباعة" onClick={() => openPreview(doc)} disabled={busy} />
                    <Tool icon={<Download className="size-3" />} label="تنزيل" onClick={() => download(doc)} disabled={busy} />
                    <Tool
                      icon={<CheckCircle2 className="size-3" />}
                      label="اعتماد"
                      active={doc.status === "approved"}
                      disabled={busy}
                      onClick={() => review.mutate({ documentId: doc.id, status: "approved" })}
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
                  </div>

                  {doc.note ? (
                    <p className="mt-2 rounded-xl bg-background px-2.5 py-1.5 text-[10px] font-bold text-muted-foreground">
                      ملاحظة: {doc.note}
                    </p>
                  ) : null}
                </>
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
              className="rounded-xl text-[11px] font-extrabold"
              onClick={() => preview && print(preview.doc)}
            >
              <Printer className="size-3.5" /> طباعة
            </Button>
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
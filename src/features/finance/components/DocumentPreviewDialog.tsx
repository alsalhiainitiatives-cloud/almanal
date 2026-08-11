/**
 * Professional preview for generated finance documents (vouchers / official receipts).
 * Renders the isolated HTML inside a sandboxed iframe with print & PDF-save actions.
 */
import { useMemo } from "react";
import { Download, ExternalLink, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const FRAME_ID = "finance-doc-frame";

export function DocumentPreviewDialog({
  open,
  onOpenChange,
  title,
  html,
  fileName = "document",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  html: string;
  fileName?: string;
}) {
  const blobUrl = useMemo(
    () => (open ? URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" })) : ""),
    [html, open],
  );

  function print() {
    const frame = document.getElementById(FRAME_ID) as HTMLIFrameElement | null;
    frame?.contentWindow?.focus();
    frame?.contentWindow?.print();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-4 rounded-[2rem] p-5" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-sm font-black">{title}</DialogTitle>
        </DialogHeader>

        <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted/40">
          <iframe
            id={FRAME_ID}
            title={title}
            srcDoc={html}
            className="h-[62vh] w-full bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" className="rounded-2xl" asChild>
            <a href={blobUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />
              فتح في نافذة جديدة
            </a>
          </Button>
          <Button variant="outline" className="rounded-2xl" asChild>
            <a href={blobUrl} download={`${fileName}.html`}>
              <Download className="size-4" />
              تحميل نسخة
            </a>
          </Button>
          <Button className="rounded-2xl" onClick={print}>
            <Printer className="size-4" />
            طباعة / حفظ PDF
          </Button>
        </div>
        <p className="text-[11px] font-bold leading-relaxed text-muted-foreground">
          لحفظ السند بصيغة PDF: اضغط «طباعة / حفظ PDF» ثم اختر «حفظ كملف PDF» من نافذة الطباعة.
        </p>
      </DialogContent>
    </Dialog>
  );
}

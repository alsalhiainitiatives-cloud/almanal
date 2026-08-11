/**
 * Preview for parent-uploaded transfer receipts (images or PDFs) with
 * print & download actions, using a short-lived signed storage URL.
 */
import { Download, ExternalLink, Loader2, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RECEIPT_STATUS_LABELS, dateAr, money } from "../pricing";

export type ReceiptPreview = {
  id: string;
  url: string | null;
  fileName: string | null;
  amount: number;
  status: string;
  date: string | null;
  reference?: string | null;
};

const FRAME_ID = "receipt-preview-frame";

export function ReceiptPreviewDialog({
  receipt,
  onOpenChange,
}: {
  receipt: ReceiptPreview | null;
  onOpenChange: (open: boolean) => void;
}) {
  const isPdf = (receipt?.fileName ?? "").toLowerCase().endsWith(".pdf");

  function print() {
    if (!receipt?.url) return;
    if (isPdf) {
      const frame = document.getElementById(FRAME_ID) as HTMLIFrameElement | null;
      frame?.contentWindow?.focus();
      frame?.contentWindow?.print();
      return;
    }
    const win = window.open("", "_blank", "noopener,width=880,height=1040");
    if (!win) return;
    win.document.write(
      `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/><title>${
        receipt.fileName ?? "إيصال سداد"
      }</title><style>body{margin:0;display:grid;place-items:center;background:#fff}img{max-width:100%;max-height:100vh}</style></head><body><img src="${
        receipt.url
      }" onload="window.print()" /></body></html>`,
    );
    win.document.close();
  }

  return (
    <Dialog open={Boolean(receipt)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-4 rounded-[2rem] p-5" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-sm font-black">
            معاينة إيصال السداد {receipt ? `— ${money(Number(receipt.amount))}` : ""}
          </DialogTitle>
        </DialogHeader>

        {receipt ? (
          <>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-black text-muted-foreground">
              <span className="rounded-full bg-muted px-3 py-1">
                {RECEIPT_STATUS_LABELS[receipt.status] ?? receipt.status}
              </span>
              {receipt.date ? <span>{dateAr(receipt.date)}</span> : null}
              {receipt.reference ? <span>مرجع التحويل: {receipt.reference}</span> : null}
            </div>

            <div className="grid min-h-[50vh] place-items-center overflow-hidden rounded-2xl border border-border/60 bg-muted/40">
              {!receipt.url ? (
                <Loader2 className="size-6 animate-spin text-primary" />
              ) : isPdf ? (
                <iframe
                  id={FRAME_ID}
                  title="إيصال السداد"
                  src={receipt.url}
                  className="h-[62vh] w-full bg-white"
                />
              ) : (
                <img
                  src={receipt.url}
                  alt={receipt.fileName ?? "إيصال السداد"}
                  className="max-h-[62vh] w-auto object-contain"
                />
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button variant="outline" className="rounded-2xl" asChild disabled={!receipt.url}>
                <a href={receipt.url ?? "#"} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-4" />
                  فتح في نافذة جديدة
                </a>
              </Button>
              <Button variant="outline" className="rounded-2xl" asChild disabled={!receipt.url}>
                <a href={receipt.url ?? "#"} download={receipt.fileName ?? "receipt"}>
                  <Download className="size-4" />
                  تحميل
                </a>
              </Button>
              <Button className="rounded-2xl" onClick={print} disabled={!receipt.url}>
                <Printer className="size-4" />
                طباعة
              </Button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { receiptPath, receiptRecord } from "../finance.functions";
import { money } from "../pricing";

export function ReceiptDialog({
  open,
  onOpenChange,
  invoiceId,
  installmentId,
  amount,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  invoiceId: string;
  installmentId: string | null;
  amount: number;
  onDone: () => void;
}) {
  const makePath = useServerFn(receiptPath);
  const record = useServerFn(receiptRecord);
  const [file, setFile] = useState<File | null>(null);
  const [transferDate, setTransferDate] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!file) {
      toast.error("أرفق صورة أو ملف الإيصال");
      return;
    }
    setBusy(true);
    try {
      const { path } = await makePath({ data: { invoiceId, fileName: file.name } });
      const { error } = await supabase.storage.from("payment-receipts").upload(path, file, {
        upsert: false,
        contentType: file.type || undefined,
      });
      if (error) throw new Error("تعذّر رفع الملف، حاول مرة أخرى.");
      await record({
        data: {
          invoiceId,
          installmentId,
          filePath: path,
          fileName: file.name,
          amount,
          transferDate: transferDate || null,
          referenceNo: reference || null,
        },
      });
      toast.success("تم رفع الإيصال، بانتظار اعتماد قسم الحسابات");
      onOpenChange(false);
      setFile(null);
      setTransferDate("");
      setReference("");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر رفع الإيصال");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>رفع إيصال السداد</DialogTitle>
          <DialogDescription>المبلغ المطلوب: {money(amount)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="receipt-file">ملف الإيصال (صورة أو PDF)</Label>
            <Input
              id="receipt-file"
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="receipt-date">تاريخ التحويل</Label>
            <Input
              id="receipt-date"
              type="date"
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="receipt-ref">الرقم المرجعي للعملية (اختياري)</Label>
            <Input
              id="receipt-ref"
              value={reference}
              maxLength={60}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            إلغاء
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            رفع الإيصال
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
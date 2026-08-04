import { useEffect, useState } from "react";
import { MessageCircle, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { normalizeSaudiPhone, openWhatsapp } from "@/lib/whatsapp";

export type WhatsappDraft = {
  phone: string | null | undefined;
  text: string;
  /** Optional label shown next to the number (parent / child name). */
  recipient?: string;
};

/**
 * Small confirmation dialog: shows the destination number and the message body,
 * allows a quick edit, then opens WhatsApp in a new tab.
 */
export function WhatsappConfirmDialog({
  draft,
  onClose,
  onSent,
}: {
  draft: WhatsappDraft | null;
  onClose: () => void;
  onSent?: () => void;
}) {
  const [text, setText] = useState(draft?.text ?? "");

  useEffect(() => {
    setText(draft?.text ?? "");
  }, [draft]);

  const intl = normalizeSaudiPhone(draft?.phone);

  return (
    <Dialog open={Boolean(draft)} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-w-md rounded-3xl" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2 text-base font-black">
            <MessageCircle className="size-4 text-primary" />
            تأكيد إرسال رسالة واتساب
          </DialogTitle>
          <DialogDescription className="text-xs">
            راجع الرقم ونص الرسالة، ويمكنك تعديل النص قبل فتح واتساب.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-2xl bg-muted/50 px-3 py-2 text-xs font-black">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Phone className="size-3.5" />
              رقم المستلم
            </span>
            <span dir="ltr" className="tabular-nums text-foreground">
              {intl ? `+${intl}` : "غير متوفر"}
            </span>
          </div>
          {draft?.recipient ? (
            <p className="text-xs font-black text-muted-foreground">المستلم: {draft.recipient}</p>
          ) : null}

          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={6}
            className="rounded-2xl text-sm leading-relaxed"
            aria-label="نص رسالة واتساب"
          />
        </div>

        <DialogFooter className="gap-2 sm:justify-start">
          <Button
            className="rounded-2xl"
            disabled={!intl || !text.trim()}
            onClick={() => {
              openWhatsapp(draft?.phone, text);
              onSent?.();
              onClose();
            }}
          >
            <MessageCircle className="size-4" />
            فتح واتساب
          </Button>
          <Button variant="outline" className="rounded-2xl" onClick={onClose}>
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

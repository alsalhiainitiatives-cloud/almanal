/**
 * Guarded permanent deletion of one or more students from the registry.
 * Requires an explicit acknowledgment plus the typed phrase «تأكيد الحذف».
 */
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, TriangleAlert } from "lucide-react";
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
import { amsStudentsDeleteBulk } from "@/features/ams/ams.functions";

export const DELETE_PHRASE = "تأكيد الحذف";

export function DeleteStudentsDialog({
  targets,
  onClose,
  onDone,
}: {
  targets: { id: string; name: string }[] | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const run = useServerFn(amsStudentsDeleteBulk);
  const qc = useQueryClient();
  const [ack, setAck] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);

  const open = Boolean(targets?.length);
  const count = targets?.length ?? 0;
  const ready = ack && phrase.trim() === DELETE_PHRASE && !busy;

  const reset = () => {
    setAck(false);
    setPhrase("");
    setBusy(null);
  };

  async function confirm() {
    if (!targets) return;
    const ids = targets.map((t) => t.id);
    let deleted = 0;
    setBusy({ done: 0, total: ids.length });
    try {
      for (let i = 0; i < ids.length; i += 50) {
        const res = await run({ data: { childIds: ids.slice(i, i + 50), confirm: DELETE_PHRASE } });
        deleted += res.deleted;
        setBusy({ done: Math.min(i + 50, ids.length), total: ids.length });
      }
      toast.success(`تم حذف ${deleted} طالب/طالبة نهائيًا.`);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر حذف الطلاب.");
    } finally {
      qc.invalidateQueries({ queryKey: ["ams", "students"] });
      qc.invalidateQueries({ queryKey: ["ams", "seats"] });
      reset();
      onClose();
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !busy) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-lg rounded-3xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <TriangleAlert className="size-5" />
            حذف نهائي — {count === 1 ? targets![0]!.name : `${count} طالب/طالبة`}
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            هذا الإجراء لا يمكن التراجع عنه. سيتم حذف ملف الطالب بالكامل مع رقمه الأكاديمي وسجلات
            الحضور والتقييمات والخطط الفردية والمقعد والفواتير ومستحقات قرة المرتبطة به.
            للانسحاب الرسمي استخدم «انسحاب الطلاب» بدلاً من الحذف.
          </DialogDescription>
        </DialogHeader>

        {count > 1 ? (
          <div className="max-h-32 overflow-y-auto rounded-2xl bg-destructive/5 p-3 text-[11px] text-foreground">
            {targets!.slice(0, 30).map((t) => t.name).join("، ")}
            {count > 30 ? ` … و${count - 30} آخرين` : ""}
          </div>
        ) : null}

        <label className="flex items-start gap-2 text-xs font-bold">
          <input
            type="checkbox"
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
            className="mt-0.5 size-4 accent-[hsl(var(--destructive))]"
          />
          أفهم أن الحذف نهائي وأتحمل مسؤولية حذف {count} سجل.
        </label>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            اكتب <span className="font-black text-destructive">{DELETE_PHRASE}</span> للمتابعة:
          </p>
          <Input value={phrase} onChange={(e) => setPhrase(e.target.value)} className="rounded-xl" />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="rounded-xl" disabled={Boolean(busy)} onClick={onClose}>
            إلغاء
          </Button>
          <Button variant="destructive" className="rounded-xl" disabled={!ready} onClick={confirm}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {busy ? `جارٍ الحذف ${busy.done}/${busy.total}` : `حذف ${count} نهائيًا`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, PencilLine, Undo2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAdmissionCatalog } from "../catalog.functions";
import { ageInMonths } from "../eligibility";
import { reservationPreferencesSchema } from "../reservation-schema";
import {
  updateSeatReservationPreferences,
  withdrawSeatReservation,
} from "../reservation.functions";
import { ReservationAuditLog } from "./ReservationAuditLog";

type Child = {
  id: string;
  name_ar: string;
  birth_date: string | null;
  preference_1_classroom_id: string | null;
  preference_2_classroom_id: string | null;
  preference_3_classroom_id: string | null;
};

type Draft = { childId: string; preference1: string; preference2: string; preference3: string };

/** Parent controls available only while the request is still pending review. */
export function ReservationSelfService({
  reservationId,
  children,
}: {
  reservationId: string;
  children: Child[];
}) {
  const queryClient = useQueryClient();
  const savePrefs = useServerFn(updateSeatReservationPreferences);
  const withdraw = useServerFn(withdrawSeatReservation);
  const [editOpen, setEditOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);

  const { data: catalog } = useQuery({
    queryKey: ["admissions", "catalog"],
    queryFn: () => getAdmissionCatalog(),
  });
  const classrooms = useMemo(() => catalog?.classrooms ?? [], [catalog]);

  function openEdit() {
    setDrafts(
      children.map((child) => ({
        childId: child.id,
        preference1: child.preference_1_classroom_id ?? "",
        preference2: child.preference_2_classroom_id ?? "",
        preference3: child.preference_3_classroom_id ?? "",
      })),
    );
    setEditOpen(true);
  }

  const optionsFor = (child: Child) => {
    const months = ageInMonths(child.birth_date);
    return classrooms.filter(
      (room) => months === null || (months >= room.min_age_months && months <= room.max_age_months),
    );
  };

  async function onSave() {
    const parsed = reservationPreferencesSchema.safeParse({ id: reservationId, children: drafts });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "تحقق من الرغبات المختارة");
      return;
    }
    setBusy(true);
    try {
      await savePrefs({ data: parsed.data });
      toast.success("تم تحديث رغبات الفصول");
      setEditOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["reservations"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر تحديث الرغبات");
    } finally {
      setBusy(false);
    }
  }

  async function onWithdraw() {
    setBusy(true);
    try {
      await withdraw({ data: { id: reservationId, note: note.trim() || null } });
      toast.success("تم سحب طلب الحجز");
      setWithdrawOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["reservations"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر سحب الطلب");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="rounded-2xl text-xs font-bold" onClick={openEdit}>
          <PencilLine className="size-3.5" />
          تعديل الرغبات
        </Button>
        <Button
          variant="ghost"
          className="rounded-2xl text-xs font-bold text-destructive"
          onClick={() => setWithdrawOpen(true)}
        >
          <Undo2 className="size-3.5" />
          سحب الطلب
        </Button>
      </div>

      <ReservationAuditLog reservationId={reservationId} />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-black">تعديل رغبات الفصول</DialogTitle>
            <DialogDescription className="text-xs leading-6">
              يمكنك تعديل الرغبات قبل مراجعة الإدارة للطلب. لا يمكن تكرار نفس الفصل في أكثر من رغبة.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {children.map((child, index) => {
              const draft = drafts[index];
              if (!draft) return null;
              const options = optionsFor(child);
              return (
                <div key={child.id} className="rounded-2xl border border-border/60 p-4">
                  <p className="text-xs font-black text-foreground">{child.name_ar}</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {(["preference1", "preference2", "preference3"] as const).map((key, rank) => {
                      const taken = (["preference1", "preference2", "preference3"] as const)
                        .filter((k) => k !== key)
                        .map((k) => draft[k])
                        .filter(Boolean);
                      const rankOptions = options.filter((room) => !taken.includes(room.id));
                      return (
                        <div key={key} className="space-y-1.5">
                          <Label className="text-[11px]">
                            الرغبة {rank + 1}
                            {rank === 0 ? " (مطلوبة)" : " (اختياري)"}
                          </Label>
                          <Select
                            value={draft[key] || undefined}
                            onValueChange={(v) =>
                              setDrafts((rows) =>
                                rows.map((row, i) => (i === index ? { ...row, [key]: v } : row)),
                              )
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="اختر الفصل" />
                            </SelectTrigger>
                            <SelectContent>
                              {rankOptions.map((room) => (
                                <SelectItem key={room.id} value={room.id}>
                                  {room.name_ar}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="hero" className="rounded-2xl" disabled={busy} onClick={onSave}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              حفظ التعديلات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-black">سحب طلب حجز المقعد؟</DialogTitle>
            <DialogDescription className="text-xs leading-6">
              سيتم إشعار إدارة التسجيل بسحب الطلب، ويمكنك تقديم طلب حجز جديد في أي وقت.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={3}
            placeholder="سبب السحب (اختياري)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <DialogFooter>
            <Button variant="ghost" className="font-bold" onClick={() => setWithdrawOpen(false)}>
              تراجع
            </Button>
            <Button
              variant="outline"
              className="rounded-2xl font-bold text-destructive"
              disabled={busy}
              onClick={onWithdraw}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              تأكيد سحب الطلب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ReservationAuditLog,
  type ReservationEvent,
} from "@/features/admissions/components/ReservationAuditLog";
import {
  RESERVATION_STATUS_COLORS,
  RESERVATION_STATUS_LABELS,
} from "@/features/admissions/reservation-schema";
import {
  decideSeatReservation,
  deleteSeatReservationByStaff,
} from "@/features/admissions/reservation.functions";
import { ageInMonths, formatAge } from "@/features/admissions/eligibility";
import { cn } from "@/lib/utils";
import { ReservationEditDialog } from "./ReservationEditDialog";
import {
  placementHint,
  progressOf,
  type ApplicationLite,
  type ClassroomRow,
  type ReservationRow,
} from "./reservation-view";

/** Single-request review surface — same review flow as the final applications tab. */
export function ReservationReviewDialog({
  reservation,
  classrooms,
  applications,
  onClose,
}: {
  reservation: ReservationRow | null;
  classrooms: ClassroomRow[];
  applications: ApplicationLite[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const decide = useServerFn(decideSeatReservation);
  const removeReservation = useServerFn(deleteSeatReservationByStaff);
  const [note, setNote] = useState("");
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    setNote("");
    setPlacements({});
  }, [reservation?.id]);

  if (!reservation) return null;
  const row = reservation;
  const children = [...(row.children ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const roomOf = (id: string | null) => classrooms.find((c) => c.id === id) ?? null;
  const app = progressOf(row, applications);
  const pending = row.status === "pending_review";
  const fullEverywhere =
    children.length > 0 &&
    children.every((c) => !placementHint(c, ageInMonths(c.birth_date), classrooms).ok);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["ams", "reservations"] });
  }

  async function run(action: "approve" | "reject") {
    setBusy(action);
    try {
      type Placement = { childId: string; classroomId: string | null; waitlisted: boolean };
      const manual = children
        .map((child): Placement | null => {
          const choice = placements[child.id];
          if (!choice || choice === "auto") return null;
          const [mode, classroomId] = choice.split(":");
          return { childId: child.id, classroomId: classroomId ?? null, waitlisted: mode === "wait" };
        })
        .filter((p): p is Placement => p !== null);
      const result = await decide({
        data: {
          id: row.id,
          action,
          note: note.trim() || null,
          ...(action === "approve" && manual.length ? { placements: manual } : {}),
        },
      });
      toast.success(
        action === "approve"
          ? `تم قبول الحجز — ${result.placements
              .map((p) => `${p.name}: ${p.classroom ?? "بدون فصل"}${p.waitlisted ? " (انتظار)" : ""}`)
              .join(" · ")}`
          : "تم رفض طلب الحجز وإشعار ولي الأمر.",
      );
      await refresh();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر تنفيذ القرار");
    } finally {
      setBusy(null);
    }
  }

  async function onDelete() {
    setBusy("delete");
    try {
      await removeReservation({ data: row.id });
      toast.success("تم حذف طلب الحجز وتحرير المقعد ورقم الهوية");
      await refresh();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر حذف طلب الحجز");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => (!v ? onClose() : undefined)}>
      <DialogContent
        dir="rtl"
        className="max-h-[92vh] max-w-3xl overflow-y-auto text-right"
      >
        <DialogHeader className="text-right">
          <DialogTitle className="flex flex-wrap items-center gap-2 text-base font-black">
            {row.parent_name}
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-black",
                RESERVATION_STATUS_COLORS[row.status] ?? "bg-muted",
              )}
            >
              {RESERVATION_STATUS_LABELS[row.status] ?? row.status}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs font-bold" dir="ltr">
            {row.parent_national_id} · {new Date(row.created_at).toLocaleString("ar-SA")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <ReservationEditDialog reservation={row as never} classrooms={classrooms as never} />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                className="rounded-2xl text-xs font-bold text-destructive hover:bg-destructive/10"
                disabled={busy !== null}
              >
                {busy === "delete" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
                حذف الطلب
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent dir="rtl" className="text-right">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-destructive">
                  حذف طلب حجز المقعد نهائيًا؟
                </AlertDialogTitle>
                <AlertDialogDescription className="leading-relaxed">
                  سيتم حذف الطلب وسجل التدقيق الخاص به، وتحرير المقعد وإلغاء حجب رقم هوية الطفل
                  ليتمكن ولي الأمر من إرسال طلب جديد.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2 sm:flex-row-reverse sm:justify-start">
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  نعم، احذف الطلب
                </AlertDialogAction>
                <AlertDialogCancel>تراجع</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {row.status === "approved" ? (
            <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-black text-muted-foreground">
              {app.label}
              {app.number ? ` · ${app.number}` : ""}
            </span>
          ) : null}
        </div>

        <div className="space-y-3">
          {children.map((child) => {
            const hint = placementHint(child, ageInMonths(child.birth_date), classrooms);
            return (
              <div key={child.id} className="rounded-2xl bg-muted/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-black text-foreground">
                    {child.name_ar}
                    <span className="ms-2 font-bold text-muted-foreground">
                      {formatAge(ageInMonths(child.birth_date))} ·{" "}
                      {child.gender === "female" ? "أنثى" : "ذكر"}
                    </span>
                  </p>
                  <p className="text-[11px] font-bold text-muted-foreground" dir="ltr">
                    {child.national_id}
                  </p>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    child.preference_1_classroom_id,
                    child.preference_2_classroom_id,
                    child.preference_3_classroom_id,
                  ].map((id, i) => {
                    if (!id) return null;
                    const room = roomOf(id);
                    const free = room ? Math.max(0, room.capacity - room.taken_seats) : 0;
                    const open = Boolean(room) && free > 0 && room?.is_active !== false;
                    return (
                      <span
                        key={`${child.id}-${i}`}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black",
                          open ? "bg-mint text-foreground" : "bg-destructive/15 text-destructive",
                        )}
                      >
                        {i + 1}. {room?.name_ar ?? "—"} · {open ? `متاح (${free})` : "مكتمل"}
                      </span>
                    );
                  })}
                </div>

                <p
                  className={cn(
                    "mt-2 text-[11px] font-black",
                    hint.ok ? "text-primary" : "text-destructive",
                  )}
                >
                  {hint.text}
                </p>

                {pending ? (
                  <div className="mt-3 max-w-sm">
                    <p className="mb-1.5 text-[10px] font-black text-muted-foreground">قرار التسكين</p>
                    <Select
                      value={placements[child.id] ?? "auto"}
                      onValueChange={(v) => setPlacements((prev) => ({ ...prev, [child.id]: v }))}
                    >
                      <SelectTrigger className="h-9 text-xs font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">تلقائي حسب الرغبات المتاحة</SelectItem>
                        {[
                          child.preference_1_classroom_id,
                          child.preference_2_classroom_id,
                          child.preference_3_classroom_id,
                        ].flatMap((id, i) => {
                          if (!id) return [];
                          const room = roomOf(id);
                          if (!room) return [];
                          const free = Math.max(0, room.capacity - room.taken_seats);
                          return [
                            <SelectItem key={`seat-${id}`} value={`seat:${id}`} disabled={free <= 0}>
                              تسكين مباشر — {room.name_ar} (الرغبة {i + 1})
                            </SelectItem>,
                            <SelectItem key={`wait-${id}`} value={`wait:${id}`}>
                              قائمة انتظار — {room.name_ar} (الرغبة {i + 1})
                            </SelectItem>,
                          ];
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                {row.status === "approved" ? (
                  <p className="mt-1 text-[11px] font-bold text-foreground">
                    القرار: {roomOf(child.assigned_classroom_id)?.name_ar ?? "بدون فصل"}
                    {child.waitlisted ? " (قائمة انتظار)" : ""}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>

        {pending ? (
          <div className="space-y-3">
            {fullEverywhere ? (
              <p className="rounded-2xl bg-destructive/10 px-4 py-2 text-[11px] font-black text-destructive">
                وصل الفصل وقائمة الانتظار إلى الطاقة الاستيعابية القصوى
              </p>
            ) : null}
            <Textarea
              rows={2}
              placeholder="ملاحظة لولي الأمر (اختياري)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="hero"
                className="rounded-2xl text-xs font-bold"
                disabled={busy !== null}
                onClick={() => run("approve")}
              >
                {busy === "approve" ? <Loader2 className="size-3.5 animate-spin" /> : null}
                قبول الحجز وتسكين الطفل
              </Button>
              <Button
                variant="outline"
                className="rounded-2xl text-xs font-bold text-destructive"
                disabled={busy !== null}
                onClick={() => run("reject")}
              >
                {busy === "reject" ? <Loader2 className="size-3.5 animate-spin" /> : null}
                رفض الحجز
              </Button>
            </div>
          </div>
        ) : row.decision_note ? (
          <p className="rounded-2xl bg-muted/40 px-4 py-2 text-[11px] font-bold text-muted-foreground">
            ملاحظة القرار: {row.decision_note}
          </p>
        ) : null}

        <ReservationAuditLog
          reservationId={row.id}
          events={(row as { events?: ReservationEvent[] }).events ?? []}
        />
      </DialogContent>
    </Dialog>
  );
}
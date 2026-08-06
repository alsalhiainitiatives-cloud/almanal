import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Clock, Loader2, Search, Trash2, Undo2, XCircle } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  decideSeatReservation,
  deleteSeatReservationByStaff,
  staffSeatReservations,
} from "@/features/admissions/reservation.functions";
import {
  RESERVATION_STATUS_COLORS,
  RESERVATION_STATUS_LABELS,
} from "@/features/admissions/reservation-schema";
import {
  ReservationAuditLog,
  type ReservationEvent,
} from "@/features/admissions/components/ReservationAuditLog";
import { ageInMonths, formatAge } from "@/features/admissions/eligibility";
import { ReservationEditDialog } from "./ReservationEditDialog";
import { cn } from "@/lib/utils";

type Filter = "pending_review" | "approved" | "rejected" | "withdrawn";

export function ReservationsBoard() {
  const queryClient = useQueryClient();
  const decide = useServerFn(decideSeatReservation);
  const removeReservation = useServerFn(deleteSeatReservationByStaff);
  const [filter, setFilter] = useState<Filter>("pending_review");
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  /** childId → "auto" | "seat:<classroomId>" | "wait:<classroomId>" */
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function onDelete(id: string) {
    setBusy(id + "delete");
    try {
      await removeReservation({ data: id });
      await queryClient.invalidateQueries({ queryKey: ["ams", "reservations"] });
      toast.success("تم حذف طلب الحجز وتحرير المقعد ورقم الهوية");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر حذف طلب الحجز");
    } finally {
      setBusy(null);
    }
  }

  const { data, isLoading } = useQuery({
    queryKey: ["ams", "reservations"],
    queryFn: () => staffSeatReservations(),
  });

  const classrooms = useMemo(() => data?.classrooms ?? [], [data]);
  const applications = useMemo(() => data?.applications ?? [], [data]);

  /** Approved reservation → has the parent submitted the full registration? */
  const progressOf = (applicationId: string | null) => {
    const app = applicationId ? applications.find((a) => a.id === applicationId) : null;
    const done = Boolean(app && app.status !== "draft");
    return {
      done,
      label: done ? "تم استكمال البيانات" : "بانتظار استكمال البيانات",
      number: app?.application_number ?? null,
    };
  };

  const rowsAll = data?.rows ?? [];
  const q = search.trim().toLowerCase();
  const matches = (row: (typeof rowsAll)[number]) => {
    if (!q) return true;
    const app = progressOf(row.application_id);
    const haystack = [
      row.parent_name,
      row.parent_national_id,
      app.number ?? "",
      row.application_id ?? "",
      ...(row.children ?? []).flatMap((c) => [c.name_ar, c.national_id ?? ""]),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  };

  const rows = rowsAll.filter((row) => row.status === filter && matches(row));

  const roomOf = (id: string | null) => classrooms.find((c) => c.id === id) ?? null;

  /** Preference 1 → 2 → 3; mirrors the server-side placement rule. */
  function suggestion(child: {
    birth_date: string | null;
    preference_1_classroom_id: string | null;
    preference_2_classroom_id: string | null;
    preference_3_classroom_id: string | null;
  }) {
    const months = ageInMonths(child.birth_date);
    const prefs = [
      child.preference_1_classroom_id,
      child.preference_2_classroom_id,
      child.preference_3_classroom_id,
    ];
    for (let i = 0; i < prefs.length; i++) {
      const room = roomOf(prefs[i]);
      if (!room || room.is_active === false) continue;
      const free = Math.max(0, room.capacity - room.taken_seats);
      const ageOk =
        months === null || (months >= room.min_age_months && months <= room.max_age_months);
      if (ageOk && free > 0) {
        return { text: `تسكين مباشر في «${room.name_ar}» (الرغبة ${i + 1}) — ${free} مقعد متاح`, ok: true };
      }
    }
    const first = roomOf(prefs.find(Boolean) ?? null);
    return {
      text: first
        ? `لا يوجد مقعد مطابق — الاقتراح: قائمة انتظار «${first.name_ar}»`
        : "لم يتم اختيار فصول",
      ok: false,
    };
  }

  async function run(id: string, action: "approve" | "reject") {
    setBusy(id + action);
    try {
      const row = (data?.rows ?? []).find((r) => r.id === id);
      type Placement = { childId: string; classroomId: string | null; waitlisted: boolean };
      const manual: Placement[] = (row?.children ?? [])
        .map((child) => {
          const choice = placements[child.id];
          if (!choice || choice === "auto") return null;
          const [mode, classroomId] = choice.split(":");
          const placement: Placement = {
            childId: child.id,
            classroomId: classroomId ?? null,
            waitlisted: mode === "wait",
          };
          return placement;
        })
        .filter((p): p is Placement => p !== null);
      const result = await decide({
        data: {
          id,
          action,
          note: notes[id]?.trim() || null,
          ...(action === "approve" && manual.length ? { placements: manual } : {}),
        },
      });
      toast.success(
        action === "approve"
          ? `تم قبول الحجز — ${result.placements.map((p) => `${p.name}: ${p.classroom ?? "بدون فصل"}${p.waitlisted ? " (انتظار)" : ""}`).join(" · ")}`
          : "تم رفض طلب الحجز وإشعار ولي الأمر.",
      );
      await queryClient.invalidateQueries({ queryKey: ["ams", "reservations"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر تنفيذ القرار");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList className="rounded-2xl">
          <TabsTrigger value="pending_review" className="text-xs font-bold">
            <Clock className="size-3.5" />
            بانتظار المراجعة
          </TabsTrigger>
          <TabsTrigger value="approved" className="text-xs font-bold">
            <CheckCircle2 className="size-3.5" />
            المقبولة
          </TabsTrigger>
          <TabsTrigger value="rejected" className="text-xs font-bold">
            <XCircle className="size-3.5" />
            المرفوضة
          </TabsTrigger>
          <TabsTrigger value="withdrawn" className="text-xs font-bold">
            <Undo2 className="size-3.5" />
            المسحوبة
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="relative">
        <Search className="absolute inset-inline-start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث باسم الطفل أو هويته أو اسم ولي الأمر أو رقم الطلب"
          className="rounded-2xl ps-9 text-xs font-bold"
        />
      </div>

      {isLoading && (
        <div className="grid place-items-center rounded-3xl border border-border/60 bg-card p-10">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && !rows.length && (
        <div className="rounded-3xl border border-dashed border-border/60 bg-card p-10 text-center text-sm font-bold text-muted-foreground">
          لا توجد طلبات حجز في هذه الحالة.
        </div>
      )}

      {/* Clean overview table — staff-only, seat availability included. */}
      {!isLoading && rows.length ? (
        <div className="overflow-x-auto rounded-3xl border border-border/60 bg-card shadow-sm">
          <table className="w-full min-w-[720px] text-start text-xs">
            <thead className="bg-muted/50 text-[11px] font-black text-muted-foreground">
              <tr>
                <th className="p-3 text-start">الطفل</th>
                <th className="p-3 text-start">هوية الطفل</th>
                <th className="p-3 text-start">ولي الأمر</th>
                <th className="p-3 text-start">الفصل / الرغبة</th>
                <th className="p-3 text-start">تاريخ الطلب</th>
                <th className="p-3 text-start">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {rows.flatMap((row) =>
                (row.children ?? []).map((child) => {
                  const room =
                    roomOf(child.assigned_classroom_id) ?? roomOf(child.preference_1_classroom_id);
                  const free = room ? Math.max(0, room.capacity - room.taken_seats) : 0;
                  return (
                    <tr key={child.id} className="border-t border-border/50 font-bold">
                      <td className="p-3 text-foreground">{child.name_ar}</td>
                      <td className="p-3 text-muted-foreground" dir="ltr">
                        {child.national_id ?? "—"}
                      </td>
                      <td className="p-3 text-muted-foreground">{row.parent_name}</td>
                      <td className="p-3">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-black",
                            free > 0 ? "bg-mint text-foreground" : "bg-destructive/15 text-destructive",
                          )}
                        >
                          {room ? `${room.name_ar} · متاح ${free}` : "بدون فصل"}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground" dir="ltr">
                        {new Date(row.created_at).toLocaleDateString("ar-SA")}
                      </td>
                      <td className="p-3">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-black",
                            RESERVATION_STATUS_COLORS[row.status] ?? "bg-muted",
                          )}
                        >
                          {RESERVATION_STATUS_LABELS[row.status] ?? row.status}
                        </span>
                      </td>
                    </tr>
                  );
                }),
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {rows.map((row) => {
        const fullEverywhere = (row.children ?? []).every((child) => !suggestion(child).ok);
        return (
          <div key={row.id} className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-black text-foreground">{row.parent_name}</p>
                <p className="text-[11px] text-muted-foreground" dir="ltr">
                  {row.parent_national_id} · {new Date(row.created_at).toLocaleString("ar-SA")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[10px] font-black",
                    RESERVATION_STATUS_COLORS[row.status] ?? "bg-muted",
                  )}
                >
                  {RESERVATION_STATUS_LABELS[row.status] ?? row.status}
                </span>
                <ReservationEditDialog reservation={row} classrooms={classrooms} />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      className="rounded-2xl text-xs font-bold text-destructive hover:bg-destructive/10"
                      disabled={busy !== null}
                    >
                      {busy === row.id + "delete" ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                      حذف
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
                        onClick={() => onDelete(row.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        نعم، احذف الطلب
                      </AlertDialogAction>
                      <AlertDialogCancel>تراجع</AlertDialogCancel>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {(row.children ?? []).map((child) => {
                const hint = suggestion(child);
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
                    <p className="mt-2 text-[11px] font-bold text-muted-foreground">
                      الرغبات:{" "}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-2">
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
                              open
                                ? "bg-mint text-foreground"
                                : "bg-destructive/15 text-destructive",
                            )}
                          >
                            {i + 1}. {room?.name_ar ?? "—"} ·{" "}
                            {open ? `متاح (${free})` : "مكتمل"}
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
                    {row.status === "pending_review" ? (
                      <div className="mt-3 max-w-sm">
                        <p className="mb-1.5 text-[10px] font-black text-muted-foreground">
                          قرار التسكين
                        </p>
                        <Select
                          value={placements[child.id] ?? "auto"}
                          onValueChange={(v) =>
                            setPlacements((prev) => ({ ...prev, [child.id]: v }))
                          }
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
                                <SelectItem
                                  key={`seat-${id}`}
                                  value={`seat:${id}`}
                                  disabled={free <= 0}
                                >
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
                    {row.status === "approved" && (
                      <p className="mt-1 text-[11px] font-bold text-foreground">
                        القرار: {roomOf(child.assigned_classroom_id)?.name_ar ?? "بدون فصل"}
                        {child.waitlisted ? " (قائمة انتظار)" : ""}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {row.status === "pending_review" ? (
              <div className="mt-4 space-y-3">
                {fullEverywhere && (
                  <p className="rounded-2xl bg-destructive/10 px-4 py-2 text-[11px] font-black text-destructive">
                    وصل الفصل وقائمة الانتظار إلى الطاقة الاستيعابية القصوى
                  </p>
                )}
                <Textarea
                  rows={2}
                  placeholder="ملاحظة لولي الأمر (اختياري)"
                  value={notes[row.id] ?? ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [row.id]: e.target.value }))}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="hero"
                    className="rounded-2xl text-xs font-bold"
                    disabled={busy !== null}
                    onClick={() => run(row.id, "approve")}
                  >
                    {busy === row.id + "approve" ? <Loader2 className="size-3.5 animate-spin" /> : null}
                    قبول الحجز وتسكين الطفل
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-2xl text-xs font-bold text-destructive"
                    disabled={busy !== null}
                    onClick={() => run(row.id, "reject")}
                  >
                    {busy === row.id + "reject" ? <Loader2 className="size-3.5 animate-spin" /> : null}
                    رفض الحجز
                  </Button>
                </div>
              </div>
            ) : (
              row.decision_note && (
                <p className="mt-4 rounded-2xl bg-muted/40 px-4 py-2 text-[11px] font-bold text-muted-foreground">
                  ملاحظة القرار: {row.decision_note}
                </p>
              )
            )}

            <div className="mt-4">
              <ReservationAuditLog
                reservationId={row.id}
                events={(row as { events?: ReservationEvent[] }).events ?? []}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

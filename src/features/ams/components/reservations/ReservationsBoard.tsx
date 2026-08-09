import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  Search,
  Trash2,
  Undo2,
  Users,
  XCircle,
} from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  deleteSeatReservationByStaff,
  staffSeatReservations,
} from "@/features/admissions/reservation.functions";
import {
  RESERVATION_STATUS_COLORS,
  RESERVATION_STATUS_LABELS,
} from "@/features/admissions/reservation-schema";
import { cn } from "@/lib/utils";
import { ReservationReviewDialog } from "./ReservationReviewDialog";
import {
  matchesReservation,
  progressOf,
  reservationsToCsv,
  RESERVATION_SORT_LABELS,
  sortReservations,
  waitingDays,
  type ApplicationLite,
  type ClassroomRow,
  type ReservationRow,
  type ReservationSort,
} from "./reservation-view";

type Filter = "pending_review" | "approved" | "rejected" | "withdrawn";

const TABS: { value: Filter; label: string; icon: typeof Clock }[] = [
  { value: "pending_review", label: "بانتظار المراجعة", icon: Clock },
  { value: "approved", label: "المقبولة", icon: CheckCircle2 },
  { value: "rejected", label: "المرفوضة", icon: XCircle },
  { value: "withdrawn", label: "المسحوبة", icon: Undo2 },
];

/**
 * Step 0 staff board — mirrors the final applications queue: filter tabs,
 * one compact row per request, and a review dialog for the actual decision.
 */
export function ReservationsBoard() {
  const queryClient = useQueryClient();
  const removeReservation = useServerFn(deleteSeatReservationByStaff);
  const [filter, setFilter] = useState<Filter>("pending_review");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<ReservationSort>("oldest");
  const [selected, setSelected] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["ams", "reservations"],
    queryFn: () => staffSeatReservations(),
  });

  const classrooms = useMemo(() => (data?.classrooms ?? []) as ClassroomRow[], [data]);
  const applications = useMemo(() => (data?.applications ?? []) as ApplicationLite[], [data]);
  const all = useMemo(() => (data?.rows ?? []) as unknown as ReservationRow[], [data]);

  const counts = useMemo(() => {
    const base: Record<Filter, number> = {
      pending_review: 0,
      approved: 0,
      rejected: 0,
      withdrawn: 0,
    };
    for (const row of all) if (row.status in base) base[row.status as Filter] += 1;
    return base;
  }, [all]);

  const rows = useMemo(
    () =>
      sortReservations(
        all.filter((row) => row.status === filter && matchesReservation(row, search, applications)),
        sort,
      ),
    [all, filter, search, sort, applications],
  );

  const visibleIds = rows.map((r) => r.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));
  const current = openId ? (all.find((r) => r.id === openId) ?? null) : null;

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function bulkDelete() {
    setBulkBusy(true);
    let done = 0;
    let blocked = 0;
    try {
      for (const id of selected) {
        try {
          const result = await removeReservation({ data: id });
          if (result.ok) done += 1;
          else blocked += 1;
        } catch {
          /* keep going — report the total at the end */
        }
      }
      await queryClient.invalidateQueries({ queryKey: ["ams", "reservations"] });
      toast.success(
        `تم حذف ${done} من ${selected.length} طلب${
          blocked ? ` — تم تجاهل ${blocked} لبدء طلب التسجيل` : ""
        }`,
      );
      setSelected([]);
    } finally {
      setBulkBusy(false);
    }
  }

  function exportCsv() {
    const csv = reservationsToCsv(rows, classrooms, applications);
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `reservations-${filter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <Tabs
        value={filter}
        onValueChange={(v) => {
          setFilter(v as Filter);
          setSelected([]);
        }}
      >
        <TabsList className="flex-wrap rounded-2xl">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.value} value={tab.value} className="text-xs font-bold">
                <Icon className="size-3.5" />
                {tab.label}
                <span className="ms-1 rounded-full bg-background/70 px-1.5 text-[10px] font-black">
                  {counts[tab.value]}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[16rem] flex-1">
          <Search className="absolute inset-inline-start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم الطفل أو هويته أو اسم ولي الأمر أو الرقم الأكاديمي"
            className="rounded-2xl ps-9 text-xs font-bold"
          />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as ReservationSort)}>
          <SelectTrigger className="h-10 w-52 rounded-2xl text-xs font-bold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(RESERVATION_SORT_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="soft" className="h-10 rounded-2xl text-xs font-bold" onClick={exportCsv}>
          <Download className="size-3.5" />
          تصدير CSV
        </Button>
      </div>

      {selected.length ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/40 px-4 py-3">
          <p className="text-xs font-black text-foreground">
            تم تحديد {selected.length} طلب
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              className="rounded-2xl text-xs font-bold"
              onClick={() => setSelected([])}
            >
              إلغاء التحديد
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="rounded-2xl text-xs font-bold text-destructive"
                  disabled={bulkBusy}
                >
                  {bulkBusy ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                  حذف المحدد
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent dir="rtl" className="text-right">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-destructive">
                    حذف {selected.length} طلب حجز نهائيًا؟
                  </AlertDialogTitle>
                  <AlertDialogDescription className="leading-relaxed">
                    سيتم تحرير المقاعد وإلغاء حجب أرقام الهوية. لا يمكن التراجع عن هذا الإجراء.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2 sm:flex-row-reverse sm:justify-start">
                  <AlertDialogAction
                    onClick={bulkDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    نعم، احذف
                  </AlertDialogAction>
                  <AlertDialogCancel>تراجع</AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid place-items-center rounded-3xl border border-border/60 bg-card p-10">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : null}

      {!isLoading && !rows.length ? (
        <div className="rounded-3xl border border-dashed border-border/60 bg-card p-10 text-center text-sm font-bold text-muted-foreground">
          لا توجد طلبات حجز في هذه الحالة.
        </div>
      ) : null}

      {!isLoading && rows.length ? (
        <div className="overflow-x-auto rounded-3xl border border-border/60 bg-card shadow-sm">
          <table className="w-full min-w-[880px] text-start text-xs">
            <thead className="sticky top-0 z-10 bg-muted/60 text-[11px] font-black text-muted-foreground backdrop-blur">
              <tr>
                <th className="w-10 p-3">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(v) => setSelected(v ? visibleIds : [])}
                    aria-label="تحديد الكل"
                  />
                </th>
                <th className="p-3 text-start">ولي الأمر</th>
                <th className="p-3 text-start">الأطفال</th>
                <th className="p-3 text-start">الفصل / الرغبة الأولى</th>
                <th className="p-3 text-start">مدة الانتظار</th>
                <th className="p-3 text-start">الحالة</th>
                <th className="p-3 text-start">استكمال التسجيل</th>
                <th className="p-3 text-start">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const children = [...(row.children ?? [])].sort((a, b) => a.sort_order - b.sort_order);
                const first = children[0];
                const room = classrooms.find(
                  (c) =>
                    c.id === (first?.assigned_classroom_id ?? first?.preference_1_classroom_id ?? ""),
                );
                const free = room ? Math.max(0, room.capacity - room.taken_seats) : 0;
                const progress = progressOf(row, applications);
                const days = waitingDays(row);
                return (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-t border-border/50 font-bold transition-colors hover:bg-muted/40"
                    onClick={() => setOpenId(row.id)}
                  >
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.includes(row.id)}
                        onCheckedChange={() => toggle(row.id)}
                        aria-label="تحديد الطلب"
                      />
                    </td>
                    <td className="p-3">
                      <p className="text-foreground">{row.parent_name}</p>
                      <p className="text-[10px] text-muted-foreground" dir="ltr">
                        {row.parent_national_id}
                      </p>
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 text-foreground">
                        <Users className="size-3.5 text-primary" />
                        {children.length}
                      </span>
                      <p className="mt-0.5 max-w-[14rem] truncate text-[10px] text-muted-foreground">
                        {children.map((c) => c.name_ar).join(" · ")}
                      </p>
                    </td>
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
                    <td className="p-3">
                      <span
                        className={cn(
                          "text-[10px] font-black",
                          row.status === "pending_review" && days >= 3
                            ? "text-destructive"
                            : "text-muted-foreground",
                        )}
                      >
                        {days === 0 ? "اليوم" : `${days} يوم`}
                      </span>
                      <p className="text-[10px] text-muted-foreground" dir="ltr">
                        {new Date(row.created_at).toLocaleDateString("ar-SA")}
                      </p>
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
                    <td className="p-3">
                      {row.status === "approved" ? (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-black",
                            progress.done ? "bg-mint text-foreground" : "bg-amber-100 text-amber-800",
                          )}
                        >
                          {progress.label}
                          {progress.number ? ` · ${progress.number}` : ""}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="soft"
                        className="h-8 rounded-xl text-[11px] font-bold"
                        onClick={() => setOpenId(row.id)}
                      >
                        {row.status === "pending_review" ? "مراجعة واتخاذ قرار" : "عرض التفاصيل"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <ReservationReviewDialog
        reservation={current}
        classrooms={classrooms}
        applications={applications}
        onClose={() => setOpenId(null)}
      />
    </div>
  );
}

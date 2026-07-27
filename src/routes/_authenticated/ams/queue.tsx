import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Inbox, Pin, Search, SlidersHorizontal, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { amsAssignOfficer, amsQueue, amsStaff, amsTogglePin } from "@/features/ams/ams.functions";
import { AmsShell } from "@/features/ams/components/AmsShell";
import {
  EmptyState,
  PriorityPill,
  STATUS_LABELS,
  SkeletonRows,
  StatusPill,
  formatDateTime,
} from "@/features/ams/components/atoms";
import { PAYMENT_STATUS_LABELS, SEAT_STATUS_LABELS } from "@/features/ams/roles";
import { QURRA_STATUS_LABELS } from "@/features/admissions/eligibility";
import { cn } from "@/lib/utils";
type QueueSearch = { status?: string; officerId?: string; payment?: string; qurra?: string };
export const Route = createFileRoute("/_authenticated/ams/queue")({
  validateSearch: (search: Record<string, unknown>): QueueSearch => ({
    status: typeof search.status === "string" ? search.status : undefined,
    officerId: typeof search.officerId === "string" ? search.officerId : undefined,
    payment: typeof search.payment === "string" ? search.payment : undefined,
    qurra: typeof search.qurra === "string" ? search.qurra : undefined,
  }),
  head: () => ({
    meta: [
      { title: "قائمة طلبات القبول — مدارس وروضة المنال" },
      { name: "description", content: "إدارة وفرز ومعالجة طلبات القبول." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: QueuePage,
});
const ALL = "all";
function QueuePage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const [term, setTerm] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkOfficer, setBulkOfficer] = useState("");
  const filters = {
    status: search.status ?? null,
    officerId: search.officerId ?? null,
    payment: search.payment ?? null,
    qurra: search.qurra ?? null,
  };
  const { data, isLoading, error } = useQuery({
    queryKey: ["ams", "queue", filters],
    queryFn: () => amsQueue({ data: filters }),
  });
  const { data: staff } = useQuery({ queryKey: ["ams", "staff"], queryFn: () => amsStaff() });
  const togglePin = useServerFn(amsTogglePin);
  const assign = useServerFn(amsAssignOfficer);
  const pinMutation = useMutation({
    mutationFn: (input: { id: string; pinned: boolean }) => togglePin({ data: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ams"] }),
  });
  const bulkAssign = useMutation({
    mutationFn: async (officerId: string) => {
      for (const id of selected) await assign({ data: { id, officerId } });
    },
    onSuccess: () => {
      toast.success("تم إسناد الطلبات المحددة");
      setSelected([]);
      queryClient.invalidateQueries({ queryKey: ["ams"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const rows = useMemo(() => {
    const needle = term.trim().toLowerCase();
    const list = data ?? [];
    const filtered = needle
      ? list.filter((row) =>
          [
            row.application_number,
            row.tracking_number,
            row.parentName,
            row.parentPhone,
            row.parent_national_id,
            ...row.children.flatMap((child) => [child.name_ar, child.national_id]),
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(needle)),
        )
      : list;
    return [...filtered].sort((a, b) => Number(b.pinned) - Number(a.pinned));
  }, [data, term]);
  const setFilter = (key: keyof QueueSearch, value: string) =>
    navigate({ search: (prev) => ({ ...prev, [key]: value === ALL ? undefined : value }) });
  return (
    <AmsShell
      wide
      title="قائمة الطلبات"
      description={`${rows.length} طلب مطابق للفلاتر الحالية`}
      actions={
        <Button
          variant="outline"
          className="rounded-2xl text-xs font-bold"
          onClick={() => setShowFilters((value) => !value)}
        >
          <SlidersHorizontal className="size-3.5" /> الفلاتر
        </Button>
      }
    >
      {showFilters ? (
        <div className="grid gap-2.5 rounded-3xl border border-border/60 bg-card p-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="relative">
            <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="بحث بالاسم أو الرقم أو الهوية…"
              className="rounded-2xl pe-9 text-xs"
            />
          </div>
          <Select value={search.status ?? ALL} onValueChange={(value) => setFilter("status", value)}>
            <SelectTrigger className="rounded-2xl text-xs">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>كل الحالات</SelectItem>
              {["submitted", "under_review", "needs_action", "principal_review", "waitlisted", "approved", "rejected"].map(
                (status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_LABELS[status] ?? status}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
          <Select value={search.officerId ?? ALL} onValueChange={(value) => setFilter("officerId", value)}>
            <SelectTrigger className="rounded-2xl text-xs">
              <SelectValue placeholder="المسؤول" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>كل المسؤولين</SelectItem>
              <SelectItem value="unassigned">غير مُسند</SelectItem>
              {(staff ?? []).map((person) => (
                <SelectItem key={person.id} value={person.id}>
                  {person.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={search.qurra ?? ALL} onValueChange={(value) => setFilter("qurra", value)}>
            <SelectTrigger className="rounded-2xl text-xs">
              <SelectValue placeholder="قرة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>كل حالات قرة</SelectItem>
              {Object.entries(QURRA_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={search.payment ?? ALL} onValueChange={(value) => setFilter("payment", value)}>
            <SelectTrigger className="rounded-2xl text-xs">
              <SelectValue placeholder="السداد" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>كل حالات السداد</SelectItem>
              {Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      {selected.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-3xl border border-primary/30 bg-primary/5 p-3">
          <span className="text-xs font-extrabold text-primary">{selected.length} طلب محدد</span>
          <Select value={bulkOfficer} onValueChange={setBulkOfficer}>
            <SelectTrigger className="h-9 w-56 rounded-2xl text-xs">
              <SelectValue placeholder="إسناد جماعي إلى…" />
            </SelectTrigger>
            <SelectContent>
              {(staff ?? []).map((person) => (
                <SelectItem key={person.id} value={person.id}>
                  {person.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="rounded-2xl text-xs font-bold"
            disabled={!bulkOfficer || bulkAssign.isPending}
            onClick={() => bulkAssign.mutate(bulkOfficer)}
          >
            <Users className="size-3.5" /> تنفيذ
          </Button>
          <Button size="sm" variant="ghost" className="rounded-2xl text-xs" onClick={() => setSelected([])}>
            إلغاء التحديد
          </Button>
        </div>
      ) : null}
      {error ? (
        <EmptyState title="تعذّر تحميل الطلبات" description={(error as Error).message} />
      ) : isLoading ? (
        <SkeletonRows rows={8} />
      ) : rows.length === 0 ? (
        <EmptyState icon={<Inbox className="size-5" />} title="لا توجد طلبات" description="جرّب تغيير الفلاتر أو البحث." />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border/60 bg-card">
          <table className="w-full min-w-[1100px] text-start text-xs">
            <thead className="bg-muted/40 text-[11px] font-extrabold text-muted-foreground">
              <tr>
                <th className="px-3 py-3"> </th>
                <th className="px-3 py-3 text-start">رقم الطلب</th>
                <th className="px-3 py-3 text-start">الطلاب</th>
                <th className="px-3 py-3 text-start">ولي الأمر</th>
                <th className="px-3 py-3 text-start">الحالة</th>
                <th className="px-3 py-3 text-start">الأولوية</th>
                <th className="px-3 py-3 text-start">المستندات</th>
                <th className="px-3 py-3 text-start">قرة</th>
                <th className="px-3 py-3 text-start">المقعد</th>
                <th className="px-3 py-3 text-start">السداد</th>
                <th className="px-3 py-3 text-start">المسؤول</th>
                <th className="px-3 py-3 text-start">آخر تحديث</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border/50 transition-colors hover:bg-accent/40">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={selected.includes(row.id)}
                        onChange={(event) =>
                          setSelected((prev) =>
                            event.target.checked ? [...prev, row.id] : prev.filter((value) => value !== row.id),
                          )
                        }
                        className="size-3.5 accent-[var(--color-primary)]"
                      />
                      <button
                        type="button"
                        onClick={() => pinMutation.mutate({ id: row.id, pinned: !row.pinned })}
                        aria-label="تثبيت"
                      >
                        <Pin className={cn("size-3.5", row.pinned ? "fill-primary text-primary" : "text-muted-foreground")} />
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      to="/ams/applications/$applicationId"
                      params={{ applicationId: row.id }}
                      className="font-extrabold text-foreground hover:text-primary"
                    >
                      {row.application_number ?? "بدون رقم"}
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-bold text-foreground">
                      {row.children.map((child) => child.name_ar).join("، ") || "—"}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-bold text-foreground">{row.parentName}</span>
                    <span className="block text-[10px] text-muted-foreground" dir="ltr">
                      {row.parentPhone ?? ""}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <StatusPill status={row.status} />
                  </td>
                  <td className="px-3 py-3">
                    <PriorityPill priority={row.priority} />
                  </td>
                  <td className="px-3 py-3 font-bold">
                    {row.documentsApproved}/{row.documentsTotal}
                    {row.documentsRejected > 0 ? (
                      <span className="ms-1 text-destructive">({row.documentsRejected} مرفوض)</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 font-bold text-muted-foreground">
                    {QURRA_STATUS_LABELS[row.qurraStatus] ?? row.qurraStatus}
                  </td>
                  <td className="px-3 py-3 font-bold text-muted-foreground">
                    {SEAT_STATUS_LABELS[row.seat_status] ?? row.seat_status}
                  </td>
                  <td className="px-3 py-3 font-bold text-muted-foreground">
                    {PAYMENT_STATUS_LABELS[row.payment_status] ?? row.payment_status}
                  </td>
                  <td className="px-3 py-3 font-bold text-muted-foreground">{row.officerName ?? "غير مُسند"}</td>
                  <td className="px-3 py-3 text-[10px] font-bold text-muted-foreground">
                    {formatDateTime(row.updated_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AmsShell>
  );
}
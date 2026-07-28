import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckSquare,
  Download,
  Flag,
  Inbox,
  LayoutGrid,
  Rows3,
  Search,
  SlidersHorizontal,
  Table2,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QURRA_STATUS_LABELS } from "@/features/admissions/eligibility";
import { listStages } from "@/features/admissions/catalog.functions";
import {
  amsAssignOfficer,
  amsQueue,
  amsSetPriority,
  amsStaff,
  amsTogglePin,
} from "@/features/ams/ams.functions";
import { AmsShell } from "@/features/ams/components/AmsShell";
import { EmptyState, STATUS_LABELS, SkeletonRows } from "@/features/ams/components/atoms";
import { AccessNotice, isAuthorizationError } from "@/features/ams/components/AccessNotice";
import { QueueCards } from "@/features/ams/components/queue/QueueCards";
import { QueueTable } from "@/features/ams/components/queue/QueueTable";
import {
  SORT_LABELS,
  type SortKey,
  type ViewMode,
  matchesTerm,
  sortRows,
  toCsv,
} from "@/features/ams/queue-view";
import { PAYMENT_STATUS_LABELS, PRIORITY_LABELS } from "@/features/ams/roles";
import { cn } from "@/lib/utils";

type QueueSearch = {
  status?: string;
  officerId?: string;
  payment?: string;
  qurra?: string;
  stageId?: string;
};

export const Route = createFileRoute("/_authenticated/ams/queue")({
  validateSearch: (search: Record<string, unknown>): QueueSearch => ({
    status: typeof search.status === "string" ? search.status : undefined,
    officerId: typeof search.officerId === "string" ? search.officerId : undefined,
    payment: typeof search.payment === "string" ? search.payment : undefined,
    qurra: typeof search.qurra === "string" ? search.qurra : undefined,
    stageId: typeof search.stageId === "string" ? search.stageId : undefined,
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

const TABS: { key: string | undefined; label: string }[] = [
  { key: undefined, label: "الكل" },
  { key: "submitted", label: STATUS_LABELS.submitted ?? "جديد" },
  { key: "under_review", label: STATUS_LABELS.under_review ?? "قيد المراجعة" },
  { key: "needs_action", label: STATUS_LABELS.needs_action ?? "بانتظار ولي الأمر" },
  { key: "principal_review", label: STATUS_LABELS.principal_review ?? "اعتماد المدير" },
  { key: "waitlisted", label: STATUS_LABELS.waitlisted ?? "قائمة الانتظار" },
  { key: "approved", label: STATUS_LABELS.approved ?? "مقبول" },
  { key: "rejected", label: STATUS_LABELS.rejected ?? "مرفوض" },
];

function QueuePage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();

  const [term, setTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkOfficer, setBulkOfficer] = useState("");
  const [bulkPriority, setBulkPriority] = useState("");
  const [confirm, setConfirm] = useState<{ kind: "assign" | "priority"; value: string } | null>(null);
  const [view, setView] = useState<ViewMode>("table");
  const [compact, setCompact] = useState(false);
  const [sort, setSort] = useState<SortKey>("recent");

  // Status tab is applied client-side so the tab counters always show totals.
  const filters = {
    status: null,
    officerId: search.officerId ?? null,
    payment: search.payment ?? null,
    qurra: search.qurra ?? null,
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ["ams", "queue", filters],
    queryFn: () => amsQueue({ data: filters }),
  });
  const { data: staff } = useQuery({ queryKey: ["ams", "staff"], queryFn: () => amsStaff() });
  const { data: stages } = useQuery({ queryKey: ["stages", "list"], queryFn: () => listStages() });

  const togglePin = useServerFn(amsTogglePin);
  const assign = useServerFn(amsAssignOfficer);
  const priority = useServerFn(amsSetPriority);

  const pinMutation = useMutation({
    mutationFn: (input: { id: string; pinned: boolean }) => togglePin({ data: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ams"] }),
  });

  const bulkAssign = useMutation({
    mutationFn: async (officerId: string) => {
      const previous = all
        .filter((row) => selected.includes(row.id))
        .map((row) => ({ id: row.id, officerId: row.assigned_officer_id ?? null }));
      for (const id of selected) await assign({ data: { id, officerId } });
      return previous;
    },
    onSuccess: (previous) => {
      toast.success(`تم إسناد ${previous.length} طلب`, {
        action: {
          label: "تراجع",
          onClick: async () => {
            for (const item of previous) {
              if (item.officerId) await assign({ data: { id: item.id, officerId: item.officerId } });
            }
            toast.success("تم التراجع عن الإسناد");
            queryClient.invalidateQueries({ queryKey: ["ams"] });
          },
        },
      });
      setSelected([]);
      setBulkOfficer("");
      queryClient.invalidateQueries({ queryKey: ["ams"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const bulkPriorityMutation = useMutation({
    mutationFn: async (level: string) => {
      const previous = all
        .filter((row) => selected.includes(row.id))
        .map((row) => ({ id: row.id, priority: row.priority }));
      for (const id of selected) await priority({ data: { id, priority: level } });
      return previous;
    },
    onSuccess: (previous) => {
      toast.success(`تم تحديث أولوية ${previous.length} طلب`, {
        action: {
          label: "تراجع",
          onClick: async () => {
            for (const item of previous) await priority({ data: { id: item.id, priority: item.priority } });
            toast.success("تمت استعادة الأولويات السابقة");
            queryClient.invalidateQueries({ queryKey: ["ams"] });
          },
        },
      });
      setSelected([]);
      setBulkPriority("");
      queryClient.invalidateQueries({ queryKey: ["ams"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const all = data ?? [];
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const row of all) map[row.status] = (map[row.status] ?? 0) + 1;
    return map;
  }, [all]);

  const rows = useMemo(() => {
    const needle = term.trim().toLowerCase();
    const filtered = all.filter(
      (row) =>
        (!search.status || row.status === search.status) &&
        (!search.stageId || rowStageId(row) === search.stageId) &&
        matchesTerm(row, needle),
    );
    return sortRows(filtered, sort);
  }, [all, term, search.status, search.stageId, sort]);

  // Stage buckets: صغار المنال / كبار المنال (مونتيسوري) / ابتدائي / غير محددة.
  const stageTabs = useMemo(() => {
    const list = (stages ?? []).map((stage) => ({ id: stage.id as string, label: stage.name_ar as string }));
    const statusScoped = all.filter((row) => !search.status || row.status === search.status);
    const counts: Record<string, number> = {};
    for (const row of statusScoped) {
      const key = rowStageId(row) ?? "unassigned";
      counts[key] = (counts[key] ?? 0) + 1;
    }
    const tabs = list.map((stage) => ({ ...stage, count: counts[stage.id] ?? 0 }));
    if (counts.unassigned) tabs.push({ id: "unassigned", label: "غير محددة المرحلة", count: counts.unassigned });
    return tabs;
  }, [stages, all, search.status]);

  const groupedRows = useMemo(() => {
    if (search.stageId) return null;
    const labels = new Map(stageTabs.map((tab) => [tab.id, tab.label]));
    const order = stageTabs.map((tab) => tab.id);
    const buckets = new Map<string, typeof rows>();
    for (const row of rows) {
      const key = rowStageId(row) ?? "unassigned";
      buckets.set(key, [...(buckets.get(key) ?? []), row]);
    }
    return order
      .filter((key) => (buckets.get(key)?.length ?? 0) > 0)
      .map((key) => ({
        id: key,
        label: labels.get(key) ?? "غير محددة المرحلة",
        rows: buckets.get(key)!,
      }));
  }, [rows, stageTabs, search.stageId]);

  const setFilter = (key: keyof QueueSearch, value: string) =>
    navigate({ search: { ...search, [key]: value === ALL ? undefined : value } });

  const activeFilters = [search.officerId, search.payment, search.qurra].filter(Boolean).length;

  const exportCsv = () => {
    const blob = new Blob(["\uFEFF" + toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `applications-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AmsShell
      wide
      title="قائمة الطلبات"
      description={`${rows.length} طلب معروض من إجمالي ${all.length}`}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="rounded-2xl text-xs font-bold"
            onClick={() =>
              setSelected((prev) => (prev.length === rows.length ? [] : rows.map((row) => row.id)))
            }
          >
            <CheckSquare className="size-3.5" />
            {selected.length === rows.length && rows.length > 0 ? "إلغاء تحديد الكل" : "تحديد الكل"}
          </Button>
          <div className="flex items-center rounded-2xl border border-border/60 bg-card p-0.5">
            <button
              type="button"
              onClick={() => setView("table")}
              className={cn(
                "inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-extrabold",
                view === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              <Table2 className="size-3.5" /> جدول
            </button>
            <button
              type="button"
              onClick={() => setView("cards")}
              className={cn(
                "inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-extrabold",
                view === "cards" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              <LayoutGrid className="size-3.5" /> بطاقات
            </button>
          </div>
          {view === "table" ? (
            <Button
              variant="outline"
              className="rounded-2xl text-xs font-bold"
              onClick={() => setCompact((value) => !value)}
            >
              <Rows3 className="size-3.5" /> {compact ? "عرض مريح" : "عرض مكثف"}
            </Button>
          ) : null}
          <Button variant="outline" className="rounded-2xl text-xs font-bold" onClick={exportCsv}>
            <Download className="size-3.5" /> تصدير
          </Button>
          <Button
            variant={activeFilters ? "default" : "outline"}
            className="rounded-2xl text-xs font-bold"
            onClick={() => setShowFilters((value) => !value)}
          >
            <SlidersHorizontal className="size-3.5" /> الفلاتر
            {activeFilters ? (
              <span className="ms-1 rounded-full bg-background/25 px-1.5 text-[10px]">{activeFilters}</span>
            ) : null}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5 rounded-3xl border border-border/60 bg-card p-2">
          {TABS.map((tab) => {
            const active = (search.status ?? undefined) === tab.key;
            const count = tab.key ? (counts[tab.key] ?? 0) : all.length;
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => navigate({ search: { ...search, status: tab.key } })}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-[11px] font-extrabold transition",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent/60",
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[10px]",
                    active ? "bg-background/25" : "bg-muted",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid gap-2.5 rounded-3xl border border-border/60 bg-card p-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="بحث برقم الطلب أو اسم الطالب أو ولي الأمر أو الهوية أو الجوال…"
              className="rounded-2xl pe-9 text-xs"
            />
          </div>
          <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
            <SelectTrigger className="w-full rounded-2xl text-xs lg:w-56">
              <SelectValue placeholder="الترتيب" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SORT_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  ترتيب: {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {showFilters ? (
            <div className="grid gap-2.5 sm:grid-cols-3 lg:col-span-2">
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
              {activeFilters ? (
                <Button
                  variant="ghost"
                  className="justify-self-start rounded-2xl text-xs font-bold text-muted-foreground"
                  onClick={() => navigate({ search: { status: search.status } })}
                >
                  <X className="size-3.5" /> مسح الفلاتر
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        {selected.length > 0 ? (
          <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-3xl border border-primary/30 bg-primary/8 p-3 backdrop-blur">
            <span className="text-xs font-extrabold text-primary">{selected.length} طلب محدد</span>
            <Select value={bulkOfficer} onValueChange={setBulkOfficer}>
              <SelectTrigger className="h-9 w-52 rounded-2xl text-xs">
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
              onClick={() => setConfirm({ kind: "assign", value: bulkOfficer })}
            >
              <Users className="size-3.5" /> إسناد
            </Button>
            <Select value={bulkPriority} onValueChange={setBulkPriority}>
              <SelectTrigger className="h-9 w-44 rounded-2xl text-xs">
                <SelectValue placeholder="تغيير الأولوية…" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              className="rounded-2xl text-xs font-bold"
              disabled={!bulkPriority || bulkPriorityMutation.isPending}
              onClick={() => setConfirm({ kind: "priority", value: bulkPriority })}
            >
              <Flag className="size-3.5" /> تطبيق
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
          <EmptyState
            icon={<Inbox className="size-5" />}
            title="لا توجد طلبات مطابقة"
            description="جرّب تغيير التبويب أو الفلاتر أو كلمة البحث."
          />
        ) : view === "table" ? (
          <QueueTable
            rows={rows}
            selected={selected}
            compact={compact}
            onToggle={(id, checked) =>
              setSelected((prev) => (checked ? [...prev, id] : prev.filter((value) => value !== id)))
            }
            onToggleAll={(checked) => setSelected(checked ? rows.map((row) => row.id) : [])}
            onPin={(row) => pinMutation.mutate({ id: row.id, pinned: !row.pinned })}
          />
        ) : (
          <QueueCards
            rows={rows}
            selected={selected}
            onToggle={(id, checked) =>
              setSelected((prev) => (checked ? [...prev, id] : prev.filter((value) => value !== id)))
            }
            onPin={(row) => pinMutation.mutate({ id: row.id, pinned: !row.pinned })}
          />
        )}
      </div>

      <Dialog open={!!confirm} onOpenChange={(open) => (open ? null : setConfirm(null))}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تأكيد الإجراء الجماعي</DialogTitle>
            <DialogDescription>
              {confirm?.kind === "assign"
                ? `سيتم إسناد ${selected.length} طلب إلى ${
                    (staff ?? []).find((person) => person.id === confirm.value)?.name ?? "المسؤول المحدد"
                  }.`
                : `سيتم تغيير أولوية ${selected.length} طلب إلى «${
                    PRIORITY_LABELS[confirm?.value ?? ""] ?? ""
                  }».`}{" "}
              يمكنك التراجع مباشرة بعد التنفيذ.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" className="rounded-2xl text-xs" onClick={() => setConfirm(null)}>
              إلغاء
            </Button>
            <Button
              className="rounded-2xl text-xs font-bold"
              disabled={bulkAssign.isPending || bulkPriorityMutation.isPending}
              onClick={() => {
                if (!confirm) return;
                if (confirm.kind === "assign") bulkAssign.mutate(confirm.value);
                else bulkPriorityMutation.mutate(confirm.value);
                setConfirm(null);
              }}
            >
              تنفيذ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AmsShell>
  );
}

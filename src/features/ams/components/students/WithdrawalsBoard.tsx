/**
 * Student withdrawals & graduates board.
 *
 * Flow: open a withdrawal file for an active student → settle the financial
 * position → confirm. Confirming removes the student from classrooms,
 * attendance and assessments and issues an official enrolment certificate.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BadgeCheck,
  FileText,
  Loader2,
  Plus,
  RefreshCcw,
  RotateCcw,
  Search,
  Trash2,
  Undo2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { useBrandLogoUrl } from "@/features/site-content/SiteContentProvider";
import { amsStudents } from "@/features/ams/ams.functions";
import {
  amsWithdrawalCancel,
  amsWithdrawalCertificate,
  amsWithdrawalConfirm,
  amsWithdrawalCreate,
  amsWithdrawalDelete,
  amsWithdrawalUpdate,
  amsWithdrawals,
} from "@/features/ams/withdrawals.functions";
import {
  WITHDRAWAL_KINDS,
  WITHDRAWAL_REASONS,
  WITHDRAWAL_STATUS_LABELS,
  WITHDRAWAL_STATUS_STYLES,
  durationLabel,
  formatDate,
  money,
  type WithdrawalKind,
  type WithdrawalStatus,
} from "@/features/ams/withdrawals";
import { printCertificate } from "./WithdrawalCertificate";

type Board = Awaited<ReturnType<typeof amsWithdrawals>>;
type Record_ = Board["records"][number];

const FILTERS = [
  { key: "pending", label: "قيد التسوية" },
  { key: "confirmed", label: "المنسحبون والخريجون" },
  { key: "cancelled", label: "الملغاة" },
  { key: "all", label: "الكل" },
] as const;

type WithdrawalCreateInput = {
  childId: string;
  kind: WithdrawalKind;
  reason: string;
  reasonNote?: string | null;
  destinationSchool?: string | null;
  effectiveDate?: string | null;
  financeNote?: string | null;
  notes?: string | null;
};

type WithdrawalUpdateInput = {
  id: string;
  reason?: string;
  reasonNote?: string | null;
  destinationSchool?: string | null;
  effectiveDate?: string | null;
  financeCleared?: boolean;
  financeNote?: string | null;
  notes?: string | null;
  refreshFinance?: boolean;
};

const field = "h-10 rounded-xl border border-border/60 bg-background px-3 text-sm";

export function WithdrawalsBoard() {
  const logoUrl = useBrandLogoUrl();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const loadBoard = useServerFn(amsWithdrawals);
  const loadStudents = useServerFn(amsStudents);
  const createFn = useServerFn(amsWithdrawalCreate);
  const updateFn = useServerFn(amsWithdrawalUpdate);
  const confirmFn = useServerFn(amsWithdrawalConfirm);
  const cancelFn = useServerFn(amsWithdrawalCancel);
  const deleteFn = useServerFn(amsWithdrawalDelete);
  const certificateFn = useServerFn(amsWithdrawalCertificate);

  const [tab, setTab] = useState<(typeof FILTERS)[number]["key"]>("pending");
  const [search, setSearch] = useState("");
  const [openNew, setOpenNew] = useState(false);
  const [editing, setEditing] = useState<Record_ | null>(null);

  const board = useQuery({ queryKey: ["ams", "withdrawals"], queryFn: () => loadBoard() });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["ams"] });

  const records = useMemo(() => {
    const rows = board.data?.records ?? [];
    const term = search.trim();
    return rows
      .filter((r) => (tab === "all" ? true : r.status === tab))
      .filter((r) =>
        term
          ? [r.child?.name_ar, r.child?.studentNumber, r.child?.national_id, r.destination_school]
              .filter(Boolean)
              .some((v) => String(v).includes(term))
          : true,
      );
  }, [board.data, tab, search]);

  const counts = useMemo(() => {
    const rows = board.data?.records ?? [];
    return {
      pending: rows.filter((r) => r.status === "pending").length,
      confirmed: rows.filter((r) => r.status === "confirmed").length,
      cancelled: rows.filter((r) => r.status === "cancelled").length,
      all: rows.length,
    } as Record<string, number>;
  }, [board.data]);

  const students = useQuery({
    queryKey: ["ams", "students", "for-withdrawal"],
    queryFn: () => loadStudents({ data: {} }),
    enabled: openNew,
  });

  const create = useMutation({
    mutationFn: (input: WithdrawalCreateInput) => createFn({ data: input }),
    onSuccess: () => {
      toast.success("تم تسجيل طلب الانسحاب");
      setOpenNew(false);
      refresh();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "تعذّر تسجيل الطلب"),
  });

  const update = useMutation({
    mutationFn: (input: WithdrawalUpdateInput) => updateFn({ data: input }),
    onSuccess: () => {
      toast.success("تم تحديث الطلب");
      setEditing(null);
      refresh();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "تعذّر التحديث"),
  });

  const confirmWithdrawal = useMutation({
    mutationFn: (input: { id: string; force?: boolean }) => confirmFn({ data: input }),
    onSuccess: (result: { certificateNumber?: string }) => {
      toast.success(`تم تأكيد الانسحاب — رقم الشهادة ${result?.certificateNumber ?? ""}`);
      refresh();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "تعذّر تأكيد الانسحاب"),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => cancelFn({ data: { id } }),
    onSuccess: () => {
      toast.success("تم إرجاع الطالب إلى السجل النشط");
      refresh();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "تعذّر الإلغاء"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("تم حذف السجل");
      refresh();
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "تعذّر الحذف"),
  });

  const certificate = useMutation({
    mutationFn: (id: string) => certificateFn({ data: id }),
    onSuccess: (data) => {
      void printCertificate(data, logoUrl);
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "تعذّر إصدار الشهادة"),
  });

  const askConfirm = async (row: Record_) => {
    const outstanding = Number(row.finance_outstanding ?? 0);
    const risky = outstanding > 0 && !row.finance_cleared;
    const ok = await confirm({
      title: `تأكيد ${WITHDRAWAL_KINDS[row.kind as WithdrawalKind]} ${row.child?.name_ar ?? ""}`,
      description: risky
        ? `يوجد مبلغ متبقٍ ${money(outstanding)}. سيُطلب تسوية المبلغ أو تعليمه كمُسوّى قبل التأكيد.`
        : "سيخرج الطالب من الفصول والحضور والتقييمات، وسيُصدر رقم شهادة رسمي، ويُحرَّر مقعده مباشرة.",
      confirmLabel: "تأكيد الانسحاب",
      tone: "danger",
    });
    if (!ok) return;
    confirmWithdrawal.mutate({ id: row.id });
  };

  const askCancel = async (row: Record_) => {
    const ok = await confirm({
      title: "إلغاء الانسحاب وإرجاع الطالب",
      description: `سيعود ${row.child?.name_ar ?? "الطالب"} إلى السجل النشط وفصله السابق إن كان متاحًا.`,
      confirmLabel: "إرجاع الطالب",
    });
    if (ok) cancel.mutate(row.id);
  };

  const askDelete = async (row: Record_) => {
    const ok = await confirm({
      title: "حذف سجل الانسحاب",
      description: "سيُحذف السجل نهائيًا. لا يمكن حذف سجل مؤكد قبل إلغائه.",
      confirmLabel: "حذف",
      tone: "danger",
    });
    if (ok) remove.mutate(row.id);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute inset-y-0 end-3 my-auto size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو الرقم الأكاديمي أو الهوية…"
            className="h-10 rounded-xl pe-10"
          />
        </div>
        <Button variant="outline" className="rounded-xl" onClick={() => refresh()}>
          <RefreshCcw className="size-4" /> تحديث
        </Button>
        <Button className="rounded-xl" onClick={() => setOpenNew(true)}>
          <Plus className="size-4" /> طلب انسحاب جديد
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setTab(f.key)}
            className={cn(
              "rounded-full border px-4 py-2 text-xs font-bold transition",
              tab === f.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/60 bg-card/70 text-muted-foreground hover:border-primary/40",
            )}
          >
            {f.label}
            <span className="ms-2 rounded-full bg-background/25 px-2 py-0.5 text-[10px]">
              {counts[f.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {board.isLoading ? (
        <div className="grid place-items-center rounded-[2rem] border border-border/60 bg-card/70 p-12 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : records.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-border/60 bg-card/60 p-12 text-center">
          <Users className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-bold text-foreground">لا توجد سجلات في هذا التبويب</p>
          <p className="mt-1 text-xs text-muted-foreground">
            ابدأ بتسجيل طلب انسحاب لطالب من السجل النشط، ثم أكّده بعد تسوية المستحقات المالية.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {records.map((row) => {
            const outstanding = Number(row.finance_outstanding ?? 0);
            return (
              <article
                key={row.id}
                className="rounded-[1.75rem] border border-border/60 bg-card/85 p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-black text-foreground">
                      {row.child?.name_ar ?? "طالب محذوف"}
                    </h3>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {row.child?.studentNumber ?? "—"} · {row.academic_year} ·{" "}
                      {WITHDRAWAL_KINDS[row.kind as WithdrawalKind] ?? row.kind}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-[11px] font-bold",
                      WITHDRAWAL_STATUS_STYLES[row.status as WithdrawalStatus] ?? "bg-muted",
                    )}
                  >
                    {WITHDRAWAL_STATUS_LABELS[row.status as WithdrawalStatus] ?? row.status}
                  </span>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-[11px]">
                  <Cell label="السبب">
                    {WITHDRAWAL_REASONS[row.reason as keyof typeof WITHDRAWAL_REASONS] ?? row.reason}
                  </Cell>
                  <Cell label="الجهة المنقول إليها">{row.destination_school || "—"}</Cell>
                  <Cell label="تاريخ الالتحاق">{formatDate(row.enrolled_from)}</Cell>
                  <Cell label="تاريخ النفاذ">{formatDate(row.effective_date)}</Cell>
                  <Cell label="مدة الالتحاق">
                    {durationLabel(row.enrolled_from, row.effective_date)}
                  </Cell>
                  <Cell label="الوضع المالي">
                    <span
                      className={cn(
                        "font-bold",
                        row.finance_cleared || outstanding <= 0 ? "text-primary" : "text-destructive",
                      )}
                    >
                      {row.finance_cleared || outstanding <= 0
                        ? "مُسوّى بالكامل"
                        : `متبقٍ ${money(outstanding)}`}
                    </span>
                  </Cell>
                  {row.certificate_number ? (
                    <Cell label="رقم الشهادة">{row.certificate_number}</Cell>
                  ) : null}
                  <Cell label="ولي الأمر">{row.child?.parentName || "—"}</Cell>
                </dl>

                {row.reason_note || row.finance_note || row.notes ? (
                  <p className="mt-3 rounded-2xl bg-muted/50 p-3 text-[11px] leading-relaxed text-muted-foreground">
                    {[row.reason_note, row.finance_note, row.notes].filter(Boolean).join(" · ")}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  {row.status === "pending" ? (
                    <>
                      <Button size="sm" className="rounded-xl" onClick={() => askConfirm(row)}>
                        <BadgeCheck className="size-4" /> تأكيد الانسحاب
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => setEditing(row)}
                      >
                        تعديل / تسوية مالية
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => update.mutate({ id: row.id, refreshFinance: true })}
                      >
                        <RotateCcw className="size-4" /> تحديث المستحق
                      </Button>
                    </>
                  ) : null}
                  {row.status === "confirmed" ? (
                    <>
                      <Button
                        size="sm"
                        className="rounded-xl"
                        onClick={() => certificate.mutate(row.id)}
                        disabled={certificate.isPending}
                      >
                        <FileText className="size-4" /> طباعة الشهادة
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => askCancel(row)}
                      >
                        <Undo2 className="size-4" /> إرجاع الطالب
                      </Button>
                    </>
                  ) : null}
                  {row.status !== "confirmed" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-xl text-destructive"
                      onClick={() => askDelete(row)}
                    >
                      <Trash2 className="size-4" /> حذف
                    </Button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <NewWithdrawalDialog
        open={openNew}
        onOpenChange={setOpenNew}
        students={students.data?.students ?? []}
        loading={students.isLoading}
        submitting={create.isPending}
        onSubmit={(input) => create.mutate(input)}
      />

      <EditWithdrawalDialog
        record={editing}
        onOpenChange={(open) => !open && setEditing(null)}
        submitting={update.isPending}
        onSubmit={(input) => update.mutate(input)}
      />
    </div>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-background/60 p-3">
      <dt className="text-[10px] font-bold text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-[11.5px] font-semibold text-foreground">{children}</dd>
    </div>
  );
}

type StudentLite = Awaited<ReturnType<typeof amsStudents>>["students"][number];

function NewWithdrawalDialog({
  open,
  onOpenChange,
  students,
  loading,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: StudentLite[];
  loading: boolean;
  submitting: boolean;
  onSubmit: (input: {
    childId: string;
    kind: WithdrawalKind;
    reason: string;
    reasonNote?: string | null;
    destinationSchool?: string | null;
    effectiveDate?: string | null;
    financeNote?: string | null;
    notes?: string | null;
  }) => void;
}) {
  const [childId, setChildId] = useState("");
  const [kind, setKind] = useState<WithdrawalKind>("withdrawal");
  const [reason, setReason] = useState<string>("transfer_school");
  const [reasonNote, setReasonNote] = useState("");
  const [destination, setDestination] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [term, setTerm] = useState("");

  const filtered = useMemo(() => {
    const t = term.trim();
    return (t
      ? students.filter((s) =>
          [s.name_ar, s.studentNumber, s.national_id].filter(Boolean).some((v) => String(v).includes(t)),
        )
      : students
    ).slice(0, 60);
  }, [students, term]);

  const selected = students.find((s) => s.id === childId) ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>طلب انسحاب / تخرّج</DialogTitle>
          <DialogDescription>
            اختر الطالب وسجّل سبب الانسحاب. يُحسب المتبقي المالي تلقائيًا من فواتير الطالب.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-foreground">الطالب</label>
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="ابحث بالاسم أو الرقم الأكاديمي…"
              className="mt-2 h-10 rounded-xl"
            />
            <div className="mt-2 max-h-52 space-y-1 overflow-y-auto rounded-2xl border border-border/60 p-2">
              {loading ? (
                <p className="p-3 text-center text-xs text-muted-foreground">جارٍ التحميل…</p>
              ) : filtered.length === 0 ? (
                <p className="p-3 text-center text-xs text-muted-foreground">لا نتائج</p>
              ) : (
                filtered.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setChildId(s.id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-3 py-2 text-start text-xs transition",
                      childId === s.id ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                    )}
                  >
                    <span className="font-bold">{s.name_ar}</span>
                    <span className="opacity-75">{s.studentNumber ?? s.applicationNumber ?? "—"}</span>
                  </button>
                ))
              )}
            </div>
            {selected ? (
              <p className="mt-2 text-[11px] text-muted-foreground">
                المحدد: {selected.name_ar} · العام {selected.academicYear}
              </p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold text-foreground">نوع الإجراء</label>
              <select
                value={kind}
                onChange={(e) => {
                  const next = e.target.value as WithdrawalKind;
                  setKind(next);
                  if (next === "graduation") setReason("graduation");
                }}
                className={cn(field, "mt-2 w-full")}
              >
                {Object.entries(WITHDRAWAL_KINDS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-foreground">السبب</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={cn(field, "mt-2 w-full")}
              >
                {Object.entries(WITHDRAWAL_REASONS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-foreground">تاريخ النفاذ</label>
              <Input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="mt-2 h-10 rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-foreground">الجهة المنقول إليها</label>
              <Input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="اسم الروضة أو المدرسة"
                className="mt-2 h-10 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-foreground">تفصيل السبب</label>
            <Textarea
              value={reasonNote}
              onChange={(e) => setReasonNote(e.target.value)}
              rows={2}
              className="mt-2 rounded-2xl"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-foreground">ملاحظات داخلية</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-2 rounded-2xl"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            className="rounded-xl"
            disabled={!childId || submitting}
            onClick={() =>
              onSubmit({
                childId,
                kind,
                reason,
                reasonNote: reasonNote.trim() || null,
                destinationSchool: destination.trim() || null,
                effectiveDate: effectiveDate || null,
                notes: notes.trim() || null,
              })
            }
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : null} تسجيل الطلب
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditWithdrawalDialog({
  record,
  onOpenChange,
  submitting,
  onSubmit,
}: {
  record: Record_ | null;
  onOpenChange: (open: boolean) => void;
  submitting: boolean;
  onSubmit: (input: {
    id: string;
    reason?: string;
    reasonNote?: string | null;
    destinationSchool?: string | null;
    effectiveDate?: string | null;
    financeCleared?: boolean;
    financeNote?: string | null;
    notes?: string | null;
  }) => void;
}) {
  const [cleared, setCleared] = useState(false);
  const [financeNote, setFinanceNote] = useState("");
  const [destination, setDestination] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [key, setKey] = useState<string | null>(null);

  if (record && key !== record.id) {
    setKey(record.id);
    setCleared(Boolean(record.finance_cleared));
    setFinanceNote(record.finance_note ?? "");
    setDestination(record.destination_school ?? "");
    setEffectiveDate(record.effective_date ?? "");
  }

  return (
    <Dialog open={Boolean(record)} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>تسوية مالية وتعديل الطلب</DialogTitle>
          <DialogDescription>
            {record?.child?.name_ar ?? ""} — المتبقي المحسوب:{" "}
            {money(Number(record?.finance_outstanding ?? 0))}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <label className="flex items-start gap-3 rounded-2xl border border-border/60 p-3">
            <Checkbox checked={cleared} onCheckedChange={(v) => setCleared(Boolean(v))} />
            <span className="text-xs font-bold text-foreground">
              تمت تسوية جميع المستحقات المالية
              <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
                لا يمكن تأكيد الانسحاب قبل التسوية أو تعليم هذا الخيار.
              </span>
            </span>
          </label>

          <div>
            <label className="text-xs font-bold text-foreground">ملاحظة التسوية المالية</label>
            <Textarea
              value={financeNote}
              onChange={(e) => setFinanceNote(e.target.value)}
              rows={2}
              className="mt-2 rounded-2xl"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold text-foreground">تاريخ النفاذ</label>
              <Input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="mt-2 h-10 rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-foreground">الجهة المنقول إليها</label>
              <Input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="mt-2 h-10 rounded-xl"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            className="rounded-xl"
            disabled={!record || submitting}
            onClick={() =>
              record &&
              onSubmit({
                id: record.id,
                financeCleared: cleared,
                financeNote: financeNote.trim() || null,
                destinationSchool: destination.trim() || null,
                effectiveDate: effectiveDate || null,
              })
            }
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : null} حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

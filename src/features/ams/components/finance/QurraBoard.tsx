/**
 * Qurra initiative follow-up: an Excel-like grid of covered students (rows) and
 * school-year months (columns). Every month holds three cells — the amount
 * transferred by Qurra, the amount due, and a confirmation tick.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, FileSpreadsheet, FileText, HandCoins, Loader2, Wand2, Wallet } from "lucide-react";
import { toast } from "sonner";

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
import { exportExcel, exportPdf, type Column, type Row } from "@/features/ams/reports-export";
import { money } from "@/features/finance/pricing";
import { QURRA_MONTHS, type QurraCell } from "@/features/finance/qurra";
import {
  qurraBoardGet,
  qurraCellSave,
  qurraMonthPrefill,
} from "@/features/finance/qurra.functions";
import { cn } from "@/lib/utils";

const KEY = ["ams", "finance", "qurra"];

export function QurraBoard({ canManage }: { canManage: boolean }) {
  const queryClient = useQueryClient();
  const loadBoard = useServerFn(qurraBoardGet);
  const saveCell = useServerFn(qurraCellSave);
  const prefill = useServerFn(qurraMonthPrefill);

  const [year, setYear] = useState<string | null>(null);
  const [prefillMonth, setPrefillMonth] = useState<number>(QURRA_MONTHS[0]!.month);

  const board = useQuery({
    queryKey: [...KEY, year],
    queryFn: () => loadBoard({ data: { academicYear: year } }),
  });

  const data = board.data;
  const rows = data?.rows ?? [];
  const academicYear = data?.academicYear ?? "";

  const refresh = () => queryClient.invalidateQueries({ queryKey: KEY });

  const save = useMutation({
    mutationFn: (input: {
      childId: string;
      month: number;
      dueAmount?: number;
      transferredAmount?: number;
      confirmed?: boolean;
    }) => saveCell({ data: { ...input, academicYear } }),
    onSuccess: () => refresh(),
    onError: (e: Error) => toast.error(e.message),
  });

  const prefillMutation = useMutation({
    mutationFn: () => prefill({ data: { academicYear, month: prefillMonth } }),
    onSuccess: (res) => {
      toast.success(`تم تعبئة المبلغ المستحق لـ ${res.updated} طالبًا`);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const exportColumns: Column[] = useMemo(
    () => [
      { key: "name", label: "الطالب" },
      { key: "academic_number", label: "الرقم الأكاديمي" },
      { key: "classroom", label: "الفصل" },
      ...QURRA_MONTHS.flatMap((m) => [
        { key: `t_${m.month}`, label: `${m.label} — محوّل` },
        { key: `d_${m.month}`, label: `${m.label} — مستحق` },
        { key: `c_${m.month}`, label: `${m.label} — سُدد` },
      ]),
      { key: "total_transferred", label: "إجمالي المحوّل" },
      { key: "total_due", label: "إجمالي المستحق" },
      { key: "total_confirmed", label: "إجمالي المسدد" },
    ],
    [],
  );

  const exportRows: Row[] = useMemo(
    () =>
      rows.map((r) => {
        const row: Row = {
          name: r.name,
          academic_number: r.academicNumber ?? "—",
          classroom: r.classroomName ?? "—",
          total_transferred: r.totalTransferred,
          total_due: r.totalDue,
          total_confirmed: r.totalConfirmed,
        };
        for (const m of QURRA_MONTHS) {
          const cell: QurraCell | undefined = r.cells[m.month];
          row[`t_${m.month}`] = cell?.transferredAmount ?? 0;
          row[`d_${m.month}`] = cell?.dueAmount ?? 0;
          row[`c_${m.month}`] = cell?.confirmed ? "نعم" : "لا";
        }
        return row;
      }),
    [rows],
  );

  if (board.isLoading) {
    return (
      <div className="grid place-items-center rounded-3xl border border-border/60 bg-card p-16">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (board.isError) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-border/70 bg-card p-10 text-center">
        <p className="text-sm font-black text-foreground">{(board.error as Error).message}</p>
      </div>
    );
  }

  const totals = data?.totals ?? { due: 0, transferred: 0, confirmed: 0, students: 0, remaining: 0 };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={HandCoins} label="طلاب مشمولون بدعم قرة" value={String(totals.students)} />
        <StatCard icon={Wallet} label="إجمالي المحوّل من قرة" value={money(totals.transferred)} />
        <StatCard icon={FileText} label="إجمالي المستحق" value={money(totals.due)} />
        <StatCard
          icon={BadgeCheck}
          label="المتبقي على قرة"
          value={money(totals.remaining)}
          tone={totals.remaining > 0 ? "warn" : "ok"}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-[1.75rem] border border-border/60 bg-card/90 p-4">
        <span className="text-xs font-black text-foreground">العام الدراسي</span>
        <Select value={academicYear} onValueChange={(v) => setYear(v)}>
          <SelectTrigger className="h-10 w-56 rounded-xl text-xs font-bold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(data?.academicYears ?? []).map((y) => (
              <SelectItem key={y} value={y} className="text-xs font-bold">
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {canManage ? (
          <>
            <span className="ms-2 text-xs font-black text-foreground">تعبئة المستحق لشهر</span>
            <Select value={String(prefillMonth)} onValueChange={(v) => setPrefillMonth(Number(v))}>
              <SelectTrigger className="h-10 w-36 rounded-xl text-xs font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QURRA_MONTHS.map((m) => (
                  <SelectItem key={m.month} value={String(m.month)} className="text-xs font-bold">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="secondary"
              className="rounded-xl text-xs font-black"
              disabled={prefillMutation.isPending}
              onClick={() => prefillMutation.mutate()}
            >
              {prefillMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Wand2 className="size-4" />
              )}
              تعبئة تلقائية
            </Button>
          </>
        ) : null}

        <div className="ms-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl text-xs font-black"
            onClick={() =>
              exportExcel(
                `qurra-${academicYear}`,
                `متابعة سداد مبادرة قرة — ${academicYear}`,
                exportColumns,
                exportRows,
              )
            }
          >
            <FileSpreadsheet className="size-4" /> إكسل
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl text-xs font-black"
            onClick={() =>
              exportPdf(
                "متابعة سداد مبادرة قرة",
                exportColumns,
                exportRows,
                `العام الدراسي ${academicYear}`,
              )
            }
          >
            <FileText className="size-4" /> PDF
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-border/70 bg-card p-10 text-center">
          <p className="text-sm font-black text-foreground">
            لا يوجد طلاب مشمولون بدعم قرة في هذا العام الدراسي.
          </p>
        </div>
      ) : (
        <div className="overflow-auto rounded-[1.75rem] border border-border/60 bg-card shadow-sm">
          <table className="w-max min-w-full border-collapse text-right text-xs">
            <thead>
              <tr className="bg-primary/10">
                <th className="sticky right-0 z-20 min-w-56 border border-border/50 bg-primary/10 p-3 text-xs font-black text-foreground">
                  الطالب
                </th>
                {QURRA_MONTHS.map((m) => (
                  <th
                    key={m.month}
                    colSpan={3}
                    className="border border-border/50 p-2 text-center text-xs font-black text-foreground"
                  >
                    {m.label}
                  </th>
                ))}
                <th colSpan={3} className="border border-border/50 bg-secondary/20 p-2 text-center font-black">
                  الإجماليات
                </th>
              </tr>
              <tr className="bg-muted/50 text-[0.65rem] font-black text-muted-foreground">
                <th className="sticky right-0 z-20 border border-border/50 bg-muted/70 p-2">
                  الفصل / الرقم الأكاديمي
                </th>
                {QURRA_MONTHS.map((m) => (
                  <>
                    <th key={`t${m.month}`} className="min-w-24 border border-border/50 p-2">
                      محوّل من قرة
                    </th>
                    <th key={`d${m.month}`} className="min-w-24 border border-border/50 p-2">
                      المستحق
                    </th>
                    <th key={`c${m.month}`} className="min-w-16 border border-border/50 p-2">
                      سُدد
                    </th>
                  </>
                ))}
                <th className="min-w-24 border border-border/50 bg-secondary/10 p-2">المحوّل</th>
                <th className="min-w-24 border border-border/50 bg-secondary/10 p-2">المستحق</th>
                <th className="min-w-24 border border-border/50 bg-secondary/10 p-2">المسدد</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.childId} className="hover:bg-muted/30">
                  <td className="sticky right-0 z-10 border border-border/50 bg-card p-3">
                    <p className="text-xs font-black text-foreground">{r.name}</p>
                    <p className="text-[0.65rem] font-bold text-muted-foreground">
                      {r.classroomName ?? "بدون فصل"} · {r.academicNumber ?? "—"}
                    </p>
                  </td>
                  {QURRA_MONTHS.map((m) => {
                    const cell = r.cells[m.month] ?? {
                      month: m.month,
                      dueAmount: 0,
                      transferredAmount: 0,
                      confirmed: false,
                      confirmedAt: null,
                      note: null,
                    };
                    return (
                      <>
                        <td key={`t${m.month}`} className="border border-border/50 p-1">
                          <AmountCell
                            value={cell.transferredAmount}
                            disabled={!canManage}
                            onCommit={(v) =>
                              save.mutate({ childId: r.childId, month: m.month, transferredAmount: v })
                            }
                          />
                        </td>
                        <td key={`d${m.month}`} className="border border-border/50 p-1">
                          <AmountCell
                            value={cell.dueAmount}
                            disabled={!canManage}
                            onCommit={(v) => save.mutate({ childId: r.childId, month: m.month, dueAmount: v })}
                          />
                        </td>
                        <td
                          key={`c${m.month}`}
                          className={cn(
                            "border border-border/50 p-2 text-center",
                            cell.confirmed && "bg-emerald-500/10",
                          )}
                        >
                          <Checkbox
                            checked={cell.confirmed}
                            disabled={!canManage}
                            onCheckedChange={(v) =>
                              save.mutate({ childId: r.childId, month: m.month, confirmed: v === true })
                            }
                          />
                        </td>
                      </>
                    );
                  })}
                  <td className="border border-border/50 bg-secondary/5 p-2 font-black text-foreground">
                    {money(r.totalTransferred)}
                  </td>
                  <td className="border border-border/50 bg-secondary/5 p-2 font-black text-foreground">
                    {money(r.totalDue)}
                  </td>
                  <td className="border border-border/50 bg-secondary/5 p-2 font-black text-emerald-700">
                    {money(r.totalConfirmed)}
                  </td>
                </tr>
              ))}
              <tr className="bg-primary/10 font-black">
                <td className="sticky right-0 z-10 border border-border/50 bg-primary/10 p-3">الإجمالي</td>
                {QURRA_MONTHS.map((m) => {
                  const t = rows.reduce((s, r) => s + (r.cells[m.month]?.transferredAmount ?? 0), 0);
                  const d = rows.reduce((s, r) => s + (r.cells[m.month]?.dueAmount ?? 0), 0);
                  const c = rows.filter((r) => r.cells[m.month]?.confirmed).length;
                  return (
                    <>
                      <td key={`tt${m.month}`} className="border border-border/50 p-2">
                        {money(t)}
                      </td>
                      <td key={`td${m.month}`} className="border border-border/50 p-2">
                        {money(d)}
                      </td>
                      <td key={`tc${m.month}`} className="border border-border/50 p-2 text-center">
                        {c}
                      </td>
                    </>
                  );
                })}
                <td className="border border-border/50 p-2">{money(totals.transferred)}</td>
                <td className="border border-border/50 p-2">{money(totals.due)}</td>
                <td className="border border-border/50 p-2">{money(totals.confirmed)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AmountCell({
  value,
  disabled,
  onCommit,
}: {
  value: number;
  disabled: boolean;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value ? String(value) : "");

  return (
    <Input
      value={shown}
      disabled={disabled}
      inputMode="decimal"
      className={cn(
        "h-9 w-24 rounded-lg border-transparent bg-transparent px-2 text-center text-xs font-bold",
        value > 0 && "text-foreground",
      )}
      placeholder="0"
      onChange={(e) => setDraft(e.target.value.replace(/[^\d.]/g, ""))}
      onBlur={() => {
        if (draft === null) return;
        const next = Number(draft) || 0;
        setDraft(null);
        if (next !== value) onCommit(next);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  tone?: "default" | "ok" | "warn";
}) {
  return (
    <div className="rounded-[1.5rem] border border-border/60 bg-card/90 p-4 shadow-sm">
      <span
        className={cn(
          "grid size-10 place-items-center rounded-xl bg-primary/10 text-primary",
          tone === "ok" && "bg-emerald-500/10 text-emerald-600",
          tone === "warn" && "bg-amber-500/10 text-amber-600",
        )}
      >
        <Icon className="size-5" />
      </span>
      <p className="mt-3 text-[0.7rem] font-bold text-muted-foreground">{label}</p>
      <p className="text-base font-black text-foreground">{value}</p>
    </div>
  );
}

import type { ReactNode } from "react";
import { CalendarClock, CheckCircle2, Clock3, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import { INSTALLMENT_STATUS_LABELS, dateAr, isOverdue, money } from "../pricing";

export type InstallmentRow = {
  id: string;
  invoice_id: string;
  seq: number;
  amount: number;
  paid_amount: number;
  due_date: string;
  status: string;
  note: string | null;
};

export function ScheduleList({
  rows,
  lateAfterDays = 0,
  actions,
  emptyLabel = "لا توجد دفعات مجدولة بعد.",
}: {
  rows: InstallmentRow[];
  lateAfterDays?: number;
  actions?: (row: InstallmentRow, overdue: boolean) => ReactNode;
  emptyLabel?: string;
}) {
  if (!rows.length) {
    return (
      <p className="rounded-2xl border-2 border-dashed border-border/70 p-6 text-center text-xs font-bold text-muted-foreground">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ul className="space-y-2.5">
      {rows
        .slice()
        .sort((a, b) => a.seq - b.seq)
        .map((row) => {
          const overdue = isOverdue(row, lateAfterDays);
          return (
            <li
              key={row.id}
              className={cn(
                "flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4",
                row.status === "paid"
                  ? "border-mint/60 bg-mint/20"
                  : overdue
                    ? "border-destructive/40 bg-destructive/5"
                    : "border-border/60 bg-card",
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-2xl text-xs font-black",
                    row.status === "paid"
                      ? "bg-mint text-mint-foreground"
                      : overdue
                        ? "bg-destructive/15 text-destructive"
                        : "bg-muted text-foreground",
                  )}
                >
                  {row.seq}
                </span>
                <div>
                  <p className="text-sm font-black text-foreground">{money(row.amount)}</p>
                  <p className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                    <CalendarClock className="size-3.5" />
                    الاستحقاق {dateAr(row.due_date)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black",
                    row.status === "paid"
                      ? "bg-mint text-mint-foreground"
                      : row.status === "pending_review"
                        ? "bg-gold text-gold-foreground"
                        : overdue
                          ? "bg-destructive/15 text-destructive"
                          : "bg-muted text-muted-foreground",
                  )}
                >
                  {row.status === "paid" ? (
                    <CheckCircle2 className="size-3.5" />
                  ) : overdue ? (
                    <TriangleAlert className="size-3.5" />
                  ) : (
                    <Clock3 className="size-3.5" />
                  )}
                  {overdue && row.status === "due"
                    ? "متأخرة عن السداد"
                    : INSTALLMENT_STATUS_LABELS[row.status] ?? row.status}
                </span>
                {actions?.(row, overdue)}
              </div>
            </li>
          );
        })}
    </ul>
  );
}
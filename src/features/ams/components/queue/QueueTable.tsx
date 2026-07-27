import { Link } from "@tanstack/react-router";
import { Pin, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { QURRA_STATUS_LABELS } from "@/features/admissions/eligibility";
import { PAYMENT_STATUS_LABELS, SEAT_STATUS_LABELS } from "../../roles";
import { studentNames } from "../../queue-view";
import type { QueueRow } from "../../types";
import { PriorityPill, StatusPill, formatDateTime } from "../atoms";
import { Avatar, DocsMeter, SlaChip } from "./QueueBits";

export function QueueTable({
  rows,
  selected,
  onToggle,
  onToggleAll,
  onPin,
  compact,
}: {
  rows: QueueRow[];
  selected: string[];
  onToggle: (id: string, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
  onPin: (row: QueueRow) => void;
  compact?: boolean;
}) {
  const allChecked = rows.length > 0 && rows.every((row) => selected.includes(row.id));
  const pad = compact ? "px-3 py-2" : "px-3 py-3.5";

  return (
    <div className="overflow-x-auto rounded-3xl border border-border/60 bg-card shadow-sm">
      <table className="w-full min-w-[1180px] text-start text-xs">
        <thead className="sticky top-0 z-10 bg-muted/60 text-[11px] font-extrabold text-muted-foreground backdrop-blur">
          <tr>
            <th className={cn(pad, "w-16")}>
              <input
                type="checkbox"
                aria-label="تحديد الكل"
                checked={allChecked}
                onChange={(event) => onToggleAll(event.target.checked)}
                className="size-3.5 accent-[var(--color-primary)]"
              />
            </th>
            <th className={cn(pad, "text-start")}>الطلب / ولي الأمر</th>
            <th className={cn(pad, "text-start")}>الطلاب</th>
            <th className={cn(pad, "text-start")}>الحالة</th>
            <th className={cn(pad, "text-start")}>الأولوية</th>
            <th className={cn(pad, "text-start")}>المستندات</th>
            <th className={cn(pad, "text-start")}>قرة</th>
            <th className={cn(pad, "text-start")}>المقعد</th>
            <th className={cn(pad, "text-start")}>السداد</th>
            <th className={cn(pad, "text-start")}>المسؤول</th>
            <th className={cn(pad, "text-start")}>الانتظار</th>
            <th className={cn(pad, "text-start")}>آخر تحديث</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const checked = selected.includes(row.id);
            return (
              <tr
                key={row.id}
                className={cn(
                  "border-t border-border/50 transition-colors",
                  checked ? "bg-primary/5" : "hover:bg-accent/40",
                )}
              >
                <td className={pad}>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      aria-label="تحديد الطلب"
                      checked={checked}
                      onChange={(event) => onToggle(row.id, event.target.checked)}
                      className="size-3.5 accent-[var(--color-primary)]"
                    />
                    <button type="button" onClick={() => onPin(row)} aria-label="تثبيت">
                      <Pin
                        className={cn("size-3.5", row.pinned ? "fill-primary text-primary" : "text-muted-foreground")}
                      />
                    </button>
                  </div>
                </td>
                <td className={pad}>
                  <div className="flex items-center gap-2.5">
                    {compact ? null : <Avatar name={row.parentName} />}
                    <div className="min-w-0">
                      <Link
                        to="/ams/applications/$applicationId"
                        params={{ applicationId: row.id }}
                        className="block truncate font-extrabold text-foreground hover:text-primary"
                      >
                        {row.application_number ?? "بدون رقم"}
                      </Link>
                      <span className="block truncate text-[10px] font-bold text-muted-foreground">
                        {row.parentName}
                        {row.parentPhone ? (
                          <span dir="ltr" className="ms-1">
                            · {row.parentPhone}
                          </span>
                        ) : null}
                      </span>
                    </div>
                  </div>
                </td>
                <td className={cn(pad, "max-w-56")}>
                  <span className="block truncate font-bold text-foreground">
                    {studentNames(row).join("، ") || "—"}
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {row.children.length} طالب
                  </span>
                </td>
                <td className={pad}>
                  <StatusPill status={row.status} />
                </td>
                <td className={pad}>
                  <PriorityPill priority={row.priority} />
                </td>
                <td className={pad}>
                  <DocsMeter row={row} />
                </td>
                <td className={cn(pad, "font-bold text-muted-foreground")}>
                  {QURRA_STATUS_LABELS[row.qurraStatus] ?? row.qurraStatus}
                </td>
                <td className={cn(pad, "font-bold text-muted-foreground")}>
                  {SEAT_STATUS_LABELS[row.seat_status] ?? row.seat_status}
                </td>
                <td className={cn(pad, "font-bold text-muted-foreground")}>
                  {PAYMENT_STATUS_LABELS[row.payment_status] ?? row.payment_status}
                </td>
                <td className={cn(pad, "font-bold")}>
                  {row.officerName ? (
                    <span className="text-foreground">{row.officerName}</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-destructive">
                      <Star className="size-3" /> غير مُسند
                    </span>
                  )}
                </td>
                <td className={pad}>
                  <SlaChip row={row} />
                </td>
                <td className={cn(pad, "text-[10px] font-bold text-muted-foreground")}>
                  {formatDateTime(row.updated_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Baby, Pin, UserCog, Wallet } from "lucide-react";

import { cn } from "@/lib/utils";
import { QURRA_STATUS_LABELS } from "@/features/admissions/eligibility";
import { PAYMENT_STATUS_LABELS, SEAT_STATUS_LABELS } from "../../roles";
import { studentNames } from "../../queue-view";
import type { QueueRow } from "../../types";
import { PriorityPill, StatusPill, formatDateTime } from "../atoms";
import { Avatar, DocsMeter, SlaChip } from "./QueueBits";
import { useRowKeyboardNav } from "./useRowKeyboardNav";

export function QueueCards({
  rows,
  selected,
  onToggle,
  onPin,
}: {
  rows: QueueRow[];
  selected: string[];
  onToggle: (id: string, checked: boolean) => void;
  onPin: (row: QueueRow) => void;
}) {
  const { containerRef, rowProps } = useRowKeyboardNav({ rows, selected, onToggle, columns: 2 });
  return (
    <div
      ref={containerRef as React.RefObject<HTMLDivElement>}
      className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3"
    >
      {rows.map((row, index) => {
        const checked = selected.includes(row.id);
        return (
          <motion.article
            key={row.id}
            {...rowProps(index)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: Math.min(index * 0.02, 0.2) }}
            className={cn(
              "flex flex-col gap-3 rounded-3xl border bg-card p-4 shadow-sm transition outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              checked ? "border-primary/60 ring-2 ring-primary/20" : "border-border/60 hover:shadow-card",
            )}
          >
            <header className="flex items-start gap-2.5">
              <input
                type="checkbox"
                aria-label="تحديد الطلب"
                checked={checked}
                onChange={(event) => onToggle(row.id, event.target.checked)}
                className="mt-1 size-3.5 accent-[var(--color-primary)]"
              />
              <Avatar name={row.parentName} />
              <div className="min-w-0 flex-1">
                <Link
                  to="/ams/applications/$applicationId"
                  params={{ applicationId: row.id }}
                  className="block truncate text-sm font-black text-foreground hover:text-primary"
                >
                  {row.application_number ?? "بدون رقم"}
                </Link>
                <span className="block truncate text-[11px] font-bold text-muted-foreground">
                  {row.parentName}
                  {row.parentPhone ? (
                    <span dir="ltr" className="ms-1">
                      · {row.parentPhone}
                    </span>
                  ) : null}
                </span>
              </div>
              <button type="button" onClick={() => onPin(row)} aria-label="تثبيت">
                <Pin className={cn("size-4", row.pinned ? "fill-primary text-primary" : "text-muted-foreground")} />
              </button>
            </header>

            <div className="flex flex-wrap items-center gap-1.5">
              <StatusPill status={row.status} />
              <PriorityPill priority={row.priority} />
              <SlaChip row={row} />
            </div>

            <p className="flex items-start gap-1.5 rounded-2xl bg-muted/40 px-3 py-2 text-[11px] font-bold text-foreground">
              <Baby className="mt-0.5 size-3.5 shrink-0 text-primary" />
              <span className="line-clamp-2">{studentNames(row).join("، ") || "لا يوجد طلاب مسجّلون"}</span>
            </p>

            <DocsMeter row={row} className="min-w-0" />

            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] font-bold">
              <Meta label="المقعد" value={SEAT_STATUS_LABELS[row.seat_status] ?? row.seat_status} />
              <Meta label="قرة" value={QURRA_STATUS_LABELS[row.qurraStatus] ?? row.qurraStatus} />
              <Meta
                label="السداد"
                value={PAYMENT_STATUS_LABELS[row.payment_status] ?? row.payment_status}
                icon={<Wallet className="size-3" />}
              />
              <Meta
                label="المسؤول"
                value={row.officerName ?? "غير مُسند"}
                icon={<UserCog className="size-3" />}
                danger={!row.officerName}
              />
            </dl>

            <footer className="flex items-center justify-between border-t border-border/50 pt-2.5 text-[10px] font-bold text-muted-foreground">
              <span>آخر تحديث: {formatDateTime(row.updated_at)}</span>
              <Link
                to="/ams/applications/$applicationId"
                params={{ applicationId: row.id }}
                className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-extrabold text-primary"
              >
                فتح الملف
              </Link>
            </footer>
          </motion.article>
        );
      })}
    </div>
  );
}

function Meta({
  label,
  value,
  icon,
  danger,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "flex items-center gap-1 truncate",
          danger ? "text-destructive" : "text-foreground",
        )}
      >
        {icon}
        {value}
      </dd>
    </div>
  );
}
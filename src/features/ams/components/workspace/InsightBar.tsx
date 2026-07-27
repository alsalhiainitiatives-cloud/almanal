import { motion } from "motion/react";

import { cn } from "@/lib/utils";
import { DOC_STATUS_LABELS, PAYMENT_STATUS_LABELS, PRIORITY_LABELS, SEAT_STATUS_LABELS } from "../../roles";
import { QURRA_STATUS_LABELS } from "@/features/admissions/eligibility";
import { insightsFor } from "../../recommendations";
import type { WorkspaceData } from "../../types";
import { STATUS_LABELS } from "../atoms";

const TONES = {
  green: "border-mint bg-mint/40",
  yellow: "border-gold/50 bg-gold/15",
  red: "border-destructive/30 bg-destructive/8",
  neutral: "border-border/60 bg-card",
} as const;

function humanize(value: string) {
  return (
    STATUS_LABELS[value] ??
    QURRA_STATUS_LABELS[value] ??
    SEAT_STATUS_LABELS[value] ??
    PAYMENT_STATUS_LABELS[value] ??
    PRIORITY_LABELS[value] ??
    DOC_STATUS_LABELS[value] ??
    value
  );
}

export function InsightBar({ data }: { data: WorkspaceData }) {
  const insights = insightsFor(data);
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
      {insights.map((insight, index) => (
        <motion.div
          key={insight.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.03 }}
          className={cn("rounded-2xl border px-3.5 py-3 shadow-sm", TONES[insight.tone])}
        >
          <p className="text-[11px] font-bold text-muted-foreground">{insight.label}</p>
          <p className="mt-1 truncate text-sm font-extrabold text-foreground">{humanize(insight.value)}</p>
        </motion.div>
      ))}
    </div>
  );
}
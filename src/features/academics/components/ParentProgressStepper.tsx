/**
 * Parent-facing translation of the teacher's evaluation triangle.
 *
 * Teachers keep the triangle + colour-coded lines. Parents instead see a
 * friendly 3-step progress bar plus a plain-Arabic label, and helper text that
 * translates the saved colour code into the month it was recorded in.
 */
import { cn } from "@/lib/utils";

import type { TriangleLevel, TriangleScale } from "../assessments";
import { MONTH_NAMES_AR, type MonthColor } from "../settings";

const PARENT_LABELS: Record<TriangleScale, Record<TriangleLevel, string>> = {
  performance: {
    0: "لم يُرصد بعد",
    1: "بدأ تعلم الدرس",
    2: "يتدرب عليه",
    3: "أتقن",
  },
  growth: {
    0: "لم يُرصد بعد",
    1: "يحتاج إلى تذكير",
    2: "أحياناً",
    3: "يستطيع دائماً",
  },
};

const STEP_TONE: Record<1 | 2 | 3, string> = {
  1: "bg-amber-400",
  2: "bg-sky-500",
  3: "bg-emerald-500",
};

const BADGE_TONE: Record<TriangleLevel, string> = {
  0: "bg-muted text-muted-foreground",
  1: "bg-amber-100 text-amber-800",
  2: "bg-sky-100 text-sky-800",
  3: "bg-emerald-100 text-emerald-800",
};

function monthNameOfHex(hex: string, monthColors: MonthColor[]): string | null {
  const found = monthColors.find((m) => m.hex.toLowerCase() === hex.toLowerCase());
  if (!found) return null;
  return MONTH_NAMES_AR[found.month - 1] ?? null;
}

export function ParentProgressStepper({
  scale,
  level,
  colors,
  monthColors,
}: {
  scale: TriangleScale;
  level: TriangleLevel;
  colors: string[];
  monthColors: MonthColor[];
}) {
  const label = PARENT_LABELS[scale][level];
  const reachedMonth = level > 0 ? monthNameOfHex(colors[level - 1] ?? "", monthColors) : null;
  const firstMonth = level > 0 ? monthNameOfHex(colors[0] ?? "", monthColors) : null;

  const helper =
    level === 0
      ? null
      : level === 1 && firstMonth
        ? `تم الرصد في شهر ${firstMonth}`
        : reachedMonth
          ? `وصل لهذا المستوى في شهر ${reachedMonth}`
          : firstMonth
            ? `تم الرصد في شهر ${firstMonth}`
            : null;

  return (
    <div className="min-w-[130px] space-y-1.5">
      <div className="flex items-center gap-1" role="img" aria-label={label}>
        {[1, 2, 3].map((step) => (
          <span
            key={step}
            className={cn(
              "h-2 flex-1 rounded-full transition-colors",
              step <= level ? STEP_TONE[level as 1 | 2 | 3] : "bg-muted",
            )}
          />
        ))}
      </div>
      <span
        className={cn(
          "inline-block rounded-lg px-2 py-0.5 text-[11px] font-black",
          BADGE_TONE[level],
        )}
      >
        {label}
      </span>
      {helper ? (
        <p className="text-[10px] font-bold text-muted-foreground">{helper}</p>
      ) : null}
    </div>
  );
}

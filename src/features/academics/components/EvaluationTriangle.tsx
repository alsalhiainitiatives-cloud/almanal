/**
 * Clickable SVG triangle used for both the performance and growth scales.
 *
 *  level 1 → base line only
 *  level 2 → base + left line
 *  level 3 → full triangle
 *
 * Clicking cycles 0 → 1 → 2 → 3 → 0. Each line keeps its own colour so the
 * teacher can mark the month the child reached that step.
 */
import { cn } from "@/lib/utils";
import {
  DEFAULT_LINE_COLOR,
  TRIANGLE_LABELS,
  monthLabelOfColor,
  type TriangleLevel,
  type TriangleScale,
} from "../assessments";

type Props = {
  scale: TriangleScale;
  level: TriangleLevel;
  colors: string[];
  size?: number;
  readOnly?: boolean;
  onCycle?: (next: TriangleLevel) => void;
};

const APEX = { x: 24, y: 5 };
const LEFT = { x: 4, y: 41 };
const RIGHT = { x: 44, y: 41 };

export function EvaluationTriangle({
  scale,
  level,
  colors,
  size = 48,
  readOnly = false,
  onCycle,
}: Props) {
  const lineColor = (index: number) => colors[index] ?? DEFAULT_LINE_COLOR;
  const next = (((level + 1) % 4) as TriangleLevel);
  // Tooltip: the state plus the month each achieved line was coloured with.
  const months = Array.from({ length: level }, (_, i) => monthLabelOfColor(lineColor(i)))
    .filter((m): m is string => Boolean(m))
    .map((m) => m.split(" — ")[0]);
  const uniqueMonths = [...new Set(months)];
  const label = uniqueMonths.length
    ? `${TRIANGLE_LABELS[scale][level]} — ${uniqueMonths.join(" ثم ")}`
    : TRIANGLE_LABELS[scale][level];


  return (
    <button
      type="button"
      disabled={readOnly}
      onClick={() => onCycle?.(next)}
      title={label}
      aria-label={label}
      className={cn(
        "grid place-items-center rounded-xl border border-border/50 bg-background/70 p-0.5 transition",
        readOnly ? "cursor-default" : "hover:border-primary/50 hover:bg-primary/5",
      )}
    >
      <svg width={size} height={size} viewBox="0 0 48 46" role="img" aria-hidden="true">
        {/* Ghost outline so the empty state still reads as a triangle */}
        <polygon
          points={`${APEX.x},${APEX.y} ${LEFT.x},${LEFT.y} ${RIGHT.x},${RIGHT.y}`}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.14}
          strokeDasharray="3 3"
          strokeWidth={1.5}
        />
        {/* Line 1 — base */}
        {level >= 1 && (
          <line
            x1={LEFT.x}
            y1={LEFT.y}
            x2={RIGHT.x}
            y2={RIGHT.y}
            stroke={lineColor(0)}
            strokeWidth={4}
            strokeLinecap="round"
          />
        )}
        {/* Line 2 — left side */}
        {level >= 2 && (
          <line
            x1={LEFT.x}
            y1={LEFT.y}
            x2={APEX.x}
            y2={APEX.y}
            stroke={lineColor(1)}
            strokeWidth={4}
            strokeLinecap="round"
          />
        )}
        {/* Line 3 — right side (completes the triangle) */}
        {level >= 3 && (
          <line
            x1={APEX.x}
            y1={APEX.y}
            x2={RIGHT.x}
            y2={RIGHT.y}
            stroke={lineColor(2)}
            strokeWidth={4}
            strokeLinecap="round"
          />
        )}
      </svg>
    </button>
  );
}

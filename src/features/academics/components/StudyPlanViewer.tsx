/**
 * Parent view of published study plans — one tab per enrolled child, split into
 * current / upcoming / past plans.
 */
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import {
  TIMEFRAME_LABELS,
  timeframeOf,
  type PlanTimeframe,
} from "../plans";
import { plansParentBoard } from "../plans.functions";
import { StudyPlanGrid } from "./StudyPlanGrid";

const TIMEFRAMES: PlanTimeframe[] = ["current", "future", "past"];

export function StudyPlanViewer() {
  const loadBoard = useServerFn(plansParentBoard);
  const [childId, setChildId] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<PlanTimeframe>("current");

  const board = useQuery({ queryKey: ["parent-study-plans"], queryFn: () => loadBoard({}) });

  const children = board.data?.children ?? [];

  useEffect(() => {
    if (!childId && children.length) setChildId(children[0]!.childId);
  }, [childId, children]);

  const activeChild = children.find((c) => c.childId === childId) ?? children[0] ?? null;

  const plans = useMemo(() => {
    if (!activeChild) return [];
    return (board.data?.plans ?? []).filter(
      (plan) => plan.classroomId === activeChild.classroomId && timeframeOf(plan) === timeframe,
    );
  }, [board.data?.plans, activeChild, timeframe]);

  if (board.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (!children.length) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        لا يوجد أبناء مسجّلون في فصول حتى الآن، لذلك لا تتوفر خطط دراسية.
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {children.length > 1 ? (
        <Card className="flex flex-wrap gap-2 p-3">
          {children.map((child) => (
            <button
              key={child.childId}
              type="button"
              onClick={() => setChildId(child.childId)}
              className={cn(
                "rounded-2xl border px-4 py-2 text-start text-xs font-black transition",
                child.childId === activeChild?.childId
                  ? "border-primary/50 bg-primary/10 text-foreground"
                  : "border-border/60 hover:bg-muted/60",
              )}
            >
              <span className="block">{child.childName}</span>
              <span className="block text-[11px] font-bold text-muted-foreground">
                {child.classroomName ?? "الفصل"}
                {child.stageName ? ` · ${child.stageName}` : ""}
              </span>
            </button>
          ))}
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {TIMEFRAMES.map((tf) => (
          <Button
            key={tf}
            size="sm"
            variant={tf === timeframe ? "default" : "outline"}
            onClick={() => setTimeframe(tf)}
          >
            {TIMEFRAME_LABELS[tf]}
          </Button>
        ))}
      </div>

      {plans.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          لا توجد خطط في هذا التصنيف حاليًا — ستظهر هنا بمجرد نشر المعلمة للخطة.
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {plans.map((plan) => (
            <StudyPlanGrid key={plan.id} plan={plan} />
          ))}
        </div>
      )}
    </div>
  );
}

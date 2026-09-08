/**
 * "دليل التقييم" — a fixed helper button that explains the parent-facing
 * progress-stepper states and the month colour key, so parents never have to
 * memorise the scale.
 */
import { BookOpen } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MONTH_COLORS,
  SCALE_LABELS,
  type TriangleLevel,
  type TriangleScale,
} from "../assessments";
import { ParentProgressStepper } from "./ParentProgressStepper";

const LEVELS: TriangleLevel[] = [0, 1, 2, 3];
const SCALES: TriangleScale[] = ["performance", "growth"];

export function EvaluationGuide() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 start-6 z-40 gap-2 rounded-full px-5 py-6 text-xs font-black shadow-xl"
      >
        <BookOpen className="size-4" />
        دليل التقييم
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-h-[85vh] max-w-2xl overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-black">دليل التقييم</DialogTitle>
            <DialogDescription className="text-xs font-bold">
              يعرض النظام تقدم طفلك في كل درس بشريط تقدم واضح: كل مستوى يمثل مرحلة جديدة من الإتقان أو النمو.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {SCALES.map((scale) => (
              <section key={scale} className="space-y-3">
                <h4 className="text-sm font-black text-foreground">{SCALE_LABELS[scale]}</h4>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {LEVELS.map((level) => (
                    <div
                      key={level}
                      className="flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-background/60 p-4 text-center"
                    >
                      <ParentProgressStepper
                        scale={scale}
                        level={level}
                        colors={[]}
                        monthColors={[]}
                      />
                    </div>
                  ))}
                </div>
              </section>
            ))}

            <section className="space-y-2">
              <h4 className="text-sm font-black text-foreground">ألوان الأشهر</h4>
              <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {MONTH_COLORS.map((month) => (
                  <li key={month.month} className="flex items-center gap-2">
                    <span
                      className="size-4 rounded border border-border/60"
                      style={{ backgroundColor: month.hex }}
                    />
                    <span className="text-[11px] font-bold text-foreground">
                      {month.nameAr} — {month.label}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Academic Tracking settings (school administration only).
 *  - "Colours of months" mapping used by the evaluation triangles
 *  - Class Chat toggles: globally, and per classroom
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Palette, RotateCcw, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  DEFAULT_MONTH_COLORS,
  MONTH_NAMES_AR,
  type AcademicsSettings,
  type MonthColor,
} from "../settings";
import { canManageStorage } from "../maintenance";
import {
  academicsSaveMonthColors,
  academicsSetChatClassroom,
  academicsSetChatGlobal,
  academicsSettingsBoard,
} from "../settings.functions";
import { StorageMaintenancePanel } from "./StorageMaintenancePanel";
import { useAuth } from "@/features/auth/AuthProvider";


export function AcademicsSettingsPanel() {
  const queryClient = useQueryClient();
  const fetchBoard = useServerFn(academicsSettingsBoard);
  const saveColors = useServerFn(academicsSaveMonthColors);
  const setGlobal = useServerFn(academicsSetChatGlobal);
  const setClassroom = useServerFn(academicsSetChatClassroom);

  const { data, isLoading } = useQuery({
    queryKey: ["academics-settings"],
    queryFn: () => fetchBoard() as Promise<AcademicsSettings>,
  });

  const [colors, setColors] = useState<MonthColor[]>(DEFAULT_MONTH_COLORS);
  useEffect(() => {
    if (data?.monthColors) setColors(data.monthColors);
  }, [data?.monthColors]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["academics-settings"] });
    void queryClient.invalidateQueries({ queryKey: ["academic-report"] });
  };

  const colorsMutation = useMutation({
    mutationFn: (monthColors: MonthColor[]) => saveColors({ data: { monthColors } }),
    onSuccess: () => {
      toast.success("تم حفظ ألوان الأشهر");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذّر الحفظ"),
  });

  const globalMutation = useMutation({
    mutationFn: (enabled: boolean) => setGlobal({ data: { enabled } }),
    onSuccess: (_r, enabled) => {
      toast.success(enabled ? "تم تشغيل محادثة الفصول" : "تم إيقاف محادثة الفصول");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذّر التحديث"),
  });

  const classroomMutation = useMutation({
    mutationFn: (input: { classroomId: string; enabled: boolean }) => setClassroom({ data: input }),
    onSuccess: () => {
      toast.success("تم تحديث محادثة الفصل");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذّر التحديث"),
  });

  if (isLoading || !data) {
    return (
      <div className="grid place-items-center rounded-3xl border border-border/60 bg-card p-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!data.canManage) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-border/70 bg-card p-10 text-center">
        <p className="text-sm font-black text-foreground">الإعدادات متاحة لإدارة النظام فقط.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-3xl border border-border/60 bg-card p-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-black text-foreground">
              <Palette className="h-4 w-4 text-primary" />
              ألوان الأشهر
            </h3>
            <p className="text-xs font-bold text-muted-foreground">
              اللون الذي تُلوَّن به أضلاع المثلث حسب شهر تحقّق الإتقان — يمكن تعديله دون تغيير الكود.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="font-black"
              onClick={() => setColors(DEFAULT_MONTH_COLORS)}
            >
              <RotateCcw className="me-2 h-4 w-4" />
              استعادة الافتراضي
            </Button>
            <Button
              type="button"
              size="sm"
              className="font-black"
              disabled={colorsMutation.isPending}
              onClick={() => colorsMutation.mutate(colors)}
            >
              {colorsMutation.isPending ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="me-2 h-4 w-4" />
              )}
              حفظ الألوان
            </Button>
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {colors.map((entry, index) => (
            <div
              key={entry.month}
              className="flex items-center gap-2 rounded-2xl border border-border/60 bg-background/60 p-3"
            >
              <span className="w-16 text-xs font-black text-foreground">
                {MONTH_NAMES_AR[entry.month - 1]}
              </span>
              <input
                type="color"
                aria-label={`لون ${MONTH_NAMES_AR[entry.month - 1]}`}
                value={entry.hex}
                onChange={(e) =>
                  setColors((prev) =>
                    prev.map((c, i) => (i === index ? { ...c, hex: e.target.value } : c)),
                  )
                }
                className="h-9 w-10 cursor-pointer rounded-lg border border-border/60 bg-transparent p-0.5"
              />
              <Input
                value={entry.label}
                maxLength={40}
                onChange={(e) =>
                  setColors((prev) =>
                    prev.map((c, i) => (i === index ? { ...c, label: e.target.value } : c)),
                  )
                }
                className="h-9 text-xs font-bold"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-border/60 bg-card p-5">
        <header>
          <h3 className="text-sm font-black text-foreground">محادثة الفصل</h3>
          <p className="text-xs font-bold text-muted-foreground">
            تحكّم عام في تشغيل المحادثة، مع إمكانية إيقافها لفصل معيّن.
          </p>
        </header>

        <div className="flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <div>
            <p className="text-sm font-black text-foreground">تشغيل المحادثة على مستوى المنصة</p>
            <p className="text-xs font-bold text-muted-foreground">
              عند الإيقاف تُخفى غرف المحادثة عن المعلمات وأولياء الأمور.
            </p>
          </div>
          <Switch
            checked={data.chatEnabledGlobally}
            disabled={globalMutation.isPending}
            onCheckedChange={(v) => globalMutation.mutate(v)}
          />
        </div>

        <div className="grid gap-2">
          {data.classrooms.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/60 p-3"
            >
              <div>
                <p className="text-sm font-black text-foreground">{c.nameAr}</p>
                <p className="text-[11px] font-bold text-muted-foreground">{c.stageNameAr}</p>
              </div>
              <Switch
                checked={c.chatEnabled && data.chatEnabledGlobally}
                disabled={!data.chatEnabledGlobally || classroomMutation.isPending}
                onCheckedChange={(v) => classroomMutation.mutate({ classroomId: c.id, enabled: v })}
              />
            </div>
          ))}
          {!data.classrooms.length && (
            <p className="py-4 text-center text-xs font-bold text-muted-foreground">
              لا توجد فصول مفعّلة.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

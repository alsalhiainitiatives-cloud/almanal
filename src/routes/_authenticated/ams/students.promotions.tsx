import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUpRight, BellRing, CalendarClock, Loader2, Plus, Settings2, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatAge } from "@/features/admissions/eligibility";
import {
  amsPromotionApply,
  amsPromotionApplyBulk,
  amsPromotionDismiss,
  amsPromotionRuleDelete,
  amsPromotionRuleSave,
  amsPromotions,
  amsPromotionsNotify,
} from "@/features/ams/ams.functions";
import { AmsShell } from "@/features/ams/components/AmsShell";
import { EmptyState, SkeletonRows } from "@/features/ams/components/atoms";
import { useAuth } from "@/features/auth/AuthProvider";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/ams/students/promotions")({
  head: () => ({
    meta: [
      { title: "نقل الطلاب بين المراحل — مدارس وروضة المنال" },
      {
        name: "description",
        content: "متابعة الطلاب الذين بلغوا سن الانتقال لمرحلة أعلى مع التحكم الكامل في أعمار النقل.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PromotionsPage,
});

const KEY = ["ams", "promotions"];

function PromotionsPage() {
  const { roles } = useAuth();
  const canManage = (roles as string[]).some((r) =>
    ["admin", "principal", "registration_officer"].includes(r),
  );

  const load = useServerFn(amsPromotions);
  const apply = useServerFn(amsPromotionApply);
  const applyBulk = useServerFn(amsPromotionApplyBulk);
  const dismiss = useServerFn(amsPromotionDismiss);
  const saveRule = useServerFn(amsPromotionRuleSave);
  const deleteRule = useServerFn(amsPromotionRuleDelete);
  const notifyDue = useServerFn(amsPromotionsNotify);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({ queryKey: KEY, queryFn: () => load() });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: KEY });

  const [target, setTarget] = useState<{ childId: string; toStageId: string; name: string } | null>(null);
  const [classroomId, setClassroomId] = useState<string>("");
  const [selected, setSelected] = useState<Record<string, string[]>>({});

  const stageName = (id: string | null) =>
    (data?.stages ?? []).find((s) => s.id === id)?.name_ar ?? "غير محدد";

  const applyMutation = useMutation({
    mutationFn: (input: { childId: string; toStageId: string; classroomId: string | null }) =>
      apply({ data: input }),
    onSuccess: () => {
      toast.success("تم نقل الطالب إلى المرحلة الجديدة");
      setTarget(null);
      setClassroomId("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dismissMutation = useMutation({
    mutationFn: (input: { childId: string; toStageId: string }) => dismiss({ data: input }),
    onSuccess: () => {
      toast.success("تم تجاهل التنبيه لهذا الطالب");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ready = useMemo(() => (data?.candidates ?? []).filter((c) => c.ready), [data?.candidates]);
  const upcoming = useMemo(() => (data?.candidates ?? []).filter((c) => !c.ready), [data?.candidates]);

  /* Group transfer: only children due for the same target stage can move together. */
  const readyGroups = useMemo(() => {
    const map = new Map<string, typeof ready>();
    for (const row of ready) {
      map.set(row.toStageId, [...(map.get(row.toStageId) ?? []), row]);
    }
    return [...map.entries()];
  }, [ready]);

  const bulkMutation = useMutation({
    mutationFn: (input: { childIds: string[]; toStageId: string }) => applyBulk({ data: input }),
    onSuccess: (res, vars) => {
      setSelected((s) => ({ ...s, [vars.toStageId]: [] }));
      if (res.failed.length) toast.warning(`تم نقل ${res.moved} طالبًا وتعذّر نقل ${res.failed.length}`);
      else toast.success(`تم نقل ${res.moved} طالبًا إلى المرحلة الجديدة`);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const toggle = (stageId: string, childId: string) =>
    setSelected((s) => {
      const current = s[stageId] ?? [];
      return {
        ...s,
        [stageId]: current.includes(childId) ? current.filter((c) => c !== childId) : [...current, childId],
      };
    });

  const classroomsFor = (stageId: string) =>
    (data?.classrooms ?? []).filter((c) => c.stage_id === stageId && c.is_active !== false);

  return (
    <AmsShell
      title="نقل الطلاب بين المراحل"
      description="يتابع النظام عمر كل طالب ويُنبّه تلقائيًا عند بلوغه سن الانتقال إلى المرحلة الأعلى"
      wide
      actions={
        canManage ? (
          <Button
            variant="outline"
            className="rounded-2xl text-xs font-bold"
            onClick={async () => {
              const res = await notifyDue();
              toast.success(res.sent ? `تم إشعار الإدارة بـ ${res.sent} طالبًا` : "لا يوجد طلاب مستحقين للنقل");
            }}
          >
            <BellRing className="size-3.5" /> إشعار الإدارة
          </Button>
        ) : null
      }
    >
      {error ? (
        <EmptyState title="تعذّر التحميل" description={(error as Error).message} />
      ) : isLoading || !data ? (
        <SkeletonRows rows={6} />
      ) : (
        <Tabs defaultValue="due" dir="rtl" className="space-y-5">
          <TabsList className="rounded-2xl">
            <TabsTrigger value="due" className="rounded-xl text-xs font-bold">
              <ArrowUpRight className="ms-1 size-4" /> جاهزون للنقل ({ready.length})
            </TabsTrigger>
            <TabsTrigger value="soon" className="rounded-xl text-xs font-bold">
              <CalendarClock className="ms-1 size-4" /> يقتربون ({upcoming.length})
            </TabsTrigger>
            {canManage ? (
              <TabsTrigger value="rules" className="rounded-xl text-xs font-bold">
                <Settings2 className="ms-1 size-4" /> أعمار النقل
              </TabsTrigger>
            ) : null}
          </TabsList>

          <TabsContent value="due" className="m-0 space-y-3">
            {ready.length === 0 ? (
              <EmptyState
                title="لا يوجد طلاب بلغوا سن الانتقال"
                description="سيظهر الطلاب هنا تلقائيًا عند بلوغهم العمر المحدد في أعمار النقل."
              />
            ) : (
              readyGroups.map(([stageId, rows]) => {
                const picked = selected[stageId] ?? [];
                const allPicked = picked.length === rows.length && rows.length > 0;
                return (
                  <section key={stageId} className="space-y-2 rounded-3xl border border-border/60 bg-muted/20 p-3">
                    <header className="flex flex-wrap items-center justify-between gap-2">
                      <label className="flex items-center gap-2 text-xs font-extrabold text-foreground">
                        <input
                          type="checkbox"
                          checked={allPicked}
                          onChange={() =>
                            setSelected((s) => ({ ...s, [stageId]: allPicked ? [] : rows.map((r) => r.childId) }))
                          }
                          className="size-3.5 accent-[var(--color-primary)]"
                          disabled={!canManage}
                        />
                        النقل إلى {stageName(stageId)} ({rows.length})
                      </label>
                      {canManage ? (
                        <Button
                          size="sm"
                          className="rounded-2xl text-[11px] font-extrabold"
                          disabled={!picked.length || bulkMutation.isPending}
                          onClick={() => bulkMutation.mutate({ childIds: picked, toStageId: stageId })}
                        >
                          {bulkMutation.isPending ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <ArrowUpRight className="size-3.5" />
                          )}
                          نقل المحددين ({picked.length})
                        </Button>
                      ) : null}
                    </header>
                    {rows.map((row) => (
                <article
                  key={`${row.childId}-${row.toStageId}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border/60 bg-card p-4 shadow-sm"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <input
                      type="checkbox"
                      aria-label="تحديد الطالب للنقل الجماعي"
                      checked={picked.includes(row.childId)}
                      onChange={() => toggle(stageId, row.childId)}
                      disabled={!canManage}
                      className="size-3.5 accent-[var(--color-primary)]"
                    />
                    <div className="min-w-0">
                    <p className="text-sm font-black text-foreground">{row.name_ar}</p>
                    <p className="mt-1 text-xs font-bold text-muted-foreground">
                      العمر الحالي {formatAge(row.ageMonths)} · {stageName(row.fromStageId)}{" "}
                      <ArrowUpRight className="inline size-3.5" /> {stageName(row.toStageId)}
                      {row.studentNumber ? ` · الرقم الأكاديمي ${row.studentNumber}` : ""}
                    </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black text-amber-900">
                      مستحق للنقل
                    </span>
                    {canManage ? (
                      <>
                        <Button
                          size="sm"
                          className="rounded-xl"
                          onClick={() => {
                            setTarget({ childId: row.childId, toStageId: row.toStageId, name: row.name_ar });
                            setClassroomId("");
                          }}
                        >
                          نقل الطالب
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-xl text-xs font-bold text-muted-foreground"
                          onClick={() =>
                            dismissMutation.mutate({ childId: row.childId, toStageId: row.toStageId })
                          }
                        >
                          <X className="size-3.5" /> تجاهل
                        </Button>
                      </>
                    ) : null}
                  </div>
                </article>
                    ))}
                  </section>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="soon" className="m-0 space-y-3">
            {upcoming.length === 0 ? (
              <EmptyState title="لا يوجد طلاب يقتربون من سن الانتقال" />
            ) : (
              upcoming.map((row) => (
                <article
                  key={`${row.childId}-${row.toStageId}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border/60 bg-card p-4"
                >
                  <div>
                    <p className="text-sm font-black text-foreground">{row.name_ar}</p>
                    <p className="mt-1 text-xs font-bold text-muted-foreground">
                      العمر {formatAge(row.ageMonths)} · متوقع الانتقال إلى {stageName(row.toStageId)}
                    </p>
                  </div>
                  <span className="rounded-full bg-mint/50 px-2.5 py-1 text-[11px] font-black text-foreground">
                    بعد {Math.max(1, row.monthsToGo)} شهرًا تقريبًا
                  </span>
                </article>
              ))
            )}
          </TabsContent>

          {canManage ? (
            <TabsContent value="rules" className="m-0">
              <RulesEditor
                rules={data.rules}
                stages={data.stages}
                onSave={async (input) => {
                  await saveRule({ data: input });
                  toast.success("تم حفظ قاعدة النقل");
                  invalidate();
                }}
                onDelete={async (id) => {
                  await deleteRule({ data: { id } });
                  toast.success("تم حذف القاعدة");
                  invalidate();
                }}
              />
            </TabsContent>
          ) : null}
        </Tabs>
      )}

      {target ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" dir="rtl">
          <div className="w-full max-w-md space-y-4 rounded-3xl border border-border/60 bg-card p-6 shadow-xl">
            <div>
              <p className="text-sm font-black text-foreground">نقل {target.name}</p>
              <p className="mt-1 text-xs font-bold text-muted-foreground">
                إلى مرحلة {stageName(target.toStageId)} — اختر الفصل الجديد (اختياري).
              </p>
            </div>
            <select
              value={classroomId}
              onChange={(e) => setClassroomId(e.target.value)}
              className="h-11 w-full rounded-2xl border border-border/60 bg-background px-3 text-sm font-bold"
            >
              <option value="">بدون فصل (يُحدد لاحقًا)</option>
              {classroomsFor(target.toStageId).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_ar} — متاح {Math.max(0, c.capacity - c.taken_seats)} مقعد
                </option>
              ))}
            </select>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" className="rounded-2xl text-xs font-bold" onClick={() => setTarget(null)}>
                إلغاء
              </Button>
              <Button
                className="rounded-2xl"
                disabled={applyMutation.isPending}
                onClick={() =>
                  applyMutation.mutate({
                    childId: target.childId,
                    toStageId: target.toStageId,
                    classroomId: classroomId || null,
                  })
                }
              >
                {applyMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "تأكيد النقل"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </AmsShell>
  );
}

type Rule = {
  id: string;
  from_stage_id: string | null;
  to_stage_id: string;
  min_age_months: number;
  notice_months: number;
  is_active: boolean;
};

function RulesEditor({
  rules,
  stages,
  onSave,
  onDelete,
}: {
  rules: Rule[];
  stages: { id: string; name_ar: string }[];
  onSave: (input: {
    id?: string | null;
    from_stage_id: string | null;
    to_stage_id: string;
    min_age_months: number;
    notice_months: number;
    is_active: boolean;
  }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState<{
    from_stage_id: string;
    to_stage_id: string;
    min_age_months: number;
    notice_months: number;
  }>({ from_stage_id: "", to_stage_id: stages[0]?.id ?? "", min_age_months: 42, notice_months: 2 });

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border/60 bg-card p-5">
        <p className="text-sm font-black text-foreground">أعمار النقل بين المراحل</p>
        <p className="mt-1 text-xs font-bold text-muted-foreground">
          حدّد العمر (بالأشهر) الذي ينتقل عنده الطالب من مرحلة إلى أخرى، ومدة التنبيه المبكر قبل بلوغه هذا العمر.
        </p>

        <div className="mt-4 space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={cn(
                "flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 p-3",
                !rule.is_active && "opacity-60",
              )}
            >
              <span className="min-w-[180px] text-xs font-black text-foreground">
                {stages.find((s) => s.id === rule.from_stage_id)?.name_ar ?? "أي مرحلة"} →{" "}
                {stages.find((s) => s.id === rule.to_stage_id)?.name_ar ?? "—"}
              </span>
              <label className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
                العمر (شهر)
                <Input
                  type="number"
                  defaultValue={rule.min_age_months}
                  className="h-9 w-20 rounded-xl text-center"
                  onBlur={(e) =>
                    onSave({
                      id: rule.id,
                      from_stage_id: rule.from_stage_id,
                      to_stage_id: rule.to_stage_id,
                      min_age_months: Number(e.target.value),
                      notice_months: rule.notice_months,
                      is_active: rule.is_active,
                    })
                  }
                />
              </label>
              <label className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
                تنبيه قبل (شهر)
                <Input
                  type="number"
                  defaultValue={rule.notice_months}
                  className="h-9 w-20 rounded-xl text-center"
                  onBlur={(e) =>
                    onSave({
                      id: rule.id,
                      from_stage_id: rule.from_stage_id,
                      to_stage_id: rule.to_stage_id,
                      min_age_months: rule.min_age_months,
                      notice_months: Number(e.target.value),
                      is_active: rule.is_active,
                    })
                  }
                />
              </label>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-xl text-[11px] font-bold"
                onClick={() =>
                  onSave({
                    id: rule.id,
                    from_stage_id: rule.from_stage_id,
                    to_stage_id: rule.to_stage_id,
                    min_age_months: rule.min_age_months,
                    notice_months: rule.notice_months,
                    is_active: !rule.is_active,
                  })
                }
              >
                {rule.is_active ? "تعطيل" : "تنشيط"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-xl text-destructive"
                onClick={() => onDelete(rule.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
          {rules.length === 0 ? (
            <p className="text-xs font-bold text-muted-foreground">لا توجد قواعد بعد — أضف قاعدة جديدة أدناه.</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-3xl border border-border/60 bg-card p-5">
        <label className="text-[11px] font-bold text-muted-foreground">
          من مرحلة
          <select
            value={draft.from_stage_id}
            onChange={(e) => setDraft({ ...draft, from_stage_id: e.target.value })}
            className="mt-1 block h-10 w-40 rounded-xl border border-border/60 bg-background px-2 text-xs font-bold"
          >
            <option value="">أي مرحلة</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name_ar}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[11px] font-bold text-muted-foreground">
          إلى مرحلة
          <select
            value={draft.to_stage_id}
            onChange={(e) => setDraft({ ...draft, to_stage_id: e.target.value })}
            className="mt-1 block h-10 w-40 rounded-xl border border-border/60 bg-background px-2 text-xs font-bold"
          >
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name_ar}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[11px] font-bold text-muted-foreground">
          العمر (شهر)
          <Input
            type="number"
            value={draft.min_age_months}
            onChange={(e) => setDraft({ ...draft, min_age_months: Number(e.target.value) })}
            className="mt-1 h-10 w-24 rounded-xl text-center"
          />
        </label>
        <label className="text-[11px] font-bold text-muted-foreground">
          تنبيه قبل (شهر)
          <Input
            type="number"
            value={draft.notice_months}
            onChange={(e) => setDraft({ ...draft, notice_months: Number(e.target.value) })}
            className="mt-1 h-10 w-24 rounded-xl text-center"
          />
        </label>
        <Button
          className="rounded-2xl"
          disabled={!draft.to_stage_id}
          onClick={() =>
            onSave({
              from_stage_id: draft.from_stage_id || null,
              to_stage_id: draft.to_stage_id,
              min_age_months: draft.min_age_months,
              notice_months: draft.notice_months,
              is_active: true,
            })
          }
        >
          <Plus className="size-4" /> إضافة قاعدة
        </Button>
      </div>
    </div>
  );
}

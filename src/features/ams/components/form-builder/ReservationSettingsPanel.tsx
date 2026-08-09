import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Save, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { purgeOldSeatReservations } from "@/features/admissions/reservation.functions";
import {
  siteContentGet,
  siteContentSave,
} from "@/features/site-content/site-content.functions";
import { DEFAULT_SITE_CONTENT, type SiteContent } from "@/features/site-content/defaults";

type ReservationSettings = SiteContent["admissions"]["reservation"];
type PurgeStatus = "pending_review" | "approved" | "rejected" | "withdrawn";

const PURGE_STATUS_LABELS: Record<PurgeStatus, string> = {
  pending_review: "بانتظار المراجعة",
  approved: "المقبولة (بدون طلب تسجيل)",
  rejected: "المرفوضة",
  withdrawn: "المسحوبة",
};

/** إعدادات خطوة التسجيل المبدئية (الخطوة صفر) + أداة حذف الطلبات القديمة. */
export function ReservationSettingsPanel() {
  const queryClient = useQueryClient();
  const fetchContent = useServerFn(siteContentGet);
  const saveContent = useServerFn(siteContentSave);
  const purge = useServerFn(purgeOldSeatReservations);

  const { data, isLoading } = useQuery({
    queryKey: ["site-content"],
    queryFn: () => fetchContent(),
  });

  const [draft, setDraft] = useState<SiteContent | null>(null);
  useEffect(() => {
    if (data) setDraft(data as SiteContent);
  }, [data]);

  const [purgeDays, setPurgeDays] = useState("90");
  const [purgeStatuses, setPurgeStatuses] = useState<PurgeStatus[]>(["rejected", "withdrawn"]);

  const save = useMutation({
    mutationFn: (content: SiteContent) => saveContent({ data: { content } }),
    onSuccess: () => {
      toast.success("تم حفظ إعدادات التسجيل المبدئي");
      queryClient.invalidateQueries({ queryKey: ["site-content"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "تعذر حفظ الإعدادات"),
  });

  const runPurge = useMutation({
    mutationFn: () =>
      purge({ data: { days: Math.max(1, Number(purgeDays) || 1), statuses: purgeStatuses } }),
    onSuccess: (result) => {
      toast.success(
        `تم حذف ${result.deleted} طلب قديم${result.skipped ? ` — تم تجاهل ${result.skipped} طلب مرتبط بطلب تسجيل` : ""}`,
      );
      queryClient.invalidateQueries({ queryKey: ["ams", "reservations"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "تعذر حذف الطلبات القديمة"),
  });

  if (isLoading || !draft) {
    return (
      <div className="grid place-items-center rounded-[1.75rem] border border-border/60 bg-card/80 py-16">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  const settings: ReservationSettings = {
    ...DEFAULT_SITE_CONTENT.admissions.reservation,
    ...(draft.admissions?.reservation ?? {}),
  };

  const patch = (next: Partial<ReservationSettings>) =>
    setDraft({
      ...draft,
      admissions: { ...draft.admissions, reservation: { ...settings, ...next } },
    });

  return (
    <div className="space-y-4">
      <section className="rounded-[1.75rem] border border-border/60 bg-card/80 p-5">
        <h3 className="text-sm font-black text-foreground">خطوة التسجيل المبدئية (الخطوة التمهيدية)</h3>
        <p className="mt-1 text-xs font-bold text-muted-foreground">
          تتحكم هذه الإعدادات في نموذج الحجز المبدئي الذي يملؤه ولي الأمر قبل التسجيل النهائي.
        </p>

        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-muted/40 px-4 py-3">
            <div>
              <p className="text-xs font-black text-foreground">فتح استقبال طلبات الحجز المبدئية</p>
              <p className="text-[11px] font-bold text-muted-foreground">
                عند الإغلاق تظهر رسالة مخصصة لولي الأمر ولا يُقبل أي طلب جديد.
              </p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(v) => patch({ enabled: v })}
            />
          </div>

          {!settings.enabled ? (
            <div>
              <p className="mb-1.5 text-[11px] font-black text-muted-foreground">رسالة الإغلاق</p>
              <Textarea
                rows={2}
                value={settings.closedMessage}
                onChange={(e) => patch({ closedMessage: e.target.value })}
              />
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="mb-1.5 text-[11px] font-black text-muted-foreground">
                الحد الأقصى لعدد الأطفال في الطلب
              </p>
              <Select
                value={String(settings.maxChildren)}
                onValueChange={(v) => patch({ maxChildren: Number(v) })}
              >
                <SelectTrigger className="h-10 rounded-2xl text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} طفل
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-black text-muted-foreground">
                عدد رغبات الفصول المطلوبة
              </p>
              <Select
                value={String(settings.requiredPreferences)}
                onValueChange={(v) => patch({ requiredPreferences: Number(v) })}
              >
                <SelectTrigger className="h-10 rounded-2xl text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} رغبة
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-black text-muted-foreground">
                مدة الاحتفاظ الافتراضية (يوم)
              </p>
              <Input
                type="number"
                min={1}
                value={settings.retentionDays}
                onChange={(e) => patch({ retentionDays: Math.max(1, Number(e.target.value) || 1) })}
                className="h-10 rounded-2xl text-xs font-bold"
                dir="ltr"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-muted/40 px-4 py-3">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-black text-foreground">
                <Wand2 className="size-3.5 text-primary" />
                القبول التلقائي عند توفّر مقعد
              </p>
              <p className="text-[11px] font-bold text-muted-foreground">
                يُقبل الطلب فورًا فقط إذا حصل كل طفل على مقعد مطابق للرغبة والفئة العمرية، وإلا يبقى
                للمراجعة اليدوية.
              </p>
            </div>
            <Switch
              checked={settings.autoApprove}
              onCheckedChange={(v) => patch({ autoApprove: v })}
            />
          </div>

          <Button
            variant="hero"
            className="rounded-2xl text-xs font-bold"
            disabled={save.isPending}
            onClick={() => save.mutate(draft)}
          >
            {save.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            حفظ الإعدادات
          </Button>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-destructive/30 bg-destructive/5 p-5">
        <h3 className="text-sm font-black text-destructive">حذف طلبات الحجز القديمة</h3>
        <p className="mt-1 text-xs font-bold text-muted-foreground">
          يحذف طلبات الحجز المبدئية الأقدم من المدة المحددة. الطلبات المرتبطة بطلب تسجيل يتم تجاهلها
          تلقائيًا حفاظًا على سجلات الطلاب.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-[11px] font-black text-muted-foreground">أقدم من (يوم)</p>
            <Input
              type="number"
              min={1}
              value={purgeDays}
              onChange={(e) => setPurgeDays(e.target.value)}
              className="h-10 rounded-2xl text-xs font-bold"
              dir="ltr"
            />
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-black text-muted-foreground">الحالات المشمولة</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(PURGE_STATUS_LABELS) as PurgeStatus[]).map((status) => {
                const on = purgeStatuses.includes(status);
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() =>
                      setPurgeStatuses((prev) =>
                        prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
                      )
                    }
                    className={
                      on
                        ? "rounded-full bg-primary px-3 py-1.5 text-[10px] font-black text-primary-foreground"
                        : "rounded-full bg-muted px-3 py-1.5 text-[10px] font-black text-muted-foreground"
                    }
                  >
                    {PURGE_STATUS_LABELS[status]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="mt-4 rounded-2xl text-xs font-bold text-destructive"
              disabled={runPurge.isPending || !purgeStatuses.length}
            >
              {runPurge.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
              تنفيذ الحذف
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent dir="rtl" className="text-right">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive">
                حذف الطلبات الأقدم من {purgeDays} يوم؟
              </AlertDialogTitle>
              <AlertDialogDescription className="leading-relaxed">
                سيتم حذف الطلبات في الحالات:{" "}
                {purgeStatuses.map((s) => PURGE_STATUS_LABELS[s]).join(" · ")} وتحرير مقاعدها. لا
                يمكن التراجع.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:flex-row-reverse sm:justify-start">
              <AlertDialogAction
                onClick={() => runPurge.mutate()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                نعم، احذف
              </AlertDialogAction>
              <AlertDialogCancel>تراجع</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  );
}

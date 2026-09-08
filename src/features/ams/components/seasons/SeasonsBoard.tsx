import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  DatabaseBackup,
  DoorClosed,
  DoorOpen,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  amsSeasonDelete,
  amsSeasonSave,
  amsSeasonStatus,
  amsSeasons,
} from "../../seasons.functions";
import { EmptyState, SkeletonRows } from "../atoms";

type SeasonView = Awaited<ReturnType<typeof amsSeasons>>["seasons"][number];

const KIND_LABELS: Record<string, string> = {
  regular: "تسجيل عام دراسي",
  supplementary: "تسجيل إلحاقي استثنائي",
};

const STATUS_STYLES: Record<string, string> = {
  open: "bg-mint/70 text-foreground",
  closed: "bg-muted text-muted-foreground",
  draft: "bg-gold/70 text-gold-foreground",
};

const STATUS_LABELS: Record<string, string> = {
  open: "مفتوح",
  closed: "مغلق",
  draft: "مسودة",
};

function isoDay(value: string) {
  return value.slice(0, 10);
}

function emptyForm() {
  const now = new Date();
  const end = new Date(now.getTime() + 90 * 864e5);
  return {
    id: null as string | null,
    academic_year: "",
    name_ar: "",
    kind: "regular" as "regular" | "supplementary",
    starts_at: isoDay(now.toISOString()),
    ends_at: isoDay(end.toISOString()),
    reservation_enabled: true,
    closure_message: "",
    notes: "",
  };
}

export function SeasonsBoard() {
  const queryClient = useQueryClient();
  const { isAuthenticated, initializing } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["ams", "seasons"],
    queryFn: () => amsSeasons(),
    enabled: isAuthenticated && !initializing,
  });
  const [form, setForm] = useState<ReturnType<typeof emptyForm> | null>(null);
  const [downloading, setDownloading] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["ams", "seasons"] });

  const save = useMutation({
    mutationFn: (input: ReturnType<typeof emptyForm>) =>
      amsSeasonSave({
        data: {
          id: input.id,
          academic_year: input.academic_year,
          name_ar: input.name_ar,
          kind: input.kind,
          starts_at: new Date(`${input.starts_at}T00:00:00`).toISOString(),
          ends_at: new Date(`${input.ends_at}T23:59:59`).toISOString(),
          reservation_enabled: input.reservation_enabled,
          closure_message: input.closure_message || null,
          notes: input.notes || null,
        },
      }),
    onSuccess: () => {
      toast.success("تم حفظ موسم التسجيل");
      setForm(null);
      invalidate();
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const setStatus = useMutation({
    mutationFn: (input: { id: string; status: "draft" | "open" | "closed" }) => amsSeasonStatus({ data: input }),
    onSuccess: (_r, input) => {
      toast.success(input.status === "open" ? "تم فتح باب التسجيل" : "تم تحديث حالة الموسم");
      invalidate();
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => amsSeasonDelete({ data: { id } }),
    onSuccess: (result) => {
      if (!result.ok) return toast.error(result.reason);
      toast.success("تم حذف الموسم");
      invalidate();
    },
    onError: (err) => toast.error((err as Error).message),
  });

  async function downloadBackup(year: string | null) {
    setDownloading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error("انتهت الجلسة، يرجى تسجيل الدخول من جديد.");
      const url = `/api/ams/backup${year ? `?year=${encodeURIComponent(year)}` : ""}`;
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("تعذّر إنشاء النسخة الاحتياطية.");
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download =
        response.headers.get("content-disposition")?.match(/filename="(.+)"/)?.[1] ?? "almanal-backup.zip";
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success("تم تنزيل النسخة الاحتياطية الكاملة");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDownloading(false);
    }
  }

  if (error) return <EmptyState title="لا تملك صلاحية إدارة المواسم" description={(error as Error).message} />;
  if (isLoading || !data) return <SkeletonRows rows={5} />;

  const active = data.seasons.find((s) => s.effectiveOpen) ?? null;

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-border/60 bg-card/80 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black text-muted-foreground">حالة باب التسجيل</p>
            <p className="mt-1 text-lg font-extrabold text-foreground">
              {active
                ? `مفتوح — ${active.name_ar} (${active.academic_year})`
                : "مغلق — لا يوجد موسم تسجيل مفتوح حاليًا"}
            </p>
            {active && (
              <p className="mt-1 text-[11px] font-bold text-muted-foreground">
                من {isoDay(active.starts_at)} إلى {isoDay(active.ends_at)} · {KIND_LABELS[active.kind]} ·
                {active.reservation_enabled ? " الحجز المبدئي مُفعّل" : " الحجز المبدئي معطّل"}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button className="rounded-2xl text-xs font-bold" onClick={() => setForm(emptyForm())}>
              <CalendarPlus className="size-3.5" /> موسم تسجيل جديد
            </Button>
            <Button
              variant="outline"
              className="rounded-2xl text-xs font-bold"
              disabled={downloading}
              onClick={() => downloadBackup(active?.academic_year ?? null)}
            >
              {downloading ? <Loader2 className="size-3.5 animate-spin" /> : <DatabaseBackup className="size-3.5" />}
              نسخة احتياطية كاملة (ZIP)
            </Button>
          </div>
        </div>
      </section>

      {data.seasons.length === 0 ? (
        <EmptyState
          title="لم يتم إنشاء أي موسم تسجيل"
          description="أنشئ موسمًا وحدد عامه الدراسي وتاريخ البداية والنهاية، ثم افتح باب التسجيل."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.seasons.map((season) => (
            <SeasonCard
              key={season.id}
              season={season}
              onEdit={() =>
                setForm({
                  id: season.id,
                  academic_year: season.academic_year,
                  name_ar: season.name_ar,
                  kind: season.kind as "regular" | "supplementary",
                  starts_at: isoDay(season.starts_at),
                  ends_at: isoDay(season.ends_at),
                  reservation_enabled: season.reservation_enabled,
                  closure_message: season.closure_message ?? "",
                  notes: season.notes ?? "",
                })
              }
              onStatus={(status) => setStatus.mutate({ id: season.id, status })}
              onDelete={() => remove.mutate(season.id)}
              onBackup={() => downloadBackup(season.academic_year)}
              busy={setStatus.isPending || remove.isPending}
            />
          ))}
        </div>
      )}

      <Dialog open={!!form} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent className="max-w-xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>{form?.id ? "تعديل موسم التسجيل" : "موسم تسجيل جديد"}</DialogTitle>
            <DialogDescription>
              كل الطلبات والحجوزات التي تُنشأ أثناء الموسم تُنسب إليه وإلى عامه الدراسي تلقائيًا.
            </DialogDescription>
          </DialogHeader>
          {form && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label className="text-xs font-bold">اسم الموسم</Label>
                <Input
                  value={form.name_ar}
                  placeholder="تسجيل العام الدراسي 1448هـ"
                  onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs font-bold">العام الدراسي</Label>
                <Input
                  value={form.academic_year}
                  placeholder="2026-2027 / 1448هـ"
                  onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs font-bold">نوع التسجيل</Label>
                <div className="mt-1 flex gap-2">
                  {(["regular", "supplementary"] as const).map((kind) => (
                    <Button
                      key={kind}
                      type="button"
                      variant={form.kind === kind ? "default" : "outline"}
                      className="rounded-2xl text-[11px] font-bold"
                      onClick={() => setForm({ ...form, kind })}
                    >
                      {KIND_LABELS[kind]}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs font-bold">بداية التسجيل</Label>
                <Input
                  type="date"
                  value={form.starts_at}
                  onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs font-bold">نهاية التسجيل</Label>
                <Input
                  type="date"
                  value={form.ends_at}
                  onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2 flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3">
                <div>
                  <p className="text-xs font-black text-foreground">تفعيل الحجز المبدئي في هذا الموسم</p>
                  <p className="text-[11px] text-muted-foreground">
                    عند التعطيل يبدأ أولياء الأمور من التسجيل النهائي مباشرة.
                  </p>
                </div>
                <Switch
                  checked={form.reservation_enabled}
                  onCheckedChange={(v) => setForm({ ...form, reservation_enabled: v })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs font-bold">رسالة الإغلاق (تظهر لولي الأمر)</Label>
                <Textarea
                  value={form.closure_message}
                  rows={2}
                  onChange={(e) => setForm({ ...form, closure_message: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs font-bold">ملاحظات داخلية</Label>
                <Textarea
                  value={form.notes}
                  rows={2}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" className="rounded-2xl text-xs font-bold" onClick={() => setForm(null)}>
              إلغاء
            </Button>
            <Button
              className="rounded-2xl text-xs font-bold"
              disabled={save.isPending || !form?.academic_year.trim() || !form?.name_ar.trim()}
              onClick={() => form && save.mutate(form)}
            >
              {save.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
              حفظ الموسم
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SeasonCard({
  season,
  onEdit,
  onStatus,
  onDelete,
  onBackup,
  busy,
}: {
  season: SeasonView;
  onEdit: () => void;
  onStatus: (status: "draft" | "open" | "closed") => void;
  onDelete: () => void;
  onBackup: () => void;
  busy: boolean;
}) {
  return (
    <article className="rounded-3xl border border-border/60 bg-card/80 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-foreground">{season.name_ar}</p>
          <p className="mt-0.5 text-[11px] font-bold text-muted-foreground">
            {season.academic_year} · {KIND_LABELS[season.kind]}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
            season.effectiveOpen ? STATUS_STYLES.open : STATUS_STYLES[season.status]
          }`}
        >
          {season.effectiveOpen ? "مفتوح الآن" : STATUS_LABELS[season.status]}
        </span>
      </div>

      <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
        <CalendarClock className="size-3.5" />
        {isoDay(season.starts_at)} — {isoDay(season.ends_at)}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-muted/50 px-3 py-2">
          <p className="text-[10px] font-bold text-muted-foreground">طلبات نهائية</p>
          <p className="text-sm font-extrabold text-foreground">{season.stats.applications}</p>
        </div>
        <div className="rounded-2xl bg-muted/50 px-3 py-2">
          <p className="text-[10px] font-bold text-muted-foreground">حجوزات مبدئية</p>
          <p className="text-sm font-extrabold text-foreground">{season.stats.reservations}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {season.status === "open" ? (
          <Button
            variant="outline"
            className="rounded-2xl text-[11px] font-bold"
            disabled={busy}
            onClick={() => onStatus("closed")}
          >
            <DoorClosed className="size-3.5" /> إغلاق باب التسجيل
          </Button>
        ) : (
          <Button className="rounded-2xl text-[11px] font-bold" disabled={busy} onClick={() => onStatus("open")}>
            <DoorOpen className="size-3.5" /> فتح باب التسجيل
          </Button>
        )}
        <Button variant="outline" className="rounded-2xl text-[11px] font-bold" onClick={onEdit}>
          <Pencil className="size-3.5" /> تعديل
        </Button>
        <Button variant="outline" className="rounded-2xl text-[11px] font-bold" onClick={onBackup}>
          <DatabaseBackup className="size-3.5" /> نسخة احتياطية
        </Button>
        {season.stats.applications === 0 && (
          <Button
            variant="ghost"
            className="rounded-2xl text-[11px] font-bold text-destructive"
            disabled={busy}
            onClick={onDelete}
          >
            <Trash2 className="size-3.5" /> حذف
          </Button>
        )}
      </div>
    </article>
  );
}
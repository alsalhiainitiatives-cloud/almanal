import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Gauge, ImageDown, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_UPLOAD_SETTINGS, type UploadSettings } from "../../upload-settings";
import { uploadSettingsGet, uploadSettingsSave } from "../../upload-settings.functions";
import { UPLOAD_SETTINGS_QUERY_KEY } from "../../useUploadSettings";

export function UploadSettingsPanel() {
  const queryClient = useQueryClient();
  const load = useServerFn(uploadSettingsGet);
  const save = useServerFn(uploadSettingsSave);

  const { data, isLoading } = useQuery({
    queryKey: UPLOAD_SETTINGS_QUERY_KEY,
    queryFn: () => load(),
  });

  const [form, setForm] = useState<UploadSettings>(DEFAULT_UPLOAD_SETTINGS);
  useEffect(() => {
    if (data) setForm(data as UploadSettings);
  }, [data]);

  const mutation = useMutation({
    mutationFn: (input: UploadSettings) => save({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: UPLOAD_SETTINGS_QUERY_KEY });
      toast.success("تم حفظ إعدادات المرفقات");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "تعذّر حفظ الإعدادات"),
  });

  if (isLoading) {
    return (
      <div className="grid place-items-center py-16 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Gauge className="size-5" />
          </span>
          <div>
            <p className="text-base font-black text-foreground">حدود أحجام المرفقات</p>
            <p className="text-xs font-bold text-muted-foreground">
              تُطبَّق مباشرة على مستندات التسجيل وإيصالات السداد في واجهة ولي الأمر.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="max-doc">الحد الأقصى لمستندات التسجيل (ميجابايت)</Label>
            <Input
              id="max-doc"
              type="number"
              min={1}
              max={50}
              value={form.maxDocumentMb}
              onChange={(e) => setForm((f) => ({ ...f, maxDocumentMb: Number(e.target.value) || 1 }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="max-receipt">الحد الأقصى لإيصالات السداد (ميجابايت)</Label>
            <Input
              id="max-receipt"
              type="number"
              min={1}
              max={50}
              value={form.maxReceiptMb}
              onChange={(e) => setForm((f) => ({ ...f, maxReceiptMb: Number(e.target.value) || 1 }))}
            />
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-2xl bg-mint/40 text-foreground">
            <ImageDown className="size-5" />
          </span>
          <div>
            <p className="text-base font-black text-foreground">الضغط التلقائي للمرفقات</p>
            <p className="text-xs font-bold text-muted-foreground">
              تُصغَّر الصور تلقائيًا قبل الرفع مع الحفاظ على وضوح البيانات، وتُفحص ملفات PDF مقابل الحد الأقصى.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background p-4">
            <span className="text-sm font-black text-foreground">تشغيل ضغط الصور قبل الرفع</span>
            <Switch
              checked={form.compressImages}
              onCheckedChange={(v) => setForm((f) => ({ ...f, compressImages: v }))}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="max-dim">أقصى أبعاد للصورة (بكسل)</Label>
              <Input
                id="max-dim"
                type="number"
                min={600}
                max={4000}
                step={100}
                value={form.imageMaxDimension}
                onChange={(e) =>
                  setForm((f) => ({ ...f, imageMaxDimension: Number(e.target.value) || 2000 }))
                }
              />
              <p className="text-[11px] font-bold text-muted-foreground">
                2000 بكسل كافية لقراءة الهويات والشهادات بوضوح.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quality">جودة الضغط ({Math.round(form.imageQuality * 100)}%)</Label>
              <Input
                id="quality"
                type="range"
                min={40}
                max={100}
                step={2}
                value={Math.round(form.imageQuality * 100)}
                onChange={(e) => setForm((f) => ({ ...f, imageQuality: Number(e.target.value) / 100 }))}
              />
              <p className="text-[11px] font-bold text-muted-foreground">
                الموصى به 80–85% — أقل حجم ممكن دون فقدان ملحوظ للجودة.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          variant="hero"
          className="rounded-xl"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate(form)}
        >
          {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          حفظ الإعدادات
        </Button>
      </div>
    </div>
  );
}

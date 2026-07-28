import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { STEP_ICONS, type FormStepRow } from "@/features/admissions/form-config";
import { formStepSave } from "../../form-config.functions";

export function StepDialog({
  open,
  step,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  step: FormStepRow | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const save = useServerFn(formStepSave);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    key: "",
    name_ar: "",
    short_ar: "",
    description_ar: "",
    icon: "Sparkles",
    is_active: true,
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      key: step?.key ?? "",
      name_ar: step?.name_ar ?? "",
      short_ar: step?.short_ar ?? "",
      description_ar: step?.description_ar ?? "",
      icon: step?.icon ?? "Sparkles",
      is_active: step?.is_active ?? true,
    });
  }, [open, step]);

  async function submit() {
    if (form.name_ar.trim().length < 2 || form.short_ar.trim().length < 2) {
      toast.error("أدخل اسم المرحلة والاسم المختصر");
      return;
    }
    setBusy(true);
    try {
      await save({
        data: {
          id: step?.id ?? null,
          key: form.key,
          name_ar: form.name_ar,
          short_ar: form.short_ar,
          description_ar: form.description_ar || null,
          icon: form.icon,
          is_active: form.is_active,
        },
      });
      toast.success(step ? "تم تحديث المرحلة" : "تمت إضافة المرحلة");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر الحفظ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-start">
            {step ? "تعديل المرحلة" : "مرحلة جديدة في نظام التسجيل"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label className="text-xs font-bold">اسم المرحلة</Label>
            <Input
              value={form.name_ar}
              onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))}
              placeholder="مثال: بيانات صحية"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label className="text-xs font-bold">الاسم المختصر (في شريط الخطوات)</Label>
              <Input
                value={form.short_ar}
                onChange={(e) => setForm((f) => ({ ...f, short_ar: e.target.value }))}
                placeholder="صحية"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-bold">الأيقونة</Label>
              <select
                value={form.icon}
                onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                className="h-10 rounded-xl border-2 border-border bg-background px-3 text-sm font-bold"
              >
                {Object.keys(STEP_ICONS).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label className="text-xs font-bold">وصف المرحلة</Label>
            <Textarea
              rows={3}
              value={form.description_ar}
              onChange={(e) => setForm((f) => ({ ...f, description_ar: e.target.value }))}
            />
          </div>
          {step?.is_system ? (
            <p className="rounded-2xl bg-muted/60 p-3 text-xs font-bold text-muted-foreground">
              مرحلة نظامية: يمكن تعديل الاسم والوصف والترتيب والتفعيل، ولا يمكن حذفها.
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="soft" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button variant="hero" onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null} حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
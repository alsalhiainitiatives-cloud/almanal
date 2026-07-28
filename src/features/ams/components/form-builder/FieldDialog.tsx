import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Trash2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FIELD_TYPE_LABELS, type FormFieldRow } from "@/features/admissions/form-config";
import { formFieldSave } from "../../form-config.functions";

type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "multiselect"
  | "checkbox"
  | "phone"
  | "email";

export function FieldDialog({
  open,
  field,
  stepId,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  field: FormFieldRow | null;
  stepId: string | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const save = useServerFn(formFieldSave);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    key: "",
    label_ar: "",
    help_ar: "",
    placeholder_ar: "",
    field_type: "text" as FieldType,
    options: [] as { value: string; label: string }[],
    is_required: false,
    is_visible: true,
    applies_to: "application" as "application" | "child",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      key: field?.key ?? "",
      label_ar: field?.label_ar ?? "",
      help_ar: field?.help_ar ?? "",
      placeholder_ar: field?.placeholder_ar ?? "",
      field_type: (field?.field_type as FieldType) ?? "text",
      options: Array.isArray(field?.options) ? field!.options : [],
      is_required: field?.is_required ?? false,
      is_visible: field?.is_visible ?? true,
      applies_to: (field?.applies_to as "application" | "child") ?? "application",
    });
  }, [open, field]);

  const needsOptions = form.field_type === "select" || form.field_type === "multiselect";

  async function submit() {
    if (!stepId) return;
    if (form.label_ar.trim().length < 2) {
      toast.error("أدخل عنوان الحقل");
      return;
    }
    if (needsOptions && form.options.filter((o) => o.value.trim()).length === 0) {
      toast.error("أضف خيارًا واحدًا على الأقل");
      return;
    }
    setBusy(true);
    try {
      await save({
        data: {
          id: field?.id ?? null,
          step_id: stepId,
          key: form.key,
          label_ar: form.label_ar,
          help_ar: form.help_ar || null,
          placeholder_ar: form.placeholder_ar || null,
          field_type: form.field_type,
          options: needsOptions ? form.options : [],
          is_required: form.is_required,
          is_visible: form.is_visible,
          applies_to: form.applies_to,
        },
      });
      toast.success(field ? "تم تحديث الحقل" : "تمت إضافة الحقل");
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
      <DialogContent dir="rtl" className="max-h-[88vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-start">{field ? "تعديل الحقل" : "حقل جديد"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label className="text-xs font-bold">عنوان الحقل</Label>
            <Input
              value={form.label_ar}
              onChange={(e) => setForm((f) => ({ ...f, label_ar: e.target.value }))}
              placeholder="مثال: اسم الطبيب المتابع"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label className="text-xs font-bold">نوع الحقل</Label>
              <select
                value={form.field_type}
                onChange={(e) => setForm((f) => ({ ...f, field_type: e.target.value as FieldType }))}
                className="h-10 rounded-xl border-2 border-border bg-background px-3 text-sm font-bold"
              >
                {Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-bold">يُعبأ لكل</Label>
              <select
                value={form.applies_to}
                onChange={(e) =>
                  setForm((f) => ({ ...f, applies_to: e.target.value as "application" | "child" }))
                }
                className="h-10 rounded-xl border-2 border-border bg-background px-3 text-sm font-bold"
              >
                <option value="application">الطلب (مرة واحدة)</option>
                <option value="child">كل طفل</option>
              </select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label className="text-xs font-bold">نص مساعد (اختياري)</Label>
            <Textarea
              rows={2}
              value={form.help_ar}
              onChange={(e) => setForm((f) => ({ ...f, help_ar: e.target.value }))}
            />
          </div>

          {needsOptions ? (
            <div className="rounded-2xl border-2 border-border/70 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-black text-foreground">الخيارات</p>
                <Button
                  size="sm"
                  variant="soft"
                  className="h-8 rounded-lg text-[11px] font-bold"
                  onClick={() =>
                    setForm((f) => ({ ...f, options: [...f.options, { value: "", label: "" }] }))
                  }
                >
                  <Plus className="size-3.5" /> خيار
                </Button>
              </div>
              <div className="space-y-2">
                {form.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={option.label}
                      placeholder="النص الظاهر"
                      onChange={(e) =>
                        setForm((f) => {
                          const options = [...f.options];
                          options[index] = {
                            label: e.target.value,
                            value: options[index].value || e.target.value,
                          };
                          return { ...f, options };
                        })
                      }
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-9 shrink-0 rounded-lg text-destructive"
                      onClick={() =>
                        setForm((f) => ({ ...f, options: f.options.filter((_, i) => i !== index) }))
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-muted/50 p-3">
            <label className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Switch
                checked={form.is_required}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_required: v }))}
              />
              حقل إجباري
            </label>
            <label className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Switch
                checked={form.is_visible}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_visible: v }))}
              />
              ظاهر في النموذج
            </label>
          </div>
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
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formDocTypeSave } from "../../form-config.functions";
import type { DocTypeRow } from "./FormBuilder";

export function DocTypeDialog({
  open,
  doc,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  doc: DocTypeRow | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const save = useServerFn(formDocTypeSave);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    slug: "",
    name_ar: "",
    description_ar: "",
    scope: "parent" as "parent" | "child",
    applies_to_nationality: "all" as "all" | "saudi" | "non_saudi",
    is_required: false,
    is_active: true,
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      slug: doc?.slug ?? "",
      name_ar: doc?.name_ar ?? "",
      description_ar: doc?.description_ar ?? "",
      scope: (doc?.scope as "parent" | "child") ?? "parent",
      applies_to_nationality: (doc?.applies_to_nationality as "all" | "saudi" | "non_saudi") ?? "all",
      is_required: doc?.is_required ?? false,
      is_active: doc?.is_active ?? true,
    });
  }, [open, doc]);

  async function submit() {
    if (form.name_ar.trim().length < 2) {
      toast.error("أدخل اسم المستند");
      return;
    }
    setBusy(true);
    try {
      await save({
        data: {
          id: doc?.id ?? null,
          slug: form.slug,
          name_ar: form.name_ar,
          description_ar: form.description_ar || null,
          scope: form.scope,
          applies_to_nationality: form.applies_to_nationality,
          is_required: form.is_required,
          is_active: form.is_active,
        },
      });
      toast.success(doc ? "تم تحديث نوع المستند" : "تمت إضافة نوع المستند");
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
            {doc ? "تعديل نوع المستند" : "نوع مستند جديد"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label className="text-xs font-bold">اسم المستند</Label>
            <Input
              value={form.name_ar}
              onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))}
              placeholder="مثال: تقرير طبي حديث"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label className="text-xs font-bold">يخص</Label>
              <select
                value={form.scope}
                onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value as "parent" | "child" }))}
                className="h-10 rounded-xl border-2 border-border bg-background px-3 text-sm font-bold"
              >
                <option value="parent">ولي الأمر</option>
                <option value="child">كل طفل</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-bold">يُطلب من</Label>
              <select
                value={form.applies_to_nationality}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    applies_to_nationality: e.target.value as "all" | "saudi" | "non_saudi",
                  }))
                }
                className="h-10 rounded-xl border-2 border-border bg-background px-3 text-sm font-bold"
              >
                <option value="all">الجميع</option>
                <option value="saudi">السعوديون</option>
                <option value="non_saudi">غير السعوديين</option>
              </select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label className="text-xs font-bold">وصف / تعليمات الرفع</Label>
            <Textarea
              rows={2}
              value={form.description_ar}
              onChange={(e) => setForm((f) => ({ ...f, description_ar: e.target.value }))}
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-muted/50 p-3">
            <label className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Switch
                checked={form.is_required}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_required: v }))}
              />
              مستند إجباري
            </label>
            <label className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
              مفعّل
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
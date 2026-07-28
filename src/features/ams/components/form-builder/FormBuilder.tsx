import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  Lock,
  Plus,
  Settings2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomField } from "@/features/admissions/components/CustomFields";
import {
  FIELD_TYPE_LABELS,
  stepIcon,
  type FormFieldRow,
  type FormStepRow,
} from "@/features/admissions/form-config";
import { cn } from "@/lib/utils";
import {
  formConfigGet,
  formDocTypeDelete,
  formDocTypeSave,
  formFieldDelete,
  formFieldSave,
  formFieldToggle,
  formFieldsReorder,
  formStepDelete,
  formStepSave,
  formStepToggle,
  formStepsReorder,
} from "../../form-config.functions";
import { FieldDialog } from "./FieldDialog";
import { StepDialog } from "./StepDialog";
import { DocTypeDialog } from "./DocTypeDialog";

export type DocTypeRow = {
  id: string;
  slug: string;
  name_ar: string;
  description_ar: string | null;
  scope: string;
  applies_to_nationality: string;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
};

const CONFIG_KEY = ["ams", "form-config"];

export function FormBuilder() {
  const queryClient = useQueryClient();
  const load = useServerFn(formConfigGet);

  const { data, isLoading, error } = useQuery({
    queryKey: CONFIG_KEY,
    queryFn: () => load(),
  });

  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [stepDialog, setStepDialog] = useState<{ open: boolean; step: FormStepRow | null }>({
    open: false,
    step: null,
  });
  const [fieldDialog, setFieldDialog] = useState<{ open: boolean; field: FormFieldRow | null }>({
    open: false,
    field: null,
  });
  const [docDialog, setDocDialog] = useState<{ open: boolean; doc: DocTypeRow | null }>({
    open: false,
    doc: null,
  });

  const steps = (data?.steps ?? []) as unknown as FormStepRow[];
  const fields = (data?.fields ?? []) as unknown as FormFieldRow[];
  const docTypes = (data?.documentTypes ?? []) as unknown as DocTypeRow[];

  const selectedStep = useMemo(
    () => steps.find((s) => s.id === activeStepId) ?? steps[0] ?? null,
    [steps, activeStepId],
  );
  const stepFields = useMemo(
    () =>
      fields
        .filter((f) => f.step_id === selectedStep?.id)
        .sort((a, b) => a.sort_order - b.sort_order),
    [fields, selectedStep],
  );

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: CONFIG_KEY });
    queryClient.invalidateQueries({ queryKey: ["admissions", "form-config"] });
    queryClient.invalidateQueries({ queryKey: ["admissions", "catalog"] });
  };

  function useAction<T>(fn: (input: T) => Promise<unknown>, success: string) {
    return useMutation({
      mutationFn: fn,
      onSuccess: () => {
        refresh();
        toast.success(success);
      },
      onError: (e: unknown) =>
        toast.error(e instanceof Error ? e.message : "تعذّر تنفيذ الإجراء"),
    });
  }

  const toggleStep = useServerFn(formStepToggle);
  const removeStep = useServerFn(formStepDelete);
  const orderSteps = useServerFn(formStepsReorder);
  const toggleFieldFn = useServerFn(formFieldToggle);
  const removeField = useServerFn(formFieldDelete);
  const orderFields = useServerFn(formFieldsReorder);
  const removeDoc = useServerFn(formDocTypeDelete);
  const saveDoc = useServerFn(formDocTypeSave);

  const stepToggle = useAction(
    (v: { id: string; active: boolean }) => toggleStep({ data: v }),
    "تم تحديث حالة المرحلة",
  );
  const stepDelete = useAction((id: string) => removeStep({ data: { id } }), "تم حذف المرحلة");
  const stepsReorder = useAction((ids: string[]) => orderSteps({ data: { ids } }), "تم تحديث الترتيب");
  const fieldToggle = useAction(
    (v: { id: string; is_required?: boolean; is_visible?: boolean }) => toggleFieldFn({ data: v }),
    "تم تحديث الحقل",
  );
  const fieldDelete = useAction((id: string) => removeField({ data: { id } }), "تم حذف الحقل");
  const fieldsReorder = useAction(
    (ids: string[]) => orderFields({ data: { ids } }),
    "تم تحديث ترتيب الحقول",
  );
  const docDelete = useAction((id: string) => removeDoc({ data: { id } }), "تم حذف نوع المستند");
  const docToggle = useAction(
    (v: { id: string; patch: Partial<DocTypeRow> }) =>
      saveDoc({
        data: {
          id: v.id,
          slug: "",
          name_ar: v.patch.name_ar!,
          description_ar: v.patch.description_ar ?? null,
          scope: (v.patch.scope as "parent" | "child") ?? "parent",
          applies_to_nationality: (v.patch.applies_to_nationality ?? "all") as
            | "all"
            | "saudi"
            | "non_saudi",
          is_required: v.patch.is_required,
          is_active: v.patch.is_active,
        },
      }),
    "تم تحديث نوع المستند",
  );

  function moveStep(index: number, dir: -1 | 1) {
    const next = [...steps];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    stepsReorder.mutate(next.map((s) => s.id));
  }

  function moveField(index: number, dir: -1 | 1) {
    const next = [...stepFields];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    fieldsReorder.mutate(next.map((f) => f.id));
  }

  if (isLoading) {
    return (
      <div className="grid place-items-center py-24 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border-2 border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="text-sm font-black text-destructive">
          {error instanceof Error ? error.message : "تعذّر تحميل الإعدادات"}
        </p>
      </div>
    );
  }

  return (
    <Tabs defaultValue="steps" dir="rtl" className="space-y-5">
      <TabsList className="rounded-2xl">
        <TabsTrigger value="steps" className="rounded-xl text-xs font-bold">
          <Settings2 className="ms-1 size-4" /> المراحل والحقول
        </TabsTrigger>
        <TabsTrigger value="docs" className="rounded-xl text-xs font-bold">
          <FileText className="ms-1 size-4" /> أنواع المستندات
        </TabsTrigger>
      </TabsList>

      <TabsContent value="steps" className="m-0">
        <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
          {/* Steps list */}
          <div className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-black text-foreground">مراحل نظام التسجيل</p>
              <Button
                size="sm"
                variant="soft"
                className="rounded-xl text-xs font-bold"
                onClick={() => setStepDialog({ open: true, step: null })}
              >
                <Plus className="size-4" /> مرحلة
              </Button>
            </div>

            <div className="space-y-2">
              {steps.map((step, index) => {
                const Icon = stepIcon(step.icon);
                const active = selectedStep?.id === step.id;
                const count = fields.filter((f) => f.step_id === step.id).length;
                return (
                  <div
                    key={step.id}
                    className={cn(
                      "rounded-2xl border-2 p-3 transition",
                      active ? "border-primary bg-primary/5" : "border-border/60 bg-background",
                      !step.is_active && "opacity-60",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveStepId(step.id)}
                      className="flex w-full items-center gap-2.5 text-start"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-black text-foreground">
                          {step.name_ar}
                        </span>
                        <span className="block truncate text-[11px] font-bold text-muted-foreground">
                          {count} حقل · {step.is_system ? "مرحلة نظامية" : "مرحلة مخصّصة"}
                        </span>
                      </span>
                    </button>

                    <div className="mt-2 flex items-center justify-between gap-1 border-t border-border/50 pt-2">
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 rounded-lg"
                          onClick={() => moveStep(index, -1)}
                        >
                          <ArrowUp className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 rounded-lg"
                          onClick={() => moveStep(index, 1)}
                        >
                          <ArrowDown className="size-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 rounded-lg px-2 text-[11px] font-bold"
                          onClick={() => setStepDialog({ open: true, step })}
                        >
                          تعديل
                        </Button>
                        {step.is_system ? null : (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7 rounded-lg text-destructive"
                            onClick={() => {
                              if (confirm(`حذف مرحلة «${step.name_ar}» وكل حقولها؟`)) {
                                stepDelete.mutate(step.id);
                              }
                            }}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>

                      <Switch
                        checked={step.is_active}
                        onCheckedChange={(v) => stepToggle.mutate({ id: step.id, active: v })}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Fields of selected step */}
          <div className="space-y-4">
            <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-black text-foreground">
                    حقول: {selectedStep?.name_ar ?? "—"}
                  </p>
                  <p className="text-xs font-bold text-muted-foreground">
                    الحقول النظامية يمكن جعلها إجبارية أو إخفاؤها فقط، ولا يمكن حذفها.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="hero"
                  className="rounded-xl text-xs font-bold"
                  disabled={!selectedStep}
                  onClick={() => setFieldDialog({ open: true, field: null })}
                >
                  <Plus className="size-4" /> حقل جديد
                </Button>
              </div>

              {stepFields.length === 0 ? (
                <p className="rounded-2xl border-2 border-dashed border-border/70 p-8 text-center text-sm font-bold text-muted-foreground">
                  لا توجد حقول في هذه المرحلة بعد.
                </p>
              ) : (
                <div className="space-y-2">
                  {stepFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border/60 bg-background p-3"
                    >
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 truncate text-sm font-black text-foreground">
                          {field.is_system ? <Lock className="size-3.5 text-muted-foreground" /> : null}
                          {field.label_ar}
                          {field.is_required ? <span className="text-destructive">*</span> : null}
                        </p>
                        <p className="truncate text-[11px] font-bold text-muted-foreground">
                          {FIELD_TYPE_LABELS[field.field_type] ?? field.field_type} ·{" "}
                          <span dir="ltr">{field.key}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <label className="flex items-center gap-1.5 rounded-xl bg-muted/60 px-2 py-1 text-[11px] font-bold text-muted-foreground">
                          إجباري
                          <Switch
                            checked={field.is_required}
                            onCheckedChange={(v) =>
                              fieldToggle.mutate({ id: field.id, is_required: v })
                            }
                          />
                        </label>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 rounded-lg"
                          title={field.is_visible ? "إخفاء الحقل" : "إظهار الحقل"}
                          onClick={() =>
                            fieldToggle.mutate({ id: field.id, is_visible: !field.is_visible })
                          }
                        >
                          {field.is_visible ? (
                            <Eye className="size-4" />
                          ) : (
                            <EyeOff className="size-4 text-muted-foreground" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 rounded-lg"
                          onClick={() => moveField(index, -1)}
                        >
                          <ArrowUp className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 rounded-lg"
                          onClick={() => moveField(index, 1)}
                        >
                          <ArrowDown className="size-3.5" />
                        </Button>
                        {field.is_system ? null : (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 rounded-lg px-2 text-[11px] font-bold"
                              onClick={() => setFieldDialog({ open: true, field })}
                            >
                              تعديل
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8 rounded-lg text-destructive"
                              onClick={() => {
                                if (confirm(`حذف الحقل «${field.label_ar}»؟`)) {
                                  fieldDelete.mutate(field.id);
                                }
                              }}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live preview */}
            <div className="rounded-3xl border border-border/60 bg-muted/30 p-5">
              <p className="mb-3 text-sm font-black text-foreground">معاينة الحقول المخصّصة</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {stepFields
                  .filter((f) => !f.is_system && f.is_visible)
                  .map((f) => (
                    <CustomField key={f.id} field={f} value={undefined} onChange={() => {}} />
                  ))}
              </div>
              {stepFields.filter((f) => !f.is_system && f.is_visible).length === 0 ? (
                <p className="text-xs font-bold text-muted-foreground">
                  أضف حقولًا مخصّصة لتظهر هنا وفي نموذج التسجيل مباشرة.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="docs" className="m-0">
        <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-base font-black text-foreground">أنواع المرفقات والمستندات</p>
              <p className="text-xs font-bold text-muted-foreground">
                تظهر مباشرة في خطوة المستندات داخل نموذج التسجيل.
              </p>
            </div>
            <Button
              size="sm"
              variant="hero"
              className="rounded-xl text-xs font-bold"
              onClick={() => setDocDialog({ open: true, doc: null })}
            >
              <Plus className="size-4" /> نوع مستند
            </Button>
          </div>

          <div className="space-y-2">
            {docTypes.map((doc) => (
              <div
                key={doc.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border/60 bg-background p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-foreground">
                    {doc.name_ar}
                    {doc.is_required ? <span className="text-destructive"> *</span> : null}
                  </p>
                  <p className="truncate text-[11px] font-bold text-muted-foreground">
                    {doc.scope === "child" ? "مستند لكل طفل" : "مستند ولي الأمر"} ·{" "}
                    {doc.applies_to_nationality === "saudi"
                      ? "السعوديون"
                      : (doc.applies_to_nationality === "non_saudi" || doc.applies_to_nationality === "resident")
                        ? "غير السعوديين"
                        : "الجميع"}{" "}
                    · <span dir="ltr">{doc.slug}</span>
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <label className="flex items-center gap-1.5 rounded-xl bg-muted/60 px-2 py-1 text-[11px] font-bold text-muted-foreground">
                    مفعّل
                    <Switch
                      checked={doc.is_active}
                      onCheckedChange={(v) =>
                        docToggle.mutate({ id: doc.id, patch: { ...doc, is_active: v } })
                      }
                    />
                  </label>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 rounded-lg px-2 text-[11px] font-bold"
                    onClick={() => setDocDialog({ open: true, doc })}
                  >
                    تعديل
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 rounded-lg text-destructive"
                    onClick={() => {
                      if (confirm(`حذف نوع المستند «${doc.name_ar}»؟`)) docDelete.mutate(doc.id);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </TabsContent>

      <StepDialog
        open={stepDialog.open}
        step={stepDialog.step}
        onOpenChange={(open) => setStepDialog((s) => ({ ...s, open }))}
        onSaved={refresh}
      />
      <FieldDialog
        open={fieldDialog.open}
        field={fieldDialog.field}
        stepId={selectedStep?.id ?? null}
        onOpenChange={(open) => setFieldDialog((s) => ({ ...s, open }))}
        onSaved={refresh}
      />
      <DocTypeDialog
        open={docDialog.open}
        doc={docDialog.doc}
        onOpenChange={(open) => setDocDialog((s) => ({ ...s, open }))}
        onSaved={refresh}
      />
    </Tabs>
  );
}
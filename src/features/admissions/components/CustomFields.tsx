import { Settings2 } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { FormFieldRow } from "../form-config";
import { FieldGrid, FormSection, SelectField, TextAreaField, TextField } from "./fields";

/**
 * Renders the admin-defined (custom) fields of a wizard step.
 * Values live in the application draft under `custom[stepKey]`.
 */
export function CustomFields({
  title = "معلومات إضافية",
  description,
  fields,
  values,
  errors,
  onChange,
}: {
  title?: string;
  description?: string;
  fields: FormFieldRow[];
  values: Record<string, unknown>;
  errors: Record<string, string>;
  onChange: (key: string, value: unknown) => void;
}) {
  if (!fields.length) return null;

  return (
    <FormSection title={title} description={description} icon={Settings2} className="mt-6">
      <FieldGrid>
        {fields.map((field) => (
          <CustomField
            key={field.id}
            field={field}
            value={values?.[field.key]}
            error={errors?.[field.key]}
            onChange={(v) => onChange(field.key, v)}
          />
        ))}
      </FieldGrid>
    </FormSection>
  );
}

export function CustomField({
  field,
  value,
  error,
  onChange,
}: {
  field: FormFieldRow;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
}) {
  const shared = {
    label: field.label_ar,
    hint: field.help_ar ?? undefined,
    error,
    required: field.is_required,
    placeholder: field.placeholder_ar ?? undefined,
  };
  const options = Array.isArray(field.options) ? field.options : [];

  switch (field.field_type) {
    case "textarea":
      return (
        <TextAreaField
          {...shared}
          className="sm:col-span-2"
          value={String(value ?? "")}
          onChange={onChange}
        />
      );
    case "select":
      return (
        <SelectField
          {...shared}
          value={String(value ?? "")}
          onChange={onChange}
          options={[{ value: "", label: "— اختر —" }, ...options]}
        />
      );
    case "multiselect": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="sm:col-span-2">
          <p className="mb-2 text-sm font-black text-foreground">
            {field.label_ar}
            {field.is_required ? <span className="text-destructive"> *</span> : null}
          </p>
          <div className="flex flex-wrap gap-2">
            {options.map((o) => {
              const active = selected.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() =>
                    onChange(
                      active ? selected.filter((v) => v !== o.value) : [...selected, o.value],
                    )
                  }
                  className={cn(
                    "rounded-2xl border-2 px-4 py-2 text-xs font-bold transition",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {o.label || o.value}
                </button>
              );
            })}
          </div>
          {error ? <p className="mt-2 text-xs font-bold text-destructive">{error}</p> : null}
          {field.help_ar ? (
            <p className="mt-1 text-xs text-muted-foreground">{field.help_ar}</p>
          ) : null}
        </div>
      );
    }
    case "checkbox":
      return (
        <div className="sm:col-span-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-border/70 bg-card p-4">
            <Checkbox
              checked={Boolean(value)}
              onCheckedChange={(checked) => onChange(Boolean(checked))}
              className="mt-0.5"
            />
            <span>
              <Label className="text-sm font-black text-foreground">{field.label_ar}</Label>
              {field.help_ar ? (
                <span className="mt-1 block text-xs text-muted-foreground">{field.help_ar}</span>
              ) : null}
            </span>
          </label>
          {error ? <p className="mt-2 text-xs font-bold text-destructive">{error}</p> : null}
        </div>
      );
    case "date":
      return (
        <TextField {...shared} type="date" dir="ltr" value={String(value ?? "")} onChange={onChange} />
      );
    case "number":
      return (
        <TextField
          {...shared}
          type="number"
          dir="ltr"
          value={String(value ?? "")}
          onChange={onChange}
        />
      );
    case "phone":
      return (
        <TextField
          {...shared}
          dir="ltr"
          inputMode="tel"
          value={String(value ?? "")}
          onChange={onChange}
        />
      );
    case "email":
      return (
        <TextField {...shared} type="email" dir="ltr" value={String(value ?? "")} onChange={onChange} />
      );
    default:
      return <TextField {...shared} value={String(value ?? "")} onChange={onChange} />;
  }
}
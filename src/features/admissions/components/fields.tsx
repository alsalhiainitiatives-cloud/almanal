import type { ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function Field({
  label,
  error,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-sm font-bold text-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
      {error ? (
        <p className="text-xs font-bold text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

type TextProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  placeholder?: string;
  dir?: "rtl" | "ltr";
  type?: string;
  inputMode?: "text" | "numeric" | "tel" | "email";
  maxLength?: number;
  className?: string;
};

export function TextField({
  label,
  value,
  onChange,
  error,
  hint,
  required,
  placeholder,
  dir = "rtl",
  type = "text",
  inputMode,
  maxLength,
  className,
}: TextProps) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        dir={dir}
        type={type}
        inputMode={inputMode}
        maxLength={maxLength}
        className={cn(
          "h-12 rounded-2xl border-border/70 bg-background text-start",
          error && "border-destructive",
        )}
      />
    </Field>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  error,
  hint,
  placeholder,
  className,
}: Omit<TextProps, "dir" | "type" | "inputMode" | "maxLength">) {
  return (
    <Field label={label} error={error} hint={hint} className={className}>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="rounded-2xl border-border/70 bg-background"
      />
    </Field>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  error,
  hint,
  required,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-12 w-full rounded-2xl border border-border/70 bg-background px-3 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-ring",
          error && "border-destructive",
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function ChoiceChips({
  label,
  value,
  onChange,
  options,
  error,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  error?: string;
  required?: boolean;
}) {
  return (
    <Field label={label} error={error} required={required}>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-2xl border px-4 py-2.5 text-sm font-bold transition",
              value === o.value
                ? "border-primary bg-primary text-primary-foreground shadow-soft"
                : "border-border/70 bg-background text-foreground hover:border-primary/50",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </Field>
  );
}
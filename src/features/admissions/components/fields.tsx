import {
  createContext,
  useContext,
  useId,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { AlertCircle, Check, ChevronsUpDown, Lock, Search } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { COUNTRIES } from "../countries";

type Icon = ComponentType<{ className?: string }>;

/** True inside a <LockedGroup> — every Field below shows the lock affordance. */
const LockedFieldsContext = createContext(false);

const LOCK_EXPLAINER =
  "تم ملء هذه البيانات عند حجز المقعد المبدئي وهي معتمدة حالياً من إدارة الروضة. في حال الرغبة في تغيير الرغبات، يرجى التواصل مع إدارة الروضة.";

/** Small 🔒 next to a locked field label; opens the explainer + contact action. */
export function LockHint() {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* A span (not a button) so it stays clickable inside a disabled fieldset. */}
      <span
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setOpen(true);
        }}
        aria-label="لماذا هذا الحقل مقفل؟"
        className="grid size-5 shrink-0 cursor-pointer place-items-center rounded-full bg-primary/12 text-primary transition hover:bg-primary/25"
      >
        <Lock className="size-3" />
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-black">بيانات مثبتة من حجز المقعد</DialogTitle>
            <DialogDescription className="text-sm leading-7">{LOCK_EXPLAINER}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-start">
            <Button asChild variant="hero" className="rounded-2xl">
              <Link to="/contact">صفحة اتصل بنا</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Layout primitives                                                          */
/* -------------------------------------------------------------------------- */

/** Bordered, titled section that groups related fields inside a step card. */
export function FormSection({
  title,
  description,
  icon: IconCmp,
  tone = "default",
  action,
  className,
  children,
}: {
  title: string;
  description?: string;
  icon?: Icon;
  tone?: "default" | "accent";
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-3xl border-2 bg-card p-5 shadow-soft transition-shadow sm:p-7",
        tone === "accent" ? "border-primary/25 bg-primary/[0.03]" : "border-border/70",
        className,
      )}
    >
      <header className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-border/60 pb-4">
        <div className="flex min-w-0 items-start gap-3">
          {IconCmp ? (
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              <IconCmp className="size-5" />
            </span>
          ) : null}
          <div className="min-w-0">
            <h3 className="text-lg font-black leading-tight text-foreground sm:text-xl">{title}</h3>
            {description ? (
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      {children}
    </section>
  );
}

/** Responsive 2-column field grid with generous spacing. */
export function FieldGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-5 sm:gap-6 md:grid-cols-2", className)}>{children}</div>;
}

export function Field({
  label,
  error,
  hint,
  required,
  className,
  icon: IconCmp,
  htmlFor,
  locked,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  icon?: Icon;
  htmlFor?: string;
  locked?: boolean;
  children: ReactNode;
}) {
  const groupLocked = useContext(LockedFieldsContext);
  const showLock = locked ?? groupLocked;
  return (
    <div className={cn("space-y-2", className)}>
      <Label
        htmlFor={htmlFor}
        className="flex items-center gap-2 text-sm font-black tracking-tight text-foreground"
      >
        {IconCmp ? <IconCmp className="size-4 text-primary" /> : null}
        <span>{label}</span>
        {required ? <span className="text-destructive">*</span> : null}
        {showLock ? <LockHint /> : null}
      </Label>
      {children}
      {error ? (
        <p className="flex items-center gap-1.5 text-xs font-bold text-destructive">
          <AlertCircle className="size-3.5 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

const controlBase =
  "w-full rounded-2xl border-2 bg-background text-base font-semibold text-foreground shadow-none outline-none transition-colors placeholder:font-normal placeholder:text-muted-foreground focus-visible:ring-4 focus-visible:ring-ring/15";

const controlState = (error?: string) =>
  error
    ? "border-destructive focus-visible:border-destructive"
    : "border-border hover:border-primary/40 focus-visible:border-primary";

/* -------------------------------------------------------------------------- */
/*  Controls                                                                   */
/* -------------------------------------------------------------------------- */

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
  icon?: Icon;
  disabled?: boolean;
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
  icon,
  disabled,
}: TextProps) {
  const id = useId();
  return (
    <Field
      label={label}
      error={error}
      hint={hint}
      required={required}
      className={className}
      icon={icon}
      htmlFor={id}
    >
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        dir={dir}
        type={type}
        inputMode={inputMode}
        maxLength={maxLength}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        className={cn(controlBase, controlState(error), "h-13 min-h-12 px-4 py-3 text-start", className && "")}
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
  icon,
}: Omit<TextProps, "dir" | "type" | "inputMode" | "maxLength" | "disabled">) {
  const id = useId();
  return (
    <Field label={label} error={error} hint={hint} className={className} icon={icon} htmlFor={id}>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        aria-invalid={Boolean(error)}
        className={cn(controlBase, controlState(error), "min-h-24 px-4 py-3")}
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
  icon,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; disabled?: boolean }[];
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  icon?: Icon;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <Field
      label={label}
      error={error}
      hint={hint}
      required={required}
      className={className}
      icon={icon}
      htmlFor={id}
    >
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        className={cn(
          controlBase,
          controlState(error),
          "h-12 cursor-pointer px-4 disabled:cursor-not-allowed disabled:opacity-60",
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
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
  icon,
  disabled,
  hint,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  error?: string;
  required?: boolean;
  icon?: Icon;
  disabled?: boolean;
  hint?: string;
  className?: string;
}) {
  return (
    <Field label={label} error={error} required={required} icon={icon} hint={hint} className={className}>
      <div className="flex flex-wrap gap-2.5" role="group" aria-label={label}>
        {options.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => onChange(o.value)}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-2xl border-2 px-5 text-sm font-black transition",
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-soft"
                  : "border-border bg-background text-foreground hover:border-primary/50",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              {active ? <Check className="size-4" /> : null}
              {o.label}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

/** Read-only value shown as a locked, system-determined field. */
export function LockedField({
  label,
  value,
  icon,
  note,
  className,
}: {
  label: string;
  value: string;
  icon?: Icon;
  note?: string;
  className?: string;
}) {
  return (
    <Field label={label} icon={icon} hint={note} className={className}>
      <div className="flex h-12 items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-primary/35 bg-primary/[0.06] px-4">
        <span className="truncate text-base font-black text-primary">{value || "—"}</span>
        <Lock className="size-4 shrink-0 text-primary/60" />
      </div>
    </Field>
  );
}

/**
 * Wraps pre-filled (Step 0) fields: a native disabled fieldset makes every
 * input/select inside read-only, with a lock chip explaining how to change it.
 */
export function LockedGroup({
  locked,
  title = "بيانات مثبتة من حجز المقعد",
  children,
  className,
}: {
  locked?: boolean;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  if (!locked) return <>{children}</>;
  return (
    <div className={cn("relative rounded-3xl border-2 border-dashed border-primary/30 bg-primary/[0.04] p-4 sm:p-5", className)}>
      <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-[11px] font-black text-primary">
        <Lock className="size-3.5" />
        {title}
      </span>
      <LockedFieldsContext.Provider value>
        <fieldset disabled className="min-w-0 opacity-90">
          {children}
        </fieldset>
      </LockedFieldsContext.Provider>
    </div>
  );
}

/** Searchable country picker — no free text allowed. */
export function CountryField({
  label,
  value,
  onChange,
  error,
  required,
  className,
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
  className?: string;
  icon?: Icon;
}) {
  const [open, setOpen] = useState(false);
  const selected = COUNTRIES.find((c) => c.ar === value);

  return (
    <Field label={label} error={error} required={required} className={className} icon={icon}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              controlBase,
              controlState(error),
              "h-12 justify-between px-4 text-start hover:bg-background",
            )}
          >
            <span className={cn("truncate", !selected && "font-normal text-muted-foreground")}>
              {selected?.ar ?? "ابحث واختر الدولة"}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command className="pointer-events-auto">
            <div className="flex items-center gap-2 border-b px-3">
              <Search className="size-4 shrink-0 opacity-50" />
              <CommandInput placeholder="ابحث عن الدولة..." className="h-11 border-0" />
            </div>
            <CommandList className="max-h-64">
              <CommandEmpty>لا توجد نتائج مطابقة</CommandEmpty>
              <CommandGroup>
                {COUNTRIES.map((c) => (
                  <CommandItem
                    key={c.code}
                    value={c.ar}
                    onSelect={() => {
                      onChange(c.ar);
                      setOpen(false);
                    }}
                    className="cursor-pointer text-sm font-bold"
                  >
                    <Check className={cn("size-4", value === c.ar ? "opacity-100" : "opacity-0")} />
                    {c.ar}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </Field>
  );
}

/* -------------------------------------------------------------------------- */
/*  Status states                                                              */
/* -------------------------------------------------------------------------- */

export function StatusNote({
  tone,
  title,
  children,
  icon: IconCmp,
}: {
  tone: "success" | "warning" | "error" | "info";
  title: string;
  children?: ReactNode;
  icon?: Icon;
}) {
  const tones = {
    success: "border-mint bg-mint/60 text-foreground",
    warning: "border-gold/60 bg-gold/25 text-gold-foreground",
    error: "border-destructive/40 bg-destructive/10 text-destructive",
    info: "border-sky bg-sky/60 text-foreground",
  } as const;

  return (
    <div className={cn("flex items-start gap-3 rounded-2xl border-2 p-4", tones[tone])}>
      {IconCmp ? <IconCmp className="mt-0.5 size-5 shrink-0" /> : null}
      <div className="min-w-0">
        <p className="text-sm font-black">{title}</p>
        {children ? <div className="mt-1 text-sm leading-relaxed opacity-90">{children}</div> : null}
      </div>
    </div>
  );
}
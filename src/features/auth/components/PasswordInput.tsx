import { Eye, EyeOff, Lock } from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { passwordStrength } from "../rbac";

type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  showStrength?: boolean;
  error?: string;
};

export function PasswordInput({
  id,
  value,
  onChange,
  placeholder = "••••••••",
  autoComplete = "current-password",
  showStrength = false,
  error,
}: Props) {
  const [visible, setVisible] = useState(false);
  const strength = passwordStrength(value);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Lock className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type={visible ? "text" : "password"}
          dir="ltr"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className="h-12 rounded-2xl border-border/70 bg-background/80 ps-10 pe-12 text-start text-base transition-all focus-visible:ring-4 focus-visible:ring-primary/15"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
          className="absolute top-1/2 end-2 -translate-y-1/2 rounded-xl p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>

      {showStrength && value.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex gap-1.5" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  i < strength.score ? strength.color : "bg-border"
                }`}
              />
            ))}
          </div>
          <p className="text-xs font-semibold text-muted-foreground">
            قوة كلمة المرور: <span className="text-foreground">{strength.label}</span>
          </p>
        </div>
      )}

      {error && (
        <p id={`${id}-error`} className="text-xs font-semibold text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
/**
 * Branded confirmation dialogs — replaces the browser's native window.confirm
 * with an RTL, design-system dialog. Usage:
 *
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: "…", description: "…", tone: "danger" }))) return;
 */
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, ShieldQuestion } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export type ConfirmOptions = {
  title: string;
  description?: string | undefined;
  confirmLabel?: string | undefined;
  cancelLabel?: string | undefined;
  tone?: "default" | "danger" | undefined;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((next) => {
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function settle(value: boolean) {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  }

  const danger = options?.tone === "danger";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={!!options} onOpenChange={(open) => !open && settle(false)}>
        <AlertDialogContent dir="rtl" className="max-w-md rounded-[1.75rem] border-border/60 p-0 text-right">
          <div
            className={cn(
              "rounded-t-[1.75rem] px-6 pb-5 pt-6",
              danger ? "bg-destructive/10" : "bg-primary/10",
            )}
          >
            <AlertDialogHeader className="space-y-3 text-right">
              <span
                className={cn(
                  "grid size-12 place-items-center rounded-2xl",
                  danger ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary",
                )}
              >
                {danger ? (
                  <AlertTriangle className="size-6" />
                ) : (
                  <ShieldQuestion className="size-6" />
                )}
              </span>
              <AlertDialogTitle className="text-lg font-black text-foreground">
                {options?.title}
              </AlertDialogTitle>
              {options?.description ? (
                <AlertDialogDescription className="text-sm font-semibold leading-relaxed text-muted-foreground">
                  {options.description}
                </AlertDialogDescription>
              ) : null}
            </AlertDialogHeader>
          </div>

          <AlertDialogFooter className="flex-row-reverse gap-2 px-6 pb-6 pt-4 sm:justify-start">
            <AlertDialogAction
              onClick={() => settle(true)}
              className={cn(
                "rounded-2xl px-6 font-black shadow-soft",
                danger && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
              )}
            >
              {options?.confirmLabel ?? "تأكيد"}
            </AlertDialogAction>
            <AlertDialogCancel className="rounded-2xl px-6 font-bold">
              {options?.cancelLabel ?? "إلغاء"}
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

/** Returns an async confirm() that resolves to true when the user accepts. */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  const fallback = useCallback<ConfirmFn>(
    async (options) =>
      typeof window === "undefined"
        ? false
        : window.confirm([options.title, options.description].filter(Boolean).join("\n\n")),
    [],
  );
  return ctx ?? fallback;
}

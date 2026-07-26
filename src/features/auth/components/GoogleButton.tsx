import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

export function GoogleButton({ label }: { label: string }) {
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) throw new Error(error.message);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذّر تسجيل الدخول عبر جوجل، حاول لاحقًا.",
      );
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="group flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-border/70 bg-background/90 text-sm font-bold text-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/40 disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="size-5 animate-spin text-primary" />
      ) : (
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
          <path
            fill="#EA4335"
            d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1A6.2 6.2 0 1 1 12 5.8c1.6 0 3 .6 4 1.6l2.7-2.6A9.7 9.7 0 0 0 12 2a10 10 0 1 0 0 20c5.8 0 9.6-4 9.6-9.7 0-.7-.07-1.2-.17-1.7H12z"
          />
        </svg>
      )}
      {label}
    </button>
  );
}
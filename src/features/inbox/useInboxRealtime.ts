import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

/**
 * Live alerts for the inbox page: toasts + cache refresh whenever a new contact
 * message or parent review arrives, or a colleague logs an action.
 */
export function useInboxRealtime(enabled: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel("inbox-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "contact_messages" },
        (payload) => {
          const row = payload.new as { name?: string; subject?: string | null };
          toast.info("رسالة جديدة وصلت الآن", {
            description: `${row.name ?? "ولي أمر"}${row.subject ? ` — ${row.subject}` : ""}`,
          });
          queryClient.invalidateQueries({ queryKey: ["contact-messages"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "contact_messages" },
        () => queryClient.invalidateQueries({ queryKey: ["contact-messages"] }),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "site_testimonials" },
        (payload) => {
          const row = payload.new as { name?: string; rating?: number };
          toast.info("تقييم جديد بانتظار المراجعة", {
            description: `${row.name ?? "ولي أمر"} — ${row.rating ?? 5}/5`,
          });
          queryClient.invalidateQueries({ queryKey: ["site-testimonials"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "site_testimonials" },
        () => queryClient.invalidateQueries({ queryKey: ["site-testimonials"] }),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "inbox_events" },
        () => queryClient.invalidateQueries({ queryKey: ["inbox-events"] }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);
}

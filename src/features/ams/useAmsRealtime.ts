import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useId } from "react";

import { supabase } from "@/integrations/supabase/client";

const TABLES = ["applications", "application_events", "application_notes", "application_documents"] as const;

/**
 * Keeps every AMS screen live. A single shared channel invalidates the `ams`
 * query namespace whenever an admission record changes anywhere.
 */
export function useAmsRealtime(onChange?: () => void) {
  const queryClient = useQueryClient();
  const instanceId = useId();

  useEffect(() => {
    // Unique channel per hook instance: reusing one name across simultaneously
    // mounted components hits an already-subscribed channel.
    const channel = supabase.channel(`ams-live:${instanceId}:${Math.random().toString(36).slice(2)}`);
    for (const table of TABLES) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        queryClient.invalidateQueries({ queryKey: ["ams"] });
        onChange?.();
      });
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, instanceId]);
}
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";

const TABLES = ["applications", "application_events", "application_notes", "application_documents"] as const;

/**
 * Keeps every AMS screen live. A single shared channel invalidates the `ams`
 * query namespace whenever an admission record changes anywhere.
 */
export function useAmsRealtime(onChange?: () => void) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase.channel("ams-live");
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
  }, [queryClient]);
}
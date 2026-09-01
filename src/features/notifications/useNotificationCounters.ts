import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";

import { useAuth } from "@/features/auth/AuthProvider";
import { markNotificationKindRead, notificationCounters } from "./notifications.functions";

/** Notification kinds that drive sub-tab badges. */
export const NOTIFY_KINDS = {
  chat: "chat_message",
  studyPlan: "study_plan",
} as const;

/** Live unread counters per notification kind (shared cache with the header bell). */
export function useNotificationCounters() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["notifications", "counters", user?.id],
    queryFn: () => notificationCounters(),
    enabled: Boolean(user?.id),
    refetchInterval: 60_000,
  });
  return (data?.counts ?? {}) as Record<string, number>;
}

/** Clears a section's badge as soon as the user opens that section. */
export function useClearNotificationKind(kinds: string[]) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const clear = useServerFn(markNotificationKindRead);
  const mutation = useMutation({
    mutationFn: (list: string[]) => clear({ data: { kinds: list } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const key = kinds.join(",");
  useEffect(() => {
    if (!user?.id || !key) return;
    mutation.mutate(key.split(","));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, key]);
}

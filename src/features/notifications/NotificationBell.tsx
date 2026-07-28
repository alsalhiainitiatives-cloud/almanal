import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Bell, CheckCheck } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/features/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { markNotificationsRead, myNotifications } from "./notifications.functions";

function relative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `قبل ${minutes} دقيقة`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `قبل ${hours} ساعة`;
  return `قبل ${Math.round(hours / 24)} يوم`;
}

const TONE: Record<string, string> = {
  urgent: "border-destructive/50 bg-destructive/10",
  warning: "border-gold/50 bg-gold/12",
  success: "border-mint bg-mint/30",
  info: "border-border/60 bg-muted/25",
};

/** Internal notification inbox shared by staff and parents. */
export function NotificationBell() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const instanceId = useId();
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => myNotifications(),
    enabled: Boolean(user?.id),
    refetchInterval: 60_000,
  });

  const markRead = useServerFn(markNotificationsRead);
  const mark = useMutation({
    mutationFn: (ids: string[] | null) => markRead({ data: { ids } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notifications:${instanceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient, instanceId]);

  const rows = data?.rows ?? [];
  const unread = data?.unread ?? 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="relative rounded-2xl text-xs font-bold" aria-label="الإشعارات">
          <Bell className="size-4" />
          {unread > 0 ? (
            <span className="absolute -top-1.5 -start-1.5 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-extrabold text-primary-foreground">
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" dir="rtl" className="w-[360px] rounded-3xl p-0">
        <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
          <p className="text-sm font-extrabold text-foreground">الإشعارات الداخلية</p>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-xl text-[11px] font-bold text-muted-foreground"
            disabled={unread === 0 || mark.isPending}
            onClick={() => mark.mutate(null)}
          >
            <CheckCheck className="size-3.5" /> تعليم الكل كمقروء
          </Button>
        </div>
        <div className="max-h-[380px] space-y-1.5 overflow-y-auto p-2">
          {rows.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs font-bold text-muted-foreground">لا توجد إشعارات بعد.</p>
          ) : (
            rows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => {
                  if (!row.read_at) mark.mutate([row.id]);
                  if (row.link) {
                    setOpen(false);
                    navigate({ to: row.link });
                  }
                }}
                className={cn(
                  "w-full rounded-2xl border px-3 py-2.5 text-start transition-colors hover:bg-accent/50",
                  TONE[row.severity] ?? TONE.info,
                  !row.read_at && "ring-1 ring-primary/30",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[12px] font-extrabold leading-5 text-foreground">{row.title_ar}</p>
                  {!row.read_at ? <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" /> : null}
                </div>
                {row.body_ar ? (
                  <p className="mt-1 line-clamp-2 text-[11px] font-bold text-muted-foreground">{row.body_ar}</p>
                ) : null}
                <p className="mt-1 text-[10px] font-bold text-muted-foreground/80">{relative(row.created_at)}</p>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
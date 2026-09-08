import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CalendarClock, DoorClosed, DoorOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/AuthProvider";
import { amsSeasonStatus, amsSeasons } from "../seasons.functions";

/** Prominent open/close registration control, pinned above the AMS sidebar nav. */
export function RegistrationSwitch() {
  const queryClient = useQueryClient();
  const { isAuthenticated, initializing } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["ams", "seasons"],
    queryFn: () => amsSeasons(),
    enabled: isAuthenticated && !initializing,
    retry: false,
  });

  const toggle = useMutation({
    mutationFn: (input: { id: string; status: "open" | "closed" }) => amsSeasonStatus({ data: input }),
    onSuccess: (_r, input) => {
      toast.success(input.status === "open" ? "تم فتح باب التسجيل" : "تم إغلاق باب التسجيل");
      void queryClient.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (error) return null;

  const seasons = data?.seasons ?? [];
  const active = seasons.find((s) => s.effectiveOpen) ?? null;
  const candidate = active ?? seasons.find((s) => s.status !== "closed") ?? seasons[0] ?? null;
  const open = Boolean(active);

  return (
    <div
      className={`rounded-3xl border p-4 shadow-sm ${
        open ? "border-mint bg-mint/25" : "border-destructive/40 bg-destructive/5"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`grid size-9 place-items-center rounded-2xl ${
            open ? "bg-emerald-600 text-white" : "bg-destructive text-destructive-foreground"
          }`}
        >
          {open ? <DoorOpen className="size-4" /> : <DoorClosed className="size-4" />}
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-black text-foreground">
            {isLoading ? "جارٍ التحقق…" : open ? "باب التسجيل مفتوح" : "باب التسجيل مغلق"}
          </p>
          <p className="truncate text-[10px] font-bold text-muted-foreground">
            {active ? active.name_ar : candidate ? candidate.name_ar : "لا يوجد موسم تسجيل"}
          </p>
        </div>
      </div>

      {active ? (
        <p className="mt-2 flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
          <CalendarClock className="size-3" />
          يغلق في {new Date(active.ends_at).toLocaleDateString("ar-SA")}
        </p>
      ) : null}

      {candidate ? (
        <Button
          variant={open ? "soft" : "hero"}
          className="mt-3 w-full rounded-2xl text-xs font-extrabold"
          disabled={toggle.isPending || isLoading}
          onClick={() => toggle.mutate({ id: candidate.id, status: open ? "closed" : "open" })}
        >
          {toggle.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
          {open ? "إغلاق باب التسجيل" : "فتح باب التسجيل"}
        </Button>
      ) : (
        <Button asChild variant="hero" className="mt-3 w-full rounded-2xl text-xs font-extrabold">
          <Link to="/ams/seasons">إنشاء موسم تسجيل</Link>
        </Button>
      )}

      <Button asChild variant="ghost" className="mt-1 w-full rounded-2xl text-[10px] font-bold">
        <Link to="/ams/seasons">إدارة مواسم التسجيل</Link>
      </Button>
    </div>
  );
}

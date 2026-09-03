import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

/**
 * Client-only auth gate.
 *
 * A router-level `beforeLoad` redirect on an `ssr: false` subtree runs during
 * hydration, so the client renders a different tree than the server shell and
 * React aborts hydration (error #418) — which can blank the whole screen.
 * Gating inside the component keeps the rendered tree stable: we show a spinner
 * until the session is known, then either render children or navigate to /auth.
 */
function AuthenticatedGate() {
  const navigate = useNavigate();
  // Captured once so the redirect target can't change and re-trigger the effect.
  const initialHref = useRef(useRouterState({ select: (s) => s.location.href }));
  const redirected = useRef(false);
  const [status, setStatus] = useState<"checking" | "authed" | "anon">("checking");

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data, error }) => {
      if (!mounted) return;
      setStatus(error || !data.user ? "anon" : "authed");
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (status !== "anon" || redirected.current) return;
    redirected.current = true;
    void navigate({ to: "/auth", search: { next: initialHref.current }, replace: true });
  }, [status, navigate]);

  if (status !== "authed") {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return <Outlet />;
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedGate,
});

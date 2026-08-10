import { createServerFn } from "@tanstack/react-start";

/**
 * Public (unauthenticated) view of the current registration window.
 * Used by the site-wide registration banner + countdown.
 */
export const publicRegistrationWindow = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const { publicSeasonSnapshot } = await import("./seasons.server");
  const supabase = createClient(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
  return publicSeasonSnapshot(supabase as never);
});

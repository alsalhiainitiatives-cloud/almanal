import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

import { buildBackupZip } from "@/features/ams/backup.server";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/api/ams/backup")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
        if (!token) return new Response("Unauthorized", { status: 401 });

        const supabase = createClient<Database>(
          process.env["SUPABASE_URL"]!,
          process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"]!,
          {
            auth: { persistSession: false, autoRefreshToken: false },
            global: { headers: { Authorization: `Bearer ${token}` } },
          },
        );

        const { data: userData, error } = await supabase.auth.getUser(token);
        if (error || !userData.user) return new Response("Unauthorized", { status: 401 });

        const url = new URL(request.url);
        try {
          const { bytes, fileName } = await buildBackupZip(supabase, userData.user.id, {
            academicYear: url.searchParams.get("year"),
            includeFiles: url.searchParams.get("files") !== "0",
          });
          return new Response(bytes as unknown as BodyInit, {
            headers: {
              "content-type": "application/zip",
              "content-disposition": `attachment; filename="${fileName}"`,
              "cache-control": "no-store",
            },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "error";
          return new Response(message === "forbidden" ? "Forbidden" : "Backup failed", {
            status: message === "forbidden" ? 403 : 500,
          });
        }
      },
    },
  },
});
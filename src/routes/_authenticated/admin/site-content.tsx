import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/site-content")({
  beforeLoad: () => {
    throw redirect({ to: "/ams/website/settings", replace: true });
  },
});

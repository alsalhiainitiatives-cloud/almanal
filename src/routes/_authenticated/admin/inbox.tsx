import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/inbox")({
  beforeLoad: () => {
    throw redirect({ to: "/ams/website/inbox", replace: true });
  },
});

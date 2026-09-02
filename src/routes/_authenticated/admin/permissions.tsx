import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/permissions")({
  beforeLoad: () => {
    throw redirect({ to: "/ams/system/permissions", replace: true });
  },
});

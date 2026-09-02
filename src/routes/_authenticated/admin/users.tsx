import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/users")({
  beforeLoad: () => {
    throw redirect({ to: "/ams/system/users", replace: true });
  },
});

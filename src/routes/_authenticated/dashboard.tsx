import { createFileRoute, redirect } from "@tanstack/react-router";

/** Merged into the profile page — kept as a permanent redirect for old links. */
export const Route = createFileRoute("/_authenticated/dashboard")({
  beforeLoad: () => {
    throw redirect({ to: "/profile", replace: true });
  },
});

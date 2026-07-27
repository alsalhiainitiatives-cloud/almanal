import { createFileRoute, redirect } from "@tanstack/react-router";

/** Merged into the unified "المراحل والتسجيل" page. */
export const Route = createFileRoute("/stages")({
  beforeLoad: () => {
    throw redirect({ to: "/admissions", replace: true });
  },
  component: () => null,
});

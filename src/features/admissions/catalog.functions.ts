import { createServerFn } from "@tanstack/react-start";

import { fetchCatalog, fetchStageBundle, fetchStages } from "./catalog.server";

export const listStages = createServerFn({ method: "GET" }).handler(async () => fetchStages());

export const getStageBundle = createServerFn({ method: "GET" })
  .inputValidator((slug: string) => String(slug).slice(0, 60))
  .handler(async ({ data }) => fetchStageBundle(data));

export const getAdmissionCatalog = createServerFn({ method: "GET" }).handler(async () =>
  fetchCatalog(),
);
import { createContext, useContext, useMemo, type ReactNode } from "react";

import { useClassroomMediaUrls } from "@/lib/classroom-media";
import { DEFAULT_SITE_CONTENT, type SiteContent } from "./defaults";

const SiteContentContext = createContext<SiteContent>(DEFAULT_SITE_CONTENT);

export function SiteContentProvider({
  content,
  children,
}: {
  content: SiteContent | undefined;
  children: ReactNode;
}) {
  const value = useMemo(() => content ?? DEFAULT_SITE_CONTENT, [content]);
  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>;
}

export function useSiteContent(): SiteContent {
  return useContext(SiteContentContext);
}

/** Resolves a logo value that may be an absolute URL or a storage path. */
export function useBrandLogoUrl(): string {
  const { brand } = useSiteContent();
  const isPath = !!brand.logoUrl && !/^https?:\/\//i.test(brand.logoUrl);
  const urls = useClassroomMediaUrls(isPath ? [brand.logoUrl] : []);
  if (!brand.logoUrl) return "";
  return isPath ? (urls[brand.logoUrl] ?? "") : brand.logoUrl;
}
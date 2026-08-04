import type { LegalDoc } from "./defaults";
import { useSiteContent } from "./SiteContentProvider";

/** Public route for a legal doc: privacy/terms get clean paths, others /legal/{slug}. */
export function legalDocPath(slug: string): string {
  return slug === "privacy" || slug === "terms" ? `/${slug}` : `/legal/${slug}`;
}

/** All legal docs visible on the public site (footer links included). */
export function useVisibleLegalDocs(): LegalDoc[] {
  const { legal } = useSiteContent();
  return (legal?.docs ?? []).filter((doc) => doc.visible && doc.slug.trim() !== "");
}

/** One legal doc by slug — returns undefined when hidden or missing. */
export function useLegalDoc(slug: string): LegalDoc | undefined {
  const { legal } = useSiteContent();
  return (legal?.docs ?? []).find((doc) => doc.slug === slug && doc.visible);
}

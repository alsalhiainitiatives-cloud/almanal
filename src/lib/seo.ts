/**
 * Single source of truth for the public site's SEO metadata.
 *
 * All values are rendered through TanStack Start route `head()` options, so
 * they exist in the server-rendered HTML (no client-only injection).
 */

/** Canonical production origin — https, no www, no trailing path. */
export const SITE_URL = "https://almanal.site";

export const SITE_NAME = "مدارس وروضة المنال";

/** Official public logo already used by the site (verified publicly reachable). */
export const LOGO_URL =
  "https://pzoprbsuvcjqycyoeivm.supabase.co/storage/v1/object/public/branding/4Rl0acSq_400x400.jpg";

/** Absolute canonical URL for a public route path ("/" keeps its trailing slash). */
export function absoluteUrl(path: string): string {
  if (path === "/") return `${SITE_URL}/`;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

type PageSeo = {
  /** Route path, e.g. "/about". */
  path: string;
  title: string;
  description: string;
  type?: "website" | "article";
  image?: string;
};

/**
 * Builds the per-page head block: unique title/description, a self-referencing
 * canonical, Open Graph and Twitter/X cards.
 */
export function pageHead({ path, title, description, type = "website", image = LOGO_URL }: PageSeo) {
  const url = absoluteUrl(path);
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: type },
      { property: "og:url", content: url },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:locale", content: "ar_SA" },
      { property: "og:image", content: image },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: image },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

/** BreadcrumbList JSON-LD for an internal public page (home → page). */
export function breadcrumbScript(items: { name: string; path: string }[]) {
  return {
    type: "application/ld+json",
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: absoluteUrl(item.path),
      })),
    }),
  };
}

/**
 * Homepage-only WebSite + EducationalOrganization graph with stable @id values.
 * Contains only information present in the application — nothing invented.
 */
export function siteGraphScript(org: {
  name: string;
  shortName: string;
  description: string;
  organization: string;
  phoneIntl: string;
  email: string;
  address: { line1: string; district: string };
}) {
  return {
    type: "application/ld+json",
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          "@id": `${SITE_URL}/#website`,
          url: `${SITE_URL}/`,
          name: org.name,
          alternateName: org.shortName,
          inLanguage: "ar-SA",
          publisher: { "@id": `${SITE_URL}/#organization` },
        },
        {
          "@type": "EducationalOrganization",
          "@id": `${SITE_URL}/#organization`,
          name: org.name,
          alternateName: org.shortName,
          description: org.description,
          url: `${SITE_URL}/`,
          logo: LOGO_URL,
          image: LOGO_URL,
          telephone: org.phoneIntl,
          email: org.email,
          parentOrganization: { "@type": "Organization", name: org.organization },
          address: {
            "@type": "PostalAddress",
            streetAddress: `${org.address.line1}, ${org.address.district}`,
            addressLocality: "عنيزة",
            addressRegion: "القصيم",
            postalCode: "56417",
            addressCountry: "SA",
          },
          areaServed: { "@type": "City", name: "عنيزة" },
          openingHours: "Su-Th 07:00-12:30",
        },
      ],
    }),
  };
}

import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

/** Canonical production origin. All sitemap URLs are absolute against this. */
const BASE_URL = "https://almanal.site";

/**
 * Public, indexable, canonical routes only.
 * Verified against src/routes: excludes /auth, /forgot-password, /reset-password,
 * /invite/$token, /track, /api/*, and every route under _authenticated.
 */
const PUBLIC_PATHS = [
  "/",
  "/about",
  "/admissions",
  "/stages",
  "/kindergarten",
  "/primary",
  "/school-life",
  "/news",
  "/gallery",
  "/testimonials",
  "/faq",
  "/contact",
  "/privacy",
  "/terms",
] as const;

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () => {
        const urls = PUBLIC_PATHS.map(
          (path) => `  <url>\n    <loc>${BASE_URL}${path}</loc>\n  </url>`,
        );

        const xml =
          `<?xml version="1.0" encoding="UTF-8"?>\n` +
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
          `${urls.join("\n")}\n` +
          `</urlset>\n`;

        return new Response(xml, {
          status: 200,
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
            "X-Robots-Tag": "noindex",
          },
        });
      },
    },
  },
});

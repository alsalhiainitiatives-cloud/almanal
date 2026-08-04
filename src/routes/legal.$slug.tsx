import { createFileRoute } from "@tanstack/react-router";

import { LegalDocument, LegalNotAvailable } from "@/components/site/LegalDocument";
import { useLegalDoc } from "@/features/site-content/legal";

export const Route = createFileRoute("/legal/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: "سياسات ووثائق — روضة ومدارس المنال" },
      {
        name: "description",
        content: "الوثائق والسياسات المعتمدة من إدارة روضة ومدارس المنال بالعنيزة.",
      },
      { property: "og:title", content: "سياسات ووثائق — روضة ومدارس المنال" },
      {
        property: "og:description",
        content: "الوثائق والسياسات المعتمدة من إدارة روضة ومدارس المنال بالعنيزة.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: `https://almanal.lovable.app/legal/${params.slug}` },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `https://almanal.lovable.app/legal/${params.slug}` }],
  }),
  component: LegalSlugPage,
});

function LegalSlugPage() {
  const { slug } = Route.useParams();
  const doc = useLegalDoc(slug);
  return doc ? <LegalDocument doc={doc} /> : <LegalNotAvailable />;
}

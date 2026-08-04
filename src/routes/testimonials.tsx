import { createFileRoute } from "@tanstack/react-router";

import { PageHero } from "@/components/site/PageHero";
import { Testimonials } from "@/components/site/Testimonials";
import { useSiteContent } from "@/features/site-content/SiteContentProvider";

const title = "آراء أولياء الأمور | مدارس وروضة المنال";
const description =
  "تجارب حقيقية لأسر رافقت أطفالها في مدارس وروضة المنال بعنيزة — آراء وتقييمات أولياء الأمور عن الحضانة وبرنامج المونتيسوري والمرحلة الابتدائية.";

export const Route = createFileRoute("/testimonials")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/testimonials" }],
  }),
  component: TestimonialsPage,
});

function TestimonialsPage() {
  const hero = useSiteContent().pages.testimonials;

  return (
    <>
      <PageHero
        eyebrow={hero?.eyebrow ?? "آراء أولياء الأمور"}
        title={hero?.title ?? "ثقة الأسر هي أجمل شهادة"}
        description={hero?.description ?? ""}
        image={hero?.image}
      />
      <section className="section-y pt-4 md:pt-8">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <Testimonials />
        </div>
      </section>
    </>
  );
}

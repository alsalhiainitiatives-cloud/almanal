import { createFileRoute } from "@tanstack/react-router";

import { NewsCards } from "@/components/site/NewsCards";
import { PageHero } from "@/components/site/PageHero";
import { useSiteContent } from "@/features/site-content/SiteContentProvider";

const title = "الأخبار والفعاليات | مدارس وروضة المنال";
const description =
  "آخر أخبار وفعاليات مدارس وروضة المنال بعنيزة: اليوم المفتوح، برامج التدريب، الأنشطة الطلابية، وحفلات التكريم.";

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/news" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/news" }],
  }),
  component: NewsPage,
});

function NewsPage() {
  const hero = useSiteContent().pages.news;
  return (
    <>
      <PageHero
        eyebrow={hero?.eyebrow ?? "الأخبار"}
        title={hero?.title ?? "آخر ما يحدث في المنال"}
        description={hero?.description ?? ""}
        image={hero?.image}
      />
      <section className="section-y pt-4 md:pt-8">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <NewsCards />
        </div>
      </section>
    </>
  );
}
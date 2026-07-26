import { createFileRoute } from "@tanstack/react-router";

import { NewsCards } from "@/components/site/NewsCards";
import { PageHero } from "@/components/site/PageHero";

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
    ],
    links: [{ rel: "canonical", href: "/news" }],
  }),
  component: NewsPage,
});

function NewsPage() {
  return (
    <>
      <PageHero
        eyebrow="الأخبار"
        title="آخر ما يحدث في المنال"
        description="نشارككم فعالياتنا وبرامجنا وإنجازات طلابنا ومعلماتنا خلال العام الدراسي."
      />
      <section className="section-y">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <NewsCards />
        </div>
      </section>
    </>
  );
}
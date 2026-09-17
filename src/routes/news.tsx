import { createFileRoute } from "@tanstack/react-router";

import { breadcrumbScript, pageHead } from "@/lib/seo";

import { NewsCards } from "@/components/site/NewsCards";
import { PageHero } from "@/components/site/PageHero";
import { useSiteContent } from "@/features/site-content/SiteContentProvider";


export const Route = createFileRoute("/news")({
  head: () => ({
    ...pageHead({
      path: "/news",
      title: "أخبار وفعاليات مدارس وروضة المنال",
      description:
        "آخر أخبار وفعاليات مدارس وروضة المنال بعنيزة: اليوم المفتوح، برامج التدريب، الأنشطة الطلابية، وحفلات التكريم.",
    }),
    scripts: [
      breadcrumbScript([
        { name: "الرئيسية", path: "/" },
        { name: "الأخبار", path: "/news" },
      ]),
    ],
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
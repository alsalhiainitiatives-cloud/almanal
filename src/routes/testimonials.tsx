import { createFileRoute } from "@tanstack/react-router";

import { breadcrumbScript, pageHead } from "@/lib/seo";

import { PageHero } from "@/components/site/PageHero";
import { SectionShell } from "@/components/site/SectionShell";
import { Testimonials } from "@/components/site/Testimonials";
import { useSiteContent } from "@/features/site-content/SiteContentProvider";


export const Route = createFileRoute("/testimonials")({
  head: () => ({
    ...pageHead({
      path: "/testimonials",
      title: "آراء أولياء الأمور | مدارس وروضة المنال",
      description:
        "تجارب حقيقية لأسر رافقت أطفالها في مدارس وروضة المنال بعنيزة — آراء أولياء الأمور عن الحضانة وبرنامج المونتيسوري وابتدائية المنال.",
    }),
    scripts: [
      breadcrumbScript([
        { name: "الرئيسية", path: "/" },
        { name: "آراء أولياء الأمور", path: "/testimonials" },
      ]),
    ],
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
      <SectionShell id="reviews" index={1} tone="soft" width="mid">
        <Testimonials />
      </SectionShell>
    </>
  );
}

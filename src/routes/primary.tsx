import { createFileRoute } from "@tanstack/react-router";

import { breadcrumbScript, pageHead } from "@/lib/seo";

import { ProgramPage } from "@/components/site/ProgramPage";
import { programs } from "@/data/programs";


export const Route = createFileRoute("/primary")({
  head: () => ({
    ...pageHead({
      path: "/primary",
      title: "المرحلة الابتدائية | مدارس وروضة المنال في عنيزة",
      description:
        "ابتدائية المنال من الصف الأول إلى السادس: مناهج وزارة التعليم مع برامج إثرائية، أندية أسبوعية، وتقييم مستمر وتقارير لأولياء الأمور.",
    }),
    scripts: [
      breadcrumbScript([
        { name: "الرئيسية", path: "/" },
        { name: "المرحلة الابتدائية", path: "/primary" },
      ]),
    ],
  }),
  component: () => <ProgramPage program={programs.primary} />,
});

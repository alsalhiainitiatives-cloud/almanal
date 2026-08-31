import { createFileRoute } from "@tanstack/react-router";

import { ProgramPage } from "@/components/site/ProgramPage";
import { programs } from "@/data/programs";

const title = "ابتدائية المنال | مدارس وروضة المنال بعنيزة";
const description =
  "ابتدائية المنال من الصف الأول إلى السادس: مناهج وزارة التعليم مع برامج إثرائية، أندية أسبوعية، وتقييم مستمر وتقارير لأولياء الأمور.";

export const Route = createFileRoute("/primary")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/primary" },
    ],
    links: [{ rel: "canonical", href: "/primary" }],
  }),
  component: () => <ProgramPage program={programs.primary} />,
});

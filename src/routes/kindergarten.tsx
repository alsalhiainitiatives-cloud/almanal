import { createFileRoute } from "@tanstack/react-router";

import { ProgramPage } from "@/components/site/ProgramPage";
import { programs } from "@/data/programs";

const title = "برنامج الروضة | مدارس وروضة المنال بعنيزة";
const description =
  "روضة المنال: منهج مونتيسوري، تهيئة لغوية عربية وإنجليزية، قرآن وقيم، وأنشطة أسبوعية للأطفال من أقل من 3 سنوات حتى 6 سنوات.";

export const Route = createFileRoute("/kindergarten")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/kindergarten" },
    ],
    links: [{ rel: "canonical", href: "/kindergarten" }],
  }),
  component: () => <ProgramPage program={programs.kindergarten} />,
});

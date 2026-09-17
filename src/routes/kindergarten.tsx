import { createFileRoute } from "@tanstack/react-router";

import { breadcrumbScript, pageHead } from "@/lib/seo";

import { ProgramPage } from "@/components/site/ProgramPage";
import { programs } from "@/data/programs";


export const Route = createFileRoute("/kindergarten")({
  head: () => ({
    ...pageHead({
      path: "/kindergarten",
      title: "الروضة | مدارس وروضة المنال في عنيزة",
      description:
        "روضة المنال: منهج مونتيسوري، تهيئة لغوية عربية وإنجليزية، قرآن وقيم، وأنشطة أسبوعية للأطفال من أقل من ٣ سنوات حتى ٦ سنوات.",
    }),
    scripts: [
      breadcrumbScript([
        { name: "الرئيسية", path: "/" },
        { name: "الروضة", path: "/kindergarten" },
      ]),
    ],
  }),
  component: () => <ProgramPage program={programs.kindergarten} />,
});

/**
 * Editable public-website content model.
 * Defaults mirror the static content in `@/data/site`; the CMS stores only
 * overrides in `public.site_content` (key = 'site').
 */
import { faqs, navLinks, news, school, stats, testimonials, values, workingHours } from "@/data/site";

export type Social = { label: string; icon: string; url: string };
export type HourRow = { day: string; hours: string; closed: boolean };
export type NavItem = { label: string; to: string };
export type StatItem = { value: number; suffix: string; label: string };
export type ValueItem = { title: string; description: string; icon: string; tone: string };
export type TestimonialItem = { name: string; role: string; quote: string };
export type NewsItem = {
  slug: string;
  title: string;
  date: string;
  dateLabel: string;
  category: string;
  excerpt: string;
};
export type FaqItem = { q: string; a: string };
export type IconCard = { icon: string; title: string; body: string };
export type PageHeroContent = { eyebrow: string; title: string; description: string };

export type SiteContent = {
  brand: {
    name: string;
    shortName: string;
    organization: string;
    tagline: string;
    description: string;
    /** Public https URL or a `classroom-media` storage path. */
    logoUrl: string;
  };
  contact: {
    phone: string;
    phoneIntl: string;
    email: string;
    line1: string;
    district: string;
    city: string;
    country: string;
    mapLink: string;
    hoursSummary: string;
  };
  workingHours: HourRow[];
  socials: Social[];
  nav: NavItem[];
  stats: StatItem[];
  values: ValueItem[];
  testimonials: TestimonialItem[];
  news: NewsItem[];
  faqs: FaqItem[];
  pages: Record<string, PageHeroContent>;
  home: {
    missionCards: IconCard[];
    marquee: string[];
    aboutEyebrow: string;
    aboutTitle: string;
    aboutDescription: string;
  };
  about: {
    storyEyebrow: string;
    storyTitle: string;
    storyDescription: string;
    highlights: IconCard[];
    pillars: IconCard[];
  };
};

export const DEFAULT_SITE_CONTENT: SiteContent = {
  brand: {
    name: school.name,
    shortName: school.shortName,
    organization: school.organization,
    tagline: school.tagline,
    description: school.description,
    logoUrl: "",
  },
  contact: {
    phone: school.phone,
    phoneIntl: school.phoneIntl,
    email: school.email,
    line1: school.address.line1,
    district: school.address.district,
    city: school.address.city,
    country: school.address.country,
    mapLink: school.mapLink,
    hoursSummary: "الأحد – الخميس · 7:00 ص – 12:30 م",
  },
  workingHours: workingHours.map((row) => ({ ...row })),
  socials: [
    { label: "تويتر / إكس", icon: "Twitter", url: "" },
    { label: "إنستقرام", icon: "Instagram", url: "" },
    { label: "تلقرام", icon: "Send", url: "" },
  ],
  nav: navLinks.map((link) => ({ label: link.label, to: link.to })),
  stats: stats.map((s) => ({ ...s })),
  values: values.map((v) => ({ ...v })),
  testimonials: testimonials.map((t) => ({ ...t })),
  news: news.map((n) => ({ ...n })),
  faqs: faqs.map((f) => ({ ...f })),
  pages: {
    about: {
      eyebrow: "عن المنال",
      title: "مشروع تربوي وُلد من قلب المجتمع",
      description: `${school.name} مشروع تعليمي تابع لـ${school.organization}، يقدّم تعليمًا نوعيًا للطفولة المبكرة والمرحلة الابتدائية في محافظة عنيزة.`,
    },
    contact: {
      eyebrow: "تواصل معنا",
      title: "نرحّب بكم في حي الخزامي بعنيزة",
      description:
        "يمكنكم الاتصال بنا أو زيارة المدرسة خلال أوقات العمل، وسنكون سعداء باستقبالكم في جولة تعريفية.",
    },
    faq: {
      eyebrow: "الأسئلة الشائعة",
      title: "إجابات لأكثر ما يسأل عنه أولياء الأمور",
      description: "جمعنا لكم أهم الأسئلة حول القبول والبرامج والسلامة والتواصل.",
    },
  },
  home: {
    missionCards: [
      {
        icon: "Target",
        title: "رسالتنا",
        body: "تقديم تعليم نوعي يوازن بين المعرفة والقيم، ويجعل من كل طفل متعلمًا واثقًا محبًا للخير.",
      },
      {
        icon: "Sparkles",
        title: "رؤيتنا",
        body: "أن نكون الخيار الأول للأسر في عنيزة في تعليم الطفولة المبكرة والمرحلة الابتدائية.",
      },
      {
        icon: "Heart",
        title: "قيمنا",
        body: "الأمان، الرحمة، الإتقان، والشراكة الحقيقية مع الأسرة في كل خطوة.",
      },
    ],
    marquee: ["تعليم بمحبة", "قيم إسلامية", "بيئة آمنة", "مونتيسوري معتمد", "أنشطة ممتعة"],
    aboutEyebrow: "عن المنال",
    aboutTitle: "مشروع تربوي تابع للجمعية الأهلية الصالحية بعنيزة",
    aboutDescription: school.description,
  },
  about: {
    storyEyebrow: "قصتنا",
    storyTitle: "نبني إنسانًا قبل أن نبني متعلمًا",
    storyDescription:
      "بدأت المنال بفكرة بسيطة: أن يجد الطفل في مدرسته الأمان الذي يجده في بيته، والفرح الذي يجعله يحب التعلّم. اليوم نرافق مئات الأطفال من الحضانة حتى الصف السادس عبر برامج مدروسة ومعلمات يحملن هذه الرسالة.",
    highlights: [
      {
        icon: "Building2",
        title: "حرم مدرسي واحد متكامل",
        body: "جميع المراحل في مبنى واحد مهيأ بحي الخزامي، ما يسهّل على الأسرة متابعة أبنائها.",
      },
      {
        icon: "Users",
        title: "كادر نسائي مؤهل",
        body: "معلمات ومربيات مدربات على مناهج الطفولة المبكرة وبرنامج المونتيسوري.",
      },
      {
        icon: "ShieldCheck",
        title: "معايير سلامة صارمة",
        body: "إجراءات دخول وخروج منظمة، إشراف دائم، وخطط طوارئ يتم تدريب الكادر عليها.",
      },
    ],
    pillars: [
      {
        icon: "Target",
        title: "رسالتنا",
        body: "تقديم تعليم نوعي يوازن بين المعرفة والقيم، ويجعل من كل طفل متعلمًا واثقًا محبًا للخير ومسؤولًا عن نفسه ومجتمعه.",
      },
      {
        icon: "Sparkles",
        title: "رؤيتنا",
        body: "أن نكون الخيار الأول للأسر في عنيزة في تعليم الطفولة المبكرة والمرحلة الابتدائية، بمعايير تُقارن بأفضل المدارس العالمية.",
      },
      {
        icon: "Heart",
        title: "قيمنا",
        body: "الأمان، الرحمة، الإتقان، الشراكة مع الأسرة، والانتماء لهويتنا الإسلامية.",
      },
    ],
  },
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/** Deep-merges stored overrides over the static defaults (arrays replace wholesale). */
export function mergeSiteContent(overrides: unknown): SiteContent {
  const merge = (base: unknown, patch: unknown): unknown => {
    if (!isPlainObject(base) || !isPlainObject(patch)) return patch === undefined ? base : patch;
    const out: Record<string, unknown> = { ...base };
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === null) continue;
      out[key] = key in base ? merge(base[key], value) : value;
    }
    return out;
  };
  return merge(DEFAULT_SITE_CONTENT, isPlainObject(overrides) ? overrides : {}) as SiteContent;
}
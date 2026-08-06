/**
 * Editable public-website content model.
 * Defaults mirror the static content in `@/data/site`; the CMS stores only
 * overrides in `public.site_content` (key = 'site').
 */
import { faqs, navLinks, news, school, stats, testimonials, values, workingHours } from "@/data/site";
import { galleryItems, images } from "@/data/gallery";

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
  /** Cover media: https URL or `classroom-media` storage path. */
  image?: string;
  /** Optional video (https URL or storage path) shown instead of the cover. */
  video?: string;
  /** Optional long body shown under the excerpt. */
  body?: string;
};
export type FaqItem = { q: string; a: string };
export type IconCard = { icon: string; title: string; body: string };
export type PageHeroContent = {
  eyebrow: string;
  title: string;
  description: string;
  /** Optional hero background (https URL or `classroom-media` storage path). */
  image?: string;
};
export type HeroSlide = {
  id: string;
  kind: "image" | "video";
  /** https URL or `classroom-media` storage path. */
  src: string;
  /** Overlay caption shown on the slide. */
  title: string;
  subtitle: string;
};
export type HeroContent = {
  badge: string;
  headline: string;
  highlight: string;
  description: string;
  primaryCta: { label: string; to: string };
  secondaryCta: { label: string; to: string };
  chips: string[];
  slides: HeroSlide[];
  autoplay: boolean;
  /** Slide duration in milliseconds. */
  intervalMs: number;
  effect: "fade" | "zoom" | "slide";
  /** Dark veil strength over the media, 0–90. */
  overlay: number;
};
export type SectionContent = { eyebrow: string; title: string; description: string };
export type ScheduleRow = { time: string; title: string; body: string };
export type MediaItem = {
  id: string;
  kind: "image" | "video";
  /** https URL or `classroom-media` storage path. */
  src: string;
  title: string;
  description: string;
  /** Free-text category or classroom name used for filtering. */
  category: string;
};

export type HomeSectionKey =
  | "stages"
  | "values"
  | "life"
  | "testimonials"
  | "news"
  | "faq"
  | "contact";

export type LegalSectionItem = { heading: string; body: string };
/** Editable legal/policy document rendered on a public route. */
export type LegalDoc = {
  /** URL slug: `privacy` -> /privacy, `terms` -> /terms, anything else -> /legal/{slug}. */
  slug: string;
  /** Label used in the footer link. */
  navLabel: string;
  eyebrow: string;
  title: string;
  description: string;
  /** Free-text "last updated" line, e.g. "آخر تحديث: 1 أغسطس 2026". */
  updatedLabel: string;
  intro: string;
  sections: LegalSectionItem[];
  /** Closing note with the contact channel for enquiries/requests. */
  contactNote: string;
  /** Hide from the footer and the site without deleting the content. */
  visible: boolean;
};

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
  gallery: MediaItem[];
  testimonialsForm: { enabled: boolean; title: string; note: string };
  /** Global switch for the public registration journey (Step 0 included). */
  admissions: {
    registrationOpen: boolean;
    closureReason: "capacity" | "period_ended" | "maintenance" | "technical" | "custom";
    closureTitle: string;
    closureMessage: string;
  };
  pages: Record<string, PageHeroContent>;
  hero: HeroContent;
  home: {
    missionCards: IconCard[];
    marquee: string[];
    aboutEyebrow: string;
    aboutTitle: string;
    aboutDescription: string;
    /** Image of the about preview block on the home page. */
    aboutImage: string;
    aboutBadgeValue: string;
    aboutBadgeLabel: string;
    sections: Record<HomeSectionKey, SectionContent>;
  };
  about: {
    storyEyebrow: string;
    storyTitle: string;
    storyDescription: string;
    storyImage: string;
    pillarsEyebrow: string;
    pillarsTitle: string;
    valuesEyebrow: string;
    valuesTitle: string;
    highlights: IconCard[];
    pillars: IconCard[];
  };
  legal: {
    /** Footer column title for the policy links. */
    footerTitle: string;
    /** Short line shown under the footer copyright. */
    footerNote: string;
    docs: LegalDoc[];
  };
  schoolLife: {
    scheduleEyebrow: string;
    scheduleTitle: string;
    scheduleDescription: string;
    schedule: ScheduleRow[];
    activities: SectionContent;
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
  gallery: galleryItems.map((item, index) => ({
    id: `g-${index + 1}`,
    kind: "image" as const,
    src: item.src,
    title: item.title,
    description: item.alt,
    category: item.category,
  })),
  testimonialsForm: {
    enabled: true,
    title: "شاركنا تجربتك",
    note: "رأيك يساعد أسرًا أخرى — تُنشر المشاركات بعد مراجعة إدارة الروضة.",
  },
  admissions: {
    registrationOpen: true,
    closureReason: "capacity" as const,
    closureTitle: "التسجيل مغلق حالياً",
    closureMessage:
      "نحيطكم علماً بأن باب التسجيل مغلق حالياً لاكتمال الطاقة الاستيعابية، نشكر لكم اهتمامكم بانضمام طفلكم لمجتمع المنال.",
  },
  hero: {
    badge: school.organization,
    headline: "مدارس وروضة المنال",
    highlight: "حيث تكبر الطفولة بأمان ومحبة وتعليم راقٍ",
    description:
      "في عنيزة، نمنح أطفالنا بيئة تعليمية مستوحاة من قيمنا الإسلامية ومعايير الطفولة المبكرة العالمية — من الحضانة إلى المرحلة الابتدائية.",
    primaryCta: { label: "التسجيل الآن", to: "/apply/new" },
    secondaryCta: { label: "استكشف المراحل التعليمية", to: "/admissions" },
    chips: ["ثقة أكثر من 400 أسرة", "بيئة آمنة ومراقبة", "برنامج مونتيسوري معتمد"],
    slides: [
      {
        id: "hero-1",
        kind: "image",
        src: images.heroClassroom,
        title: "تعلّم بمحبة داخل فصولنا",
        subtitle: "معلمات مؤهلات وبيئة صفية مهيأة لكل طفل",
      },
      {
        id: "hero-2",
        kind: "image",
        src: images.stageMontessori,
        title: "بيئة مونتيسوري معتمدة",
        subtitle: "الطفل يختار عمله ويتعلّم بالتجربة والاستقلال",
      },
      {
        id: "hero-3",
        kind: "image",
        src: images.lifeStem,
        title: "استكشاف وعلوم صغيرة",
        subtitle: "تجارب آمنة تنمّي التفكير العلمي والفضول",
      },
      {
        id: "hero-4",
        kind: "image",
        src: images.campus,
        title: "حرم مدرسي آمن بحي الخزامي",
        subtitle: "مبانٍ مهيأة وإجراءات سلامة دقيقة كل يوم",
      },
    ],
    autoplay: true,
    intervalMs: 6000,
    effect: "zoom",
    overlay: 26,
  },
  pages: {
    about: {
      eyebrow: "عن المنال",
      title: "مشروع تربوي وُلد من قلب المجتمع",
      description: `${school.name} مشروع تعليمي تابع لـ${school.organization}، يقدّم تعليمًا نوعيًا للطفولة المبكرة والمرحلة الابتدائية في محافظة عنيزة.`,
      image: images.campus,
    },
    contact: {
      eyebrow: "تواصل معنا",
      title: "نرحّب بكم في حي الخزامي بعنيزة",
      description:
        "يمكنكم الاتصال بنا أو زيارة المدرسة خلال أوقات العمل، وسنكون سعداء باستقبالكم في جولة تعريفية.",
      image: images.heroClassroom,
    },
    faq: {
      eyebrow: "الأسئلة الشائعة",
      title: "إجابات لأكثر ما يسأل عنه أولياء الأمور",
      description: "جمعنا لكم أهم الأسئلة حول القبول والبرامج والسلامة والتواصل.",
      image: images.lifeReading,
    },
    gallery: {
      eyebrow: "معرض الصور",
      title: "لحظات من حياة أطفالنا",
      description: "صور ومقاطع تحكي يوميات المنال: التعلّم، اللعب، الإبداع، والصداقة.",
      image: images.lifeArt,
    },
    news: {
      eyebrow: "الأخبار",
      title: "آخر ما يحدث في المنال",
      description: "نشارككم فعالياتنا وبرامجنا وإنجازات طلابنا ومعلماتنا خلال العام الدراسي.",
      image: images.lifeMusic,
    },
    "school-life": {
      eyebrow: "الحياة المدرسية",
      title: "يوم مليء بالتعلّم والفرح",
      description:
        "نصمم يوم الطفل ليكون متوازنًا بين التركيز والحركة، بين المعرفة والقيم، وبين العمل الفردي والجماعي.",
      image: images.lifeSports,
    },
    admissions: {
      eyebrow: "المراحل والتسجيل",
      title: "ابدأ رحلة طفلك في المنال",
      description:
        "اختر المرحلة المناسبة لعمر طفلك وتعرّف على الفصول المتاحة، ثم أكمل التسجيل إلكترونيًا بخطوات واضحة.",
      image: images.stagePrimary,
    },
    testimonials: {
      eyebrow: "آراء أولياء الأمور",
      title: "ثقة الأسر هي أجمل شهادة",
      description: "تجارب حقيقية لأسر رافقت أطفالها في المنال — نشرناها بعد مراجعة إدارة المدرسة.",
      image: images.stageToddlers,
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
      {
        icon: "Award",
        title: "أهدافنا",
        body: "بناء أساس تعليمي متين لكل طفل، وتنمية مهاراته وقيمه بشراكة يومية مع أسرته.",
      },
    ],
    marquee: ["تعليم بمحبة", "قيم إسلامية", "بيئة آمنة", "مونتيسوري معتمد", "أنشطة ممتعة"],
    aboutEyebrow: "عن المنال",
    aboutTitle: "مشروع تربوي تعليمي",
    aboutDescription: school.description,
    aboutImage: images.campus,
    aboutBadgeValue: "400+",
    aboutBadgeLabel: "أسرة تثق بنا",
    sections: {
      stages: {
        eyebrow: "المراحل التعليمية",
        title: "مراحل تنمو مع طفلك",
        description:
          "من الحضانة الدافئة إلى بيئة المونتيسوري ثم المرحلة الابتدائية، رحلة متصلة ومصممة بعناية.",
      },
      values: {
        eyebrow: "لماذا المنال",
        title: "لماذ روضة المنال هي الأفضل",
        description: "كل تفصيل في المنال مصمم ليمنح طفلك الأمان والفرح والتعلّم العميق.",
      },
      life: {
        eyebrow: "الحياة المدرسية",
        title: "يوم في المنال",
        description: "قراءة، رسم، علوم، رياضة، وأناشيد — أنشطة متوازنة تصنع يومًا سعيدًا ومفيدًا.",
      },
      testimonials: {
        eyebrow: "آراء أولياء الأمور",
        title: "ما يقوله أولياء الأمور عنا",
        description: "",
      },
      news: { eyebrow: "آخر الأخبار", title: "مستجدات المنال", description: "" },
      faq: { eyebrow: "الأسئلة الشائعة", title: "ما يسأل عنه أولياء الأمور", description: "" },
      contact: {
        eyebrow: "تواصل معنا",
        title: "نرحّب بزيارتكم في أي وقت",
        description:
          "زوروا المدرسة أو اتصلوا بنا خلال أوقات العمل، وسنكون سعداء بالإجابة على كل استفساراتكم.",
      },
    },
  },
  about: {
    storyEyebrow: "قصتنا",
    storyTitle: "نبني إنسانًا قبل أن نبني متعلمًا",
    storyDescription:
      "بدأت المنال بفكرة بسيطة: أن يجد الطفل في مدرسته الأمان الذي يجده في بيته، والفرح الذي يجعله يحب التعلّم. اليوم نرافق مئات الأطفال من الحضانة حتى الصف السادس عبر برامج مدروسة ومعلمات يحملن هذه الرسالة.",
    storyImage: images.heroClassroom,
    pillarsEyebrow: "مبادئنا",
    pillarsTitle: "الرسالة والرؤية والقيم",
    valuesEyebrow: "لماذا المنال",
    valuesTitle: "ما يميّز تجربتنا التعليمية",
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
  legal: {
    footerTitle: "الشفافية والسياسات",
    footerNote: "سياساتنا معتمدة من إدارة المدرسة وتُحدَّث عند تغيّر الأنظمة أو الخدمات.",
    docs: [
      {
        slug: "privacy",
        navLabel: "سياسة الخصوصية",
        eyebrow: "سياسة الخصوصية",
        title: "كيف نحمي بيانات أطفالكم وأسركم",
        description: "توضّح هذه السياسة نوع البيانات التي تجمعها مدارس وروضة المنال، وكيف نستخدمها ونحفظها ومع من نشاركها، وحقوق ولي الأمر تجاهها.",
        updatedLabel: "آخر تحديث: 1 أغسطس 2026",
        intro: "خصوصية الطفل وأسرته أمانة قبل أن تكون التزامًا نظاميًا. تشرح هذه الصفحة بوضوح ما نجمعه من بيانات عبر الموقع ونظام التسجيل الإلكتروني وبوابة أولياء الأمور، والغرض من كل بيان، ومدة الاحتفاظ به، والخيارات المتاحة لولي الأمر في أي وقت. وهذه الصفحة تديرها إدارة المدرسة وتُحدَّث عند تغيّر خدماتنا أو الأنظمة المعمول بها.",
        sections: [
          { heading: "البيانات التي نجمعها", body: "نجمع البيانات اللازمة فقط لتقديم خدماتنا التعليمية والإدارية: بيانات ولي الأمر (الاسم، رقم الهوية أو الإقامة، رقم الجوال، البريد الإلكتروني، صلة القرابة)، وبيانات الطفل (الاسم، تاريخ الميلاد، الجنسية، رقم الهوية، الحالة الصحية والتحصينات عند الحاجة، صورة شخصية)، والمرفقات النظامية مثل صورة الهوية وشهادة الميلاد وسجل التحصينات وإيصالات السداد، إضافةً إلى بيانات الطلب والمرحلة والفصل والحالة المالية." },
          { heading: "أسباب جمع البيانات", body: "نستخدم البيانات لدراسة طلبات التسجيل، وتخصيص المقاعد في الفصول، وإصدار ملفات الطلاب والمستندات الرسمية، وإدارة الفواتير وخطط السداد، والتواصل مع ولي الأمر بشأن طلبه أو حالة طفله، وتحسين جودة خدماتنا التعليمية. ولا نستخدم بيانات الأطفال في أي أنشطة تسويقية أو دعائية." },
          { heading: "الأساس النظامي", body: "نلتزم بأنظمة المملكة العربية السعودية ذات الصلة، ومنها نظام حماية البيانات الشخصية ولوائح وزارة التعليم، ومتطلبات الجهات الإشرافية على الجمعيات الأهلية. ويُعدّ إكمال طلب التسجيل موافقةً على معالجة البيانات للأغراض الموضحة في هذه السياسة." },
          { heading: "مشاركة البيانات مع الجهات الأخرى", body: "لا نبيع البيانات الشخصية ولا نشاركها لأغراض تجارية. وقد نشارك الحد الأدنى اللازم منها مع: وزارة التعليم والجهات الحكومية المختصة عند طلبها نظامًا، والجهات الداعمة مثل برامج الدعم التعليمي (على سبيل المثال برنامج قرة) لأغراض التحقق من الاستحقاق والتحويلات المالية، ومزوّدي الخدمات التقنية الذين يستضيفون النظام تحت اتفاقيات سرية ومعالجة بيانات." },
          { heading: "صور الأطفال والمحتوى الإعلامي", body: "لا نَنشر صورة أي طفل على الموقع أو حسابات المدرسة دون موافقة ولي الأمر. والصور المرفوعة داخل نظام التسجيل تُستخدم داخليًا فقط في ملف الطالب والمستندات الرسمية، ويحق لولي الأمر سحب موافقته على النشر في أي وقت." },
          { heading: "حماية البيانات وأمنها", body: "تُخزَّن البيانات في قواعد بيانات محمية بسياسات وصول صارمة تعتمد على الأدوار (ولي أمر، مسؤول تسجيل، محاسب، مديرة، مدير نظام)، ولا يرى كل مستخدم إلا ما تسمح به صلاحياته. وتُنقل البيانات عبر اتصال مشفّر، ويُسجَّل الوصول إلى الملفات الحساسة في سجل تدقيق داخلي." },
          { heading: "مدة الاحتفاظ بالبيانات", body: "نحتفظ ببيانات الطلاب والطلبات والسجلات المالية للمدة التي تفرضها الأنظمة التعليمية والمحاسبية، ثم تُحذف أو تُصبح مجهولة الهوية. ويمكن لولي الأمر طلب حذف بيانات طلب لم يُستكمل، ما لم يكن هناك التزام نظامي بالاحتفاظ به." },
          { heading: "حقوق ولي الأمر", body: "لولي الأمر الحق في: الاطلاع على بيانات طفله المسجلة في النظام، وطلب تصحيح أي بيانات غير دقيقة، وطلب نسخة من ملف الطالب، وسحب الموافقة على الاستخدامات غير الإلزامية، وتقديم شكوى بشأن معالجة البيانات. وتُنفَّذ الطلبات المشروعة خلال مدة معقولة من تاريخ التحقق من هوية مقدّم الطلب." },
          { heading: "ملفات تعريف الارتباط والقياس", body: "يستخدم الموقع ملفات تعريف ارتباط أساسية لإدارة جلسة الدخول وحفظ تقدّم نموذج التسجيل. ولا نستخدم أدوات تتبّع إعلاني، وإن استُخدمت أدوات قياس زيارات مستقبلًا فستكون بصورة مجمّعة لا تُعرّف بالأشخاص." },
          { heading: "تحديث هذه السياسة", body: "قد نحدّث هذه السياسة عند تغيّر خدماتنا أو الأنظمة المعمول بها، ويُعلن التحديث على هذه الصفحة مع تعديل تاريخ آخر تحديث، ويُخطَر أولياء الأمور بأي تغيير جوهري عبر قنوات التواصل المعتمدة." },
        ],
        contactNote: "لأي استفسار أو طلب يتعلق ببيانات طفلك — اطلاع، تصحيح، نسخة من الملف، أو حذف — تواصل مع إدارة المدرسة عبر بيانات التواصل الموضحة في صفحة «تواصل معنا»، وسنرد على طلبك بعد التحقق من هويتك.",
        visible: true,
      },
      {
        slug: "terms",
        navLabel: "شروط الاستخدام",
        eyebrow: "شروط الاستخدام",
        title: "القواعد المنظِّمة لاستخدام الموقع ونظام التسجيل",
        description: "شروط واضحة تنظّم استخدام موقع مدارس وروضة المنال، وتقديم طلبات التسجيل، والتعامل مع الرسوم والمرفقات والمشاركات.",
        updatedLabel: "آخر تحديث: 1 أغسطس 2026",
        intro: "نحرص أن تكون العلاقة بيننا وبين أولياء الأمور واضحة من البداية. توضّح هذه الشروط ما نقدّمه من خدمات إلكترونية، وما نتوقعه من مستخدمي الموقع، والقواعد المنظِّمة لطلبات التسجيل والمستندات والرسوم. وهي صفحة تديرها إدارة المدرسة ولا تُغني عن العقود واللوائح المعتمدة ورقيًا.",
        sections: [
          { heading: "نطاق الاستخدام", body: "توضّح هذه الشروط قواعد استخدام موقع المدرسة ونظام التسجيل الإلكتروني وبوابة أولياء الأمور. ويُعدّ استخدامك للموقع أو إنشاء حساب فيه موافقةً على هذه الشروط وعلى سياسة الخصوصية." },
          { heading: "الحساب ومسؤولية ولي الأمر", body: "يجب أن يكون صاحب الحساب ولي أمر الطفل أو من يمثّله نظامًا، وأن يقدّم بيانات صحيحة ومحدّثة. ويتحمل صاحب الحساب مسؤولية الحفاظ على سرية كلمة المرور، وكل إجراء يتم من خلال حسابه يُعدّ صادرًا منه، وعليه إبلاغنا فورًا عند الاشتباه في أي استخدام غير مصرّح به." },
          { heading: "طلبات التسجيل والقبول", body: "تقديم الطلب إلكترونيًا لا يعني القبول أو حجز مقعد. ويخضع القبول لتوافر المقاعد، ومطابقة عمر الطفل لشروط المرحلة، وصحة المستندات المرفوعة، واستكمال الإجراءات المالية. وللمدرسة الحق في رفض أو تعليق أي طلب تكون بياناته غير صحيحة أو ناقصة." },
          { heading: "المرفقات والمستندات", body: "يتعهد ولي الأمر بأن جميع المستندات المرفوعة صحيحة وتخصّ طفله، ويُمنع رفع مستندات مزوّرة أو ملفات ضارة أو محتوى لا علاقة له بالطلب. وللمدرسة طلب أصول المستندات للمطابقة، وإلغاء الطلب عند ثبوت أي مخالفة." },
          { heading: "الرسوم والسداد", body: "تُعرض الرسوم وخطط السداد داخل النظام قبل الاعتماد، ويُعدّ إيصال السداد ساري المفعول بعد مطابقته من الإدارة المالية. وفي حال الحصول على دعم خارجي (مثل برنامج قرة) تُعدّ الرسوم المستحقة على ولي الأمر بحسب ما يظهر في فاتورته بعد خصم الدعم. وتُطبَّق سياسة الاسترداد المعلنة من إدارة المدرسة على حالات الانسحاب." },
          { heading: "الاستخدام المقبول", body: "يُمنع استخدام الموقع بأي شكل يخلّ بالأنظمة أو يضر بالخدمة، ومن ذلك محاولة الوصول غير المصرّح به إلى بيانات الآخرين، أو اختبار الثغرات دون تصريح، أو إرسال محتوى مسيء أو مضلل عبر نماذج التواصل والتقييمات." },
          { heading: "آراء أولياء الأمور والتعليقات", body: "المشاركات التي يُرسلها أولياء الأمور تُراجع قبل النشر، وللمدرسة رفض أو تعديل أو حذف أي مشاركة تتضمن معلومات شخصية عن أطفال آخرين أو محتوى مخالفًا. وبإرسال المشاركة يمنح صاحبها المدرسة حق نشرها على الموقع دون مقابل." },
          { heading: "الملكية الفكرية", body: "جميع عناصر الموقع من شعار واسم ونصوص وصور وتصميم مملوكة للمدرسة أو الجمعية المشرفة عليها، ولا يجوز إعادة نشرها أو استخدامها تجاريًا دون إذن كتابي مسبق." },
          { heading: "توفر الخدمة", body: "نسعى لاستمرارية الخدمة، وقد تتوقف مؤقتًا لأعمال الصيانة أو التحديث أو لأسباب خارجة عن إرادتنا. ولا نتحمل مسؤولية أي تأخير ناتج عن ذلك، مع التزامنا بإتاحة قناة بديلة لاستكمال إجراءات التسجيل عند الحاجة." },
          { heading: "تعديل الشروط والنظام المعمول به", body: "يحق للمدرسة تعديل هذه الشروط عند الحاجة مع نشر التاريخ المحدَّث على هذه الصفحة. وتخضع هذه الشروط لأنظمة المملكة العربية السعودية، وتكون الجهات القضائية المختصة في المملكة هي المرجع في أي نزاع." },
        ],
        contactNote: "إذا كان لديك سؤال حول أي بند من هذه الشروط قبل تقديم الطلب، تواصل مع إدارة المدرسة عبر صفحة «تواصل معنا» أو هاتف المدرسة، ونحن سعداء بتوضيح ما يلزم.",
        visible: true,
      },
    ],
  },
  schoolLife: {
    scheduleEyebrow: "الجدول اليومي",
    scheduleTitle: "كيف يمضي طفلك يومه في المنال",
    scheduleDescription: "",
    schedule: [
      {
        time: "7:00 – 7:30",
        title: "الاستقبال والطابور الصباحي",
        body: "ترحيب، أذكار الصباح، وتهيئة نفسية للطفل.",
      },
      {
        time: "7:30 – 9:00",
        title: "الحلقات التعليمية",
        body: "أنشطة اللغة والرياضيات وأدوات المونتيسوري.",
      },
      { time: "9:00 – 9:30", title: "الفسحة والوجبة", body: "وجبة صحية ولعب حر بإشراف كامل." },
      {
        time: "9:30 – 11:00",
        title: "الأنشطة الإثرائية",
        body: "قراءة، فنون، علوم، أو رياضة حسب الجدول.",
      },
      { time: "11:00 – 12:00", title: "قرآن وقيم", body: "حلقة القرآن والأناشيد والقصة الهادفة." },
      { time: "12:00 – 12:30", title: "الختام والانصراف", body: "مراجعة اليوم وتسليم منظّم للأسر." },
    ],
    activities: {
      eyebrow: "الأنشطة",
      title: "أنشطة تكتشف موهبة كل طفل",
      description: "قراءة، رسم، علوم، رياضة، فنون، ولعب هادف — كل نشاط له هدف تربوي واضح.",
    },
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
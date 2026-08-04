import heroClassroom from "@/assets/hero-classroom.jpg";
import stageToddlers from "@/assets/stage-toddlers.jpg";
import stageMontessori from "@/assets/stage-montessori.jpg";
import stagePrimary from "@/assets/stage-primary.jpg";
import lifeReading from "@/assets/life-reading.jpg";
import lifeArt from "@/assets/life-art.jpg";
import lifeStem from "@/assets/life-stem.jpg";
import lifeSports from "@/assets/life-sports.jpg";
import lifeMusic from "@/assets/life-music.jpg";
import campus from "@/assets/campus.jpg";

export const images = {
  heroClassroom,
  stageToddlers,
  stageMontessori,
  stagePrimary,
  lifeReading,
  lifeArt,
  lifeStem,
  lifeSports,
  lifeMusic,
  campus,
};

export const stageImages: Record<string, string> = {
  young: stageToddlers,
  montessori: stageMontessori,
  primary: stagePrimary,
};

/** Bundled artwork keyed by source file name (without extension). */
const bundledByName: Record<string, string> = {
  "hero-classroom": heroClassroom,
  "stage-toddlers": stageToddlers,
  "stage-montessori": stageMontessori,
  "stage-primary": stagePrimary,
  "life-reading": lifeReading,
  "life-art": lifeArt,
  "life-stem": lifeStem,
  "life-sports": lifeSports,
  "life-music": lifeMusic,
  campus,
};

/**
 * Heals legacy media values stored in the database — dev paths like
 * `/src/assets/campus.jpg` and stale hashed build paths like
 * `/assets/life-reading-DLBMALaB.jpg` — back to the current bundled URL.
 */
export function resolveBundledAsset(value: string): string | null {
  const file = value.split("?")[0]!.split("#")[0]!.split("/").pop() ?? "";
  if (!file) return null;
  const base = file.replace(/\.[a-z0-9]+$/i, "");
  const unhashed = base.replace(/-[A-Za-z0-9_-]{6,12}$/, "");
  return bundledByName[base] ?? bundledByName[unhashed] ?? null;
}

export type GalleryItem = {
  src: string;
  alt: string;
  title: string;
  category: string;
};

export const galleryItems: GalleryItem[] = [
  {
    src: lifeReading,
    alt: "أطفال يقرأون القصص في مكتبة المدرسة",
    title: "رحلة القراءة",
    category: "قراءة",
  },
  {
    src: lifeArt,
    alt: "طفلتان ترسمان بالألوان في مرسم الروضة",
    title: "مرسم الألوان",
    category: "فنون",
  },
  {
    src: lifeStem,
    alt: "أطفال يستكشفون تجربة علمية بالمكبر والمجسمات",
    title: "نادي الاستكشاف",
    category: "علوم",
  },
  {
    src: lifeSports,
    alt: "أطفال يلعبون بالكرة في ساحة المدرسة الآمنة",
    title: "ساحة الحركة",
    category: "رياضة",
  },
  {
    src: lifeMusic,
    alt: "حلقة أناشيد وقصة مع المعلمة",
    title: "حلقة الصباح",
    category: "أناشيد",
  },
  {
    src: stageMontessori,
    alt: "طفل يعمل بأدوات المونتيسوري الخشبية",
    title: "بيئة المونتيسوري",
    category: "مونتيسوري",
  },
  {
    src: heroClassroom,
    alt: "معلمة تشارك الأطفال بناء مجسم من المكعبات",
    title: "التعلّم باللعب",
    category: "لعب",
  },
  {
    src: stagePrimary,
    alt: "طلاب المرحلة الابتدائية يرفعون أيديهم في الفصل",
    title: "فصول الابتدائي",
    category: "صفوف",
  },
  {
    src: campus,
    alt: "مبنى مدارس وروضة المنال من الخارج",
    title: "مبنى المنال",
    category: "المبنى",
  },
];
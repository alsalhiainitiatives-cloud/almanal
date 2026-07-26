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
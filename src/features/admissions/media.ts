import { images, stageImages, galleryItems } from "@/data/gallery";

/** Maps DB stage slugs to bundled artwork. */
export const stageArtwork: Record<string, string> = {
  "small-kids": stageImages.young,
  montessori: stageImages.montessori,
  primary: stageImages.primary,
};

export function stageImage(slug: string): string {
  return stageArtwork[slug] ?? images.heroClassroom;
}

export function stageGallery(slug: string): { src: string; alt: string }[] {
  const pool = galleryItems.slice(0, 12);
  const start = slug.length % Math.max(1, pool.length - 4);
  return pool.slice(start, start + 4).map((g) => ({ src: g.src, alt: g.alt }));
}
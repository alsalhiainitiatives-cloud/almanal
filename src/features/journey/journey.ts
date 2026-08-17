/**
 * Shared, client-safe constants for the "Child Academic Journey" module
 * (weekly plans + skills & evidence portfolio).
 */
export const EVIDENCE_BUCKET = "journey-evidence";

export type EvidenceKind = "image" | "video" | "audio";

/** Upload ceilings in megabytes, per evidence kind. */
export const EVIDENCE_LIMITS_MB: Record<EvidenceKind, number> = {
  image: 5,
  video: 25,
  audio: 10,
};

export const EVIDENCE_ACCEPT =
  "image/jpeg,image/png,image/webp,video/mp4,video/quicktime,audio/mpeg,audio/wav,audio/mp4,audio/webm";

export const EVIDENCE_KIND_LABELS: Record<EvidenceKind, string> = {
  image: "صورة",
  video: "فيديو",
  audio: "تسجيل صوتي",
};

/** Kindergarten skill domains used by the observation form. */
export const SKILL_DOMAINS = [
  "القرآن والتربية الإسلامية",
  "اللغة العربية والقراءة",
  "الرياضيات والمنطق",
  "المهارات الحركية",
  "المهارات الاجتماعية والسلوك",
  "الفنون والتعبير",
  "الاستقلالية والعناية الذاتية",
  "اللغة الإنجليزية",
] as const;

export function evidenceKindOf(file: { type: string; name: string }): EvidenceKind | null {
  const type = (file.type || "").toLowerCase();
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  if (/\.(jpe?g|png|webp)$/i.test(file.name)) return "image";
  if (/\.(mp4|mov|m4v)$/i.test(file.name)) return "video";
  if (/\.(mp3|wav|m4a|ogg|webm)$/i.test(file.name)) return "audio";
  return null;
}

/** Monday-anchored week start, formatted as an ISO date. */
export function weekStartOf(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay(); // 0 = Sunday (school week starts Sunday in KSA)
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

export function formatWeekRange(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 4);
  const fmt = (d: Date) =>
    d.toLocaleDateString("ar-SA-u-nu-latn", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
  return `${fmt(start)} — ${fmt(end)}`;
}
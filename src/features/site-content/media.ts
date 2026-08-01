import { useClassroomMediaUrls } from "@/lib/classroom-media";

/** True when the value can be used directly as a src (URL or bundled asset). */
export function isDirectMedia(value: string) {
  return /^(https?:|data:|blob:|\/)/i.test(value);
}

/**
 * Resolves CMS media values that may be absolute URLs, bundled assets,
 * or `classroom-media` storage paths (signed on demand).
 */
export function useSiteMedia(values: (string | null | undefined)[]) {
  const paths = values.filter((v): v is string => !!v && !isDirectMedia(v));
  const urls = useClassroomMediaUrls(paths);
  return (value: string | null | undefined): string => {
    if (!value) return "";
    return isDirectMedia(value) ? value : (urls[value] ?? "");
  };
}

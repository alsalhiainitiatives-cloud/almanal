export type TrackCode = { number: string; token: string } | null;

/**
 * Extracts application number + verification token from a scanned QR payload,
 * a pasted tracking URL, or a "NUMBER|TOKEN" style string.
 */
export function parseTrackCode(raw: string): TrackCode {
  const text = (raw ?? "").trim();
  if (!text) return null;

  // Full/partial URL with query params
  try {
    const url = new URL(text, "https://placeholder.local");
    const no = url.searchParams.get("no") ?? url.searchParams.get("number");
    const t = url.searchParams.get("t") ?? url.searchParams.get("token");
    if (no && t) return { number: no.trim(), token: t.trim() };
  } catch {
    /* not a URL */
  }

  // JSON payload
  if (text.startsWith("{")) {
    try {
      const obj = JSON.parse(text) as Record<string, unknown>;
      const no = (obj.no ?? obj.number ?? obj.application_number) as string | undefined;
      const t = (obj.t ?? obj.token ?? obj.track_token) as string | undefined;
      if (no && t) return { number: String(no).trim(), token: String(t).trim() };
    } catch {
      /* ignore */
    }
  }

  // "NUMBER|TOKEN" / "NUMBER TOKEN" / "NUMBER,TOKEN"
  const parts = text.split(/[|,\s]+/).filter(Boolean);
  if (parts.length === 2) return { number: parts[0], token: parts[1] };

  return null;
}
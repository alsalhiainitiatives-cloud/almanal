// A new deploy replaces the previous build's hashed chunks. A tab that still
// holds the old bundle then fails to lazy-load a route module ("Failed to fetch
// dynamically imported module"), which blanks the screen. Recover by reloading
// once per chunk URL so we pick up the fresh assets without loop risk.
const STORAGE_PREFIX = "stale-chunk-reload:";

export function isStaleChunkError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS/i.test(
    message,
  );
}

export function recoverFromStaleChunk(error: unknown, chunkUrl?: string): boolean {
  if (typeof window === "undefined") return false;
  if (!isStaleChunkError(error)) return false;

  const message = error instanceof Error ? error.message : String(error);
  const url = chunkUrl ?? message.match(/https?:\/\/\S+/)?.[0] ?? "unknown";
  const key = STORAGE_PREFIX + url;

  try {
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, "1");
  } catch {
    // sessionStorage unavailable (private mode): fall through to a single reload.
  }

  // Bypass any cached HTML that still references the removed chunk.
  window.location.reload();
  return true;
}

export function installStaleChunkReload() {
  if (typeof window === "undefined") return;
  window.addEventListener("vite:preloadError", (event) => {
    const detail = (event as CustomEvent<{ payload?: unknown }>).detail;
    const payload = (detail as { payload?: unknown } | undefined)?.payload ?? detail;
    if (recoverFromStaleChunk(payload)) event.preventDefault();
  });
}

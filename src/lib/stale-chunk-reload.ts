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

  // A plain reload can be served the cached index.html that still references the
  // removed chunk. Drop caches/service workers and reload with a cache-busting
  // query param so the fresh asset manifest is fetched.
  void (async () => {
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if (navigator.serviceWorker?.getRegistrations) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch {
      // best effort
    }
    const next = new URL(window.location.href);
    next.searchParams.set("_v", Date.now().toString(36));
    window.location.replace(next.toString());
  })();
  return true;
}

export function installStaleChunkReload() {
  if (typeof window === "undefined") return;
  window.addEventListener("vite:preloadError", (event) => {
    const payload = (event as unknown as { payload?: unknown }).payload ?? event;
    if (recoverFromStaleChunk(payload)) event.preventDefault();
  });
  window.addEventListener("unhandledrejection", (event) => {
    recoverFromStaleChunk((event as PromiseRejectionEvent).reason);
  });
  window.addEventListener("error", (event) => {
    recoverFromStaleChunk((event as ErrorEvent).error ?? (event as ErrorEvent).message);
  });
}

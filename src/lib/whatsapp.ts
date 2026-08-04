/**
 * Opens WhatsApp directly without relying on api.whatsapp.com (which is blocked
 * inside embedded previews and some corporate networks).
 *
 * - Desktop: wa.me short link (opens WhatsApp Web / Desktop app)
 * - Mobile: whatsapp://send deep link
 */

/** Normalizes a Saudi number to international digits (9665xxxxxxxx). */
export function normalizeSaudiPhone(phone: string | null | undefined) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  let intl = digits;
  if (intl.startsWith("00")) intl = intl.slice(2);
  if (intl.startsWith("0")) intl = `966${intl.slice(1)}`;
  if (!intl.startsWith("966")) intl = `966${intl}`;
  return intl;
}

function isMobileAgent() {
  if (typeof navigator === "undefined") return false;
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
}

/** Builds the WhatsApp URL (wa.me on desktop, deep link on mobile). */
export function buildWhatsappUrl(phone: string | null | undefined, text: string) {
  const intl = normalizeSaudiPhone(phone);
  if (!intl) return null;
  const encoded = encodeURIComponent(text ?? "");
  return isMobileAgent()
    ? `whatsapp://send?phone=${intl}&text=${encoded}`
    : `https://wa.me/${intl}?text=${encoded}`;
}

/**
 * Opens WhatsApp in a top-level tab (escapes the preview iframe) and copies the
 * message to the clipboard as a safety net.
 */
export function openWhatsapp(phone: string | null | undefined, text: string) {
  const url = buildWhatsappUrl(phone, text);
  if (!url) return false;

  try {
    void navigator.clipboard?.writeText(text);
  } catch {
    /* clipboard is best-effort */
  }

  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }
  return true;
}

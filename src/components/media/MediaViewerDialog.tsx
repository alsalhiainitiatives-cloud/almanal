/**
 * Universal in-app media viewer.
 *
 * Any evidence file, chat attachment, or external link opens *inside* the app:
 *  - images  → lightbox with zoom / rotate
 *  - videos  → built-in HTML5 player (uploaded files and direct video URLs)
 *  - PDFs    → embedded document viewer
 *  - links   → embedded frame when the provider allows it, with a safe fallback
 */
import {
  Download,
  ExternalLink,
  FileText,
  Film,
  Image as ImageIcon,
  Link2,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type MediaKind = "image" | "video" | "pdf" | "link" | "file";

export type MediaItem = {
  url: string | null;
  kind: MediaKind;
  name?: string | null;
};

const KIND_LABELS: Record<MediaKind, string> = {
  image: "صورة",
  video: "فيديو",
  pdf: "ملف PDF",
  link: "رابط خارجي",
  file: "ملف",
};

/** Best-effort detection so pasted links still render with the right player. */
export function detectMediaKind(url: string, fallback: MediaKind = "link"): MediaKind {
  const clean = url.split("?")[0]?.toLowerCase() ?? "";
  if (/\.(jpe?g|png|webp|gif|avif)$/.test(clean)) return "image";
  if (/\.(mp4|webm|mov|m4v|ogg)$/.test(clean)) return "video";
  if (/\.pdf$/.test(clean)) return "pdf";
  return fallback;
}

/** Converts common sharing links into an embeddable form. */
function embedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = parsed.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (host === "youtu.be") {
      const id = parsed.pathname.slice(1);
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (host === "drive.google.com") {
      const match = parsed.pathname.match(/\/file\/d\/([^/]+)/);
      if (match?.[1]) return `https://drive.google.com/file/d/${match[1]}/preview`;
      const id = parsed.searchParams.get("id");
      if (id) return `https://drive.google.com/file/d/${id}/preview`;
    }
    if (host === "docs.google.com") return url.replace(/\/edit.*$/, "/preview");
    if (host === "vimeo.com") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
    return url;
  } catch {
    return null;
  }
}

function KindIcon({ kind }: { kind: MediaKind }) {
  if (kind === "image") return <ImageIcon className="size-4" />;
  if (kind === "video") return <Film className="size-4" />;
  if (kind === "link") return <Link2 className="size-4" />;
  return <FileText className="size-4" />;
}

export function MediaViewerDialog({
  item,
  onClose,
}: {
  item: MediaItem | null;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    setZoom(1);
    setRotation(0);
  }, [item?.url]);

  const open = Boolean(item?.url);
  const url = item?.url ?? "";
  const kind: MediaKind = item ? (item.kind === "link" ? detectMediaKind(url) : item.kind) : "file";
  const frameSrc = kind === "link" || kind === "file" ? embedUrl(url) : null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-4xl overflow-hidden p-0" dir="rtl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-card px-4 py-3">
          <DialogTitle className="flex min-w-0 items-center gap-2 text-sm font-black text-foreground">
            <KindIcon kind={kind} />
            <span className="truncate">{item?.name ?? KIND_LABELS[kind]}</span>
          </DialogTitle>
          <div className="flex items-center gap-1">
            {kind === "image" ? (
              <>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  title="تصغير"
                  onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                >
                  <ZoomOut className="size-4" />
                </Button>
                <span className="w-12 text-center text-[11px] font-black text-muted-foreground">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  title="تكبير"
                  onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))}
                >
                  <ZoomIn className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  title="تدوير"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                >
                  <RotateCw className="size-4" />
                </Button>
              </>
            ) : null}
            {url ? (
              <>
                <Button asChild type="button" size="icon" variant="ghost" className="size-8" title="تحميل">
                  <a href={url} download target="_blank" rel="noreferrer">
                    <Download className="size-4" />
                  </a>
                </Button>
                <Button
                  asChild
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  title="فتح في نافذة جديدة"
                >
                  <a href={url} target="_blank" rel="noreferrer">
                    <ExternalLink className="size-4" />
                  </a>
                </Button>
              </>
            ) : null}
          </div>
        </div>

        <div className="grid max-h-[75vh] min-h-[45vh] place-items-center overflow-auto bg-muted/40 p-3">
          {!url ? (
            <p className="text-sm font-black text-muted-foreground">لا يوجد محتوى للعرض.</p>
          ) : kind === "image" ? (
            <img
              src={url}
              alt={item?.name ?? "صورة"}
              className={cn("max-w-full origin-center transition-transform duration-200")}
              style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
            />
          ) : kind === "video" ? (
            <video
              src={url}
              controls
              playsInline
              controlsList="nodownload"
              className="max-h-[70vh] w-full rounded-2xl bg-black"
            />
          ) : (
            <iframe
              src={frameSrc ?? url}
              title={item?.name ?? "معاينة"}
              className="h-[70vh] w-full rounded-2xl border-0 bg-background"
              allow="autoplay; fullscreen; picture-in-picture"
            />
          )}
        </div>

        {kind === "link" || kind === "file" ? (
          <p className="border-t border-border/60 bg-card px-4 py-2 text-[11px] font-bold text-muted-foreground">
            إذا لم يظهر المحتوى فقد يمنع المصدر العرض داخل المنصة — استخدمي زر الفتح في نافذة جديدة.
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

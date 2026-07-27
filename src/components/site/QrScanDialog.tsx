import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Camera, ImageUp, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onClose: () => void;
  onResult: (text: string) => void;
};

export function QrScanDialog({ open, onClose, onResult }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const decodeFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (w && h) {
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, w, h);
          const data = ctx.getImageData(0, 0, w, h);
          const code = jsQR(data.data, w, h, { inversionAttempts: "attemptBoth" });
          if (code?.data) {
            stop();
            onResult(code.data);
            return;
          }
        }
      }
    }
    rafRef.current = requestAnimationFrame(decodeFrame);
  }, [onResult, stop]);

  useEffect(() => {
    if (!open) {
      stop();
      return;
    }
    let cancelled = false;
    setError(null);
    setStarting(true);
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
        setStarting(false);
        rafRef.current = requestAnimationFrame(decodeFrame);
      })
      .catch(() => {
        if (cancelled) return;
        setStarting(false);
        setError("تعذّر فتح الكاميرا. يمكنك رفع صورة رمز QR بدلًا من ذلك.");
      });
    return () => {
      cancelled = true;
      stop();
    };
  }, [open, decodeFrame, stop]);

  async function handleFile(file: File) {
    setError(null);
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(bitmap, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(data.data, canvas.width, canvas.height, { inversionAttempts: "attemptBoth" });
    if (code?.data) {
      stop();
      onResult(code.data);
    } else {
      setError("لم نتمكن من قراءة رمز QR في الصورة. جرّب صورة أوضح.");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/70 p-4">
      <div className="w-full max-w-md rounded-[2rem] bg-card p-5 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-black text-foreground">
            <Camera className="size-4 text-primary" />
            مسح رمز QR للطلب
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="rounded-full p-2 text-muted-foreground transition-colors hover:text-primary"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="relative mt-4 aspect-square overflow-hidden rounded-[1.5rem] bg-foreground/90">
          <video ref={videoRef} playsInline muted className="size-full object-cover" />
          <canvas ref={canvasRef} className="hidden" />
          <div className="pointer-events-none absolute inset-8 rounded-3xl border-4 border-white/70" />
          {starting ? (
            <div className="absolute inset-0 grid place-items-center text-white">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : null}
        </div>

        <p className="mt-3 text-center text-xs font-bold text-muted-foreground">
          وجّه الكاميرا نحو رمز QR وسيتم تعبئة رقم الطلب ورمز التحقق تلقائيًا.
        </p>

        {error ? (
          <p className="mt-3 rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive">
            {error}
          </p>
        ) : null}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="soft"
          className="mt-4 h-11 w-full"
          onClick={() => fileRef.current?.click()}
        >
          <ImageUp className="size-4" />
          رفع صورة رمز QR
        </Button>
      </div>
    </div>
  );
}
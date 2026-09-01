/**
 * Browser-only export helpers for a study plan: PNG image, A4 PDF, and direct
 * sharing into the classroom chat room as an image attachment.
 */
import { uploadChatAttachment } from "./chat-upload";
import type { StudyPlan } from "./plans";
import { planTitle } from "./plans";

function safeName(plan: StudyPlan) {
  return planTitle(plan).replace(/[\\/:*?"<>|]+/g, "-").slice(0, 80);
}

async function renderPng(node: HTMLElement): Promise<Blob> {
  const { toBlob } = await import("html-to-image");
  const blob = await toBlob(node, {
    pixelRatio: 2,
    backgroundColor: "#FFFFFF",
    cacheBust: true,
  });
  if (!blob) throw new Error("تعذّر توليد صورة الخطة.");
  return blob;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportPlanImage(node: HTMLElement, plan: StudyPlan) {
  const blob = await renderPng(node);
  download(blob, `${safeName(plan)}.png`);
}

export async function exportPlanPdf(node: HTMLElement, plan: StudyPlan) {
  const blob = await renderPng(node);
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("تعذّر تحويل الخطة إلى PDF."));
    reader.readAsDataURL(blob);
  });

  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("تعذّر قراءة صورة الخطة."));
    img.src = dataUrl;
  });

  const margin = 24;
  const maxW = pageWidth - margin * 2;
  const maxH = pageHeight - margin * 2;
  const scale = Math.min(maxW / image.width, maxH / image.height);
  const w = image.width * scale;
  const h = image.height * scale;

  pdf.addImage(dataUrl, "PNG", (pageWidth - w) / 2, margin, w, h);
  pdf.save(`${safeName(plan)}.pdf`);
}

/** Uploads the rendered plan image and returns a chat attachment payload. */
export async function planImageAttachment(node: HTMLElement, plan: StudyPlan) {
  const blob = await renderPng(node);
  const file = new File([blob], `${safeName(plan)}.png`, { type: "image/png" });
  return uploadChatAttachment(file, plan.classroomId);
}

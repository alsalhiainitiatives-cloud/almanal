import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award, Loader2, Printer, Search, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { amsStudents } from "@/features/ams/ams.functions";
import { useBrandLogoUrl } from "@/features/site-content/SiteContentProvider";

type StudentList = Awaited<ReturnType<typeof amsStudents>>;
const PRESETS = [
  {
    key: "excellence",
    title: "شهادة تميّز",
    message: "تقديرًا لتميّزه/ا واجتهاده/ا الرائع طوال العام الدراسي، مع أصدق الأمنيات بمزيد من النجاح والتألق.",
  },
  {
    key: "progress",
    title: "شهادة تقدّم",
    message: "تقديرًا للتقدّم الملحوظ والمثابرة الجميلة التي أظهرها/أظهرتها خلال العام الدراسي.",
  },
  {
    key: "attendance",
    title: "شهادة مواظبة",
    message: "تقديرًا للمواظبة والالتزام والحضور المتميّز طوال العام الدراسي.",
  },
  {
    key: "creativity",
    title: "شهادة إبداع",
    message: "تقديرًا لروحه/ا المبدعة وأفكاره/ا الجميلة ومشاركته/ا الفاعلة في أنشطة المدرسة.",
  },
  {
    key: "character",
    title: "شهادة حسن سلوك",
    message: "تقديرًا لأخلاقه/ا الرفيعة وتعاونه/ا واحترامه/ا لزملائه/ا ومعلماته/ا.",
  },
] as const;

export type EncouragementCertificateData = {
  studentName: string;
  stageName: string;
  classroomName: string;
  academicYear: string;
  title: string;
  message: string;
  logoUrl?: string;
};

const esc = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character] ?? character;
  });

export function encouragementCertificateHtml(data: EncouragementCertificateData) {
  const logo = data.logoUrl
    ? `<img class="logo" src="${esc(data.logoUrl)}" alt="شعار روضة ومدارس المنال" />`
    : `<div class="logo-fallback">المنال</div>`;

  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8" />
  <title>${esc(data.title)} — ${esc(data.studentName)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@500;600;700;800;900&display=swap" rel="stylesheet" />
  <style>
    @page{size:A4 landscape;margin:0}
    *{box-sizing:border-box}
    body{margin:0;background:#eef0f3;font-family:"Cairo","Segoe UI",sans-serif;color:#3d2830}
    .certificate{position:relative;width:297mm;height:210mm;margin:0 auto;overflow:hidden;background:#fffdfd;padding:18mm 24mm;text-align:center;display:flex;flex-direction:column;align-items:center}
    .frame{position:absolute;inset:8mm;border:2px solid #7a1f3d;border-radius:8mm;box-shadow:inset 0 0 0 2px #fff,inset 0 0 0 4px #d8ad42}
    .arc{position:absolute;border-radius:50%;pointer-events:none}.a1{width:105mm;height:105mm;background:#7a1f3d;top:-66mm;right:-28mm}.a2{width:72mm;height:72mm;background:#edb84f;top:-45mm;right:28mm}.a3{width:92mm;height:92mm;background:#2aa99a;bottom:-57mm;left:-27mm}.a4{width:60mm;height:60mm;background:#ef7770;bottom:-38mm;left:40mm}
    .dots{position:absolute;top:23mm;left:22mm;color:#d8ad42;font-size:30px;letter-spacing:7px;transform:rotate(-12deg)}
    .stars{position:absolute;bottom:25mm;right:23mm;color:#ef7770;font-size:32px;letter-spacing:6px;transform:rotate(10deg)}
    .logo,.logo-fallback{position:relative;width:27mm;height:27mm;object-fit:contain;margin-top:1mm}.logo-fallback{display:grid;place-items:center;border:2px solid #d8ad42;border-radius:50%;color:#7a1f3d;font-weight:900;font-size:16px}
    .school{position:relative;margin-top:2mm;color:#7a1f3d;font-size:12px;font-weight:800}
    .eyebrow{position:relative;margin-top:5mm;color:#2aa99a;font-size:12px;font-weight:900;letter-spacing:1px}
    h1{position:relative;margin:1mm 0 0;color:#7a1f3d;font-size:31px;line-height:1.25;font-weight:900}
    .rule{position:relative;width:44mm;height:3px;margin:4mm 0;background:linear-gradient(90deg,transparent,#d8ad42,transparent)}
    .lead{position:relative;margin:0;font-size:13px;font-weight:700;color:#79666d}
    .name{position:relative;width:100%;max-width:220mm;margin:3mm 0 2mm;color:#16877c;font-size:clamp(22px,3vw,30px);line-height:1.35;font-weight:900;overflow-wrap:anywhere}
    .meta{position:relative;display:flex;max-width:210mm;gap:4mm;align-items:center;justify-content:center;flex-wrap:wrap;color:#7a1f3d;font-size:11px;font-weight:800}.meta span{max-width:96mm;padding:2mm 5mm;border-radius:999px;background:#f8edf1;border:1px solid #ead2db;overflow-wrap:anywhere}
    .message{position:relative;max-width:205mm;margin:5mm auto 0;color:#4c3c42;font-size:clamp(11px,1.4vw,13px);line-height:1.9;font-weight:700;overflow-wrap:anywhere}
    .signatures{position:relative;margin-top:auto;width:78%;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12mm;font-size:10px;color:#745f67;font-weight:800}.line{padding-top:9mm;border-bottom:1px solid #9e858e;padding-bottom:2mm}
    .year{position:relative;margin-top:4mm;color:#98858c;font-size:9px;font-weight:700}
    @media print{body{background:#fff}.certificate{break-after:page}}
  </style></head><body>
  <main class="certificate">
    <div class="frame"></div><div class="arc a1"></div><div class="arc a2"></div><div class="arc a3"></div><div class="arc a4"></div>
    <div class="dots">✦ ✦ ✦</div><div class="stars">★ ★ ★</div>
    ${logo}
    <div class="school">روضة ومدارس المنال — عنيزة</div>
    <div class="eyebrow">بكل فخر واعتزاز نقدّم</div>
    <h1>${esc(data.title)}</h1><div class="rule"></div>
    <p class="lead">إلى الطفل/ة المتميّز/ة</p>
    <div class="name">${esc(data.studentName)}</div>
    <div class="meta"><span>${esc(data.stageName)}</span><span>${esc(data.classroomName)}</span></div>
    <p class="message">${esc(data.message)}</p>
    <div class="signatures"><div class="line">المعلمة</div><div class="line">قائدة المدرسة</div><div class="line">الختم الرسمي</div></div>
    <div class="year">العام الدراسي ${esc(data.academicYear)}</div>
  </main></body></html>`;
}

async function printHtml(html: string) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;inset:0;width:297mm;height:210mm;opacity:0;pointer-events:none;border:0";
  document.body.appendChild(frame);
  await new Promise<void>((resolve) => {
    frame.addEventListener("load", () => resolve(), { once: true });
    frame.srcdoc = html;
  });
  try {
    await (frame.contentWindow?.document as (Document & { fonts?: FontFaceSet }) | undefined)?.fonts?.ready;
  } catch {
    // Printing remains available when the browser fonts API is unavailable.
  }
  await new Promise((resolve) => setTimeout(resolve, 350));
  frame.contentWindow?.focus();
  frame.contentWindow?.print();
  setTimeout(() => frame.remove(), 60_000);
}

function CertificatePreview({ data }: { data: EncouragementCertificateData }) {
  return (
    <div className="relative aspect-[1.414/1] w-full overflow-hidden rounded-lg border-2 border-primary bg-card p-[5%] text-center shadow-lg">
      <div className="pointer-events-none absolute inset-2 rounded-md border border-accent" />
      <div className="absolute -end-[8%] -top-[24%] size-[42%] rounded-full bg-primary" />
      <div className="absolute end-[18%] -top-[18%] size-[28%] rounded-full bg-accent" />
      <div className="absolute -bottom-[25%] -start-[8%] size-[39%] rounded-full bg-secondary" />
      <Sparkles className="absolute start-[8%] top-[12%] size-8 text-accent" />
      <Award className="absolute bottom-[12%] end-[9%] size-10 text-destructive/70" />

      <div className="relative z-10 flex h-full flex-col items-center">
        {data.logoUrl ? (
          <img src={data.logoUrl} alt="الشعار الرسمي لروضة ومدارس المنال" className="size-[14%] object-contain" />
        ) : (
          <div className="grid size-[14%] place-items-center rounded-full border-2 border-accent text-xs font-black text-primary">
            المنال
          </div>
        )}
        <p className="mt-1 text-[clamp(8px,1vw,13px)] font-extrabold text-primary">روضة ومدارس المنال — عنيزة</p>
        <p className="mt-[2%] text-[clamp(7px,.9vw,12px)] font-black text-secondary">بكل فخر واعتزاز نقدّم</p>
        <h2 className="mt-1 text-[clamp(18px,3vw,38px)] font-black text-primary">{data.title}</h2>
        <div className="my-[1.5%] h-0.5 w-28 bg-accent" />
        <p className="text-[clamp(7px,.9vw,12px)] font-bold text-muted-foreground">إلى الطفل/ة المتميّز/ة</p>
        <p className="mt-[1%] max-w-[78%] break-words text-[clamp(16px,3vw,40px)] leading-tight font-black text-secondary">{data.studentName || "اسم الطالب/ة"}</p>
        <div className="mt-[1%] flex max-w-[78%] flex-wrap justify-center gap-2 text-[clamp(6px,.8vw,10px)] font-extrabold text-primary">
          <span className="max-w-full break-words rounded-full border border-primary/20 bg-primary/5 px-3 py-1">{data.stageName}</span>
          <span className="max-w-full break-words rounded-full border border-primary/20 bg-primary/5 px-3 py-1">{data.classroomName}</span>
        </div>
        <p className="mt-[2%] max-w-[72%] text-[clamp(7px,1vw,13px)] font-bold leading-relaxed text-foreground">{data.message}</p>
        <div className="mt-auto grid w-[72%] grid-cols-3 gap-6 text-[clamp(6px,.7vw,9px)] font-bold text-muted-foreground">
          {['المعلمة', 'قائدة المدرسة', 'الختم الرسمي'].map((label) => <span key={label} className="border-b border-muted-foreground/50 pb-1">{label}</span>)}
        </div>
        <p className="mt-[1.5%] text-[clamp(6px,.7vw,9px)] font-bold text-muted-foreground">العام الدراسي {data.academicYear}</p>
      </div>
    </div>
  );
}

export function StudentCertificatesBoard() {
  const logoUrl = useBrandLogoUrl();
  const [search, setSearch] = useState("");
  const [stageId, setStageId] = useState("");
  const [classroomId, setClassroomId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [presetKey, setPresetKey] = useState<(typeof PRESETS)[number]["key"]>("excellence");
  const preset = PRESETS.find((item) => item.key === presetKey) ?? PRESETS[0];
  const [title, setTitle] = useState<string>(preset.title);
  const [message, setMessage] = useState<string>(preset.message);

  const studentsQuery = useQuery({
    queryKey: ["ams", "students", "certificates"],
    queryFn: () => amsStudents({ data: {} }),
  });
  const data = studentsQuery.data;
  const classrooms = (data?.classrooms ?? []).filter((room) => !stageId || room.stage_id === stageId);
  const students = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (data?.students ?? []).filter((student) => {
      if (stageId && student.stage_id !== stageId) return false;
      if (classroomId && student.classroom_id !== classroomId) return false;
      return !needle || [student.name_ar, student.studentNumber, student.national_id].filter(Boolean).some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [classroomId, data?.students, search, stageId]);
  const selected = (data?.students ?? []).find((student) => student.id === studentId) ?? students[0];
  const stageName = (id: string | null) => data?.stages.find((stage) => stage.id === id)?.name_ar ?? "المرحلة غير محددة";
  const classroomName = (id: string | null) => data?.classrooms.find((room) => room.id === id)?.name_ar ?? "الفصل غير محدد";
  const certificateData: EncouragementCertificateData = {
    studentName: selected?.name_ar ?? "اسم الطالب/ة",
    stageName: stageName(selected?.stage_id ?? null),
    classroomName: classroomName(selected?.classroom_id ?? null),
    academicYear: selected?.academicYear ?? "—",
    title,
    message,
    logoUrl,
  };

  const selectPreset = (key: (typeof PRESETS)[number]["key"]) => {
    const next = PRESETS.find((item) => item.key === key) ?? PRESETS[0];
    setPresetKey(next.key);
    setTitle(next.title);
    setMessage(next.message);
  };

  const printSelectedCertificate = () => {
    if (!selected || !title.trim() || !message.trim()) return;
    void printHtml(encouragementCertificateHtml(certificateData));
  };

  if (studentsQuery.isLoading) {
    return <div className="grid min-h-72 place-items-center rounded-lg border border-border bg-card"><Loader2 className="size-7 animate-spin text-primary" /></div>;
  }

  if (studentsQuery.error) {
    return <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm font-bold text-destructive">تعذّر تحميل الطلاب: {(studentsQuery.error as Error).message}</div>;
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <section className="space-y-4 rounded-lg border border-border bg-card p-5 shadow-sm">
        <div>
          <h2 className="text-base font-black text-foreground">إعداد الشهادة</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">اختر الطالب ونوع التكريم، ثم راجع الشهادة قبل طباعتها.</p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث باسم الطالب أو رقمه…" className="ps-9" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select value={stageId} onChange={(event) => { setStageId(event.target.value); setClassroomId(""); setStudentId(""); }} className="h-10 rounded-md border border-border bg-background px-2 text-xs font-bold text-foreground">
            <option value="">كل المراحل</option>
            {(data?.stages ?? []).map((stage) => <option key={stage.id} value={stage.id}>{stage.name_ar}</option>)}
          </select>
          <select value={classroomId} onChange={(event) => { setClassroomId(event.target.value); setStudentId(""); }} className="h-10 rounded-md border border-border bg-background px-2 text-xs font-bold text-foreground">
            <option value="">كل الفصول</option>
            {classrooms.map((room) => <option key={room.id} value={room.id}>{room.name_ar}</option>)}
          </select>
        </div>
        <label className="space-y-1.5 text-xs font-black text-foreground">
          <span>الطالب/ة</span>
          <select value={selected?.id ?? ""} onChange={(event) => setStudentId(event.target.value)} className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm font-bold text-foreground">
            {students.length === 0 && <option value="">لا يوجد طلاب مطابقون</option>}
            {students.map((student) => <option key={student.id} value={student.id}>{student.name_ar} — {classroomName(student.classroom_id)}</option>)}
          </select>
        </label>
        <label className="space-y-1.5 text-xs font-black text-foreground">
          <span>نوع الشهادة</span>
          <select value={presetKey} onChange={(event) => selectPreset(event.target.value as (typeof PRESETS)[number]["key"])} className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm font-bold text-foreground">
            {PRESETS.map((item) => <option key={item.key} value={item.key}>{item.title}</option>)}
          </select>
        </label>
        <label className="space-y-1.5 text-xs font-black text-foreground"><span>عنوان الشهادة</span><Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={70} /></label>
        <label className="space-y-1.5 text-xs font-black text-foreground"><span>العبارة التشجيعية</span><Textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={320} rows={5} /></label>
        <Button className="w-full" disabled={!selected || !title.trim() || !message.trim()} onClick={printSelectedCertificate}>
          <Printer className="size-4" /> طباعة الشهادة
        </Button>
      </section>

      <section className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-base font-black text-foreground">المعاينة النهائية</h2><p className="text-xs text-muted-foreground">تُطبع الشهادة أفقياً على ورق A4.</p></div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-secondary/10 px-3 py-1 text-xs font-black text-secondary">{students.length} طالب/ة</span>
            <Button size="sm" disabled={!selected || !title.trim() || !message.trim()} onClick={printSelectedCertificate}>
              <Printer className="size-4" /> طباعة مباشرة
            </Button>
          </div>
        </div>
        <CertificatePreview data={certificateData} />
      </section>
    </div>
  );
}
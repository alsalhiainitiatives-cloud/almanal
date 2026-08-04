import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, RotateCcw, Save, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/AuthProvider";
import { P } from "@/features/auth/rbac";
import { uploadClassroomMedia, useClassroomMediaUrls } from "@/lib/classroom-media";
import { DEFAULT_SITE_CONTENT, type SiteContent } from "../defaults";
import { SITE_ICON_NAMES, siteIcon } from "../icons";
import { siteContentGet, siteContentSave } from "../site-content.functions";
import { TestimonialsModeration } from "./TestimonialsModeration";
import { isDirectMedia } from "../media";

/* ----------------------------------------------------------------- helpers */

function Field({
  label,
  value,
  onChange,
  dir,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  dir?: "ltr" | "rtl";
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-bold text-muted-foreground">{label}</Label>
      <Input
        value={value}
        dir={dir}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-2xl"
      />
    </div>
  );
}

function AreaField({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-bold text-muted-foreground">{label}</Label>
      <Textarea
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-2xl leading-relaxed"
      />
    </div>
  );
}

function IconField({
  label = "الأيقونة",
  value,
  onChange,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const Icon = siteIcon(value);
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-bold text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-accent text-primary">
          <Icon className="size-5" />
        </span>
        <Select value={value || "Sparkles"} onValueChange={onChange}>
          <SelectTrigger className="rounded-2xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SITE_ICON_NAMES.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function ListSection<T>({
  title,
  items,
  onChange,
  blank,
  render,
  addLabel = "إضافة عنصر",
}: {
  title: string;
  items: T[];
  onChange: (next: T[]) => void;
  blank: () => T;
  render: (item: T, update: (patch: Partial<T>) => void) => React.ReactNode;
  addLabel?: string;
}) {
  const patchAt = (index: number, patch: Partial<T>) =>
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  return (
    <Card className="rounded-[1.75rem] border-border/60 shadow-soft">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base font-extrabold">{title}</CardTitle>
        <Button
          type="button"
          variant="soft"
          size="sm"
          className="rounded-2xl"
          onClick={() => onChange([...items, blank()])}
        >
          <Plus className="size-4" />
          {addLabel}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 && (
          <p className="rounded-2xl bg-beige/60 px-4 py-3 text-xs font-semibold text-muted-foreground">
            لا توجد عناصر بعد.
          </p>
        )}
        {items.map((item, index) => (
          <div
            key={index}
            className="rounded-[1.5rem] border border-border/60 bg-card/70 p-4 shadow-soft"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {render(item, (patch) => patchAt(index, patch))}
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-2xl text-destructive hover:text-destructive"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
              >
                <Trash2 className="size-4" />
                حذف
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function LogoUploader({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const isPath = !!value && !/^https?:\/\//i.test(value);
  const urls = useClassroomMediaUrls(isPath ? [value] : []);
  const preview = isPath ? urls[value] : value;

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const path = await uploadClassroomMedia(file, "site/brand");
      onChange(path);
      toast.success("تم رفع الشعار");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر رفع الشعار");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <Label className="text-xs font-bold text-muted-foreground">شعار المدرسة</Label>
      <div className="flex flex-wrap items-center gap-4">
        <span className="grid size-20 place-items-center overflow-hidden rounded-3xl border border-border/60 bg-beige/60">
          {preview ? (
            <img src={preview} alt="شعار المدرسة" className="size-full object-contain" />
          ) : (
            <span className="text-[11px] font-bold text-muted-foreground">بدون شعار</span>
          )}
        </span>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="soft"
            className="rounded-2xl"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            رفع صورة
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              className="rounded-2xl text-destructive hover:text-destructive"
              onClick={() => onChange("")}
            >
              <Trash2 className="size-4" />
              إزالة
            </Button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => void pick(e.target.files?.[0])}
        />
      </div>
      <Input
        value={value}
        dir="ltr"
        placeholder="أو ضع رابط صورة مباشر https://…"
        onChange={(e) => onChange(e.target.value)}
        className="rounded-2xl"
      />
    </div>
  );
}

/** Generic image/video field: upload to storage or paste a direct URL. */
function MediaField({
  label,
  value,
  onChange,
  folder,
  accept = "image/*",
  kind = "image",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  folder: string;
  accept?: string;
  kind?: "image" | "video";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const isPath = !!value && !isDirectMedia(value);
  const urls = useClassroomMediaUrls(isPath ? [value] : []);
  const preview = isPath ? urls[value] : value;

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const path = await uploadClassroomMedia(file, folder);
      onChange(path);
      toast.success("تم رفع الملف");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر رفع الملف");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold text-muted-foreground">{label}</Label>
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-20 w-28 place-items-center overflow-hidden rounded-2xl border border-border/60 bg-beige/60">
          {preview ? (
            kind === "video" ? (
              <video src={preview} className="size-full object-cover" muted />
            ) : (
              <img src={preview} alt={label} className="size-full object-cover" />
            )
          ) : (
            <span className="text-[11px] font-bold text-muted-foreground">بدون ملف</span>
          )}
        </span>
        <Button
          type="button"
          variant="soft"
          size="sm"
          className="rounded-2xl"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          رفع
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-2xl text-destructive hover:text-destructive"
            onClick={() => onChange("")}
          >
            <Trash2 className="size-4" />
            إزالة
          </Button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          hidden
          onChange={(e) => void pick(e.target.files?.[0])}
        />
      </div>
      <Input
        value={value}
        dir="ltr"
        placeholder="أو ضع رابطًا مباشرًا https://…"
        onChange={(e) => onChange(e.target.value)}
        className="rounded-2xl"
      />
    </div>
  );
}

/* -------------------------------------------------------------- main editor */

export function SiteSettings() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const fetchContent = useServerFn(siteContentGet);
  const saveContent = useServerFn(siteContentSave);

  const { data, isLoading } = useQuery({
    queryKey: ["site-content"],
    queryFn: () => fetchContent(),
  });

  const [draft, setDraft] = useState<SiteContent | null>(null);
  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  const save = useMutation({
    mutationFn: (content: SiteContent) => saveContent({ data: { content } }),
    onSuccess: () => {
      toast.success("تم حفظ محتوى الموقع");
      queryClient.invalidateQueries({ queryKey: ["site-content"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "تعذر حفظ المحتوى"),
  });

  if (isLoading || !draft) {
    return (
      <div className="grid place-items-center rounded-[1.75rem] border border-border/60 bg-card/80 py-16">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  const set = <K extends keyof SiteContent>(key: K, value: SiteContent[K]) =>
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));

  const setBrand = (patch: Partial<SiteContent["brand"]>) =>
    set("brand", { ...draft.brand, ...patch });
  const setContact = (patch: Partial<SiteContent["contact"]>) =>
    set("contact", { ...draft.contact, ...patch });
  const setHome = (patch: Partial<SiteContent["home"]>) => set("home", { ...draft.home, ...patch });
  const legal = draft.legal ?? DEFAULT_SITE_CONTENT.legal;
  const setLegal = (patch: Partial<SiteContent["legal"]>) => set("legal", { ...legal, ...patch });
  const setHero = (patch: Partial<SiteContent["hero"]>) => set("hero", { ...draft.hero, ...patch });
  const setAbout = (patch: Partial<SiteContent["about"]>) =>
    set("about", { ...draft.about, ...patch });
  const setPage = (key: string, patch: Partial<SiteContent["pages"][string]>) =>
    set("pages", {
      ...draft.pages,
      [key]: { ...(draft.pages[key] ?? { eyebrow: "", title: "", description: "" }), ...patch },
    });
  const setSchoolLife = (patch: Partial<SiteContent["schoolLife"]>) =>
    set("schoolLife", { ...draft.schoolLife, ...patch });
  const setSection = (
    key: keyof SiteContent["home"]["sections"],
    patch: Partial<SiteContent["home"]["sections"][keyof SiteContent["home"]["sections"]]>,
  ) =>
    setHome({
      sections: { ...draft.home.sections, [key]: { ...draft.home.sections[key], ...patch } },
    });

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-[1.75rem] border border-border/60 bg-card/90 p-4 shadow-soft">
        <p className="text-xs font-semibold leading-relaxed text-muted-foreground">
          التعديلات تُطبّق على الموقع العام مباشرة بعد الحفظ.
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-2xl"
            onClick={() => setDraft(DEFAULT_SITE_CONTENT)}
          >
            <RotateCcw className="size-4" />
            استعادة الافتراضي
          </Button>
          <Button
            type="button"
            variant="hero"
            className="rounded-2xl"
            disabled={save.isPending}
            onClick={() => save.mutate(draft)}
          >
            {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            حفظ التغييرات
          </Button>
        </div>
      </div>

      <Tabs defaultValue="brand" className="space-y-6">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-[1.5rem] bg-beige/70 p-1.5">
          <TabsTrigger value="brand" className="rounded-2xl">الهوية</TabsTrigger>
          <TabsTrigger value="hero" className="rounded-2xl">الهيرو والسلايدر</TabsTrigger>
          <TabsTrigger value="contact" className="rounded-2xl">التواصل والفوتر</TabsTrigger>
          <TabsTrigger value="nav" className="rounded-2xl">القائمة</TabsTrigger>
          <TabsTrigger value="home" className="rounded-2xl">الرئيسية</TabsTrigger>
          <TabsTrigger value="about" className="rounded-2xl">صفحة عنا</TabsTrigger>
          <TabsTrigger value="school-life" className="rounded-2xl">الحياة المدرسية</TabsTrigger>
          <TabsTrigger value="gallery" className="rounded-2xl">المعرض</TabsTrigger>
          <TabsTrigger value="reviews" className="rounded-2xl">آراء الأولياء</TabsTrigger>
          <TabsTrigger value="pages" className="rounded-2xl">رؤوس الصفحات</TabsTrigger>
          <TabsTrigger value="content" className="rounded-2xl">المحتوى</TabsTrigger>
          <TabsTrigger value="legal" className="rounded-2xl">السياسات القانونية</TabsTrigger>
        </TabsList>

        {/* Legal & policies */}
        <TabsContent value="legal" className="space-y-6">
          <Card className="rounded-[1.75rem] border-border/60 shadow-soft">
            <CardHeader>
              <CardTitle className="text-base font-extrabold">إعدادات قسم السياسات في الفوتر</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Field
                label="عنوان القسم في الفوتر"
                value={legal.footerTitle}
                onChange={(v) => setLegal({ footerTitle: v })}
              />
              <div className="sm:col-span-2">
                <AreaField
                  label="ملاحظة أسفل العنوان (اختياري)"
                  value={legal.footerNote}
                  onChange={(v) => setLegal({ footerNote: v })}
                />
              </div>
              <p className="sm:col-span-2 rounded-2xl bg-beige/60 px-4 py-3 text-xs font-semibold text-muted-foreground">
                المعرّف «privacy» يُنشر على /privacy و«terms» على /terms، وأي معرّف آخر يُنشر على /legal/المعرّف. استخدم حروفًا إنجليزية صغيرة وشرطات فقط.
              </p>
            </CardContent>
          </Card>

          <ListSection
            title="الوثائق والسياسات"
            addLabel="إضافة وثيقة"
            items={legal.docs}
            onChange={(docs) => setLegal({ docs })}
            blank={() => ({
              slug: "",
              navLabel: "وثيقة جديدة",
              eyebrow: "سياسات",
              title: "عنوان الوثيقة",
              description: "",
              updatedLabel: "آخر تحديث: —",
              intro: "",
              sections: [],
              contactNote: "",
              visible: true,
            })}
            render={(item, update) => (
              <>
                <Field label="اسم الرابط في الفوتر" value={item.navLabel} onChange={(v) => update({ navLabel: v })} />
                <Field
                  label="المعرّف (المسار)"
                  value={item.slug}
                  dir="ltr"
                  placeholder="privacy"
                  onChange={(v) => update({ slug: v.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                />
                <Field label="النص الصغير أعلى العنوان" value={item.eyebrow} onChange={(v) => update({ eyebrow: v })} />
                <Field label="العنوان الرئيسي" value={item.title} onChange={(v) => update({ title: v })} />
                <Field
                  label="تاريخ آخر تحديث"
                  value={item.updatedLabel}
                  onChange={(v) => update({ updatedLabel: v })}
                />
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-beige/60 px-4 py-2.5">
                  <Label className="text-xs font-bold text-muted-foreground">منشورة في الموقع</Label>
                  <Switch checked={item.visible} onCheckedChange={(v) => update({ visible: v })} />
                </div>
                <div className="sm:col-span-2">
                  <AreaField
                    label="وصف الصفحة (يظهر في الهيرو ومحركات البحث)"
                    value={item.description}
                    onChange={(v) => update({ description: v })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <AreaField
                    label="المقدمة"
                    value={item.intro}
                    rows={4}
                    onChange={(v) => update({ intro: v })}
                  />
                </div>
                <div className="sm:col-span-2 space-y-3 rounded-[1.5rem] border border-dashed border-border/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <Label className="text-xs font-black text-foreground">
                      بنود الوثيقة ({item.sections.length})
                    </Label>
                    <Button
                      type="button"
                      variant="soft"
                      size="sm"
                      className="rounded-2xl"
                      onClick={() =>
                        update({ sections: [...item.sections, { heading: "بند جديد", body: "" }] })
                      }
                    >
                      <Plus className="size-4" />
                      إضافة بند
                    </Button>
                  </div>
                  {item.sections.length === 0 ? (
                    <p className="rounded-2xl bg-beige/60 px-4 py-3 text-xs font-semibold text-muted-foreground">
                      لا توجد بنود بعد.
                    </p>
                  ) : null}
                  {item.sections.map((section, si) => (
                    <div key={si} className="space-y-3 rounded-[1.25rem] border border-border/60 bg-card/70 p-4">
                      <Field
                        label={`عنوان البند ${si + 1}`}
                        value={section.heading}
                        onChange={(v) =>
                          update({
                            sections: item.sections.map((s, i) =>
                              i === si ? { ...s, heading: v } : s,
                            ),
                          })
                        }
                      />
                      <AreaField
                        label="نص البند"
                        rows={5}
                        value={section.body}
                        onChange={(v) =>
                          update({
                            sections: item.sections.map((s, i) => (i === si ? { ...s, body: v } : s)),
                          })
                        }
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="rounded-2xl"
                          disabled={si === 0}
                          onClick={() => {
                            const next = [...item.sections];
                            [next[si - 1], next[si]] = [next[si], next[si - 1]];
                            update({ sections: next });
                          }}
                        >
                          تحريك للأعلى
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="rounded-2xl text-destructive hover:text-destructive"
                          onClick={() =>
                            update({ sections: item.sections.filter((_, i) => i !== si) })
                          }
                        >
                          <Trash2 className="size-4" />
                          حذف البند
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="sm:col-span-2">
                  <AreaField
                    label="ملاحظة التواصل في نهاية الصفحة"
                    value={item.contactNote}
                    onChange={(v) => update({ contactNote: v })}
                  />
                </div>
              </>
            )}
          />
        </TabsContent>

        {/* Brand */}
        <TabsContent value="brand" className="space-y-6">
          <Card className="rounded-[1.75rem] border-border/60 shadow-soft">
            <CardHeader>
              <CardTitle className="text-base font-extrabold">هوية المدرسة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <LogoUploader value={draft.brand.logoUrl} onChange={(v) => setBrand({ logoUrl: v })} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="الاسم الكامل" value={draft.brand.name} onChange={(v) => setBrand({ name: v })} />
                <Field label="الاسم المختصر" value={draft.brand.shortName} onChange={(v) => setBrand({ shortName: v })} />
                <Field label="الجهة المالكة" value={draft.brand.organization} onChange={(v) => setBrand({ organization: v })} />
                <Field label="الشعار النصي" value={draft.brand.tagline} onChange={(v) => setBrand({ tagline: v })} />
              </div>
              <AreaField label="الوصف العام" value={draft.brand.description} onChange={(v) => setBrand({ description: v })} />
            </CardContent>
          </Card>

          <ListSection
            title="الإحصائيات المعروضة"
            items={draft.stats}
            onChange={(next) => set("stats", next)}
            blank={() => ({ value: 0, suffix: "", label: "" })}
            render={(item, update) => (
              <>
                <Field label="العنوان" value={item.label} onChange={(v) => update({ label: v })} />
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="القيمة"
                    value={String(item.value)}
                    dir="ltr"
                    onChange={(v) => update({ value: Number(v.replace(/[^\d]/g, "")) || 0 })}
                  />
                  <Field label="اللاحقة" value={item.suffix} dir="ltr" onChange={(v) => update({ suffix: v })} />
                </div>
              </>
            )}
          />
        </TabsContent>

        {/* Contact + footer */}
        <TabsContent value="contact" className="space-y-6">
          <Card className="rounded-[1.75rem] border-border/60 shadow-soft">
            <CardHeader>
              <CardTitle className="text-base font-extrabold">معلومات التواصل والعنوان</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="الجوال (للعرض)" value={draft.contact.phone} dir="ltr" onChange={(v) => setContact({ phone: v })} />
              <Field label="الجوال الدولي" value={draft.contact.phoneIntl} dir="ltr" onChange={(v) => setContact({ phoneIntl: v })} />
              <Field label="البريد الإلكتروني" value={draft.contact.email} dir="ltr" onChange={(v) => setContact({ email: v })} />
              <Field label="رابط الخريطة" value={draft.contact.mapLink} dir="ltr" onChange={(v) => setContact({ mapLink: v })} />
              <Field label="العنوان التفصيلي" value={draft.contact.line1} onChange={(v) => setContact({ line1: v })} />
              <Field label="الحي" value={draft.contact.district} onChange={(v) => setContact({ district: v })} />
              <Field label="المدينة والرمز" value={draft.contact.city} onChange={(v) => setContact({ city: v })} />
              <Field label="الدولة" value={draft.contact.country} onChange={(v) => setContact({ country: v })} />
              <Field label="ملخص أوقات العمل" value={draft.contact.hoursSummary} onChange={(v) => setContact({ hoursSummary: v })} />
            </CardContent>
          </Card>

          <ListSection
            title="أوقات العمل"
            items={draft.workingHours}
            onChange={(next) => set("workingHours", next)}
            blank={() => ({ day: "", hours: "", closed: false })}
            addLabel="إضافة يوم"
            render={(item, update) => (
              <>
                <Field label="اليوم" value={item.day} onChange={(v) => update({ day: v })} />
                <Field label="الوقت" value={item.hours} onChange={(v) => update({ hours: v })} />
                <div className="flex items-center gap-3 sm:col-span-2">
                  <Switch checked={item.closed} onCheckedChange={(v) => update({ closed: v })} />
                  <span className="text-xs font-bold text-muted-foreground">يوم إجازة</span>
                </div>
              </>
            )}
          />

          <ListSection
            title="حسابات التواصل الاجتماعي"
            items={draft.socials}
            onChange={(next) => set("socials", next)}
            blank={() => ({ label: "", icon: "Instagram", url: "" })}
            addLabel="إضافة حساب"
            render={(item, update) => (
              <>
                <Field label="الاسم" value={item.label} onChange={(v) => update({ label: v })} />
                <Field label="الرابط" value={item.url} dir="ltr" onChange={(v) => update({ url: v })} />
                <IconField value={item.icon} onChange={(v) => update({ icon: v })} />
              </>
            )}
          />
        </TabsContent>

        {/* Nav */}
        <TabsContent value="nav">
          <ListSection
            title="قائمة التنقل الرئيسية"
            items={draft.nav}
            onChange={(next) => set("nav", next)}
            blank={() => ({ label: "", to: "/" })}
            addLabel="إضافة رابط"
            render={(item, update) => (
              <>
                <Field label="النص" value={item.label} onChange={(v) => update({ label: v })} />
                <Field label="المسار" value={item.to} dir="ltr" onChange={(v) => update({ to: v })} />
              </>
            )}
          />
        </TabsContent>

        {/* Hero + slider */}
        <TabsContent value="hero" className="space-y-6">
          <Card className="rounded-[1.75rem] border-border/60 shadow-soft">
            <CardHeader>
              <CardTitle className="text-base font-extrabold">نصوص قسم الهيرو</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="الشارة العليا" value={draft.hero.badge} onChange={(v) => setHero({ badge: v })} />
                <Field label="العنوان الرئيسي" value={draft.hero.headline} onChange={(v) => setHero({ headline: v })} />
              </div>
              <Field label="العنوان الفرعي البارز" value={draft.hero.highlight} onChange={(v) => setHero({ highlight: v })} />
              <AreaField label="الوصف" value={draft.hero.description} onChange={(v) => setHero({ description: v })} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="زر أساسي — النص"
                  value={draft.hero.primaryCta.label}
                  onChange={(v) => setHero({ primaryCta: { ...draft.hero.primaryCta, label: v } })}
                />
                <Field
                  label="زر أساسي — المسار"
                  dir="ltr"
                  value={draft.hero.primaryCta.to}
                  onChange={(v) => setHero({ primaryCta: { ...draft.hero.primaryCta, to: v } })}
                />
                <Field
                  label="زر ثانوي — النص"
                  value={draft.hero.secondaryCta.label}
                  onChange={(v) => setHero({ secondaryCta: { ...draft.hero.secondaryCta, label: v } })}
                />
                <Field
                  label="زر ثانوي — المسار"
                  dir="ltr"
                  value={draft.hero.secondaryCta.to}
                  onChange={(v) => setHero({ secondaryCta: { ...draft.hero.secondaryCta, to: v } })}
                />
              </div>
              <AreaField
                label="الشارات الصغيرة (كل شارة في سطر)"
                rows={4}
                value={draft.hero.chips.join("\n")}
                onChange={(v) =>
                  setHero({ chips: v.split("\n").map((s) => s.trim()).filter(Boolean) })
                }
              />
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border-border/60 shadow-soft">
            <CardHeader>
              <CardTitle className="text-base font-extrabold">إعدادات السلايدر</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Switch
                  checked={draft.hero.autoplay}
                  onCheckedChange={(v) => setHero({ autoplay: v })}
                />
                <span className="text-xs font-bold text-muted-foreground">
                  التقليب التلقائي بين الشرائح
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-muted-foreground">
                    سرعة السلايدر (ثانية لكل شريحة)
                  </Label>
                  <Input
                    type="number"
                    min={2}
                    max={30}
                    step={0.5}
                    dir="ltr"
                    value={draft.hero.intervalMs / 1000}
                    onChange={(e) =>
                      setHero({
                        intervalMs: Math.round(
                          Math.min(30, Math.max(2, Number(e.target.value) || 6)) * 1000,
                        ),
                      })
                    }
                    className="rounded-2xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-muted-foreground">نمط الانتقال</Label>
                  <Select
                    value={draft.hero.effect}
                    onValueChange={(v) => setHero({ effect: v as SiteContent["hero"]["effect"] })}
                  >
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zoom">تكبير سينمائي (Ken Burns)</SelectItem>
                      <SelectItem value="fade">تلاشٍ ناعم</SelectItem>
                      <SelectItem value="slide">انزلاق أفقي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-muted-foreground">
                    شدة التعتيم على الصور (0–90)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={90}
                    dir="ltr"
                    value={draft.hero.overlay}
                    onChange={(e) =>
                      setHero({ overlay: Math.min(90, Math.max(0, Number(e.target.value) || 0)) })
                    }
                    className="rounded-2xl"
                  />
                </div>
              </div>
              <p className="rounded-2xl bg-beige/60 px-4 py-3 text-xs font-semibold leading-relaxed text-muted-foreground">
                يمكن إضافة صور أو مقاطع فيديو للسلايدر — الفيديو يُشغّل تلقائيًا وبدون صوت. يُنصح
                بصور بعرض 1920 بكسل على الأقل.
              </p>
            </CardContent>
          </Card>

          <ListSection
            title="شرائح السلايدر"
            items={draft.hero.slides}
            onChange={(next) => setHero({ slides: next })}
            blank={() => ({
              id: `hero-${Date.now()}`,
              kind: "image" as const,
              src: "",
              title: "",
              subtitle: "",
            })}
            addLabel="إضافة شريحة"
            render={(item, update) => (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-muted-foreground">نوع الشريحة</Label>
                  <Select
                    value={item.kind}
                    onValueChange={(v) => update({ kind: v as "image" | "video" })}
                  >
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">صورة</SelectItem>
                      <SelectItem value="video">فيديو</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Field label="العنوان على الشريحة" value={item.title} onChange={(v) => update({ title: v })} />
                <div className="sm:col-span-2">
                  <Field label="الوصف المختصر" value={item.subtitle} onChange={(v) => update({ subtitle: v })} />
                </div>
                <div className="sm:col-span-2">
                  <MediaField
                    label={item.kind === "video" ? "ملف الفيديو" : "ملف الصورة"}
                    value={item.src}
                    kind={item.kind}
                    accept={item.kind === "video" ? "video/*" : "image/*"}
                    folder="site/hero"
                    onChange={(v) => update({ src: v })}
                  />
                </div>
              </>
            )}
          />
        </TabsContent>

        {/* Home */}
        <TabsContent value="home" className="space-y-6">
          <Card className="rounded-[1.75rem] border-border/60 shadow-soft">
            <CardHeader>
              <CardTitle className="text-base font-extrabold">قسم «عن المنال» في الرئيسية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="العنوان الفرعي" value={draft.home.aboutEyebrow} onChange={(v) => setHome({ aboutEyebrow: v })} />
                <Field label="العنوان الرئيسي" value={draft.home.aboutTitle} onChange={(v) => setHome({ aboutTitle: v })} />
              </div>
              <AreaField label="الوصف" value={draft.home.aboutDescription} onChange={(v) => setHome({ aboutDescription: v })} />
              <MediaField
                label="صورة قسم «عن المنال»"
                value={draft.home.aboutImage}
                folder="site/home"
                onChange={(v) => setHome({ aboutImage: v })}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="رقم الشارة (مثال 400+)" value={draft.home.aboutBadgeValue} dir="ltr" onChange={(v) => setHome({ aboutBadgeValue: v })} />
                <Field label="نص الشارة" value={draft.home.aboutBadgeLabel} onChange={(v) => setHome({ aboutBadgeLabel: v })} />
              </div>
              <AreaField
                label="الشريط المتحرك (كل عبارة في سطر)"
                value={draft.home.marquee.join("\n")}
                rows={5}
                onChange={(v) =>
                  setHome({ marquee: v.split("\n").map((s) => s.trim()).filter(Boolean) })
                }
              />
            </CardContent>
          </Card>

          <ListSection
            title="بطاقات الرسالة والرؤية والقيم"
            items={draft.home.missionCards}
            onChange={(next) => setHome({ missionCards: next })}
            blank={() => ({ icon: "Sparkles", title: "", body: "" })}
            addLabel="إضافة بطاقة"
            render={(item, update) => (
              <>
                <Field label="العنوان" value={item.title} onChange={(v) => update({ title: v })} />
                <IconField value={item.icon} onChange={(v) => update({ icon: v })} />
                <div className="sm:col-span-2">
                  <AreaField label="النص" value={item.body} onChange={(v) => update({ body: v })} />
                </div>
              </>
            )}
          />

          <Card className="rounded-[1.75rem] border-border/60 shadow-soft">
            <CardHeader>
              <CardTitle className="text-base font-extrabold">عناوين أقسام الصفحة الرئيسية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {(
                [
                  ["stages", "المراحل التعليمية"],
                  ["values", "لماذا المنال"],
                  ["life", "الحياة المدرسية"],
                  ["testimonials", "آراء أولياء الأمور"],
                  ["news", "الأخبار"],
                  ["faq", "الأسئلة الشائعة"],
                  ["contact", "تواصل معنا"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="rounded-[1.5rem] border border-border/60 bg-card/70 p-4">
                  <p className="mb-3 text-xs font-black text-primary">{label}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field
                      label="العنوان الفرعي"
                      value={draft.home.sections[key].eyebrow}
                      onChange={(v) => setSection(key, { eyebrow: v })}
                    />
                    <Field
                      label="العنوان الرئيسي"
                      value={draft.home.sections[key].title}
                      onChange={(v) => setSection(key, { title: v })}
                    />
                  </div>
                  <div className="mt-3">
                    <AreaField
                      label="الوصف"
                      value={draft.home.sections[key].description}
                      onChange={(v) => setSection(key, { description: v })}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* About page */}
        <TabsContent value="about" className="space-y-6">
          <Card className="rounded-[1.75rem] border-border/60 shadow-soft">
            <CardHeader>
              <CardTitle className="text-base font-extrabold">قصتنا</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="العنوان الفرعي" value={draft.about.storyEyebrow} onChange={(v) => setAbout({ storyEyebrow: v })} />
                <Field label="العنوان الرئيسي" value={draft.about.storyTitle} onChange={(v) => setAbout({ storyTitle: v })} />
              </div>
              <AreaField label="النص" value={draft.about.storyDescription} rows={4} onChange={(v) => setAbout({ storyDescription: v })} />
              <MediaField
                label="صورة قسم «قصتنا»"
                value={draft.about.storyImage}
                folder="site/about"
                onChange={(v) => setAbout({ storyImage: v })}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="عنوان فرعي — المبادئ" value={draft.about.pillarsEyebrow} onChange={(v) => setAbout({ pillarsEyebrow: v })} />
                <Field label="عنوان — المبادئ" value={draft.about.pillarsTitle} onChange={(v) => setAbout({ pillarsTitle: v })} />
                <Field label="عنوان فرعي — المزايا" value={draft.about.valuesEyebrow} onChange={(v) => setAbout({ valuesEyebrow: v })} />
                <Field label="عنوان — المزايا" value={draft.about.valuesTitle} onChange={(v) => setAbout({ valuesTitle: v })} />
              </div>
            </CardContent>
          </Card>

          <ListSection
            title="مميزات المدرسة"
            items={draft.about.highlights}
            onChange={(next) => setAbout({ highlights: next })}
            blank={() => ({ icon: "Sparkles", title: "", body: "" })}
            addLabel="إضافة ميزة"
            render={(item, update) => (
              <>
                <Field label="العنوان" value={item.title} onChange={(v) => update({ title: v })} />
                <IconField value={item.icon} onChange={(v) => update({ icon: v })} />
                <div className="sm:col-span-2">
                  <AreaField label="النص" value={item.body} onChange={(v) => update({ body: v })} />
                </div>
              </>
            )}
          />

          <ListSection
            title="الرسالة والرؤية والقيم"
            items={draft.about.pillars}
            onChange={(next) => setAbout({ pillars: next })}
            blank={() => ({ icon: "Target", title: "", body: "" })}
            addLabel="إضافة بطاقة"
            render={(item, update) => (
              <>
                <Field label="العنوان" value={item.title} onChange={(v) => update({ title: v })} />
                <IconField value={item.icon} onChange={(v) => update({ icon: v })} />
                <div className="sm:col-span-2">
                  <AreaField label="النص" value={item.body} onChange={(v) => update({ body: v })} />
                </div>
              </>
            )}
          />
        </TabsContent>

        {/* School life */}
        <TabsContent value="school-life" className="space-y-6">
          <Card className="rounded-[1.75rem] border-border/60 shadow-soft">
            <CardHeader>
              <CardTitle className="text-base font-extrabold">عناوين صفحة الحياة المدرسية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="عنوان فرعي — الجدول" value={draft.schoolLife.scheduleEyebrow} onChange={(v) => setSchoolLife({ scheduleEyebrow: v })} />
                <Field label="عنوان — الجدول" value={draft.schoolLife.scheduleTitle} onChange={(v) => setSchoolLife({ scheduleTitle: v })} />
              </div>
              <AreaField label="وصف الجدول" value={draft.schoolLife.scheduleDescription} onChange={(v) => setSchoolLife({ scheduleDescription: v })} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="عنوان فرعي — الأنشطة" value={draft.schoolLife.activities.eyebrow} onChange={(v) => setSchoolLife({ activities: { ...draft.schoolLife.activities, eyebrow: v } })} />
                <Field label="عنوان — الأنشطة" value={draft.schoolLife.activities.title} onChange={(v) => setSchoolLife({ activities: { ...draft.schoolLife.activities, title: v } })} />
              </div>
              <AreaField label="وصف الأنشطة" value={draft.schoolLife.activities.description} onChange={(v) => setSchoolLife({ activities: { ...draft.schoolLife.activities, description: v } })} />
              <p className="rounded-2xl bg-beige/60 px-4 py-3 text-xs font-semibold leading-relaxed text-muted-foreground">
                صور وفيديوهات الأنشطة تُدار من تبويب «المعرض» (أول ٦ عناصر تظهر في الصفحة الرئيسية وصفحة الحياة المدرسية).
              </p>
            </CardContent>
          </Card>

          <ListSection
            title="الجدول اليومي"
            items={draft.schoolLife.schedule}
            onChange={(next) => setSchoolLife({ schedule: next })}
            blank={() => ({ time: "", title: "", body: "" })}
            addLabel="إضافة فترة"
            render={(item, update) => (
              <>
                <Field label="الوقت" value={item.time} dir="ltr" onChange={(v) => update({ time: v })} />
                <Field label="العنوان" value={item.title} onChange={(v) => update({ title: v })} />
                <div className="sm:col-span-2">
                  <AreaField label="الوصف" value={item.body} onChange={(v) => update({ body: v })} />
                </div>
              </>
            )}
          />
        </TabsContent>

        {/* Gallery */}
        <TabsContent value="gallery" className="space-y-6">
          <ListSection
            title="معرض الصور والفيديو"
            items={draft.gallery}
            onChange={(next) => set("gallery", next)}
            blank={() => ({
              id: `g-${Date.now()}`,
              kind: "image" as const,
              src: "",
              title: "",
              description: "",
              category: "",
            })}
            addLabel="إضافة عنصر"
            render={(item, update) => (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-muted-foreground">النوع</Label>
                  <Select value={item.kind} onValueChange={(v) => update({ kind: v as "image" | "video" })}>
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">صورة</SelectItem>
                      <SelectItem value="video">فيديو</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Field
                  label="الفئة أو الفصل"
                  value={item.category}
                  placeholder="مثال: فنون · صغار المنال"
                  onChange={(v) => update({ category: v })}
                />
                <Field label="العنوان" value={item.title} onChange={(v) => update({ title: v })} />
                <div className="sm:col-span-2">
                  <MediaField
                    label={item.kind === "video" ? "ملف الفيديو" : "الصورة"}
                    value={item.src}
                    folder="site/gallery"
                    kind={item.kind}
                    accept={item.kind === "video" ? "video/*" : "image/*"}
                    onChange={(v) => update({ src: v })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <AreaField label="التوصيف" value={item.description} onChange={(v) => update({ description: v })} />
                </div>
              </>
            )}
          />
        </TabsContent>

        {/* Parent reviews */}
        <TabsContent value="reviews" className="space-y-6">
          <Card className="rounded-[1.75rem] border-border/60 shadow-soft">
            <CardHeader>
              <CardTitle className="text-base font-extrabold">نموذج مشاركة الآراء</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Switch
                  checked={draft.testimonialsForm.enabled}
                  onCheckedChange={(v) =>
                    set("testimonialsForm", { ...draft.testimonialsForm, enabled: v })
                  }
                />
                <span className="text-xs font-bold text-muted-foreground">
                  إتاحة كتابة الآراء لأولياء الأمور في الموقع
                </span>
              </div>
              <Field
                label="عنوان النموذج"
                value={draft.testimonialsForm.title}
                onChange={(v) => set("testimonialsForm", { ...draft.testimonialsForm, title: v })}
              />
              <AreaField
                label="النص التوضيحي"
                value={draft.testimonialsForm.note}
                onChange={(v) => set("testimonialsForm", { ...draft.testimonialsForm, note: v })}
              />
            </CardContent>
          </Card>

          <TestimonialsModeration
            canModerate={hasPermission(P.reviewsModerate)}
            canDelete={hasPermission(P.reviewsModerate) && hasPermission(P.inboxDelete)}
            canReply={hasPermission(P.inboxReply)}
          />
        </TabsContent>

        {/* Page heroes */}
        <TabsContent value="pages" className="space-y-6">
          <p className="rounded-2xl bg-beige/60 px-4 py-3 text-xs font-semibold leading-relaxed text-muted-foreground">
            رؤوس الصفحات العامة: عنا، التواصل، الأسئلة، المعرض، الأخبار، والحياة المدرسية.
          </p>
          {Object.entries(draft.pages).map(([key, hero]) => (
            <Card key={key} className="rounded-[1.75rem] border-border/60 shadow-soft">
              <CardHeader>
                <CardTitle className="text-base font-extrabold" dir="ltr">
                  /{key}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="العنوان الفرعي" value={hero.eyebrow} onChange={(v) => setPage(key, { eyebrow: v })} />
                  <Field label="العنوان الرئيسي" value={hero.title} onChange={(v) => setPage(key, { title: v })} />
                </div>
                <AreaField label="الوصف" value={hero.description} onChange={(v) => setPage(key, { description: v })} />
                <MediaField
                  label="خلفية رأس الصفحة"
                  value={hero.image ?? ""}
                  folder="site/pages"
                  onChange={(v) => setPage(key, { image: v })}
                />
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Content lists */}
        <TabsContent value="content" className="space-y-6">
          <ListSection
            title="مزايا المدرسة (بطاقات القيم)"
            items={draft.values}
            onChange={(next) => set("values", next)}
            blank={() => ({ title: "", description: "", icon: "Sparkles", tone: "rose" })}
            addLabel="إضافة ميزة"
            render={(item, update) => (
              <>
                <Field label="العنوان" value={item.title} onChange={(v) => update({ title: v })} />
                <IconField value={item.icon} onChange={(v) => update({ icon: v })} />
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-muted-foreground">اللون</Label>
                  <Select value={item.tone} onValueChange={(v) => update({ tone: v })}>
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["rose", "sky", "mint", "lavender", "gold"].map((tone) => (
                        <SelectItem key={tone} value={tone}>
                          {tone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <AreaField label="الوصف" value={item.description} onChange={(v) => update({ description: v })} />
                </div>
              </>
            )}
          />

          <ListSection
            title="آراء أولياء الأمور"
            items={draft.testimonials}
            onChange={(next) => set("testimonials", next)}
            blank={() => ({ name: "", role: "", quote: "" })}
            addLabel="إضافة رأي"
            render={(item, update) => (
              <>
                <Field label="الاسم" value={item.name} onChange={(v) => update({ name: v })} />
                <Field label="الصفة" value={item.role} onChange={(v) => update({ role: v })} />
                <div className="sm:col-span-2">
                  <AreaField label="النص" value={item.quote} onChange={(v) => update({ quote: v })} />
                </div>
              </>
            )}
          />

          <ListSection
            title="الأخبار"
            items={draft.news}
            onChange={(next) => set("news", next)}
            blank={() => ({
              slug: `news-${Date.now()}`,
              title: "",
              date: new Date().toISOString().slice(0, 10),
              dateLabel: "",
              category: "أخبار",
              excerpt: "",
              image: "",
              video: "",
              body: "",
            })}
            addLabel="إضافة خبر"
            render={(item, update) => (
              <>
                <Field label="العنوان" value={item.title} onChange={(v) => update({ title: v })} />
                <Field label="التصنيف" value={item.category} onChange={(v) => update({ category: v })} />
                <Field label="التاريخ" value={item.date} dir="ltr" onChange={(v) => update({ date: v })} />
                <Field label="التاريخ المعروض" value={item.dateLabel} onChange={(v) => update({ dateLabel: v })} />
                <div className="sm:col-span-2">
                  <AreaField label="الملخص" value={item.excerpt} onChange={(v) => update({ excerpt: v })} />
                </div>
                <div className="sm:col-span-2">
                  <AreaField
                    label="التفاصيل (اختياري)"
                    value={item.body ?? ""}
                    rows={5}
                    onChange={(v) => update({ body: v })}
                  />
                </div>
                <MediaField
                  label="صورة الخبر"
                  value={item.image ?? ""}
                  folder="site/news"
                  onChange={(v) => update({ image: v })}
                />
                <MediaField
                  label="فيديو الخبر (اختياري)"
                  value={item.video ?? ""}
                  folder="site/news"
                  kind="video"
                  accept="video/*"
                  onChange={(v) => update({ video: v })}
                />
              </>
            )}
          />

          <ListSection
            title="الأسئلة الشائعة"
            items={draft.faqs}
            onChange={(next) => set("faqs", next)}
            blank={() => ({ q: "", a: "" })}
            addLabel="إضافة سؤال"
            render={(item, update) => (
              <>
                <div className="sm:col-span-2">
                  <Field label="السؤال" value={item.q} onChange={(v) => update({ q: v })} />
                </div>
                <div className="sm:col-span-2">
                  <AreaField label="الإجابة" value={item.a} onChange={(v) => update({ a: v })} />
                </div>
              </>
            )}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, CloudUpload, Loader2, PartyPopper } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getAdmissionCatalog } from "@/features/admissions/catalog.functions";
import {
  checkChildDuplicate,
  deleteApplicationDocument,
  getApplication,
  saveApplicationChildren,
  saveApplicationDocument,
  saveApplicationDraft,
  saveApplicationQurra,
  saveApplicationServices,
  submitApplicationFn,
} from "@/features/admissions/application.functions";
import { ageInMonths, isQurraEligible } from "@/features/admissions/eligibility";
import {
  childrenSchema,
  emptyChild,
  parentInfoSchema,
  type ChildInput,
  type ParentInfoInput,
  type QurraInput,
} from "@/features/admissions/schemas";
import { ChildrenStep } from "@/features/admissions/components/steps/ChildrenStep";
import { DocumentsStep } from "@/features/admissions/components/steps/DocumentsStep";
import {
  computeFinancials,
  FinancialStep,
} from "@/features/admissions/components/steps/FinancialStep";
import { ParentStep } from "@/features/admissions/components/steps/ParentStep";
import { QurraStep } from "@/features/admissions/components/steps/QurraStep";
import { ReviewStep } from "@/features/admissions/components/steps/ReviewStep";
import { ServicesStep } from "@/features/admissions/components/steps/ServicesStep";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/apply/$applicationId")({
  head: () => ({
    meta: [
      { title: "استكمال طلب القبول | مدارس وروضة المنال" },
      {
        name: "description",
        content: "أكمل خطوات طلب القبول في مدارس وروضة المنال بعنيزة واحفظ تقدّمك في أي وقت.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  errorComponent: () => (
    <div className="section-y text-center">
      <p className="text-xl font-black text-foreground">تعذّر فتح الطلب</p>
      <Button asChild variant="hero" className="mt-6">
        <Link to="/my-applications">طلباتي</Link>
      </Button>
    </div>
  ),
  component: WizardPage,
});

const STEPS = [
  { id: 3, label: "ولي الأمر" },
  { id: 4, label: "الأبناء" },
  { id: 5, label: "قرة" },
  { id: 6, label: "الخدمات" },
  { id: 7, label: "المستندات" },
  { id: 8, label: "المراجعة" },
  { id: 9, label: "الملخص المالي" },
];

const emptyParent = (): ParentInfoInput => ({
  nationalId: "",
  nationality: "saudi",
  country: "",
  fullName: "",
  gender: "male",
  birthDate: "",
  mobile: "",
  altMobile: "",
  email: "",
  relationship: "father",
  occupation: "",
  employer: "",
  nationalAddress: "",
  city: "عنيزة",
  district: "",
  mapUrl: "",
});

const emptyQurra = (): QurraInput => ({
  requested: false,
  declarationAccepted: false,
  motherNationalId: "",
  motherEmploymentStatus: "",
  motherEmployer: "",
  motherJobTitle: "",
  notes: "",
});

function WizardPage() {
  const { applicationId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const fetchApplication = useServerFn(getApplication);
  const fetchCatalog = useServerFn(getAdmissionCatalog);
  const saveDraft = useServerFn(saveApplicationDraft);
  const saveChildrenFn = useServerFn(saveApplicationChildren);
  const saveQurraFn = useServerFn(saveApplicationQurra);
  const saveServicesFn = useServerFn(saveApplicationServices);
  const recordDoc = useServerFn(saveApplicationDocument);
  const removeDoc = useServerFn(deleteApplicationDocument);
  const checkDuplicate = useServerFn(checkChildDuplicate);
  const submit = useServerFn(submitApplicationFn);

  const appQuery = useMemo(
    () =>
      queryOptions({
        queryKey: ["application", applicationId],
        queryFn: () => fetchApplication({ data: applicationId }),
      }),
    [applicationId, fetchApplication],
  );
  const catalogQuery = useMemo(
    () => queryOptions({ queryKey: ["admissions", "catalog"], queryFn: () => fetchCatalog() }),
    [fetchCatalog],
  );

  const { data: bundle } = useSuspenseQuery(appQuery);
  const { data: catalog } = useSuspenseQuery(catalogQuery);

  const draft = (bundle.application.draft_data ?? {}) as {
    parent?: ParentInfoInput;
    children?: ChildInput[];
    qurra?: QurraInput;
  };

  const [step, setStep] = useState(() => Math.min(Math.max(bundle.application.current_step, 3), 9));
  const [parent, setParent] = useState<ParentInfoInput>(() => ({ ...emptyParent(), ...draft.parent }));
  const [children, setChildren] = useState<ChildInput[]>(() =>
    draft.children?.length ? draft.children : [emptyChild()],
  );
  const [qurra, setQurra] = useState<QurraInput>(() => ({ ...emptyQurra(), ...draft.qurra }));
  const [services, setServices] = useState<string[]>(() => bundle.services);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicates, setDuplicates] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ applicationNumber: string; trackingNumber: string } | null>(null);

  const stage = catalog.stages.find((s) => s.id === bundle.application.stage_id);
  const submitted = bundle.application.status !== "draft" && bundle.application.status !== "needs_action";

  // Debounced autosave of the draft payload.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (submitted || done) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSaving(true);
      try {
        const res = await saveDraft({
          data: { id: applicationId, step, draft: { parent, children, qurra } },
        });
        setSavedAt(res.savedAt);
      } catch {
        /* autosave is best-effort */
      } finally {
        setSaving(false);
      }
    }, 1200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [parent, children, qurra, step, applicationId, saveDraft, submitted, done]);

  const childAgeMonths = ageInMonths(children[0]?.birthDate);
  const qurraEligible = isQurraEligible(
    parent.nationality === "saudi" ? "saudi" : "resident",
    childAgeMonths,
  );

  const requiredDocTypes = catalog.documentTypes.filter((d) => {
    if (d.applies_to_nationality !== "all" && d.applies_to_nationality !== parent.nationality) return false;
    if (d.applies_to_stage_slug && stage && d.applies_to_stage_slug !== stage.slug) return false;
    if (d.requires_service_slug) {
      const svc = catalog.services.find((s) => s.slug === d.requires_service_slug);
      if (!svc || !services.includes(svc.id)) return false;
    }
    return true;
  });

  const financials = computeFinancials({
    childCount: children.length,
    admissionFeePerChild: Number(stage?.admission_fee ?? 0),
    tuitionPerChild: Number(stage?.tuition_from ?? 0),
    servicePrices: catalog.services
      .filter((s) => s.is_required || services.includes(s.id))
      .map((s) => Number(s.price)),
  });

  async function goNext() {
    setBusy(true);
    setErrors({});
    try {
      if (step === 3) {
        const parsed = parentInfoSchema.safeParse(parent);
        if (!parsed.success) {
          const next: Record<string, string> = {};
          for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
          setErrors(next);
          toast.error("يرجى تصحيح البيانات المطلوبة");
          return;
        }
      }

      if (step === 4) {
        const parsed = childrenSchema.safeParse(children);
        if (!parsed.success) {
          const next: Record<string, string> = {};
          for (const issue of parsed.error.issues) next[issue.path.join(".")] = issue.message;
          setErrors(next);
          toast.error("يرجى استكمال بيانات الأبناء");
          return;
        }
        const dupes: Record<number, boolean> = {};
        for (let i = 0; i < children.length; i++) {
          const res = await checkDuplicate({ data: children[i].nationalId });
          if (res.duplicate) dupes[i] = true;
        }
        setDuplicates(dupes);
        if (Object.keys(dupes).length) {
          toast.error("يوجد طلب سابق بنفس رقم هوية الطفل");
          return;
        }
        await saveChildrenFn({ data: { id: applicationId, children: parsed.data } });
      }

      if (step === 5 && qurraEligible) {
        if (qurra.requested && !qurra.declarationAccepted) {
          setErrors({ declarationAccepted: "يجب الموافقة على الإقرار" });
          return;
        }
        await saveQurraFn({ data: { id: applicationId, qurra } });
      }

      if (step === 6) {
        await saveServicesFn({ data: { id: applicationId, serviceIds: services } });
      }

      if (step === 7) {
        const missing = requiredDocTypes.filter(
          (d) => d.is_required && !bundle.documents.some((u) => u.document_type_slug === d.slug),
        );
        if (missing.length) {
          toast.error(`مستندات مطلوبة ناقصة: ${missing.map((m) => m.name_ar).join("، ")}`);
          return;
        }
      }

      await saveDraft({ data: { id: applicationId, step: step + 1, draft: { parent, children, qurra } } });
      setStep((s) => Math.min(s + 1, 9));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "حدث خطأ غير متوقع");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpload(slug: string, file: File) {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("حجم الملف يتجاوز 10 ميغابايت");
      return;
    }
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const safeName = file.name.replace(/[^\w.\-]/g, "_").slice(-60);
    const path = `${auth.user.id}/${applicationId}/${slug}-${Date.now()}-${safeName}`;

    const { error } = await supabase.storage.from("admission-documents").upload(path, file);
    if (error) {
      toast.error("تعذّر رفع الملف، حاول مرة أخرى");
      return;
    }
    await recordDoc({
      data: { id: applicationId, slug, filePath: path, fileName: file.name, fileSize: file.size },
    });
    await queryClient.invalidateQueries({ queryKey: ["application", applicationId] });
    toast.success("تم رفع المستند");
  }

  async function handleRemove(docId: string) {
    await removeDoc({ data: { id: applicationId, docId } });
    await queryClient.invalidateQueries({ queryKey: ["application", applicationId] });
  }

  async function handleSubmit() {
    setBusy(true);
    try {
      const res = await submit({ data: applicationId });
      setDone({ applicationNumber: res.applicationNumber, trackingNumber: res.trackingNumber });
      await queryClient.invalidateQueries({ queryKey: ["application", applicationId] });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر إرسال الطلب");
    } finally {
      setBusy(false);
    }
  }

  if (done || submitted) {
    const number = done?.applicationNumber ?? bundle.application.application_number ?? "—";
    const tracking = done?.trackingNumber ?? bundle.application.tracking_number ?? "—";
    return (
      <section className="section-y">
        <div className="mx-auto max-w-2xl px-4 text-center md:px-8">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 18 }}
            className="rounded-[3rem] bg-card p-10 shadow-card"
          >
            <span className="mx-auto grid size-16 place-items-center rounded-3xl gradient-burgundy text-primary-foreground">
              <PartyPopper className="size-7" />
            </span>
            <h1 className="mt-6 text-3xl font-black text-foreground">تم استلام طلبك بنجاح</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              سيقوم مسؤول القبول بمراجعة الطلب والتواصل معك. احتفظ برقم التتبع لمتابعة حالة الطلب.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-beige/70 p-5">
                <p className="text-xs font-bold text-muted-foreground">رقم الطلب</p>
                <p className="mt-1 font-black text-primary" dir="ltr">{number}</p>
              </div>
              <div className="rounded-2xl bg-beige/70 p-5">
                <p className="text-xs font-bold text-muted-foreground">رقم التتبع</p>
                <p className="mt-1 font-black text-primary" dir="ltr">{tracking}</p>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button variant="hero" onClick={() => navigate({ to: "/my-applications" })}>
                متابعة طلباتي
              </Button>
              <Button asChild variant="soft">
                <Link to="/">العودة للرئيسية</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    );
  }

  const activeIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <section className="section-y">
      <div className="mx-auto max-w-4xl px-4 md:px-8">
        {/* Stepper */}
        <div className="rounded-[2.5rem] bg-card p-6 shadow-card">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-muted-foreground">طلب قبول — {stage?.name_ar ?? ""}</p>
              <h1 className="mt-1 text-2xl font-black text-foreground">{STEPS[activeIndex]?.label}</h1>
            </div>
            <span className="flex items-center gap-2 rounded-full bg-beige px-3 py-1.5 text-xs font-bold text-foreground">
              {saving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> جارٍ الحفظ
                </>
              ) : savedAt ? (
                <>
                  <CloudUpload className="size-3.5" /> تم حفظ المسودة
                </>
              ) : (
                <>الخطوة {activeIndex + 1} من {STEPS.length}</>
              )}
            </span>
          </div>

          <div className="mt-6 flex items-center gap-1.5">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex-1">
                <div
                  className={`h-2 rounded-full transition-colors ${
                    i <= activeIndex ? "gradient-burgundy" : "bg-border"
                  }`}
                />
                <p
                  className={`mt-2 hidden text-center text-[11px] font-bold sm:block ${
                    i <= activeIndex ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Step body */}
        <div className="mt-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              {step === 3 ? (
                <ParentStep
                  value={parent}
                  errors={errors as Partial<Record<keyof ParentInfoInput, string>>}
                  onChange={(p) => setParent((prev) => ({ ...prev, ...p }))}
                />
              ) : null}

              {step === 4 ? (
                <ChildrenStep
                  children={children}
                  errors={errors}
                  duplicates={duplicates}
                  stages={catalog.stages}
                  classrooms={catalog.classrooms}
                  onChange={setChildren}
                />
              ) : null}

              {step === 5 ? (
                <QurraStep
                  value={qurra}
                  eligible={qurraEligible}
                  errors={errors}
                  onChange={(p) => setQurra((prev) => ({ ...prev, ...p }))}
                />
              ) : null}

              {step === 6 ? (
                <ServicesStep
                  services={catalog.services}
                  selected={services}
                  onToggle={(id) =>
                    setServices((prev) =>
                      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
                    )
                  }
                />
              ) : null}

              {step === 7 ? (
                <DocumentsStep
                  types={requiredDocTypes}
                  uploaded={bundle.documents}
                  onUpload={handleUpload}
                  onRemove={handleRemove}
                />
              ) : null}

              {step === 8 ? (
                <ReviewStep
                  parent={parent}
                  children={children}
                  qurra={qurra}
                  stageName={stage?.name_ar ?? "—"}
                  serviceNames={catalog.services
                    .filter((s) => s.is_required || services.includes(s.id))
                    .map((s) => s.name_ar)}
                  documentNames={bundle.documents.map((d) => d.file_name ?? "ملف مرفوع")}
                  onEdit={(target) => setStep(Math.max(3, target))}
                />
              ) : null}

              {step === 9 ? <FinancialStep data={financials} /> : null}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Nav */}
        <div className="mt-10 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="soft"
            disabled={step === 3 || busy}
            onClick={() => setStep((s) => Math.max(3, s - 1))}
          >
            <ArrowRight className="size-4" />
            السابق
          </Button>

          {step < 9 ? (
            <Button type="button" variant="hero" size="lg" disabled={busy} onClick={goNext}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              التالي
              <ArrowLeft className="size-4" />
            </Button>
          ) : (
            <Button type="button" variant="hero" size="lg" disabled={busy} onClick={handleSubmit}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              إرسال الطلب
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
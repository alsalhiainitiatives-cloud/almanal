import { useEffect, useMemo, useRef, useState } from "react";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Baby,
  Check,
  ClipboardCheck,
  FileText,
  HeartHandshake,
  Loader2,
  PartyPopper,
  Sparkles,
  UserRound,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { ageInMonths } from "@/features/admissions/eligibility";
import {
  childrenSchema,
  emptyChild,
  parentInfoSchema,
  type ChildInput,
  type ParentInfoInput,
  type QurraInput,
} from "@/features/admissions/schemas";
import { WizardShell, type WizardStep } from "@/features/admissions/components/WizardShell";
import { CustomFields } from "@/features/admissions/components/CustomFields";
import {
  BUILTIN_STEP_IDS,
  stepIcon,
  useFormConfig,
  validateCustomFields,
  type CustomValues,
  type FormFieldRow,
} from "@/features/admissions/form-config";
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

type WizardStepWithKey = WizardStep & { key: string };

const STEPS: WizardStepWithKey[] = [
  {
    id: 3,
    key: "parent",
    label: "بيانات ولي الأمر",
    short: "ولي الأمر",
    description: "الهوية والجنسية وبيانات التواصل والعنوان الوطني.",
    icon: UserRound,
  },
  {
    id: 4,
    key: "children",
    label: "بيانات الأبناء",
    short: "الأبناء",
    description: "بيانات كل طفل مع حساب العمر وتحديد المرحلة والفصول المفضلة.",
    icon: Baby,
  },
  {
    id: 5,
    key: "qurra",
    label: "برنامج قرة",
    short: "قرة",
    description: "تأكيد طلب دعم قرة للأمهات السعوديات العاملات.",
    icon: HeartHandshake,
  },
  {
    id: 6,
    key: "services",
    label: "الخدمات الإضافية",
    short: "الخدمات",
    description: "اختر النقل والوجبات والأنشطة التي تناسب أسرتك.",
    icon: Sparkles,
  },
  {
    id: 7,
    key: "documents",
    label: "المستندات المطلوبة",
    short: "المستندات",
    description: "مستندات ولي الأمر ومستندات مستقلة لكل طفل.",
    icon: FileText,
  },
  {
    id: 8,
    key: "review",
    label: "مراجعة الطلب",
    short: "المراجعة",
    description: "راجع كل البيانات وعدّل ما تحتاجه قبل الإرسال.",
    icon: ClipboardCheck,
  },
  {
    id: 9,
    key: "financial",
    label: "الملخص المالي",
    short: "المالية",
    description: "تفاصيل الرسوم والخصومات والمبلغ الإجمالي.",
    icon: Wallet,
  },
];

const SECTION_LABELS: Record<string, string> = {
  parent: "بيانات ولي الأمر",
  children: "بيانات الأبناء",
  qurra: "برنامج قرة",
  services: "الخدمات الإضافية",
  documents: "المستندات",
};

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
  relationshipOther: "",
  occupation: "",
  employer: "",
  nationalAddress: "",
  city: "عنيزة",
  district: "",
  mapUrl: "",
  motherIsWorking: undefined,
  motherEmployer: "",
  motherJobTitle: "",
  motherDeclaration: false,
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
    parent?: Partial<ParentInfoInput>;
    children?: ChildInput[];
    qurra?: Partial<QurraInput>;
  };

  /* Correction mode: staff asked for fixes in specific sections only. */
  const correctionSections = ((bundle.application as { correction_sections?: string[] | null })
    .correction_sections ?? []) as string[];
  const correctionNote = (bundle.application as { correction_note?: string | null }).correction_note ?? null;
  const correctionMode =
    bundle.application.status === "needs_action" && correctionSections.length > 0;
  const SECTION_STEP: Record<string, number> = {
    parent: 3,
    children: 4,
    qurra: 5,
    services: 6,
    documents: 7,
  };
  const allowedStepIds = correctionMode
    ? new Set([...correctionSections.map((s) => SECTION_STEP[s]).filter(Boolean), 8, 9])
    : new Set(STEPS.map((s) => s.id));
  const visibleSteps = STEPS.filter((s) => allowedStepIds.has(s.id));
  const firstStepId = visibleSteps[0]?.id ?? 3;
  const lastStepId = visibleSteps[visibleSteps.length - 1]?.id ?? 9;

  const [step, setStep] = useState(() =>
    correctionMode ? firstStepId : Math.min(Math.max(bundle.application.current_step, 3), 9),
  );
  const [parent, setParent] = useState<ParentInfoInput>(() => ({ ...emptyParent(), ...draft.parent }));
  const [children, setChildren] = useState<ChildInput[]>(() =>
    draft.children?.length ? draft.children : [emptyChild()],
  );
  const [qurra, setQurra] = useState<QurraInput>(() => ({ ...emptyQurra(), ...draft.qurra }));
  const [services, setServices] = useState<string[]>(() => bundle.services);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicates, setDuplicates] = useState<Record<number, string>>({});
  const [duplicateDialog, setDuplicateDialog] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ applicationNumber: string; trackingNumber: string } | null>(null);

  const stage =
    catalog.stages.find((s) => s.id === bundle.application.stage_id) ??
    catalog.stages.find(
      (s) =>
        s.id ===
        (children.find((c) => c.stageId)?.stageId ??
          catalog.classrooms.find((c) => c.id === children.find((ch) => ch.classroomId)?.classroomId)
            ?.stage_id),
    );
  const submitted =
    bundle.application.status !== "draft" && bundle.application.status !== "needs_action";

  /* ---------------------------------------------------------------- */
  /* Qurra mirrors the guardian step — no duplicate data entry.        */
  /* ---------------------------------------------------------------- */
  const youngestMonths = children
    .map((c) => ageInMonths(c.birthDate))
    .filter((m): m is number => m !== null)
    .sort((a, b) => a - b)[0];

  const qurraEligible =
    parent.relationship === "mother" &&
    parent.nationality === "saudi" &&
    youngestMonths !== undefined &&
    youngestMonths < 72;

  const qurraReason =
    parent.relationship !== "mother"
      ? "دعم «قرة» يُقدَّم من الأم مباشرة. إذا كنتِ الأم، عدّلي صلة القرابة في خطوة ولي الأمر."
      : parent.nationality !== "saudi"
        ? "دعم «قرة» متاح للأمهات السعوديات فقط."
        : "دعم «قرة» مخصص للأطفال دون سن السادسة.";

  useEffect(() => {
    if (!qurraEligible) return;
    setQurra((prev) => {
      const next: QurraInput = {
        ...prev,
        motherNationalId: parent.nationalId,
        motherEmploymentStatus:
          parent.motherIsWorking === "yes"
            ? "working"
            : parent.motherIsWorking === "no"
              ? "not_working"
              : "",
        motherEmployer: parent.motherEmployer ?? "",
        motherJobTitle: parent.motherJobTitle ?? "",
      };
      const same =
        prev.motherNationalId === next.motherNationalId &&
        prev.motherEmploymentStatus === next.motherEmploymentStatus &&
        prev.motherEmployer === next.motherEmployer &&
        prev.motherJobTitle === next.motherJobTitle;
      return same ? prev : next;
    });
  }, [
    qurraEligible,
    parent.nationalId,
    parent.motherIsWorking,
    parent.motherEmployer,
    parent.motherJobTitle,
  ]);

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

  /* ---------------------------------------------------------------- */
  /* Documents: parent-scoped once, child-scoped per child.            */
  /* ---------------------------------------------------------------- */
  const applicableDocTypes = catalog.documentTypes.filter((d) => {
    if (d.applies_to_nationality !== "all" && d.applies_to_nationality !== parent.nationality)
      return false;
    if (d.applies_to_stage_slug && stage && d.applies_to_stage_slug !== stage.slug) return false;
    if (d.requires_service_slug) {
      const svc = catalog.services.find((s) => s.slug === d.requires_service_slug);
      if (!svc || !services.includes(svc.id)) return false;
    }
    return true;
  });

  const parentDocTypes = applicableDocTypes.filter((d) => d.scope !== "child");
  const childDocTypes = applicableDocTypes.filter((d) => d.scope === "child");
  const uploadedDocs = bundle.documents as unknown as {
    id: string;
    document_type_slug: string;
    file_name: string | null;
    file_size: number | null;
    child_index: number | null;
  }[];

  const financials = computeFinancials({
    childCount: children.length,
    admissionFeePerChild: Number(stage?.admission_fee ?? 0),
    tuitionPerChild: Number(stage?.tuition_from ?? 0),
    servicePrices: catalog.services
      .filter((s) => s.is_required || services.includes(s.id))
      .map((s) => Number(s.price)),
  });

  const classroomNameOf = (id?: string) =>
    catalog.classrooms.find((c) => c.id === id)?.name_ar ?? "ترك الاختيار للإدارة";

  const stageNameOf = (classroomId?: string) => {
    const cls = catalog.classrooms.find((c) => c.id === classroomId);
    const stageId = cls?.stage_id ?? stage?.id;
    return catalog.stages.find((s) => s.id === stageId)?.name_ar ?? stage?.name_ar ?? "—";
  };

  /* ---------------------------------------------------------------- */

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
        await saveChildrenFn({ data: { id: applicationId, children: parsed.data } });
      }

      if (step === 5) {
        if (qurraEligible && qurra.requested && !qurra.declarationAccepted) {
          setErrors({ declarationAccepted: "يجب الموافقة على الإقرار" });
          return;
        }
        await saveQurraFn({
          data: { id: applicationId, qurra: qurraEligible ? qurra : emptyQurra() },
        });
      }

      if (step === 6) {
        await saveServicesFn({ data: { id: applicationId, serviceIds: services } });
      }

      if (step === 7) {
        const missing: string[] = [];
        for (const d of parentDocTypes) {
          if (
            d.is_required &&
            !uploadedDocs.some((u) => u.document_type_slug === d.slug && u.child_index === null)
          ) {
            missing.push(d.name_ar);
          }
        }
        children.forEach((c, i) => {
          for (const d of childDocTypes) {
            if (
              d.is_required &&
              !uploadedDocs.some((u) => u.document_type_slug === d.slug && u.child_index === i)
            ) {
              missing.push(`${d.name_ar} — ${c.nameAr || `الطفل ${i + 1}`}`);
            }
          }
        });
        if (missing.length) {
          toast.error(`مستندات مطلوبة ناقصة: ${missing.slice(0, 3).join("، ")}`);
          return;
        }
      }

      await saveDraft({
        data: { id: applicationId, step: step + 1, draft: { parent, children, qurra } },
      });
      setStep((s) => {
        const idx = visibleSteps.findIndex((v) => v.id === s);
        return visibleSteps[Math.min(idx + 1, visibleSteps.length - 1)]?.id ?? s;
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "حدث خطأ غير متوقع");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpload(slug: string, file: File, childIndex: number | null) {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("حجم الملف يتجاوز 10 ميغابايت");
      return;
    }
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const safeName = file.name.replace(/[^\w.\-]/g, "_").slice(-60);
    const scope = childIndex === null ? "parent" : `child${childIndex}`;
    const path = `${auth.user.id}/${applicationId}/${scope}-${slug}-${Date.now()}-${safeName}`;

    const { error } = await supabase.storage.from("admission-documents").upload(path, file);
    if (error) {
      toast.error("تعذّر رفع الملف، حاول مرة أخرى");
      return;
    }
    await recordDoc({
      data: {
        id: applicationId,
        slug,
        filePath: path,
        fileName: file.name,
        fileSize: file.size,
        childIndex,
      },
    });
    await queryClient.invalidateQueries({ queryKey: ["application", applicationId] });
    toast.success("تم رفع المستند");
  }

  async function handleRemove(docId: string) {
    await removeDoc({ data: { id: applicationId, docId } });
    await queryClient.invalidateQueries({ queryKey: ["application", applicationId] });
  }

  /** Final gate: duplicate national IDs are only fatal at submission time. */
  async function handleSubmit() {
    setBusy(true);
    try {
      const seen = new Map<string, number>();
      const found: Record<number, string> = {};

      for (let i = 0; i < children.length; i++) {
        const id = children[i].nationalId;
        if (seen.has(id)) {
          found[i] = `رقم الهوية مكرر داخل نفس الطلب (الطفل ${(seen.get(id) ?? 0) + 1}).`;
          continue;
        }
        seen.set(id, i);
        const res = await checkDuplicate({
          data: { nationalId: id, excludeApplicationId: applicationId },
        });
        if (res.duplicate) {
          found[i] = res.isMine
            ? `لديك طلب آخر بنفس رقم الهوية${res.applicationNumber ? ` (${res.applicationNumber})` : ""} لهذا العام الدراسي.`
            : "يوجد طلب مسجّل بنفس رقم الهوية لهذا العام الدراسي — يرجى مراجعة إدارة القبول.";
        }
      }

      if (Object.keys(found).length) {
        setDuplicates(found);
        setDuplicateDialog(Object.values(found).join(" "));
        return;
      }

      setDuplicates({});
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
              سيقوم مسؤول القبول بمراجعة الطلب والتواصل معك. احتفظ برقم الطلب لمتابعة حالته.
            </p>
            <div className="mt-7 rounded-2xl bg-beige/70 p-5">
              <p className="text-xs font-bold text-muted-foreground">رقم الطلب</p>
              <p className="mt-1 text-xl font-black text-primary" dir="ltr">
                {number}
              </p>
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

  const activeIndex = visibleSteps.findIndex((s) => s.id === step);

  return (
    <>
      <WizardShell
        steps={visibleSteps}
        activeIndex={activeIndex}
        stageName={stage?.name_ar ?? ""}
        saving={saving}
        savedAt={savedAt}
        onJump={(id) => {
          setStep(id);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        footer={
          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="soft"
              disabled={step === firstStepId || busy}
              onClick={() => {
                setStep((s) => {
                  const idx = visibleSteps.findIndex((v) => v.id === s);
                  return visibleSteps[Math.max(idx - 1, 0)]?.id ?? s;
                });
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              <ArrowRight className="size-4" />
              السابق
            </Button>

            {step !== lastStepId ? (
              <Button type="button" variant="hero" size="lg" disabled={busy} onClick={goNext}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                التالي
                <ArrowLeft className="size-4" />
              </Button>
            ) : (
              <Button type="button" variant="hero" size="lg" disabled={busy} onClick={handleSubmit}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                {correctionMode ? "إرسال التصحيحات" : "إرسال الطلب"}
              </Button>
            )}
          </div>
        }
      >
        {correctionMode ? (
          <div className="mb-5 rounded-3xl border border-gold/50 bg-gold/12 p-4">
            <p className="text-sm font-black text-foreground">مطلوب تصحيح من إدارة القبول</p>
            <p className="mt-1 text-xs font-bold text-muted-foreground">
              الأقسام المفتوحة للتعديل: {correctionSections.map((s) => SECTION_LABELS[s] ?? s).join("، ")}
            </p>
            {correctionNote ? (
              <p className="mt-2 text-xs leading-relaxed whitespace-pre-wrap text-foreground">{correctionNote}</p>
            ) : null}
          </div>
        ) : null}
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
                reason={qurraReason}
                errors={errors}
                onChange={(p) => setQurra((prev) => ({ ...prev, ...p }))}
                onEditParent={() => setStep(3)}
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
                parentTypes={parentDocTypes}
                childTypes={childDocTypes}
                childNames={children.map((c, i) => c.nameAr || `الطفل ${i + 1}`)}
                uploaded={uploadedDocs}
                onUpload={handleUpload}
                onRemove={handleRemove}
              />
            ) : null}

            {step === 8 ? (
              <ReviewStep
                parent={parent}
                children={children}
                qurra={qurra}
                classroomNameOf={classroomNameOf}
                stageNameOf={stageNameOf}
                serviceNames={catalog.services
                  .filter((s) => s.is_required || services.includes(s.id))
                  .map((s) => s.name_ar)}
                documentNames={uploadedDocs.map((d) => d.file_name ?? "ملف مرفوع")}
                onEdit={(target) => {
                  setStep(Math.max(3, target));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            ) : null}

            {step === 9 ? <FinancialStep data={financials} /> : null}
          </motion.div>
        </AnimatePresence>
      </WizardShell>

      <AlertDialog open={Boolean(duplicateDialog)} onOpenChange={() => setDuplicateDialog(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              تعذّر إرسال الطلب — بيانات مكررة
            </AlertDialogTitle>
            <AlertDialogDescription className="text-start leading-relaxed">
              {duplicateDialog}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إغلاق</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setDuplicateDialog(null);
                setStep(4);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              مراجعة بيانات الأبناء
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

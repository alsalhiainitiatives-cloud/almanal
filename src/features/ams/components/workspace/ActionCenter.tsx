import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Armchair,
  BadgeCheck,
  BellRing,
  CheckCircle2,
  ChevronsUpDown,
  CircleSlash,
  Eye,
  FileCheck2,
  FileWarning,
  ListOrdered,
  Lock,
  Undo2,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/AuthProvider";
import { ageInMonths, detectNationality, formatAge } from "@/features/admissions/eligibility";
import {
  amsDecide,
  amsManageSeat,
  amsMoveToWaitingList,
  amsNudgePrincipal,
  amsRecommend,
  amsRequestDocuments,
  amsRequestCorrections,
  amsSetPriority,
  amsStartReview,
  amsUpdateQurra,
} from "../../ams.functions";
import { PAYMENT_STATUS_LABELS, can } from "../../roles";
import { documentCompletion } from "../../recommendations";
import { DocumentReview } from "./DocumentReview";
import { WAITLIST_REASONS, evaluatePreferences, waitlistSummary } from "../../waitlist-reasons";
import type { WorkspaceData } from "../../types";
import type { AppRole } from "@/features/auth/rbac";

type DialogKind =
  | null
  | "request"
  | "corrections"
  | "recommend"
  | "nudge"
  | "approve"
  | "reject"
  | "seat"
  | "waitlist"
  | "qurra";

const CORRECTION_OPTIONS = [
  { value: "parent", label: "بيانات ولي الأمر" },
  { value: "children", label: "بيانات الأبناء" },
  { value: "qurra", label: "برنامج قرة" },
  { value: "services", label: "الخدمات الإضافية" },
  { value: "documents", label: "المستندات" },
] as const;
type CorrectionSection = (typeof CORRECTION_OPTIONS)[number]["value"];

/** One numbered stage of the official review workflow. */
function Stage({ index, title, hint, children }: { index: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-2xl border border-border/60 bg-muted/20 p-2.5">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold text-muted-foreground">
        <span className="grid size-4.5 place-items-center rounded-md bg-primary/12 px-1 text-[10px] text-primary">
          {index}
        </span>
        {title}
      </p>
      {hint ? <p className="mb-2 text-[10px] font-bold text-muted-foreground/80">{hint}</p> : null}
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </div>
  );
}

function Notice({ tone = "muted", children }: { tone?: "muted" | "warn" | "ok"; children: React.ReactNode }) {
  return (
    <p
      className={cn(
        "mt-3 rounded-2xl border px-3 py-2 text-[11px] font-bold leading-5",
        tone === "warn" && "border-gold/50 bg-gold/12 text-foreground",
        tone === "ok" && "border-mint bg-mint/30 text-foreground",
        tone === "muted" && "border-border/60 bg-muted/25 text-muted-foreground",
      )}
    >
      {children}
    </p>
  );
}

export function ActionCenter({ data }: { data: WorkspaceData }) {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const roles = (data.roles ?? []) as AppRole[];
  const id = data.application.id;
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [note, setNote] = useState("");
  const [classroomId, setClassroomId] = useState<string>("");
  const [childIdx, setChildIdx] = useState(0);
  const [qurraStatus, setQurraStatus] = useState(data.qurra?.status ?? "not_requested");
  const [requested, setRequested] = useState<string[]>([]);
  const [sections, setSections] = useState<CorrectionSection[]>([]);

  const startReview = useServerFn(amsStartReview);
  const priority = useServerFn(amsSetPriority);
  const requestDocs = useServerFn(amsRequestDocuments);
  const requestCorrections = useServerFn(amsRequestCorrections);
  const recommend = useServerFn(amsRecommend);
  const nudge = useServerFn(amsNudgePrincipal);
  const decide = useServerFn(amsDecide);
  const seat = useServerFn(amsManageSeat);
  const waitlist = useServerFn(amsMoveToWaitingList);
  const qurra = useServerFn(amsUpdateQurra);

  const run = useMutation({
    mutationFn: async (task: () => Promise<unknown>) => task(),
    onSuccess: () => {
      toast.success("تم تنفيذ الإجراء");
      setDialog(null);
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["ams"] });
    },
    onError: (error: Error) => toast.error(error.message || "تعذّر تنفيذ الإجراء"),
  });
  const busy = run.isPending;
  const close = () => setDialog(null);

  /* ---------------------------------------------------------- role & state */
  const status = data.application.status as string;
  const canDecide = can(roles, "decide");
  const isPrincipalOnly = canDecide && !roles.includes("admin") && !roles.includes("registration_officer");
  const isViewerOnly = !can(roles, "review") && !canDecide && !can(roles, "payments");
  const showOfficerActions = can(roles, "review") && !isPrincipalOnly;

  const reviewStarted = !["draft", "submitted"].includes(status);
  const raised = status === "principal_review";
  const decided = ["approved", "rejected", "withdrawn"].includes(status);
  const seatAlreadyReserved = data.application.seat_status === "reserved";

  const openRequests = data.documentRequests.filter((r) => !r.fulfilled_at).length;
  const openCorrections = status === "needs_action" || (data.application.correction_sections ?? []).length > 0;

  /* -------------------------------------------------------------- children */
  const child = data.children[Math.min(childIdx, Math.max(0, data.children.length - 1))] ?? null;
  const childMonths = ageInMonths(child?.birth_date ?? null);

  /**
   * The class approved at seat reservation (Step 0) — or the parent's first
   * preference — is selected by default so staff only confirm it.
   */
  const defaultClassroomId = child?.classroom_id ?? child?.preference_1_classroom_id ?? "";
  useEffect(() => {
    setClassroomId(defaultClassroomId);
  }, [defaultClassroomId]);

  const preferences = [
    child?.preference_1_classroom_id ?? null,
    child?.preference_2_classroom_id ?? null,
    child?.preference_3_classroom_id ?? null,
  ];

  /** Reason-coded verdict for each preference + the parent-facing summary. */
  const verdicts = evaluatePreferences(preferences, data.classrooms, childMonths);
  const parentSummary = waitlistSummary(verdicts, child?.name_ar ?? "الطفل");

  /**
   * The parent already ranked classrooms in the application. When one of those
   * preferences is still admissible the officer only needs to endorse it, and
   * the waiting-list action stays hidden — it appears only when every ranked
   * classroom is genuinely full / not admissible.
   */
  const admissiblePreference = verdicts.find((v) => v.admissible) ?? null;
  const rankedPreferences = verdicts.filter((v) => v.classroom);
  const anyFreeClassroom = data.classrooms.some((c) => {
    const free = Math.max(0, c.capacity - c.taken_seats);
    const ageOk =
      childMonths === null ||
      (childMonths >= c.min_age_months && childMonths <= c.max_age_months);
    return c.is_active !== false && ageOk && free > 0;
  });
  const waitlistNeeded =
    !admissiblePreference && (rankedPreferences.length > 0 ? true : !anyFreeClassroom);

  const classroomState = (classroom: WorkspaceData["classrooms"][number]) => {
    const free = Math.max(0, classroom.capacity - classroom.taken_seats);
    const ageOk =
      childMonths === null
        ? true
        : childMonths >= classroom.min_age_months && childMonths <= classroom.max_age_months;
    return {
      free,
      ageOk,
      full: free <= 0,
      disabled: !ageOk || free <= 0,
      reason: !ageOk
        ? `خارج النطاق العمري (${classroom.min_age_months}–${classroom.max_age_months} شهرًا)`
        : free <= 0
          ? "الفصل مكتمل العدد"
          : `متاح ${free} مقعدًا`,
    };
  };

  /* ----------------------------------------------------------------- qurra */
  const parentIdentity = detectNationality(data.application.parent_national_id ?? "");
  const motherId = data.qurra?.mother_national_id ?? null;
  const motherSaudi = motherId ? detectNationality(motherId) === "saudi" : null;
  const qurraAgeOk = childMonths === null ? true : childMonths < 72;
  const qurraEligible =
    (parentIdentity === "saudi" || motherSaudi === true) && qurraAgeOk;

  /* ------------------------------------------------------------- documents */
  const missingDocs = [
    ...documentCompletion(data, null).missing.map((slug) => ({ slug, childIndex: null as number | null })),
    ...data.children.flatMap((_, index) =>
      documentCompletion(data, index).missing.map((slug) => ({ slug, childIndex: index as number | null })),
    ),
  ];
  const docLabel = (slug: string) => data.documentTypes.find((t) => t.slug === slug)?.name_ar ?? slug;
  const keyOf = (item: { slug: string; childIndex: number | null }) => `${item.childIndex ?? "p"}:${item.slug}`;

  /* ---------------------------------------------- readiness for principal */
  /**
   * The application only reaches the principal after every operational step is
   * closed: no open notes, no missing/unapproved documents and a final Qurra
   * verdict when the family is eligible for the programme.
   */
  const pendingDocs = data.documents.filter((d) => d.status !== "approved").length;
  const qurraStatusNow = data.qurra?.status ?? "not_requested";
  const qurraClosed = !qurraEligible || ["approved", "rejected"].includes(qurraStatusNow);
  const blockers = [
    openRequests > 0 ? `${openRequests} طلب مستندات مفتوح` : null,
    openCorrections ? "طلب تعديل بانتظار ولي الأمر" : null,
    missingDocs.length > 0 ? `${missingDocs.length} مستند مطلوب لم يُرفع` : null,
    pendingDocs > 0 ? `${pendingDocs} مستند بانتظار الاعتماد` : null,
    !qurraClosed ? "حالة دعم قرة لم تُقفل (قبول أو رفض)" : null,
  ].filter((x): x is string => Boolean(x));
  const readyToRaise = blockers.length === 0;

  /* ------------------------------------------------------------ view-only */
  if (isViewerOnly) {
    return (
      <div className="space-y-3">
        <div className="rounded-3xl border border-border/60 bg-card p-4">
        <p className="flex items-center gap-1.5 text-sm font-extrabold text-foreground">
          <Eye className="size-4 text-primary" /> وضع الاطلاع فقط
        </p>
        <Notice>
          صلاحيتك الحالية (مشرف) تتيح استعراض الطلب كاملًا ومتابعة الإحصائيات والتقارير، دون اتخاذ أي إجراء تشغيلي عليه.
        </Notice>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-3xl border border-border/60 bg-card p-4">
        <p className="text-sm font-extrabold text-foreground">مركز الإجراءات</p>
        <p className="mt-1 text-[11px] font-bold text-muted-foreground">
          {decided
            ? "تم اتخاذ القرار النهائي — الإجراءات مغلقة."
            : reviewStarted
              ? "الإجراءات مرتبة حسب مراحل المعالجة الرسمية للطلب."
              : "ابدأ المراجعة أولًا؛ يُسند الطلب لك تلقائيًا وتُفتح بقية الإجراءات."}
        </p>

        {decided ? (
          <Notice tone="ok">
            <Lock className="me-1 inline size-3.5" />
            تم قبول الطلب 
          </Notice>
        ) : null}

        {/* ---------------------------------------------- stage 1: start */}
        {!reviewStarted && !decided ? (
          <>
            <Stage index={1} title="بدء المعالجة" hint="يُسجَّل بدء المراجعة في مسار الطلب ويُشعر ولي الأمر بأن طلبه قيد المعالجة.">
              {showOfficerActions ? (
                <Button
                  size="sm"
                  className="col-span-2 rounded-2xl text-xs font-bold"
                  disabled={busy}
                  onClick={() => run.mutate(() => startReview({ data: { id } }))}
                >
                  <FileCheck2 className="size-3.5" /> بدء المراجعة
                </Button>
              ) : (
                <p className="col-span-2 text-[11px] font-bold text-muted-foreground">
                  بانتظار بدء المراجعة من موظف التسجيل.
                </p>
              )}
            </Stage>
          </>
        ) : null}

        {/* ------------------------------- officer stages after start */}
        {reviewStarted && !decided && showOfficerActions ? (
          <>
            <Stage index={1} title="مراجعة البيانات والمستندات" hint="اطلب المستندات الناقصة أو تصحيح خطوة محددة بملاحظات دقيقة.">
              <Button variant="outline" size="sm" className="rounded-2xl text-xs font-bold" onClick={() => setDialog("request")}>
                <FileWarning className="size-3.5" /> طلب مستندات
              </Button>
              <Button variant="outline" size="sm" className="rounded-2xl text-xs font-bold" onClick={() => setDialog("corrections")}>
                <Undo2 className="size-3.5" /> طلب تعديل خطوة
              </Button>
            </Stage>

            <Stage
              index={2}
              title="المقعد وقائمة الانتظار"
              hint={
                admissiblePreference
                  ? `اختار ولي الأمر فصل «${admissiblePreference.classroom?.name_ar}» وهو مطابق للعمر وبه ${admissiblePreference.free} مقعدًا شاغرًا — يكفي اعتماده.`
                  : waitlistNeeded
                    ? "اكتملت الفصول المطابقة لعمر الطفل — يمكن نقل الطلب إلى قائمة الانتظار."
                    : "لا تظهر إلا الفصول المطابقة لعمر الطفل والتي بها مقاعد شاغرة."
              }
            >
              {can(roles, "seats") && admissiblePreference?.classroom && !seatAlreadyReserved ? (
                <Button
                  size="sm"
                  className="col-span-2 rounded-2xl text-xs font-bold"
                  disabled={busy}
                  onClick={() =>
                    run.mutate(() =>
                      seat({
                        data: {
                          id,
                          action: "reserve",
                          classroomId: admissiblePreference.classroom!.id,
                        },
                      }),
                    )
                  }
                >
                  <CheckCircle2 className="size-3.5" /> اعتماد فصل ولي الأمر (
                  {admissiblePreference.classroom.name_ar})
                </Button>
              ) : null}
              {can(roles, "seats") ? (
                <Button
                  variant="outline"
                  size="sm"
                  className={cn("rounded-2xl text-xs font-bold", !waitlistNeeded && "col-span-2")}
                  disabled={busy || seatAlreadyReserved}
                  onClick={() => setDialog("seat")}
                >
                  <Armchair className="size-3.5" /> {seatAlreadyReserved ? "تم اعتماد المقعد" : admissiblePreference ? "تغيير الفصل" : "اختيار الفصل"}
                </Button>
              ) : null}
              {can(roles, "waitlist") && waitlistNeeded ? (
                <Button variant="outline" size="sm" className="rounded-2xl text-xs font-bold" onClick={() => setDialog("waitlist")}>
                  <ListOrdered className="size-3.5" /> قائمة الانتظار
                </Button>
              ) : null}
              {!waitlistNeeded ? (
                <p className="col-span-2 text-[10px] font-bold text-muted-foreground">
                  قائمة الانتظار غير مطلوبة حاليًا لتوفّر مقاعد مطابقة لعمر الطفل.
                </p>
              ) : null}
            </Stage>

            <Stage index={3} title="دعم قرة" hint={qurraEligible ? "حدّث حالة المتابعة مع برنامج قرة." : undefined}>
              {can(roles, "qurra") ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="col-span-2 rounded-2xl text-xs font-bold"
                  disabled={!qurraEligible}
                  onClick={() => setDialog("qurra")}
                >
                  <BadgeCheck className="size-3.5" /> حالة قرة
                </Button>
              ) : null}
              {!qurraEligible ? (
                <p className="col-span-2 text-[11px] font-bold text-muted-foreground">
                  لا تنطبق شروط دعم قرة على هذا الطلب
                  {parentIdentity !== "saudi" && motherSaudi !== true ? " (ولي الأمر/الأم غير سعوديين)" : ""}
                  {!qurraAgeOk ? " (عمر الطفل 6 سنوات فأكثر)" : ""}.
                </p>
              ) : null}
            </Stage>

            <Stage
              index={4}
              title="إنهاء المراجعة"
              hint={
                raised
                  ? "الطلب لدى المدير — يمكنك إرسال تذكير أو رفع الأولوية."
                  : readyToRaise
                    ? "اكتملت الملاحظات — يمكن رفع الطلب لاعتماد المدير."
                    : "أكمل اعتماد جميع المستندات وأقفل حالة قرة قبل الرفع للمدير."
              }
            >
              {!raised ? (
                <Button
                  size="sm"
                  className="col-span-2 rounded-2xl text-xs font-bold"
                  disabled={!readyToRaise || busy}
                  onClick={() => setDialog("recommend")}
                >
                  <ChevronsUpDown className="size-3.5" /> رفع لاعتماد المدير
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="col-span-2 rounded-2xl text-xs font-bold"
                  onClick={() => setDialog("nudge")}
                >
                  <BellRing className="size-3.5" /> تذكير المدير / متابعة
                </Button>
              )}
              {!readyToRaise && !raised ? (
                <ul className="col-span-2 space-y-1 text-[11px] font-bold text-muted-foreground">
                  {blockers.map((b) => (
                    <li key={b}>• {b}</li>
                  ))}
                </ul>
              ) : null}
            </Stage>
          </>
        ) : null}

        {/* ------------------------------------------- principal actions */}
        {canDecide && reviewStarted ? (
          <Stage
            index={showOfficerActions ? 5 : 1}
            title="قرار مدير المدرسة"
            hint={decided ? "تم اتخاذ القرار — الأزرار معطّلة." : "اعتمد القبول أو الرفض، أو أعد الطلب لطلب معلومات إضافية."}
          >
            <Button size="sm" className="rounded-2xl text-xs font-bold" disabled={decided} onClick={() => setDialog("approve")}>
              <CheckCircle2 className="size-3.5" /> قبول
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="rounded-2xl text-xs font-bold"
              disabled={decided}
              onClick={() => setDialog("reject")}
            >
              <CircleSlash className="size-3.5" /> رفض
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="col-span-2 rounded-2xl text-xs font-bold"
              disabled={decided}
              onClick={() => setDialog("corrections")}
            >
              <Undo2 className="size-3.5" /> طلب معلومات إضافية / تعديل
            </Button>
          </Stage>
        ) : null}

        {/* --------------------------------------------------- payments */}
        {can(roles, "payments") && reviewStarted ? (
          <Stage index={showOfficerActions ? 6 : canDecide ? 2 : 1} title="السداد">
            <div className="col-span-2 flex items-center justify-between gap-2 rounded-2xl border border-border/60 bg-muted/40 px-4 py-3">
              <span className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <Wallet className="size-3.5" /> حالة السداد (تلقائية)
              </span>
              <span className="rounded-full bg-card px-3 py-1 text-[11px] font-black text-foreground">
                {PAYMENT_STATUS_LABELS[data.application.payment_status] ??
                  data.application.payment_status}
              </span>
            </div>
            <p className="col-span-2 text-[11px] font-bold text-muted-foreground">
              تُحسب الحالة تلقائيًا من خطة السداد وجدول الدفعات والإيصالات المعتمدة.
            </p>
          </Stage>
        ) : null}

        {/* --------------------------------------------------- priority */}
        {reviewStarted && !decided && (showOfficerActions || canDecide) ? (
          <div className="mt-3">
            <p className="mb-1.5 text-[11px] font-bold text-muted-foreground">الأولوية</p>
            <div className="grid grid-cols-4 gap-1.5">
              {(["low", "normal", "high", "urgent"] as const).map((level) => (
                <Button
                  key={level}
                  size="sm"
                  variant={data.application.priority === level ? "default" : "outline"}
                  className="rounded-xl text-[11px] font-bold"
                  disabled={busy}
                  onClick={() => run.mutate(() => priority({ data: { id, priority: level } }))}
                >
                  {level === "low" ? "منخفضة" : level === "normal" ? "عادية" : level === "high" ? "عالية" : "عاجلة"}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {can(roles, "documents") && reviewStarted ? <DocumentReview data={data} /> : null}

      {/* ------------------------------------------------------- dialogs */}
      <Dialog open={dialog === "request"} onOpenChange={(open) => (open ? null : close())}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>طلب مستندات ناقصة</DialogTitle>
            <DialogDescription>حدّد المستندات المطلوبة واكتب ملاحظة دقيقة تصل لولي الأمر.</DialogDescription>
          </DialogHeader>
          <div className="max-h-64 space-y-1.5 overflow-y-auto">
            {missingDocs.map((item) => {
              const key = keyOf(item);
              const active = requested.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRequested((prev) => (active ? prev.filter((k) => k !== key) : [...prev, key]))}
                  className={cn(
                    "w-full rounded-2xl border px-3 py-2 text-start text-xs font-bold",
                    active ? "border-primary bg-primary/10 text-primary" : "border-border/60 bg-muted/20",
                  )}
                >
                  {docLabel(item.slug)}
                  <span className="ms-1 text-[10px] font-bold text-muted-foreground">
                    {item.childIndex === null ? "· ولي الأمر" : `· ${data.children[item.childIndex]?.name_ar ?? ""}`}
                  </span>
                </button>
              );
            })}
            {missingDocs.length === 0 ? (
              <p className="text-xs font-bold text-muted-foreground">لا توجد مستندات ناقصة.</p>
            ) : null}
          </div>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="اكتب المطلوب بدقة: نوع المستند، وضوح الصورة، تاريخ السريان…"
            className="min-h-24 rounded-2xl text-xs"
          />
          <DialogFooter>
            <Button
              className="rounded-2xl"
              disabled={requested.length === 0 || note.trim().length < 5 || busy}
              onClick={() =>
                run.mutate(() =>
                  requestDocs({
                    data: {
                      id,
                      items: missingDocs.filter((item) => requested.includes(keyOf(item))),
                      note: note.trim(),
                    },
                  }),
                )
              }
            >
              إرسال الطلب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "corrections"} onOpenChange={(open) => (open ? null : close())}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>طلب تعديل خطوة محددة</DialogTitle>
            <DialogDescription>
              حدّد خطوات نموذج التسجيل المطلوب تعديلها — سيُفتح لولي الأمر التعديل على هذه الخطوات فقط.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-1.5">
            {CORRECTION_OPTIONS.map((option) => {
              const active = sections.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setSections((prev) =>
                      prev.includes(option.value) ? prev.filter((s) => s !== option.value) : [...prev, option.value],
                    )
                  }
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors",
                    active ? "border-primary bg-primary/10 text-primary" : "border-border/60 bg-muted/20",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="min-h-28 rounded-2xl text-xs"
            placeholder="وضّح بدقة الحقل المطلوب تعديله وسبب الإعادة…"
          />
          <DialogFooter>
            <Button
              className="rounded-2xl"
              disabled={note.trim().length < 5 || sections.length === 0 || busy}
              onClick={() => run.mutate(() => requestCorrections({ data: { id, sections, note: note.trim() } }))}
            >
              إرسال لولي الأمر
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "recommend"} onOpenChange={(open) => (open ? null : close())}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>رفع الطلب لاعتماد المدير</DialogTitle>
            <DialogDescription>اكتب توصية مسؤول التسجيل بعد إغلاق كل الملاحظات.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="min-h-28 rounded-2xl text-xs"
            placeholder="التوصية…"
          />
          <DialogFooter>
            <Button
              className="rounded-2xl"
              disabled={note.trim().length < 5 || busy}
              onClick={() => run.mutate(() => recommend({ data: { id, recommendation: note.trim() } }))}
            >
              رفع للمدير
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "nudge"} onOpenChange={(open) => (open ? null : close())}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تذكير المدير</DialogTitle>
            <DialogDescription>يُسجَّل التذكير في مسار الطلب ويظهر للمدير كمتابعة عاجلة.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="min-h-24 rounded-2xl text-xs"
            placeholder="سبب الاستعجال (اختياري)…"
          />
          <DialogFooter>
            <Button className="rounded-2xl" disabled={busy} onClick={() => run.mutate(() => nudge({ data: { id, note: note.trim() || undefined } }))}>
              إرسال التذكير
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "approve" || dialog === "reject"} onOpenChange={(open) => (open ? null : close())}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {dialog === "approve" ? "تأكيد قبول الطلب" : "تأكيد رفض الطلب"}
            </DialogTitle>
            <DialogDescription>
              {dialog === "approve"
                ? "هل ترغب في قبول طلب الالتحاق؟"
                : "هل ترغب في رفض طلب الالتحاق؟"}{" "}
              يُسجَّل القرار في سجل التدقيق تلقائيًا باسمك ({profile?.fullName ?? "المدير"}).
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="min-h-24 rounded-2xl text-xs"
            placeholder={
              dialog === "approve" ? "ملاحظات القبول (اختياري)…" : "سبب الرفض (اختياري)…"
            }
          />
          <DialogFooter>
            <Button variant="ghost" className="rounded-2xl" disabled={busy} onClick={close}>
              إلغاء
            </Button>
            <Button
              className="rounded-2xl"
              variant={dialog === "reject" ? "destructive" : "default"}
              disabled={busy || decided}
              onClick={() =>
                run.mutate(() =>
                  decide({
                    data: {
                      id,
                      decision: dialog === "approve" ? "approved" : "rejected",
                      note: note.trim() || undefined,
                    },
                  }),
                )
              }
            >
              {dialog === "approve" ? "نعم، قبول الطلب" : "نعم، رفض الطلب"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "seat"} onOpenChange={(open) => (open ? null : close())}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>إدارة المقعد</DialogTitle>
            <DialogDescription>
              الفصول غير المطابقة لعمر الطفل أو المكتملة العدد معطّلة تلقائيًا.
              {child ? ` عمر ${child.name_ar}: ${formatAge(childMonths)}.` : ""}
            </DialogDescription>
          </DialogHeader>
          {data.children.length > 1 ? (
            <Select value={String(childIdx)} onValueChange={(value) => setChildIdx(Number(value))}>
              <SelectTrigger className="rounded-2xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {data.children.map((c, index) => (
                  <SelectItem key={c.id} value={String(index)}>
                    {c.name_ar}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <Select value={classroomId} onValueChange={setClassroomId}>
            <SelectTrigger className="rounded-2xl">
              <SelectValue placeholder="اختر الفصل" />
            </SelectTrigger>
            <SelectContent>
              {data.classrooms.map((classroom) => {
                const state = classroomState(classroom);
                return (
                  <SelectItem key={classroom.id} value={classroom.id} disabled={state.disabled}>
                    {classroom.name_ar} — {state.reason}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="rounded-2xl"
              disabled={busy}
              onClick={() => run.mutate(() => seat({ data: { id, action: "release" } }))}
            >
              تحرير المقعد
            </Button>
            <Button
              variant="outline"
              className="rounded-2xl"
              disabled={!classroomId || busy}
              onClick={() => run.mutate(() => seat({ data: { id, action: "transfer", classroomId } }))}
            >
              نقل
            </Button>
            <Button
              className="rounded-2xl"
              disabled={!classroomId || busy}
              onClick={() => run.mutate(() => seat({ data: { id, action: "reserve", classroomId } }))}
            >
              حجز المقعد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "waitlist"} onOpenChange={(open) => (open ? null : close())}>
        <DialogContent dir="rtl" className="max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>قائمة الانتظار حسب رغبات ولي الأمر</DialogTitle>
            <DialogDescription>
              يقيّم النظام كل رغبة مقابل عمر الطفل وسعة الفصل، ويمنحها كود سبب واضح يظهر للموظف ولولي الأمر.
              {child ? ` عمر ${child.name_ar}: ${formatAge(childMonths)}.` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            {verdicts.map((verdict) => {
              const reason = WAITLIST_REASONS[verdict.code];
              const classroom = verdict.classroom;
              return (
                <button
                  key={`${verdict.index}-${classroom?.id ?? "none"}`}
                  type="button"
                  disabled={!classroom}
                  onClick={() => classroom && setClassroomId(classroom.id)}
                  className={cn(
                    "w-full rounded-2xl border px-3 py-2.5 text-start transition-colors disabled:opacity-70",
                    classroom && classroomId === classroom.id
                      ? "border-primary bg-primary/10"
                      : reason.tone === "ok"
                        ? "border-mint bg-mint/25"
                        : reason.tone === "warn"
                          ? "border-gold/50 bg-gold/10"
                          : "border-border/60 bg-muted/20",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12px] font-extrabold text-foreground">
                      الرغبة {verdict.index + 1}: {classroom?.name_ar ?? "غير محددة"}
                    </p>
                    <span className="rounded-full bg-background/70 px-2 py-0.5 text-[10px] font-extrabold text-foreground" dir="ltr">
                      {verdict.code}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] font-extrabold text-foreground">{reason.label}</p>
                  <p className="mt-0.5 text-[10px] font-bold leading-4 text-muted-foreground">
                    {reason.detail}
                    {classroom
                      ? ` (السعة ${classroom.capacity} · المشغول ${classroom.taken_seats} · الشاغر ${verdict.free} · النطاق ${classroom.min_age_months}–${classroom.max_age_months} شهرًا)`
                      : ""}
                  </p>
                </button>
              );
            })}
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/25 px-3 py-2">
            <p className="text-[11px] font-extrabold text-foreground">الخلاصة التي تصل لولي الأمر</p>
            <p className="mt-1 text-[11px] font-bold leading-5 text-muted-foreground">{parentSummary}</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-1 rounded-xl text-[10px] font-bold text-primary"
              onClick={() => setNote(parentSummary)}
            >
              إدراج الخلاصة في الرسالة
            </Button>
          </div>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="رسالة توضيحية لولي الأمر عن ترتيب الانتظار والبديل المتاح…"
            className="min-h-20 rounded-2xl text-xs"
          />
          <DialogFooter>
            <Button
              className="rounded-2xl"
              disabled={busy}
              onClick={() =>
                run.mutate(() =>
                  waitlist({ data: { id, classroomId: classroomId || null, note: note.trim() || undefined } }),
                )
              }
            >
              نقل لقائمة الانتظار
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "qurra"} onOpenChange={(open) => (open ? null : close())}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>حالة المتابعة مع برنامج قرة</DialogTitle>
            <DialogDescription>حدّد مرحلة متابعة الطلب لدى برنامج قرة؛ تظهر الحالة لولي الأمر مباشرة.</DialogDescription>
          </DialogHeader>
          <Select value={qurraStatus} onValueChange={(value) => setQurraStatus(value as typeof qurraStatus)}>
            <SelectTrigger className="rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="eligible">مؤهل</SelectItem>
              <SelectItem value="waiting_school_review">بانتظار مراجعة المدرسة</SelectItem>
              <SelectItem value="submitted_to_qurra">مُرسل لقرة</SelectItem>
              <SelectItem value="waiting_response">بانتظار الرد</SelectItem>
              <SelectItem value="approved">معتمد</SelectItem>
              <SelectItem value="rejected">مرفوض</SelectItem>
              <SelectItem value="not_requested">غير مطلوب</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="ملاحظة (اختياري)"
            className="rounded-2xl text-xs"
          />
          <DialogFooter>
            <Button
              className="rounded-2xl"
              disabled={busy}
              onClick={() => run.mutate(() => qurra({ data: { id, status: qurraStatus, note: note || undefined } }))}
            >
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

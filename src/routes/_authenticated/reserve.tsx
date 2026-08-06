import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "motion/react";
import { CalendarHeart, HeartCrack, Loader2, PartyPopper, Plus, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAdmissionCatalog } from "@/features/admissions/catalog.functions";
import { ageParts, formatAgeDetailed, ageInMonths } from "@/features/admissions/eligibility";
import {
  emptyReservationChild,
  reservationSchema,
  CHILD_MATCHES_PARENT_MESSAGE,
  DUPLICATE_CHILD_MESSAGE,
  type ReservationChildInput,
} from "@/features/admissions/reservation-schema";
import {
  checkReservationChildIds,
  seatReservationGate,
  startApplicationFromReservation,
  submitSeatReservation,
} from "@/features/admissions/reservation.functions";
import { useAuth } from "@/features/auth/AuthProvider";
import { ReservationSelfService } from "@/features/admissions/components/ReservationSelfService";
import {
  RegistrationClosedNotice,
  useRegistrationGate,
} from "@/features/admissions/components/RegistrationGate";

export const Route = createFileRoute("/_authenticated/reserve")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "حجز مقعد مبدئي | مدارس وروضة المنال" },
      {
        name: "description",
        content:
          "احجز مقعدًا مبدئيًا لطفلك في مدارس وروضة المنال بعنيزة بخطوة واحدة سريعة قبل استكمال بيانات التسجيل.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReservePage,
});

function ReservePage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const submit = useServerFn(submitSeatReservation);
  const continueFn = useServerFn(startApplicationFromReservation);
  const checkIds = useServerFn(checkReservationChildIds);
  const registration = useRegistrationGate();

  const { data: catalog } = useQuery({
    queryKey: ["admissions", "catalog"],
    queryFn: () => getAdmissionCatalog(),
  });
  const { data: gate, refetch: refetchGate } = useQuery({
    queryKey: ["reservations", "gate"],
    queryFn: () => seatReservationGate(),
  });

  const [parentName, setParentName] = useState(profile?.fullName ?? "");
  const [parentNationalId, setParentNationalId] = useState("");
  const [children, setChildren] = useState<ReservationChildInput[]>([emptyReservationChild()]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [farewell, setFarewell] = useState(false);
  /** Child IDs already registered this academic year (early Step 0 validation). */
  const [takenIds, setTakenIds] = useState<string[]>([]);
  const [dupOpen, setDupOpen] = useState(false);

  const stages = catalog?.stages ?? [];
  const classrooms = useMemo(() => catalog?.classrooms ?? [], [catalog]);

  const patch = (index: number, next: Partial<ReservationChildInput>) =>
    setChildren((rows) => rows.map((row, i) => (i === index ? { ...row, ...next } : row)));

  /** Live duplicate lookup as soon as a complete child ID is entered. */
  async function verifyIds(ids: string[]) {
    const valid = ids.filter((id) => /^[12]\d{9}$/.test(id));
    if (!valid.length) return [] as string[];
    try {
      const { duplicates } = await checkIds({ data: { nationalIds: valid } });
      setTakenIds((prev) => Array.from(new Set([...prev.filter((v) => !valid.includes(v)), ...duplicates])));
      return duplicates;
    } catch {
      return [] as string[];
    }
  }

  /** Inline, per-child blocking message shown before any submission attempt. */
  const idIssue = (child: ReservationChildInput) => {
    if (!child.nationalId) return null;
    if (child.nationalId === parentNationalId) return CHILD_MATCHES_PARENT_MESSAGE;
    if (takenIds.includes(child.nationalId)) return DUPLICATE_CHILD_MESSAGE;
    return null;
  };

  /** Age-eligible classrooms only — seat counts are never surfaced to parents. */
  const optionsFor = (child: ReservationChildInput) => {
    const months = ageInMonths(child.birthDate);
    return classrooms.filter(
      (room) =>
        months === null || (months >= room.min_age_months && months <= room.max_age_months),
    );
  };

  const stageFor = (child: ReservationChildInput) => {
    const months = ageInMonths(child.birthDate);
    if (months === null) return null;
    return stages.find((s) => months >= s.min_age_months && months <= s.max_age_months) ?? null;
  };

  async function onSubmit() {
    /* Early validation: block at Step 0, never at the final submission. */
    const duplicates = await verifyIds(children.map((c) => c.nationalId));
    if (duplicates.length) {
      setDupOpen(true);
      return;
    }
    if (children.some((c) => c.nationalId && c.nationalId === parentNationalId)) {
      toast.error(CHILD_MATCHES_PARENT_MESSAGE);
      return;
    }
    const payload = {
      parentName,
      parentNationalId,
      children: children.map((c) => ({ ...c, stageId: stageFor(c)?.id ?? "" })),
    };
    const parsed = reservationSchema.safeParse(payload);
    if (!parsed.success) {
      const map: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        map[issue.path.join(".")] = issue.message;
      });
      setErrors(map);
      toast.error("يرجى استكمال الحقول المطلوبة");
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await submit({ data: parsed.data });
      setSuccess(true);
      await refetchGate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر إرسال طلب الحجز");
    } finally {
      setBusy(false);
    }
  }

  async function onContinue(reservationId: string) {
    setBusy(true);
    try {
      const { id } = await continueFn({ data: reservationId });
      navigate({ to: "/apply/$applicationId", params: { applicationId: id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر استكمال التسجيل");
    } finally {
      setBusy(false);
    }
  }

  const reservation = gate?.reservation ?? null;

  /* Registration closed by the admin → block Step 0 entirely. */
  if (!registration.open && !reservation) {
    return (
      <section className="section-y">
        <div className="mx-auto max-w-3xl px-4">
          <RegistrationClosedNotice />
        </div>
      </section>
    );
  }

  if (reservation && reservation.status !== "rejected" && reservation.status !== "withdrawn") {
    return (
      <section className="section-y">
        <div className="mx-auto max-w-2xl px-4">
          <div className="rounded-3xl border border-border/60 bg-card p-8 text-center shadow-sm">
            {reservation.status === "pending_review" ? (
              <>
                <CalendarHeart className="mx-auto size-10 text-primary" />
                <h1 className="mt-4 text-2xl font-black text-foreground">طلب حجز المقعد قيد المراجعة</h1>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  تم إرسال طلب حجز المقعد بنجاح إلى إدارة الروضة! سيتم مراجعة الطلب وإشعارك فورًا
                  بالخطوة التالية.
                </p>
                <div className="mt-6 text-start">
                  <ReservationSelfService
                    reservationId={reservation.id}
                    children={reservation.children ?? []}
                  />
                </div>
              </>
            ) : (
              <>
                <PartyPopper className="mx-auto size-10 text-primary" />
                <h1 className="mt-4 text-2xl font-black text-foreground">تم قبول حجز المقعد 🎉</h1>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  يسعدنا انضمام طفلك إلى مجتمع «روضة المنال». تابع لاستكمال بيانات التسجيل — تم تعبئة
                  البيانات التي أدخلتها مسبقًا تلقائيًا.
                </p>
                <Button
                  variant="hero"
                  className="mt-6"
                  disabled={busy}
                  onClick={() => onContinue(reservation.id)}
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                  استكمال بيانات التسجيل
                </Button>
              </>
            )}
            <div className="mt-6">
              <Button asChild variant="ghost" className="text-xs font-bold">
                <Link to="/my-applications">طلباتي</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section-y">
      <div className="mx-auto max-w-3xl space-y-6 px-4">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm"
        >
          <p className="text-[11px] font-black text-primary">الخطوة صفر</p>
          <h1 className="mt-1 text-2xl font-black text-foreground">حجز مقعد مبدئي</h1>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            بيانات مختصرة فقط للتحقق من ملاءمة عمر طفلك وحجز مقعده مبدئيًا. بعد موافقة الإدارة تنتقل
            مباشرة إلى نموذج التسجيل الكامل وتكون هذه البيانات معبأة تلقائيًا.
          </p>
        </motion.header>

        <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
          <h2 className="text-sm font-black text-foreground">بيانات ولي الأمر</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>اسم ولي الأمر</Label>
              <Input value={parentName} onChange={(e) => setParentName(e.target.value)} />
              {errors["parentName"] && (
                <p className="text-xs font-bold text-destructive">{errors["parentName"]}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>رقم الهوية / الإقامة</Label>
              <Input
                inputMode="numeric"
                maxLength={10}
                dir="ltr"
                value={parentNationalId}
                onChange={(e) => setParentNationalId(e.target.value.replace(/\D/g, ""))}
              />
              {errors["parentNationalId"] && (
                <p className="text-xs font-bold text-destructive">{errors["parentNationalId"]}</p>
              )}
            </div>
          </div>
        </div>

        {children.map((child, index) => {
          const parts = ageParts(child.birthDate);
          const stage = stageFor(child);
          const options = optionsFor(child);
          return (
            <div key={index} className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-black text-foreground">الطفل {index + 1}</h2>
                {children.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs font-bold text-destructive"
                    onClick={() => setChildren((rows) => rows.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="size-3.5" />
                    إزالة
                  </Button>
                )}
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>اسم الطفل</Label>
                  <Input value={child.nameAr} onChange={(e) => patch(index, { nameAr: e.target.value })} />
                  {errors[`children.${index}.nameAr`] && (
                    <p className="text-xs font-bold text-destructive">
                      {errors[`children.${index}.nameAr`]}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>رقم هوية / إقامة الطفل</Label>
                  <Input
                    inputMode="numeric"
                    maxLength={10}
                    dir="ltr"
                    value={child.nationalId}
                    onChange={(e) => patch(index, { nationalId: e.target.value.replace(/\D/g, "") })}
                    onBlur={() => void verifyIds([child.nationalId])}
                    aria-invalid={Boolean(idIssue(child))}
                  />
                  {idIssue(child) ? (
                    <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs font-bold leading-6 text-destructive">
                      {idIssue(child)}
                    </p>
                  ) : null}
                  {errors[`children.${index}.nationalId`] && (
                    <p className="text-xs font-bold text-destructive">
                      {errors[`children.${index}.nationalId`]}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>الجنس</Label>
                  <Select
                    value={child.gender}
                    onValueChange={(v) => patch(index, { gender: v as "male" | "female" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">ذكر</SelectItem>
                      <SelectItem value="female">أنثى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>تاريخ الميلاد</Label>
                  <Input
                    type="date"
                    value={child.birthDate}
                    onChange={(e) =>
                      patch(index, {
                        birthDate: e.target.value,
                        preference1: "",
                        preference2: "",
                        preference3: "",
                      })
                    }
                  />
                  {errors[`children.${index}.birthDate`] && (
                    <p className="text-xs font-bold text-destructive">
                      {errors[`children.${index}.birthDate`]}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 grid gap-3 rounded-2xl bg-muted/40 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-black text-muted-foreground">العمر الحالي</p>
                  <p className="text-sm font-black text-foreground">{formatAgeDetailed(parts)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-black text-muted-foreground">المرحلة المناسبة</p>
                  <p className="text-sm font-black text-foreground">
                    {stage?.name_ar ?? (child.birthDate ? "لا توجد مرحلة مطابقة للعمر" : "—")}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {([1, 2, 3] as const).map((rank) => {
                  const key = (rank === 1 ? "preference1" : rank === 2 ? "preference2" : "preference3") as
                    | "preference1"
                    | "preference2"
                    | "preference3";
                  /* Hide classrooms already picked in the other preference slots. */
                  const taken = (["preference1", "preference2", "preference3"] as const)
                    .filter((k) => k !== key)
                    .map((k) => child[k])
                    .filter(Boolean);
                  const rankOptions = options.filter((room) => !taken.includes(room.id));
                  return (
                    <div key={rank} className="space-y-1.5">
                      <Label>
                        الرغبة {rank}
                        {rank === 1 ? " (مطلوبة)" : " (اختياري)"}
                      </Label>
                      <Select
                        value={child[key] || undefined}
                        onValueChange={(v) => patch(index, { [key]: v } as Partial<ReservationChildInput>)}
                        disabled={!rankOptions.length && !child[key]}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={options.length ? "اختر الفصل" : "أدخل تاريخ الميلاد"} />
                        </SelectTrigger>
                        <SelectContent>
                          {rankOptions.map((room) => (
                            <SelectItem key={room.id} value={room.id}>
                              {room.name_ar}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors[`children.${index}.${key}`] && (
                        <p className="text-xs font-bold text-destructive">
                          {errors[`children.${index}.${key}`]}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="outline"
            className="rounded-2xl text-xs font-bold"
            onClick={() => setChildren((rows) => [...rows, emptyReservationChild()])}
            disabled={children.length >= 6}
          >
            <Plus className="size-3.5" />
            إضافة طفل آخر
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" className="rounded-2xl font-bold" onClick={() => setFarewell(true)}>
              إلغاء وخروج
            </Button>
            <Button variant="hero" className="rounded-2xl" disabled={busy} onClick={onSubmit}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              حجز مقعد
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={success} onOpenChange={setSuccess}>
        <DialogContent className="text-center sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-mint/60">
              <PartyPopper className="size-8 text-primary" />
            </div>
            <DialogTitle className="mt-3 text-center text-lg font-black">
              تم إرسال طلب حجز المقعد بنجاح!
            </DialogTitle>
            <DialogDescription className="text-center text-sm leading-7">
              تم إرسال طلب حجز المقعد بنجاح إلى إدارة الروضة! يسعدنا جدًا اختيارك ليكون طفلك جزءًا من
              مجتمع «روضة المنال». سيتم مراجعة الطلب وإشعارك فورًا بالخطوة التالية.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button variant="hero" onClick={() => navigate({ to: "/my-applications" })}>
              متابعة طلباتي
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dupOpen} onOpenChange={setDupOpen}>
        <DialogContent className="text-center sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-destructive/10">
              <HeartCrack className="size-8 text-destructive" />
            </div>
            <DialogTitle className="mt-3 text-center text-lg font-black">
              بيانات مكررة — تعذّر إرسال طلب الحجز
            </DialogTitle>
            <DialogDescription className="text-center text-sm leading-7">
              {DUPLICATE_CHILD_MESSAGE}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button variant="hero" onClick={() => navigate({ to: "/my-applications" })}>
              متابعة طلباتي
            </Button>
            <Button variant="ghost" onClick={() => setDupOpen(false)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={farewell} onOpenChange={setFarewell}>
        <DialogContent className="text-center sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-destructive/10">
              <HeartCrack className="size-8 text-destructive" />
            </div>
            <DialogTitle className="mt-3 text-center text-lg font-black">يحزننا مغادرتك!</DialogTitle>
            <DialogDescription className="text-center text-sm leading-7">
              يحزننا مغادرتك! كنا نتطلع بشغف ليكون طفلك جزءًا من عائلة ومجتمع «روضة المنال». نرحب بك
              دائمًا في حال قررت العودة في أي وقت.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button variant="ghost" onClick={() => setFarewell(false)}>
              العودة للنموذج
            </Button>
            <Button variant="hero" onClick={() => navigate({ to: "/" })}>
              الخروج
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

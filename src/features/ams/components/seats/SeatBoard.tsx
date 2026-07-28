import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Armchair, CalendarClock, GripVertical, Pencil, RotateCcw, Search, Trash2, TriangleAlert, UserPlus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { amsSeatAssign, amsSeatBoard, amsSeatRemove, amsSeatUpdateChild } from "@/features/ams/ams.functions";
import { useClassroomLocks } from "@/features/ams/classroom-lock";
import { EmptyState, SkeletonRows } from "@/features/ams/components/atoms";
import { ClassroomLockBadge } from "@/features/ams/components/seats/ClassroomLockBadge";
import { validatePlacement, type PlacementCheck, type SeatChild, type SeatClassroom } from "@/features/ams/seat-rules";
import { ageInMonths, formatAge } from "@/features/admissions/eligibility";

type Board = Awaited<ReturnType<typeof amsSeatBoard>>;
type BoardClassroom = Board["classrooms"][number];

function asRule(classroom: BoardClassroom): SeatClassroom {
  return classroom as unknown as SeatClassroom;
}

/** Formatted Arabic rejection card (age condition and other rules) with a retry button. */
function RejectionCard({
  child,
  check,
  onRetry,
  onDismiss,
  busy,
}: {
  child: SeatChild;
  check: PlacementCheck;
  onRetry: () => void;
  onDismiss: () => void;
  busy?: boolean;
}) {
  return (
    <div className="mt-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-3">
      <div className="flex items-start gap-2">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-extrabold text-destructive">
            {check.code === "age_mismatch" ? "شرط العمر لا ينطبق" : "تعذّر تنفيذ التسكين"}
          </p>
          {check.age ? (
            <>
              <p className="mt-1 text-[11px] font-bold text-foreground">
                الطالب «{child.name_ar}» عمره <span className="text-destructive">{check.age.childAgeLabel}</span>، بينما فصل «
                {check.age.classroomName}» يقبل من {check.age.minLabel} إلى {check.age.maxLabel}.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-extrabold">
                <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-1 text-destructive">
                  <CalendarClock className="size-3" /> {check.age.childAgeLabel}
                </span>
                <span className="text-muted-foreground">مقابل</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-muted-foreground">
                  {check.age.rangeLabel}
                </span>
              </div>
            </>
          ) : (
            <p className="mt-1 text-[11px] font-bold text-foreground">{check.message}</p>
          )}
        </div>
        <button type="button" onClick={onDismiss} title="إخفاء" className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
          <X className="size-3.5" />
        </button>
      </div>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          disabled={busy}
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-2xl border border-destructive/40 px-3 py-1.5 text-[11px] font-extrabold text-destructive disabled:opacity-60"
        >
          <RotateCcw className="size-3.5" /> إعادة المحاولة
        </button>
      </div>
    </div>
  );
}

function ChildChip({
  child,
  onEdit,
  onRemove,
  onMove,
  draggable = true,
}: {
  child: SeatChild;
  onEdit: () => void;
  onRemove?: () => void;
  onMove: () => void;
  draggable?: boolean;
}) {
  const months = ageInMonths(child.birth_date);
  return (
    <li
      draggable={draggable}
      onDragStart={(event) => event.dataTransfer.setData("text/plain", child.id)}
      className="group flex items-center gap-2 rounded-2xl border border-border/60 bg-muted/25 px-2.5 py-2"
    >
      <GripVertical className="size-3.5 shrink-0 cursor-grab text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-extrabold text-foreground">{child.name_ar}</p>
        <p className="truncate text-[10px] font-bold text-muted-foreground">
          {months !== null ? formatAge(months) : "تاريخ ميلاد غير مسجّل"}
          {child.application_number ? ` · ${child.application_number}` : ""}
          {child.qurra_requested ? " · قرة" : ""}
        </p>
      </div>
      <button type="button" onClick={onMove} title="نقل" className="rounded-lg p-1 text-muted-foreground hover:text-primary">
        <Armchair className="size-3.5" />
      </button>
      <button type="button" onClick={onEdit} title="تعديل" className="rounded-lg p-1 text-muted-foreground hover:text-primary">
        <Pencil className="size-3.5" />
      </button>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          title="إزالة من الفصل"
          className="rounded-lg p-1 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
        </button>
      ) : null}
    </li>
  );
}

export function SeatBoard() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["ams", "seat-board"], queryFn: () => amsSeatBoard() });
  const { lockedBy, isMine } = useClassroomLocks();
  const [term, setTerm] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [moving, setMoving] = useState<SeatChild | null>(null);
  const [editing, setEditing] = useState<SeatChild | null>(null);
  const [removing, setRemoving] = useState<SeatChild | null>(null);
  const [rejection, setRejection] = useState<{ classroomId: string; child: SeatChild; check: PlacementCheck } | null>(null);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["ams", "seat-board"] });
    queryClient.invalidateQueries({ queryKey: ["ams", "overview"] });
  };

  const assign = useMutation({
    mutationFn: (input: { childId: string; classroomId: string }) => amsSeatAssign({ data: input }),
    onSuccess: (result) => {
      toast.success("تم تحديث تسكين الطالب");
      result.warnings?.forEach((warning: string) => toast.warning(warning));
      setMoving(null);
      setRejection(null);
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  /** Age (in months) + rules are always verified locally before any server call. */
  const tryAssign = (child: SeatChild, classroom: BoardClassroom) => {
    const check = validatePlacement(child, asRule(classroom));
    if (!check.ok) {
      setRejection({ classroomId: classroom.id, child, check });
      return false;
    }
    setRejection(null);
    check.warnings.forEach((warning) => toast.warning(warning));
    assign.mutate({ childId: child.id, classroomId: classroom.id });
    return true;
  };

  const remove = useMutation({
    mutationFn: (input: { childId: string }) => amsSeatRemove({ data: input }),
    onSuccess: () => {
      toast.success("تمت إزالة الطالب من الفصل");
      setRemoving(null);
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const update = useMutation({
    mutationFn: (input: Record<string, unknown>) => amsSeatUpdateChild({ data: input as never }),
    onSuccess: (result) => {
      toast.success("تم تحديث بيانات الطالب");
      result.warnings?.forEach((warning: string) => toast.warning(warning));
      setEditing(null);
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const matches = (child: SeatChild) => {
    const q = term.trim();
    if (!q) return true;
    return `${child.name_ar} ${child.application_number ?? ""} ${child.national_id ?? ""}`.includes(q);
  };

  const stages = useMemo(
    () => (data?.stages ?? []).filter((stage) => stageFilter === "all" || stage.id === stageFilter),
    [data, stageFilter],
  );

  if (error) return <EmptyState title="تعذّر التحميل" description={(error as Error).message} />;
  if (isLoading || !data) return <SkeletonRows rows={6} />;

  const unplaced = data.unplaced.filter(matches) as SeatChild[];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        {[
          { label: "السعة الكلية", value: data.totals.capacity },
          { label: "المسجلون فعليًا", value: data.totals.enrolled },
          { label: "مقاعد متاحة", value: data.totals.available },
          { label: "بانتظار التسكين", value: data.totals.unplaced },
          { label: "قوائم الانتظار", value: data.totals.waiting },
        ].map((item) => (
          <div key={item.label} className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
            <p className="text-[11px] font-bold text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-2xl font-extrabold text-foreground">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
          <input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="ابحث باسم الطالب أو رقم الطلب أو الهوية…"
            className="w-full rounded-2xl border border-border/60 bg-card py-2.5 pe-4 ps-10 text-xs font-bold outline-none focus:border-primary"
          />
        </div>
        <select
          value={stageFilter}
          onChange={(event) => setStageFilter(event.target.value)}
          className="rounded-2xl border border-border/60 bg-card px-3 py-2.5 text-xs font-bold outline-none focus:border-primary"
        >
          <option value="all">كل المراحل</option>
          {data.stages.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.name_ar}
            </option>
          ))}
        </select>
      </div>

      <section className="rounded-3xl border border-dashed border-border/70 bg-card p-5">
        <h2 className="flex items-center gap-1.5 text-sm font-extrabold text-foreground">
          <UserPlus className="size-4 text-primary" /> بانتظار التسكين
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">{unplaced.length}</span>
        </h2>
        {unplaced.length === 0 ? (
          <p className="mt-2 text-[11px] font-bold text-muted-foreground">لا يوجد طلاب بانتظار التسكين حاليًا.</p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {unplaced.map((child) => (
              <ChildChip key={child.id} child={child} onEdit={() => setEditing(child)} onMove={() => setMoving(child)} />
            ))}
          </ul>
        )}
      </section>

      {stages.map((stage) => (
        <section key={stage.id} className="space-y-3">
          <h2 className="text-sm font-extrabold text-foreground">{stage.name_ar}</h2>
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {stage.classrooms.map((classroom) => {
              const percent = classroom.capacity
                ? Math.min(100, Math.round((classroom.enrolled / classroom.capacity) * 100))
                : 0;
              const left = Math.max(0, classroom.capacity - classroom.enrolled);
              const locked = lockedBy(classroom.id);
              return (
                <div
                  key={classroom.id}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const childId = event.dataTransfer.getData("text/plain");
                    if (!childId) return;
                    if (locked && !isMine(classroom.id)) {
                      toast.error("الفصل قيد التعديل من موظف آخر الآن.");
                      return;
                    }
                    const child =
                      (data.unplaced as SeatChild[]).find((item) => item.id === childId) ??
                      (data.classrooms.flatMap((c) => c.children) as SeatChild[]).find((item) => item.id === childId);
                    if (!child) return;
                    tryAssign(child, classroom);
                  }}
                  className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm"
                  style={{ borderTop: `4px solid ${classroom.color_hex}` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-extrabold text-foreground">{classroom.name_ar}</p>
                      <p className="text-[11px] font-bold text-muted-foreground">
                        {classroom.teacher_name ?? "بدون معلمة"} · {formatAge(classroom.min_age_months)} –{" "}
                        {formatAge(classroom.max_age_months)}
                      </p>
                    </div>
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold"
                      style={{ background: `${classroom.color_hex}22`, color: classroom.color_hex }}
                    >
                      <Armchair className="size-3" /> {left} متاح
                    </span>
                  </div>

                  <div className="mt-2 empty:hidden">
                    <ClassroomLockBadge lock={locked} mine={isMine(classroom.id)} />
                  </div>

                  {rejection && rejection.classroomId === classroom.id ? (
                    <RejectionCard
                      child={rejection.child}
                      check={rejection.check}
                      busy={assign.isPending}
                      onDismiss={() => setRejection(null)}
                      onRetry={() => tryAssign(rejection.child, classroom)}
                    />
                  ) : null}

                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${percent}%`, background: classroom.color_hex }} />
                  </div>
                  <p className="mt-1.5 text-[11px] font-bold text-muted-foreground">
                    المسجلون {classroom.enrolled} من {classroom.capacity} · قائمة الانتظار {classroom.waiting}
                  </p>

                  <ul className="mt-3 space-y-2">
                    {(classroom.children as SeatChild[]).filter(matches).map((child) => (
                      <ChildChip
                        key={child.id}
                        child={child}
                        onEdit={() => setEditing(child)}
                        onMove={() => setMoving(child)}
                        onRemove={() => setRemoving(child)}
                      />
                    ))}
                    {classroom.children.length === 0 ? (
                      <li className="rounded-2xl border border-dashed border-border/60 px-3 py-4 text-center text-[11px] font-bold text-muted-foreground">
                        اسحب طالبًا هنا لتسكينه
                      </li>
                    ) : null}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {moving ? (
        <MoveDialog
          child={moving}
          classrooms={data.classrooms}
          busy={assign.isPending}
          onClose={() => setMoving(null)}
          onConfirm={(classroomId) => {
            const classroom = data.classrooms.find((item) => item.id === classroomId);
            if (classroom) tryAssign(moving, classroom);
          }}
        />
      ) : null}

      {editing ? (
        <EditDialog
          child={editing}
          busy={update.isPending}
          onClose={() => setEditing(null)}
          onConfirm={(patch) => update.mutate({ childId: editing.id, ...patch })}
        />
      ) : null}

      {removing ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-card p-6 shadow-xl">
            <h3 className="text-sm font-extrabold text-foreground">إزالة الطالب من الفصل</h3>
            <p className="mt-2 text-xs font-bold text-muted-foreground">
              سيتم تحرير مقعد «{removing.name_ar}» وإعادته إلى قائمة بانتظار التسكين، وسيُسجَّل الإجراء في الخط الزمني للطلب.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRemoving(null)}
                className="rounded-2xl border border-border/60 px-4 py-2 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={remove.isPending}
                onClick={() => remove.mutate({ childId: removing.id })}
                className="rounded-2xl bg-destructive px-4 py-2 text-xs font-bold text-destructive-foreground disabled:opacity-60"
              >
                تأكيد الإزالة
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MoveDialog({
  child,
  classrooms,
  busy,
  onClose,
  onConfirm,
}: {
  child: SeatChild;
  classrooms: BoardClassroom[];
  busy: boolean;
  onClose: () => void;
  onConfirm: (classroomId: string) => void;
}) {
  const options = classrooms.map((classroom) => ({ classroom, check: validatePlacement(child, asRule(classroom)) }));
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4">
      <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-card p-6 shadow-xl">
        <h3 className="text-sm font-extrabold text-foreground">نقل «{child.name_ar}» إلى فصل</h3>
        <p className="mt-1 text-[11px] font-bold text-muted-foreground">
          الفصول غير المطابقة للشروط معطّلة مع بيان السبب.
        </p>
        <ul className="mt-4 space-y-2">
          {options.map(({ classroom, check }) => (
            <li key={classroom.id}>
              <button
                type="button"
                disabled={!check.ok || busy}
                onClick={() => onConfirm(classroom.id)}
                className="w-full rounded-2xl border border-border/60 p-3 text-start transition-colors enabled:hover:border-primary disabled:opacity-60"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-foreground">{classroom.name_ar}</span>
                  <span className="text-[11px] font-bold text-muted-foreground">
                    {classroom.enrolled}/{classroom.capacity}
                  </span>
                </div>
                {check.ok ? (
                  <p className="mt-1 text-[11px] font-bold text-primary">مطابق للشروط — اضغط للنقل</p>
                ) : (
                  <p className="mt-1 text-[11px] font-bold text-destructive">{check.message}</p>
                )}
                {check.warnings.map((warning) => (
                  <p key={warning} className="mt-0.5 text-[10px] font-bold text-gold">
                    تنبيه: {warning}
                  </p>
                ))}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex justify-end">
          <button type="button" onClick={onClose} className="rounded-2xl border border-border/60 px-4 py-2 text-xs font-bold">
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

function EditDialog({
  child,
  busy,
  onClose,
  onConfirm,
}: {
  child: SeatChild;
  busy: boolean;
  onClose: () => void;
  onConfirm: (patch: Record<string, unknown>) => void;
}) {
  const [form, setForm] = useState({
    name_ar: child.name_ar ?? "",
    birth_date: child.birth_date ?? "",
    national_id: child.national_id ?? "",
    nationality: child.nationality ?? "",
    gender: child.gender ?? "",
  });
  const field = (key: keyof typeof form, label: string, type = "text") => (
    <label className="block">
      <span className="text-[11px] font-bold text-muted-foreground">{label}</span>
      <input
        type={type}
        value={form[key]}
        onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
        className="mt-1 w-full rounded-2xl border border-border/60 bg-background px-3 py-2 text-xs font-bold outline-none focus:border-primary"
      />
    </label>
  );
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4">
      <div className="w-full max-w-md rounded-3xl bg-card p-6 shadow-xl">
        <h3 className="text-sm font-extrabold text-foreground">تعديل بيانات الطالب</h3>
        <div className="mt-4 space-y-3">
          {field("name_ar", "الاسم بالعربية")}
          {field("birth_date", "تاريخ الميلاد", "date")}
          {field("national_id", "رقم الهوية / الإقامة")}
          {field("nationality", "الجنسية")}
          {field("gender", "الجنس")}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-2xl border border-border/60 px-4 py-2 text-xs font-bold">
            إلغاء
          </button>
          <button
            type="button"
            disabled={busy || form.name_ar.trim().length < 2}
            onClick={() =>
              onConfirm({
                name_ar: form.name_ar.trim(),
                birth_date: form.birth_date || null,
                national_id: form.national_id.trim() || null,
                nationality: form.nationality.trim() || null,
                gender: form.gender.trim() || null,
              })
            }
            className="rounded-2xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-60"
          >
            حفظ
          </button>
        </div>
      </div>
    </div>
  );
}
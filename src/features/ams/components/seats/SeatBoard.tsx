import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Armchair,
  CalendarClock,
  GripVertical,
  ListOrdered,
  Lock,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  Trash2,
  TriangleAlert,
  UserPlus,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  amsClassroomDelete,
  amsClassroomSave,
  amsSeatAssign,
  amsSeatBoard,
  amsSeatPromote,
  amsSeatRemove,
  amsSeatUpdateChild,
} from "@/features/ams/ams.functions";
import { useClassroomLocks } from "@/features/ams/classroom-lock";
import { EmptyState, SkeletonRows } from "@/features/ams/components/atoms";
import { ClassroomLockBadge } from "@/features/ams/components/seats/ClassroomLockBadge";
import {
  ClassroomDialog,
  emptyClassroom,
  toDraft,
  type ClassroomDraft,
} from "@/features/ams/components/seats/ClassroomDialog";
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
  const [fullNotice, setFullNotice] = useState<{ classroomName: string; capacity: number; childName: string } | null>(
    null,
  );
  const [classroomDraft, setClassroomDraft] = useState<ClassroomDraft | null>(null);
  const [deletingClassroom, setDeletingClassroom] = useState<BoardClassroom | null>(null);

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
      // A full classroom is a workflow decision, not a data error: staff must
      // acknowledge that the next applicants go to the waiting list.
      if (check.code === "full") {
        setFullNotice({ classroomName: classroom.name_ar, capacity: classroom.capacity, childName: child.name_ar });
        return false;
      }
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

  const promote = useMutation({
    mutationFn: (input: { classroomId: string; entryId?: string | null }) => amsSeatPromote({ data: input }),
    onSuccess: (result) => {
      toast.success(`تم تسكين ${result.childName} في فصل ${result.classroomName}`);
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

  const saveClassroomMutation = useMutation({
    mutationFn: (draft: ClassroomDraft) => amsClassroomSave({ data: draft as never }),
    onSuccess: (result: { created: boolean }) => {
      toast.success(result.created ? "تم إنشاء الفصل" : "تم حفظ إعدادات الفصل");
      setClassroomDraft(null);
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteClassroomMutation = useMutation({
    mutationFn: (id: string) => amsClassroomDelete({ data: { id } }),
    onSuccess: () => {
      toast.success("تم حذف الفصل");
      setDeletingClassroom(null);
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
          { label: "المقاعد المشغولة", value: data.totals.enrolled },
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
            placeholder="ابحث باسم الطالب أو الرقم الأكاديمي أو الهوية…"
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-extrabold text-foreground">{stage.name_ar}</h2>
            <button
              type="button"
              onClick={() => setClassroomDraft(emptyClassroom(stage.id))}
              className="inline-flex items-center gap-1 rounded-2xl border border-border/60 bg-card px-3 py-1.5 text-[11px] font-extrabold text-primary hover:bg-muted/40"
            >
              <Plus className="size-3.5" /> فصل جديد في هذه المرحلة
            </button>
          </div>
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {stage.classrooms.map((classroom) => {
              const percent = classroom.capacity
                ? Math.min(100, Math.round((classroom.enrolled / classroom.capacity) * 100))
                : 0;
              const left = Math.max(0, classroom.capacity - classroom.enrolled);
              const isFull = left === 0;
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
                      className={
                        isFull
                          ? "inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-extrabold text-destructive"
                          : "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold"
                      }
                      style={isFull ? undefined : { background: `${classroom.color_hex}22`, color: classroom.color_hex }}
                    >
                      {isFull ? <Lock className="size-3" /> : <Armchair className="size-3" />}
                      {isFull ? "مكتمل العدد" : `${left} متاح`}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-extrabold">
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-muted-foreground">
                      <Armchair className="size-3" /> مسكَّن {classroom.placed}
                    </span>
                    {classroom.reserved > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-1 text-foreground">
                        <Lock className="size-3" /> محجوز مبدئيًا {classroom.reserved}
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-primary">
                      <ListOrdered className="size-3" /> انتظار {classroom.waiting}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setClassroomDraft(toDraft(classroom as unknown as Record<string, unknown>))}
                      className="inline-flex items-center gap-1 rounded-xl border border-border/60 px-2.5 py-1 text-[11px] font-bold text-foreground hover:bg-muted/40"
                    >
                      <Settings2 className="size-3" /> إعدادات الفصل
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingClassroom(classroom)}
                      className="inline-flex items-center gap-1 rounded-xl border border-destructive/40 px-2.5 py-1 text-[11px] font-bold text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-3" /> حذف الفصل
                    </button>
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
                    المقاعد المشغولة {classroom.enrolled} من {classroom.capacity} (مسكَّن {classroom.placed} + محجوز{" "}
                    {classroom.reserved}) · قائمة الانتظار {classroom.waiting}
                  </p>

                  {classroom.waitingEntries.length > 0 ? (
                    <div className="mt-3 rounded-2xl border border-primary/25 bg-primary/5 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="flex items-center gap-1.5 text-[11px] font-extrabold text-foreground">
                          <ListOrdered className="size-3.5 text-primary" /> قائمة انتظار الفصل
                        </p>
                        <button
                          type="button"
                          disabled={promote.isPending || isFull}
                          onClick={() => promote.mutate({ classroomId: classroom.id })}
                          title={isFull ? "الفصل مكتمل العدد" : "تسكين الأول في قائمة الانتظار تلقائيًا"}
                          className="rounded-xl border border-primary/40 px-2.5 py-1 text-[10px] font-extrabold text-primary disabled:opacity-50"
                        >
                          تسكين تلقائي للأول
                        </button>
                      </div>
                      <ol className="mt-2 space-y-1.5">
                        {classroom.waitingEntries.map((entry, index) => (
                          <li
                            key={entry.entryId}
                            className="flex items-center gap-2 rounded-xl bg-card px-2.5 py-1.5"
                          >
                            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-extrabold text-primary">
                              {index + 1}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-[11px] font-extrabold text-foreground">
                              {entry.childName}
                              {entry.applicationNumber ? (
                                <span className="font-bold text-muted-foreground"> · {entry.applicationNumber}</span>
                              ) : null}
                            </span>
                            <button
                              type="button"
                              disabled={promote.isPending || isFull}
                              onClick={() => promote.mutate({ classroomId: classroom.id, entryId: entry.entryId })}
                              className="rounded-lg border border-border/60 px-2 py-0.5 text-[10px] font-extrabold text-primary disabled:opacity-50"
                            >
                              تسكين
                            </button>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : null}

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
        <>
        <MoveDialog
          child={moving}
          classrooms={data.classrooms}
          key="move-dialog"
          busy={assign.isPending}
          onClose={() => setMoving(null)}
          onConfirm={(classroomId) => {
            const classroom = data.classrooms.find((item) => item.id === classroomId);
            if (classroom) tryAssign(moving, classroom);
          }}
        />
        </>
      ) : null}

      {fullNotice ? (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-foreground/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-card p-6 text-center shadow-xl">
            <span className="mx-auto grid size-14 place-items-center rounded-3xl bg-destructive/10 text-destructive">
              <Lock className="size-6" />
            </span>
            <h3 className="mt-4 text-base font-extrabold text-foreground">
              تم الوصول إلى الحد الأقصى لفصل «{fullNotice.classroomName}»
            </h3>
            <p className="mt-2 text-xs font-bold leading-6 text-muted-foreground">
              الفصل مكتمل العدد ({fullNotice.capacity} من {fullNotice.capacity} مقعدًا)، ولا يمكن تسكين «
              {fullNotice.childName}» فيه الآن. سيتم نقل الطلبات التالية إلى قائمة انتظار الفصل حسب أسبقية التسجيل، ويُسكَّن
              الأول في القائمة تلقائيًا عند تحرّر أي مقعد.
            </p>
            <button
              type="button"
              onClick={() => setFullNotice(null)}
              className="mt-5 w-full rounded-2xl bg-primary px-4 py-2.5 text-xs font-extrabold text-primary-foreground"
            >
              فهمت
            </button>
          </div>
        </div>
      ) : null}

      {editing ? (
        <>
        <EditDialog
          child={editing}
          busy={update.isPending}
          onClose={() => setEditing(null)}
          onConfirm={(patch) => update.mutate({ childId: editing.id, ...patch })}
        />
        </>
      ) : null}

      {classroomDraft ? (
        <ClassroomDialog
          initial={classroomDraft}
          stages={data.stages.map((s) => ({ id: s.id, name_ar: s.name_ar }))}
          busy={saveClassroomMutation.isPending}
          onClose={() => setClassroomDraft(null)}
          onSubmit={(draft) => saveClassroomMutation.mutate(draft)}
        />
      ) : null}

      {deletingClassroom ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-card p-6 shadow-xl">
            <h3 className="text-sm font-extrabold text-foreground">حذف فصل «{deletingClassroom.name_ar}»</h3>
            <p className="mt-2 text-xs font-bold text-muted-foreground">
              الحذف نهائي ولا يمكن التراجع عنه. لا يمكن حذف الفصل إذا كان فيه طلاب مسكَّنون أو قائمة انتظار — انقلهم إلى
              فصل آخر أو أزلهم أولًا.
            </p>
            {deletingClassroom.enrolled > 0 || deletingClassroom.waiting > 0 ? (
              <p className="mt-3 rounded-2xl bg-destructive/10 px-3 py-2 text-[11px] font-extrabold text-destructive">
                الفصل يحتوي على {deletingClassroom.enrolled} طالبًا مسكَّنًا و{deletingClassroom.waiting} في قائمة
                الانتظار.
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingClassroom(null)}
                className="rounded-2xl border border-border/60 px-4 py-2 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={
                  deleteClassroomMutation.isPending ||
                  deletingClassroom.enrolled > 0 ||
                  deletingClassroom.waiting > 0
                }
                onClick={() => deleteClassroomMutation.mutate(deletingClassroom.id)}
                className="rounded-2xl bg-destructive px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-60"
              >
                حذف نهائي
              </button>
            </div>
          </div>
        </div>
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
  const [attempted, setAttempted] = useState<string | null>(null);
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
                disabled={busy}
                onClick={() => (check.ok ? onConfirm(classroom.id) : setAttempted(classroom.id))}
                className="w-full rounded-2xl border border-border/60 p-3 text-start transition-colors enabled:hover:border-primary disabled:opacity-60"
                aria-disabled={!check.ok}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-foreground">{classroom.name_ar}</span>
                  <span className="text-[11px] font-bold text-muted-foreground">
                    {classroom.enrolled}/{classroom.capacity}
                  </span>
                </div>
                {check.ok ? (
                  <p className="mt-1 text-[11px] font-bold text-primary">مطابق للشروط — اضغط للنقل</p>
                ) : check.age ? (
                  <div className="mt-1.5 rounded-2xl border border-destructive/40 bg-destructive/5 p-2.5">
                    <p className="text-[11px] font-extrabold text-destructive">شرط العمر لا ينطبق</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] font-extrabold">
                      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-1 text-destructive">
                        <CalendarClock className="size-3" /> {check.age.childAgeLabel}
                      </span>
                      <span className="text-muted-foreground">مقابل</span>
                      <span className="rounded-full bg-muted px-2 py-1 text-muted-foreground">{check.age.rangeLabel}</span>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 text-[11px] font-bold text-destructive">{check.message}</p>
                )}
                {check.warnings.map((warning) => (
                  <p key={warning} className="mt-0.5 text-[10px] font-bold text-gold">
                    تنبيه: {warning}
                  </p>
                ))}
              </button>
              {!check.ok && attempted === classroom.id ? (
                <div className="mt-1 flex justify-end">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      const fresh = validatePlacement(child, asRule(classroom));
                      if (fresh.ok) onConfirm(classroom.id);
                      else setAttempted(classroom.id);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-2xl border border-destructive/40 px-3 py-1.5 text-[11px] font-extrabold text-destructive disabled:opacity-60"
                  >
                    <RotateCcw className="size-3.5" /> إعادة المحاولة
                  </button>
                </div>
              ) : null}
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
/**
 * Assessments board — rows are children, columns are lessons.
 *
 * Each cell carries two clickable triangles (performance + growth), a month
 * colour picker for the triangle lines, and digital evidence upload.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  FileText,
  Film,
  ImageIcon,
  Link as LinkIcon,
  Loader2,
  Palette,
  Paperclip,
  Trash2,
  X,
} from "lucide-react";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MediaViewerDialog } from "@/components/media/MediaViewerDialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ASSESSMENT_EVIDENCE_ACCEPT,
  DEFAULT_LINE_COLOR,
  EVIDENCE_KIND_LABELS_AR,
  MONTH_COLORS,
  SCALE_LABELS,
  TRIANGLE_LABELS,
  currentMonthColor,
  monthLabelOfColor,
  normalizeColors,
  type AssessmentBoard as Board,
  type AssessmentCell,
  type EvidenceFileKind,

  type TriangleLevel,
  type TriangleScale,
} from "../assessments";
import { uploadAssessmentEvidence } from "../assessment-upload";
import {
  assessmentsAddEvidence,
  assessmentsBoard,
  assessmentsDeleteEvidence,
  assessmentsEnsureCell,
  assessmentsSave,
} from "../assessments.functions";
import { EvaluationGuide } from "./EvaluationGuide";
import { EvaluationTriangle } from "./EvaluationTriangle";


const EMPTY_CELL = {
  performanceLevel: 0 as TriangleLevel,
  growthLevel: 0 as TriangleLevel,
  performanceColors: normalizeColors([]),
  growthColors: normalizeColors([]),
  note: null as string | null,
};

export function AssessmentsBoard() {
  const loadBoard = useServerFn(assessmentsBoard);
  const saveCell = useServerFn(assessmentsSave);
  const ensureCell = useServerFn(assessmentsEnsureCell);
  const addEvidence = useServerFn(assessmentsAddEvidence);
  const removeEvidence = useServerFn(assessmentsDeleteEvidence);
  const queryClient = useQueryClient();

  const [classroomId, setClassroomId] = useState<string | null>(null);
  const [focusChildId, setFocusChildId] = useState<string>("all");
  const [openCell, setOpenCell] = useState<{ childId: string; lessonId: string } | null>(null);


  const queryKey = ["assessments-board", classroomId];
  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => loadBoard({ data: { classroomId } }) as Promise<Board>,
  });

  const cellMap = useMemo(() => {
    const map = new Map<string, AssessmentCell>();
    for (const cell of data?.cells ?? []) map.set(`${cell.childId}|${cell.lessonId}`, cell);
    return map;
  }, [data?.cells]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["assessments-board"] });

  const save = useMutation({
    mutationFn: async (input: {
      childId: string;
      lessonId: string;
      performanceLevel: TriangleLevel;
      growthLevel: TriangleLevel;
      performanceColors: string[];
      growthColors: string[];
      note?: string | null;
    }) => {
      if (!data?.selectedClassroomId) throw new Error("لا يوجد فصل محدد.");
      return saveCell({ data: { ...input, classroomId: data.selectedClassroomId } });
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message || "تعذّر حفظ التقييم."),
  });

  const uploadRef = useRef<HTMLInputElement | null>(null);
  const [uploadTarget, setUploadTarget] = useState<{ childId: string; lessonId: string } | null>(
    null,
  );
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    if (!uploadTarget || !data?.selectedClassroomId) return;
    setUploading(true);
    try {
      const cell = await ensureCell({
        data: {
          childId: uploadTarget.childId,
          lessonId: uploadTarget.lessonId,
          classroomId: data.selectedClassroomId,
        },
      });
      const uploaded = await uploadAssessmentEvidence(file, cell.id);
      await addEvidence({ data: { assessmentId: cell.id, ...uploaded } });
      toast.success("تم رفع الدليل الرقمي.");
      await invalidate();
    } catch (e) {
      toast.error((e as Error).message || "تعذّر رفع الدليل.");
    } finally {
      setUploading(false);
      setUploadTarget(null);
    }
  };

  const deleteEvidence = useMutation({
    mutationFn: (id: string) => removeEvidence({ data: { id } }),
    onSuccess: () => {
      toast.success("تم حذف الدليل.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "تعذّر حذف الدليل."),
  });

  // Lightweight evidence: an external link (Drive, YouTube…) instead of an upload.
  const [linkMode, setLinkMode] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkName, setLinkName] = useState("");

  const addLink = useMutation({
    mutationFn: async () => {
      if (!openCell || !data?.selectedClassroomId) throw new Error("لا يوجد فصل محدد.");
      const cell = await ensureCell({
        data: {
          childId: openCell.childId,
          lessonId: openCell.lessonId,
          classroomId: data.selectedClassroomId,
        },
      });
      return addEvidence({
        data: {
          assessmentId: cell.id,
          externalUrl: linkUrl.trim(),
          fileType: "link" as const,
          fileName: linkName.trim() || null,
        },
      });
    },
    onSuccess: () => {
      toast.success("تم إضافة الرابط كدليل.");
      setLinkMode(false);
      setLinkUrl("");
      setLinkName("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "تعذّر إضافة الرابط."),
  });

  const [viewer, setViewer] = useState<{
    url: string;
    kind: EvidenceFileKind;
    title: string;
  } | null>(null);


  if (isLoading) {
    return (
      <div className="grid place-items-center rounded-3xl border border-border/60 bg-card p-14">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-border/70 bg-card p-10 text-center">
        <p className="text-sm font-black text-foreground">{(error as Error).message}</p>
      </div>
    );
  }

  const board = data!;
  const cellOf = (childId: string, lessonId: string) => cellMap.get(`${childId}|${lessonId}`);

  const active = openCell ? cellOf(openCell.childId, openCell.lessonId) : undefined;
  const activeChild = board.children.find((c) => c.id === openCell?.childId);
  const activeLesson = board.lessons.find((l) => l.id === openCell?.lessonId);

  const focusChild =
    focusChildId === "all" ? null : (board.children.find((c) => c.id === focusChildId) ?? null);

  /** Shared cell mutations so both the grid and the focused child view behave the same. */
  const cycleFor = (
    childId: string,
    lessonId: string,
    cell: { performanceLevel: TriangleLevel; growthLevel: TriangleLevel; performanceColors: string[]; growthColors: string[]; note: string | null },
    scale: TriangleScale,
    level: TriangleLevel,
  ) => {
    const colors =
      scale === "performance"
        ? [...normalizeColors(cell.performanceColors)]
        : [...normalizeColors(cell.growthColors)];
    if (level > 0) {
      const idx = level - 1;
      if (!colors[idx] || colors[idx] === DEFAULT_LINE_COLOR) colors[idx] = currentMonthColor();
    }
    save.mutate({
      childId,
      lessonId,
      performanceLevel: scale === "performance" ? level : cell.performanceLevel,
      growthLevel: scale === "growth" ? level : cell.growthLevel,
      performanceColors:
        scale === "performance" ? colors : normalizeColors(cell.performanceColors),
      growthColors: scale === "growth" ? colors : normalizeColors(cell.growthColors),
      note: cell.note,
    });
  };

  const setColorFor = (
    childId: string,
    lessonId: string,
    cell: { performanceLevel: TriangleLevel; growthLevel: TriangleLevel; performanceColors: string[]; growthColors: string[]; note: string | null },
    scale: TriangleScale,
    lineIndex: number,
    hex: string,
  ) => {
    const colors =
      scale === "performance"
        ? [...normalizeColors(cell.performanceColors)]
        : [...normalizeColors(cell.growthColors)];
    colors[lineIndex] = hex;
    const level = scale === "performance" ? cell.performanceLevel : cell.growthLevel;
    const nextLevel = Math.max(level, lineIndex + 1) as TriangleLevel;
    save.mutate({
      childId,
      lessonId,
      performanceLevel: scale === "performance" ? nextLevel : cell.performanceLevel,
      growthLevel: scale === "growth" ? nextLevel : cell.growthLevel,
      performanceColors:
        scale === "performance" ? colors : normalizeColors(cell.performanceColors),
      growthColors: scale === "growth" ? colors : normalizeColors(cell.growthColors),
      note: cell.note,
    });
  };

  const DetailsButton = ({ childId, lessonId, count }: { childId: string; lessonId: string; count: number }) => (
    <button
      type="button"
      onClick={() => setOpenCell({ childId, lessonId })}
      className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-black text-primary shadow-sm transition hover:bg-primary hover:text-primary-foreground"
    >
      <Paperclip className="size-3.5" />
      التفاصيل والأدلة
      {count ? (
        <span className="grid size-4 place-items-center rounded-full bg-primary text-[9px] font-black text-primary-foreground">
          {count}
        </span>
      ) : null}
    </button>
  );

  return (
    <div className="space-y-5">
      <EvaluationGuide />

      {/* Toolbar */}
      <div className="flex flex-wrap items-end gap-3 rounded-3xl border border-border/60 bg-card/80 p-4">
        <div className="min-w-56 space-y-1.5">
          <label className="text-[11px] font-black text-muted-foreground">الفصل</label>
          <Select
            value={board.selectedClassroomId ?? ""}
            onValueChange={(value) => {
              setClassroomId(value);
              setFocusChildId("all");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر الفصل" />
            </SelectTrigger>
            <SelectContent>
              {board.classrooms.map((room) => (
                <SelectItem key={room.id} value={room.id}>
                  {room.nameAr} — {room.stageNameAr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-56 space-y-1.5">
          <label className="text-[11px] font-black text-muted-foreground">الطفل</label>
          <Select value={focusChildId} onValueChange={setFocusChildId}>
            <SelectTrigger>
              <SelectValue placeholder="كل الأطفال" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأطفال (شبكة الفصل)</SelectItem>
              {board.children.map((child) => (
                <SelectItem key={child.id} value={child.id}>
                  {child.nameAr}
                  {child.studentNumber ? ` — ${child.studentNumber}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1" />
        <MonthLegend />
      </div>


      {!board.classrooms.length ? (
        <EmptyState text="لا توجد فصول مسندة إليك حتى الآن — يرجى مراجعة إدارة المدرسة." />
      ) : !board.lessons.length ? (
        <EmptyState text="لا توجد دروس في منهج هذا الفصل — أضيفي المواد والمحاور والدروس من «إدارة المنهج» أولًا." />
      ) : !board.children.length ? (
        <EmptyState text="لا يوجد أطفال مسجّلون في هذا الفصل حتى الآن." />
      ) : focusChild ? (
        <div className="space-y-5">
          <div className="rounded-3xl border border-primary/30 bg-gradient-to-l from-primary/10 to-transparent p-6">
            <p className="text-[11px] font-black text-primary">تقييم فردي — عرض موسّع</p>
            <h2 className="mt-1 text-2xl font-black text-foreground">{focusChild.nameAr}</h2>
            <p className="mt-1 text-xs font-bold text-muted-foreground">
              {focusChild.studentNumber ? `${focusChild.studentNumber} · ` : ""}
              {board.lessons.length} درسًا في منهج الفصل
            </p>
          </div>

          {groupLessons(board.lessons).map((subject) => (
            <section key={subject.nameAr} className="space-y-3">
              <h3
                className="rounded-2xl px-4 py-2 text-sm font-black text-white"
                style={{ background: subject.colorHex }}
              >
                {subject.nameAr}
              </h3>
              {subject.topics.map((topic) => (
                <div key={topic.nameAr} className="space-y-3">
                  <p className="text-xs font-black text-muted-foreground">{topic.nameAr}</p>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {topic.lessons.map((lesson) => {
                      const cell = cellOf(focusChild.id, lesson.id) ?? {
                        ...EMPTY_CELL,
                        evidences: [],
                      };
                      return (
                        <article
                          key={lesson.id}
                          className="space-y-4 rounded-3xl border border-border/60 bg-card p-5 shadow-soft"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h4 className="text-base font-black text-foreground">{lesson.nameAr}</h4>
                            <DetailsButton
                              childId={focusChild.id}
                              lessonId={lesson.id}
                              count={"evidences" in cell ? cell.evidences.length : 0}
                            />
                          </div>
                          <div className="flex flex-wrap items-start justify-center gap-8 rounded-2xl bg-muted/40 p-4">
                            <ScaleControl
                              scale="performance"
                              level={cell.performanceLevel}
                              colors={normalizeColors(cell.performanceColors)}
                              size={82}
                              onCycle={(next) =>
                                cycleFor(focusChild.id, lesson.id, cell, "performance", next)
                              }
                              onPick={(line, hex) =>
                                setColorFor(focusChild.id, lesson.id, cell, "performance", line, hex)
                              }
                            />
                            <ScaleControl
                              scale="growth"
                              level={cell.growthLevel}
                              colors={normalizeColors(cell.growthColors)}
                              size={82}
                              onCycle={(next) =>
                                cycleFor(focusChild.id, lesson.id, cell, "growth", next)
                              }
                              onPick={(line, hex) =>
                                setColorFor(focusChild.id, lesson.id, cell, "growth", line, hex)
                              }
                            />
                          </div>
                          <div className="grid gap-2 text-[11px] font-bold text-muted-foreground sm:grid-cols-2">
                            <p>
                              {SCALE_LABELS.performance}:{" "}
                              <span className="text-foreground">
                                {TRIANGLE_LABELS.performance[cell.performanceLevel]}
                              </span>
                            </p>
                            <p>
                              {SCALE_LABELS.growth}:{" "}
                              <span className="text-foreground">
                                {TRIANGLE_LABELS.growth[cell.growthLevel]}
                              </span>
                            </p>
                          </div>
                          <p className="rounded-2xl border border-border/50 bg-background/60 p-3 text-xs font-bold text-muted-foreground">
                            {cell.note?.trim() ? cell.note : "لا توجد ملاحظة بعد."}
                          </p>
                        </article>
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>
      ) : (
        <div className="relative max-h-[70vh] overflow-auto rounded-3xl border border-border/60 bg-card">
          <table className="min-w-max border-separate border-spacing-0 text-right">
            <thead>
              <tr>
                <th className="sticky top-0 right-0 z-30 w-56 border-b border-l border-border/60 bg-card px-4 py-3 text-xs font-black text-foreground">
                  الطفل
                </th>
                {board.lessons.map((lesson) => (
                  <th
                    key={lesson.id}
                    className="sticky top-0 z-20 min-w-40 border-b border-l border-border/40 bg-card px-3 py-2 align-bottom"
                  >
                    <span
                      className="block truncate text-[10px] font-black"
                      style={{ color: lesson.subjectColorHex }}
                      title={`${lesson.subjectNameAr} › ${lesson.topicNameAr}`}
                    >
                      {lesson.subjectNameAr} › {lesson.topicNameAr}
                    </span>
                    <span className="mt-1 block text-xs font-black text-foreground">
                      {lesson.nameAr}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {board.children.map((child) => (
                <tr key={child.id} className="group">
                  <th className="sticky right-0 z-10 w-56 border-b border-l border-border/60 bg-card px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setFocusChildId(child.id)}
                      className="block text-xs font-black text-foreground hover:text-primary hover:underline"
                      title="عرض تقييم الطفل في صفحة كاملة"
                    >
                      {child.nameAr}
                    </button>
                    {child.studentNumber ? (
                      <span className="mt-0.5 block text-[10px] font-bold text-muted-foreground">
                        {child.studentNumber}
                      </span>
                    ) : null}
                  </th>
                  {board.lessons.map((lesson) => {
                    const cell = cellOf(child.id, lesson.id) ?? { ...EMPTY_CELL, evidences: [] };
                    return (
                      <td
                        key={lesson.id}
                        className="border-b border-l border-border/30 px-2 py-2 align-top"
                      >
                        <div className="flex items-start justify-center gap-1.5">
                          <ScaleControl
                            scale="performance"
                            level={cell.performanceLevel}
                            colors={normalizeColors(cell.performanceColors)}
                            onCycle={(next) =>
                              cycleFor(child.id, lesson.id, cell, "performance", next)
                            }
                            onPick={(line, hex) =>
                              setColorFor(child.id, lesson.id, cell, "performance", line, hex)
                            }
                          />
                          <ScaleControl
                            scale="growth"
                            level={cell.growthLevel}
                            colors={normalizeColors(cell.growthColors)}
                            onCycle={(next) => cycleFor(child.id, lesson.id, cell, "growth", next)}
                            onPick={(line, hex) =>
                              setColorFor(child.id, lesson.id, cell, "growth", line, hex)
                            }
                          />
                        </div>
                        <div className="mt-2 flex items-center justify-center">
                          <DetailsButton
                            childId={child.id}
                            lessonId={lesson.id}
                            count={"evidences" in cell ? cell.evidences.length : 0}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}


      <input
        ref={uploadRef}
        type="file"
        accept={ASSESSMENT_EVIDENCE_ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void handleUpload(file);
        }}
      />

      <Dialog open={!!openCell} onOpenChange={(open) => !open && setOpenCell(null)}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-black">
              {activeChild?.nameAr ?? "—"} — {activeLesson?.nameAr ?? "—"}
            </DialogTitle>
            <DialogDescription className="text-xs font-bold">
              {activeLesson ? `${activeLesson.subjectNameAr} › ${activeLesson.topicNameAr}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {(["performance", "growth"] as TriangleScale[]).map((scale) => {
                const level = (scale === "performance"
                  ? (active?.performanceLevel ?? 0)
                  : (active?.growthLevel ?? 0)) as TriangleLevel;
                return (
                  <div
                    key={scale}
                    className="rounded-2xl border border-border/60 bg-background/60 p-3 text-center"
                  >
                    <p className="text-[11px] font-black text-muted-foreground">
                      {SCALE_LABELS[scale]}
                    </p>
                    <div className="mt-2 grid place-items-center">
                      <EvaluationTriangle
                        scale={scale}
                        level={level}
                        colors={normalizeColors(
                          scale === "performance" ? active?.performanceColors : active?.growthColors,
                        )}
                        size={64}
                        readOnly
                      />
                    </div>
                    <p className="mt-2 text-xs font-black text-foreground">
                      {TRIANGLE_LABELS[scale][level]}
                    </p>
                  </div>
                );
              })}
            </div>

            <NoteEditor
              value={active?.note ?? ""}
              onSave={(note) => {
                if (!openCell) return;
                save.mutate({
                  childId: openCell.childId,
                  lessonId: openCell.lessonId,
                  performanceLevel: (active?.performanceLevel ?? 0) as TriangleLevel,
                  growthLevel: (active?.growthLevel ?? 0) as TriangleLevel,
                  performanceColors: normalizeColors(active?.performanceColors),
                  growthColors: normalizeColors(active?.growthColors),
                  note,
                });
              }}
              saving={save.isPending}
            />

            <div className="space-y-2">
              <p className="text-[11px] font-black text-muted-foreground">الأدلة الرقمية</p>
              {!active?.evidences.length ? (
                <p className="text-xs font-bold text-muted-foreground">لا توجد أدلة مرفوعة بعد.</p>
              ) : (
                <ul className="space-y-2">
                  {active.evidences.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-2 rounded-2xl border border-border/60 bg-background/60 px-3 py-2"
                    >
                      {item.fileType === "image" ? (
                        <ImageIcon className="size-4 text-primary" />
                      ) : item.fileType === "video" ? (
                        <Film className="size-4 text-primary" />
                      ) : item.fileType === "link" ? (
                        <LinkIcon className="size-4 text-primary" />
                      ) : (
                        <FileText className="size-4 text-primary" />
                      )}
                      <span className="flex-1 truncate text-xs font-bold text-foreground">
                        {item.fileName ?? EVIDENCE_KIND_LABELS_AR[item.fileType]}
                      </span>
                      {item.url ? (
                        <button
                          type="button"
                          onClick={() =>
                            setViewer({
                              url: item.url as string,
                              kind: item.fileType,
                              title: item.fileName ?? EVIDENCE_KIND_LABELS_AR[item.fileType],
                            })
                          }
                          className="text-[11px] font-black text-primary underline"
                        >
                          عرض
                        </button>
                      ) : null}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={() => deleteEvidence.mutate(item.id)}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 text-xs font-black"
                  disabled={uploading}
                  onClick={() => {
                    if (!openCell) return;
                    setUploadTarget(openCell);
                    uploadRef.current?.click();
                  }}
                >
                  {uploading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Paperclip className="size-4" />
                  )}
                  رفع دليل (صورة / فيديو / PDF)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 text-xs font-black"
                  onClick={() => setLinkMode((v) => !v)}
                >
                  <LinkIcon className="size-4" />
                  {linkMode ? "إلغاء الرابط" : "إضافة رابط خارجي"}
                </Button>
              </div>

              {linkMode ? (
                <div className="space-y-2 rounded-2xl border border-primary/30 bg-primary/5 p-3">
                  <Input
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    dir="ltr"
                    className="h-9 text-xs font-bold"
                  />
                  <Input
                    value={linkName}
                    onChange={(e) => setLinkName(e.target.value)}
                    placeholder="اسم الدليل (اختياري)"
                    className="h-9 text-xs font-bold"
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="w-full text-xs font-black"
                    disabled={!/^https?:\/\/.+/.test(linkUrl.trim()) || addLink.isPending}
                    onClick={() => addLink.mutate()}
                  >
                    {addLink.isPending ? <Loader2 className="me-2 size-4 animate-spin" /> : null}
                    حفظ الرابط كدليل
                  </Button>
                </div>
              ) : null}
            </div>

          </div>
        </DialogContent>
      </Dialog>

      <MediaViewerDialog
        item={
          viewer ? { url: viewer.url, kind: viewer.kind, name: viewer.title } : null
        }
        onClose={() => setViewer(null)}
      />

    </div>
  );
}

/** Groups flat lessons into subject › topic sections for the focused child view. */
function groupLessons(lessons: Board["lessons"]) {
  const subjects: {
    nameAr: string;
    colorHex: string;
    topics: { nameAr: string; lessons: Board["lessons"] }[];
  }[] = [];
  for (const lesson of lessons) {
    let subject = subjects.find((s) => s.nameAr === lesson.subjectNameAr);
    if (!subject) {
      subject = { nameAr: lesson.subjectNameAr, colorHex: lesson.subjectColorHex, topics: [] };
      subjects.push(subject);
    }
    let topic = subject.topics.find((t) => t.nameAr === lesson.topicNameAr);
    if (!topic) {
      topic = { nameAr: lesson.topicNameAr, lessons: [] };
      subject.topics.push(topic);
    }
    topic.lessons.push(lesson);
  }
  return subjects;
}

function ScaleControl({
  scale,
  level,
  colors,
  size,
  onCycle,
  onPick,
}: {
  scale: TriangleScale;
  level: TriangleLevel;
  colors: string[];
  size?: number;
  onCycle: (next: TriangleLevel) => void;
  onPick: (lineIndex: number, hex: string) => void;
}) {
  const [line, setLine] = useState(0);
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={cn("font-black text-muted-foreground", size ? "text-xs" : "text-[9px]")}>
        {SCALE_LABELS[scale]}
      </span>
      <div className="flex items-center gap-1">
        <EvaluationTriangle
          scale={scale}
          level={level}
          colors={colors}
          size={size}
          onCycle={onCycle}
        />
        <Popover>

          <PopoverTrigger asChild>
            <button
              type="button"
              title="اختيار لون الشهر"
              className="grid size-6 place-items-center rounded-lg border border-border/60 bg-background/70 hover:border-primary/50"
            >
              <Palette className="size-3.5 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 space-y-3" dir="rtl">
            <div>
              <p className="text-[11px] font-black text-muted-foreground">الضلع</p>
              <div className="mt-1 flex gap-1">
                {["القاعدة", "الضلع الأيسر", "الضلع الأيمن"].map((label, index) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setLine(index)}
                    className={cn(
                      "flex-1 rounded-lg border px-1 py-1 text-[10px] font-black transition",
                      line === index
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 text-muted-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-black text-muted-foreground">شهر الإنجاز</p>
              <div className="mt-1 grid grid-cols-6 gap-1.5">
                {MONTH_COLORS.map((month) => (
                  <button
                    key={month.month}
                    type="button"
                    title={`${month.nameAr} — ${month.label}`}
                    onClick={() => onPick(line, month.hex)}
                    className={cn(
                      "size-7 rounded-lg border-2 transition hover:scale-110",
                      colors[line]?.toLowerCase() === month.hex.toLowerCase()
                        ? "border-primary"
                        : "border-border/50",
                    )}
                    style={{ backgroundColor: month.hex }}
                  />
                ))}
              </div>
            </div>
            <p className="text-[10px] font-bold text-muted-foreground">
              اللون الحالي: {monthLabelOfColor(colors[line] ?? DEFAULT_LINE_COLOR) ?? "غير محدد"}
            </p>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

function NoteEditor({
  value,
  onSave,
  saving,
}: {
  value: string;
  onSave: (note: string) => void;
  saving: boolean;
}) {
  const [text, setText] = useState(value);
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-black text-muted-foreground">ملاحظة المعلمة</p>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="ملاحظة قصيرة عن أداء الطفل في هذا الدرس"
        className="text-xs"
      />
      <Button
        type="button"
        size="sm"
        className="text-xs font-black"
        disabled={saving}
        onClick={() => onSave(text)}
      >
        {saving ? <Loader2 className="size-4 animate-spin" /> : null}
        حفظ الملاحظة
      </Button>
    </div>
  );
}

function MonthLegend() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-2 text-xs font-black">
          <Palette className="size-4" />
          مفتاح ألوان الأشهر
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" dir="rtl">
        <ul className="grid grid-cols-2 gap-1.5">
          {MONTH_COLORS.map((month) => (
            <li key={month.month} className="flex items-center gap-2">
              <span
                className="size-4 rounded border border-border/60"
                style={{ backgroundColor: month.hex }}
              />
              <span className="text-[11px] font-bold text-foreground">
                {month.nameAr} — {month.label}
              </span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-border/70 bg-card p-10 text-center">
      <X className="mx-auto mb-2 size-6 text-muted-foreground" />
      <p className="text-sm font-black text-foreground">{text}</p>
    </div>
  );
}

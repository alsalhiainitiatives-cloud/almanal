/**
 * Ready-made message templates — create once, insert or send any time.
 *
 * Used by both the group class chat and the private conversations: the picker
 * inserts the template text into the composer, or sends it straight away.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Pencil, Plus, Send, Sparkles, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

import type { MessageTemplate } from "../templates";
import { templatesDelete, templatesList, templatesSave } from "../templates.functions";

type Draft = { id: string | null; title: string; body: string; forClassroom: boolean };

const emptyDraft: Draft = { id: null, title: "", body: "", forClassroom: false };

export function MessageTemplates({
  classroomId,
  onInsert,
  onSend,
  disabled = false,
}: {
  classroomId?: string | null;
  /** Puts the template text in the composer so it can be edited before sending. */
  onInsert: (body: string) => void;
  /** Sends the template immediately, when the surface supports it. */
  onSend?: (body: string) => void;
  disabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const loadList = useServerFn(templatesList);
  const saveFn = useServerFn(templatesSave);
  const deleteFn = useServerFn(templatesDelete);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  const list = useQuery({
    queryKey: ["chat-templates", classroomId ?? null],
    queryFn: () => loadList({ data: { classroomId: classroomId ?? null } }),
    enabled: open,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["chat-templates"] });

  const save = useMutation({
    mutationFn: (value: Draft) =>
      saveFn({
        data: {
          id: value.id,
          title: value.title,
          body: value.body,
          classroomId: value.forClassroom ? (classroomId ?? null) : null,
        },
      }),
    onSuccess: () => {
      toast.success("تم حفظ القالب");
      setDraft(null);
      void invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("تم حذف القالب");
      void invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const templates = list.data ?? [];

  return (
    <>
      <Button
        type="button"
        size="icon"
        variant="outline"
        disabled={disabled}
        onClick={() => setOpen(true)}
        aria-label="قوالب الرسائل الجاهزة"
        title="قوالب الرسائل الجاهزة"
      >
        <Sparkles className="size-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[min(96vw,640px)] max-w-none" dir="rtl">
          <DialogTitle className="text-base font-black">قوالب الرسائل الجاهزة</DialogTitle>
          <p className="text-xs text-muted-foreground">
            أنشئي رسالة مرة واحدة، ثم أدرجيها أو أرسليها في أي وقت.
          </p>

          {draft ? (
            <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/30 p-3">
              <Input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="عنوان القالب (مثال: تذكير بالزي الرياضي)"
                maxLength={120}
              />
              <Textarea
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                placeholder="نص الرسالة…"
                rows={4}
                maxLength={4000}
              />
              {classroomId ? (
                <label className="flex items-center gap-2 text-xs font-bold">
                  <input
                    type="checkbox"
                    checked={draft.forClassroom}
                    onChange={(e) => setDraft({ ...draft, forClassroom: e.target.checked })}
                    className="size-4 accent-primary"
                  />
                  خاص بهذا الفصل فقط
                </label>
              ) : null}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={save.isPending}
                  onClick={() => save.mutate(draft)}
                >
                  {save.isPending ? <Loader2 className="size-4 animate-spin" /> : "حفظ القالب"}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(null)}>
                  <X className="me-1 size-4" /> إلغاء
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-fit"
              onClick={() => setDraft(emptyDraft)}
            >
              <Plus className="me-1 size-4" /> قالب جديد
            </Button>
          )}

          <ScrollArea className="max-h-[46vh]">
            {list.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-4 animate-spin text-primary" />
              </div>
            ) : templates.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                لا توجد قوالب بعد — أنشئي أول قالب جاهز.
              </p>
            ) : (
              <div className="flex flex-col gap-2 pe-2">
                {templates.map((template: MessageTemplate) => (
                  <div
                    key={template.id}
                    className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <p className="min-w-0 flex-1 truncate text-sm font-bold">{template.title}</p>
                      {template.classroomId ? (
                        <Badge variant="secondary" className="shrink-0 text-[10px]">
                          خاص بالفصل
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap break-words text-xs text-muted-foreground">
                      {template.body}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          onInsert(template.body);
                          setOpen(false);
                        }}
                      >
                        إدراج في الرسالة
                      </Button>
                      {onSend ? (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            onSend(template.body);
                            setOpen(false);
                          }}
                        >
                          <Send className="me-1 size-3.5" /> إرسال الآن
                        </Button>
                      ) : null}
                      {template.mine ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setDraft({
                                id: template.id,
                                title: template.title,
                                body: template.body,
                                forClassroom: Boolean(template.classroomId),
                              })
                            }
                          >
                            <Pencil className="me-1 size-3.5" /> تعديل
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            disabled={remove.isPending}
                            onClick={() => remove.mutate(template.id)}
                          >
                            <Trash2 className="me-1 size-3.5" /> حذف
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}

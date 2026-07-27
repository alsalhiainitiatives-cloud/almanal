import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Lock, MessageSquare, Send, StickyNote } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { amsAddNote } from "../../ams.functions";
import type { WorkspaceData } from "../../types";
import { EmptyState, formatDateTime } from "../atoms";
const VISIBILITY = [
  { value: "internal", label: "داخلي", icon: StickyNote },
  { value: "confidential", label: "سري (الإدارة)", icon: Lock },
  { value: "parent", label: "مرئي لولي الأمر", icon: MessageSquare },
] as const;
export function TimelinePanel({ data }: { data: WorkspaceData }) {
  const queryClient = useQueryClient();
  const addNote = useServerFn(amsAddNote);
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<(typeof VISIBILITY)[number]["value"]>("internal");
  const mutation = useMutation({
    mutationFn: (input: { id: string; body: string; visibility: "internal" | "confidential" | "parent" }) =>
      addNote({ data: input }),
    onSuccess: () => {
      setBody("");
      toast.success("تمت إضافة الملاحظة");
      queryClient.invalidateQueries({ queryKey: ["ams"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  return (
    <div className="flex h-full flex-col rounded-3xl border border-border/60 bg-card p-4">
      <Tabs defaultValue="timeline" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="w-full rounded-2xl">
          <TabsTrigger value="timeline" className="flex-1 rounded-xl text-xs font-bold">
            الخط الزمني
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex-1 rounded-xl text-xs font-bold">
            الملاحظات ({data.notes.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="timeline" className="mt-3 min-h-0 flex-1 overflow-y-auto pe-1">
          {data.events.length === 0 ? (
            <EmptyState title="لا توجد أحداث بعد" />
          ) : (
            <ol className="relative space-y-4 border-s border-border/60 ps-4">
              {data.events.map((event) => (
                <li key={event.id} className="relative">
                  <span className="absolute -start-[21px] top-1.5 size-2.5 rounded-full bg-primary" />
                  <p className="text-xs font-extrabold text-foreground">{event.title_ar}</p>
                  {event.body_ar ? (
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{event.body_ar}</p>
                  ) : null}
                  <p className="mt-1 text-[10px] font-bold text-muted-foreground">
                    {event.actorName} · {formatDateTime(event.created_at)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </TabsContent>
        <TabsContent value="notes" className="mt-3 min-h-0 flex-1 overflow-y-auto pe-1">
          {data.notes.length === 0 ? (
            <EmptyState title="لا توجد ملاحظات" />
          ) : (
            <ul className="space-y-2.5">
              {data.notes.map((note) => (
                <li
                  key={note.id}
                  className={cn(
                    "rounded-2xl border p-3",
                    note.visibility === "confidential"
                      ? "border-destructive/25 bg-destructive/5"
                      : note.visibility === "parent"
                        ? "border-mint bg-mint/25"
                        : "border-border/60 bg-muted/25",
                  )}
                >
                  <p className="text-xs leading-relaxed font-semibold whitespace-pre-wrap text-foreground">
                    {note.body}
                  </p>
                  <p className="mt-1.5 text-[10px] font-bold text-muted-foreground">
                    {note.authorName} · {formatDateTime(note.created_at)} ·{" "}
                    {VISIBILITY.find((v) => v.value === note.visibility)?.label}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
      <div className="mt-3 space-y-2 border-t border-border/50 pt-3">
        <div className="flex flex-wrap gap-1.5">
          {VISIBILITY.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setVisibility(option.value)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors",
                visibility === option.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent",
              )}
            >
              <option.icon className="size-3" />
              {option.label}
            </button>
          ))}
        </div>
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="اكتب ملاحظة للفريق…"
          className="min-h-[76px] rounded-2xl text-xs"
        />
        <Button
          size="sm"
          className="w-full rounded-2xl text-xs font-bold"
          disabled={body.trim().length < 2 || mutation.isPending}
          onClick={() => mutation.mutate({ id: data.application.id, body: body.trim(), visibility })}
        >
          <Send className="size-3.5" />
          إضافة ملاحظة
        </Button>
      </div>
    </div>
  );
}
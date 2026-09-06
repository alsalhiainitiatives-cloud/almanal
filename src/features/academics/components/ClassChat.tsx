/**
 * Class Chat — pick a classroom, then talk inside one focused window.
 *
 * Rooms come from the server (RLS decides scope): staff see every classroom, a
 * teacher only her assigned classrooms, and a parent one room per enrolled
 * child, labelled with the child's name, the classroom and the stage.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CornerDownLeft,
  FileText,
  Image as ImageIcon,
  Loader2,
  MessagesSquare,
  Paperclip,
  Send,
  Trash2,
  UserRound,
  Users,
  Video,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useClearNotificationKind } from "@/features/notifications/useNotificationCounters";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

import {
  CHAT_ROLE_LABELS,
  formatChatTime,
  type ChatAttachment,
  type ChatMessage,
  type ChatRoom,
} from "../chat";
import { uploadChatAttachment } from "../chat-upload";
import { chatBoard, chatDeleteMessage, chatSendMessage } from "../chat.functions";
import { PrivateChatPanel } from "./PrivateChatPanel";

/** Readable text colour on top of a classroom colour. */
function onColor(hex: string) {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#1b1420" : "#ffffff";
}

function AttachmentIcon({ kind }: { kind: ChatAttachment["kind"] }) {
  if (kind === "image") return <ImageIcon className="size-4" />;
  if (kind === "video") return <Video className="size-4" />;
  return <FileText className="size-4" />;
}

function AttachmentView({ item }: { item: ChatAttachment }) {
  if (item.kind === "image" && item.url) {
    return (
      <a href={item.url} target="_blank" rel="noreferrer" className="block">
        <img
          src={item.url}
          alt={item.name ?? "مرفق"}
          loading="lazy"
          className="max-h-64 w-full rounded-lg object-cover"
        />
      </a>
    );
  }
  if (item.kind === "video" && item.url) {
    return <video src={item.url} controls className="max-h-64 w-full rounded-lg" />;
  }
  return (
    <a
      href={item.url ?? "#"}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm hover:bg-muted"
    >
      <AttachmentIcon kind={item.kind} />
      <span className="truncate">{item.name ?? "مرفق"}</span>
    </a>
  );
}

function RoomCard({ room, onOpen }: { room: ChatRoom; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-border/60 bg-card p-3 text-start shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      <span
        className="grid size-11 shrink-0 place-items-center rounded-xl text-sm font-black"
        style={{ backgroundColor: room.colorHex, color: onColor(room.colorHex) }}
        aria-hidden
      >
        <MessagesSquare className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">
          {room.childName ? `${room.childName} — ${room.classroomName}` : room.classroomName}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {room.stageName ?? "—"}
          {room.teacherNames.length ? ` · ${room.teacherNames[0]}` : ""}
        </span>
      </span>
      <span className="text-[11px] font-bold text-primary opacity-0 transition group-hover:opacity-100">
        فتح
      </span>
    </button>
  );
}

export function ClassChat() {
  const queryClient = useQueryClient();
  const loadBoard = useServerFn(chatBoard);
  const sendFn = useServerFn(chatSendMessage);
  const deleteFn = useServerFn(chatDeleteMessage);
  useClearNotificationKind(["chat_message"]);

  const [tab, setTab] = useState<"group" | "private">("group");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [autoPeer, setAutoPeer] = useState(false);
  const [privateUnread, setPrivateUnread] = useState(0);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [pending, setPending] = useState<ChatAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  const board = useQuery({
    queryKey: ["class-chat", roomId],
    queryFn: () => loadBoard({ data: { classroomId: roomId } }),
  });

  const activeRoomId = open ? (board.data?.activeRoomId ?? null) : null;
  const messages = board.data?.messages ?? [];
  const byId = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);

  // Live updates for the open room only.
  useEffect(() => {
    if (!activeRoomId) return;
    const channel = supabase
      .channel(`class-chat:${activeRoomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "classroom_messages",
          filter: `classroom_id=eq.${activeRoomId}`,
        },
        () => queryClient.invalidateQueries({ queryKey: ["class-chat"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRoomId, queryClient]);

  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, activeRoomId, tab]);

  const send = useMutation({
    mutationFn: async () =>
      sendFn({
        data: {
          classroomId: activeRoomId!,
          body,
          parentMessageId: replyTo?.id ?? null,
          attachments: pending,
        },
      }),
    onSuccess: () => {
      setBody("");
      setPending([]);
      setReplyTo(null);
      queryClient.invalidateQueries({ queryKey: ["class-chat"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["class-chat"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  async function onPickFiles(files: FileList | null) {
    if (!files?.length || !activeRoomId) return;
    setUploading(true);
    try {
      const uploaded: ChatAttachment[] = [];
      for (const file of Array.from(files).slice(0, 4)) {
        uploaded.push(await uploadChatAttachment(file, activeRoomId));
      }
      setPending((prev) => [...prev, ...uploaded].slice(0, 6));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function openRoom(id: string) {
    setRoomId(id);
    setTab("group");
    setAutoPeer(false);
    setReplyTo(null);
    setPending([]);
    setBody("");
    setOpen(true);
  }

  if (board.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  const rooms = board.data?.rooms ?? [];
  if (!rooms.length) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        لا توجد فصول مرتبطة بحسابك حتى الآن، لذلك لا تتوفر محادثات فصول.
      </Card>
    );
  }

  const active = rooms.find((r) => r.classroomId === activeRoomId) ?? null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rooms.map((room) => (
          <RoomCard
            key={`${room.classroomId}-${room.childName ?? ""}`}
            room={room}
            onOpen={() => openRoom(room.classroomId)}
          />
        ))}
      </div>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setRoomId(null);
        }}
      >
        <DialogContent
          className="flex h-[86vh] max-h-[86vh] w-[min(96vw,1000px)] max-w-none flex-col gap-0 overflow-hidden p-0"
          dir="rtl"
        >
          {active ? (
            <>
              <div
                className="flex items-center gap-3 px-5 py-4"
                style={{ backgroundColor: active.colorHex, color: onColor(active.colorHex) }}
              >
                <div className="min-w-0 flex-1">
                  <DialogTitle className="truncate text-base font-black">
                    {active.childName
                      ? `${active.childName} — ${active.classroomName}`
                      : active.classroomName}
                  </DialogTitle>
                  <p className="truncate text-xs opacity-90">
                    {active.stageName ?? "—"}
                    {active.teacherNames.length ? ` · ${active.teacherNames.join("، ")}` : ""}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {CHAT_ROLE_LABELS[board.data?.role ?? "parent"] ?? "عضو"}
                </Badge>
              </div>

              <div className="flex items-center gap-1 border-b border-border/60 bg-muted/40 px-3 py-2 text-sm font-bold">
                <button
                  type="button"
                  onClick={() => setTab("group")}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-4 py-2 transition",
                    tab === "group" ? "bg-card text-primary shadow-sm" : "text-muted-foreground",
                  )}
                >
                  <Users className="size-4" /> الشات الجماعي
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab("private");
                    setAutoPeer(false);
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-4 py-2 transition",
                    tab === "private" ? "bg-card text-primary shadow-sm" : "text-muted-foreground",
                  )}
                >
                  <MessagesSquare className="size-4" /> الرسائل الخاصة
                  {privateUnread ? (
                    <span className="grid min-w-5 place-items-center rounded-full bg-destructive px-1 text-[11px] font-black text-destructive-foreground">
                      {privateUnread}
                    </span>
                  ) : null}
                </button>
              </div>

              {tab === "private" ? (
                <div className="min-h-0 flex-1 p-3">
                  <PrivateChatPanel
                    classroomId={active.classroomId}
                    embedded
                    autoSelectFirst={autoPeer}
                    onUnreadChange={setPrivateUnread}
                  />
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-2">
                    <p className="text-xs text-muted-foreground">
                      رسائل الفصل مرئية لجميع أعضاء الفصل
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setTab("private");
                        setAutoPeer(true);
                      }}
                    >
                      <UserRound className="me-1 size-4" /> شات فردي
                    </Button>
                  </div>

                  <ScrollArea className="min-h-0 flex-1">
                    <div ref={feedRef} className="flex flex-col gap-3 p-4">
                      {messages.length === 0 ? (
                        <p className="py-10 text-center text-sm text-muted-foreground">
                          لا توجد رسائل بعد — ابدأ المحادثة مع الفصل.
                        </p>
                      ) : (
                        messages.map((m) => {
                          const parent = m.parentMessageId ? byId.get(m.parentMessageId) : null;
                          return (
                            <div
                              key={m.id}
                              className={cn(
                                "flex max-w-[85%] gap-2",
                                m.mine ? "ms-auto flex-row-reverse" : "me-auto",
                              )}
                            >
                              <UserAvatar
                                name={m.senderName}
                                src={m.senderAvatarUrl}
                                className="size-8 shrink-0"
                                fallbackClassName="text-xs"
                              />
                              <div
                                className={cn(
                                  "rounded-2xl px-3 py-2 text-sm shadow-sm",
                                  m.mine ? "bg-primary text-primary-foreground" : "bg-muted",
                                )}
                              >
                                <div className="mb-1 flex items-center gap-2 text-[11px] opacity-80">
                                  <span className="font-semibold">{m.senderName ?? "مستخدم"}</span>
                                  <span>{CHAT_ROLE_LABELS[m.senderRole] ?? m.senderRole}</span>
                                  <span>{formatChatTime(m.createdAt)}</span>
                                </div>

                                {parent ? (
                                  <div className="mb-2 rounded-lg border-s-2 border-current/40 bg-background/20 px-2 py-1 text-[11px] opacity-80">
                                    <span className="font-semibold">
                                      {parent.senderName ?? "رسالة"}:{" "}
                                    </span>
                                    {parent.deleted
                                      ? "رسالة محذوفة"
                                      : parent.body.slice(0, 120) || "مرفق"}
                                  </div>
                                ) : null}

                                {m.deleted ? (
                                  <p className="italic opacity-70">تم حذف هذه الرسالة</p>
                                ) : (
                                  <>
                                    {m.body ? (
                                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                                    ) : null}
                                    {m.attachments.length ? (
                                      <div className="mt-2 flex flex-col gap-2">
                                        {m.attachments.map((a, i) => (
                                          <AttachmentView key={`${m.id}-${i}`} item={a} />
                                        ))}
                                      </div>
                                    ) : null}
                                  </>
                                )}

                                {!m.deleted ? (
                                  <div className="mt-1 flex items-center gap-1">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 px-2 text-[11px] opacity-80"
                                      onClick={() => setReplyTo(m)}
                                    >
                                      <CornerDownLeft className="me-1 size-3" /> رد
                                    </Button>
                                    {m.mine || board.data?.role === "staff" ? (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 px-2 text-[11px] opacity-80"
                                        onClick={() => remove.mutate(m.id)}
                                      >
                                        <Trash2 className="size-3" />
                                      </Button>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>

                  <div className="border-t border-border/60 bg-background p-3">
                    {replyTo ? (
                      <div className="mb-2 flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs">
                        <CornerDownLeft className="size-3" />
                        <span className="min-w-0 flex-1 truncate">
                          رد على {replyTo.senderName ?? "رسالة"}:{" "}
                          {replyTo.body.slice(0, 80) || "مرفق"}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2"
                          onClick={() => setReplyTo(null)}
                        >
                          <X className="size-3" />
                        </Button>
                      </div>
                    ) : null}

                    {pending.length ? (
                      <div className="mb-2 flex flex-wrap gap-2">
                        {pending.map((a, i) => (
                          <span
                            key={`${a.path}-${i}`}
                            className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs"
                          >
                            <AttachmentIcon kind={a.kind} />
                            <span className="max-w-[160px] truncate">{a.name ?? "مرفق"}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setPending((prev) => prev.filter((_, idx) => idx !== i))
                              }
                              aria-label="إزالة المرفق"
                            >
                              <X className="size-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div className="flex items-end gap-2">
                      <input
                        ref={fileRef}
                        type="file"
                        multiple
                        accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                        className="hidden"
                        onChange={(e) => onPickFiles(e.target.files)}
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        disabled={uploading}
                        onClick={() => fileRef.current?.click()}
                        aria-label="إرفاق ملف"
                      >
                        {uploading ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Paperclip className="size-4" />
                        )}
                      </Button>
                      <Textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            if (body.trim() || pending.length) send.mutate();
                          }
                        }}
                        rows={1}
                        placeholder="اكتب رسالتك… (Shift + Enter لسطر جديد)"
                        className="max-h-32 min-h-11 flex-1 resize-none"
                      />
                      <Button
                        type="button"
                        size="icon"
                        disabled={send.isPending || (!body.trim() && !pending.length)}
                        onClick={() => send.mutate()}
                        aria-label="إرسال"
                      >
                        {send.isPending ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Send className="size-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <DialogTitle className="sr-only">محادثة الفصل</DialogTitle>
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

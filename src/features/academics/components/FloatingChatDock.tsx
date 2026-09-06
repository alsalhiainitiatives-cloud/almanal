/**
 * Messenger-style floating chat dock.
 *
 * A draggable column of class bubbles sits in the corner of every signed-in
 * page. Each bubble takes the colour of its classroom, and clicking one opens a
 * compact, non-blocking chat window anchored beside the column. Several windows
 * can stay open side by side, each with two tabs: the classroom group chat and
 * the private 1-on-1 conversations inside that classroom.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ChevronLeft,
  FileText,
  GripVertical,
  Image as ImageIcon,
  Loader2,
  MessagesSquare,
  Paperclip,
  Send,
  Smile,
  Trash2,
  Users,
  Video,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { MediaViewerDialog, type MediaItem } from "@/components/media/MediaViewerDialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/ui/user-avatar";
import { usePermissions } from "@/features/auth/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

import { CHAT_ROLE_LABELS, formatChatTime, type ChatAttachment, type ChatRoom } from "../chat";
import { uploadChatAttachment } from "../chat-upload";
import { chatBoard, chatDeleteMessage, chatSendMessage } from "../chat.functions";
import { CHAT_EMOJIS, type PrivateContact } from "../private-chat";
import { uploadPrivateAttachment } from "../private-chat-upload";
import {
  privateContacts,
  privateDeleteMessage,
  privateSendMessage,
  privateThread,
} from "../private-chat.functions";

type OpenWindow = { classroomId: string };

function attachmentMedia(a: ChatAttachment): MediaItem {
  const kind =
    a.kind === "image" ? "image" : a.kind === "video" ? "video" : a.kind === "link" ? "link" : "file";
  return { url: a.url ?? null, kind, name: a.name ?? null };
}

function KindIcon({ kind }: { kind: string }) {
  if (kind === "image") return <ImageIcon className="size-4" />;
  if (kind === "video") return <Video className="size-4" />;
  return <FileText className="size-4" />;
}

/** Shared composer used by both the group tab and the private tab. */
function Composer({
  value,
  onChange,
  onSend,
  onPickFiles,
  uploading,
  sending,
  attachmentLabel,
  onClearAttachment,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  onSend: () => void;
  onPickFiles: (files: FileList | null) => void;
  uploading: boolean;
  sending: boolean;
  attachmentLabel: string | null;
  onClearAttachment: () => void;
  disabled?: boolean;
  placeholder: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [emojisOpen, setEmojisOpen] = useState(false);

  return (
    <div className="border-t border-border/60 bg-background p-2">
      {attachmentLabel ? (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-muted px-2 py-1 text-[11px] font-bold">
          <Paperclip className="size-3" />
          <span className="min-w-0 flex-1 truncate">{attachmentLabel}</span>
          <button type="button" onClick={onClearAttachment} aria-label="إزالة المرفق">
            <X className="size-3" />
          </button>
        </div>
      ) : null}

      {emojisOpen ? (
        <div className="mb-2 flex flex-wrap gap-1 rounded-lg border border-border/60 bg-card p-2">
          {CHAT_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="rounded px-1 text-lg leading-none hover:bg-muted"
              onClick={() => onChange(`${value}${emoji}`)}
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex items-end gap-1.5">
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
          className="hidden"
          onChange={(e) => onPickFiles(e.target.files)}
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8 shrink-0"
          disabled={disabled || uploading}
          onClick={() => fileRef.current?.click()}
          aria-label="إرفاق ملف"
        >
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8 shrink-0"
          disabled={disabled}
          onClick={() => setEmojisOpen((v) => !v)}
          aria-label="الرموز التعبيرية"
        >
          <Smile className="size-4" />
        </Button>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          rows={1}
          disabled={disabled}
          placeholder={placeholder}
          className="max-h-24 min-h-9 flex-1 resize-none py-2 text-xs"
        />
        <Button
          type="button"
          size="icon"
          className="size-8 shrink-0"
          disabled={disabled || sending || (!value.trim() && !attachmentLabel)}
          onClick={onSend}
          aria-label="إرسال"
        >
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </div>
    </div>
  );
}

function GroupTab({
  classroomId,
  onOpenMedia,
}: {
  classroomId: string;
  onOpenMedia: (item: MediaItem) => void;
}) {
  const queryClient = useQueryClient();
  const loadBoard = useServerFn(chatBoard);
  const sendFn = useServerFn(chatSendMessage);
  const deleteFn = useServerFn(chatDeleteMessage);

  const [body, setBody] = useState("");
  const [pending, setPending] = useState<ChatAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  const board = useQuery({
    queryKey: ["chat-dock-group", classroomId],
    queryFn: () => loadBoard({ data: { classroomId } }),
  });

  const messages = board.data?.messages ?? [];

  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    const channel = supabase
      .channel(`chat-dock-group:${classroomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "classroom_messages",
          filter: `classroom_id=eq.${classroomId}`,
        },
        () => queryClient.invalidateQueries({ queryKey: ["chat-dock-group", classroomId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [classroomId, queryClient]);

  const send = useMutation({
    mutationFn: () =>
      sendFn({ data: { classroomId, body, parentMessageId: null, attachments: pending } }),
    onSuccess: () => {
      setBody("");
      setPending([]);
      void queryClient.invalidateQueries({ queryKey: ["chat-dock-group", classroomId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chat-dock-group", classroomId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  async function onPickFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      setPending([await uploadChatAttachment(file, classroomId)]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <ScrollArea className="h-64 flex-1">
        <div ref={feedRef} className="flex flex-col gap-2 p-3">
          {board.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-4 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <p className="py-8 text-center text-[11px] font-bold text-muted-foreground">
              لا توجد رسائل بعد — ابدأ المحادثة مع الفصل.
            </p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={cn("flex max-w-[88%] gap-2", m.mine ? "ms-auto flex-row-reverse" : "me-auto")}
              >
                <UserAvatar
                  name={m.senderName}
                  src={m.senderAvatarUrl}
                  className="size-7 shrink-0"
                  fallbackClassName="text-[10px]"
                />
                <div
                  className={cn(
                    "rounded-2xl px-2.5 py-1.5 text-xs shadow-sm",
                    m.mine ? "bg-primary text-primary-foreground" : "bg-muted",
                  )}
                >
                  <div className="mb-0.5 flex items-center gap-1.5 text-[10px] opacity-80">
                    <span className="font-black">{m.senderName ?? "مستخدم"}</span>
                    <span>{CHAT_ROLE_LABELS[m.senderRole] ?? m.senderRole}</span>
                    <span>{formatChatTime(m.createdAt)}</span>
                  </div>
                  {m.deleted ? (
                    <p className="italic opacity-70">تم حذف هذه الرسالة</p>
                  ) : (
                    <>
                      {m.body ? <p className="whitespace-pre-wrap break-words">{m.body}</p> : null}
                      {m.attachments.map((a, i) => (
                        <button
                          key={`${m.id}-${i}`}
                          type="button"
                          onClick={() => onOpenMedia(attachmentMedia(a))}
                          className="mt-1 flex w-full items-center gap-1.5 rounded-lg bg-background/30 px-2 py-1 text-start text-[11px] font-bold"
                        >
                          <KindIcon kind={a.kind} />
                          <span className="min-w-0 flex-1 truncate">{a.name ?? "مرفق"}</span>
                        </button>
                      ))}
                    </>
                  )}
                  {!m.deleted && (m.mine || board.data?.role === "staff") ? (
                    <button
                      type="button"
                      className="mt-0.5 text-[10px] opacity-70 hover:opacity-100"
                      onClick={() => remove.mutate(m.id)}
                    >
                      <Trash2 className="size-3" />
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <Composer
        value={body}
        onChange={setBody}
        onSend={() => {
          if (body.trim() || pending.length) send.mutate();
        }}
        onPickFiles={onPickFiles}
        uploading={uploading}
        sending={send.isPending}
        attachmentLabel={pending[0]?.name ?? null}
        onClearAttachment={() => setPending([])}
        placeholder="اكتب رسالتك للفصل…"
      />
    </>
  );
}

function PrivateTab({
  classroomId,
  onOpenMedia,
}: {
  classroomId: string;
  onOpenMedia: (item: MediaItem) => void;
}) {
  const queryClient = useQueryClient();
  const loadContacts = useServerFn(privateContacts);
  const loadThread = useServerFn(privateThread);
  const sendFn = useServerFn(privateSendMessage);
  const deleteFn = useServerFn(privateDeleteMessage);

  const [peer, setPeer] = useState<{ peerId: string; chatId: string | null } | null>(null);
  const [text, setText] = useState("");
  const [pending, setPending] = useState<{ path: string; kind: "image" | "video" | "file"; name: string } | null>(
    null,
  );
  const [uploading, setUploading] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  const contacts = useQuery({
    queryKey: ["chat-dock-contacts", classroomId],
    queryFn: () => loadContacts({ data: { classroomId } }),
  });

  const thread = useQuery({
    queryKey: ["chat-dock-thread", classroomId, peer?.peerId, peer?.chatId],
    queryFn: () =>
      loadThread({
        data: { classroomId, peerId: peer?.peerId ?? null, chatId: peer?.chatId ?? null },
      }),
    enabled: Boolean(peer),
  });

  const chatId = thread.data?.chatId ?? null;
  const messages = thread.data?.messages ?? [];

  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    if (!chatId) return;
    const channel = supabase
      .channel(`chat-dock-private:${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "private_messages",
          filter: `chat_id=eq.${chatId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["chat-dock-thread"] });
          void queryClient.invalidateQueries({ queryKey: ["chat-dock-contacts", classroomId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, classroomId, queryClient]);

  const send = useMutation({
    mutationFn: () =>
      sendFn({
        data: {
          chatId: chatId!,
          text,
          attachmentUrl: pending?.path ?? null,
          attachmentType: pending?.kind ?? null,
          attachmentName: pending?.name ?? null,
        },
      }),
    onSuccess: () => {
      setText("");
      setPending(null);
      void queryClient.invalidateQueries({ queryKey: ["chat-dock-thread"] });
      void queryClient.invalidateQueries({ queryKey: ["chat-dock-contacts", classroomId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chat-dock-thread"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  async function onPickFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file || !chatId) return;
    setUploading(true);
    try {
      setPending(await uploadPrivateAttachment(file, chatId));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  if (!peer) {
    const list = contacts.data?.contacts ?? [];
    return (
      <div className="flex h-[19.5rem] flex-col">
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-1 p-2">
            {contacts.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-4 animate-spin text-primary" />
              </div>
            ) : list.length === 0 ? (
              <p className="py-8 text-center text-[11px] font-bold text-muted-foreground">
                لا توجد جهات متاحة للمحادثة الخاصة في هذا الفصل.
              </p>
            ) : (
              list.map((contact: PrivateContact) => (
                <button
                  key={contact.peerId}
                  type="button"
                  onClick={() => setPeer({ peerId: contact.peerId, chatId: contact.chatId })}
                  className="flex items-center gap-2 rounded-xl p-2 text-start transition hover:bg-muted"
                >
                  <UserAvatar
                    name={contact.name}
                    src={contact.avatarUrl}
                    className="size-8 shrink-0"
                    fallbackClassName="text-[11px]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-black">{contact.name}</span>
                    <span className="block truncate text-[10px] font-bold text-muted-foreground">
                      {contact.lastPreview || contact.subtitle || "—"}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
        {contacts.data?.readOnly ? (
          <p className="border-t border-border/60 p-2 text-center text-[10px] font-bold text-muted-foreground">
            الإدارة تطّلع على المحادثات الخاصة للرقابة فقط.
          </p>
        ) : null}
      </div>
    );
  }

  const readOnly = thread.data?.readOnly ?? false;

  return (
    <>
      <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-2 py-1.5">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7"
          onClick={() => setPeer(null)}
          aria-label="رجوع"
        >
          <ChevronLeft className="size-4 rtl:rotate-180" />
        </Button>
        <UserAvatar
          name={thread.data?.peerName}
          src={thread.data?.peerAvatarUrl}
          className="size-7"
          fallbackClassName="text-[10px]"
        />
        <span className="truncate text-xs font-black">{thread.data?.peerName ?? "…"}</span>
      </div>

      <ScrollArea className="h-56 flex-1">
        <div ref={feedRef} className="flex flex-col gap-2 p-3">
          {thread.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-4 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <p className="py-8 text-center text-[11px] font-bold text-muted-foreground">
              ابدأ محادثة خاصة — الرسائل مرئية لكما فقط (مع حق الإدارة في الرقابة).
            </p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={cn("flex max-w-[88%]", m.mine ? "ms-auto justify-end" : "me-auto")}
              >
                <div
                  className={cn(
                    "rounded-2xl px-2.5 py-1.5 text-xs shadow-sm",
                    m.mine ? "bg-primary text-primary-foreground" : "bg-muted",
                  )}
                >
                  <div className="mb-0.5 text-[10px] opacity-80">{formatChatTime(m.createdAt)}</div>
                  {m.deleted ? (
                    <p className="italic opacity-70">تم حذف هذه الرسالة</p>
                  ) : (
                    <>
                      {m.text ? <p className="whitespace-pre-wrap break-words">{m.text}</p> : null}
                      {m.attachmentUrl ? (
                        <button
                          type="button"
                          onClick={() =>
                            onOpenMedia({
                              url: m.attachmentUrl,
                              kind: m.attachmentType === "image" ? "image" : m.attachmentType === "video" ? "video" : "file",
                              name: m.attachmentName,
                            })
                          }
                          className="mt-1 flex w-full items-center gap-1.5 rounded-lg bg-background/30 px-2 py-1 text-start text-[11px] font-bold"
                        >
                          <KindIcon kind={m.attachmentType ?? "file"} />
                          <span className="min-w-0 flex-1 truncate">{m.attachmentName ?? "مرفق"}</span>
                        </button>
                      ) : null}
                    </>
                  )}
                  {!m.deleted && (m.mine || readOnly) ? (
                    <button
                      type="button"
                      className="mt-0.5 text-[10px] opacity-70 hover:opacity-100"
                      onClick={() => remove.mutate(m.id)}
                    >
                      <Trash2 className="size-3" />
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <Composer
        value={text}
        onChange={setText}
        onSend={() => {
          if (chatId && (text.trim() || pending)) send.mutate();
        }}
        onPickFiles={onPickFiles}
        uploading={uploading}
        sending={send.isPending}
        attachmentLabel={pending?.name ?? null}
        onClearAttachment={() => setPending(null)}
        disabled={readOnly || !chatId}
        placeholder={readOnly ? "عرض فقط" : "اكتب رسالة خاصة…"}
      />
    </>
  );
}

function ChatWindow({
  room,
  onClose,
  onOpenMedia,
}: {
  room: ChatRoom;
  onClose: () => void;
  onOpenMedia: (item: MediaItem) => void;
}) {
  const [tab, setTab] = useState<"group" | "private">("group");

  return (
    <div className="pointer-events-auto flex w-[19rem] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl">
      <div
        className="flex items-center gap-2 px-3 py-2 text-white"
        style={{ backgroundColor: room.colorHex }}
      >
        <MessagesSquare className="size-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-black">
            {room.childName ? `${room.childName} — ${room.classroomName}` : room.classroomName}
          </p>
          <p className="truncate text-[10px] opacity-90">{room.stageName ?? "—"}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="إغلاق المحادثة">
          <X className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 border-b border-border/60 bg-muted/40 text-[11px] font-black">
        <button
          type="button"
          onClick={() => setTab("group")}
          className={cn(
            "flex items-center justify-center gap-1 py-2 transition",
            tab === "group" ? "bg-card text-primary" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Users className="size-3.5" /> الشات الجماعي
        </button>
        <button
          type="button"
          onClick={() => setTab("private")}
          className={cn(
            "flex items-center justify-center gap-1 py-2 transition",
            tab === "private" ? "bg-card text-primary" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <MessagesSquare className="size-3.5" /> الرسائل الخاصة
        </button>
      </div>

      {tab === "group" ? (
        <GroupTab classroomId={room.classroomId} onOpenMedia={onOpenMedia} />
      ) : (
        <PrivateTab classroomId={room.classroomId} onOpenMedia={onOpenMedia} />
      )}
    </div>
  );
}

export function FloatingChatDock() {
  const loadBoard = useServerFn(chatBoard);
  const { can, loading } = usePermissions();

  const [open, setOpen] = useState<OpenWindow[]>([]);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const [media, setMedia] = useState<MediaItem | null>(null);

  const rooms = useQuery({
    queryKey: ["chat-dock-rooms"],
    queryFn: () => loadBoard({ data: { classroomId: null } }),
    staleTime: 60_000,
  });

  const list = useMemo<ChatRoom[]>(() => rooms.data?.rooms ?? [], [rooms.data]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: offset.x, baseY: offset.y };
    },
    [offset],
  );

  useEffect(() => {
    function move(e: PointerEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      setOffset({
        x: drag.baseX + (e.clientX - drag.startX),
        y: drag.baseY + (e.clientY - drag.startY),
      });
    }
    function up() {
      dragRef.current = null;
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  if (loading || !can("class_chat.view") || !list.length) return null;

  function toggle(classroomId: string) {
    setOpen((prev) =>
      prev.some((w) => w.classroomId === classroomId)
        ? prev.filter((w) => w.classroomId !== classroomId)
        : [...prev, { classroomId }].slice(-3),
    );
  }

  return (
    <>
      <div
        className="no-print pointer-events-none fixed bottom-4 start-4 z-50 flex items-end gap-3"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
        dir="rtl"
      >
        <div className="pointer-events-auto flex flex-col items-center gap-2">
          <button
            type="button"
            onPointerDown={onPointerDown}
            className="grid size-7 cursor-grab place-items-center rounded-full border border-border/60 bg-card text-muted-foreground shadow-md active:cursor-grabbing"
            aria-label="تحريك لوحة المحادثات"
            title="اسحب لتحريك المحادثات"
          >
            <GripVertical className="size-3.5" />
          </button>

          {list.map((room) => {
            const active = open.some((w) => w.classroomId === room.classroomId);
            return (
              <button
                key={`${room.classroomId}-${room.childName ?? ""}`}
                type="button"
                onClick={() => toggle(room.classroomId)}
                title={
                  room.childName
                    ? `${room.childName} — ${room.classroomName}`
                    : room.classroomName
                }
                className={cn(
                  "grid size-12 place-items-center rounded-full text-white shadow-xl ring-offset-2 transition hover:scale-105",
                  active ? "ring-2 ring-primary ring-offset-background" : "",
                )}
                style={{ backgroundColor: room.colorHex }}
              >
                <span className="text-xs font-black drop-shadow">
                  {(room.childName ?? room.classroomName).trim().slice(0, 2)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-row-reverse items-end gap-3">
          {open.map((w) => {
            const room = list.find((r) => r.classroomId === w.classroomId);
            if (!room) return null;
            return (
              <ChatWindow
                key={w.classroomId}
                room={room}
                onClose={() => toggle(w.classroomId)}
                onOpenMedia={setMedia}
              />
            );
          })}
        </div>
      </div>

      <MediaViewerDialog item={media} onClose={() => setMedia(null)} />
    </>
  );
}

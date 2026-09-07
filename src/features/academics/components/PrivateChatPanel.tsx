/**
 * Private 1-on-1 messages inside one classroom.
 *
 * Contacts on the side, the open conversation beside them. Access is decided by
 * the database: a parent only reaches teachers of her child's classroom, a
 * teacher only parents of children in her classrooms, and administration views
 * conversations read-only for oversight.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  FileText,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  Send,
  Smile,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { MediaViewerDialog, type MediaItem } from "@/components/media/MediaViewerDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/ui/user-avatar";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

import { formatChatTime } from "../chat";
import { CHAT_EMOJIS, type PrivateContact } from "../private-chat";
import { uploadPrivateAttachment } from "../private-chat-upload";
import {
  privateContacts,
  privateDeleteMessage,
  privateSendMessage,
  privateThread,
} from "../private-chat.functions";

function KindIcon({ kind }: { kind: string }) {
  if (kind === "image") return <ImageIcon className="size-4" />;
  if (kind === "video") return <Video className="size-4" />;
  return <FileText className="size-4" />;
}

const SEEN_KEY = "private-chat-seen";

function readSeen(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

function markSeen(chatId: string, at: string | null) {
  const seen = readSeen();
  seen[chatId] = at ?? new Date().toISOString();
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch {
    /* storage unavailable */
  }
}

export function PrivateChatPanel({
  classroomId,
  embedded = false,
  autoSelectFirst = false,
  initialChildId = null,
  onUnreadChange,
}: {
  classroomId: string;
  embedded?: boolean;
  autoSelectFirst?: boolean;
  /** Opens straight into the guardian of this child (teacher view). */
  initialChildId?: string | null;
  onUnreadChange?: (count: number) => void;
}) {
  const queryClient = useQueryClient();
  const loadContacts = useServerFn(privateContacts);
  const loadThread = useServerFn(privateThread);
  const sendFn = useServerFn(privateSendMessage);
  const deleteFn = useServerFn(privateDeleteMessage);

  const [peer, setPeer] = useState<{ peerId: string; chatId: string | null } | null>(null);
  const [text, setText] = useState("");
  const [pending, setPending] = useState<
    { path: string; kind: "image" | "video" | "file"; name: string } | null
  >(null);
  const [uploading, setUploading] = useState(false);
  const [emojisOpen, setEmojisOpen] = useState(false);
  const [media, setMedia] = useState<MediaItem | null>(null);
  const [seen, setSeen] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSeen(readSeen());
  }, []);

  useEffect(() => {
    setPeer(null);
  }, [classroomId]);


  const contacts = useQuery({
    queryKey: ["private-chat-contacts", classroomId],
    queryFn: () => loadContacts({ data: { classroomId } }),
  });

  const thread = useQuery({
    queryKey: ["private-chat-thread", classroomId, peer?.peerId, peer?.chatId],
    queryFn: () =>
      loadThread({
        data: { classroomId, peerId: peer?.peerId ?? null, chatId: peer?.chatId ?? null },
      }),
    enabled: Boolean(peer),
  });

  const chatId = thread.data?.chatId ?? null;
  const messages = thread.data?.messages ?? [];
  const readOnly = thread.data?.readOnly ?? false;

  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, chatId]);

  useEffect(() => {
    if (!chatId) return;
    const channel = supabase
      .channel(`private-chat:${chatId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "private_messages", filter: `chat_id=eq.${chatId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["private-chat-thread"] });
          void queryClient.invalidateQueries({ queryKey: ["private-chat-contacts", classroomId] });
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
      void queryClient.invalidateQueries({ queryKey: ["private-chat-thread"] });
      void queryClient.invalidateQueries({ queryKey: ["private-chat-contacts", classroomId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["private-chat-thread"] }),
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
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const list = contacts.data?.contacts ?? [];

  const unreadFor = (contact: PrivateContact) => {
    if (!contact.chatId || !contact.lastMessageAt) return false;
    if (peer?.peerId === contact.peerId) return false;
    const at = seen[contact.chatId];
    return !at || contact.lastMessageAt > at;
  };
  const unreadCount = list.filter(unreadFor).length;

  useEffect(() => {
    onUnreadChange?.(unreadCount);
  }, [unreadCount, onUnreadChange]);

  // Opening a conversation clears its badge.
  useEffect(() => {
    if (!chatId) return;
    const at = list.find((c) => c.chatId === chatId)?.lastMessageAt ?? null;
    markSeen(chatId, at);
    setSeen(readSeen());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, messages.length]);

  // "شات فردي" jumps straight into the guardian of a chosen child, else the first contact.
  useEffect(() => {
    if (peer || !list.length) return;
    if (initialChildId) {
      const match = list.find((c) => (c.childIds ?? []).includes(initialChildId));
      if (match) {
        setPeer({ peerId: match.peerId, chatId: match.chatId });
        return;
      }
    }
    if (!autoSelectFirst) return;
    const first = list[0]!;
    setPeer({ peerId: first.peerId, chatId: first.chatId });
  }, [autoSelectFirst, initialChildId, peer, list]);

  return (
    <div
      className={cn(
        "grid gap-3",
        embedded ? "h-full grid-cols-[220px_1fr]" : "gap-4 lg:grid-cols-[260px_1fr]",
      )}
    >
      <Card className={cn("p-3", embedded ? "min-h-0 overflow-y-auto" : "h-fit lg:sticky lg:top-24")}>
        <p className="px-1 pb-2 text-xs font-semibold text-muted-foreground">
          جهات المحادثة الخاصة
        </p>
        {contacts.isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-4 animate-spin text-primary" />
          </div>
        ) : list.length === 0 ? (
          <p className="px-1 py-6 text-xs leading-relaxed text-muted-foreground">
            لا توجد جهات متاحة للمحادثة الخاصة في هذا الفصل.
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {list.map((contact: PrivateContact) => (
              <button
                key={contact.peerId}
                type="button"
                onClick={() => setPeer({ peerId: contact.peerId, chatId: contact.chatId })}
                className={cn(
                  "flex items-center gap-2 rounded-xl border p-2 text-start transition",
                  peer?.peerId === contact.peerId
                    ? "border-primary/50 bg-primary/10"
                    : "border-transparent hover:bg-muted/60",
                )}
              >
                <UserAvatar
                  name={contact.name}
                  src={contact.avatarUrl}
                  className="size-9 shrink-0"
                  fallbackClassName="text-xs"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{contact.name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {contact.lastPreview || contact.subtitle || "—"}
                  </span>
                </span>
                {unreadFor(contact) ? (
                  <span
                    className="size-2.5 shrink-0 rounded-full bg-destructive"
                    aria-label="رسائل جديدة"
                  />
                ) : null}
              </button>
            ))}
          </div>
        )}
        {contacts.data?.readOnly ? (
          <p className="mt-2 rounded-xl bg-muted px-2 py-2 text-[11px] font-semibold text-muted-foreground">
            الإدارة تطّلع على المحادثات الخاصة للرقابة فقط.
          </p>
        ) : null}
      </Card>

      <Card
        className={cn("flex flex-col overflow-hidden", embedded ? "min-h-0 h-full" : "h-[70vh]")}
      >

        {!peer ? (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
            اختر جهة من القائمة لبدء محادثة خاصة.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-border/60 bg-muted/30 px-4 py-3">
              <UserAvatar
                name={thread.data?.peerName}
                src={thread.data?.peerAvatarUrl}
                className="size-9"
                fallbackClassName="text-xs"
              />
              <p className="truncate text-sm font-bold">{thread.data?.peerName ?? "…"}</p>
            </div>

            <ScrollArea className="flex-1">
              <div ref={feedRef} className="flex flex-col gap-3 p-4">
                {thread.isLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="size-5 animate-spin text-primary" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    ابدأ محادثة خاصة — الرسائل مرئية لكما فقط (مع حق الإدارة في الرقابة).
                  </p>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn("flex max-w-[80%]", m.mine ? "ms-auto justify-end" : "me-auto")}
                    >
                      <div
                        className={cn(
                          "rounded-2xl px-3 py-2 text-sm shadow-sm",
                          m.mine ? "bg-primary text-primary-foreground" : "bg-muted",
                        )}
                      >
                        <div className="mb-1 text-[11px] opacity-80">
                          {formatChatTime(m.createdAt)}
                        </div>
                        {m.deleted ? (
                          <p className="italic opacity-70">تم حذف هذه الرسالة</p>
                        ) : (
                          <>
                            {m.text ? (
                              <p className="whitespace-pre-wrap break-words">{m.text}</p>
                            ) : null}
                            {m.attachmentUrl ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setMedia({
                                    url: m.attachmentUrl,
                                    kind:
                                      m.attachmentType === "image"
                                        ? "image"
                                        : m.attachmentType === "video"
                                          ? "video"
                                          : "file",
                                    name: m.attachmentName,
                                  })
                                }
                                className="mt-2 flex w-full items-center gap-2 rounded-lg bg-background/30 px-2 py-1.5 text-start text-xs font-bold"
                              >
                                <KindIcon kind={m.attachmentType ?? "file"} />
                                <span className="min-w-0 flex-1 truncate">
                                  {m.attachmentName ?? "مرفق"}
                                </span>
                              </button>
                            ) : null}
                          </>
                        )}
                        {!m.deleted && (m.mine || readOnly) ? (
                          <button
                            type="button"
                            className="mt-1 opacity-70 hover:opacity-100"
                            onClick={() => remove.mutate(m.id)}
                            aria-label="حذف الرسالة"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="border-t border-border/60 bg-background p-3">
              {pending ? (
                <div className="mb-2 flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs font-bold">
                  <Paperclip className="size-3" />
                  <span className="min-w-0 flex-1 truncate">{pending.name}</span>
                  <button type="button" onClick={() => setPending(null)} aria-label="إزالة المرفق">
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
                      onClick={() => setText((prev) => `${prev}${emoji}`)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="flex items-end gap-2">
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
                  variant="outline"
                  disabled={readOnly || uploading || !chatId}
                  onClick={() => fileRef.current?.click()}
                  aria-label="إرفاق ملف"
                >
                  {uploading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Paperclip className="size-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  disabled={readOnly}
                  onClick={() => setEmojisOpen((v) => !v)}
                  aria-label="الرموز التعبيرية"
                >
                  <Smile className="size-4" />
                </Button>
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (chatId && !readOnly && (text.trim() || pending)) send.mutate();
                    }
                  }}
                  rows={1}
                  disabled={readOnly || !chatId}
                  placeholder={readOnly ? "عرض فقط" : "اكتب رسالة خاصة… (Shift + Enter لسطر جديد)"}
                  className="max-h-32 min-h-11 flex-1 resize-none"
                />
                <Button
                  type="button"
                  size="icon"
                  disabled={readOnly || !chatId || send.isPending || (!text.trim() && !pending)}
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
          </>
        )}
      </Card>

      <MediaViewerDialog item={media} onClose={() => setMedia(null)} />
    </div>
  );
}

/**
 * Class Chat — client-safe types and helpers.
 *
 * One chat room per classroom. Access is decided by the database (RLS):
 * staff reach every room, a teacher only her assigned classrooms, and a parent
 * only the classrooms her children are enrolled in.
 */
export const CHAT_BUCKET = "classroom-media";

export type ChatAttachmentKind = "image" | "video" | "file" | "link";

export const CHAT_LIMITS_MB: Record<Exclude<ChatAttachmentKind, "link">, number> = {
  image: 8,
  video: 40,
  file: 15,
};

export type ChatAttachment = {
  kind: ChatAttachmentKind;
  path?: string | null;
  url?: string | null;
  name?: string | null;
  size?: number | null;
};

export type ChatMessage = {
  id: string;
  classroomId: string;
  parentMessageId: string | null;
  senderId: string;
  senderName: string | null;
  senderAvatarUrl: string | null;
  senderRole: string;
  body: string;
  attachments: ChatAttachment[];
  createdAt: string;
  deleted: boolean;
  mine: boolean;
};

export type ChatRoom = {
  classroomId: string;
  classroomName: string;
  stageName: string | null;
  colorHex: string;
  /** Child name for the parent view ("أحمد — الفصل الأصفر"). */
  childName: string | null;
  teacherNames: string[];
};

export type ChatBoard = {
  role: "staff" | "teacher" | "parent";
  rooms: ChatRoom[];
  activeRoomId: string | null;
  messages: ChatMessage[];
};

export const CHAT_ROLE_LABELS: Record<string, string> = {
  staff: "الإدارة",
  teacher: "المعلمة",
  parent: "ولي أمر",
};

export function chatAttachmentKind(file: File): Exclude<ChatAttachmentKind, "link"> | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type === "application/pdf" || /\.(pdf|docx?|xlsx?|pptx?)$/i.test(file.name)) return "file";
  return null;
}

export function formatChatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ar-SA", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

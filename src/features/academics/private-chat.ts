/**
 * Private 1-on-1 chats (teacher ⇄ parent) — client-safe types and helpers.
 *
 * A private chat always lives inside one classroom: a parent may only talk to a
 * teacher assigned to her child's classroom, and a teacher only to parents of
 * children enrolled in her classrooms. The database enforces both directions.
 */
export const PRIVATE_CHAT_FOLDER = "private";

export type PrivateAttachmentKind = "image" | "video" | "file";

export type PrivateContact = {
  /** The other side of the conversation (teacher id for parents, parent id for teachers). */
  peerId: string;
  name: string;
  avatarUrl: string | null;
  /** "معلمة الفصل" or "والد أحمد / والدة سارة". */
  subtitle: string | null;
  chatId: string | null;
  lastMessageAt: string | null;
  lastPreview: string | null;
};

export type PrivateContactList = {
  role: "staff" | "teacher" | "parent";
  /** Staff open private chats read-only for moderation. */
  readOnly: boolean;
  contacts: PrivateContact[];
};

export type PrivateMessage = {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string | null;
  senderAvatarUrl: string | null;
  text: string;
  attachmentUrl: string | null;
  attachmentType: PrivateAttachmentKind | null;
  attachmentName: string | null;
  createdAt: string;
  deleted: boolean;
  mine: boolean;
};

export type PrivateThread = {
  chatId: string;
  peerId: string;
  peerName: string;
  peerAvatarUrl: string | null;
  readOnly: boolean;
  messages: PrivateMessage[];
};

export const PRIVATE_LIMITS_MB: Record<PrivateAttachmentKind, number> = {
  image: 8,
  video: 30,
  file: 15,
};

export function privateAttachmentKind(file: File): PrivateAttachmentKind | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type === "application/pdf" || /\.(pdf|docx?|xlsx?|pptx?)$/i.test(file.name)) return "file";
  return null;
}

/** Emojis offered by the quick picker in the chat composer. */
export const CHAT_EMOJIS = [
  "😊",
  "🌟",
  "👏",
  "❤️",
  "🌸",
  "🎉",
  "📚",
  "✅",
  "🙏",
  "😍",
  "🤍",
  "🥳",
  "😅",
  "💡",
  "⏰",
  "📎",
];

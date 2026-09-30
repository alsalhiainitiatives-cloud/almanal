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
  /** Stable identity of the row: the child for teachers, the teacher for parents. */
  key: string;
  /** The other side of the conversation — null when the child has no guardian account yet. */
  peerId: string | null;
  /** The child this conversation is about (teacher view). */
  childId: string | null;
  name: string;
  avatarUrl: string | null;
  /** "معلمة الفصل" or "ولي الأمر: …" / "لم يُربط ولي الأمر بعد". */
  subtitle: string | null;
  /** Children linking this contact to the classroom (teacher view). */
  childIds: string[];
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
  /** Null when staff open a child with no conversation started yet. */
  chatId: string | null;

  peerId: string | null;
  peerName: string;
  peerAvatarUrl: string | null;
  /** True when the child's guardian has not been linked yet. */
  awaitingGuardian: boolean;
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

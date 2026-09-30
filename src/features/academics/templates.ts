/** Ready-made chat message templates — client-safe types. */
export type MessageTemplate = {
  id: string;
  title: string;
  body: string;
  /** null = قالب عام لكل الفصول. */
  classroomId: string | null;
  /** The caller wrote it, so she may edit or delete it. */
  mine: boolean;
};

/**
 * Client-safe helpers for the Qurra initiative follow-up board.
 *
 * Qurra pays the tuition of covered children directly to the kindergarten on a
 * monthly basis, so finance tracks — per child and per month — the amount due,
 * the amount actually transferred by Qurra, and a confirmation tick.
 */

/** School year order: August → July. */
export const QURRA_MONTHS: { month: number; label: string }[] = [
  { month: 8, label: "أغسطس" },
  { month: 9, label: "سبتمبر" },
  { month: 10, label: "أكتوبر" },
  { month: 11, label: "نوفمبر" },
  { month: 12, label: "ديسمبر" },
  { month: 1, label: "يناير" },
  { month: 2, label: "فبراير" },
  { month: 3, label: "مارس" },
  { month: 4, label: "أبريل" },
  { month: 5, label: "مايو" },
  { month: 6, label: "يونيو" },
  { month: 7, label: "يوليو" },
];

export type QurraCell = {
  month: number;
  dueAmount: number;
  transferredAmount: number;
  confirmed: boolean;
  confirmedAt: string | null;
  note: string | null;
};

export type QurraStudentRow = {
  childId: string;
  name: string;
  academicNumber: string | null;
  stageName: string | null;
  classroomName: string | null;
  parentName: string | null;
  monthlyFee: number;
  cells: Record<number, QurraCell>;
  /** Entered once per child for the whole school year. */
  annualDue: number;
  totalDue: number;
  totalTransferred: number;
  totalConfirmed: number;
  /** Annual due minus everything Qurra transferred so far. */
  remaining: number;
};

export type QurraBoard = {
  academicYear: string;
  academicYears: string[];
  rows: QurraStudentRow[];
  totals: { due: number; transferred: number; confirmed: number; students: number; remaining: number };
};

export function emptyCell(month: number): QurraCell {
  return { month, dueAmount: 0, transferredAmount: 0, confirmed: false, confirmedAt: null, note: null };
}

import { Lock, LockOpen } from "lucide-react";

import type { ClassroomLock } from "@/features/ams/classroom-lock";

function remaining(lock: ClassroomLock) {
  const seconds = Math.max(0, Math.round((new Date(lock.expires_at).getTime() - Date.now()) / 1000));
  return `${seconds}ث`;
}

/** Shows who is currently editing a classroom, or that the user holds the lock. */
export function ClassroomLockBadge({ lock, mine }: { lock: ClassroomLock | null; mine?: boolean }) {
  if (mine) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
        <LockOpen className="size-3" /> أنت تُحرّر هذا الفصل
      </span>
    );
  }
  if (!lock) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-bold text-destructive">
      <Lock className="size-3" /> قيد التعديل: {lock.user_name ?? "موظف آخر"} · {remaining(lock)}
    </span>
  );
}
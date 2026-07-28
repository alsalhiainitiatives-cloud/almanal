import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export type ClassroomLock = {
  classroom_id: string;
  user_id: string;
  user_name: string | null;
  acquired_at: string;
  expires_at: string;
};

/** Lock lifetime in seconds; renewed by a heartbeat at half this interval. */
export const LOCK_TTL_SECONDS = 60;

function isLive(lock: ClassroomLock) {
  return new Date(lock.expires_at).getTime() > Date.now();
}

/**
 * Live registry of classroom edit locks. Any staff screen can read it to show
 * "قيد التعديل بواسطة …" and to disable conflicting actions.
 */
export function useClassroomLocks() {
  const [locks, setLocks] = useState<Record<string, ClassroomLock>>({});
  const [myUserId, setMyUserId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.rpc("active_classroom_locks");
    if (error) return;
    const next: Record<string, ClassroomLock> = {};
    for (const row of (data ?? []) as ClassroomLock[]) {
      if (isLive(row)) next[row.classroom_id] = row;
    }
    setLocks(next);
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setMyUserId(data.user?.id ?? null);
    });
    void refresh();

    const channel = supabase
      .channel("classroom-locks")
      .on("postgres_changes", { event: "*", schema: "public", table: "classroom_locks" }, () => {
        void refresh();
      })
      .subscribe();

    // Expired locks free themselves silently; re-evaluate on a short timer.
    const timer = window.setInterval(() => {
      setLocks((current) => {
        const next = Object.fromEntries(Object.entries(current).filter(([, lock]) => isLive(lock)));
        return Object.keys(next).length === Object.keys(current).length ? current : next;
      });
    }, 5000);

    return () => {
      active = false;
      window.clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return useMemo(
    () => ({
      locks,
      myUserId,
      refresh,
      /** Lock held by someone else on this classroom, if any. */
      lockedBy: (classroomId: string | null | undefined): ClassroomLock | null => {
        if (!classroomId) return null;
        const lock = locks[classroomId];
        if (!lock || !isLive(lock) || lock.user_id === myUserId) return null;
        return lock;
      },
      isMine: (classroomId: string | null | undefined) =>
        Boolean(classroomId && locks[classroomId] && locks[classroomId].user_id === myUserId),
    }),
    [locks, myUserId, refresh],
  );
}

type AcquireResult =
  | { ok: true; lock: ClassroomLock }
  | { ok: false; lock: ClassroomLock | null; message: string };

/**
 * Claims an exclusive edit lock on one classroom at a time, keeps it alive with
 * a heartbeat, and releases it on unmount / tab close.
 */
export function useClassroomLock() {
  const [heldClassroomId, setHeldClassroomId] = useState<string | null>(null);
  const heldRef = useRef<string | null>(null);
  const beatRef = useRef<number | null>(null);

  const stopHeartbeat = useCallback(() => {
    if (beatRef.current !== null) {
      window.clearInterval(beatRef.current);
      beatRef.current = null;
    }
  }, []);

  const release = useCallback(async () => {
    const classroomId = heldRef.current;
    stopHeartbeat();
    heldRef.current = null;
    setHeldClassroomId(null);
    if (!classroomId) return;
    await supabase.rpc("release_classroom_lock", { _classroom_id: classroomId });
  }, [stopHeartbeat]);

  const acquire = useCallback(
    async (classroomId: string): Promise<AcquireResult> => {
      if (heldRef.current && heldRef.current !== classroomId) await release();

      const { data, error } = await supabase.rpc("acquire_classroom_lock", {
        _classroom_id: classroomId,
        _ttl_seconds: LOCK_TTL_SECONDS,
      });
      if (error) {
        return { ok: false, lock: null, message: "تعذّر الحصول على قفل التعديل لهذا الفصل." };
      }

      const row = (data as (ClassroomLock & { acquired: boolean })[] | null)?.[0] ?? null;
      if (!row || !row.acquired) {
        return {
          ok: false,
          lock: row,
          message: row
            ? `الفصل قيد التعديل حاليًا بواسطة ${row.user_name ?? "موظف آخر"} — انتظر حتى ينتهي أو يُحرَّر القفل تلقائيًا.`
            : "الفصل قيد التعديل بواسطة موظف آخر.",
        };
      }

      heldRef.current = classroomId;
      setHeldClassroomId(classroomId);
      stopHeartbeat();
      beatRef.current = window.setInterval(
        () => {
          if (!heldRef.current) return;
          void supabase.rpc("acquire_classroom_lock", {
            _classroom_id: heldRef.current,
            _ttl_seconds: LOCK_TTL_SECONDS,
          });
        },
        (LOCK_TTL_SECONDS / 2) * 1000,
      );

      return { ok: true, lock: row };
    },
    [release, stopHeartbeat],
  );

  /** Runs `action` only while holding the lock, then releases it. */
  const withLock = useCallback(
    async <T,>(
      classroomId: string,
      action: () => Promise<T>,
    ): Promise<{ ok: true; result: T } | { ok: false; message: string }> => {
      const claim = await acquire(classroomId);
      if (!claim.ok) return { ok: false, message: claim.message };
      try {
        return { ok: true, result: await action() };
      } finally {
        await release();
      }
    },
    [acquire, release],
  );

  useEffect(() => {
    const onUnload = () => {
      if (heldRef.current) {
        void supabase.rpc("release_classroom_lock", { _classroom_id: heldRef.current });
      }
    };
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      onUnload();
      stopHeartbeat();
    };
  }, [stopHeartbeat]);

  return { heldClassroomId, acquire, release, withLock };
}
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export const CLASSROOM_MEDIA_BUCKET = "classroom-media";

function extOf(name: string) {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase().slice(0, 8) : "bin";
}

/** Uploads a classroom media file and returns its storage path. */
export async function uploadClassroomMedia(file: File, folder: string): Promise<string> {
  const path = `${folder}/${crypto.randomUUID()}.${extOf(file.name)}`;
  const { error } = await supabase.storage
    .from(CLASSROOM_MEDIA_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type || undefined });
  if (error) throw new Error(error.message);
  return path;
}

const cache = new Map<string, string>();

/** Signs classroom media paths for display (private bucket, public read policy). */
export async function signClassroomMedia(paths: string[]): Promise<Record<string, string>> {
  const wanted = Array.from(new Set(paths.filter(Boolean)));
  const result: Record<string, string> = {};
  const missing: string[] = [];
  for (const p of wanted) {
    const hit = cache.get(p);
    if (hit) result[p] = hit;
    else missing.push(p);
  }
  if (missing.length) {
    const { data } = await supabase.storage
      .from(CLASSROOM_MEDIA_BUCKET)
      .createSignedUrls(missing, 60 * 60 * 24 * 7);
    for (const row of data ?? []) {
      if (row.path && row.signedUrl) {
        cache.set(row.path, row.signedUrl);
        result[row.path] = row.signedUrl;
      }
    }
  }
  return result;
}

/** React hook returning a map of storage path -> signed URL. */
export function useClassroomMediaUrls(paths: (string | null | undefined)[]) {
  const key = paths.filter(Boolean).join("|");
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    const list = key ? key.split("|") : [];
    if (!list.length) {
      setUrls({});
      return;
    }
    signClassroomMedia(list)
      .then((map) => {
        if (alive) setUrls(map);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [key]);

  return urls;
}

import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { DEFAULT_UPLOAD_SETTINGS, type UploadSettings } from "./upload-settings";
import { uploadSettingsGet } from "./upload-settings.functions";

export const UPLOAD_SETTINGS_QUERY_KEY = ["upload-settings"];

/** Reads the shared attachment policy (limits + compression) for the signed-in user. */
export function useUploadSettings(): UploadSettings {
  const load = useServerFn(uploadSettingsGet);
  const { data } = useQuery({
    queryKey: UPLOAD_SETTINGS_QUERY_KEY,
    queryFn: () => load(),
    staleTime: 5 * 60 * 1000,
  });
  return (data as UploadSettings | undefined) ?? DEFAULT_UPLOAD_SETTINGS;
}

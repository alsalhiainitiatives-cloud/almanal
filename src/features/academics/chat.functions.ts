import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const attachmentSchema = z.object({
  kind: z.enum(["image", "video", "file", "link"]),
  path: z.string().max(400).nullable().optional(),
  url: z.string().max(2000).nullable().optional(),
  name: z.string().max(300).nullable().optional(),
  size: z.number().nullable().optional(),
});

export const chatBoard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ classroomId: z.string().uuid().nullable().optional() }).parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { getChatBoard } = await import("./chat.server");
    return getChatBoard(context.supabase, context.userId, data);
  });

export const chatSendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        classroomId: z.string().uuid(),
        body: z.string().max(4000).default(""),
        parentMessageId: z.string().uuid().nullable().optional(),
        attachments: z.array(attachmentSchema).max(6).default([]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { sendChatMessage } = await import("./chat.server");
    return sendChatMessage(context.supabase, context.userId, data);
  });

export const chatDeleteMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { deleteChatMessage } = await import("./chat.server");
    return deleteChatMessage(context.supabase, context.userId, data.id);
  });

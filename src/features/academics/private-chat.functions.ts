import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const privateContacts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ classroomId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { listPrivateContacts } = await import("./private-chat.server");
    return listPrivateContacts(context.supabase, context.userId, data);
  });

export const privateThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        classroomId: z.string().uuid(),
        peerId: z.string().uuid().nullable().optional(),
        chatId: z.string().uuid().nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { openPrivateThread } = await import("./private-chat.server");
    return openPrivateThread(context.supabase, context.userId, data);
  });

export const privateSendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        chatId: z.string().uuid(),
        text: z.string().max(4000).default(""),
        attachmentUrl: z.string().max(600).nullable().optional(),
        attachmentType: z.enum(["image", "video", "file"]).nullable().optional(),
        attachmentName: z.string().max(300).nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { sendPrivateMessage } = await import("./private-chat.server");
    return sendPrivateMessage(context.supabase, context.userId, data);
  });

export const privateDeleteMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { deletePrivateMessage } = await import("./private-chat.server");
    return deletePrivateMessage(context.supabase, context.userId, data.id);
  });

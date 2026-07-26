import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(2, "الاسم قصير جدًا").max(100),
  phone: z.string().trim().min(8, "رقم الجوال غير صحيح").max(20),
  email: z.string().trim().email("البريد الإلكتروني غير صحيح").max(255).optional().or(z.literal("")),
  program: z.string().trim().max(60).optional().or(z.literal("")),
  subject: z.string().trim().max(120).optional().or(z.literal("")),
  message: z.string().trim().min(10, "الرسالة قصيرة جدًا").max(1500),
});

export type ContactInput = z.infer<typeof contactSchema>;

export const submitContactMessage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => contactSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("contact_messages").insert({
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      program: data.program || null,
      subject: data.subject || null,
      message: data.message,
    });

    if (error) {
      console.error("contact_messages insert failed", error);
      throw new Error("تعذّر إرسال الرسالة، يرجى المحاولة لاحقًا.");
    }

    return { ok: true as const };
  });

/** Shared validation schemas (client-safe). */
import { z } from "zod";

export const identifierSchema = z
  .string()
  .trim()
  .min(5, "أدخل البريد الإلكتروني")
  .max(160)
  .email("البريد الإلكتروني غير صحيح");

export const passwordSchema = z
  .string()
  .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
  .max(72, "كلمة المرور طويلة جدًا");

export const signInSchema = z.object({
  identifier: identifierSchema,
  password: z.string().min(1, "أدخل كلمة المرور").max(72),
  rememberMe: z.boolean().optional().default(false),
});

export const signUpSchema = z.object({
  fullName: z.string().trim().min(3, "أدخل الاسم الكامل").max(120),
  email: z.string().trim().email("البريد الإلكتروني غير صحيح").max(160),
  phone: z.string().trim().min(8, "رقم الجوال غير صحيح").max(20),
  password: passwordSchema,
});

export const profileSchema = z.object({
  fullName: z.string().trim().min(3, "أدخل الاسم الكامل").max(120),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  preferredLanguage: z.enum(["ar", "en"]),
  avatarUrl: z.string().trim().url("رابط الصورة غير صحيح").max(500).optional().or(z.literal("")),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
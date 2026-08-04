import { supabase } from "@/integrations/supabase/client";

export type PublicTestimonial = {
  id: string;
  name: string;
  role: string;
  quote: string;
  rating: number;
  status: string;
  created_at: string;
  user_id?: string | null;
};

/** Approved parent reviews shown on the public website. */
export async function fetchApprovedTestimonials(): Promise<PublicTestimonial[]> {
  const { data, error } = await supabase
    .from("site_testimonials")
    .select("id, name, role, quote, rating, status, created_at")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(24);
  if (error) throw new Error(error.message);
  return (data ?? []) as PublicTestimonial[];
}

/** All submissions — readable by school staff only (RLS enforced). */
export async function fetchAllTestimonials(): Promise<PublicTestimonial[]> {
  const { data, error } = await supabase
    .from("site_testimonials")
    .select("id, name, role, quote, rating, status, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []) as PublicTestimonial[];
}

export async function submitTestimonial(input: {
  name: string;
  role: string;
  quote: string;
  rating: number;
}) {
  const { error } = await supabase.rpc("submit_site_testimonial", {
    _name: input.name,
    _role: input.role,
    _quote: input.quote,
    _rating: input.rating,
  });
  if (error) {
    if (error.message.includes("rate_limited")) throw new Error("تم تجاوز عدد المشاركات المسموح خلال 24 ساعة.");
    if (error.message.includes("quote_too_short")) throw new Error("النص قصير جدًا، اكتب 10 أحرف على الأقل.");
    if (error.message.includes("forbidden")) throw new Error("يجب تسجيل الدخول لإرسال رأيك.");
    throw new Error(error.message);
  }
}

export async function setTestimonialStatus(id: string, status: "approved" | "rejected" | "pending") {
  const { error } = await supabase.from("site_testimonials").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteTestimonial(id: string) {
  const { error } = await supabase.from("site_testimonials").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export type TestimonialContact = { phone: string | null; email: string | null };

/** Contact details of the parents behind reviews, so staff can reply quickly. */
export async function fetchTestimonialContacts(
  userIds: string[],
): Promise<Record<string, TestimonialContact>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return {};
  const { data, error } = await supabase
    .from("profiles")
    .select("id, phone, email")
    .in("id", ids);
  if (error) return {};
  return Object.fromEntries(
    (data ?? []).map((row) => [row.id, { phone: row.phone, email: row.email }]),
  );
}

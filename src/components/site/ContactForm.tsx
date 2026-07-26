import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { submitContactMessage } from "@/lib/contact.functions";
import { Doodle } from "./Decor";

const programOptions = ["الروضة", "المرحلة الابتدائية", "استفسار عام"];

const empty = { name: "", phone: "", email: "", program: "الروضة", subject: "", message: "" };

export function ContactForm() {
  const send = useServerFn(submitContactMessage);
  const [values, setValues] = useState(empty);
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof empty) => (v: string) =>
    setValues((prev) => ({ ...prev, [key]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await send({ data: values });
      toast.success("تم إرسال رسالتك بنجاح", {
        description: "سنتواصل معكم في أقرب وقت خلال أوقات العمل.",
      });
      setValues(empty);
    } catch (error) {
      const message =
        error instanceof Error && error.message ? error.message : "تعذّر إرسال الرسالة.";
      toast.error("لم يتم الإرسال", { description: message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-[2.75rem] bg-card p-7 shadow-card md:p-10">
      <span aria-hidden className="absolute -top-16 -end-16 size-52 rounded-full bg-accent/70 blur-3xl" />
      <Doodle kind="spark" className="end-8 top-6 text-gold/60" />

      <div className="relative">
        <span className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-sm font-bold text-primary">
          <Sparkles className="size-4 text-gold" />
          أرسل استفسارك
        </span>
        <h3 className="mt-4 text-2xl font-black text-foreground md:text-3xl">
          نسعد بالإجابة على أسئلتكم
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          املأ النموذج وسيصل استفسارك مباشرة إلى إدارة المدرسة، وسنعاود التواصل معكم.
        </p>

        <form onSubmit={onSubmit} className="mt-8 grid gap-5 sm:grid-cols-2" noValidate>
          <Field label="الاسم" required>
            <Input
              value={values.name}
              onChange={(e) => set("name")(e.target.value)}
              required
              minLength={2}
              maxLength={100}
              placeholder="اسم ولي الأمر"
              className="h-12 rounded-2xl border-border/70 bg-background"
            />
          </Field>

          <Field label="رقم الجوال" required>
            <Input
              value={values.phone}
              onChange={(e) => set("phone")(e.target.value)}
              required
              dir="ltr"
              inputMode="tel"
              maxLength={20}
              placeholder="05XXXXXXXX"
              className="h-12 rounded-2xl border-border/70 bg-background text-end"
            />
          </Field>

          <Field label="البريد الإلكتروني">
            <Input
              value={values.email}
              onChange={(e) => set("email")(e.target.value)}
              type="email"
              dir="ltr"
              maxLength={255}
              placeholder="name@example.com"
              className="h-12 rounded-2xl border-border/70 bg-background text-end"
            />
          </Field>

          <Field label="المرحلة المهتم بها">
            <div className="flex flex-wrap gap-2">
              {programOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => set("program")(option)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                    values.program === option
                      ? "gradient-burgundy text-primary-foreground"
                      : "bg-accent/60 text-primary hover:bg-accent"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </Field>

          <Field label="عنوان الرسالة" className="sm:col-span-2">
            <Input
              value={values.subject}
              onChange={(e) => set("subject")(e.target.value)}
              maxLength={120}
              placeholder="مثال: استفسار عن التسجيل"
              className="h-12 rounded-2xl border-border/70 bg-background"
            />
          </Field>

          <Field label="الرسالة" required className="sm:col-span-2">
            <Textarea
              value={values.message}
              onChange={(e) => set("message")(e.target.value)}
              required
              minLength={10}
              maxLength={1500}
              rows={5}
              placeholder="اكتب استفسارك هنا..."
              className="rounded-3xl border-border/70 bg-background"
            />
          </Field>

          <div className="sm:col-span-2">
            <Button type="submit" variant="hero" size="lg" disabled={loading} className="w-full sm:w-auto">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {loading ? "جاري الإرسال..." : "إرسال الرسالة"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label className="text-sm font-bold text-foreground">
        {label}
        {required ? <span className="text-secondary"> *</span> : null}
      </Label>
      {children}
    </div>
  );
}

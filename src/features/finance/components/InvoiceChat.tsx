import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessagesSquare, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { invoiceMessageSend, invoiceMessagesGet } from "../finance.functions";

/** Shared parent ⇄ accounting thread attached to one invoice. */
export function InvoiceChat({ invoiceId, asStaff }: { invoiceId: string; asStaff?: boolean }) {
  const list = useServerFn(invoiceMessagesGet);
  const send = useServerFn(invoiceMessageSend);
  const [body, setBody] = useState("");

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["invoice-messages", invoiceId],
    queryFn: () => list({ data: { invoiceId } }),
    refetchInterval: 20_000,
  });

  const post = useMutation({
    mutationFn: () => send({ data: { invoiceId, body } }),
    onSuccess: () => {
      setBody("");
      void refetch();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <section className="rounded-[2rem] border border-border/60 bg-card p-6">
      <p className="flex items-center gap-2 text-sm font-black text-foreground">
        <MessagesSquare className="size-4" />
        الرسائل والملاحظات المالية
      </p>
      <p className="mt-1 text-xs font-bold text-muted-foreground">
        {asStaff
          ? "محادثة مباشرة مع ولي الأمر حول المستحقات والإيصالات."
          : "تواصل مباشر مع المسؤول المالي حول الرسوم والدفعات."}
      </p>

      <ul className="mt-4 max-h-72 space-y-2.5 overflow-y-auto">
        {(data ?? []).map((message) => (
          <li
            key={message.id}
            className={cn(
              "rounded-2xl border p-3",
              message.is_staff
                ? "border-primary/30 bg-primary/5"
                : "border-border/60 bg-muted/40",
            )}
          >
            <p className="flex items-center justify-between gap-2 text-[11px] font-black text-muted-foreground">
              <span>
                {message.author_name} · {message.is_staff ? "الإدارة المالية" : "ولي الأمر"}
              </span>
              <span>{new Date(message.created_at).toLocaleString("ar-SA")}</span>
            </p>
            <p className="mt-1.5 whitespace-pre-line text-xs font-bold leading-relaxed text-foreground">
              {message.body}
            </p>
          </li>
        ))}
        {!isLoading && !(data ?? []).length ? (
          <li className="rounded-2xl border-2 border-dashed border-border/70 p-5 text-center text-xs font-bold text-muted-foreground">
            لا توجد رسائل بعد.
          </li>
        ) : null}
      </ul>

      <div className="mt-4 space-y-2">
        <Textarea
          dir="rtl"
          rows={2}
          value={body}
          maxLength={1000}
          onChange={(event) => setBody(event.target.value)}
          placeholder="اكتب رسالتك…"
          className="rounded-2xl text-xs"
        />
        <Button
          className="w-full rounded-2xl"
          disabled={post.isPending || body.trim().length < 1}
          onClick={() => post.mutate()}
        >
          <Send className="size-4" />
          إرسال
        </Button>
      </div>
    </section>
  );
}
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Lock, Mail, Phone, Star, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type InboxEvent, fetchInboxEvents, logInboxEvent } from "@/features/inbox/audit";
import { AuditTrail } from "@/features/inbox/components/MessagesInbox";
import { REVIEW_TEMPLATES, mailtoLink } from "@/features/inbox/templates";
import {
  WhatsappConfirmDialog,
  type WhatsappDraft,
} from "@/components/whatsapp-confirm-dialog";
import {
  deleteTestimonial,
  fetchAllTestimonials,
  fetchTestimonialContacts,
  setTestimonialStatus,
} from "../testimonials";

const STATUS_LABEL: Record<string, string> = {
  pending: "بانتظار المراجعة",
  approved: "معتمد ومنشور",
  rejected: "مرفوض",
};

/** Staff moderation for parent reviews submitted from the public website. */
export function TestimonialsModeration({
  canModerate,
  canDelete,
  canReply,
}: {
  canModerate: boolean;
  canDelete: boolean;
  canReply: boolean;
}) {
  const queryClient = useQueryClient();
  const [templateKey, setTemplateKey] = useState(REVIEW_TEMPLATES[0].key);
  const [waDraft, setWaDraft] = useState<WhatsappDraft | null>(null);
  const [waSubject, setWaSubject] = useState<{ id: string; label: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["site-testimonials", "all"],
    queryFn: fetchAllTestimonials,
  });

  const { data: events } = useQuery({
    queryKey: ["inbox-events", "testimonial"],
    queryFn: () => fetchInboxEvents("testimonial"),
  });

  const userIds = (data ?? []).map((row) => row.user_id ?? "").filter(Boolean);
  const { data: contacts } = useQuery({
    queryKey: ["testimonial-contacts", userIds.join(",")],
    queryFn: () => fetchTestimonialContacts(userIds),
    enabled: canReply && userIds.length > 0,
  });

  const trailBySubject = useMemo(() => {
    const map = new Map<string, InboxEvent[]>();
    for (const event of events ?? []) {
      const list = map.get(event.subject_id) ?? [];
      list.push(event);
      map.set(event.subject_id, list);
    }
    return map;
  }, [events]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["site-testimonials"] });
    queryClient.invalidateQueries({ queryKey: ["inbox-events"] });
  };

  const moderate = useMutation({
    mutationFn: async (input: {
      id: string;
      from: string;
      status: "approved" | "rejected" | "pending";
    }) => {
      await setTestimonialStatus(input.id, input.status);
      await logInboxEvent({
        subjectType: "testimonial",
        subjectId: input.id,
        action: "moderate",
        fromValue: STATUS_LABEL[input.from] ?? input.from,
        toValue: STATUS_LABEL[input.status] ?? input.status,
      });
    },
    onSuccess: () => {
      toast.success("تم تحديث حالة الرأي وتسجيلها في سجل التدقيق");
      invalidate();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "تعذر التحديث"),
  });

  const remove = useMutation({
    mutationFn: async (input: { id: string; name: string }) => {
      await logInboxEvent({
        subjectType: "testimonial",
        subjectId: input.id,
        action: "delete",
        note: input.name,
      });
      await deleteTestimonial(input.id);
    },
    onSuccess: () => {
      toast.success("تم حذف الرأي");
      invalidate();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "تعذر الحذف"),
  });

  const template =
    REVIEW_TEMPLATES.find((item) => item.key === templateKey) ?? REVIEW_TEMPLATES[0];

  return (
    <Card className="rounded-[1.75rem] border-border/60 shadow-soft">
      <CardHeader>
        <CardTitle className="text-base font-extrabold">
          مشاركات أولياء الأمور من الموقع
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {canReply && (
          <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-beige/50 p-3">
            <span className="text-[11px] font-black text-muted-foreground">قالب الرد:</span>
            {REVIEW_TEMPLATES.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTemplateKey(item.key)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-black transition-colors ${
                  templateKey === item.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {!canModerate && (
          <p className="inline-flex items-center gap-1.5 rounded-2xl bg-accent px-3 py-2 text-[11px] font-bold text-muted-foreground">
            <Lock className="size-3.5" />
            لا تملك صلاحية اعتماد أو رفض التقييمات — العرض فقط.
          </p>
        )}

        {isLoading ? (
          <div className="grid place-items-center py-8">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : (data?.length ?? 0) === 0 ? (
          <p className="rounded-2xl bg-beige/60 px-4 py-3 text-xs font-semibold text-muted-foreground">
            لا توجد مشاركات بعد.
          </p>
        ) : (
          data!.map((row) => {
            const contact = row.user_id ? contacts?.[row.user_id] : undefined;
            const body = template.build({ name: row.name });
            return (
              <div
                key={row.id}
                className="rounded-[1.5rem] border border-border/60 bg-card/70 p-4 shadow-soft"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-extrabold text-foreground">{row.name}</span>
                  <span className="text-xs text-muted-foreground">{row.role}</span>
                  <span className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={`size-3.5 ${i <= row.rating ? "fill-gold text-gold" : "text-border"}`}
                      />
                    ))}
                  </span>
                  <span className="ms-auto rounded-full bg-accent px-3 py-1 text-[11px] font-black text-primary">
                    {STATUS_LABEL[row.status] ?? row.status}
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {row.quote}
                </p>

                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  {canReply && contact?.phone && (
                    <Button
                      variant="soft"
                      size="sm"
                      className="rounded-2xl"
                      onClick={() => {
                        setWaSubject({ id: row.id, label: template.label });
                        setWaDraft({ phone: contact.phone, text: body, recipient: row.name });
                      }}
                    >
                      <Phone className="size-4" />
                      رد واتساب
                    </Button>
                  )}
                  {canReply && contact?.email && (
                    <Button asChild variant="outline" size="sm" className="rounded-2xl">
                      <a
                        href={mailtoLink(contact.email, template.subject, body)}
                        onClick={() =>
                          logInboxEvent({
                            subjectType: "testimonial",
                            subjectId: row.id,
                            action: "reply_email",
                            note: template.label,
                          })
                        }
                      >
                        <Mail className="size-4" />
                        رد بالبريد
                      </a>
                    </Button>
                  )}
                  {canModerate && row.status !== "approved" && (
                    <Button
                      type="button"
                      variant="soft"
                      size="sm"
                      className="rounded-2xl"
                      disabled={moderate.isPending}
                      onClick={() =>
                        moderate.mutate({ id: row.id, from: row.status, status: "approved" })
                      }
                    >
                      <Check className="size-4" />
                      اعتماد ونشر
                    </Button>
                  )}
                  {canModerate && row.status !== "rejected" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-2xl"
                      disabled={moderate.isPending}
                      onClick={() =>
                        moderate.mutate({ id: row.id, from: row.status, status: "rejected" })
                      }
                    >
                      <X className="size-4" />
                      رفض
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="rounded-2xl text-destructive hover:text-destructive"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate({ id: row.id, name: row.name })}
                    >
                      <Trash2 className="size-4" />
                      حذف
                    </Button>
                  )}
                </div>

                <div className="mt-3">
                  <AuditTrail trail={trailBySubject.get(row.id) ?? []} />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
      <WhatsappConfirmDialog
        draft={waDraft}
        onClose={() => {
          setWaDraft(null);
          setWaSubject(null);
        }}
        onSent={() => {
          if (!waSubject) return;
          logInboxEvent({
            subjectType: "testimonial",
            subjectId: waSubject.id,
            action: "reply_whatsapp",
            note: waSubject.label,
          });
        }}
      />
    </Card>
  );
}

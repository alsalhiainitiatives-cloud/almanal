import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  History,
  Inbox,
  Loader2,
  Lock,
  Mail,
  MessageSquare,
  Phone,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  INBOX_ACTION_LABELS,
  type InboxEvent,
  fetchInboxEvents,
  logInboxEvent,
} from "../audit";
import {
  MESSAGE_PRIORITY_LABELS,
  MESSAGE_STATUS_LABELS,
  MESSAGE_STATUS_STYLES,
  type ContactMessage,
  type ContactMessageStatus,
  deleteContactMessage,
  exportMessagesCsv,
  fetchContactMessages,
  updateContactMessage,
} from "../inbox";
import { MESSAGE_TEMPLATES, mailtoLink } from "../templates";
import { openWhatsapp } from "@/lib/whatsapp";

export type InboxAbilities = {
  canReply: boolean;
  canStatus: boolean;
  canNote: boolean;
  canExport: boolean;
  canDelete: boolean;
};

const FILTERS: { key: "all" | ContactMessageStatus; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "new", label: "جديدة" },
  { key: "in_progress", label: "قيد المعالجة" },
  { key: "closed", label: "مغلقة" },
];

function formatDate(value: string) {
  return new Date(value).toLocaleString("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Staff workspace for messages submitted through the public contact form. */
export function MessagesInbox({ abilities }: { abilities: InboxAbilities }) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | ContactMessageStatus>("all");
  const [term, setTerm] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["contact-messages"],
    queryFn: fetchContactMessages,
  });

  const { data: events } = useQuery({
    queryKey: ["inbox-events", "message"],
    queryFn: () => fetchInboxEvents("message"),
  });

  const rows = data ?? [];

  const eventsBySubject = useMemo(() => {
    const map = new Map<string, InboxEvent[]>();
    for (const event of events ?? []) {
      const list = map.get(event.subject_id) ?? [];
      list.push(event);
      map.set(event.subject_id, list);
    }
    return map;
  }, [events]);

  const stats = useMemo(
    () => ({
      total: rows.length,
      fresh: rows.filter((row) => row.status === "new").length,
      progress: rows.filter((row) => row.status === "in_progress").length,
      closed: rows.filter((row) => row.status === "closed").length,
      urgent: rows.filter((row) => row.priority === "urgent" && row.status !== "closed").length,
    }),
    [rows],
  );

  const visible = useMemo(() => {
    const needle = term.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter !== "all" && row.status !== filter) return false;
      if (!needle) return true;
      return [row.name, row.phone, row.email, row.subject, row.program, row.message]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(needle));
    });
  }, [rows, filter, term]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["contact-messages"] });
    queryClient.invalidateQueries({ queryKey: ["inbox-events"] });
  };

  const update = useMutation({
    mutationFn: async (input: {
      id: string;
      before: ContactMessage;
      patch: { status?: ContactMessageStatus; priority?: string; staff_note?: string };
    }) => {
      await updateContactMessage(input.id, input.patch);
      if (input.patch.status) {
        await logInboxEvent({
          subjectType: "message",
          subjectId: input.id,
          action: "status",
          fromValue: MESSAGE_STATUS_LABELS[input.before.status] ?? input.before.status,
          toValue: MESSAGE_STATUS_LABELS[input.patch.status] ?? input.patch.status,
        });
      }
      if (input.patch.priority) {
        await logInboxEvent({
          subjectType: "message",
          subjectId: input.id,
          action: "priority",
          fromValue: MESSAGE_PRIORITY_LABELS[input.before.priority] ?? input.before.priority,
          toValue: MESSAGE_PRIORITY_LABELS[input.patch.priority] ?? input.patch.priority,
        });
      }
      if (input.patch.staff_note !== undefined) {
        await logInboxEvent({
          subjectType: "message",
          subjectId: input.id,
          action: "note",
          note: input.patch.staff_note || "—",
        });
      }
    },
    onSuccess: () => {
      toast.success("تم تحديث الرسالة وتسجيلها في سجل التدقيق");
      invalidate();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "تعذّر التحديث"),
  });

  const remove = useMutation({
    mutationFn: async (row: ContactMessage) => {
      await logInboxEvent({
        subjectType: "message",
        subjectId: row.id,
        action: "delete",
        note: `${row.name} — ${row.phone}`,
      });
      await deleteContactMessage(row.id);
    },
    onSuccess: () => {
      toast.success("تم حذف الرسالة نهائيًا");
      invalidate();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "تعذّر الحذف"),
  });

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "إجمالي المراسلات", value: stats.total, icon: Inbox },
          { label: "جديدة بانتظار الرد", value: stats.fresh, icon: Mail },
          { label: "قيد المعالجة", value: stats.progress, icon: Clock },
          { label: "مغلقة", value: stats.closed, icon: CheckCircle2 },
          { label: "عاجلة مفتوحة", value: stats.urgent, icon: AlertTriangle },
        ].map((kpi) => (
          <Card key={kpi.label} className="rounded-[1.5rem] border-border/60 shadow-soft">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary">
                <kpi.icon className="size-5" />
              </span>
              <div>
                <p className="text-xl font-extrabold text-foreground">{kpi.value}</p>
                <p className="text-[11px] font-bold text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-[1.5rem] border border-border/60 bg-card/80 p-3 shadow-soft">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="ابحث بالاسم أو الجوال أو الموضوع…"
            className="rounded-2xl pe-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={`rounded-full px-3.5 py-2 text-[11px] font-black transition-colors ${
                filter === item.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        {abilities.canExport ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-2xl font-bold"
            disabled={visible.length === 0}
            onClick={() => exportMessagesCsv(visible)}
          >
            <Download className="size-4" />
            تصدير CSV
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-2xl bg-accent px-3 py-2 text-[11px] font-bold text-muted-foreground">
            <Lock className="size-3.5" />
            التصدير غير متاح لصلاحيتك
          </span>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="grid place-items-center py-10">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : visible.length === 0 ? (
        <p className="rounded-2xl bg-beige/60 px-4 py-4 text-xs font-semibold text-muted-foreground">
          لا توجد مراسلات مطابقة للفلترة الحالية.
        </p>
      ) : (
        <div className="space-y-3">
          {visible.map((row) => (
            <MessageCard
              key={row.id}
              row={row}
              open={openId === row.id}
              abilities={abilities}
              trail={eventsBySubject.get(row.id) ?? []}
              busy={update.isPending || remove.isPending}
              note={noteDraft[row.id] ?? row.staff_note ?? ""}
              onNoteChange={(value) => setNoteDraft((prev) => ({ ...prev, [row.id]: value }))}
              onToggle={() => setOpenId((prev) => (prev === row.id ? null : row.id))}
              onUpdate={(patch) => update.mutate({ id: row.id, before: row, patch })}
              onDelete={() => remove.mutate(row)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MessageCard({
  row,
  open,
  abilities,
  trail,
  busy,
  note,
  onNoteChange,
  onToggle,
  onUpdate,
  onDelete,
}: {
  row: ContactMessage;
  open: boolean;
  abilities: InboxAbilities;
  trail: InboxEvent[];
  busy: boolean;
  note: string;
  onNoteChange: (value: string) => void;
  onToggle: () => void;
  onUpdate: (patch: { status?: ContactMessageStatus; priority?: string; staff_note?: string }) => void;
  onDelete: () => void;
}) {
  const [templateKey, setTemplateKey] = useState(MESSAGE_TEMPLATES[0].key);
  const template = MESSAGE_TEMPLATES.find((item) => item.key === templateKey) ?? MESSAGE_TEMPLATES[0];
  const body = template.build({ name: row.name, subject: row.subject, program: row.program });

  return (
    <div className="rounded-[1.5rem] border border-border/60 bg-card/80 p-4 shadow-soft">
      <button type="button" onClick={onToggle} className="w-full text-start">
        <div className="flex flex-wrap items-center gap-2">
          <span className="grid size-9 place-items-center rounded-2xl bg-accent text-primary">
            <MessageSquare className="size-4" />
          </span>
          <span className="text-sm font-extrabold text-foreground">{row.name}</span>
          <span className="text-[11px] font-bold text-muted-foreground" dir="ltr">
            {row.phone}
          </span>
          {row.subject && (
            <span className="rounded-full bg-beige/70 px-3 py-1 text-[11px] font-bold text-foreground">
              {row.subject}
            </span>
          )}
          {row.priority !== "normal" && (
            <span className="rounded-full bg-destructive/12 px-3 py-1 text-[11px] font-black text-destructive">
              {MESSAGE_PRIORITY_LABELS[row.priority] ?? row.priority}
            </span>
          )}
          <span
            className={`ms-auto rounded-full px-3 py-1 text-[11px] font-black ${
              MESSAGE_STATUS_STYLES[row.status] ?? "bg-accent text-primary"
            }`}
          >
            {MESSAGE_STATUS_LABELS[row.status] ?? row.status}
          </span>
          <span className="text-[11px] font-semibold text-muted-foreground">
            {formatDate(row.created_at)}
          </span>
        </div>
        {!open && (
          <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">{row.message}</p>
        )}
      </button>

      {open && (
        <div className="mt-4 space-y-4 border-t border-border/60 pt-4">
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{row.message}</p>

          <div className="flex flex-wrap gap-2 text-[11px] font-bold text-muted-foreground">
            {row.email && <span dir="ltr">{row.email}</span>}
            {row.program && <span>المرحلة المطلوبة: {row.program}</span>}
            {row.handled_at && <span>أُغلقت بتاريخ {formatDate(row.handled_at)}</span>}
          </div>

          {/* Ready-made replies */}
          {abilities.canReply ? (
            <div className="space-y-2 rounded-2xl bg-beige/50 p-3">
              <p className="text-[11px] font-black text-muted-foreground">قوالب الردود الجاهزة</p>
              <div className="flex flex-wrap gap-1.5">
                {MESSAGE_TEMPLATES.map((item) => (
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
              <p className="whitespace-pre-line rounded-2xl bg-card/80 p-3 text-xs leading-relaxed text-foreground">
                {body}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="soft"
                  size="sm"
                  className="rounded-2xl"
                  onClick={() => {
                    openWhatsapp(row.phone, body);
                    logInboxEvent({
                      subjectType: "message",
                      subjectId: row.id,
                      action: "reply_whatsapp",
                      note: template.label,
                    });
                  }}
                >
                  <Phone className="size-4" />
                  رد عبر واتساب
                </Button>
                {row.email && (
                  <Button asChild variant="outline" size="sm" className="rounded-2xl">
                    <a
                      href={mailtoLink(row.email, template.subject, body)}
                      onClick={() =>
                        logInboxEvent({
                          subjectType: "message",
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
              </div>
            </div>
          ) : (
            <p className="rounded-2xl bg-accent px-3 py-2 text-[11px] font-bold text-muted-foreground">
              لا تملك صلاحية الرد على المراسلات — يمكنك الاطلاع فقط.
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-[11px] font-black text-muted-foreground">حالة المعالجة</p>
              <div className="flex flex-wrap gap-1.5">
                {(["new", "in_progress", "closed"] as ContactMessageStatus[]).map((status) => (
                  <Button
                    key={status}
                    type="button"
                    size="sm"
                    variant={row.status === status ? "default" : "outline"}
                    className="rounded-2xl text-[11px]"
                    disabled={busy || row.status === status || !abilities.canStatus}
                    onClick={() => onUpdate({ status })}
                  >
                    {MESSAGE_STATUS_LABELS[status]}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-black text-muted-foreground">درجة الأهمية</p>
              <div className="flex flex-wrap gap-1.5">
                {["normal", "high", "urgent"].map((priority) => (
                  <Button
                    key={priority}
                    type="button"
                    size="sm"
                    variant={row.priority === priority ? "default" : "outline"}
                    className="rounded-2xl text-[11px]"
                    disabled={busy || row.priority === priority || !abilities.canStatus}
                    onClick={() => onUpdate({ priority })}
                  >
                    {MESSAGE_PRIORITY_LABELS[priority]}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-black text-muted-foreground">ملاحظة داخلية للفريق</p>
            <Textarea
              value={note}
              maxLength={1000}
              disabled={!abilities.canNote}
              onChange={(event) => onNoteChange(event.target.value)}
              placeholder="سجّل ما تم مع ولي الأمر…"
              className="min-h-20 rounded-2xl"
            />
            <div className="flex flex-wrap justify-end gap-2">
              {abilities.canNote && (
                <Button
                  type="button"
                  size="sm"
                  variant="soft"
                  className="rounded-2xl"
                  disabled={busy}
                  onClick={() => onUpdate({ staff_note: note.trim() })}
                >
                  حفظ الملاحظة
                </Button>
              )}
              {abilities.canDelete && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="rounded-2xl text-destructive hover:text-destructive"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm("سيتم حذف الرسالة نهائيًا. هل تريد المتابعة؟")) onDelete();
                  }}
                >
                  <Trash2 className="size-4" />
                  حذف نهائي
                </Button>
              )}
            </div>
          </div>

          <AuditTrail trail={trail} />
        </div>
      )}
    </div>
  );
}

/** Who handled the item, when, and what exactly changed. */
export function AuditTrail({ trail }: { trail: InboxEvent[] }) {
  return (
    <div className="space-y-2 rounded-2xl border border-border/60 bg-card/60 p-3">
      <p className="inline-flex items-center gap-1.5 text-[11px] font-black text-muted-foreground">
        <History className="size-3.5" />
        سجل التدقيق ({trail.length})
      </p>
      {trail.length === 0 ? (
        <p className="text-[11px] font-semibold text-muted-foreground">
          لم يتم تسجيل أي إجراء على هذا العنصر بعد.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {trail.map((event) => (
            <li key={event.id} className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="rounded-full bg-accent px-2.5 py-1 font-black text-primary">
                {INBOX_ACTION_LABELS[event.action] ?? event.action}
              </span>
              <span className="font-bold text-foreground">{event.actor_name ?? "مستخدم"}</span>
              {event.from_value && event.to_value && (
                <span className="font-semibold text-muted-foreground">
                  {event.from_value} ← {event.to_value}
                </span>
              )}
              {!event.from_value && event.to_value && (
                <span className="font-semibold text-muted-foreground">{event.to_value}</span>
              )}
              {event.note && (
                <span className="line-clamp-1 font-semibold text-muted-foreground">{event.note}</span>
              )}
              <span className="ms-auto font-semibold text-muted-foreground">
                {formatDate(event.created_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

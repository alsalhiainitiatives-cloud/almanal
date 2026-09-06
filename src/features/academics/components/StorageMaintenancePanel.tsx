/**
 * "Storage & Maintenance" — data-retention tools for school administration only.
 *
 *  - Evidence cleanup: delete evidence older than a chosen window (with count preview)
 *  - Chat wipe: clear one classroom, a whole stage, or every room (end-of-year reset)
 *
 * Both actions require typing DELETE before they run.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, HardDrive, Loader2, MessagesSquare, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  CHAT_WIPE_LABELS,
  RETENTION_LABELS,
  WIPE_CONFIRM_WORD,
  type ChatWipePreview,
  type ChatWipeScope,
  type EvidencePreview,
  type MaintenanceBoard,
  type RetentionWindow,
} from "../maintenance";
import {
  maintenanceBoard,
  maintenanceCleanEvidence,
  maintenancePreviewChatWipe,
  maintenancePreviewEvidence,
  maintenanceWipeChat,
} from "../maintenance.functions";

export function StorageMaintenancePanel() {
  const queryClient = useQueryClient();
  const loadBoard = useServerFn(maintenanceBoard);
  const previewEvidence = useServerFn(maintenancePreviewEvidence);
  const cleanEvidence = useServerFn(maintenanceCleanEvidence);
  const previewWipe = useServerFn(maintenancePreviewChatWipe);
  const wipeChat = useServerFn(maintenanceWipeChat);

  const { data, isLoading, error } = useQuery({
    queryKey: ["academics-maintenance"],
    queryFn: () => loadBoard() as Promise<MaintenanceBoard>,
  });

  const [window, setWindow] = useState<RetentionWindow>("3m");
  const [scope, setScope] = useState<ChatWipeScope>("classroom");
  const [classroomId, setClassroomId] = useState<string>("");
  const [stageId, setStageId] = useState<string>("");

  const [evidenceConfirm, setEvidenceConfirm] = useState<EvidencePreview | null>(null);
  const [chatConfirm, setChatConfirm] = useState<ChatWipePreview | null>(null);
  const [typed, setTyped] = useState("");

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["academics-maintenance"] });
    void queryClient.invalidateQueries({ queryKey: ["assessments-board"] });
    void queryClient.invalidateQueries({ queryKey: ["academic-report"] });
    void queryClient.invalidateQueries({ queryKey: ["chat-board"] });
  };

  const openEvidence = useMutation({
    mutationFn: () => previewEvidence({ data: { window } }) as Promise<EvidencePreview>,
    onSuccess: (result) => {
      setTyped("");
      setEvidenceConfirm(result);
    },
    onError: (e: Error) => toast.error(e.message || "تعذّر حساب عدد الملفات."),
  });

  const runEvidence = useMutation({
    mutationFn: () => cleanEvidence({ data: { window, confirm: WIPE_CONFIRM_WORD } }),
    onSuccess: (result) => {
      toast.success(`تم حذف ${result.deleted} دليلًا رقميًا.`);
      setEvidenceConfirm(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "تعذّر تنفيذ الحذف."),
  });

  const scopePayload = () => ({
    scope,
    classroomId: scope === "classroom" ? classroomId || null : null,
    stageId: scope === "stage" ? stageId || null : null,
  });

  const openChat = useMutation({
    mutationFn: () => previewWipe({ data: scopePayload() }) as Promise<ChatWipePreview>,
    onSuccess: (result) => {
      setTyped("");
      setChatConfirm(result);
    },
    onError: (e: Error) => toast.error(e.message || "تعذّر حساب عدد الرسائل."),
  });

  const runChat = useMutation({
    mutationFn: () => wipeChat({ data: { ...scopePayload(), confirm: WIPE_CONFIRM_WORD } }),
    onSuccess: (result) => {
      toast.success(`تم مسح ${result.messages} رسالة من ${result.scopeLabel}.`);
      setChatConfirm(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "تعذّر مسح المحادثات."),
  });

  if (isLoading) {
    return (
      <div className="grid place-items-center rounded-3xl border border-border/60 bg-card p-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data?.canManage) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-destructive/40 bg-card p-10 text-center">
        <p className="text-sm font-black text-foreground">
          {(error as Error | null)?.message ?? "هذه الأدوات متاحة لمدير النظام ومدير المدرسة فقط."}
        </p>
      </div>
    );
  }

  const confirmed = typed.trim() === WIPE_CONFIRM_WORD;

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-3xl border border-border/60 bg-card p-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-black text-foreground">
              <HardDrive className="h-4 w-4 text-primary" />
              تنظيف الأدلة الرقمية
            </h3>
            <p className="text-xs font-bold text-muted-foreground">
              حذف الصور والفيديوهات والملفات المرفوعة الأقدم من المدة المحددة لتحرير مساحة التخزين.
            </p>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-black text-primary">
            الإجمالي الحالي: {data.evidenceTotal}
          </span>
        </header>

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-60 space-y-1.5">
            <label className="text-[11px] font-black text-muted-foreground">المدة</label>
            <Select value={window} onValueChange={(v) => setWindow(v as RetentionWindow)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(RETENTION_LABELS) as RetentionWindow[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {RETENTION_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="destructive"
            className="font-black"
            disabled={openEvidence.isPending}
            onClick={() => openEvidence.mutate()}
          >
            {openEvidence.isPending ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="me-2 h-4 w-4" />
            )}
            مراجعة وحذف
          </Button>
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-destructive/30 bg-destructive/5 p-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-black text-foreground">
              <MessagesSquare className="h-4 w-4 text-destructive" />
              مسح سجل محادثات الفصول
            </h3>
            <p className="text-xs font-bold text-muted-foreground">
              إجراء لا يمكن التراجع عنه — يحذف الرسائل ومرفقاتها نهائيًا (مناسب لتصفير نهاية العام).
            </p>
          </div>
          <span className="rounded-full bg-destructive/10 px-3 py-1 text-[11px] font-black text-destructive">
            الرسائل الحالية: {data.chatMessageTotal}
          </span>
        </header>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-muted-foreground">النطاق</label>
            <Select value={scope} onValueChange={(v) => setScope(v as ChatWipeScope)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CHAT_WIPE_LABELS) as ChatWipeScope[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {CHAT_WIPE_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {scope === "classroom" ? (
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-muted-foreground">الفصل</label>
              <Select value={classroomId} onValueChange={setClassroomId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الفصل" />
                </SelectTrigger>
                <SelectContent>
                  {data.classrooms.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nameAr} — {c.stageNameAr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {scope === "stage" ? (
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-muted-foreground">المرحلة</label>
              <Select value={stageId} onValueChange={setStageId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المرحلة" />
                </SelectTrigger>
                <SelectContent>
                  {data.stages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nameAr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="flex items-end gap-2">
            <Button
              type="button"
              variant="destructive"
              className="w-full font-black"
              disabled={
                openChat.isPending ||
                (scope === "classroom" && !classroomId) ||
                (scope === "stage" && !stageId)
              }
              onClick={() => openChat.mutate()}
            >
              {openChat.isPending ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="me-2 h-4 w-4" />
              )}
              مراجعة ومسح
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-destructive/30 bg-card/70 p-3">
          <p className="text-xs font-black text-foreground">المحادثات الخاصة (معلمة ⇄ ولي أمر)</p>
          <p className="mt-1 text-[11px] font-bold text-muted-foreground">
            يمسح كل المحادثات الفردية ومرفقاتها داخل النطاق المحدد أعلاه.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 font-black text-destructive"
            disabled={
              openPrivate.isPending ||
              (scope === "classroom" && !classroomId) ||
              (scope === "stage" && !stageId)
            }
            onClick={() => openPrivate.mutate()}
          >
            {openPrivate.isPending ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="me-2 h-4 w-4" />
            )}
            مراجعة ومسح المحادثات الخاصة
          </Button>
        </div>
      </section>

      {/* Private wipe confirmation */}
      <Dialog open={!!privateConfirm} onOpenChange={(o) => !o && setPrivateConfirm(null)}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              تأكيد مسح المحادثات الخاصة
            </DialogTitle>
            <DialogDescription className="text-xs font-bold">
              {privateConfirm?.scopeLabel ?? "—"} — سيتم حذف {privateConfirm?.chats ?? 0} محادثة و
              {" "}
              {privateConfirm?.messages ?? 0} رسالة و{privateConfirm?.attachments ?? 0} مرفقًا نهائيًا.
            </DialogDescription>
          </DialogHeader>
          <ConfirmBox typed={typed} setTyped={setTyped} />
          <Button
            type="button"
            variant="destructive"
            className="w-full font-black"
            disabled={!confirmed || runPrivate.isPending}
            onClick={() => runPrivate.mutate()}
          >
            {runPrivate.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
            مسح نهائي
          </Button>
        </DialogContent>
      </Dialog>


      {/* Evidence confirmation */}
      <Dialog open={!!evidenceConfirm} onOpenChange={(o) => !o && setEvidenceConfirm(null)}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              تأكيد حذف الأدلة
            </DialogTitle>
            <DialogDescription className="text-xs font-bold">
              {RETENTION_LABELS[window]} — سيتم حذف {evidenceConfirm?.files ?? 0} ملفًا مرفوعًا و
              {" "}
              {evidenceConfirm?.links ?? 0} رابطًا نهائيًا.
            </DialogDescription>
          </DialogHeader>
          <ConfirmBox typed={typed} setTyped={setTyped} />
          <Button
            type="button"
            variant="destructive"
            className="w-full font-black"
            disabled={!confirmed || runEvidence.isPending}
            onClick={() => runEvidence.mutate()}
          >
            {runEvidence.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
            حذف نهائي
          </Button>
        </DialogContent>
      </Dialog>

      {/* Chat wipe confirmation */}
      <Dialog open={!!chatConfirm} onOpenChange={(o) => !o && setChatConfirm(null)}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              تأكيد مسح المحادثات
            </DialogTitle>
            <DialogDescription className="text-xs font-bold">
              {chatConfirm?.scopeLabel} — سيتم حذف {chatConfirm?.messages ?? 0} رسالة و
              {" "}
              {chatConfirm?.attachments ?? 0} مرفقًا نهائيًا.
            </DialogDescription>
          </DialogHeader>
          <ConfirmBox typed={typed} setTyped={setTyped} />
          <Button
            type="button"
            variant="destructive"
            className="w-full font-black"
            disabled={!confirmed || runChat.isPending}
            onClick={() => runChat.mutate()}
          >
            {runChat.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
            مسح نهائي
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ConfirmBox({
  typed,
  setTyped,
}: {
  typed: string;
  setTyped: (value: string) => void;
}) {
  const ok = typed.trim() === WIPE_CONFIRM_WORD;
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-muted-foreground">
        للتأكيد اكتبي <span className="font-black text-destructive">{WIPE_CONFIRM_WORD}</span> في
        الحقل التالي:
      </p>
      <Input
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        placeholder={WIPE_CONFIRM_WORD}
        dir="ltr"
        className={cn("font-black", ok && "border-destructive text-destructive")}
      />
    </div>
  );
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Armchair,
  BadgeCheck,
  CheckCircle2,
  ChevronsUpDown,
  CircleSlash,
  FileCheck2,
  FileWarning,
  ListOrdered,
  Sparkles,
  Undo2,
  UserCog,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  amsAssignOfficer,
  amsDecide,
  amsManageSeat,
  amsMoveToWaitingList,
  amsRecommend,
  amsRequestDocuments,
  amsReturnToParent,
  amsReviewDocument,
  amsSetPayment,
  amsSetPriority,
  amsStaff,
  amsStartReview,
  amsUpdateQurra,
} from "../../ams.functions";
import { can } from "../../roles";
import { documentCompletion, recommendationsFor } from "../../recommendations";
import type { WorkspaceData } from "../../types";
import type { AppRole } from "@/features/auth/rbac";
type DialogKind =
  | null
  | "assign"
  | "request"
  | "return"
  | "recommend"
  | "approve"
  | "reject"
  | "seat"
  | "waitlist"
  | "qurra"
  | "payment";
const TONE_STYLES = {
  green: "border-mint bg-mint/30",
  yellow: "border-gold/50 bg-gold/12",
  red: "border-destructive/25 bg-destructive/6",
} as const;

/** One numbered stage of the official review workflow. */
function Stage({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-3 rounded-2xl border border-border/60 bg-muted/20 p-2.5">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold text-muted-foreground">
        <span className="grid size-4.5 place-items-center rounded-md bg-primary/12 px-1 text-[10px] text-primary">
          {index}
        </span>
        {title}
      </p>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </div>
  );
}
export function ActionCenter({ data }: { data: WorkspaceData }) {
  const queryClient = useQueryClient();
  const roles = (data.roles ?? []) as AppRole[];
  const id = data.application.id;
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [note, setNote] = useState("");
  const [officerId, setOfficerId] = useState<string>("");
  const [classroomId, setClassroomId] = useState<string>("");
  const [signature, setSignature] = useState("");
  const [qurraStatus, setQurraStatus] = useState(data.qurra?.status ?? "not_requested");
  const [paymentStatus, setPaymentStatus] = useState(data.application.payment_status);
  const [requested, setRequested] = useState<string[]>([]);
  const { data: staff } = useQuery({ queryKey: ["ams", "staff"], queryFn: () => amsStaff() });
  const assign = useServerFn(amsAssignOfficer);
  const priority = useServerFn(amsSetPriority);
  const startReview = useServerFn(amsStartReview);
  const reviewDoc = useServerFn(amsReviewDocument);
  const requestDocs = useServerFn(amsRequestDocuments);
  const returnToParent = useServerFn(amsReturnToParent);
  const recommend = useServerFn(amsRecommend);
  const decide = useServerFn(amsDecide);
  const seat = useServerFn(amsManageSeat);
  const waitlist = useServerFn(amsMoveToWaitingList);
  const qurra = useServerFn(amsUpdateQurra);
  const payment = useServerFn(amsSetPayment);
  const run = useMutation({
    mutationFn: async (task: () => Promise<unknown>) => task(),
    onSuccess: () => {
      toast.success("تم تنفيذ الإجراء");
      setDialog(null);
      setNote("");
      setSignature("");
      queryClient.invalidateQueries({ queryKey: ["ams"] });
    },
    onError: (error: Error) => toast.error(error.message || "تعذّر تنفيذ الإجراء"),
  });
  const busy = run.isPending;
  const close = () => setDialog(null);
  const missingDocs = [
    ...documentCompletion(data, null).missing.map((slug) => ({ slug, childIndex: null as number | null })),
    ...data.children.flatMap((_, index) =>
      documentCompletion(data, index).missing.map((slug) => ({ slug, childIndex: index as number | null })),
    ),
  ];
  const docLabel = (slug: string) => data.documentTypes.find((t) => t.slug === slug)?.name_ar ?? slug;
  const keyOf = (item: { slug: string; childIndex: number | null }) => `${item.childIndex ?? "p"}:${item.slug}`;
  return (
    <div className="space-y-3">
      <div className="rounded-3xl border border-border/60 bg-card p-4">
        <p className="flex items-center gap-1.5 text-sm font-extrabold text-foreground">
          <Sparkles className="size-4 text-primary" /> توصيات النظام
        </p>
        <ul className="mt-3 space-y-2">
          {recommendationsFor(data).map((item, index) => (
            <li key={index} className={cn("rounded-2xl border px-3 py-2", TONE_STYLES[item.tone])}>
              <p className="text-[11px] font-extrabold text-foreground">{item.title}</p>
              {item.detail ? <p className="mt-0.5 text-[11px] text-muted-foreground">{item.detail}</p> : null}
            </li>
          ))}
          {recommendationsFor(data).length === 0 ? (
            <li className="rounded-2xl border border-mint bg-mint/30 px-3 py-2 text-[11px] font-extrabold">
              لا توجد ملاحظات — الطلب مكتمل.
            </li>
          ) : null}
        </ul>
      </div>
      <div className="rounded-3xl border border-border/60 bg-card p-4">
        <p className="text-sm font-extrabold text-foreground">مركز الإجراءات</p>
        <p className="mt-1 text-[11px] font-bold text-muted-foreground">
          الإجراءات مرتبة حسب مراحل المعالجة الرسمية للطلب.
        </p>

        <Stage index={1} title="الفرز والإسناد">
          {can(roles, "assign") ? (
            <Button variant="outline" size="sm" className="rounded-2xl text-xs font-bold" onClick={() => setDialog("assign")}>
              <UserCog className="size-3.5" /> إسناد
            </Button>
          ) : null}
          {can(roles, "review") ? (
            <Button
              variant="outline"
              size="sm"
              className="rounded-2xl text-xs font-bold"
              disabled={busy}
              onClick={() => run.mutate(() => startReview({ data: { id } }))}
            >
              <FileCheck2 className="size-3.5" /> بدء المراجعة
            </Button>
          ) : null}
        </Stage>

        <Stage index={2} title="مراجعة البيانات والمستندات">
          {can(roles, "review") ? (
            <Button variant="outline" size="sm" className="rounded-2xl text-xs font-bold" onClick={() => setDialog("request")}>
              <FileWarning className="size-3.5" /> طلب مستندات
            </Button>
          ) : null}
          {can(roles, "review") ? (
            <Button variant="outline" size="sm" className="rounded-2xl text-xs font-bold" onClick={() => setDialog("return")}>
              <Undo2 className="size-3.5" /> إعادة لولي الأمر
            </Button>
          ) : null}
          {can(roles, "qurra") ? (
            <Button variant="outline" size="sm" className="rounded-2xl text-xs font-bold" onClick={() => setDialog("qurra")}>
              <BadgeCheck className="size-3.5" /> حالة قرة
            </Button>
          ) : null}
        </Stage>

        <Stage index={3} title="التوصية والقرار">
          {can(roles, "review") ? (
            <Button
              variant="outline"
              size="sm"
              className="col-span-2 rounded-2xl text-xs font-bold"
              onClick={() => setDialog("recommend")}
            >
              <ChevronsUpDown className="size-3.5" /> رفع لاعتماد المدير
            </Button>
          ) : null}
          {can(roles, "decide") ? (
            <>
              <Button size="sm" className="rounded-2xl text-xs font-bold" onClick={() => setDialog("approve")}>
                <CheckCircle2 className="size-3.5" /> قبول
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="rounded-2xl text-xs font-bold"
                onClick={() => setDialog("reject")}
              >
                <CircleSlash className="size-3.5" /> رفض
              </Button>
            </>
          ) : null}
        </Stage>

        <Stage index={4} title="المقعد والسداد">
          {can(roles, "seats") ? (
            <Button variant="outline" size="sm" className="rounded-2xl text-xs font-bold" onClick={() => setDialog("seat")}>
              <Armchair className="size-3.5" /> المقعد
            </Button>
          ) : null}
          {can(roles, "seats") ? (
            <Button variant="outline" size="sm" className="rounded-2xl text-xs font-bold" onClick={() => setDialog("waitlist")}>
              <ListOrdered className="size-3.5" /> قائمة الانتظار
            </Button>
          ) : null}
          {can(roles, "payments") ? (
            <Button variant="outline" size="sm" className="rounded-2xl text-xs font-bold" onClick={() => setDialog("payment")}>
              <Wallet className="size-3.5" /> السداد
            </Button>
          ) : null}
        </Stage>

        {can(roles, "assign") ? (
          <div className="mt-3">
            <p className="mb-1.5 text-[11px] font-bold text-muted-foreground">الأولوية</p>
            <div className="grid grid-cols-4 gap-1.5">
              {(["low", "normal", "high", "urgent"] as const).map((level) => (
                <Button
                  key={level}
                  size="sm"
                  variant={data.application.priority === level ? "default" : "outline"}
                  className="rounded-xl text-[11px] font-bold"
                  disabled={busy}
                  onClick={() => run.mutate(() => priority({ data: { id, priority: level } }))}
                >
                  {level === "low" ? "منخفضة" : level === "normal" ? "عادية" : level === "high" ? "عالية" : "عاجلة"}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      {can(roles, "review") ? (
        <div className="rounded-3xl border border-border/60 bg-card p-4">
          <p className="text-sm font-extrabold text-foreground">مراجعة المستندات</p>
          <ul className="mt-3 space-y-2">
            {data.documents.map((doc) => (
              <li key={doc.id} className="rounded-2xl border border-border/60 bg-muted/20 p-2.5">
                <p className="text-[11px] font-extrabold text-foreground">
                  {docLabel(doc.document_type_slug)}
                  <span className="ms-1 font-bold text-muted-foreground">
                    {doc.child_index === null
                      ? "· ولي الأمر"
                      : `· ${data.children[doc.child_index]?.name_ar ?? `الطالب ${doc.child_index + 1}`}`}
                  </span>
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {(["approved", "rejected", "replace"] as const).map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant={doc.status === status ? "default" : "outline"}
                      className="rounded-xl px-2.5 text-[10px] font-bold"
                      disabled={busy}
                      onClick={() => run.mutate(() => reviewDoc({ data: { id, documentId: doc.id, status } }))}
                    >
                      {status === "approved" ? "اعتماد" : status === "rejected" ? "رفض" : "طلب بديل"}
                    </Button>
                  ))}
                </div>
              </li>
            ))}
            {data.documents.length === 0 ? (
              <li className="text-[11px] font-bold text-muted-foreground">لم يرفع ولي الأمر أي مستند بعد.</li>
            ) : null}
          </ul>
        </div>
      ) : null}
      <Dialog open={dialog === "assign"} onOpenChange={(open) => (open ? null : close())}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>إسناد الطلب</DialogTitle>
            <DialogDescription>اختر مسؤول التسجيل المسؤول عن متابعة هذا الطلب.</DialogDescription>
          </DialogHeader>
          <Select value={officerId} onValueChange={setOfficerId}>
            <SelectTrigger className="rounded-2xl">
              <SelectValue placeholder="اختر مسؤولًا" />
            </SelectTrigger>
            <SelectContent>
              {(staff ?? []).map((person) => (
                <SelectItem key={person.id} value={person.id}>
                  {person.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-2xl"
              disabled={busy}
              onClick={() => run.mutate(() => assign({ data: { id, officerId: null } }))}
            >
              إلغاء الإسناد
            </Button>
            <Button
              className="rounded-2xl"
              disabled={!officerId || busy}
              onClick={() => run.mutate(() => assign({ data: { id, officerId } }))}
            >
              إسناد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={dialog === "request"} onOpenChange={(open) => (open ? null : close())}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>طلب مستندات ناقصة</DialogTitle>
            <DialogDescription>حدّد المستندات المطلوبة وسيصل إشعار لولي الأمر.</DialogDescription>
          </DialogHeader>
          <div className="max-h-64 space-y-1.5 overflow-y-auto">
            {missingDocs.map((item) => {
              const key = keyOf(item);
              const active = requested.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRequested((prev) => (active ? prev.filter((k) => k !== key) : [...prev, key]))}
                  className={cn(
                    "w-full rounded-2xl border px-3 py-2 text-start text-xs font-bold",
                    active ? "border-primary bg-primary/10 text-primary" : "border-border/60 bg-muted/20",
                  )}
                >
                  {docLabel(item.slug)}
                  <span className="ms-1 text-[10px] font-bold text-muted-foreground">
                    {item.childIndex === null ? "· ولي الأمر" : `· ${data.children[item.childIndex]?.name_ar ?? ""}`}
                  </span>
                </button>
              );
            })}
            {missingDocs.length === 0 ? (
              <p className="text-xs font-bold text-muted-foreground">لا توجد مستندات ناقصة.</p>
            ) : null}
          </div>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="رسالة لولي الأمر (اختياري)"
            className="rounded-2xl text-xs"
          />
          <DialogFooter>
            <Button
              className="rounded-2xl"
              disabled={requested.length === 0 || busy}
              onClick={() =>
                run.mutate(() =>
                  requestDocs({
                    data: {
                      id,
                      items: missingDocs.filter((item) => requested.includes(keyOf(item))),
                      note: note || undefined,
                    },
                  }),
                )
              }
            >
              إرسال الطلب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={dialog === "return"} onOpenChange={(open) => (open ? null : close())}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>إعادة الطلب لولي الأمر</DialogTitle>
            <DialogDescription>وضّح سبب الإعادة والإجراء المطلوب.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="min-h-28 rounded-2xl text-xs"
            placeholder="سبب الإعادة…"
          />
          <DialogFooter>
            <Button
              className="rounded-2xl"
              disabled={note.trim().length < 5 || busy}
              onClick={() => run.mutate(() => returnToParent({ data: { id, note: note.trim() } }))}
            >
              إعادة الطلب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={dialog === "recommend"} onOpenChange={(open) => (open ? null : close())}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>رفع الطلب لاعتماد المدير</DialogTitle>
            <DialogDescription>اكتب توصية مسؤول التسجيل.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="min-h-28 rounded-2xl text-xs"
            placeholder="التوصية…"
          />
          <DialogFooter>
            <Button
              className="rounded-2xl"
              disabled={note.trim().length < 5 || busy}
              onClick={() => run.mutate(() => recommend({ data: { id, recommendation: note.trim() } }))}
            >
              رفع للمدير
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={dialog === "approve" || dialog === "reject"}
        onOpenChange={(open) => (open ? null : close())}
      >
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{dialog === "approve" ? "اعتماد قبول الطلب" : "رفض الطلب"}</DialogTitle>
            <DialogDescription>القرار نهائي ويُسجَّل في سجل التدقيق مع اسم المعتمِد.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="min-h-24 rounded-2xl text-xs"
            placeholder={dialog === "approve" ? "ملاحظات القبول…" : "سبب الرفض…"}
          />
          <Input
            value={signature}
            onChange={(event) => setSignature(event.target.value)}
            placeholder="التوقيع الرقمي (الاسم)"
            className="rounded-2xl text-xs"
          />
          <DialogFooter>
            <Button
              className="rounded-2xl"
              variant={dialog === "reject" ? "destructive" : "default"}
              disabled={note.trim().length < 3 || busy}
              onClick={() =>
                run.mutate(() =>
                  decide({
                    data: {
                      id,
                      decision: dialog === "approve" ? "approved" : "rejected",
                      note: note.trim(),
                      signature: signature || undefined,
                    },
                  }),
                )
              }
            >
              تأكيد القرار
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={dialog === "seat"} onOpenChange={(open) => (open ? null : close())}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>إدارة المقعد</DialogTitle>
            <DialogDescription>احجز أو حرّر أو انقل المقعد بين الفصول.</DialogDescription>
          </DialogHeader>
          <Select value={classroomId} onValueChange={setClassroomId}>
            <SelectTrigger className="rounded-2xl">
              <SelectValue placeholder="اختر الفصل" />
            </SelectTrigger>
            <SelectContent>
              {data.classrooms.map((classroom) => (
                <SelectItem key={classroom.id} value={classroom.id}>
                  {classroom.name_ar} — متاح {Math.max(0, classroom.capacity - classroom.taken_seats)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="rounded-2xl"
              disabled={busy}
              onClick={() => run.mutate(() => seat({ data: { id, action: "release" } }))}
            >
              تحرير المقعد
            </Button>
            <Button
              variant="outline"
              className="rounded-2xl"
              disabled={!classroomId || busy}
              onClick={() => run.mutate(() => seat({ data: { id, action: "transfer", classroomId } }))}
            >
              نقل
            </Button>
            <Button
              className="rounded-2xl"
              disabled={!classroomId || busy}
              onClick={() => run.mutate(() => seat({ data: { id, action: "reserve", classroomId } }))}
            >
              حجز المقعد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={dialog === "waitlist"} onOpenChange={(open) => (open ? null : close())}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>النقل إلى قائمة الانتظار</DialogTitle>
            <DialogDescription>سيُضاف الطلب لقائمة انتظار الفصل المحدد.</DialogDescription>
          </DialogHeader>
          <Select value={classroomId} onValueChange={setClassroomId}>
            <SelectTrigger className="rounded-2xl">
              <SelectValue placeholder="اختر الفصل" />
            </SelectTrigger>
            <SelectContent>
              {data.classrooms.map((classroom) => (
                <SelectItem key={classroom.id} value={classroom.id}>
                  {classroom.name_ar}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button
              className="rounded-2xl"
              disabled={busy}
              onClick={() => run.mutate(() => waitlist({ data: { id, classroomId: classroomId || null } }))}
            >
              نقل لقائمة الانتظار
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={dialog === "qurra"} onOpenChange={(open) => (open ? null : close())}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تحديث حالة دعم قرة</DialogTitle>
            <DialogDescription>حدّث حالة الطلب لدى برنامج قرة.</DialogDescription>
          </DialogHeader>
          <Select value={qurraStatus} onValueChange={(value) => setQurraStatus(value as typeof qurraStatus)}>
            <SelectTrigger className="rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="eligible">مؤهل</SelectItem>
              <SelectItem value="waiting_school_review">بانتظار مراجعة المدرسة</SelectItem>
              <SelectItem value="submitted_to_qurra">مُرسل لقرة</SelectItem>
              <SelectItem value="waiting_response">بانتظار الرد</SelectItem>
              <SelectItem value="approved">معتمد</SelectItem>
              <SelectItem value="rejected">مرفوض</SelectItem>
              <SelectItem value="not_requested">غير مطلوب</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="ملاحظة (اختياري)"
            className="rounded-2xl text-xs"
          />
          <DialogFooter>
            <Button
              className="rounded-2xl"
              disabled={busy}
              onClick={() => run.mutate(() => qurra({ data: { id, status: qurraStatus, note: note || undefined } }))}
            >
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={dialog === "payment"} onOpenChange={(open) => (open ? null : close())}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>حالة السداد</DialogTitle>
            <DialogDescription>تُحدَّث حالة سداد رسوم التسجيل يدويًا من المحاسب.</DialogDescription>
          </DialogHeader>
          <Select value={paymentStatus} onValueChange={(value) => setPaymentStatus(value)}>
            <SelectTrigger className="rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unpaid">غير مدفوع</SelectItem>
              <SelectItem value="partial">مدفوع جزئيًا</SelectItem>
              <SelectItem value="paid">مدفوع</SelectItem>
              <SelectItem value="waived">معفى</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button
              className="rounded-2xl"
              disabled={busy}
              onClick={() =>
                run.mutate(() =>
                  payment({
                    data: { id, status: paymentStatus as "unpaid" | "partial" | "paid" | "waived" },
                  }),
                )
              }
            >
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
/**
 * Guardian Linking board: invites the real guardians of imported students to
 * create a portal account, then tracks which students are already linked.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Copy, Link2, Loader2, MessageCircle, Search, ShieldX, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, SkeletonRows } from "@/features/ams/components/atoms";
import {
  amsGuardianInvite,
  amsGuardianLinks,
  amsGuardianRevoke,
} from "@/features/ams/guardians.functions";
import {
  INVITATION_LABELS,
  INVITATION_STYLES,
  inviteMessage,
  inviteUrl,
  type InvitationStatus,
} from "@/features/ams/guardians";
import { openWhatsapp } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

const KEY = ["ams", "guardian-links"];

type Row = Awaited<ReturnType<typeof amsGuardianLinks>>["students"][number];

function statusOf(row: Row): InvitationStatus | null {
  const raw = row.invitation?.status;
  if (raw === "pending" || raw === "accepted" || raw === "revoked") return raw;
  return null;
}

export function GuardianLinkBoard() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [stageId, setStageId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const { data, isLoading, error } = useQuery({ queryKey: KEY, queryFn: () => amsGuardianLinks() });

  const invite = useMutation({
    mutationFn: (childIds: string[]) => amsGuardianInvite({ data: { childIds } }),
    onSuccess: (result) => {
      setSelected([]);
      void queryClient.invalidateQueries({ queryKey: KEY });
      if (result.created.length)
        toast.success(`تم إنشاء ${result.created.length} دعوة — أرسلها لولي الأمر عبر واتساب.`);
      for (const skip of result.skipped) toast.error(`${skip.childName}: ${skip.reason}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => amsGuardianRevoke({ data: { id } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEY });
      toast.success("تم إلغاء الدعوة.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const students = data?.students ?? [];
  const stageName = (id: string | null) =>
    (data?.stages ?? []).find((s) => s.id === id)?.name_ar ?? "—";
  const classroomName = (id: string | null) =>
    (data?.classrooms ?? []).find((c) => c.id === id)?.name_ar ?? "بدون فصل";

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return students.filter((s) => {
      if (stageId && s.stageId !== stageId) return false;
      if (!needle) return true;
      return [s.childName, s.academicNumber, s.parentName, s.parentPhone, s.parentEmail]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [students, q, stageId]);

  const unlinked = filtered.filter((s) => !s.linked);
  const linked = filtered.filter((s) => s.linked);

  const copyLink = async (row: Row) => {
    if (!row.invitation) return;
    const url = inviteUrl(row.invitation.token);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("تم نسخ رابط الدعوة.");
    } catch {
      toast.message(url);
    }
  };

  const sendWhatsapp = (row: Row) => {
    if (!row.invitation) return;
    const ok = openWhatsapp(
      row.parentPhone,
      inviteMessage({
        parentName: row.parentName,
        childName: row.childName,
        url: inviteUrl(row.invitation.token),
      }),
    );
    if (!ok) toast.error("رقم جوال ولي الأمر غير صالح.");
  };

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  if (error) return <EmptyState title="تعذّر التحميل" description={(error as Error).message} />;
  if (isLoading || !data) return <SkeletonRows rows={6} />;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "طلاب بدون حساب ولي أمر", value: students.filter((s) => !s.linked).length },
          {
            label: "دعوات بانتظار التسجيل",
            value: students.filter((s) => statusOf(s) === "pending" && !s.linked).length,
          },
          { label: "طلاب مرتبطون بحساب", value: students.filter((s) => s.linked).length },
        ].map((card) => (
          <div key={card.label} className="rounded-3xl border border-border/60 bg-card p-4">
            <p className="text-[11px] font-bold text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-2xl font-black text-foreground">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-3xl border border-border/60 bg-card p-4">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث باسم الطالب أو ولي الأمر أو الجوال…"
            className="h-11 rounded-2xl ps-9 text-sm"
          />
        </div>
        <select
          value={stageId ?? ""}
          onChange={(e) => setStageId(e.target.value || null)}
          className="h-11 rounded-2xl border border-border/60 bg-background px-3 text-xs font-bold"
        >
          <option value="">كل المراحل</option>
          {(data.stages ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name_ar}
            </option>
          ))}
        </select>
        <Button
          disabled={!selected.length || invite.isPending}
          onClick={() => invite.mutate(selected)}
          className="h-11 rounded-2xl text-xs font-black"
        >
          {invite.isPending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
          إنشاء دعوات ({selected.length})
        </Button>
      </div>

      <Tabs defaultValue="unlinked">
        <TabsList className="rounded-2xl">
          <TabsTrigger value="unlinked" className="rounded-xl text-xs font-bold">
            بحاجة إلى ربط ({unlinked.length})
          </TabsTrigger>
          <TabsTrigger value="linked" className="rounded-xl text-xs font-bold">
            مرتبطون ({linked.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="unlinked" className="mt-4">
          {unlinked.length === 0 ? (
            <EmptyState
              icon={<Link2 className="size-5" />}
              title="كل الطلاب مرتبطون بأولياء أمورهم"
              description="لا يوجد طلاب مستوردون بحاجة إلى دعوة تسجيل حاليًا."
            />
          ) : (
            <div className="overflow-x-auto rounded-3xl border border-border/60 bg-card">
              <table className="w-full min-w-[900px] text-start text-sm">
                <thead className="bg-muted/40 text-[11px] font-black text-muted-foreground">
                  <tr>
                    <th className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selected.length > 0 && selected.length === unlinked.length}
                        onChange={(e) =>
                          setSelected(e.target.checked ? unlinked.map((s) => s.childId) : [])
                        }
                      />
                    </th>
                    <th className="px-4 py-3 text-start">الطالب</th>
                    <th className="px-4 py-3 text-start">المرحلة / الفصل</th>
                    <th className="px-4 py-3 text-start">ولي الأمر</th>
                    <th className="px-4 py-3 text-start">الأشقاء</th>
                    <th className="px-4 py-3 text-start">حالة الدعوة</th>
                    <th className="px-4 py-3 text-start">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {unlinked.map((row) => {
                    const status = statusOf(row);
                    return (
                      <tr key={row.childId} className="border-t border-border/50 hover:bg-muted/25">
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selected.includes(row.childId)}
                            onChange={() => toggle(row.childId)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-extrabold text-foreground">{row.childName}</p>
                          <p className="text-[11px] text-muted-foreground" dir="ltr">
                            {row.academicNumber ?? "—"}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className="font-bold text-foreground">{stageName(row.stageId)}</span>
                          <span className="text-muted-foreground"> · {classroomName(row.classroomId)}</span>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <p className="font-bold text-foreground">{row.parentName ?? "غير مسجّل"}</p>
                          <p className="text-muted-foreground" dir="ltr">
                            {row.parentPhone ?? "—"}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {row.siblings > 0 ? `${row.siblings} أشقاء سيتم ربطهم تلقائيًا` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {status ? (
                            <span
                              className={cn(
                                "rounded-full border px-3 py-1 text-[11px] font-black",
                                INVITATION_STYLES[status],
                              )}
                            >
                              {INVITATION_LABELS[status]}
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-muted-foreground">لا توجد دعوة</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {row.invitation && status === "pending" ? (
                            <div className="flex flex-wrap gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-xl text-[11px] font-bold"
                                onClick={() => sendWhatsapp(row)}
                              >
                                <MessageCircle className="size-3.5" />
                                واتساب
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-xl text-[11px] font-bold"
                                onClick={() => void copyLink(row)}
                              >
                                <Copy className="size-3.5" />
                                نسخ الرابط
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="rounded-xl text-[11px] font-bold text-destructive"
                                onClick={() => revoke.mutate(row.invitation!.id)}
                              >
                                <ShieldX className="size-3.5" />
                                إلغاء
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl text-[11px] font-bold"
                              disabled={invite.isPending}
                              onClick={() => invite.mutate([row.childId])}
                            >
                              <UserPlus className="size-3.5" />
                              إنشاء دعوة
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="linked" className="mt-4">
          {linked.length === 0 ? (
            <EmptyState title="لا يوجد طلاب مرتبطون بعد" description="ستظهر هنا الحسابات بعد قبول الدعوات." />
          ) : (
            <div className="overflow-x-auto rounded-3xl border border-border/60 bg-card">
              <table className="w-full min-w-[720px] text-start text-sm">
                <thead className="bg-muted/40 text-[11px] font-black text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-start">الطالب</th>
                    <th className="px-4 py-3 text-start">المرحلة / الفصل</th>
                    <th className="px-4 py-3 text-start">حساب ولي الأمر</th>
                    <th className="px-4 py-3 text-start">تاريخ الربط</th>
                  </tr>
                </thead>
                <tbody>
                  {linked.map((row) => (
                    <tr key={row.childId} className="border-t border-border/50">
                      <td className="px-4 py-3 font-extrabold text-foreground">{row.childName}</td>
                      <td className="px-4 py-3 text-xs">
                        {stageName(row.stageId)} · {classroomName(row.classroomId)}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <p className="flex items-center gap-1 font-bold text-foreground">
                          <CheckCircle2 className="size-3.5 text-emerald-600" />
                          {row.accountName || row.parentName || "ولي الأمر"}
                        </p>
                        <p className="text-muted-foreground" dir="ltr">
                          {row.accountEmail ?? row.parentPhone ?? "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {row.invitation?.acceptedAt
                          ? new Date(row.invitation.acceptedAt).toLocaleDateString("ar-SA-u-ca-gregory")
                          : "تسجيل نظامي"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

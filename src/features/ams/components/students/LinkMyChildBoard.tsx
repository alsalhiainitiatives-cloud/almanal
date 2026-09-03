/**
 * Parent-side self-service linking: a guardian signs in normally and links their
 * children by entering each child's national ID or academic number.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, IdCard, Link2, Loader2, ShieldAlert, Unlink, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, SkeletonRows } from "@/features/ams/components/atoms";
import { linkMyChild, myLinkedChildren, unlinkChildGuardian } from "@/features/ams/link-child.functions";

const KEY = ["parent", "linked-children"];

export function LinkMyChildBoard() {
  const queryClient = useQueryClient();
  const [identifier, setIdentifier] = useState("");

  const { data, isLoading } = useQuery({ queryKey: KEY, queryFn: () => myLinkedChildren() });

  const link = useMutation({
    mutationFn: (value: string) => linkMyChild({ data: { identifier: value } }),
    onSuccess: (result) => {
      setIdentifier("");
      void queryClient.invalidateQueries({ queryKey: KEY });
      const names = result.childNames.filter(Boolean);
      toast.success(
        names.length > 1
          ? `تم الربط بنجاح: ${names.join(" · ")} (تم ربط الأشقاء تلقائيًا).`
          : `تم ربط ${names[0] ?? "الطالب"} بحسابك بنجاح.`,
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unlink = useMutation({
    mutationFn: (childId: string) => unlinkChildGuardian({ data: { childId } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEY });
      toast.success("تم إلغاء ربط الطفل بحسابك.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = identifier.trim();
    if (value.length < 5) {
      toast.error("أدخل رقم هوية الطفل أو رقمه الأكاديمي.");
      return;
    }
    link.mutate(value);
  };

  if (data?.staff) {
    return (
      <div className="rounded-3xl border border-border/60 bg-card p-8 text-center shadow-sm">
        <ShieldAlert className="mx-auto size-8 text-primary" />
        <p className="mt-3 text-sm font-black text-foreground">هذه الصفحة مخصّصة لأولياء الأمور</p>
        <p className="mt-2 text-xs leading-6 text-muted-foreground">
          حسابك حساب إداري/تعليمي، ولا يُربط بأبناء. لإدارة ربط الطلاب بأولياء أمورهم استخدم تبويب
          «أولياء الأمور» في شؤون الطلاب.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={submit}
        className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm"
      >
        <div className="flex items-center gap-2 text-sm font-black text-foreground">
          <IdCard className="size-4 text-primary" />
          ربط طفلي بحسابي
        </div>
        <p className="mt-1 text-xs leading-6 text-muted-foreground">
          أدخل رقم هوية الطفل (أو رقم الإقامة) أو رقمه الأكاديمي كما هو في المدرسة، وسيتم ربطه
          بحسابك مباشرة مع جميع أشقائه المسجّلين في نفس الملف.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="مثال: 1234567890 أو MN-1-27-001"
            dir="ltr"
            className="h-12 min-w-[240px] flex-1 rounded-2xl text-sm"
          />
          <Button type="submit" disabled={link.isPending} className="h-12 rounded-2xl px-6 text-xs font-black">
            {link.isPending ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
            ربط الطفل
          </Button>
        </div>
      </form>

      <div className="rounded-3xl border border-border/60 bg-card p-5">
        <div className="flex items-center gap-2 text-sm font-black text-foreground">
          <Users className="size-4 text-primary" />
          أبنائي المرتبطون بحسابي ({data?.children.length ?? 0})
        </div>

        <div className="mt-4">
          {isLoading ? (
            <SkeletonRows rows={3} />
          ) : (data?.children.length ?? 0) === 0 ? (
            <EmptyState
              icon={<Link2 className="size-5" />}
              title="لا يوجد أبناء مرتبطون بحسابك"
              description="استخدم الحقل أعلاه لربط أبنائك برقم الهوية أو الرقم الأكاديمي."
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {data!.children.map((child) => (
                <li
                  key={child.id}
                  className="rounded-2xl border border-border/60 bg-background p-4"
                >
                  <p className="flex items-center gap-1.5 font-extrabold text-foreground">
                    <BadgeCheck className="size-4 text-emerald-600" />
                    {child.name}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground" dir="ltr">
                    {child.academicNumber ?? "—"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {child.stage ?? "—"} · {child.classroom ?? "بدون فصل"}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={unlink.isPending}
                    onClick={() => {
                      void confirmAction({
                        title: `إلغاء ربط ${child.name} بحسابك؟`,
                        description:
                          "سيتم فصل الطفل وأشقائه في نفس الملف عن حسابك، ويمكنك إعادة الربط لاحقًا برقم الهوية.",
                        confirmLabel: "إلغاء الربط",
                        tone: "danger",
                      }).then((ok) => ok && unlink.mutate(child.id));
                    }}
                    className="mt-3 h-8 rounded-xl px-3 text-[11px] font-black text-destructive hover:bg-destructive/10"
                  >
                    {unlink.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Unlink className="size-3.5" />
                    )}
                    إلغاء الربط
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

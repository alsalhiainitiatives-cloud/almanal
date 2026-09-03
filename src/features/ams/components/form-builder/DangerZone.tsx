import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, Download, Loader2, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/features/auth/AuthProvider";
import { PURGE_PHRASE } from "../../upload-settings";
import {
  registrationDataExport,
  registrationDataPurge,
  registrationStatsGet,
} from "../../upload-settings.functions";

const STATS_KEY = ["ams", "registration-stats"];

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => cell(r[h])).join(","))].join("\n");
}

export function DangerZone() {
  const { roles } = useAuth();
  const isAdmin = (roles as string[]).includes("admin");
  const queryClient = useQueryClient();

  const loadStats = useServerFn(registrationStatsGet);
  const runExport = useServerFn(registrationDataExport);
  const runPurge = useServerFn(registrationDataPurge);

  const { data: stats } = useQuery({ queryKey: STATS_KEY, queryFn: () => loadStats() });

  const [token, setToken] = useState<string | null>(null);
  const [exportedAt, setExportedAt] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const exportMutation = useMutation({
    mutationFn: () => runExport(),
    onSuccess: (res) => {
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      download(
        `manal-registration-backup-${stamp}.json`,
        JSON.stringify(res.data, null, 2),
        "application/json",
      );
      download(
        `manal-applications-${stamp}.csv`,
        "\uFEFF" + toCsv(res.data.applications as Record<string, unknown>[]),
        "text/csv;charset=utf-8",
      );
      download(
        `manal-children-${stamp}.csv`,
        "\uFEFF" + toCsv(res.data.application_children as Record<string, unknown>[]),
        "text/csv;charset=utf-8",
      );
      setToken(res.token);
      setExportedAt(res.exportedAt);
      toast.success(`تم تصدير ${res.counts.applications} طلبًا — احفظ الملفات في مكان آمن`);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "تعذّر تصدير البيانات"),
  });

  const purgeMutation = useMutation({
    mutationFn: () => runPurge({ data: { token: token ?? "", confirm: confirmText } }),
    onSuccess: (res) => {
      toast.success(`تم حذف ${res.deletedApplications} طلبًا وكل البيانات المرتبطة بها نهائيًا`);
      setToken(null);
      setExportedAt(null);
      setConfirmText("");
      queryClient.invalidateQueries({ queryKey: STATS_KEY });
      queryClient.invalidateQueries();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "تعذّر تنفيذ الحذف"),
  });

  const canPurge = Boolean(token) && confirmText.trim() === PURGE_PHRASE && !purgeMutation.isPending;

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border-2 border-destructive/30 bg-destructive/5 p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-destructive/15 text-destructive">
            <ShieldAlert className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-base font-black text-destructive">حذف قاعدة بيانات التسجيل نهائيًا</p>
            <p className="mt-1 text-xs font-bold leading-relaxed text-muted-foreground">
              يحذف جميع طلبات الالتحاق وبيانات الأطفال والمستندات المرفوعة والفواتير والإيصالات وقوائم
              الانتظار، ويعيد عدّادات المقاعد إلى الصفر. لا يمكن التراجع عن هذا الإجراء —
              <span className="text-destructive"> يجب تصدير نسخة احتياطية أولًا</span>.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-5">
          {[
            ["الطلبات", stats?.applications],
            ["الأطفال", stats?.children],
            ["المستندات", stats?.documents],
            ["الفواتير", stats?.invoices],
            ["الإيصالات", stats?.receipts],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-2xl border border-border/60 bg-card p-3 text-center">
              <p className="text-lg font-black text-foreground">{value ?? "—"}</p>
              <p className="text-[11px] font-bold text-muted-foreground">{label as string}</p>
            </div>
          ))}
        </div>
      </div>

      {!isAdmin ? (
        <div className="rounded-3xl border-2 border-dashed border-border/70 bg-card p-8 text-center">
          <p className="text-sm font-black text-foreground">
            التصدير والحذف النهائي متاحان لمدير النظام فقط.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
            <p className="text-sm font-black text-foreground">1) تصدير البيانات (إلزامي)</p>
            <p className="mt-1 text-xs font-bold text-muted-foreground">
              ينزّل ملف JSON شامل + ملفي CSV للطلبات والأطفال. يفتح التصدير صلاحية الحذف لمدة 30 دقيقة.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button
                variant="soft"
                className="rounded-xl"
                disabled={exportMutation.isPending}
                onClick={() => exportMutation.mutate()}
              >
                {exportMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                تصدير نسخة احتياطية
              </Button>
              {exportedAt ? (
                <span className="flex items-center gap-1.5 text-xs font-black text-mint-foreground">
                  <CheckCircle2 className="size-4" /> تم التصدير{" "}
                  <span dir="ltr">{new Date(exportedAt).toLocaleString("ar-SA")}</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                  <AlertTriangle className="size-4" /> لم يتم التصدير بعد — الحذف معطّل
                </span>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
            <p className="text-sm font-black text-foreground">2) تأكيد الحذف النهائي</p>
            <div className="mt-3 max-w-sm space-y-1.5">
              <Label htmlFor="purge-confirm">
                اكتب «{PURGE_PHRASE}» للتأكيد
              </Label>
              <Input
                id="purge-confirm"
                value={confirmText}
                disabled={!token}
                placeholder={PURGE_PHRASE}
                onChange={(e) => setConfirmText(e.target.value)}
              />
            </div>
            <Button
              variant="destructive"
              className="mt-4 rounded-xl"
              disabled={!canPurge}
              onClick={() => {
                void confirmAction({
                  title: "تأكيد أخير قبل الحذف النهائي",
                  description:
                    "سيتم حذف كل بيانات التسجيل والمرفقات نهائيًا دون إمكانية استرجاع. هل أنت متأكد؟",
                  confirmLabel: "نعم، احذف كل البيانات",
                  tone: "danger",
                }).then((ok) => ok && purgeMutation.mutate());
              }}
            >
              {purgeMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              حذف كل بيانات التسجيل نهائيًا
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

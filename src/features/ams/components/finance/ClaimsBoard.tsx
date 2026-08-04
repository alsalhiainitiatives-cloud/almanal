import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FilePlus2, Loader2, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  financeClaimCancel,
  financeClaimCreate,
  financeClaimsGet,
} from "@/features/finance/finance.functions";
import { money } from "@/features/finance/pricing";

const KEY = ["ams", "finance", "claims"];

/** Issues a new-year financial claim for a student who is already enrolled. */
export function ClaimsBoard({ canManage }: { canManage: boolean }) {
  const load = useServerFn(financeClaimsGet);
  const create = useServerFn(financeClaimCreate);
  const cancel = useServerFn(financeClaimCancel);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [form, setForm] = useState({
    academicYear: "",
    planType: "installments" as "full" | "installments",
    installments: 4,
    tuitionTotal: 0,
    admissionFee: 0,
    servicesTotal: 0,
    discountTotal: 0,
    note: "",
  });

  const { data, isLoading } = useQuery({ queryKey: KEY, queryFn: () => load() });

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const list = data?.targets ?? [];
    if (!needle) return list;
    return list.filter((t) =>
      [t.applicationNumber, t.studentNumber, t.parentName, ...t.children]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle)),
    );
  }, [data?.targets, search]);

  if (isLoading || !data) {
    return (
      <div className="grid place-items-center py-16">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  async function submit(applicationId: string) {
    setBusy(true);
    try {
      const res = await create({
        data: {
          applicationId,
          academicYear: form.academicYear,
          planType: form.planType,
          installments: form.installments,
          tuitionTotal: Number(form.tuitionTotal) || 0,
          admissionFee: Number(form.admissionFee) || 0,
          servicesTotal: Number(form.servicesTotal) || 0,
          discountTotal: Number(form.discountTotal) || 0,
          note: form.note || null,
        },
      });
      toast.success(`تم إنشاء مطالبة بمبلغ ${money(res.total)} وإشعار ولي الأمر`);
      setOpen(null);
      queryClient.invalidateQueries({ queryKey: KEY });
      queryClient.invalidateQueries({ queryKey: ["ams", "finance"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border/60 bg-card p-5">
        <p className="text-sm font-black text-foreground">المطالبات المالية السنوية</p>
        <p className="mt-1 text-xs font-bold leading-relaxed text-muted-foreground">
          للطلاب المستمرين: أنشئ مطالبة مالية لعام دراسي جديد وسيتم جدولة الدفعات وإشعار ولي الأمر ليتابعها
          ويرفع الإيصالات من صفحة المدفوعات كالمعتاد.
        </p>
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم الطالب أو ولي الأمر أو رقم الطلب…"
            className="h-11 rounded-2xl ps-9 text-sm"
          />
        </div>
      </div>

      {rows.map((target) => {
        const isOpen = open === target.applicationId;
        return (
          <section
            key={target.applicationId}
            className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm"
          >
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-black text-foreground">
                  {target.children.join(" · ") || "طالب"}
                </p>
                <p className="mt-1 text-xs font-bold text-muted-foreground">
                  ولي الأمر {target.parentName}
                  {target.studentNumber ? ` · الرقم الأكاديمي ${target.studentNumber}` : ""} · آخر عام
                  مفوتر {target.latestYear}
                </p>
              </div>
              {canManage ? (
                <Button
                  size="sm"
                  className="rounded-2xl"
                  onClick={() => {
                    setOpen(isOpen ? null : target.applicationId);
                    setForm({
                      academicYear: target.suggestedYear,
                      planType: "installments",
                      installments: 4,
                      tuitionTotal: Math.round(target.suggestedTuition),
                      admissionFee: 0,
                      servicesTotal: 0,
                      discountTotal: 0,
                      note: "",
                    });
                  }}
                >
                  <FilePlus2 className="size-4" /> مطالبة جديدة
                </Button>
              ) : null}
            </header>

            {target.invoices.length ? (
              <div className="mt-4 space-y-2">
                {target.invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/60 p-3 text-xs font-bold"
                  >
                    <span className="text-foreground">العام {invoice.academic_year}</span>
                    <span className="text-muted-foreground">
                      إجمالي {money(Number(invoice.grand_total))} · مسدد{" "}
                      {money(Number(invoice.paid_total))}
                    </span>
                    {canManage && Number(invoice.paid_total) === 0 ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-xl text-destructive"
                        onClick={async () => {
                          try {
                            await cancel({ data: { invoiceId: invoice.id } });
                            toast.success("تم إلغاء المطالبة");
                            queryClient.invalidateQueries({ queryKey: KEY });
                          } catch (e) {
                            toast.error((e as Error).message);
                          }
                        }}
                      >
                        <Trash2 className="size-3.5" /> إلغاء
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs font-bold text-muted-foreground">لا توجد فواتير سابقة.</p>
            )}

            {isOpen ? (
              <div className="mt-4 grid gap-3 rounded-2xl bg-muted/40 p-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="text-[11px] font-bold text-muted-foreground">
                  العام الدراسي
                  <Input
                    value={form.academicYear}
                    onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                    className="mt-1 h-10 rounded-xl text-sm"
                  />
                </label>
                <label className="text-[11px] font-bold text-muted-foreground">
                  الرسوم الدراسية
                  <Input
                    type="number"
                    value={form.tuitionTotal}
                    onChange={(e) => setForm({ ...form, tuitionTotal: Number(e.target.value) })}
                    className="mt-1 h-10 rounded-xl text-sm"
                  />
                </label>
                <label className="text-[11px] font-bold text-muted-foreground">
                  رسوم إعادة التسجيل
                  <Input
                    type="number"
                    value={form.admissionFee}
                    onChange={(e) => setForm({ ...form, admissionFee: Number(e.target.value) })}
                    className="mt-1 h-10 rounded-xl text-sm"
                  />
                </label>
                <label className="text-[11px] font-bold text-muted-foreground">
                  الخدمات الإضافية
                  <Input
                    type="number"
                    value={form.servicesTotal}
                    onChange={(e) => setForm({ ...form, servicesTotal: Number(e.target.value) })}
                    className="mt-1 h-10 rounded-xl text-sm"
                  />
                </label>
                <label className="text-[11px] font-bold text-muted-foreground">
                  الخصم
                  <Input
                    type="number"
                    value={form.discountTotal}
                    onChange={(e) => setForm({ ...form, discountTotal: Number(e.target.value) })}
                    className="mt-1 h-10 rounded-xl text-sm"
                  />
                </label>
                <label className="text-[11px] font-bold text-muted-foreground">
                  خطة السداد
                  <select
                    value={form.planType}
                    onChange={(e) =>
                      setForm({ ...form, planType: e.target.value as "full" | "installments" })
                    }
                    className="mt-1 block h-10 w-full rounded-xl border border-border/60 bg-background px-2 text-sm font-bold"
                  >
                    <option value="installments">مجدولة على دفعات</option>
                    <option value="full">دفعة واحدة</option>
                  </select>
                </label>
                {form.planType === "installments" ? (
                  <label className="text-[11px] font-bold text-muted-foreground">
                    عدد الدفعات
                    <Input
                      type="number"
                      min={1}
                      max={12}
                      value={form.installments}
                      onChange={(e) => setForm({ ...form, installments: Number(e.target.value) })}
                      className="mt-1 h-10 rounded-xl text-sm"
                    />
                  </label>
                ) : null}
                <label className="text-[11px] font-bold text-muted-foreground sm:col-span-2">
                  ملاحظة لولي الأمر (اختياري)
                  <Input
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    className="mt-1 h-10 rounded-xl text-sm"
                  />
                </label>
                <div className="flex items-end justify-end gap-2 sm:col-span-2 lg:col-span-3">
                  <span className="me-auto text-xs font-black text-primary">
                    الإجمالي{" "}
                    {money(
                      Math.max(
                        0,
                        Number(form.tuitionTotal) +
                          Number(form.admissionFee) +
                          Number(form.servicesTotal) -
                          Number(form.discountTotal),
                      ),
                    )}
                  </span>
                  <Button variant="ghost" className="rounded-2xl text-xs font-bold" onClick={() => setOpen(null)}>
                    إلغاء
                  </Button>
                  <Button
                    className="rounded-2xl"
                    disabled={busy}
                    onClick={() => submit(target.applicationId)}
                  >
                    {busy ? <Loader2 className="size-4 animate-spin" /> : "إنشاء المطالبة"}
                  </Button>
                </div>
              </div>
            ) : null}
          </section>
        );
      })}

      {rows.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-border/70 bg-card p-8 text-center text-sm font-bold text-muted-foreground">
          لا يوجد طلاب مقبولون مطابقون للبحث.
        </div>
      ) : null}
    </div>
  );
}

import { CheckCircle2, CreditCard, Receipt, Sparkles, Wallet } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  buildSchedule,
  dateAr,
  installmentOptions,
  money,
  type PlanSettingsRow,
  type Quote,
} from "../pricing";

export function PlanPicker({
  quote,
  settings,
  planType,
  installments,
  onPlanChange,
  onInstallmentsChange,
  qurraMessage,
  qurraServicesMessage,
}: {
  quote: Quote;
  settings: PlanSettingsRow | null;
  planType: "full" | "installments";
  installments: number;
  onPlanChange: (value: "full" | "installments") => void;
  onInstallmentsChange: (value: number) => void;
  qurraMessage?: string;
  qurraServicesMessage?: string;
}) {
  const options = installmentOptions(settings).filter((n) => n > 1);
  const schedule = buildSchedule({
    total: quote.payableTotal,
    count: planType === "full" ? 1 : installments,
    settings,
  });
  const allowFull = settings?.allow_full ?? true;

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] bg-card p-7 shadow-card">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl gradient-burgundy text-primary-foreground">
            <Receipt className="size-5" />
          </span>
          <div>
            <p className="font-black text-foreground">الملخص المالي</p>
            <p className="text-xs text-muted-foreground">
              لعدد {quote.childCount} من الأبناء — القيم النهائية تُعتمد من قسم الحسابات.
            </p>
          </div>
        </div>

        <dl className="mt-6 space-y-3 text-sm">
          <Line label="رسوم القبول والتسجيل" value={money(quote.admissionFee)} />
          <Line
            label="الرسوم الدراسية"
            value={quote.qurraCovered ? "مغطاة عبر دعم قرة" : money(quote.tuition)}
            accent={quote.qurraCovered}
          />
          <Line label="الخدمات الإضافية" value={money(quote.servicesTotal)} />
          {quote.discounts.map((d) => (
            <Line key={d.label} label={d.label} value={`- ${money(d.amount)}`} accent />
          ))}
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-beige/70 px-5 py-4">
            <dt className="font-black text-foreground">الإجمالي المستحق عليك</dt>
            <dd className="text-lg font-black text-primary">{money(quote.payableTotal)}</dd>
          </div>
        </dl>
      </div>

      {quote.qurraCovered ? (
        <div className="space-y-3 rounded-[2rem] border border-mint/60 bg-mint/20 p-6">
          <p className="flex items-center gap-2 text-sm font-black text-foreground">
            <Sparkles className="size-4" />
            {qurraMessage ?? "يتم سداد المستحقات المالية الدراسية فقط من خلال قرة"}
          </p>
          {quote.payableTotal > 0 ? (
            <p className="text-xs font-bold leading-relaxed text-foreground/80">
              {qurraServicesMessage ??
                "المبالغ الظاهرة أعلاه تخص الخدمات الإضافية التي اخترتها ويتم سدادها مباشرة للروضة."}
            </p>
          ) : null}
        </div>
      ) : null}

      {quote.payableTotal > 0 ? (
        <div className="rounded-[2rem] bg-card p-7 shadow-card">
          <p className="flex items-center gap-2 font-black text-foreground">
            <Wallet className="size-4" />
            اختر طريقة السداد
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {allowFull ? (
              <button
                type="button"
                onClick={() => onPlanChange("full")}
                className={cn(
                  "rounded-2xl border-2 p-5 text-start transition-colors",
                  planType === "full"
                    ? "border-primary bg-primary/5"
                    : "border-border/60 hover:border-primary/40",
                )}
              >
                <span className="flex items-center gap-2 text-sm font-black text-foreground">
                  <CheckCircle2
                    className={cn("size-4", planType === "full" ? "text-primary" : "text-muted-foreground")}
                  />
                  سداد دفعة واحدة
                </span>
                <span className="mt-1 block text-xs font-bold text-muted-foreground">
                  {settings?.full_discount_percent
                    ? `يشمل خصم ${settings.full_discount_percent}% على الرسوم الدراسية`
                    : "سداد كامل المبلغ مرة واحدة"}
                </span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => onPlanChange("installments")}
              className={cn(
                "rounded-2xl border-2 p-5 text-start transition-colors",
                planType === "installments"
                  ? "border-primary bg-primary/5"
                  : "border-border/60 hover:border-primary/40",
              )}
            >
              <span className="flex items-center gap-2 text-sm font-black text-foreground">
                <CreditCard
                  className={cn(
                    "size-4",
                    planType === "installments" ? "text-primary" : "text-muted-foreground",
                  )}
                />
                جدولة على دفعات
              </span>
              <span className="mt-1 block text-xs font-bold text-muted-foreground">
                حتى {settings?.max_installments ?? 12} دفعة شهرية
              </span>
            </button>
          </div>

          {planType === "installments" ? (
            <div className="mt-5">
              <p className="text-xs font-black text-muted-foreground">عدد الدفعات</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {options.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onInstallmentsChange(n)}
                    className={cn(
                      "rounded-xl border px-4 py-2 text-xs font-black transition-colors",
                      installments === n
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/60 bg-card text-foreground hover:border-primary/40",
                    )}
                  >
                    {n} دفعات
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-6 overflow-hidden rounded-2xl border border-border/60">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-[11px] font-black text-muted-foreground">
                <tr>
                  <th className="p-3 text-start">الدفعة</th>
                  <th className="p-3 text-start">تاريخ الاستحقاق</th>
                  <th className="p-3 text-start">المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((row) => (
                  <tr key={row.seq} className="border-t border-border/50">
                    <td className="p-3 font-bold text-foreground">الدفعة {row.seq}</td>
                    <td className="p-3 text-muted-foreground">{dateAr(row.dueDate)}</td>
                    <td className="p-3 font-black text-foreground">{money(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <p className="rounded-2xl bg-accent/60 p-5 text-xs leading-relaxed text-foreground">
        بإرسال الطلب أنت تقرّ بصحة جميع البيانات والمستندات، وتوافق على سياسة القبول والرسوم. بعد
        الإرسال ستظهر لك بيانات الحساب البنكي وجدول الدفعات في صفحة «المدفوعات» لرفع إيصالات السداد.
      </p>
    </div>
  );
}

function Line({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={accent ? "font-black text-mint-foreground" : "font-bold text-foreground"}>
        {value}
      </dd>
    </div>
  );
}
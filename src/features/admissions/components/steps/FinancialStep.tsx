import { Receipt } from "lucide-react";

export type FinancialBreakdown = {
  childCount: number;
  admissionFee: number;
  tuition: number;
  servicesTotal: number;
  discount: number;
  grandTotal: number;
  discountLabel?: string;
};

export function computeFinancials(input: {
  childCount: number;
  admissionFeePerChild: number;
  tuitionPerChild: number;
  servicePrices: number[];
}): FinancialBreakdown {
  const childCount = Math.max(1, input.childCount);
  const admissionFee = input.admissionFeePerChild * childCount;
  const tuition = input.tuitionPerChild * childCount;
  const servicesTotal = input.servicePrices.reduce((a, b) => a + Number(b), 0);
  const discount = childCount > 1 ? tuition * 0.1 : 0;
  return {
    childCount,
    admissionFee,
    tuition,
    servicesTotal,
    discount,
    grandTotal: admissionFee + tuition + servicesTotal - discount,
  };
}

const money = (n: number) => `${Math.round(n).toLocaleString("ar-SA")} ر.س`;

export function FinancialStep({ data }: { data: FinancialBreakdown }) {
  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] bg-card p-7 shadow-card">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl gradient-burgundy text-primary-foreground">
            <Receipt className="size-5" />
          </span>
          <div>
            <p className="font-black text-foreground">الملخص المالي التقديري</p>
            <p className="text-xs text-muted-foreground">
              لعدد {data.childCount} من الأبناء — القيم النهائية تُعتمد من قسم الحسابات.
            </p>
          </div>
        </div>

        <dl className="mt-6 space-y-3 text-sm">
          <Line label="رسوم القبول" value={money(data.admissionFee)} />
          <Line label="الرسوم الدراسية" value={money(data.tuition)} />
          <Line label="الخدمات الإضافية" value={money(data.servicesTotal)} />
          {data.discount > 0 ? (
            <Line label={data.discountLabel ?? "الخصومات"} value={`- ${money(data.discount)}`} accent />
          ) : null}
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-beige/70 px-5 py-4">
            <dt className="font-black text-foreground">الإجمالي التقديري</dt>
            <dd className="text-lg font-black text-primary">{money(data.grandTotal)}</dd>
          </div>
        </dl>
      </div>

      <p className="rounded-2xl bg-accent/60 p-5 text-xs leading-relaxed text-foreground">
        بإرسال الطلب أنت تقرّ بصحة جميع البيانات والمستندات، وتوافق على سياسة القبول والرسوم. سيتم
        التواصل معك خلال أيام العمل الرسمية لاستكمال الإجراءات.
      </p>
    </div>
  );
}

function Line({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={accent ? "font-black text-mint-foreground" : "font-bold text-foreground"}>
        {value}
      </dd>
    </div>
  );
}
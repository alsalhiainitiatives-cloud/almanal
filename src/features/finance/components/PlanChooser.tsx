import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { financePlanChoose, financeQuote } from "../finance.functions";
import type { PlanSettingsRow, Quote } from "../pricing";
import { PlanPicker } from "./PlanPicker";

/**
 * Shown to a parent once the application is approved: pick full payment or
 * schedule up to 12 installments; confirming creates the invoice + schedule.
 */
export function PlanChooser({
  applicationId,
  applicationNumber,
  qurraMessage,
  qurraServicesMessage,
  onDone,
}: {
  applicationId: string;
  applicationNumber: string | null;
  qurraMessage?: string;
  qurraServicesMessage?: string;
  onDone: () => void;
}) {
  const quoteFn = useServerFn(financeQuote);
  const chooseFn = useServerFn(financePlanChoose);
  const [planType, setPlanType] = useState<"full" | "installments">("installments");
  const [installments, setInstallments] = useState(4);

  const { data, isLoading } = useQuery({
    queryKey: ["finance-quote", applicationId, planType, installments],
    queryFn: () => quoteFn({ data: { applicationId, planType, installments } }),
  });

  const settings = (data?.settings ?? null) as PlanSettingsRow | null;

  useEffect(() => {
    if (settings && !settings.allow_full && planType === "full") setPlanType("installments");
  }, [settings, planType]);

  const confirm = useMutation({
    mutationFn: () => chooseFn({ data: { applicationId, planType, installments } }),
    onSuccess: () => {
      toast.success("تم تسجيل خطة السداد وإنشاء جدول الدفعات");
      onDone();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <section className="space-y-5 rounded-[2rem] border border-primary/30 bg-primary/[0.03] p-6">
      <header>
        <p className="text-sm font-black text-foreground">
          المصروفات الدراسية — طلب رقم {applicationNumber ?? "—"}
        </p>
        <p className="mt-1 text-xs font-bold text-muted-foreground">
          تم قبول الطلب. اختر طريقة السداد المناسبة لتظهر لك جدولة الدفعات وبيانات التحويل.
        </p>
      </header>

      {isLoading || !data ? (
        <div className="grid place-items-center py-10">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <PlanPicker
            quote={data.quote as Quote}
            settings={settings}
            planType={planType}
            installments={installments}
            onPlanChange={setPlanType}
            onInstallmentsChange={setInstallments}
            qurraMessage={qurraMessage}
            qurraServicesMessage={qurraServicesMessage}
          />
          <Button
            className="w-full rounded-2xl"
            disabled={confirm.isPending}
            onClick={() => confirm.mutate()}
          >
            <CheckCircle2 className="size-4" />
            تأكيد خطة السداد
          </Button>
        </>
      )}
    </section>
  );
}
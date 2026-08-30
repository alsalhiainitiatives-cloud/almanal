/**
 * Additional-services management inside the registration form builder.
 *
 * The "الخدمات الإضافية" wizard step renders rows from the `services` table
 * (not from `form_fields`), so it always looked empty here. This panel reuses
 * the finance services editor so staff can add / edit / delete those items
 * directly from the form builder.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { ServicesEditor } from "@/features/ams/components/finance/FinanceSettings";
import { financeConfigGet } from "@/features/finance/finance.functions";

const KEY = ["ams", "finance-config"];

export function ServicesPanel() {
  const load = useServerFn(financeConfigGet);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: KEY, queryFn: () => load() });
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await fn();
      await queryClient.invalidateQueries({ queryKey: KEY });
      await queryClient.invalidateQueries({ queryKey: ["admissions", "catalog"] });
      toast.success(success);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر حفظ الخدمة");
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
        <p className="text-sm font-black text-foreground">خدمات خطوة «الخدمات الإضافية»</p>
        <p className="mt-1.5 text-xs font-bold leading-relaxed text-muted-foreground">
          عناصر هذه الخطوة ليست حقولًا عادية، بل خدمات لها قيمة مالية — لذلك تُدار من هنا. أي إضافة أو
          تعديل أو حذف ينعكس لحظيًا على نموذج التسجيل وعلى الفاتورة.
        </p>
      </div>
      <ServicesEditor data={data} run={run} busy={busy} />
    </div>
  );
}

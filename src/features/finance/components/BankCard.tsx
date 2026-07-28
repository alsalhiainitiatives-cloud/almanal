import { Building2, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { BankAccountRow } from "../pricing";

export function BankCard({ account }: { account: BankAccountRow | null | undefined }) {
  if (!account) return null;

  const copy = (value: string, label: string) => {
    navigator.clipboard?.writeText(value);
    toast.success(`تم نسخ ${label}`);
  };

  return (
    <div className="rounded-[2rem] border border-border/60 bg-card p-6 shadow-card">
      <div className="flex items-center gap-3">
        {account.logo_url ? (
          <img
            src={account.logo_url}
            alt={`شعار ${account.school_name_ar}`}
            className="size-12 rounded-2xl object-cover"
            loading="lazy"
          />
        ) : (
          <span className="grid size-12 place-items-center rounded-2xl gradient-burgundy text-primary-foreground">
            <Building2 className="size-5" />
          </span>
        )}
        <div>
          <p className="text-sm font-black text-foreground">{account.school_name_ar}</p>
          <p className="text-xs font-bold text-muted-foreground">{account.org_name_ar}</p>
        </div>
      </div>

      <dl className="mt-5 space-y-2.5 text-sm">
        <Row label="اسم صاحب الحساب" value={account.account_holder} />
        <Row label="البنك" value={account.bank_name} />
        {account.account_number ? (
          <Row label="رقم الحساب" value={account.account_number} onCopy={copy} mono />
        ) : null}
        {account.iban ? <Row label="الآيبان" value={account.iban} onCopy={copy} mono /> : null}
      </dl>

      {account.notes_ar ? (
        <p className="mt-4 rounded-2xl bg-accent/60 p-4 text-xs font-bold leading-relaxed text-foreground">
          {account.notes_ar}
        </p>
      ) : null}
    </div>
  );
}

function Row({
  label,
  value,
  onCopy,
  mono,
}: {
  label: string;
  value: string;
  onCopy?: (value: string, label: string) => void;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="flex items-center gap-1.5">
        <span className={mono ? "font-mono text-xs font-black" : "font-bold text-foreground"} dir="ltr">
          {value}
        </span>
        {onCopy ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={() => onCopy(value, label)}
            aria-label={`نسخ ${label}`}
          >
            <Copy className="size-3.5" />
          </Button>
        ) : null}
      </dd>
    </div>
  );
}
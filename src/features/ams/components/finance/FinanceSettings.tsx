import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Banknote, Loader2, MessageSquare, Percent, Plus, Save, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  bankAccountDelete,
  bankAccountSave,
  discountRuleDelete,
  discountRuleSave,
  feePlanDelete,
  feePlanSave,
  financeConfigGet,
  financeSettingsSave,
  planSettingsSave,
  serviceDelete,
  serviceSave,
} from "@/features/finance/finance.functions";
import { DISCOUNT_CONDITION_LABELS, FEE_UNIT_LABELS, money } from "@/features/finance/pricing";

const KEY = ["ams", "finance-config"];

const SERVICE_CATEGORIES: Record<string, string> = {
  transportation: "النقل المدرسي",
  uniform: "الزي المدرسي",
  books: "الكتب والقرطاسية",
  meals: "الوجبات",
  activities: "الأنشطة",
  other: "أخرى",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-black text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-border/60 bg-card p-6 shadow-sm">
      <p className="mb-4 flex items-center gap-2 text-sm font-black text-foreground">
        {icon}
        {title}
      </p>
      {children}
    </section>
  );
}

const num = (v: string, fallback = 0) => (v === "" ? fallback : Number(v));

export function FinanceSettings() {
  const load = useServerFn(financeConfigGet);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: KEY, queryFn: () => load() });
  const [busy, setBusy] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: KEY });

  async function run(fn: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await fn();
      await refresh();
      toast.success(success);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر حفظ الإعدادات");
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
    <Tabs defaultValue="fees" dir="rtl" className="space-y-5">
      <TabsList className="rounded-2xl">
        <TabsTrigger value="fees" className="rounded-xl text-xs font-bold">
          <Wallet className="ms-1 size-4" /> الرسوم وخطط السداد
        </TabsTrigger>
        <TabsTrigger value="services" className="rounded-xl text-xs font-bold">
          <Plus className="ms-1 size-4" /> الخدمات الإضافية
        </TabsTrigger>
        <TabsTrigger value="discounts" className="rounded-xl text-xs font-bold">
          <Percent className="ms-1 size-4" /> الخصومات
        </TabsTrigger>
        <TabsTrigger value="bank" className="rounded-xl text-xs font-bold">
          <Banknote className="ms-1 size-4" /> الحساب البنكي والرسائل
        </TabsTrigger>
      </TabsList>

      <TabsContent value="fees" className="m-0 space-y-5">
        <FeePlans data={data} run={run} busy={busy} />
        <PlanSettings data={data} run={run} busy={busy} />
      </TabsContent>

      <TabsContent value="services" className="m-0">
        <ServicesEditor data={data} run={run} busy={busy} />
      </TabsContent>

      <TabsContent value="discounts" className="m-0">
        <Discounts data={data} run={run} busy={busy} />
      </TabsContent>

      <TabsContent value="bank" className="m-0 space-y-5">
        <BankEditor data={data} run={run} busy={busy} />
        <Messages data={data} run={run} busy={busy} />
      </TabsContent>
    </Tabs>
  );
}

type Cfg = Awaited<ReturnType<typeof financeConfigGet>>;
type Props = { data?: Cfg; run: (fn: () => Promise<unknown>, s: string) => Promise<void>; busy: boolean };

const emptyPlan = {
  id: null as string | null,
  stage_id: "",
  classroom_id: "",
  label_ar: "",
  amount: 0,
  unit: "year",
  terms_per_year: 2,
  months_per_year: 9,
  admission_fee: 0,
  is_active: true,
};

function FeePlans({ data, run, busy }: Props) {
  const save = useServerFn(feePlanSave);
  const remove = useServerFn(feePlanDelete);
  const [draft, setDraft] = useState(emptyPlan);

  const stages = data?.stages ?? [];
  const classrooms = data?.classrooms ?? [];
  const stageName = (id: string | null) => stages.find((s) => s.id === id)?.name_ar ?? null;
  const classroomName = (id: string | null) => classrooms.find((c) => c.id === id)?.name_ar ?? null;

  return (
    <Card title="قيمة المصاريف لكل مرحلة أو فصل" icon={<Wallet className="size-4" />}>
      <p className="mb-4 text-xs font-bold leading-relaxed text-muted-foreground">
        حدّد قيمة الرسوم ووحدتها (شهري / ترم / ترمين / سنة كاملة). خطة الفصل تتجاوز خطة المرحلة، وتُستخدم
        القيم مباشرة في احتساب جدول الدفعات داخل نظام التسجيل.
      </p>

      <ul className="space-y-2">
        {(data?.feePlans ?? []).map((plan) => (
          <li
            key={plan.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 p-3.5"
          >
            <div>
              <p className="text-xs font-black text-foreground">
                {plan.label_ar ||
                  classroomName(plan.classroom_id) ||
                  stageName(plan.stage_id) ||
                  "خطة عامة"}
              </p>
              <p className="text-[11px] font-bold text-muted-foreground">
                {money(Number(plan.amount))} {FEE_UNIT_LABELS[plan.unit] ?? plan.unit} · رسوم قبول{" "}
                {money(Number(plan.admission_fee))} · {plan.terms_per_year} ترم /{" "}
                {plan.months_per_year} شهر
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl"
                onClick={() =>
                  setDraft({
                    id: plan.id,
                    stage_id: plan.stage_id ?? "",
                    classroom_id: plan.classroom_id ?? "",
                    label_ar: plan.label_ar ?? "",
                    amount: Number(plan.amount),
                    unit: plan.unit,
                    terms_per_year: plan.terms_per_year,
                    months_per_year: plan.months_per_year,
                    admission_fee: Number(plan.admission_fee),
                    is_active: plan.is_active,
                  })
                }
              >
                تعديل
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-xl text-destructive"
                disabled={busy}
                onClick={() => run(() => remove({ data: { id: plan.id } }), "تم حذف خطة الرسوم")}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </li>
        ))}
        {!(data?.feePlans ?? []).length ? (
          <li className="rounded-2xl border-2 border-dashed border-border/70 p-6 text-center text-xs font-bold text-muted-foreground">
            لا توجد خطط رسوم بعد — أضف خطة للمرحلة أو للفصل.
          </li>
        ) : null}
      </ul>

      <div className="mt-5 grid gap-3 rounded-2xl bg-muted/40 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="المرحلة">
          <select
            dir="rtl"
            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs font-bold"
            value={draft.stage_id}
            onChange={(e) => setDraft({ ...draft, stage_id: e.target.value, classroom_id: "" })}
          >
            <option value="">كل المراحل</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name_ar}
              </option>
            ))}
          </select>
        </Field>
        <Field label="الفصل (اختياري)">
          <select
            dir="rtl"
            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs font-bold"
            value={draft.classroom_id}
            onChange={(e) => setDraft({ ...draft, classroom_id: e.target.value })}
          >
            <option value="">كل فصول المرحلة</option>
            {classrooms
              .filter((c) => !draft.stage_id || c.stage_id === draft.stage_id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_ar}
                </option>
              ))}
          </select>
        </Field>
        <Field label="اسم الخطة">
          <Input
            className="rounded-xl"
            value={draft.label_ar}
            onChange={(e) => setDraft({ ...draft, label_ar: e.target.value })}
            placeholder="مثال: رسوم كبار المنال"
          />
        </Field>
        <Field label="قيمة الرسوم (ر.س)">
          <Input
            type="number"
            className="rounded-xl"
            value={draft.amount}
            onChange={(e) => setDraft({ ...draft, amount: num(e.target.value) })}
          />
        </Field>
        <Field label="وحدة القيمة">
          <select
            dir="rtl"
            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs font-bold"
            value={draft.unit}
            onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
          >
            {Object.entries(FEE_UNIT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="رسوم القبول (ر.س)">
          <Input
            type="number"
            className="rounded-xl"
            value={draft.admission_fee}
            onChange={(e) => setDraft({ ...draft, admission_fee: num(e.target.value) })}
          />
        </Field>
        <Field label="عدد التِرمات في السنة">
          <Input
            type="number"
            className="rounded-xl"
            value={draft.terms_per_year}
            onChange={(e) => setDraft({ ...draft, terms_per_year: num(e.target.value, 2) })}
          />
        </Field>
        <Field label="عدد الأشهر الدراسية">
          <Input
            type="number"
            className="rounded-xl"
            value={draft.months_per_year}
            onChange={(e) => setDraft({ ...draft, months_per_year: num(e.target.value, 9) })}
          />
        </Field>
        <div className="flex items-end gap-2">
          <Button
            className="rounded-xl"
            disabled={busy}
            onClick={() =>
              run(
                () =>
                  save({
                    data: {
                      id: draft.id,
                      stage_id: draft.stage_id || null,
                      classroom_id: draft.classroom_id || null,
                      label_ar: draft.label_ar || null,
                      amount: draft.amount,
                      unit: draft.unit as "month" | "term" | "two_terms" | "year",
                      terms_per_year: draft.terms_per_year,
                      months_per_year: draft.months_per_year,
                      admission_fee: draft.admission_fee,
                      is_active: draft.is_active,
                    },
                  }).then(() => setDraft(emptyPlan)),
                "تم حفظ خطة الرسوم",
              )
            }
          >
            <Save className="size-4" />
            {draft.id ? "حفظ التعديل" : "إضافة خطة"}
          </Button>
          {draft.id ? (
            <Button variant="ghost" className="rounded-xl" onClick={() => setDraft(emptyPlan)}>
              إلغاء
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function PlanSettings({ data, run, busy }: Props) {
  const save = useServerFn(planSettingsSave);
  const s = data?.planSettings;
  const [form, setForm] = useState({
    allow_full: true,
    full_discount_percent: 0,
    allowed_installments: "1,2,3,4,6,9,12",
    max_installments: 12,
    down_payment_percent: 0,
    due_day: 5,
    first_due_offset_days: 7,
    late_after_days: 3,
  });

  useEffect(() => {
    if (!s) return;
    setForm({
      allow_full: s.allow_full,
      full_discount_percent: Number(s.full_discount_percent),
      allowed_installments: (s.allowed_installments ?? []).join(","),
      max_installments: s.max_installments,
      down_payment_percent: Number(s.down_payment_percent),
      due_day: s.due_day,
      first_due_offset_days: s.first_due_offset_days,
      late_after_days: s.late_after_days,
    });
  }, [s]);

  return (
    <Card title="سيناريوهات السداد وجدولة الدفعات" icon={<Percent className="size-4" />}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="خصم السداد دفعة واحدة (%)">
          <Input
            type="number"
            className="rounded-xl"
            value={form.full_discount_percent}
            onChange={(e) => setForm({ ...form, full_discount_percent: num(e.target.value) })}
          />
        </Field>
        <Field label="عدد الدفعات المسموح بها">
          <Input
            className="rounded-xl"
            value={form.allowed_installments}
            onChange={(e) => setForm({ ...form, allowed_installments: e.target.value })}
            placeholder="1,2,3,4,6,9,12"
          />
        </Field>
        <Field label="الحد الأقصى للدفعات">
          <Input
            type="number"
            className="rounded-xl"
            value={form.max_installments}
            onChange={(e) => setForm({ ...form, max_installments: num(e.target.value, 12) })}
          />
        </Field>
        <Field label="نسبة الدفعة المقدمة (%)">
          <Input
            type="number"
            className="rounded-xl"
            value={form.down_payment_percent}
            onChange={(e) => setForm({ ...form, down_payment_percent: num(e.target.value) })}
          />
        </Field>
        <Field label="يوم الاستحقاق الشهري">
          <Input
            type="number"
            className="rounded-xl"
            value={form.due_day}
            onChange={(e) => setForm({ ...form, due_day: num(e.target.value, 5) })}
          />
        </Field>
        <Field label="أيام حتى أول دفعة">
          <Input
            type="number"
            className="rounded-xl"
            value={form.first_due_offset_days}
            onChange={(e) => setForm({ ...form, first_due_offset_days: num(e.target.value, 7) })}
          />
        </Field>
        <Field label="مهلة التأخر (أيام)">
          <Input
            type="number"
            className="rounded-xl"
            value={form.late_after_days}
            onChange={(e) => setForm({ ...form, late_after_days: num(e.target.value) })}
          />
        </Field>
        <div className="flex items-center justify-between gap-2 rounded-xl border border-border/60 px-3">
          <span className="text-[11px] font-black text-muted-foreground">إتاحة السداد دفعة واحدة</span>
          <Switch
            checked={form.allow_full}
            onCheckedChange={(v) => setForm({ ...form, allow_full: v })}
          />
        </div>
      </div>

      <Button
        className="mt-4 rounded-xl"
        disabled={busy}
        onClick={() =>
          run(
            () =>
              save({
                data: {
                  allow_full: form.allow_full,
                  full_discount_percent: form.full_discount_percent,
                  allowed_installments: form.allowed_installments
                    .split(",")
                    .map((n) => Number(n.trim()))
                    .filter((n) => n >= 1 && n <= 12),
                  max_installments: form.max_installments,
                  down_payment_percent: form.down_payment_percent,
                  due_day: form.due_day,
                  first_due_offset_days: form.first_due_offset_days,
                  late_after_days: form.late_after_days,
                },
              }),
            "تم حفظ إعدادات السداد",
          )
        }
      >
        <Save className="size-4" /> حفظ الإعدادات
      </Button>
    </Card>
  );
}

const emptyService = {
  id: null as string | null,
  slug: "",
  name_ar: "",
  description_ar: "",
  category: "other",
  price: 0,
  price_note: "",
  is_required: false,
  sort_order: 0,
  is_active: true,
};

function ServicesEditor({ data, run, busy }: Props) {
  const save = useServerFn(serviceSave);
  const remove = useServerFn(serviceDelete);
  const [draft, setDraft] = useState(emptyService);

  return (
    <Card title="الخدمات الإضافية وقيمة كل خدمة" icon={<Plus className="size-4" />}>
      <p className="mb-4 text-xs font-bold leading-relaxed text-muted-foreground">
        الخدمات المفعّلة تظهر لولي الأمر في خطوة الخدمات، وتُضاف قيمتها تلقائيًا إلى الفاتورة وجدول
        الدفعات — حتى للطلبات المدعومة من قُرّة.
      </p>

      <ul className="space-y-2">
        {(data?.services ?? []).map((service) => (
          <li
            key={service.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 p-3.5"
          >
            <div>
              <p className="text-xs font-black text-foreground">
                {service.name_ar}{" "}
                <span className="text-[11px] font-bold text-muted-foreground">
                  · {SERVICE_CATEGORIES[service.category] ?? service.category}
                </span>
              </p>
              <p className="text-[11px] font-bold text-muted-foreground">
                {money(Number(service.price))} {service.price_note ?? ""}{" "}
                {service.is_required ? "· إلزامية" : ""} {service.is_active ? "" : "· معطّلة"}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl"
                onClick={() =>
                  setDraft({
                    id: service.id,
                    slug: service.slug,
                    name_ar: service.name_ar,
                    description_ar: service.description_ar ?? "",
                    category: service.category,
                    price: Number(service.price),
                    price_note: service.price_note ?? "",
                    is_required: service.is_required,
                    sort_order: service.sort_order,
                    is_active: service.is_active,
                  })
                }
              >
                تعديل
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-xl text-destructive"
                disabled={busy}
                onClick={() => run(() => remove({ data: { id: service.id } }), "تم حذف الخدمة")}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-5 grid gap-3 rounded-2xl bg-muted/40 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="اسم الخدمة">
          <Input
            className="rounded-xl"
            value={draft.name_ar}
            onChange={(e) => setDraft({ ...draft, name_ar: e.target.value })}
            placeholder="مثال: النقل المدرسي"
          />
        </Field>
        <Field label="المعرّف (بالإنجليزية)">
          <Input
            className="rounded-xl"
            value={draft.slug}
            onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
            placeholder="bus"
          />
        </Field>
        <Field label="التصنيف">
          <select
            dir="rtl"
            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs font-bold"
            value={draft.category}
            onChange={(e) => setDraft({ ...draft, category: e.target.value })}
          >
            {Object.entries(SERVICE_CATEGORIES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="القيمة (ر.س)">
          <Input
            type="number"
            className="rounded-xl"
            value={draft.price}
            onChange={(e) => setDraft({ ...draft, price: num(e.target.value) })}
          />
        </Field>
        <Field label="ملاحظة السعر">
          <Input
            className="rounded-xl"
            value={draft.price_note}
            onChange={(e) => setDraft({ ...draft, price_note: e.target.value })}
            placeholder="سنويًا / لكل ترم"
          />
        </Field>
        <Field label="الترتيب">
          <Input
            type="number"
            className="rounded-xl"
            value={draft.sort_order}
            onChange={(e) => setDraft({ ...draft, sort_order: num(e.target.value) })}
          />
        </Field>
        <Field label="الوصف">
          <Textarea
            className="rounded-xl"
            rows={2}
            value={draft.description_ar}
            onChange={(e) => setDraft({ ...draft, description_ar: e.target.value })}
          />
        </Field>
        <div className="flex flex-col justify-end gap-2">
          <div className="flex items-center justify-between gap-2 rounded-xl border border-border/60 px-3 py-2">
            <span className="text-[11px] font-black text-muted-foreground">خدمة إلزامية</span>
            <Switch
              checked={draft.is_required}
              onCheckedChange={(v) => setDraft({ ...draft, is_required: v })}
            />
          </div>
          <div className="flex items-center justify-between gap-2 rounded-xl border border-border/60 px-3 py-2">
            <span className="text-[11px] font-black text-muted-foreground">مفعّلة</span>
            <Switch
              checked={draft.is_active}
              onCheckedChange={(v) => setDraft({ ...draft, is_active: v })}
            />
          </div>
        </div>
        <div className="flex items-end gap-2">
          <Button
            className="rounded-xl"
            disabled={busy}
            onClick={() =>
              run(
                () =>
                  save({
                    data: {
                      id: draft.id,
                      slug: draft.slug.trim(),
                      name_ar: draft.name_ar.trim(),
                      description_ar: draft.description_ar || null,
                      category: draft.category as
                        | "transportation"
                        | "uniform"
                        | "books"
                        | "meals"
                        | "activities"
                        | "other",
                      price: draft.price,
                      price_note: draft.price_note || null,
                      is_required: draft.is_required,
                      sort_order: draft.sort_order,
                      is_active: draft.is_active,
                    },
                  }).then(() => setDraft(emptyService)),
                "تم حفظ الخدمة",
              )
            }
          >
            <Save className="size-4" /> {draft.id ? "حفظ التعديل" : "إضافة خدمة"}
          </Button>
          {draft.id ? (
            <Button variant="ghost" className="rounded-xl" onClick={() => setDraft(emptyService)}>
              إلغاء
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

const emptyDiscount = {
  id: null as string | null,
  name_ar: "",
  description_ar: "",
  kind: "percent",
  value: 0,
  condition: "sibling",
  min_children: 2,
  max_amount: 0,
  is_active: true,
  sort_order: 0,
};

function Discounts({ data, run, busy }: Props) {
  const save = useServerFn(discountRuleSave);
  const remove = useServerFn(discountRuleDelete);
  const [draft, setDraft] = useState(emptyDiscount);

  return (
    <Card title="الخصومات الكاملة والجزئية" icon={<Percent className="size-4" />}>
      <ul className="space-y-2">
        {(data?.discountRules ?? []).map((rule) => (
          <li
            key={rule.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 p-3.5"
          >
            <div>
              <p className="text-xs font-black text-foreground">{rule.name_ar}</p>
              <p className="text-[11px] font-bold text-muted-foreground">
                {rule.kind === "percent" ? `${rule.value}%` : money(Number(rule.value))} ·{" "}
                {DISCOUNT_CONDITION_LABELS[rule.condition] ?? rule.condition}
                {rule.max_amount ? ` · حد أقصى ${money(Number(rule.max_amount))}` : ""}
                {rule.is_active ? "" : " · معطّل"}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl"
                onClick={() =>
                  setDraft({
                    id: rule.id,
                    name_ar: rule.name_ar,
                    description_ar: rule.description_ar ?? "",
                    kind: rule.kind,
                    value: Number(rule.value),
                    condition: rule.condition,
                    min_children: rule.min_children,
                    max_amount: Number(rule.max_amount ?? 0),
                    is_active: rule.is_active,
                    sort_order: rule.sort_order,
                  })
                }
              >
                تعديل
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-xl text-destructive"
                disabled={busy}
                onClick={() => run(() => remove({ data: { id: rule.id } }), "تم حذف الخصم")}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-5 grid gap-3 rounded-2xl bg-muted/40 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="اسم الخصم">
          <Input
            className="rounded-xl"
            value={draft.name_ar}
            onChange={(e) => setDraft({ ...draft, name_ar: e.target.value })}
          />
        </Field>
        <Field label="نوع الخصم">
          <select
            dir="rtl"
            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs font-bold"
            value={draft.kind}
            onChange={(e) => setDraft({ ...draft, kind: e.target.value })}
          >
            <option value="percent">نسبة مئوية</option>
            <option value="amount">مبلغ ثابت</option>
          </select>
        </Field>
        <Field label="القيمة">
          <Input
            type="number"
            className="rounded-xl"
            value={draft.value}
            onChange={(e) => setDraft({ ...draft, value: num(e.target.value) })}
          />
        </Field>
        <Field label="الشرط">
          <select
            dir="rtl"
            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs font-bold"
            value={draft.condition}
            onChange={(e) => setDraft({ ...draft, condition: e.target.value })}
          >
            {Object.entries(DISCOUNT_CONDITION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="أقل عدد أبناء">
          <Input
            type="number"
            className="rounded-xl"
            value={draft.min_children}
            onChange={(e) => setDraft({ ...draft, min_children: num(e.target.value, 1) })}
          />
        </Field>
        <Field label="الحد الأقصى للخصم (ر.س)">
          <Input
            type="number"
            className="rounded-xl"
            value={draft.max_amount}
            onChange={(e) => setDraft({ ...draft, max_amount: num(e.target.value) })}
          />
        </Field>
        <div className="flex items-center justify-between gap-2 rounded-xl border border-border/60 px-3">
          <span className="text-[11px] font-black text-muted-foreground">مفعّل</span>
          <Switch
            checked={draft.is_active}
            onCheckedChange={(v) => setDraft({ ...draft, is_active: v })}
          />
        </div>
        <div className="flex items-end gap-2">
          <Button
            className="rounded-xl"
            disabled={busy}
            onClick={() =>
              run(
                () =>
                  save({
                    data: {
                      id: draft.id,
                      name_ar: draft.name_ar.trim(),
                      description_ar: draft.description_ar || null,
                      kind: draft.kind as "percent" | "amount",
                      value: draft.value,
                      condition: draft.condition as
                        | "sibling"
                        | "staff"
                        | "orphan"
                        | "early_payment"
                        | "manual",
                      min_children: draft.min_children,
                      max_amount: draft.max_amount || null,
                      is_active: draft.is_active,
                      sort_order: draft.sort_order,
                    },
                  }).then(() => setDraft(emptyDiscount)),
                "تم حفظ الخصم",
              )
            }
          >
            <Save className="size-4" /> {draft.id ? "حفظ التعديل" : "إضافة خصم"}
          </Button>
          {draft.id ? (
            <Button variant="ghost" className="rounded-xl" onClick={() => setDraft(emptyDiscount)}>
              إلغاء
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function BankEditor({ data, run, busy }: Props) {
  const save = useServerFn(bankAccountSave);
  const remove = useServerFn(bankAccountDelete);
  const account = (data?.bankAccounts ?? [])[0];
  const [form, setForm] = useState({
    id: null as string | null,
    org_name_ar: "جمعية الصالحية الأهلية",
    school_name_ar: "روضة ومدارس المنال",
    logo_url: "",
    account_holder: "",
    bank_name: "",
    account_number: "",
    iban: "",
    notes_ar: "",
    is_default: true,
    is_active: true,
  });

  useEffect(() => {
    if (!account) return;
    setForm({
      id: account.id,
      org_name_ar: account.org_name_ar,
      school_name_ar: account.school_name_ar,
      logo_url: account.logo_url ?? "",
      account_holder: account.account_holder,
      bank_name: account.bank_name,
      account_number: account.account_number ?? "",
      iban: account.iban ?? "",
      notes_ar: account.notes_ar ?? "",
      is_default: account.is_default,
      is_active: account.is_active,
    });
  }, [account]);

  return (
    <Card title="بيانات الحساب البنكي في نموذج الدفع" icon={<Banknote className="size-4" />}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="اسم الجمعية">
          <Input
            className="rounded-xl"
            value={form.org_name_ar}
            onChange={(e) => setForm({ ...form, org_name_ar: e.target.value })}
          />
        </Field>
        <Field label="اسم الروضة/المدرسة">
          <Input
            className="rounded-xl"
            value={form.school_name_ar}
            onChange={(e) => setForm({ ...form, school_name_ar: e.target.value })}
          />
        </Field>
        <Field label="رابط الشعار">
          <Input
            className="rounded-xl"
            value={form.logo_url}
            onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
            placeholder="https://..."
          />
        </Field>
        <Field label="اسم صاحب الحساب">
          <Input
            className="rounded-xl"
            value={form.account_holder}
            onChange={(e) => setForm({ ...form, account_holder: e.target.value })}
          />
        </Field>
        <Field label="اسم البنك">
          <Input
            className="rounded-xl"
            value={form.bank_name}
            onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
          />
        </Field>
        <Field label="رقم الحساب">
          <Input
            className="rounded-xl"
            value={form.account_number}
            onChange={(e) => setForm({ ...form, account_number: e.target.value })}
          />
        </Field>
        <Field label="الآيبان">
          <Input
            className="rounded-xl"
            value={form.iban}
            onChange={(e) => setForm({ ...form, iban: e.target.value })}
            placeholder="SA00 0000 0000 0000"
          />
        </Field>
        <Field label="ملاحظات التحويل">
          <Textarea
            rows={2}
            className="rounded-xl"
            value={form.notes_ar}
            onChange={(e) => setForm({ ...form, notes_ar: e.target.value })}
          />
        </Field>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button
          className="rounded-xl"
          disabled={busy}
          onClick={() =>
            run(
              () =>
                save({
                  data: {
                    id: form.id,
                    org_name_ar: form.org_name_ar.trim(),
                    school_name_ar: form.school_name_ar.trim(),
                    logo_url: form.logo_url || null,
                    account_holder: form.account_holder.trim(),
                    bank_name: form.bank_name.trim(),
                    account_number: form.account_number || null,
                    iban: form.iban || null,
                    notes_ar: form.notes_ar || null,
                    is_default: true,
                    is_active: true,
                  },
                }),
              "تم حفظ بيانات الحساب البنكي",
            )
          }
        >
          <Save className="size-4" /> حفظ بيانات الحساب
        </Button>
        {form.id ? (
          <Button
            variant="ghost"
            className="rounded-xl text-destructive"
            disabled={busy}
            onClick={() => run(() => remove({ data: { id: form.id! } }), "تم حذف الحساب")}
          >
            <Trash2 className="size-4" /> حذف
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

function Messages({ data, run, busy }: Props) {
  const save = useServerFn(financeSettingsSave);
  const s = data?.settings;
  const [form, setForm] = useState({
    qurra_message_ar: "",
    qurra_services_message_ar: "",
    whatsapp_template: "",
    reminder_days_before: 3,
  });

  useEffect(() => {
    if (!s) return;
    setForm({
      qurra_message_ar: s.qurra_message_ar,
      qurra_services_message_ar: s.qurra_services_message_ar,
      whatsapp_template: s.whatsapp_template,
      reminder_days_before: s.reminder_days_before,
    });
  }, [s]);

  return (
    <Card title="رسائل قُرّة وقوالب التذكير عبر واتساب" icon={<MessageSquare className="size-4" />}>
      <div className="grid gap-3">
        <Field label="رسالة قُرّة (تغطية كاملة للرسوم الدراسية)">
          <Textarea
            rows={2}
            className="rounded-xl"
            value={form.qurra_message_ar}
            onChange={(e) => setForm({ ...form, qurra_message_ar: e.target.value })}
          />
        </Field>
        <Field label="رسالة قُرّة عند وجود خدمات إضافية مدفوعة">
          <Textarea
            rows={2}
            className="rounded-xl"
            value={form.qurra_services_message_ar}
            onChange={(e) => setForm({ ...form, qurra_services_message_ar: e.target.value })}
          />
        </Field>
        <Field label="قالب رسالة واتساب — المتغيرات: {parent} {child} {seq} {amount} {due} {school}">
          <Textarea
            rows={4}
            className="rounded-xl"
            value={form.whatsapp_template}
            onChange={(e) => setForm({ ...form, whatsapp_template: e.target.value })}
          />
        </Field>
        <Field label="التنبيه قبل الاستحقاق بـ (أيام)">
          <Input
            type="number"
            className="rounded-xl"
            value={form.reminder_days_before}
            onChange={(e) => setForm({ ...form, reminder_days_before: num(e.target.value, 3) })}
          />
        </Field>
      </div>

      <Button
        className="mt-4 rounded-xl"
        disabled={busy || !s}
        onClick={() =>
          run(
            () =>
              save({
                data: {
                  id: s!.id,
                  qurra_message_ar: form.qurra_message_ar.trim(),
                  qurra_services_message_ar: form.qurra_services_message_ar.trim(),
                  whatsapp_template: form.whatsapp_template.trim(),
                  reminder_days_before: form.reminder_days_before,
                },
              }),
            "تم حفظ الرسائل والقوالب",
          )
        }
      >
        <Save className="size-4" /> حفظ الرسائل
      </Button>
    </Card>
  );
}

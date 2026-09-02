import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import { AmsShell } from "@/features/ams/components/AmsShell";
import { FormBuilder } from "@/features/ams/components/form-builder/FormBuilder";
import { SeasonsBoard } from "@/features/ams/components/seasons/SeasonsBoard";
import { useAuth } from "@/features/auth/AuthProvider";

export const Route = createFileRoute("/_authenticated/ams/system/registration")({
  head: () => ({
    meta: [
      { title: "إعدادات نظام التسجيل — مدارس وروضة المنال" },
      {
        name: "description",
        content: "مواسم التسجيل وفتح باب القبول، وتخصيص مراحل نموذج التسجيل وحقوله ومستنداته.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RegistrationSettingsPage,
});

const TABS = [
  { key: "seasons" as const, label: "مواسم التسجيل والقبول", icon: CalendarClock },
  { key: "form" as const, label: "تخصيص نموذج التسجيل", icon: SlidersHorizontal },
];

function RegistrationSettingsPage() {
  const { roles } = useAuth();
  const [tab, setTab] = useState<"seasons" | "form">("seasons");
  const canBuildForm = (roles as string[]).some((r) => r === "admin" || r === "supervisor");

  return (
    <AmsShell
      title="إعدادات نظام التسجيل"
      description="مواسم القبول وفتح وإغلاق التسجيل، مع التحكم الكامل في مراحل نموذج التسجيل وحقوله ومستنداته"
      wide
    >
      <div className="flex flex-wrap gap-2 rounded-[1.5rem] border border-border/60 bg-card/80 p-2 shadow-sm">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-colors ${
              tab === item.key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <item.icon className="size-4" />
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "seasons" ? (
          <SeasonsBoard />
        ) : canBuildForm ? (
          <FormBuilder />
        ) : (
          <div className="rounded-3xl border-2 border-dashed border-border/70 bg-card p-10 text-center">
            <p className="text-sm font-black text-foreground">
              تخصيص نموذج التسجيل متاح لمدير النظام والمشرف فقط.
            </p>
          </div>
        )}
      </div>
    </AmsShell>
  );
}

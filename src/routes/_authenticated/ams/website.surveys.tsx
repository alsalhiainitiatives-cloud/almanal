import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AccessNotice } from "@/features/ams/components/AccessNotice";
import { AmsShell } from "@/features/ams/components/AmsShell";
import { useAuth } from "@/features/auth/AuthProvider";
import { P } from "@/features/auth/rbac";
import { SurveyManager } from "@/features/surveys/components/SurveyManager";
import { listSurveys, type SurveyWithQuestions } from "@/features/surveys/surveys";

export const Route = createFileRoute("/_authenticated/ams/website/surveys")({
  head: () => ({
    meta: [
      { title: "الاستبانات وآراء أولياء الأمور | مدارس وروضة المنال" },
      {
        name: "description",
        content: "إنشاء ونشر وتحليل استبانات أولياء الأمور من داخل الموقع الإلكتروني.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SurveysPage,
});

function SurveysPage() {
  const { hasAnyPermission } = useAuth();
  const canView = hasAnyPermission([P.surveysView, P.surveysCreate, P.surveysAnalytics]);
  const [surveys, setSurveys] = useState<SurveyWithQuestions[]>([]);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try {
      setSurveys(await listSurveys());
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر تحميل الاستبانات");
    }
  }, []);
  useEffect(() => {
    if (canView) void refresh();
  }, [canView, refresh]);

  return (
    <AmsShell
      title="الاستبانات وآراء أولياء الأمور"
      description="صمّم استبانات مرنة، اجمع صوت الأسرة، واتخذ قرارات تعليمية مبنية على البيانات."
      wide
    >
      {!canView ? (
        <AccessNotice message="لا تملك صلاحية إدارة الاستبانات." />
      ) : error ? (
        <div className="rounded-[1.75rem] border border-destructive/30 bg-destructive/10 p-6 text-sm font-bold text-destructive">
          {error}
        </div>
      ) : (
        <SurveyManager surveys={surveys} onRefresh={refresh} />
      )}
    </AmsShell>
  );
}

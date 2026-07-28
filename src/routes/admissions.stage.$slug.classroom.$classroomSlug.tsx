import { useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Clock, Loader2, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";

import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { Button } from "@/components/ui/button";
import { getStageBundle } from "@/features/admissions/catalog.functions";
import { createApplication } from "@/features/admissions/application.functions";
import { seatsLeft } from "@/features/admissions/eligibility";
import { stageGallery } from "@/features/admissions/media";
import { supabase } from "@/integrations/supabase/client";

const stageQuery = (slug: string) =>
  queryOptions({
    queryKey: ["admissions", "stage", slug],
    queryFn: () => getStageBundle({ data: slug }),
  });

export const Route = createFileRoute("/admissions/stage/$slug/classroom/$classroomSlug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(stageQuery(params.slug));
    if (!data) throw notFound();
    const classroom = data.classrooms.find((c: { slug: string }) => c.slug === params.classroomSlug);
    if (!classroom) throw notFound();
    return { stage: data.stage, classroom };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "الفصل غير متاح" }, { name: "robots", content: "noindex" }] };
    }
    const t = `${loaderData.classroom.name_ar} — ${loaderData.stage.name_ar} | مدارس وروضة المنال`;
    const d =
      loaderData.classroom.description_ar?.slice(0, 155) ??
      `تفاصيل فصل ${loaderData.classroom.name_ar}: المعلمة، السعة، المقاعد المتاحة وأسلوب التعلم.`;
    return {
      meta: [
        { title: t },
        { name: "description", content: d },
        { property: "og:title", content: t },
        { property: "og:description", content: d },
        { property: "og:type", content: "article" },
      ],
    };
  },
  notFoundComponent: ClassroomMissing,
  errorComponent: ClassroomMissing,
  component: ClassroomDetailPage,
});

function ClassroomMissing() {
  return (
    <div className="section-y text-center">
      <p className="text-xl font-black text-foreground">لم نعثر على هذا الفصل</p>
      <Button asChild variant="hero" className="mt-6">
        <Link to="/admissions">العودة للمراحل</Link>
      </Button>
    </div>
  );
}

function ClassroomDetailPage() {
  const { slug, classroomSlug } = Route.useParams();
  const { data } = useSuspenseQuery(stageQuery(slug));
  const navigate = useNavigate();
  const start = useServerFn(createApplication);
  const [busy, setBusy] = useState(false);

  const classroom = data?.classrooms.find((c) => c.slug === classroomSlug);
  if (!data || !classroom) return <ClassroomMissing />;

  const stage = data.stage;
  const left = seatsLeft(classroom);
  const gallery = stageGallery(classroom.slug);

  async function handleStart() {
    if (!classroom) return;
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        toast.info("سجّل الدخول أو أنشئ حسابًا لمتابعة الطلب");
        navigate({ to: "/auth" });
        return;
      }
      const res = await start({ data: { stageId: stage.id, classroomId: classroom.id } });
      navigate({ to: "/apply/$applicationId", params: { applicationId: res.id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر بدء الطلب");
    } finally {
      setBusy(false);
    }
  }

  const ageLabel = `${Math.round(classroom.min_age_months / 12 * 10) / 10} – ${
    Math.round(classroom.max_age_months / 12 * 10) / 10
  } سنة`;

  return (
    <>
      <PageHero eyebrow={stage.name_ar} title={classroom.name_ar} description={classroom.description_ar ?? ""} />

      <section className="section-y">
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          <Reveal>
            <div className="rounded-[2.5rem] bg-card p-8 shadow-card">
              <div className="flex flex-wrap items-center gap-4">
                <span
                  aria-hidden
                  className="size-12 rounded-2xl ring-2 ring-border"
                  style={{ backgroundColor: classroom.color_hex }}
                />
                <div>
                  <p className="text-lg font-black text-foreground">
                    {classroom.color_label ?? "لون الفصل"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {classroom.teacher_name} — {classroom.teacher_title ?? "معلمة الفصل"}
                  </p>
                </div>
                <span
                  className={`ms-auto rounded-full px-4 py-1.5 text-xs font-black ${
                    left > 0 ? "bg-mint text-foreground" : "bg-destructive/90 text-primary-foreground"
                  }`}
                >
                  {left > 0 ? `${left} مقعد متاح من ${classroom.capacity}` : "اكتمل العدد"}
                </span>
              </div>

              <dl className="mt-8 grid gap-4 sm:grid-cols-3">
                <Fact icon={Users} label="الفئة العمرية" value={ageLabel} />
                <Fact icon={Clock} label="جدول الفصل" value={classroom.schedule_ar ?? "—"} />
                <Fact
                  icon={Sparkles}
                  label="أسلوب التعلم"
                  value={classroom.learning_style_ar ?? "—"}
                />
              </dl>

              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {gallery.map((g) => (
                  <img
                    key={g.src}
                    src={g.src}
                    alt={g.alt}
                    loading="lazy"
                    className="aspect-square w-full rounded-2xl object-cover"
                  />
                ))}
              </div>

              {(classroom.teacher_qualification || classroom.teacher_experience || teamList.length > 0) && (
                <div className="mt-10 rounded-3xl bg-background/70 p-6">
                  <h2 className="text-base font-black text-foreground">المعلمات ومؤهلاتهن</h2>
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {classroom.teacher_name ? (
                      <li className="rounded-2xl bg-card p-4 shadow-soft">
                        <p className="text-sm font-black text-foreground">{classroom.teacher_name}</p>
                        <p className="text-xs font-bold text-secondary">
                          {classroom.teacher_title ?? "معلمة الفصل"}
                        </p>
                        {classroom.teacher_qualification ? (
                          <p className="mt-2 text-xs text-muted-foreground">{classroom.teacher_qualification}</p>
                        ) : null}
                        {classroom.teacher_experience ? (
                          <p className="mt-1 text-xs text-muted-foreground">{classroom.teacher_experience}</p>
                        ) : null}
                      </li>
                    ) : null}
                    {teamList.map((t, i) => (
                      <li key={`${t.name}-${i}`} className="rounded-2xl bg-card p-4 shadow-soft">
                        <p className="text-sm font-black text-foreground">{t.name}</p>
                        {t.title ? <p className="text-xs font-bold text-secondary">{t.title}</p> : null}
                        {t.qualification ? (
                          <p className="mt-2 text-xs text-muted-foreground">{t.qualification}</p>
                        ) : null}
                        {t.experience ? <p className="mt-1 text-xs text-muted-foreground">{t.experience}</p> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {daySlots.length > 0 && (
                <div className="mt-6 rounded-3xl bg-background/70 p-6">
                  <h2 className="text-base font-black text-foreground">اليوم الدراسي بالتفصيل</h2>
                  <ol className="mt-4 space-y-2">
                    {daySlots.map((slot, i) => (
                      <li
                        key={`${slot.time}-${i}`}
                        className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-soft"
                      >
                        <span className="min-w-24 text-xs font-black text-primary">{slot.time}</span>
                        <span className="text-sm text-foreground">{slot.activity}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <div className="mt-10 flex flex-wrap gap-3">
                <Button variant="hero" size="lg" onClick={handleStart} disabled={busy || left <= 0}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                  ابدأ التسجيل في هذا الفصل
                  <ArrowLeft className="size-4" />
                </Button>
                <Button asChild variant="soft" size="lg">
                  <Link to="/admissions/stage/$slug/classrooms" params={{ slug }}>
                    العودة للفصول
                  </Link>
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl bg-background/70 p-4">
      <dt className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
        <Icon className="size-3.5 text-primary" />
        {label}
      </dt>
      <dd className="mt-1.5 text-sm font-black text-foreground">{value}</dd>
    </div>
  );
}

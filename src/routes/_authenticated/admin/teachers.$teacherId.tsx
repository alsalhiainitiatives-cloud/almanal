import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Armchair,
  CalendarRange,
  ClipboardCheck,
  Loader2,
  MessagesSquare,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { adminTeacherDetail } from "@/features/academics/calendar.functions";
import { useAuth } from "@/features/auth/AuthProvider";
import { PortalLayout } from "@/features/auth/components/PortalLayout";
import { P } from "@/features/auth/rbac";
import { NoAccess } from "./users";

export const Route = createFileRoute("/_authenticated/admin/teachers/$teacherId")({
  head: () => ({
    meta: [
      { title: "تفاصيل المعلمة | بوابة المنال" },
      {
        name: "description",
        content: "ملف المعلمة: فصولها المسندة وخططها الدراسية ونشاط محادثات الفصل والتقييمات.",
      },
      { property: "og:title", content: "تفاصيل المعلمة | بوابة المنال" },
      {
        property: "og:description",
        content: "عرض شامل لفصول المعلمة وخططها الدراسية ومحادثاتها.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TeacherDetailPage,
});

const dateFmt = new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" });
const dateTimeFmt = new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" });

function TeacherDetailPage() {
  const { teacherId } = Route.useParams();
  const { hasPermission, loadingContext } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "teacher-detail", teacherId],
    queryFn: () => adminTeacherDetail({ data: { teacherId } }),
    enabled: hasPermission(P.usersView),
  });

  if (!loadingContext && !hasPermission(P.usersView)) return <NoAccess />;

  const teacher = data?.teacher;

  return (
    <PortalLayout
      title={teacher ? `المعلمة ${teacher.fullName}` : "تفاصيل المعلمة"}
      description="الفصول المسندة، الخطط الدراسية، ومحادثات الفصل — كل ما يخص المعلمة في صفحة واحدة."
    >
      <div className="space-y-5">
        <Button asChild variant="outline" className="rounded-2xl font-bold">
          <Link to="/ams/system/users">
            <ArrowRight className="size-4" />
            رجوع إلى المستخدمين
          </Link>
        </Button>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-[2rem] border border-border/60 bg-card p-16 text-sm font-bold text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> جارِ تحميل ملف المعلمة…
          </div>
        ) : error ? (
          <div className="rounded-[2rem] border border-destructive/30 bg-destructive/5 p-8 text-center text-sm font-bold text-foreground">
            {error instanceof Error ? error.message : "تعذّر تحميل ملف المعلمة."}
          </div>
        ) : !teacher ? (
          <div className="rounded-[2rem] border-2 border-dashed border-border/70 bg-card p-10 text-center text-sm font-black text-foreground">
            لم يتم العثور على هذه المعلمة.
          </div>
        ) : (
          <>
            <section className="rounded-[2rem] border border-border/60 bg-card p-6 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-extrabold text-foreground">{teacher.fullName}</h2>
                  <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
                    {teacher.email ?? teacher.phone ?? "—"}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                    آخر دخول:{" "}
                    {teacher.lastLoginAt ? dateTimeFmt.format(new Date(teacher.lastLoginAt)) : "—"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  <Stat icon={Armchair} label="الفصول" value={data.totals.classrooms} />
                  <Stat icon={Users} label="الطلاب" value={data.totals.students} />
                  <Stat icon={CalendarRange} label="الخطط" value={data.totals.plans} />
                  <Stat icon={MessagesSquare} label="الرسائل" value={data.totals.messages} />
                  <Stat icon={ClipboardCheck} label="التقييمات" value={data.totals.assessments} />
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-border/60 bg-card p-6 shadow-soft">
              <h3 className="text-base font-extrabold text-foreground">الفصول المسندة</h3>
              {data.classrooms.length === 0 ? (
                <p className="mt-3 rounded-2xl border-2 border-dashed border-border/70 p-6 text-center text-xs font-bold text-muted-foreground">
                  لم يتم إسناد أي فصل لهذه المعلمة بعد — يمكن الإسناد من «إسناد المعلمات».
                </p>
              ) : (
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {data.classrooms.map((room) => (
                    <div
                      key={room.id}
                      className="rounded-2xl border border-border/60 p-4"
                      style={{ borderInlineStartWidth: 5, borderInlineStartColor: room.colorHex }}
                    >
                      <p className="text-sm font-extrabold text-foreground">{room.nameAr}</p>
                      <p className="text-[11px] text-muted-foreground">{room.stageNameAr}</p>
                      <dl className="mt-3 grid grid-cols-2 gap-1.5 text-[11px] font-bold text-muted-foreground">
                        <div>الطلاب: {room.studentCount} / {room.capacity}</div>
                        <div>الخطط: {room.plansCount}</div>
                        <div>منشورة: {room.publishedPlansCount}</div>
                        <div>الرسائل: {room.messagesCount}</div>
                        <div>التقييمات: {room.assessmentsCount}</div>
                      </dl>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[2rem] border border-border/60 bg-card p-6 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-extrabold text-foreground">الخطط الدراسية</h3>
                <Button asChild size="sm" variant="outline" className="rounded-xl font-bold">
                  <Link to="/ams/academics/calendar">تقويم الفصل</Link>
                </Button>
              </div>
              {data.plans.length === 0 ? (
                <p className="mt-3 rounded-2xl border-2 border-dashed border-border/70 p-6 text-center text-xs font-bold text-muted-foreground">
                  لا توجد خطط دراسية بعد.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[640px] text-start text-sm">
                    <thead className="bg-muted/60 text-xs font-bold text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2.5 text-start">الخطة</th>
                        <th className="px-4 py-2.5 text-start">الفصل</th>
                        <th className="px-4 py-2.5 text-start">الفترة</th>
                        <th className="px-4 py-2.5 text-start">الدروس</th>
                        <th className="px-4 py-2.5 text-start">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.plans.map((plan) => (
                        <tr key={plan.id} className="border-t border-border/60">
                          <td className="px-4 py-3 font-bold text-foreground">
                            {plan.titleAr?.trim() ||
                              (plan.planType === "monthly" ? "خطة شهرية" : "خطة أسبوعية")}
                          </td>
                          <td className="px-4 py-3 text-xs font-semibold">{plan.classroomName}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {dateFmt.format(new Date(`${plan.startDate}T00:00:00`))} —{" "}
                            {dateFmt.format(new Date(`${plan.endDate}T00:00:00`))}
                          </td>
                          <td className="px-4 py-3 text-xs font-bold">{plan.itemsCount}</td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={plan.published ? "default" : "outline"}
                              className="rounded-full text-[10px] font-bold"
                            >
                              {plan.published ? "منشورة" : "مسودة"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-[2rem] border border-border/60 bg-card p-6 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-extrabold text-foreground">أحدث محادثات الفصل</h3>
                <Button asChild size="sm" variant="outline" className="rounded-xl font-bold">
                  <Link to="/ams/academics/chat">فتح المحادثات</Link>
                </Button>
              </div>
              {data.messages.length === 0 ? (
                <p className="mt-3 rounded-2xl border-2 border-dashed border-border/70 p-6 text-center text-xs font-bold text-muted-foreground">
                  لا توجد رسائل في فصول هذه المعلمة.
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {data.messages.map((message) => (
                    <li key={message.id} className="rounded-2xl border border-border/60 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] font-extrabold text-primary">
                          {message.classroomName}
                        </span>
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          {dateTimeFmt.format(new Date(message.createdAt))}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs font-semibold text-foreground">
                        {message.body}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </PortalLayout>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/30 px-3 py-2 text-center">
      <Icon className="mx-auto size-4 text-primary" />
      <p className="mt-1 text-base font-extrabold text-foreground">{value}</p>
      <p className="text-[10px] font-bold text-muted-foreground">{label}</p>
    </div>
  );
}

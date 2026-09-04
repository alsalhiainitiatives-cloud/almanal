/**
 * Survey & feedback engine (client data layer).
 *
 * RLS is the security boundary: staff writes require the `surveys.*`
 * permissions, parents can only read `active` surveys and write their own
 * responses / status rows. This module only shapes the data for the UI.
 */
import { supabase } from "@/integrations/supabase/client";

export type SurveyStatus = "draft" | "active" | "closed";

export type QuestionType =
  | "text"
  | "single_choice"
  | "multiple_choice"
  | "rating_stars"
  | "likert_scale";

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  text: "إجابة نصية",
  single_choice: "اختيار واحد",
  multiple_choice: "اختيار متعدد",
  rating_stars: "تقييم بالنجوم",
  likert_scale: "مقياس ليكرت (١–٥)",
};

export const SURVEY_STATUS_LABELS: Record<SurveyStatus, string> = {
  draft: "مسودة",
  active: "منشورة",
  closed: "مغلقة",
};

export const LIKERT_LABELS = ["غير موافق بشدة", "غير موافق", "محايد", "موافق", "موافق بشدة"];

export const SNOOZE_OPTIONS = [
  { value: 1, label: "ساعة واحدة" },
  { value: 24, label: "٢٤ ساعة" },
  { value: 72, label: "٣ أيام" },
  { value: 168, label: "أسبوع" },
];

export type SurveyAudienceKind = "all" | "stages" | "classrooms";

export const AUDIENCE_LABELS: Record<SurveyAudienceKind, string> = {
  all: "جميع أولياء الأمور",
  stages: "أولياء أمور مراحل محددة",
  classrooms: "أولياء أمور فصول محددة",
};

export type SurveyOption = {
  id: string;
  question_id: string;
  option_text: string;
  order_index: number;
};

export type SurveyQuestion = {
  id: string;
  survey_id: string;
  question_text: string;
  question_type: QuestionType;
  order_index: number;
  is_required: boolean;
  options: SurveyOption[];
};

export type Survey = {
  id: string;
  title: string;
  description: string | null;
  status: SurveyStatus;
  is_mandatory: boolean;
  allow_snooze: boolean;
  snooze_duration_hours: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  audience_kind: SurveyAudienceKind;
  target_stage_ids: string[];
  target_classroom_ids: string[];
};

export type SurveyWithQuestions = Survey & { questions: SurveyQuestion[] };

export type SurveyAnswer = {
  id: string;
  response_id: string;
  question_id: string;
  answer_text: string | null;
  answer_numeric: number | null;
};

export type SurveyResponse = {
  id: string;
  survey_id: string;
  parent_id: string;
  submitted_at: string;
};

export type QuestionDraft = {
  id?: string;
  question_text: string;
  question_type: QuestionType;
  is_required: boolean;
  options: string[];
};

export type SurveyDraft = {
  id?: string;
  title: string;
  description: string;
  status: SurveyStatus;
  is_mandatory: boolean;
  allow_snooze: boolean;
  snooze_duration_hours: number;
  start_date: string | null;
  end_date: string | null;
  audience_kind: SurveyAudienceKind;
  target_stage_ids: string[];
  target_classroom_ids: string[];
  questions: QuestionDraft[];
};

export function emptySurveyDraft(): SurveyDraft {
  return {
    title: "",
    description: "",
    status: "draft",
    is_mandatory: false,
    allow_snooze: true,
    snooze_duration_hours: 24,
    start_date: null,
    end_date: null,
    audience_kind: "all",
    target_stage_ids: [],
    target_classroom_ids: [],
    questions: [],
  };
}

const orderQuestions = (rows: unknown[]): SurveyQuestion[] =>
  (rows as SurveyQuestion[])
    .map((q) => ({
      ...q,
      options: (q.options ?? []).slice().sort((a, b) => a.order_index - b.order_index),
    }))
    .sort((a, b) => a.order_index - b.order_index);

/** Staff: every survey with its questions and options. */
export async function listSurveys(): Promise<SurveyWithQuestions[]> {
  const { data, error } = await supabase
    .from("surveys")
    .select(
      "id, title, description, status, is_mandatory, allow_snooze, snooze_duration_hours, start_date, end_date, created_at, audience_kind, target_stage_ids, target_classroom_ids, survey_questions(id, survey_id, question_text, question_type, order_index, is_required, survey_options(id, question_id, option_text, order_index))",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row) => {
    const { survey_questions: questions, ...survey } = row as Record<string, unknown> & {
      survey_questions: unknown[];
    };
    return {
      ...(survey as unknown as Survey),
      questions: orderQuestions(
        (questions ?? []).map((q) => {
          const { survey_options: options, ...rest } = q as Record<string, unknown> & {
            survey_options: unknown[];
          };
          return { ...rest, options: options ?? [] };
        }),
      ),
    };
  });
}

export function draftFromSurvey(survey: SurveyWithQuestions): SurveyDraft {
  return {
    id: survey.id,
    title: survey.title,
    description: survey.description ?? "",
    status: survey.status,
    is_mandatory: survey.is_mandatory,
    allow_snooze: survey.allow_snooze,
    snooze_duration_hours: survey.snooze_duration_hours,
    start_date: survey.start_date,
    end_date: survey.end_date,
    audience_kind: survey.audience_kind ?? "all",
    target_stage_ids: survey.target_stage_ids ?? [],
    target_classroom_ids: survey.target_classroom_ids ?? [],
    questions: survey.questions.map((q) => ({
      id: q.id,
      question_text: q.question_text,
      question_type: q.question_type,
      is_required: q.is_required,
      options: q.options.map((o) => o.option_text),
    })),
  };
}

export function validateDraft(draft: SurveyDraft): string | null {
  if (draft.title.trim().length < 3) return "عنوان الاستبانة مطلوب (٣ أحرف على الأقل).";
  if (draft.title.trim().length > 160) return "عنوان الاستبانة طويل جدًا.";
  if (!draft.questions.length) return "أضف سؤالًا واحدًا على الأقل.";
  for (const [index, q] of draft.questions.entries()) {
    if (!q.question_text.trim()) return `نص السؤال رقم ${index + 1} مطلوب.`;
    if (q.question_text.length > 400) return `نص السؤال رقم ${index + 1} طويل جدًا.`;
    if (
      (q.question_type === "single_choice" || q.question_type === "multiple_choice") &&
      q.options.filter((o) => o.trim()).length < 2
    ) {
      return `السؤال رقم ${index + 1} يحتاج خيارين على الأقل.`;
    }
  }
  if (draft.audience_kind === "stages" && !draft.target_stage_ids.length) {
    return "اختر مرحلة دراسية واحدة على الأقل لتخصيص الاستبانة.";
  }
  if (draft.audience_kind === "classrooms" && !draft.target_classroom_ids.length) {
    return "اختر فصلًا واحدًا على الأقل لتخصيص الاستبانة.";
  }
  if (draft.start_date && draft.end_date && draft.start_date > draft.end_date) {
    return "تاريخ النهاية يجب أن يكون بعد تاريخ البداية.";
  }
  return null;
}

/** Create/update a survey together with its questions and options. */
export async function saveSurvey(draft: SurveyDraft): Promise<string> {
  const payload = {
    title: draft.title.trim(),
    description: draft.description.trim() || null,
    status: draft.status,
    is_mandatory: draft.is_mandatory,
    allow_snooze: draft.is_mandatory ? false : draft.allow_snooze,
    snooze_duration_hours: draft.snooze_duration_hours,
    start_date: draft.start_date,
    end_date: draft.end_date,
    audience_kind: draft.audience_kind,
    target_stage_ids: draft.audience_kind === "stages" ? draft.target_stage_ids : [],
    target_classroom_ids: draft.audience_kind === "classrooms" ? draft.target_classroom_ids : [],
  };

  let surveyId = draft.id;
  if (surveyId) {
    const { error } = await supabase.from("surveys").update(payload).eq("id", surveyId);
    if (error) throw error;
  } else {
    const { data: auth } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("surveys")
      .insert({ ...payload, created_by: auth.user?.id ?? null })
      .select("id")
      .single();
    if (error) throw error;
    surveyId = data.id;
  }

  // Questions are rewritten wholesale: simplest correct model for a builder
  // where rows are reordered, removed and retyped freely.
  const { error: wipeError } = await supabase
    .from("survey_questions")
    .delete()
    .eq("survey_id", surveyId);
  if (wipeError) throw wipeError;

  for (const [index, question] of draft.questions.entries()) {
    const { data: inserted, error } = await supabase
      .from("survey_questions")
      .insert({
        survey_id: surveyId,
        question_text: question.question_text.trim(),
        question_type: question.question_type,
        order_index: index,
        is_required: question.is_required,
      })
      .select("id")
      .single();
    if (error) throw error;

    const options = question.options.map((o) => o.trim()).filter(Boolean);
    if (
      options.length &&
      (question.question_type === "single_choice" || question.question_type === "multiple_choice")
    ) {
      const { error: optionError } = await supabase.from("survey_options").insert(
        options.map((option_text, order_index) => ({
          question_id: inserted.id,
          option_text,
          order_index,
        })),
      );
      if (optionError) throw optionError;
    }
  }

  return surveyId;
}

export async function setSurveyStatus(id: string, status: SurveyStatus) {
  const { error } = await supabase.from("surveys").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteSurvey(id: string) {
  const { error } = await supabase.from("surveys").delete().eq("id", id);
  if (error) throw error;
}

export type SurveyResults = {
  responses: SurveyResponse[];
  answers: SurveyAnswer[];
  parents: Record<string, string>;
};

/** Staff: raw responses for analytics and exports. */
export async function loadSurveyResults(surveyId: string): Promise<SurveyResults> {
  const { data: responses, error } = await supabase
    .from("survey_responses")
    .select("id, survey_id, parent_id, submitted_at")
    .eq("survey_id", surveyId)
    .order("submitted_at", { ascending: false });
  if (error) throw error;

  const ids = (responses ?? []).map((r) => r.id);
  const parentIds = [...new Set((responses ?? []).map((r) => r.parent_id))];

  const [answers, profiles] = await Promise.all([
    ids.length
      ? supabase
          .from("survey_answers")
          .select("id, response_id, question_id, answer_text, answer_numeric")
          .in("response_id", ids)
      : Promise.resolve({ data: [] as SurveyAnswer[], error: null }),
    parentIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", parentIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[], error: null }),
  ]);
  if (answers.error) throw answers.error;

  const parents: Record<string, string> = {};
  for (const profile of (profiles.data ?? []) as { id: string; full_name: string | null }[]) {
    parents[profile.id] = profile.full_name ?? "ولي أمر";
  }

  return {
    responses: (responses ?? []) as SurveyResponse[],
    answers: (answers.data ?? []) as SurveyAnswer[],
    parents,
  };
}

/* ------------------------- Audience targeting ------------------------- */

export type StageWithClassrooms = {
  id: string;
  name_ar: string;
  classrooms: { id: string; name_ar: string }[];
};

/** Stage + classroom tree used by the builder to pick the survey audience. */
export async function listStagesWithClassrooms(): Promise<StageWithClassrooms[]> {
  const [{ data: stages }, { data: classrooms }] = await Promise.all([
    supabase.from("stages").select("id, name_ar, sort_order").order("sort_order"),
    supabase.from("classrooms").select("id, name_ar, stage_id, sort_order").order("sort_order"),
  ]);
  return (stages ?? []).map((stage) => ({
    id: stage.id,
    name_ar: stage.name_ar,
    classrooms: (classrooms ?? [])
      .filter((room) => room.stage_id === stage.id)
      .map((room) => ({ id: room.id, name_ar: room.name_ar })),
  }));
}

export type ParentAudience = { stageIds: string[]; classroomIds: string[] };

/** Stages and classrooms of the children currently linked to this parent. */
export async function parentAudience(parentId: string): Promise<ParentAudience> {
  const { data } = await supabase
    .from("application_children")
    .select("stage_id, classroom_id, applications!inner (parent_id)")
    .eq("applications.parent_id", parentId)
    .limit(200);
  const rows = (data ?? []) as { stage_id: string | null; classroom_id: string | null }[];
  return {
    stageIds: [...new Set(rows.map((r) => r.stage_id).filter((id): id is string => Boolean(id)))],
    classroomIds: [
      ...new Set(rows.map((r) => r.classroom_id).filter((id): id is string => Boolean(id))),
    ],
  };
}

/** A survey reaches a parent when it targets everyone, or one of their stages/classes. */
export function matchesAudience(survey: Survey, audience: ParentAudience): boolean {
  if ((survey.audience_kind ?? "all") === "all") return true;
  if (survey.audience_kind === "stages") {
    return (survey.target_stage_ids ?? []).some((id) => audience.stageIds.includes(id));
  }
  return (survey.target_classroom_ids ?? []).some((id) => audience.classroomIds.includes(id));
}

/* ------------------------- Parent side ------------------------- */

export type PendingSurvey = { survey: SurveyWithQuestions; mustAnswer: boolean };

/**
 * The next survey a parent should see: active, inside its date window,
 * not completed, and not snoozed into the future.
 */
export async function nextSurveyForParent(parentId: string): Promise<PendingSurvey | null> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("surveys")
    .select(
      "id, title, description, status, is_mandatory, allow_snooze, snooze_duration_hours, start_date, end_date, created_at, audience_kind, target_stage_ids, target_classroom_ids, survey_questions(id, survey_id, question_text, question_type, order_index, is_required, survey_options(id, question_id, option_text, order_index))",
    )
    .eq("status", "active")
    .order("created_at", { ascending: true });
  if (error) throw error;

  const [statuses, responses, audience] = await Promise.all([
    supabase
      .from("parent_survey_status")
      .select("survey_id, status, snoozed_until")
      .eq("parent_id", parentId),
    supabase.from("survey_responses").select("survey_id").eq("parent_id", parentId),
    parentAudience(parentId),
  ]);

  const answered = new Set((responses.data ?? []).map((r) => r.survey_id));
  const statusMap = new Map(
    (statuses.data ?? []).map((s) => [
      s.survey_id,
      s as { status: string; snoozed_until: string | null },
    ]),
  );

  for (const row of data ?? []) {
    const { survey_questions: questions, ...rest } = row as Record<string, unknown> & {
      survey_questions: unknown[];
    };
    const survey = rest as unknown as Survey;
    if (survey.start_date && survey.start_date > now) continue;
    if (survey.end_date && survey.end_date < now) continue;
    if (answered.has(survey.id)) continue;
    if (!matchesAudience(survey, audience)) continue;

    const state = statusMap.get(survey.id);
    if (state?.status === "completed") continue;
    if (state?.snoozed_until && state.snoozed_until > now) continue;

    const built: SurveyWithQuestions = {
      ...survey,
      questions: orderQuestions(
        (questions ?? []).map((q) => {
          const { survey_options: options, ...q2 } = q as Record<string, unknown> & {
            survey_options: unknown[];
          };
          return { ...q2, options: options ?? [] };
        }),
      ),
    };
    if (!built.questions.length) continue;
    return { survey: built, mustAnswer: built.is_mandatory };
  }
  return null;
}

export async function snoozeSurvey(parentId: string, survey: Survey) {
  const until = new Date(Date.now() + survey.snooze_duration_hours * 3600_000).toISOString();
  const { error } = await supabase
    .from("parent_survey_status")
    .upsert(
      { parent_id: parentId, survey_id: survey.id, status: "snoozed", snoozed_until: until },
      { onConflict: "parent_id,survey_id" },
    );
  if (error) throw error;
}

export type AnswerValue = { text?: string; numeric?: number; choices?: string[] };

export async function submitSurvey(
  parentId: string,
  survey: SurveyWithQuestions,
  values: Record<string, AnswerValue>,
) {
  const { data: response, error } = await supabase
    .from("survey_responses")
    .insert({ survey_id: survey.id, parent_id: parentId })
    .select("id, reference_code")
    .single();
  if (error) throw error;

  const rows: {
    response_id: string;
    question_id: string;
    answer_text: string | null;
    answer_numeric: number | null;
  }[] = [];
  for (const question of survey.questions) {
    const value = values[question.id];
    if (!value) continue;
    if (question.question_type === "multiple_choice") {
      for (const choice of value.choices ?? []) {
        rows.push({
          response_id: response.id,
          question_id: question.id,
          answer_text: choice,
          answer_numeric: null,
        });
      }
      continue;
    }
    rows.push({
      response_id: response.id,
      question_id: question.id,
      answer_text: value.text?.slice(0, 2000) ?? null,
      answer_numeric: value.numeric ?? null,
    });
  }

  if (rows.length) {
    const { error: answerError } = await supabase.from("survey_answers").insert(rows);
    if (answerError) throw answerError;
  }

  const { error: statusError } = await supabase
    .from("parent_survey_status")
    .upsert(
      { parent_id: parentId, survey_id: survey.id, status: "completed", snoozed_until: null },
      { onConflict: "parent_id,survey_id" },
    );
  if (statusError) throw statusError;

  return { referenceCode: response.reference_code ?? null };
}

/* ------------------------- Parent survey list ------------------------- */

export type ParentSurveyItem = {
  survey: SurveyWithQuestions;
  completed: boolean;
  expired: boolean;
  referenceCode: string | null;
  submittedAt: string | null;
};

/**
 * Every survey addressed to this parent: still open (متاح) or past its
 * closing date (منتهي), with their own submission reference when answered.
 */
export async function listParentSurveys(parentId: string): Promise<ParentSurveyItem[]> {
  const now = new Date().toISOString();
  const [{ data, error }, responses, audience] = await Promise.all([
    supabase
      .from("surveys")
      .select(
        "id, title, description, status, is_mandatory, allow_snooze, snooze_duration_hours, start_date, end_date, created_at, audience_kind, target_stage_ids, target_classroom_ids, survey_questions(id, survey_id, question_text, question_type, order_index, is_required, survey_options(id, question_id, option_text, order_index))",
      )
      .eq("status", "active")
      .order("created_at", { ascending: false }),
    supabase
      .from("survey_responses")
      .select("survey_id, reference_code, submitted_at")
      .eq("parent_id", parentId),
    parentAudience(parentId),
  ]);
  if (error) throw error;

  const mine = new Map(
    (responses.data ?? []).map((row) => [
      row.survey_id,
      row as { reference_code: string | null; submitted_at: string },
    ]),
  );

  const items: ParentSurveyItem[] = [];
  for (const row of data ?? []) {
    const { survey_questions: questions, ...rest } = row as Record<string, unknown> & {
      survey_questions: unknown[];
    };
    const survey = rest as unknown as Survey;
    if (survey.start_date && survey.start_date > now) continue;
    if (!matchesAudience(survey, audience)) continue;

    const built: SurveyWithQuestions = {
      ...survey,
      questions: orderQuestions(
        (questions ?? []).map((q) => {
          const { survey_options: options, ...q2 } = q as Record<string, unknown> & {
            survey_options: unknown[];
          };
          return { ...q2, options: options ?? [] };
        }),
      ),
    };
    if (!built.questions.length) continue;

    const response = mine.get(survey.id);
    items.push({
      survey: built,
      completed: Boolean(response),
      expired: Boolean(survey.end_date && survey.end_date < now),
      referenceCode: response?.reference_code ?? null,
      submittedAt: response?.submitted_at ?? null,
    });
  }
  return items;
}

/** Client-side required-field validation for the parent modal. */
export function missingRequired(
  survey: SurveyWithQuestions,
  values: Record<string, AnswerValue>,
): string[] {
  return survey.questions
    .filter((q) => {
      if (!q.is_required) return false;
      const value = values[q.id];
      if (!value) return true;
      if (q.question_type === "text") return !value.text?.trim();
      if (q.question_type === "multiple_choice") return !(value.choices ?? []).length;
      if (q.question_type === "single_choice") return !value.text;
      return value.numeric === undefined;
    })
    .map((q) => q.question_text);
}

/**
 * Notify the parents a survey actually targets. Publishing used to be silent,
 * so a survey aimed at one classroom looked "undelivered" until the parent
 * happened to open the portal.
 */
export async function notifySurveyAudience(survey: Survey): Promise<number> {
  let query = supabase
    .from("application_children")
    .select("stage_id, classroom_id, applications!inner (parent_id, status)")
    .eq("applications.status", "approved")
    .limit(500);

  const kind = survey.audience_kind ?? "all";
  if (kind === "stages") {
    if (!survey.target_stage_ids?.length) return 0;
    query = query.in("stage_id", survey.target_stage_ids);
  } else if (kind === "classrooms") {
    if (!survey.target_classroom_ids?.length) return 0;
    query = query.in("classroom_id", survey.target_classroom_ids);
  }

  const { data, error } = await query;
  if (error) throw error;
  const parentIds = [
    ...new Set(
      ((data ?? []) as unknown as { applications: { parent_id: string | null } | null }[])
        .map((row) => row.applications?.parent_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (!parentIds.length) return 0;

  const { error: rpcError } = await supabase.rpc("dispatch_notification", {
    _user_ids: parentIds,
    _roles: [],
    _kind: "survey_published",
    _title_ar: "استبانة جديدة بانتظار رأيك",
    _body_ar: `تمت إتاحة «${survey.title}» — شاركنا رأيك من صفحة الاستبانات.`,
    _link: "/surveys",
    _severity: "info",
  });
  if (rpcError) throw rpcError;
  return parentIds.length;
}

/** Names of the stages/classrooms a survey targets, for staff-facing summaries. */
export function audienceSummary(survey: Survey, stages: StageWithClassrooms[]): string {
  const kind = survey.audience_kind ?? "all";
  if (kind === "all") return AUDIENCE_LABELS.all;
  if (kind === "stages") {
    const names = stages
      .filter((stage) => (survey.target_stage_ids ?? []).includes(stage.id))
      .map((stage) => stage.name_ar);
    return names.length ? `مراحل: ${names.join("، ")}` : "مراحل غير محددة";
  }
  const names = stages
    .flatMap((stage) => stage.classrooms)
    .filter((room) => (survey.target_classroom_ids ?? []).includes(room.id))
    .map((room) => room.name_ar);
  return names.length ? `فصول: ${names.join("، ")}` : "فصول غير محددة";
}

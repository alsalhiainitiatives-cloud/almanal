import { Check, Star } from "lucide-react";

import { Textarea } from "@/components/ui/textarea";
import { LIKERT_LABELS, type AnswerValue, type SurveyQuestion } from "../surveys";

/** Shared renderer for one survey question (popup + parent surveys page). */
export function SurveyQuestionField({
  question,
  number,
  value,
  onChange,
}: {
  question: SurveyQuestion;
  number: number;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
}) {
  const choice = (selected: string) => onChange({ text: selected });
  return (
    <fieldset className="rounded-[1.5rem] border border-border/60 bg-card p-4 sm:p-5">
      <legend className="px-2 text-sm font-black text-foreground">
        {number}. {question.question_text}{" "}
        {question.is_required ? <span className="text-destructive">*</span> : null}
      </legend>
      {question.question_type === "text" ? (
        <Textarea
          maxLength={2000}
          value={value?.text ?? ""}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder="اكتب إجابتك هنا..."
          className="mt-3 min-h-24 rounded-2xl"
        />
      ) : null}
      {question.question_type === "single_choice" ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {question.options.map((option) => (
            <button
              type="button"
              key={option.id}
              onClick={() => choice(option.option_text)}
              className={`flex items-center gap-3 rounded-xl border p-3 text-start text-sm font-bold transition ${value?.text === option.option_text ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:border-primary/40"}`}
            >
              <span
                className={`grid size-5 place-items-center rounded-full border ${value?.text === option.option_text ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
              >
                {value?.text === option.option_text ? <Check className="size-3" /> : null}
              </span>
              {option.option_text}
            </button>
          ))}
        </div>
      ) : null}
      {question.question_type === "multiple_choice" ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {question.options.map((option) => {
            const selected = value?.choices?.includes(option.option_text) ?? false;
            return (
              <button
                type="button"
                key={option.id}
                onClick={() =>
                  onChange({
                    choices: selected
                      ? (value?.choices ?? []).filter((item) => item !== option.option_text)
                      : [...(value?.choices ?? []), option.option_text],
                  })
                }
                className={`flex items-center gap-3 rounded-xl border p-3 text-start text-sm font-bold transition ${selected ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:border-primary/40"}`}
              >
                <span
                  className={`grid size-5 place-items-center rounded-md border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
                >
                  {selected ? <Check className="size-3" /> : null}
                </span>
                {option.option_text}
              </button>
            );
          })}
        </div>
      ) : null}
      {question.question_type === "rating_stars" ? (
        <div className="mt-3 flex flex-row-reverse justify-end gap-2">
          {[5, 4, 3, 2, 1].map((star) => (
            <button
              type="button"
              key={star}
              aria-label={`${star} نجوم`}
              onClick={() => onChange({ numeric: star })}
              className={`rounded-xl p-2 transition hover:bg-gold/20 ${value?.numeric && value.numeric >= star ? "text-gold" : "text-muted-foreground/40"}`}
            >
              <Star className="size-8 fill-current" />
            </button>
          ))}
        </div>
      ) : null}
      {question.question_type === "likert_scale" ? (
        <div className="mt-3 grid grid-cols-5 gap-1">
          {LIKERT_LABELS.map((label, index) => {
            const score = index + 1;
            return (
              <button
                type="button"
                key={label}
                onClick={() => onChange({ numeric: score })}
                className={`rounded-xl border p-2 text-center text-[10px] font-bold sm:text-xs ${value?.numeric === score ? "border-primary bg-primary text-primary-foreground" : "border-border/60 text-muted-foreground"}`}
              >
                <span className="block text-base font-black">{score}</span>
                {label}
              </button>
            );
          })}
        </div>
      ) : null}
    </fieldset>
  );
}

import { useRef, useState } from "react";
import {
  CheckCircle2,
  FileText,
  FileUp,
  Loader2,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormSection, StatusNote } from "../fields";

export type DocType = {
  id: string;
  slug: string;
  name_ar: string;
  description_ar: string | null;
  is_required: boolean;
};

export type UploadedDoc = {
  id: string;
  document_type_slug: string;
  file_name: string | null;
  file_size: number | null;
  child_index: number | null;
};

const MAX_MB = 10;

export function DocumentsStep({
  parentTypes,
  childTypes,
  childNames,
  uploaded,
  onUpload,
  onRemove,
}: {
  parentTypes: DocType[];
  childTypes: DocType[];
  childNames: string[];
  uploaded: UploadedDoc[];
  onUpload: (slug: string, file: File, childIndex: number | null) => Promise<void>;
  onRemove: (docId: string) => Promise<void>;
}) {
  const totalRequired =
    parentTypes.filter((t) => t.is_required).length +
    childTypes.filter((t) => t.is_required).length * childNames.length;

  const doneRequired =
    parentTypes.filter(
      (t) => t.is_required && uploaded.some((u) => u.document_type_slug === t.slug && u.child_index === null),
    ).length +
    childNames.reduce(
      (sum, _n, i) =>
        sum +
        childTypes.filter(
          (t) => t.is_required && uploaded.some((u) => u.document_type_slug === t.slug && u.child_index === i),
        ).length,
      0,
    );

  const complete = totalRequired > 0 && doneRequired >= totalRequired;

  return (
    <div className="space-y-6">
      <StatusNote
        tone={complete ? "success" : "info"}
        title={complete ? "اكتملت جميع المستندات المطلوبة" : `تم رفع ${doneRequired} من ${totalRequired} مستند مطلوب`}
        icon={complete ? CheckCircle2 : ShieldCheck}
      >
        الصيغ المقبولة: PDF أو صورة، وبحد أقصى {MAX_MB} ميغابايت للملف الواحد. لكل طفل مستنداته
        المستقلة.
      </StatusNote>

      {parentTypes.length ? (
        <FormSection
          title="مستندات ولي الأمر"
          description="ترفع مرة واحدة لكل الطلب."
          icon={UserRound}
        >
          <div className="space-y-3">
            {parentTypes.map((t) => (
              <DocumentRow
                key={t.id}
                type={t}
                childIndex={null}
                doc={uploaded.find((u) => u.document_type_slug === t.slug && u.child_index === null)}
                onUpload={onUpload}
                onRemove={onRemove}
              />
            ))}
          </div>
        </FormSection>
      ) : null}

      {childNames.map((name, index) => {
        const childDone = childTypes.filter(
          (t) =>
            t.is_required &&
            uploaded.some((u) => u.document_type_slug === t.slug && u.child_index === index),
        ).length;
        const childRequired = childTypes.filter((t) => t.is_required).length;

        return (
          <FormSection
            key={index}
            title={`مستندات: ${name || `الطفل ${index + 1}`}`}
            description="مستندات خاصة بهذا الطفل فقط."
            icon={FileText}
            tone="accent"
            action={
              <span
                className={`rounded-full px-3 py-1.5 text-xs font-black ${
                  childDone >= childRequired
                    ? "bg-mint text-foreground"
                    : "bg-gold/30 text-gold-foreground"
                }`}
              >
                {childDone} / {childRequired}
              </span>
            }
          >
            <div className="space-y-3">
              {childTypes.map((t) => (
                <DocumentRow
                  key={`${index}-${t.id}`}
                  type={t}
                  childIndex={index}
                  doc={uploaded.find(
                    (u) => u.document_type_slug === t.slug && u.child_index === index,
                  )}
                  onUpload={onUpload}
                  onRemove={onRemove}
                />
              ))}
            </div>
          </FormSection>
        );
      })}

      {parentTypes.length === 0 && childTypes.length === 0 ? (
        <p className="rounded-[2rem] bg-beige/60 p-8 text-center text-sm text-muted-foreground">
          لا توجد مستندات مطلوبة لهذا الطلب.
        </p>
      ) : null}
    </div>
  );
}

function DocumentRow({
  type,
  doc,
  childIndex,
  onUpload,
  onRemove,
}: {
  type: DocType;
  doc?: UploadedDoc;
  childIndex: number | null;
  onUpload: (slug: string, file: File, childIndex: number | null) => Promise<void>;
  onRemove: (docId: string) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div
      className={`grid gap-4 rounded-2xl border-2 p-4 transition sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5 ${
        doc ? "border-mint bg-mint/25" : "border-border bg-background"
      }`}
    >
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-black text-foreground">
          {doc ? (
            <CheckCircle2 className="size-4 shrink-0 text-mint-foreground" />
          ) : (
            <FileText className="size-4 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate">{type.name_ar}</span>
          {type.is_required ? <span className="text-destructive">*</span> : (
            <span className="text-xs font-bold text-muted-foreground">(اختياري)</span>
          )}
        </p>
        {type.description_ar ? (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{type.description_ar}</p>
        ) : null}
        {doc ? (
          <p className="mt-2 truncate text-xs font-bold text-mint-foreground" dir="ltr">
            {doc.file_name ?? "ملف مرفوع"} · {((doc.file_size ?? 0) / 1024).toFixed(0)} KB
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setBusy(true);
            try {
              await onUpload(type.slug, file, childIndex);
            } finally {
              setBusy(false);
            }
          }}
        />
        <Button
          type="button"
          variant={doc ? "soft" : "hero"}
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
          {doc ? "استبدال" : "رفع الملف"}
        </Button>
        {doc ? (
          <Button
            type="button"
            variant="ghost"
            aria-label="حذف الملف"
            className="min-h-11 min-w-11 text-destructive"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onRemove(doc.id);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
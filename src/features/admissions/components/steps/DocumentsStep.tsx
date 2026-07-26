import { useRef, useState } from "react";
import { CheckCircle2, FileUp, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type DocType = {
  id: string;
  slug: string;
  name_ar: string;
  description_ar: string | null;
  is_required: boolean;
};

type Uploaded = { id: string; document_type_slug: string; file_name: string; file_size: number };

export function DocumentsStep({
  types,
  uploaded,
  onUpload,
  onRemove,
}: {
  types: DocType[];
  uploaded: Uploaded[];
  onUpload: (slug: string, file: File) => Promise<void>;
  onRemove: (docId: string) => Promise<void>;
}) {
  return (
    <div className="space-y-4">
      {types.map((t) => (
        <DocumentRow
          key={t.id}
          type={t}
          doc={uploaded.find((u) => u.document_type_slug === t.slug)}
          onUpload={onUpload}
          onRemove={onRemove}
        />
      ))}
      {types.length === 0 ? (
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
  onUpload,
  onRemove,
}: {
  type: DocType;
  doc?: Uploaded;
  onUpload: (slug: string, file: File) => Promise<void>;
  onRemove: (docId: string) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex flex-col gap-4 rounded-[2rem] border border-border/60 bg-card p-6 shadow-soft sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-black text-foreground">
          {type.name_ar}
          {type.is_required ? <span className="text-destructive"> *</span> : null}
        </p>
        {type.description_ar ? (
          <p className="mt-1 text-sm text-muted-foreground">{type.description_ar}</p>
        ) : null}
        {doc ? (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-mint-foreground">
            <CheckCircle2 className="size-4" />
            {doc.file_name} — {(doc.file_size / 1024).toFixed(0)} كيلوبايت
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
              await onUpload(type.slug, file);
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
            className="text-destructive"
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
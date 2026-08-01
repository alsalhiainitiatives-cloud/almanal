import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  deleteTestimonial,
  fetchAllTestimonials,
  setTestimonialStatus,
} from "../testimonials";

const STATUS_LABEL: Record<string, string> = {
  pending: "بانتظار المراجعة",
  approved: "معتمد ومنشور",
  rejected: "مرفوض",
};

/** Staff moderation for parent reviews submitted from the public website. */
export function TestimonialsModeration() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["site-testimonials", "all"],
    queryFn: fetchAllTestimonials,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["site-testimonials"] });
  };

  const moderate = useMutation({
    mutationFn: (input: { id: string; status: "approved" | "rejected" | "pending" }) =>
      setTestimonialStatus(input.id, input.status),
    onSuccess: () => {
      toast.success("تم تحديث حالة الرأي");
      invalidate();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "تعذر التحديث"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteTestimonial(id),
    onSuccess: () => {
      toast.success("تم حذف الرأي");
      invalidate();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "تعذر الحذف"),
  });

  return (
    <Card className="rounded-[1.75rem] border-border/60 shadow-soft">
      <CardHeader>
        <CardTitle className="text-base font-extrabold">
          مشاركات أولياء الأمور من الموقع
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="grid place-items-center py-8">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : (data?.length ?? 0) === 0 ? (
          <p className="rounded-2xl bg-beige/60 px-4 py-3 text-xs font-semibold text-muted-foreground">
            لا توجد مشاركات بعد.
          </p>
        ) : (
          data!.map((row) => (
            <div
              key={row.id}
              className="rounded-[1.5rem] border border-border/60 bg-card/70 p-4 shadow-soft"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-extrabold text-foreground">{row.name}</span>
                <span className="text-xs text-muted-foreground">{row.role}</span>
                <span className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={`size-3.5 ${i <= row.rating ? "fill-gold text-gold" : "text-border"}`}
                    />
                  ))}
                </span>
                <span className="ms-auto rounded-full bg-accent px-3 py-1 text-[11px] font-black text-primary">
                  {STATUS_LABEL[row.status] ?? row.status}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {row.quote}
              </p>
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                {row.status !== "approved" && (
                  <Button
                    type="button"
                    variant="soft"
                    size="sm"
                    className="rounded-2xl"
                    disabled={moderate.isPending}
                    onClick={() => moderate.mutate({ id: row.id, status: "approved" })}
                  >
                    <Check className="size-4" />
                    اعتماد ونشر
                  </Button>
                )}
                {row.status !== "rejected" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-2xl"
                    disabled={moderate.isPending}
                    onClick={() => moderate.mutate({ id: row.id, status: "rejected" })}
                  >
                    <X className="size-4" />
                    رفض
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-2xl text-destructive hover:text-destructive"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(row.id)}
                >
                  <Trash2 className="size-4" />
                  حذف
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

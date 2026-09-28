/**
 * Custom-role management: create, rename, activate/deactivate and delete
 * admin-defined roles (e.g. "وكيلة المدرسة"). Permissions for each custom role
 * are granted from the same hierarchical matrix used by the built-in roles.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, ShieldPlus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  adminDeleteCustomRole,
  adminUpsertCustomRole,
  type getCustomRoleMatrix,
} from "@/features/auth/custom-roles.functions";

export type CustomRoleRow = Awaited<ReturnType<typeof getCustomRoleMatrix>>["roles"][number];

export const CUSTOM_ROLE_COLORS = [
  { value: "bg-lavender/70 text-foreground", label: "بنفسجي" },
  { value: "bg-mint/70 text-foreground", label: "أخضر" },
  { value: "bg-sky/60 text-foreground", label: "أزرق" },
  { value: "bg-gold text-gold-foreground", label: "ذهبي" },
  { value: "bg-primary text-primary-foreground", label: "عنابي" },
];

export function CustomRolesPanel({
  roles,
  activeCustomId,
  onSelect,
  canManage,
  assignmentCounts,
}: {
  roles: CustomRoleRow[];
  activeCustomId: string | null;
  onSelect: (id: string) => void;
  canManage: boolean;
  assignmentCounts: Map<string, number>;
}) {
  const [editing, setEditing] = useState<CustomRoleRow | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CustomRoleRow | null>(null);
  const queryClient = useQueryClient();

  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteCustomRole({ data: { id } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "custom-roles"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("تم حذف الدور المخصص وسحب صلاحياته من جميع من يحملونه");
      setConfirmDelete(null);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "تعذّر حذف الدور المخصص."),
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
          <ShieldPlus className="size-4" /> الأدوار المخصصة (يمكنك إنشاء أي دور جديد ومنحه صلاحياته)
        </span>
        {canManage && (
          <Button
            size="sm"
            className="rounded-full font-bold"
            onClick={() => setEditing("new")}
          >
            <Plus className="size-4" /> إنشاء دور مخصص
          </Button>
        )}
      </div>

      {roles.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-4 text-[11px] font-semibold text-muted-foreground">
          لا توجد أدوار مخصصة بعد. أنشئ دورًا مثل «وكيلة المدرسة» ثم حدّد صلاحياته من المصفوفة
          أدناه، وسيظهر فورًا في شاشة أدوار المستخدمين.
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {roles.map((role) => {
            const active = activeCustomId === role.id;
            return (
              <div
                key={role.id}
                className={`rounded-2xl border p-3 transition ${
                  active
                    ? "border-primary bg-primary/10 shadow-soft ring-2 ring-primary/40"
                    : "border-border/60 bg-card"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(role.id)}
                  aria-pressed={active}
                  className="w-full text-start"
                >
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-extrabold text-foreground">{role.nameAr}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${role.color}`}
                    >
                      {role.permissionKeys.length} صلاحية
                    </span>
                    {!role.isActive && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                        معطّل
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block text-[10px] leading-5 text-muted-foreground">
                    {role.descriptionAr || "بدون وصف"}
                  </span>
                  <span className="mt-1 block text-[10px] font-bold text-muted-foreground">
                    {assignmentCounts.get(role.id) ?? 0} مستخدم يحمل هذا الدور
                  </span>
                </button>

                {canManage && (
                  <div className="mt-2 flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 rounded-full px-2 text-[11px] font-bold"
                      onClick={() => setEditing(role)}
                    >
                      <Pencil className="size-3" /> تعديل
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 rounded-full px-2 text-[11px] font-bold text-destructive"
                      onClick={() => setConfirmDelete(role)}
                    >
                      <Trash2 className="size-3" /> حذف
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <CustomRoleDialog
        value={editing}
        onClose={() => setEditing(null)}
        onSaved={(id) => {
          setEditing(null);
          onSelect(id);
        }}
      />

      <Dialog open={Boolean(confirmDelete)} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent className="rounded-[2rem] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-start text-lg font-extrabold">
              حذف دور «{confirmDelete?.nameAr}»
            </DialogTitle>
            <DialogDescription className="text-start text-sm">
              سيتم حذف الدور وصلاحياته وسحبه من جميع المستخدمين الذين يحملونه. لا يؤثر ذلك على
              الأدوار الأساسية ولا على الاستثناءات الشخصية.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-2xl font-bold" onClick={() => setConfirmDelete(null)}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              className="rounded-2xl font-bold"
              disabled={remove.isPending}
              onClick={() => confirmDelete && remove.mutate(confirmDelete.id)}
            >
              {remove.isPending && <Loader2 className="size-4 animate-spin" />}
              حذف نهائي
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CustomRoleDialog({
  value,
  onClose,
  onSaved,
}: {
  value: CustomRoleRow | "new" | null;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const existing = value && value !== "new" ? value : null;
  const [initializedFor, setInitializedFor] = useState<string | null>(null);
  const [nameAr, setNameAr] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");
  const [color, setColor] = useState(CUSTOM_ROLE_COLORS[0].value);
  const [isActive, setIsActive] = useState(true);

  const token = value === "new" ? "new" : existing?.id ?? null;
  if (value && initializedFor !== token) {
    setInitializedFor(token);
    setNameAr(existing?.nameAr ?? "");
    setDescriptionAr(existing?.descriptionAr ?? "");
    setColor(existing?.color ?? CUSTOM_ROLE_COLORS[0].value);
    setIsActive(existing ? existing.isActive : true);
  }

  const save = useMutation({
    mutationFn: () =>
      adminUpsertCustomRole({
        data: {
          id: existing?.id ?? null,
          nameAr: nameAr.trim(),
          descriptionAr: descriptionAr.trim(),
          color,
          isActive,
        },
      }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "custom-roles"] });
      toast.success(existing ? "تم تحديث الدور المخصص" : "تم إنشاء الدور المخصص");
      onSaved(result.id);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "تعذّر حفظ الدور المخصص."),
  });

  return (
    <Dialog open={Boolean(value)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-[2rem] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-start text-lg font-extrabold">
            {existing ? "تعديل الدور المخصص" : "إنشاء دور مخصص"}
          </DialogTitle>
          <DialogDescription className="text-start text-sm">
            اكتب اسم الدور كما يُعرف في المدرسة، ثم حدّد صلاحياته من المصفوفة بعد الحفظ.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">اسم الدور</Label>
            <Input
              value={nameAr}
              onChange={(event) => setNameAr(event.target.value)}
              placeholder="مثال: وكيلة المدرسة"
              className="rounded-2xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">وصف مختصر للمهام</Label>
            <Textarea
              value={descriptionAr}
              onChange={(event) => setDescriptionAr(event.target.value)}
              placeholder="مثال: متابعة الجدول والانتظام والإشراف على المعلمات."
              className="min-h-24 rounded-2xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">لون الشارة</Label>
            <div className="flex flex-wrap gap-2">
              {CUSTOM_ROLE_COLORS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setColor(option.value)}
                  className={`rounded-full px-3 py-1 text-[11px] font-bold ${option.value} ${
                    color === option.value ? "ring-2 ring-primary ring-offset-2" : ""
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 p-3">
            <span>
              <span className="block text-xs font-bold text-foreground">الدور مُفعَّل</span>
              <span className="block text-[11px] text-muted-foreground">
                عند التعطيل تتوقف صلاحيات هذا الدور عن العمل لجميع من يحملونه دون حذفه.
              </span>
            </span>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </label>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="rounded-2xl font-bold" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            className="rounded-2xl font-bold"
            disabled={save.isPending || nameAr.trim().length < 2}
            onClick={() => save.mutate()}
          >
            {save.isPending && <Loader2 className="size-4 animate-spin" />}
            {existing ? "حفظ التعديلات" : "إنشاء الدور"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

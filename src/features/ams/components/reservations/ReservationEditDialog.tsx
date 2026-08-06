import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, PencilLine } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateSeatReservationByStaff } from "@/features/admissions/reservation.functions";
import { reservationStaffUpdateSchema } from "@/features/admissions/reservation-schema";

type ChildRow = {
  id: string;
  name_ar: string;
  national_id: string | null;
  gender: string | null;
  birth_date: string | null;
  preference_1_classroom_id: string | null;
  assigned_classroom_id: string | null;
};

type Classroom = { id: string; name_ar: string; capacity: number; taken_seats: number };

/** Staff correction of a pre-reservation: typos, IDs, and class placement. */
export function ReservationEditDialog({
  reservation,
  classrooms,
}: {
  reservation: {
    id: string;
    parent_name: string;
    parent_national_id: string;
    children?: ChildRow[] | null;
  };
  classrooms: Classroom[];
}) {
  const queryClient = useQueryClient();
  const save = useServerFn(updateSeatReservationByStaff);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [parentName, setParentName] = useState(reservation.parent_name);
  const [parentNationalId, setParentNationalId] = useState(reservation.parent_national_id);
  const [rows, setRows] = useState(
    (reservation.children ?? []).map((c) => ({
      childId: c.id,
      nameAr: c.name_ar,
      nationalId: c.national_id ?? "",
      gender: (c.gender === "female" ? "female" : "male") as "male" | "female",
      birthDate: c.birth_date ?? "",
      preference1: c.preference_1_classroom_id ?? "",
      assignedClassroomId: c.assigned_classroom_id ?? "",
    })),
  );

  const patch = (index: number, next: Partial<(typeof rows)[number]>) =>
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...next } : row)));

  async function onSave() {
    const parsed = reservationStaffUpdateSchema.safeParse({
      id: reservation.id,
      parentName,
      parentNationalId,
      children: rows.map((r) => ({
        ...r,
        assignedClassroomId: r.assignedClassroomId || null,
      })),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "يرجى مراجعة البيانات");
      return;
    }
    setBusy(true);
    try {
      await save({ data: parsed.data });
      await queryClient.invalidateQueries({ queryKey: ["ams", "reservations"] });
      toast.success("تم تحديث بيانات طلب الحجز");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر تحديث طلب الحجز");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-2xl text-xs font-bold">
          <PencilLine className="size-3.5" />
          تعديل
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-h-[85vh] overflow-y-auto text-right sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-black">تعديل طلب حجز المقعد</DialogTitle>
          <DialogDescription className="text-xs leading-6">
            تصحيح بيانات ولي الأمر أو الطفل أو تغيير الفصل المسكَّن بناءً على طلب الأسرة.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>اسم ولي الأمر</Label>
            <Input value={parentName} onChange={(e) => setParentName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>هوية ولي الأمر</Label>
            <Input
              dir="ltr"
              inputMode="numeric"
              maxLength={10}
              value={parentNationalId}
              onChange={(e) => setParentNationalId(e.target.value.replace(/\D/g, ""))}
            />
          </div>
        </div>

        <div className="space-y-4">
          {rows.map((row, index) => (
            <div key={row.childId} className="rounded-2xl bg-muted/40 p-4">
              <p className="mb-3 text-xs font-black text-foreground">الطفل {index + 1}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>الاسم</Label>
                  <Input value={row.nameAr} onChange={(e) => patch(index, { nameAr: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>رقم الهوية</Label>
                  <Input
                    dir="ltr"
                    inputMode="numeric"
                    maxLength={10}
                    value={row.nationalId}
                    onChange={(e) => patch(index, { nationalId: e.target.value.replace(/\D/g, "") })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>الجنس</Label>
                  <Select
                    value={row.gender}
                    onValueChange={(v) => patch(index, { gender: v as "male" | "female" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">ذكر</SelectItem>
                      <SelectItem value="female">أنثى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>تاريخ الميلاد</Label>
                  <Input
                    type="date"
                    dir="ltr"
                    value={row.birthDate}
                    onChange={(e) => patch(index, { birthDate: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>الرغبة الأولى</Label>
                  <Select
                    value={row.preference1 || undefined}
                    onValueChange={(v) => patch(index, { preference1: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الفصل" />
                    </SelectTrigger>
                    <SelectContent>
                      {classrooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name_ar} · متاح {Math.max(0, room.capacity - room.taken_seats)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>الفصل المسكَّن</Label>
                  <Select
                    value={row.assignedClassroomId || "none"}
                    onValueChange={(v) => patch(index, { assignedClassroomId: v === "none" ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون تسكين</SelectItem>
                      {classrooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name_ar} · متاح {Math.max(0, room.capacity - room.taken_seats)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:flex-row-reverse sm:justify-start">
          <Button variant="hero" disabled={busy} onClick={onSave}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            حفظ التعديلات
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
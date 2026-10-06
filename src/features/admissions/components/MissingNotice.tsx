import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function StageNotFound() {
  return (
    <div className="section-y text-center">
      <p className="text-xl font-black text-foreground">لم نعثر على هذه المرحلة</p>
      <Button asChild variant="hero" className="mt-6">
        <Link to="/admissions">العودة لصفحة القبول</Link>
      </Button>
    </div>
  );
}

export function ClassroomMissing() {
  return (
    <div className="section-y text-center">
      <p className="text-xl font-black text-foreground">لم نعثر على هذا الفصل</p>
      <Button asChild variant="hero" className="mt-6">
        <Link to="/admissions">العودة للمراحل</Link>
      </Button>
    </div>
  );
}

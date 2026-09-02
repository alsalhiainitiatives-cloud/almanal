CREATE POLICY "students permission read applications"
ON public.applications FOR SELECT TO authenticated
USING (public.has_permission(auth.uid(), 'students.view'));

CREATE POLICY "students permission read children"
ON public.application_children FOR SELECT TO authenticated
USING (public.has_permission(auth.uid(), 'students.view'));

CREATE POLICY "attendance permission read"
ON public.attendance_records FOR SELECT TO authenticated
USING (public.has_permission(auth.uid(), 'attendance.view'));

CREATE POLICY "guardians permission read invitations"
ON public.parent_invitations FOR SELECT TO authenticated
USING (public.has_permission(auth.uid(), 'guardians.link'));
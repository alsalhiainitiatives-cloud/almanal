CREATE OR REPLACE FUNCTION public.assignment_board_lookup()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_school_staff(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN jsonb_build_object(
    'teachers', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',p.id,'full_name',p.full_name,'email',p.email,'phone',p.phone))
       FROM public.profiles p WHERE p.id IN (SELECT user_id FROM public.user_roles WHERE role='teacher')),'[]'::jsonb),
    'subjects', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',s.id,'classroom_id',s.classroom_id,'name_ar',s.name_ar,'color_hex',s.color_hex,'sort_order',s.sort_order) ORDER BY s.sort_order)
       FROM public.subjects s WHERE s.is_active),'[]'::jsonb),
    'subject_links', COALESCE((SELECT jsonb_agg(jsonb_build_object('teacher_id',t.teacher_id,'subject_id',t.subject_id)) FROM public.teacher_subjects t),'[]'::jsonb)
  );
END $$;

CREATE OR REPLACE FUNCTION public.sync_classroom_teacher_names(_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; names text[]; existing jsonb; extras jsonb; n text; meta jsonb; i int;
BEGIN
  IF NOT public.is_school_staff(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  FOR r IN SELECT id, teachers FROM public.classrooms WHERE id = ANY(_ids) LOOP
    SELECT array_agg(COALESCE(NULLIF(trim(p.full_name),''), p.email, 'معلمة') ORDER BY tc.created_at)
      INTO names FROM public.teacher_classrooms tc JOIN public.profiles p ON p.id = tc.teacher_id
      WHERE tc.classroom_id = r.id;
    existing := CASE WHEN jsonb_typeof(r.teachers::jsonb)='array' THEN r.teachers::jsonb ELSE '[]'::jsonb END;
    extras := '[]'::jsonb;
    IF names IS NOT NULL THEN
      FOR i IN 2..COALESCE(array_length(names,1),0) LOOP
        n := names[i];
        SELECT e INTO meta FROM jsonb_array_elements(existing) e WHERE trim(COALESCE(e->>'name',''))=n LIMIT 1;
        extras := extras || jsonb_build_array(jsonb_build_object('title','معلمة الفصل') || COALESCE(meta,'{}'::jsonb) || jsonb_build_object('name',n));
        meta := NULL;
      END LOOP;
    END IF;
    UPDATE public.classrooms SET teacher_name = names[1], teachers = extras WHERE id = r.id;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_user_account(_user_id uuid, _confirm text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE t record; typed text; admins int; apps int; roles text[];
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'غير مصرح: هذه العملية لمدير النظام فقط.'; END IF;
  IF auth.uid() = _user_id THEN RAISE EXCEPTION 'لا يمكنك حذف حسابك الشخصي.'; END IF;
  SELECT id, full_name, email INTO t FROM public.profiles WHERE id = _user_id;
  IF t.id IS NULL THEN RAISE EXCEPTION 'الحساب غير موجود.'; END IF;
  typed := lower(trim(COALESCE(_confirm,'')));
  IF typed = '' OR (typed IS DISTINCT FROM lower(trim(COALESCE(t.full_name,''))) AND typed IS DISTINCT FROM lower(trim(COALESCE(t.email,'')))) THEN
    RAISE EXCEPTION 'نص التأكيد غير مطابق — اكتب اسم الحساب أو بريده الإلكتروني بدقة.';
  END IF;
  SELECT array_agg(role::text) INTO roles FROM public.user_roles WHERE user_id = _user_id;
  IF 'admin' = ANY(COALESCE(roles,'{}')) THEN
    SELECT count(*) INTO admins FROM public.user_roles WHERE role='admin';
    IF admins <= 1 THEN RAISE EXCEPTION 'لا يمكن حذف آخر حساب لمدير النظام.'; END IF;
  END IF;
  SELECT count(*) INTO apps FROM public.applications WHERE parent_id = _user_id;
  IF apps > 0 THEN RAISE EXCEPTION 'لا يمكن حذف الحساب لارتباطه بـ % طلب التحاق. انقل الطلبات لولي أمر آخر أو احذفها أولًا.', apps; END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  DELETE FROM public.user_custom_roles WHERE user_id = _user_id;
  DELETE FROM public.user_permissions WHERE user_id = _user_id;
  DELETE FROM public.user_sessions WHERE user_id = _user_id;
  DELETE FROM public.teacher_classrooms WHERE teacher_id = _user_id;
  DELETE FROM public.teacher_subjects WHERE teacher_id = _user_id;
  DELETE FROM public.profiles WHERE id = _user_id;
  DELETE FROM auth.users WHERE id = _user_id;
  RETURN jsonb_build_object('fullName', t.full_name, 'email', t.email, 'roles', to_jsonb(COALESCE(roles,'{}')));
END $$;

REVOKE ALL ON FUNCTION public.assignment_board_lookup() FROM public, anon;
REVOKE ALL ON FUNCTION public.sync_classroom_teacher_names(uuid[]) FROM public, anon;
REVOKE ALL ON FUNCTION public.admin_delete_user_account(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.assignment_board_lookup() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sync_classroom_teacher_names(uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_user_account(uuid, text) TO authenticated, service_role;
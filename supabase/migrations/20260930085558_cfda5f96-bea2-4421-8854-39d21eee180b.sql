
-- ============ Storage read access (signed URLs through the user's own session) ============
CREATE POLICY "chat media members read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'classroom-media' AND (storage.foldername(name))[1] = 'chat'
  AND public.can_read_classroom_curriculum(auth.uid(), NULLIF((storage.foldername(name))[2],'')::uuid));

CREATE POLICY "private chat media members read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'classroom-media' AND (storage.foldername(name))[1] = 'private'
  AND public.can_access_private_chat(auth.uid(), NULLIF((storage.foldername(name))[2],'')::uuid));

CREATE POLICY "journey evidence readable with its record" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'journey-evidence' AND (
  EXISTS (SELECT 1 FROM public.assessment_evidences e WHERE e.file_path = storage.objects.name)
  OR EXISTS (SELECT 1 FROM public.skill_evidences s WHERE s.file_path = storage.objects.name)));

CREATE POLICY "admin purge admission docs" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id IN ('admission-documents','payment-receipts') AND public.has_role(auth.uid(),'admin'));

-- Staff may see who holds the teacher role
CREATE POLICY "Staff view teacher roles" ON public.user_roles FOR SELECT TO authenticated
USING (role = 'teacher' AND public.is_school_staff(auth.uid()));

-- ============ Classroom helpers ============
CREATE OR REPLACE FUNCTION public.classroom_roster(_classroom_id uuid)
RETURNS TABLE(child_id uuid, child_name text, parent_id uuid, parent_name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _full boolean;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_read_classroom_curriculum(auth.uid(), _classroom_id) THEN
    RETURN;
  END IF;
  _full := public.is_school_staff(auth.uid()) OR public.is_classroom_teacher(auth.uid(), _classroom_id)
        OR public.is_subject_teacher(auth.uid(), _classroom_id);
  RETURN QUERY
    SELECT c.id, c.name_ar, a.parent_id, CASE WHEN _full THEN p.full_name ELSE NULL END
    FROM application_children c
    JOIN applications a ON a.id = c.application_id
    LEFT JOIN profiles p ON p.id = a.parent_id
    WHERE c.classroom_id = _classroom_id AND a.status = 'approved' AND c.withdrawn_at IS NULL
    ORDER BY c.name_ar
    LIMIT 500;
END $$;

CREATE OR REPLACE FUNCTION public.classroom_teacher_ids(_classroom_id uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT teacher_id FROM teacher_classrooms
  WHERE classroom_id = _classroom_id AND auth.uid() IS NOT NULL
    AND public.can_read_classroom_curriculum(auth.uid(), _classroom_id)
$$;

CREATE OR REPLACE FUNCTION public.profile_cards(_ids uuid[])
RETURNS TABLE(id uuid, full_name text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.full_name, p.avatar_url FROM profiles p
  WHERE p.id = ANY(_ids) AND auth.uid() IS NOT NULL AND (
    p.id = auth.uid() OR public.is_school_staff(auth.uid()) OR public.is_teacher(auth.uid())
    OR public.is_teacher(p.id) OR public.is_school_staff(p.id)
    OR EXISTS (SELECT 1 FROM private_chats pc WHERE (pc.teacher_id = auth.uid() AND pc.parent_id = p.id)
                                            OR (pc.parent_id = auth.uid() AND pc.teacher_id = p.id)))
$$;

CREATE OR REPLACE FUNCTION public.child_brief(_child_id uuid)
RETURNS TABLE(id uuid, name_ar text, classroom_id uuid, parent_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.name_ar, c.classroom_id, a.parent_id
  FROM application_children c JOIN applications a ON a.id = c.application_id
  WHERE c.id = _child_id AND auth.uid() IS NOT NULL AND (
    public.is_school_staff(auth.uid()) OR public.is_child_parent(auth.uid(), c.id)
    OR (c.classroom_id IS NOT NULL AND (public.is_classroom_teacher(auth.uid(), c.classroom_id)
        OR public.is_subject_teacher(auth.uid(), c.classroom_id))))
$$;

CREATE OR REPLACE FUNCTION public.sync_private_chat_guardian(_chat_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _parent uuid; _child uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_access_private_chat(auth.uid(), _chat_id) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  SELECT parent_id, child_id INTO _parent, _child FROM private_chats WHERE id = _chat_id;
  IF _parent IS NOT NULL OR _child IS NULL THEN RETURN _parent; END IF;
  SELECT a.parent_id INTO _parent FROM application_children c JOIN applications a ON a.id = c.application_id
   WHERE c.id = _child;
  IF _parent IS NOT NULL THEN
    UPDATE private_chats SET parent_id = _parent WHERE id = _chat_id AND parent_id IS NULL;
  END IF;
  RETURN _parent;
END $$;

CREATE OR REPLACE FUNCTION public.set_classroom_parent_posting(_classroom_id uuid, _allowed boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_write_classroom_curriculum(auth.uid(), _classroom_id) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  UPDATE classrooms SET allow_parent_messages = _allowed WHERE id = _classroom_id;
  RETURN true;
END $$;

-- ============ Sign-in telemetry ============
CREATE OR REPLACE FUNCTION public.log_login_attempt(_identifier text, _ip text, _user_agent text, _success boolean)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO login_attempts(identifier, ip_address, user_agent, success)
  VALUES (lower(left(coalesce(_identifier,''),160)), left(_ip,80), left(_user_agent,400), coalesce(_success,false))
$$;

CREATE OR REPLACE FUNCTION public.login_rate_limited(_identifier text, _ip text, _window_minutes integer, _max integer)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (SELECT count(*) FROM login_attempts WHERE identifier = lower(_identifier) AND success = false
            AND created_at >= now() - make_interval(mins => _window_minutes)) >= _max
      OR (_ip IS NOT NULL AND (SELECT count(*) FROM login_attempts WHERE ip_address = _ip AND success = false
            AND created_at >= now() - make_interval(mins => _window_minutes)) >= _max * 4)
$$;

CREATE OR REPLACE FUNCTION public.resolve_login_email(_phone_tail text)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _emails text[];
BEGIN
  IF _phone_tail IS NULL OR length(_phone_tail) < 9 THEN RETURN NULL; END IF;
  SELECT array_agg(email) INTO _emails FROM (SELECT email FROM profiles WHERE phone ILIKE '%' || _phone_tail LIMIT 2) s;
  IF coalesce(array_length(_emails,1),0) <> 1 THEN RETURN NULL; END IF;
  RETURN _emails[1];
END $$;

CREATE OR REPLACE FUNCTION public.write_audit_log(_user_id uuid, _actor_email text, _action text, _entity text,
  _entity_id text, _success boolean, _metadata jsonb, _ip text, _user_agent text, _browser text, _device text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    IF _action NOT LIKE 'auth.%' THEN RAISE EXCEPTION 'not allowed'; END IF;
  ELSIF _user_id IS NOT NULL AND _user_id <> auth.uid() THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  INSERT INTO audit_logs(user_id, actor_email, action, entity, entity_id, success, metadata, ip_address, user_agent, browser, device)
  VALUES (_user_id, left(_actor_email,200), left(_action,120), left(_entity,120), left(_entity_id,120),
          coalesce(_success,true), coalesce(_metadata,'{}'::jsonb), left(_ip,80), left(_user_agent,400), left(_browser,120), left(_device,120));
END $$;

CREATE OR REPLACE FUNCTION public.register_my_session(_remember boolean, _ip text, _user_agent text, _browser text, _device text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not allowed'; END IF;
  SELECT id INTO _id FROM user_sessions WHERE user_id = auth.uid() AND revoked_at IS NULL
    AND coalesce(user_agent,'') = coalesce(_user_agent,'') AND coalesce(ip_address,'') = coalesce(_ip,'') LIMIT 1;
  IF _id IS NOT NULL THEN
    UPDATE user_sessions SET last_seen_at = now(), remember_me = coalesce(_remember,false) WHERE id = _id;
  ELSE
    INSERT INTO user_sessions(user_id, ip_address, user_agent, browser, device, remember_me, last_seen_at)
    VALUES (auth.uid(), _ip, _user_agent, _browser, _device, coalesce(_remember,false), now());
  END IF;
  UPDATE profiles SET last_login_at = now() WHERE id = auth.uid();
END $$;

-- ============ Finance: parent-side steps ============
CREATE OR REPLACE FUNCTION public.apply_invoice_plan(_application_id uuid, _invoice jsonb, _items jsonb,
  _installments jsonb, _payment_status text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _parent uuid; _year text; _inv uuid; _paid numeric; _sum numeric;
BEGIN
  SELECT parent_id INTO _parent FROM applications WHERE id = _application_id;
  IF _parent IS NULL THEN RAISE EXCEPTION 'application not found'; END IF;
  IF auth.uid() IS NULL OR (auth.uid() <> _parent AND NOT public.is_school_staff(auth.uid())) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  _year := _invoice->>'academic_year';
  SELECT coalesce(sum((x->>'amount')::numeric),0) INTO _sum FROM jsonb_array_elements(_installments) x;
  IF (_invoice->>'grand_total')::numeric < 0 OR abs(_sum - (_invoice->>'grand_total')::numeric) > 1 THEN
    RAISE EXCEPTION 'invalid schedule';
  END IF;
  SELECT id, paid_total INTO _inv, _paid FROM invoices WHERE application_id = _application_id AND academic_year = _year;
  IF _inv IS NOT NULL AND coalesce(_paid,0) > 0 THEN RAISE EXCEPTION 'invoice already paid'; END IF;
  IF _inv IS NOT NULL THEN
    UPDATE invoices SET status = _invoice->>'status', plan_type = _invoice->>'plan_type',
      installments_count = (_invoice->>'installments_count')::int, admission_fee = (_invoice->>'admission_fee')::numeric,
      tuition_total = (_invoice->>'tuition_total')::numeric, services_total = (_invoice->>'services_total')::numeric,
      discount_total = (_invoice->>'discount_total')::numeric, grand_total = (_invoice->>'grand_total')::numeric,
      qurra_covered = (_invoice->>'qurra_covered')::boolean, paid_total = 0
    WHERE id = _inv;
    DELETE FROM invoice_items WHERE invoice_id = _inv;
    DELETE FROM installments WHERE invoice_id = _inv;
  ELSE
    INSERT INTO invoices(application_id, parent_id, academic_year, status, plan_type, installments_count, admission_fee,
      tuition_total, services_total, discount_total, grand_total, qurra_covered, paid_total)
    VALUES (_application_id, _parent, _year, _invoice->>'status', _invoice->>'plan_type',
      (_invoice->>'installments_count')::int, (_invoice->>'admission_fee')::numeric, (_invoice->>'tuition_total')::numeric,
      (_invoice->>'services_total')::numeric, (_invoice->>'discount_total')::numeric, (_invoice->>'grand_total')::numeric,
      (_invoice->>'qurra_covered')::boolean, 0)
    RETURNING id INTO _inv;
  END IF;
  INSERT INTO invoice_items(invoice_id, kind, label_ar, amount, qurra_covered)
    SELECT _inv, x->>'kind', x->>'label_ar', (x->>'amount')::numeric, coalesce((x->>'qurra_covered')::boolean,false)
    FROM jsonb_array_elements(_items) x;
  INSERT INTO installments(invoice_id, seq, amount, paid_amount, due_date, status, note, paid_at)
    SELECT _inv, (x->>'seq')::int, (x->>'amount')::numeric, coalesce((x->>'paid_amount')::numeric,0),
      (x->>'due_date')::date, coalesce(x->>'status','due'), x->>'note', (x->>'paid_at')::timestamptz
    FROM jsonb_array_elements(_installments) x;
  IF _payment_status IS NOT NULL THEN
    UPDATE applications SET payment_status = _payment_status WHERE id = _application_id;
  END IF;
  RETURN _inv;
END $$;

CREATE OR REPLACE FUNCTION public.mark_installment_pending_review(_installment_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE installments i SET status = 'pending_review'
  FROM invoices v
  WHERE i.id = _installment_id AND v.id = i.invoice_id AND i.status = 'due'
    AND auth.uid() IS NOT NULL AND (v.parent_id = auth.uid() OR public.is_school_staff(auth.uid()));
  RETURN FOUND;
END $$;

-- ============ Grants ============
REVOKE EXECUTE ON FUNCTION public.classroom_roster(uuid), public.classroom_teacher_ids(uuid), public.profile_cards(uuid[]),
  public.child_brief(uuid), public.sync_private_chat_guardian(uuid), public.set_classroom_parent_posting(uuid, boolean),
  public.register_my_session(boolean, text, text, text, text), public.apply_invoice_plan(uuid, jsonb, jsonb, jsonb, text),
  public.mark_installment_pending_review(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.classroom_roster(uuid), public.classroom_teacher_ids(uuid), public.profile_cards(uuid[]),
  public.child_brief(uuid), public.sync_private_chat_guardian(uuid), public.set_classroom_parent_posting(uuid, boolean),
  public.register_my_session(boolean, text, text, text, text), public.apply_invoice_plan(uuid, jsonb, jsonb, jsonb, text),
  public.mark_installment_pending_review(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_login_attempt(text, text, text, boolean), public.login_rate_limited(text, text, integer, integer),
  public.resolve_login_email(text), public.write_audit_log(uuid, text, text, text, text, boolean, jsonb, text, text, text, text)
  TO anon, authenticated, service_role;

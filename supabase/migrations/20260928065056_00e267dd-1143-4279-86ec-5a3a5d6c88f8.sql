CREATE TABLE public.custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  description_ar text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT 'bg-lavender/70 text-foreground',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.custom_roles TO authenticated;
GRANT ALL ON public.custom_roles TO service_role;
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read custom roles"
  ON public.custom_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage custom roles"
  ON public.custom_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.custom_role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_role_id uuid NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  permission_key text NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (custom_role_id, permission_key)
);

GRANT SELECT ON public.custom_role_permissions TO authenticated;
GRANT ALL ON public.custom_role_permissions TO service_role;
ALTER TABLE public.custom_role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read custom role permissions"
  ON public.custom_role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage custom role permissions"
  ON public.custom_role_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.user_custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  custom_role_id uuid NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, custom_role_id)
);

CREATE INDEX idx_user_custom_roles_user ON public.user_custom_roles(user_id);

GRANT SELECT ON public.user_custom_roles TO authenticated;
GRANT ALL ON public.user_custom_roles TO service_role;
ALTER TABLE public.user_custom_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own custom roles"
  ON public.user_custom_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage user custom roles"
  ON public.user_custom_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_custom_roles_updated_at
  BEFORE UPDATE ON public.custom_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Permission checks now also honour active custom roles.
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT up.granted FROM public.user_permissions up
      WHERE up.user_id = _user_id AND up.permission_key = _permission),
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.role_permissions rp ON rp.role = ur.role
      WHERE ur.user_id = _user_id AND rp.permission_key = _permission
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_custom_roles ucr
      JOIN public.custom_roles cr ON cr.id = ucr.custom_role_id AND cr.is_active
      JOIN public.custom_role_permissions crp ON crp.custom_role_id = cr.id
      WHERE ucr.user_id = _user_id AND crp.permission_key = _permission
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.admin_upsert_custom_role(
  _id uuid,
  _slug text,
  _name_ar text,
  _description_ar text,
  _color text,
  _is_active boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
  v_slug text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_slug := nullif(trim(coalesce(_slug, '')), '');
  IF v_slug IS NULL THEN
    v_slug := 'role_' || replace(gen_random_uuid()::text, '-', '');
  END IF;

  IF _id IS NULL THEN
    INSERT INTO public.custom_roles (slug, name_ar, description_ar, color, is_active, created_by)
    VALUES (
      v_slug,
      _name_ar,
      coalesce(_description_ar, ''),
      coalesce(nullif(trim(coalesce(_color, '')), ''), 'bg-lavender/70 text-foreground'),
      coalesce(_is_active, true),
      auth.uid()
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.custom_roles
      SET name_ar = _name_ar,
          description_ar = coalesce(_description_ar, ''),
          color = coalesce(nullif(trim(coalesce(_color, '')), ''), color),
          is_active = coalesce(_is_active, is_active)
      WHERE id = _id
      RETURNING id INTO v_id;
    IF v_id IS NULL THEN
      RAISE EXCEPTION 'not_found';
    END IF;
  END IF;

  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_delete_custom_role(_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  DELETE FROM public.custom_roles WHERE id = _id;
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_set_custom_role_permissions(
  _custom_role_id uuid,
  _permission_keys text[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  DELETE FROM public.custom_role_permissions WHERE custom_role_id = _custom_role_id;

  IF _permission_keys IS NOT NULL AND array_length(_permission_keys, 1) IS NOT NULL THEN
    INSERT INTO public.custom_role_permissions (custom_role_id, permission_key)
    SELECT _custom_role_id, k
    FROM unnest(_permission_keys) AS k
    WHERE EXISTS (SELECT 1 FROM public.permissions p WHERE p.key = k)
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;

  RETURN v_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_set_user_custom_roles(
  _user_id uuid,
  _custom_role_ids uuid[]
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  DELETE FROM public.user_custom_roles WHERE user_id = _user_id;

  IF _custom_role_ids IS NOT NULL AND array_length(_custom_role_ids, 1) IS NOT NULL THEN
    INSERT INTO public.user_custom_roles (user_id, custom_role_id, created_by)
    SELECT _user_id, rid, auth.uid()
    FROM unnest(_custom_role_ids) AS rid
    WHERE EXISTS (SELECT 1 FROM public.custom_roles cr WHERE cr.id = rid)
    ON CONFLICT (user_id, custom_role_id) DO NOTHING;
  END IF;

  RETURN true;
END;
$function$;
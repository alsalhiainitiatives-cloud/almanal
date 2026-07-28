CREATE TABLE public.classroom_locks (
  classroom_id uuid PRIMARY KEY REFERENCES public.classrooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '60 seconds',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.classroom_locks TO authenticated;
GRANT ALL ON public.classroom_locks TO service_role;

ALTER TABLE public.classroom_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read classroom locks"
ON public.classroom_locks FOR SELECT TO authenticated
USING (public.is_school_staff(auth.uid()));

CREATE TRIGGER update_classroom_locks_updated_at
BEFORE UPDATE ON public.classroom_locks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.acquire_classroom_lock(_classroom_id uuid, _ttl_seconds integer DEFAULT 60)
RETURNS TABLE(classroom_id uuid, user_id uuid, user_name text, acquired_at timestamptz, expires_at timestamptz, acquired boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ttl integer := LEAST(GREATEST(COALESCE(_ttl_seconds, 60), 15), 300);
  v_name text;
  v_row public.classroom_locks%ROWTYPE;
BEGIN
  IF NOT public.is_school_staff(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  DELETE FROM public.classroom_locks WHERE expires_at < now();

  SELECT COALESCE(NULLIF(trim(p.full_name), ''), p.email) INTO v_name
  FROM public.profiles p WHERE p.id = auth.uid();

  INSERT INTO public.classroom_locks AS l (classroom_id, user_id, user_name, acquired_at, expires_at)
  VALUES (_classroom_id, auth.uid(), v_name, now(), now() + make_interval(secs => v_ttl))
  ON CONFLICT (classroom_id) DO UPDATE
    SET user_id = EXCLUDED.user_id,
        user_name = EXCLUDED.user_name,
        expires_at = EXCLUDED.expires_at,
        updated_at = now()
    WHERE l.user_id = auth.uid() OR l.expires_at < now()
  RETURNING * INTO v_row;

  IF v_row.classroom_id IS NULL THEN
    SELECT * INTO v_row FROM public.classroom_locks WHERE public.classroom_locks.classroom_id = _classroom_id;
    RETURN QUERY SELECT v_row.classroom_id, v_row.user_id, v_row.user_name, v_row.acquired_at, v_row.expires_at, false;
  ELSE
    RETURN QUERY SELECT v_row.classroom_id, v_row.user_id, v_row.user_name, v_row.acquired_at, v_row.expires_at, true;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_classroom_lock(_classroom_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT public.is_school_staff(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  DELETE FROM public.classroom_locks
  WHERE classroom_id = _classroom_id AND (user_id = auth.uid() OR expires_at < now());

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_my_classroom_locks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  DELETE FROM public.classroom_locks WHERE user_id = auth.uid();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.active_classroom_locks()
RETURNS TABLE(classroom_id uuid, user_id uuid, user_name text, acquired_at timestamptz, expires_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT l.classroom_id, l.user_id, l.user_name, l.acquired_at, l.expires_at
  FROM public.classroom_locks l
  WHERE l.expires_at > now()
    AND public.is_school_staff(auth.uid());
$$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.classroom_locks;
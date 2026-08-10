CREATE TABLE public.academic_number_counters (
  prefix text PRIMARY KEY,
  last_value bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.academic_number_counters TO service_role;

ALTER TABLE public.academic_number_counters ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.next_academic_number(_prefix text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_prefix text := upper(trim(coalesce(_prefix, '')));
  v_next bigint;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF v_prefix !~ '^MN-[0-9]+-[0-9]{2}$' THEN
    RAISE EXCEPTION 'invalid_prefix';
  END IF;

  INSERT INTO public.academic_number_counters AS counters (prefix, last_value)
  VALUES (
    v_prefix,
    GREATEST(
      COALESCE((
        SELECT MAX(substring(n.number_value FROM '^MN-[0-9]+-[0-9]{2}-([0-9]+)$')::bigint)
        FROM (
          SELECT application_number AS number_value FROM public.applications
          UNION ALL
          SELECT student_number AS number_value FROM public.applications
        ) n
        WHERE n.number_value LIKE v_prefix || '-%'
          AND n.number_value ~ '^MN-[0-9]+-[0-9]{2}-[0-9]+$'
      ), 0),
      0
    ) + 1
  )
  ON CONFLICT (prefix) DO UPDATE
  SET last_value = GREATEST(
        counters.last_value,
        COALESCE((
          SELECT MAX(substring(n.number_value FROM '^MN-[0-9]+-[0-9]{2}-([0-9]+)$')::bigint)
          FROM (
            SELECT application_number AS number_value FROM public.applications
            UNION ALL
            SELECT student_number AS number_value FROM public.applications
          ) n
          WHERE n.number_value LIKE v_prefix || '-%'
            AND n.number_value ~ '^MN-[0-9]+-[0-9]{2}-[0-9]+$'
        ), 0)
      ) + 1,
      updated_at = now()
  RETURNING last_value INTO v_next;

  RETURN v_prefix || '-' || lpad(v_next::text, 3, '0');
END;
$function$;

REVOKE ALL ON FUNCTION public.next_academic_number(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.next_academic_number(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.cleanup_source_reservation_on_application_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.seat_reservations
  WHERE application_id = OLD.id;
  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS trg_cleanup_source_reservation_on_application_delete ON public.applications;
CREATE TRIGGER trg_cleanup_source_reservation_on_application_delete
BEFORE DELETE ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_source_reservation_on_application_delete();

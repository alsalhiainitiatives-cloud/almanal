CREATE TABLE public.invoice_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_staff boolean NOT NULL DEFAULT false,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.invoice_messages TO authenticated;
GRANT ALL ON public.invoice_messages TO service_role;

ALTER TABLE public.invoice_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents and staff read invoice messages"
ON public.invoice_messages FOR SELECT TO authenticated
USING (
  public.is_school_staff(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_messages.invoice_id AND i.parent_id = auth.uid()
  )
);

CREATE POLICY "Parents and staff write invoice messages"
ON public.invoice_messages FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND (
    public.is_school_staff(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_messages.invoice_id AND i.parent_id = auth.uid()
    )
  )
);

CREATE INDEX invoice_messages_invoice_idx ON public.invoice_messages (invoice_id, created_at);

CREATE TRIGGER update_invoice_messages_updated_at
BEFORE UPDATE ON public.invoice_messages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
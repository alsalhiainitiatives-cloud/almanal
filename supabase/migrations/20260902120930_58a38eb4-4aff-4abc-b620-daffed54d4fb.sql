CREATE POLICY "bank_accounts_read_active_authenticated"
ON public.bank_accounts
FOR SELECT
TO authenticated
USING (is_active = true);
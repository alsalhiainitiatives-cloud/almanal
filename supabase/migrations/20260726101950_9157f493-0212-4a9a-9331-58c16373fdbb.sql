GRANT INSERT ON public.contact_messages TO anon, authenticated;
CREATE POLICY "Anyone can submit a contact message" ON public.contact_messages FOR INSERT TO anon, authenticated WITH CHECK (true);
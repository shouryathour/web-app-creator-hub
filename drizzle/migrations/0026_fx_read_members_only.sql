DROP POLICY IF EXISTS "fx read" ON public.fx_rates;
CREATE POLICY "fx read" ON public.fx_rates FOR SELECT TO authenticated USING (public.is_active_user());
DROP POLICY IF EXISTS "fx hist read" ON public.fx_rates_history;
CREATE POLICY "fx hist read" ON public.fx_rates_history FOR SELECT TO authenticated USING (public.is_active_user());
DROP POLICY IF EXISTS "fx write" ON public.fx_rates;
DROP POLICY IF EXISTS "fx read" ON public.fx_rates;
DROP POLICY IF EXISTS "fx hist write" ON public.fx_rates_history;
DROP POLICY IF EXISTS "fx hist read" ON public.fx_rates_history;
REVOKE INSERT, UPDATE, DELETE ON public.fx_rates, public.fx_rates_history FROM anon, authenticated;
GRANT SELECT ON public.fx_rates, public.fx_rates_history TO authenticated;
GRANT ALL ON public.fx_rates, public.fx_rates_history TO service_role;
CREATE POLICY "fx read" ON public.fx_rates FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "fx hist read" ON public.fx_rates_history FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
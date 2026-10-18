CREATE OR REPLACE FUNCTION public.delete_followup(_id uuid) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE lid uuid; item record; n integer := 0;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
 SELECT lead_id INTO lid FROM public.lead_followups WHERE id = _id;
 IF lid IS NULL THEN RAISE EXCEPTION 'Follow-up not found'; END IF;
 PERFORM 1 FROM public.leads WHERE id = lid FOR UPDATE;
 DELETE FROM public.lead_followups WHERE id = _id;
 FOR item IN SELECT id FROM public.lead_followups WHERE lead_id = lid ORDER BY sequence_number FOR UPDATE LOOP
  n := n + 1;
  UPDATE public.lead_followups SET sequence_number = n WHERE id = item.id;
 END LOOP;
END; $$;
REVOKE ALL ON FUNCTION public.delete_followup(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_followup(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.set_primary_contact(_id uuid) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE lid uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
 SELECT lead_id INTO lid FROM public.lead_contacts WHERE id = _id;
 IF lid IS NULL THEN RAISE EXCEPTION 'Contact not found'; END IF;
 PERFORM 1 FROM public.leads WHERE id = lid FOR UPDATE;
 UPDATE public.lead_contacts SET is_primary = false WHERE lead_id = lid AND id <> _id AND is_primary;
 UPDATE public.lead_contacts SET is_primary = true WHERE id = _id;
END; $$;
REVOKE ALL ON FUNCTION public.set_primary_contact(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_primary_contact(uuid) TO authenticated;
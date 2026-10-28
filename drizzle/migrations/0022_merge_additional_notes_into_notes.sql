CREATE OR REPLACE FUNCTION public.leads_merge_additional_notes()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF coalesce(NEW.additional_notes, '') <> '' THEN
    NEW.research_notes := CASE WHEN coalesce(NEW.research_notes, '') = '' THEN NEW.additional_notes
      ELSE NEW.research_notes || E'\n\n' || NEW.additional_notes END;
    NEW.additional_notes := NULL;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS leads_merge_additional_notes ON public.leads;
CREATE TRIGGER leads_merge_additional_notes BEFORE INSERT OR UPDATE OF additional_notes ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.leads_merge_additional_notes();
COMMENT ON COLUMN public.leads.additional_notes IS 'DEPRECATED: merged into research_notes (shown as Notes) by trigger';
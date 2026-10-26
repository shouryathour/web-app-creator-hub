CREATE OR REPLACE FUNCTION public.search_leads_fuzzy(q text, lim int DEFAULT 10)
RETURNS TABLE(id uuid, company_name text, lead_code text, archived boolean, matched text, score real)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, extensions
AS $$
  WITH term AS (SELECT lower(trim(q)) AS t),
  cand AS (
    SELECT l.id, l.company_name AS v, NULL::text AS who FROM leads l
    UNION ALL SELECT l.id, l.lead_code, NULL FROM leads l
    UNION ALL SELECT l.id, l.primary_contact, NULL FROM leads l
    UNION ALL SELECT c.lead_id, c.email, c.person_name FROM lead_contacts c
    UNION ALL SELECT c.lead_id, c.person_name, c.person_name FROM lead_contacts c
    UNION ALL SELECT c.lead_id,
      CASE WHEN jsonb_typeof(e.value) = 'object' THEN e.value->>'email' ELSE e.value #>> '{}' END, c.person_name
    FROM lead_contacts c,
      jsonb_array_elements(CASE WHEN jsonb_typeof(c.emails) = 'array' THEN c.emails ELSE '[]'::jsonb END) e(value)
  ),
  scored AS (
    SELECT cand.id, cand.v, cand.who,
      CASE WHEN lower(cand.v) = term.t THEN 2
           WHEN position(term.t in lower(cand.v)) > 0 THEN 1.5
           ELSE greatest(similarity(lower(cand.v), term.t), word_similarity(term.t, lower(cand.v))) END::real AS s
    FROM cand, term WHERE cand.v IS NOT NULL AND cand.v <> ''
  ),
  best AS (
    SELECT DISTINCT ON (scored.id) scored.id, scored.v, scored.who, scored.s
    FROM scored WHERE scored.s >= 0.35 ORDER BY scored.id, scored.s DESC
  )
  SELECT l.id, l.company_name, l.lead_code, l.archived,
    concat_ws(', ', b.v, NULLIF(b.who, b.v)) AS matched, b.s
  FROM best b JOIN leads l ON l.id = b.id
  ORDER BY b.s DESC LIMIT lim;
$$;
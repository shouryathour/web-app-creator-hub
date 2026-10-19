ALTER TABLE public.sender_accounts ADD COLUMN IF NOT EXISTS color text;
WITH ranked AS (
  SELECT id, (row_number() OVER (PARTITION BY workspace_id ORDER BY created_at) - 1) % 10 AS n FROM public.sender_accounts
)
UPDATE public.sender_accounts s SET color = (ARRAY['#2563EB','#16A34A','#D97706','#DC2626','#7C3AED','#0891B2','#DB2777','#65A30D','#EA580C','#4F46E5'])[ranked.n + 1]
FROM ranked WHERE ranked.id = s.id AND s.color IS NULL;
create or replace function public.prospect_numbers()
returns table(id uuid, n bigint)
language sql stable security invoker set search_path = public
as $$
  select l.id, row_number() over (order by l.date_added, l.created_at, l.lead_code)
  from public.leads l
  where l.workspace_id = public.current_ws();
$$;
grant execute on function public.prospect_numbers() to authenticated;
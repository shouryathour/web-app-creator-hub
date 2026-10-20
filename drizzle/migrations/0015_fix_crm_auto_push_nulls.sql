CREATE OR REPLACE FUNCTION public.crm_auto_push(_lead_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare l public.leads%rowtype; sname text; rid uuid; ws uuid; cur_ord int; tgt uuid; tgt_ord int; tgt_prob int; want text;
begin
  select * into l from public.leads where id = _lead_id;
  if l.id is null or l.archived then return; end if;
  select lower(trim(name)) into sname from public.stages where id = l.stage_id;
  if not coalesce(
    ((l.email_replied or l.linkedin_replied or l.instagram_replied) and coalesce(l.reply_sentiment,'') <> 'negative')
    or coalesce(l.reply_sentiment,'') in ('positive','neutral')
    or coalesce(sname,'') in ('replied','call booked','proposal sent'), false
  ) then return; end if;
  rid := public.ensure_crm_record(_lead_id);
  if rid is null then return; end if;
  want := case when sname in ('call booked','proposal sent') then sname else null end;
  if l.meeting_booked and want is null then want := 'call booked'; end if;
  if want is null then return; end if;
  ws := l.workspace_id;
  select id, order_index, default_probability into tgt, tgt_ord, tgt_prob from public.stages
   where board='crm' and workspace_id=ws and lower(trim(name))=want and not is_archived limit 1;
  if tgt is null then return; end if;
  select s.order_index into cur_ord from public.crm_records c left join public.stages s on s.id=c.stage_id where c.id=rid;
  if cur_ord is null or cur_ord < tgt_ord then
    update public.crm_records set stage_id=tgt, probability=coalesce(tgt_prob, probability) where id=rid;
  end if;
end $$;
REVOKE ALL ON FUNCTION public.crm_auto_push(uuid) FROM public, anon, authenticated;
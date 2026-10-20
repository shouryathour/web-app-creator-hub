CREATE OR REPLACE FUNCTION public.crm_auto_push(_lead_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare l public.leads%rowtype; sname text; rid uuid; ws uuid; cur_ord int; tgt uuid; tgt_ord int; tgt_prob int; want text;
begin
  select * into l from public.leads where id = _lead_id;
  if l.id is null or l.archived then return; end if;
  select lower(trim(name)) into sname from public.stages where id = l.stage_id;
  if not (
    ((l.email_replied or l.linkedin_replied or l.instagram_replied) and coalesce(l.reply_sentiment,'') <> 'negative')
    or l.reply_sentiment in ('positive','neutral')
    or coalesce(sname,'') in ('replied','call booked','proposal sent')
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

CREATE OR REPLACE FUNCTION public.leads_after_change()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  old_stage text; new_stage text; new_stage_name text;
  new_is_lost boolean := false; new_is_won boolean := false;
begin
  if TG_OP = 'INSERT' then
    insert into public.lead_events (lead_id, event_type, meta, created_by)
    values (new.id, 'lead_created', jsonb_build_object('company', new.company_name), auth.uid());
    return new;
  end if;
  if new.stage_id is distinct from old.stage_id then
    select name into old_stage from public.stages where id = old.stage_id;
    select name into new_stage from public.stages where id = new.stage_id;
    insert into public.lead_events (lead_id, event_type, meta, created_by)
    values (new.id, 'stage_changed', jsonb_build_object('stage_id', new.stage_id, 'from', old_stage, 'to', new_stage), auth.uid());
  end if;
  if new.status is distinct from old.status then
    insert into public.lead_events (lead_id, event_type, meta, created_by)
    values (new.id, 'status_changed', jsonb_build_object('status', new.status, 'from', old.status, 'to', new.status), auth.uid());
  end if;
  if new.priority is distinct from old.priority then
    insert into public.lead_events (lead_id, event_type, meta, created_by)
    values (new.id, 'priority_changed', jsonb_build_object('from', old.priority, 'to', new.priority), auth.uid());
  end if;
  if new.reply_sentiment is distinct from old.reply_sentiment then
    insert into public.lead_events (lead_id, event_type, meta, created_by)
    values (new.id, 'sentiment_changed', jsonb_build_object('from', old.reply_sentiment, 'to', new.reply_sentiment), auth.uid());
  end if;
  if new.archived is distinct from old.archived then
    insert into public.lead_events (lead_id, event_type, meta, created_by)
    values (new.id, case when new.archived then 'archived' else 'restored' end, '{}'::jsonb, auth.uid());
  end if;
  if new.email_sent and not old.email_sent then
    insert into public.lead_events (lead_id, event_type, occurred_at, meta, created_by)
      values (new.id,'email_sent', coalesce(new.email_sent_at, now()), jsonb_build_object('sender_account_id', new.sender_account_id), auth.uid());
  end if;
  if new.email_viewed and not old.email_viewed then
    insert into public.lead_events (lead_id, event_type, occurred_at, meta, created_by) values (new.id,'email_viewed', coalesce(new.email_viewed_at, now()), '{}'::jsonb, auth.uid());
  end if;
  if new.email_replied and not old.email_replied then
    insert into public.lead_events (lead_id, event_type, occurred_at, meta, created_by) values (new.id,'email_replied', coalesce(new.email_replied_at, now()), '{}'::jsonb, auth.uid());
  end if;
  if new.loom_sent and not old.loom_sent then
    insert into public.lead_events (lead_id, event_type, occurred_at, meta, created_by) values (new.id,'loom_sent', coalesce(new.loom_sent_at, now()), '{}'::jsonb, auth.uid());
  end if;
  if new.loom_watched and not old.loom_watched then
    insert into public.lead_events (lead_id, event_type, occurred_at, meta, created_by) values (new.id,'loom_watched', coalesce(new.loom_watched_at, now()), '{}'::jsonb, auth.uid());
  end if;
  if new.linkedin_connection_sent and not old.linkedin_connection_sent then
    insert into public.lead_events (lead_id, event_type, occurred_at, meta, created_by) values (new.id,'linkedin_connection_sent', coalesce(new.linkedin_connection_sent_at, now()), '{}'::jsonb, auth.uid());
  end if;
  if new.linkedin_sent and not old.linkedin_sent then
    insert into public.lead_events (lead_id, event_type, occurred_at, meta, created_by) values (new.id,'linkedin_sent', coalesce(new.linkedin_sent_at, now()), '{}'::jsonb, auth.uid());
  end if;
  if new.linkedin_replied and not old.linkedin_replied then
    insert into public.lead_events (lead_id, event_type, occurred_at, meta, created_by) values (new.id,'linkedin_replied', coalesce(new.linkedin_replied_at, now()), '{}'::jsonb, auth.uid());
  end if;
  if new.instagram_sent and not old.instagram_sent then
    insert into public.lead_events (lead_id, event_type, occurred_at, meta, created_by) values (new.id,'instagram_sent', coalesce(new.instagram_sent_at, now()), '{}'::jsonb, auth.uid());
  end if;
  if new.instagram_replied and not old.instagram_replied then
    insert into public.lead_events (lead_id, event_type, occurred_at, meta, created_by) values (new.id,'instagram_replied', coalesce(new.instagram_replied_at, now()), '{}'::jsonb, auth.uid());
  end if;
  if new.meeting_booked and not old.meeting_booked then
    insert into public.lead_events (lead_id, event_type, occurred_at, meta, created_by) values (new.id,'meeting_booked', coalesce(new.meeting_booked_at, now()), '{}'::jsonb, auth.uid());
  end if;
  if new.client_closed and not old.client_closed then
    insert into public.lead_events (lead_id, event_type, occurred_at, meta, created_by) values (new.id,'client_closed', coalesce(new.client_closed_at, now()), '{}'::jsonb, auth.uid());
  end if;

  if new.stage_id is distinct from old.stage_id or new.reply_sentiment is distinct from old.reply_sentiment
     or new.email_replied <> old.email_replied or new.linkedin_replied <> old.linkedin_replied
     or new.instagram_replied <> old.instagram_replied or new.meeting_booked <> old.meeting_booked
     or new.archived <> old.archived then
    perform public.crm_auto_push(new.id);
  end if;

  if new.stage_id is not null then
    select name, is_lost, is_won into new_stage_name, new_is_lost, new_is_won from public.stages where id = new.stage_id;
  end if;
  if (new.stage_id is distinct from old.stage_id or new.status is distinct from old.status)
     and (coalesce(new_is_lost, false) or coalesce(new_stage_name, '') ilike 'not %' or new.status = 'lost') then
    perform public.set_crm_stage(new.id, 'lost');
  elsif (new.stage_id is distinct from old.stage_id or new.status is distinct from old.status
         or (new.client_closed and not old.client_closed))
        and (coalesce(new_is_won, false) or new.status = 'won' or (new.client_closed and not old.client_closed)) then
    perform public.set_crm_stage(new.id, 'won');
  end if;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.leads_log_insert_flags()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare f text; flags text[] := array[
  'email_sent','email_viewed','email_replied','loom_sent','loom_watched','linkedin_connection_sent',
  'linkedin_sent','linkedin_replied','instagram_sent','instagram_replied','meeting_booked','client_closed'];
  j jsonb := to_jsonb(new);
begin
  foreach f in array flags loop
    if coalesce((j->>f)::boolean, false) then
      insert into public.lead_events (workspace_id, lead_id, event_type, occurred_at, meta, created_by)
      values (new.workspace_id, new.id, f, coalesce((j->>(f || '_at'))::timestamptz, now()),
              case when f = 'email_sent' then jsonb_build_object('sender_account_id', new.sender_account_id) else '{}'::jsonb end,
              coalesce(auth.uid(), new.created_by));
    end if;
  end loop;
  perform public.crm_auto_push(new.id);
  return new;
end $function$;

REVOKE ALL ON FUNCTION public.crm_auto_push(uuid) FROM public, anon, authenticated;
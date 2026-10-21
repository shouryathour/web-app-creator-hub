CREATE OR REPLACE FUNCTION public.leads_stage_automation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
declare sname text; ck text; rk text; outreach_changed boolean;
begin
  outreach_changed := new.email_sent is distinct from old.email_sent
    or new.email_viewed is distinct from old.email_viewed
    or new.email_replied is distinct from old.email_replied
    or new.linkedin_connection_sent is distinct from old.linkedin_connection_sent
    or new.linkedin_sent is distinct from old.linkedin_sent
    or new.linkedin_replied is distinct from old.linkedin_replied
    or new.instagram_sent is distinct from old.instagram_sent
    or new.instagram_replied is distinct from old.instagram_replied;
  if new.stage_id is distinct from old.stage_id and new.stage_id is not null then
    select name into sname from public.stages where id = new.stage_id;
    select kind::text into ck from public.channels where id = new.contacted_channel_id;
    select kind::text into rk from public.channels where id = new.reply_channel_id;
    ck := coalesce(ck, 'email'); rk := coalesce(rk, ck);
    if sname ilike 'contacted%' and not outreach_changed then
      if ck = 'linkedin' and new.linkedin_connection_sent then
        new.linkedin_sent := true; new.linkedin_sent_at := coalesce(new.linkedin_sent_at, now());
      elsif ck = 'instagram' then
        new.instagram_sent := true; new.instagram_sent_at := coalesce(new.instagram_sent_at, now());
      elsif ck = 'email' then
        new.email_sent := true; new.email_sent_at := coalesce(new.email_sent_at, now());
      end if;
      if new.email_sent or new.linkedin_sent or new.instagram_sent then
        new.last_contacted_at := coalesce(new.last_contacted_at, now());
      end if;
    elsif sname ilike 'replied%' and not outreach_changed then
      if rk = 'linkedin' and new.linkedin_connection_sent and new.linkedin_sent then
        new.linkedin_replied := true; new.linkedin_replied_at := coalesce(new.linkedin_replied_at, now());
      elsif rk = 'instagram' and new.instagram_sent then
        new.instagram_replied := true; new.instagram_replied_at := coalesce(new.instagram_replied_at, now());
      elsif rk = 'email' and new.email_sent then
        new.email_replied := true; new.email_replied_at := coalesce(new.email_replied_at, now());
      end if;
    elsif sname ilike '%call booked%' or sname ilike '%meeting%' then
      if not new.meeting_booked then
        new.meeting_booked := true; new.meeting_booked_at := coalesce(new.meeting_booked_at, now());
      end if;
    elsif sname ilike 'client%' then
      if not new.client_closed then
        new.client_closed := true; new.client_closed_at := coalesce(new.client_closed_at, now());
      end if;
    end if;
  end if;
  return new;
end $$;

CREATE OR REPLACE FUNCTION public.validate_outreach_order()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path TO 'public'
AS $$
declare before_row jsonb := '{}'::jsonb; after_row jsonb := to_jsonb(new); rule record;
begin
  if TG_OP = 'UPDATE' then before_row := to_jsonb(old); end if;
  for rule in select * from (values
    ('email_viewed', 'email_sent', 'Mark Email sent before Email viewed'),
    ('email_replied', 'email_sent', 'Mark Email sent before Email replied'),
    ('linkedin_sent', 'linkedin_connection_sent', 'Mark LinkedIn connection request sent before LinkedIn message sent'),
    ('linkedin_replied', 'linkedin_connection_sent', 'Mark LinkedIn connection request sent before LinkedIn replied'),
    ('linkedin_replied', 'linkedin_sent', 'Mark LinkedIn message sent before LinkedIn replied'),
    ('instagram_replied', 'instagram_sent', 'Mark Instagram sent before Instagram replied')
  ) as rules(field, prerequisite, message) loop
    if coalesce((after_row->>rule.field)::boolean, false)
       and not coalesce((before_row->>rule.field)::boolean, false)
       and not coalesce((after_row->>rule.prerequisite)::boolean, false) then
      raise exception '%', rule.message using errcode = '23514';
    end if;
  end loop;
  return new;
end $$;
CREATE TRIGGER leads_validate_outreach_order BEFORE INSERT OR UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.validate_outreach_order();
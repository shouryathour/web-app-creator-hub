CREATE OR REPLACE FUNCTION public.leads_stage_automation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
declare
  sname text;
  ck text;
  rk text;
  sent_changed boolean;
  reply_changed boolean;
begin
  sent_changed := new.email_sent is distinct from old.email_sent
    or new.linkedin_sent is distinct from old.linkedin_sent
    or new.instagram_sent is distinct from old.instagram_sent
    or new.linkedin_connection_sent is distinct from old.linkedin_connection_sent;
  reply_changed := new.email_replied is distinct from old.email_replied
    or new.linkedin_replied is distinct from old.linkedin_replied
    or new.instagram_replied is distinct from old.instagram_replied;
  if new.stage_id is distinct from old.stage_id and new.stage_id is not null then
    select name into sname from public.stages where id = new.stage_id;
    select kind::text into ck from public.channels where id = new.contacted_channel_id;
    select kind::text into rk from public.channels where id = new.reply_channel_id;
    ck := coalesce(ck, 'email');
    rk := coalesce(rk, ck);
    -- Infer outreach only for a stage-only edit, never over an explicit tick correction.
    if sname ilike 'contacted%' and not sent_changed then
      if ck = 'linkedin' then
        if not new.linkedin_sent then
          new.linkedin_sent := true;
          new.linkedin_sent_at := coalesce(new.linkedin_sent_at, now());
        end if;
      elsif ck = 'instagram' then
        if not new.instagram_sent then
          new.instagram_sent := true;
          new.instagram_sent_at := coalesce(new.instagram_sent_at, now());
        end if;
      else
        if not new.email_sent then
          new.email_sent := true;
          new.email_sent_at := coalesce(new.email_sent_at, now());
        end if;
      end if;
      new.last_contacted_at := coalesce(new.last_contacted_at, now());
    elsif sname ilike 'replied%' and not reply_changed then
      if rk = 'linkedin' then
        if not new.linkedin_replied then
          new.linkedin_replied := true;
          new.linkedin_replied_at := coalesce(new.linkedin_replied_at, now());
        end if;
      elsif rk = 'instagram' then
        if not new.instagram_replied then
          new.instagram_replied := true;
          new.instagram_replied_at := coalesce(new.instagram_replied_at, now());
        end if;
      else
        if not new.email_replied then
          new.email_replied := true;
          new.email_replied_at := coalesce(new.email_replied_at, now());
        end if;
      end if;
    elsif sname ilike '%call booked%' or sname ilike '%meeting%' then
      if not new.meeting_booked then
        new.meeting_booked := true;
        new.meeting_booked_at := coalesce(new.meeting_booked_at, now());
      end if;
    elsif sname ilike 'client%' then
      if not new.client_closed then
        new.client_closed := true;
        new.client_closed_at := coalesce(new.client_closed_at, now());
      end if;
    end if;
  end if;
  -- Sent, viewed and replied are independent; never invent a view or re-tick it.
  return new;
end $$;
do $$
declare t text;
begin
  foreach t in array array[
    'stages','channels','sender_accounts','countries','tags','outreach_targets','outreach_daily',
    'app_settings','user_permissions','permission_presets','followup_templates','import_mappings',
    'outreach_templates','leads','lead_contacts','lead_links','lead_tags','lead_followups',
    'lead_events','lead_tasks','crm_records','crm_contact_log'] loop
    execute format('alter table public.%I alter column workspace_id set default public.current_ws()', t);
  end loop;
end $$;
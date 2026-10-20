CREATE TABLE public.access_requests (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  email text,
  full_name text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by uuid
);
GRANT SELECT ON public.access_requests TO authenticated;
GRANT ALL ON public.access_requests TO service_role;
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or owner can read requests" ON public.access_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR exists (select 1 from public.workspace_members m where m.user_id = auth.uid() and m.role = 'owner'));
ALTER PUBLICATION supabase_realtime ADD TABLE public.access_requests;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare nm text;
begin
  nm := coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), nullif(new.raw_user_meta_data->>'name', ''), split_part(new.email, '@', 1));
  insert into public.profiles (id, email, full_name, avatar_url, role, is_active)
  values (new.id, new.email, nm, new.raw_user_meta_data->>'avatar_url', 'member', true)
  on conflict (id) do nothing;
  insert into public.access_requests (user_id, email, full_name) values (new.id, new.email, nm)
  on conflict (user_id) do nothing;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.approve_access(_user uuid, _role app_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare ws uuid := public.current_ws();
begin
  if not public.is_owner() then raise exception 'Only the owner can approve people'; end if;
  if _role = 'owner' then raise exception 'People can be approved as admin or member only'; end if;
  insert into public.workspace_members (workspace_id, user_id, role) values (ws, _user, _role)
  on conflict (workspace_id, user_id) do update set role = excluded.role;
  update public.profiles set current_workspace_id = ws, is_active = true where id = _user;
  update public.access_requests set status = 'approved', decided_at = now(), decided_by = auth.uid() where user_id = _user;
end $$;

CREATE OR REPLACE FUNCTION public.reject_access(_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
begin
  if not public.is_owner() then raise exception 'Only the owner can remove people'; end if;
  if exists (select 1 from public.workspace_members where user_id = _user and role = 'owner') then
    raise exception 'The owner cannot be removed';
  end if;
  update public.access_requests set status = 'removed', decided_at = now(), decided_by = auth.uid() where user_id = _user;
  update public.profiles set is_active = false where id = _user;
end $$;

REVOKE EXECUTE ON FUNCTION public.create_workspace(text) FROM authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.approve_access(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_access(uuid) TO authenticated;
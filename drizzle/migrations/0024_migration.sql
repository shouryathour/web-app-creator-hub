create table public.ai_threads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_ws() references public.workspaces(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.ai_threads to authenticated;
grant all on public.ai_threads to service_role;
alter table public.ai_threads enable row level security;
create policy "own threads" on public.ai_threads for all to authenticated
  using (user_id = auth.uid() and public.is_ws_member(workspace_id))
  with check (user_id = auth.uid() and public.is_ws_member(workspace_id));

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.ai_threads(id) on delete cascade,
  msg_id text not null,
  role text not null,
  parts jsonb not null default '[]'::jsonb,
  model text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (thread_id, msg_id)
);
create index ai_messages_thread_idx on public.ai_messages(thread_id, created_at);
grant select, insert, update, delete on public.ai_messages to authenticated;
grant all on public.ai_messages to service_role;
alter table public.ai_messages enable row level security;
create policy "own thread messages" on public.ai_messages for all to authenticated
  using (exists (select 1 from public.ai_threads t where t.id = thread_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.ai_threads t where t.id = thread_id and t.user_id = auth.uid()));
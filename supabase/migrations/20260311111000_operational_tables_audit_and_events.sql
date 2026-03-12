create extension if not exists pgcrypto;

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  owner_user_id uuid references auth.users(id) on delete set null,
  owner_email text not null default '',
  hubspot_owner_id text not null default '',
  title text not null,
  type text not null default 'meeting',
  outcome text not null default '',
  meeting_at timestamptz,
  ended_at timestamptz,
  deal_external_id text not null default '',
  contact_external_id text not null default '',
  campaign_name text not null default '',
  recording_url text not null default '',
  notes text not null default '',
  source text not null default 'hubspot',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists meetings_owner_user_id_meeting_at_idx
  on public.meetings (owner_user_id, meeting_at desc);

create index if not exists meetings_campaign_name_idx
  on public.meetings (campaign_name);

drop trigger if exists set_meetings_updated_at on public.meetings;
create trigger set_meetings_updated_at
before update on public.meetings
for each row execute function public.set_current_timestamp_updated_at();

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  object_type text not null default 'task',
  kind text not null default 'task',
  owner_user_id uuid references auth.users(id) on delete set null,
  owner_email text not null default '',
  hubspot_owner_id text not null default '',
  title text not null,
  description text not null default '',
  status text not null default 'PENDING',
  priority text not null default 'Padrao',
  due_at timestamptz,
  completed_at timestamptz,
  deal_external_id text not null default '',
  contact_external_id text not null default '',
  campaign_name text not null default '',
  source text not null default 'hubspot',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists tasks_owner_user_id_due_at_idx
  on public.tasks (owner_user_id, due_at asc);

create index if not exists tasks_status_due_at_idx
  on public.tasks (status, due_at asc);

create index if not exists tasks_campaign_name_idx
  on public.tasks (campaign_name);

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
before update on public.tasks
for each row execute function public.set_current_timestamp_updated_at();

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text not null default '',
  actor_role text not null default '',
  action text not null,
  entity_type text not null,
  entity_id text not null default '',
  status text not null default 'success',
  route text not null default '',
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists audit_logs_actor_created_at_idx
  on public.audit_logs (actor_user_id, created_at desc);

create index if not exists audit_logs_action_created_at_idx
  on public.audit_logs (action, created_at desc);

create index if not exists audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id, created_at desc);

create table if not exists public.system_events (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  level text not null default 'info',
  route text not null default '',
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text not null default '',
  actor_role text not null default '',
  request_id text not null default '',
  client_key text not null default '',
  message text not null default '',
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists system_events_event_created_at_idx
  on public.system_events (event, created_at desc);

create index if not exists system_events_level_created_at_idx
  on public.system_events (level, created_at desc);

create index if not exists system_events_actor_created_at_idx
  on public.system_events (actor_user_id, created_at desc);

alter table public.meetings enable row level security;
alter table public.tasks enable row level security;
alter table public.audit_logs enable row level security;
alter table public.system_events enable row level security;

alter table public.meetings force row level security;
alter table public.tasks force row level security;
alter table public.audit_logs force row level security;
alter table public.system_events force row level security;

drop policy if exists "meetings_read_privileged_or_owner" on public.meetings;
create policy "meetings_read_privileged_or_owner"
  on public.meetings
  for select
  to authenticated
  using (
    public.has_minimum_role('Supervisor')
    or owner_user_id = auth.uid()
  );

drop policy if exists "tasks_read_privileged_or_owner" on public.tasks;
create policy "tasks_read_privileged_or_owner"
  on public.tasks
  for select
  to authenticated
  using (
    public.has_minimum_role('Supervisor')
    or owner_user_id = auth.uid()
  );

drop policy if exists "audit_logs_admin_read" on public.audit_logs;
create policy "audit_logs_admin_read"
  on public.audit_logs
  for select
  to authenticated
  using (public.has_minimum_role('Admin'));

drop policy if exists "system_events_supervisor_read" on public.system_events;
create policy "system_events_supervisor_read"
  on public.system_events
  for select
  to authenticated
  using (public.has_minimum_role('Supervisor'));

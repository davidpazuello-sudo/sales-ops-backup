create extension if not exists pgcrypto;

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null default 'Vendedor',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.user_roles
  drop constraint if exists user_roles_role_check;

alter table public.user_roles
  add constraint user_roles_role_check
  check (role in ('Admin', 'Gerente', 'Supervisor', 'Vendedor'));

drop trigger if exists set_user_roles_updated_at on public.user_roles;
create trigger set_user_roles_updated_at
before update on public.user_roles
for each row execute function public.set_current_timestamp_updated_at();

create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  type text not null check (type in ('request-access', 'first-access')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_role text not null default 'Vendedor',
  requested_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  resolved_by_email text,
  resolved_by_name text,
  last_error text not null default ''
);

alter table public.access_requests
  add column if not exists requested_role text not null default 'Vendedor';

update public.access_requests
set requested_role = 'Vendedor'
where requested_role is null or requested_role = '';

alter table public.access_requests
  drop constraint if exists access_requests_requested_role_check;

alter table public.access_requests
  add constraint access_requests_requested_role_check
  check (requested_role in ('Admin', 'Gerente', 'Supervisor', 'Vendedor'));

create index if not exists access_requests_status_requested_at_idx
  on public.access_requests (status, requested_at desc);

create unique index if not exists access_requests_pending_unique_idx
  on public.access_requests (email, type)
  where status = 'pending';

create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_email text not null,
  request_id uuid not null references public.access_requests(id) on delete cascade,
  read boolean not null default false,
  trash boolean not null default false,
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  title text not null,
  tag text not null,
  body text not null
);

create index if not exists admin_notifications_recipient_created_at_idx
  on public.admin_notifications (recipient_email, created_at desc);

create index if not exists admin_notifications_request_id_idx
  on public.admin_notifications (request_id);

create table if not exists public.auth_rate_limits (
  scope text not null,
  bucket text not null,
  attempt_count integer not null default 0,
  window_started_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (scope, bucket)
);

drop trigger if exists set_auth_rate_limits_updated_at on public.auth_rate_limits;
create trigger set_auth_rate_limits_updated_at
before update on public.auth_rate_limits
for each row execute function public.set_current_timestamp_updated_at();

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select role
      from public.user_roles
      where user_id = auth.uid()
      limit 1
    ),
    ''
  );
$$;

create or replace function public.has_minimum_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with current_role as (
    select public.current_app_role() as role_name
  ),
  role_rank as (
    select
      case role_name
        when 'Admin' then 4
        when 'Gerente' then 3
        when 'Supervisor' then 2
        when 'Vendedor' then 1
        else 0
      end as current_rank,
      case required_role
        when 'Admin' then 4
        when 'Gerente' then 3
        when 'Supervisor' then 2
        when 'Vendedor' then 1
        else 0
      end as required_rank
    from current_role
  )
  select current_rank >= required_rank
  from role_rank;
$$;

alter table public.user_roles enable row level security;
alter table public.access_requests enable row level security;
alter table public.admin_notifications enable row level security;
alter table public.auth_rate_limits enable row level security;

alter table public.user_roles force row level security;
alter table public.access_requests force row level security;
alter table public.admin_notifications force row level security;
alter table public.auth_rate_limits force row level security;

drop policy if exists "user_roles_select_own" on public.user_roles;
drop policy if exists "user_roles_select_admin" on public.user_roles;
drop policy if exists "user_roles_manage_admin" on public.user_roles;
create policy "user_roles_select_own"
  on public.user_roles
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "user_roles_select_admin"
  on public.user_roles
  for select
  to authenticated
  using (public.has_minimum_role('Admin'));

create policy "user_roles_manage_admin"
  on public.user_roles
  for all
  to authenticated
  using (public.has_minimum_role('Admin'))
  with check (public.has_minimum_role('Admin'));

drop policy if exists "access_requests_admin_read" on public.access_requests;
drop policy if exists "access_requests_admin_update" on public.access_requests;
create policy "access_requests_admin_read"
  on public.access_requests
  for select
  to authenticated
  using (public.has_minimum_role('Admin'));

create policy "access_requests_admin_update"
  on public.access_requests
  for update
  to authenticated
  using (public.has_minimum_role('Admin'))
  with check (public.has_minimum_role('Admin'));

drop policy if exists "admin_notifications_admin_read" on public.admin_notifications;
drop policy if exists "admin_notifications_admin_update" on public.admin_notifications;
create policy "admin_notifications_admin_read"
  on public.admin_notifications
  for select
  to authenticated
  using (public.has_minimum_role('Admin'));

create policy "admin_notifications_admin_update"
  on public.admin_notifications
  for update
  to authenticated
  using (public.has_minimum_role('Admin'))
  with check (public.has_minimum_role('Admin'));

drop policy if exists "deny direct access to auth rate limits" on public.auth_rate_limits;
create policy "deny direct access to auth rate limits"
  on public.auth_rate_limits
  for all
  to authenticated
  using (false)
  with check (false);

-- HISTORICO
-- Este arquivo e mantido apenas como referencia antiga.
-- O caminho oficial do schema versionado e `supabase/migrations/`.

create extension if not exists pgcrypto;

create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  type text not null check (type in ('request-access', 'first-access')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  resolved_by_email text,
  resolved_by_name text,
  last_error text not null default ''
);

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

alter table public.access_requests enable row level security;
alter table public.admin_notifications enable row level security;

drop policy if exists "deny direct access to access requests" on public.access_requests;
create policy "deny direct access to access requests"
  on public.access_requests
  for all
  using (false)
  with check (false);

drop policy if exists "deny direct access to admin notifications" on public.admin_notifications;
create policy "deny direct access to admin notifications"
  on public.admin_notifications
  for all
  using (false)
  with check (false);

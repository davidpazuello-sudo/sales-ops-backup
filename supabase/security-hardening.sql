-- HISTORICO
-- Este arquivo e mantido apenas como referencia antiga.
-- O caminho oficial do schema versionado e `supabase/migrations/`.

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null default 'Vendedor' check (role in ('Admin', 'Supervisor', 'Vendedor')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.user_roles enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_roles'
      and policyname = 'user_roles_select_own'
  ) then
    create policy "user_roles_select_own"
    on public.user_roles
    for select
    to authenticated
    using (auth.uid() = user_id);
  end if;
end
$$;

create table if not exists public.auth_rate_limits (
  scope text not null,
  bucket text not null,
  attempt_count integer not null default 0,
  window_started_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (scope, bucket)
);

alter table public.auth_rate_limits enable row level security;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public'
      and table_name = 'access_requests'
  ) then
    alter table public.access_requests
    add column if not exists requested_role text not null default 'Vendedor';
  end if;
end
$$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'access_requests'
      and column_name = 'requested_role'
  ) then
    update public.access_requests
    set requested_role = 'Vendedor'
    where requested_role is null or requested_role = '';
  end if;
end
$$;

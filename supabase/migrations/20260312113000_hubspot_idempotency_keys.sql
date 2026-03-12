create table if not exists public.idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  idempotency_key text not null,
  status text not null default 'pending',
  route text not null default '',
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text not null default '',
  request_id text not null default '',
  response_status integer,
  response_body jsonb,
  meta jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null default timezone('utc', now()) + interval '10 minutes',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint idempotency_keys_scope_key_unique unique (scope, idempotency_key)
);

create index if not exists idempotency_keys_expires_at_idx
  on public.idempotency_keys (expires_at asc);

drop trigger if exists set_idempotency_keys_updated_at on public.idempotency_keys;
create trigger set_idempotency_keys_updated_at
before update on public.idempotency_keys
for each row execute function public.set_current_timestamp_updated_at();

alter table public.idempotency_keys enable row level security;
alter table public.idempotency_keys force row level security;

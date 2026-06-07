create table if not exists public.admin_customizer_store (
  store_key text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.admin_customizer_store enable row level security;

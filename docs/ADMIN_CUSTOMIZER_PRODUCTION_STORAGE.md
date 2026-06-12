# Admin Customizer Production Storage

The admin customizer can run locally with `data/admin-customizer-store.json`, but production deployments should use Supabase so templates, mockups, and media metadata survive deploys and restarts.

## Required production environment variables

Use server-side values only:

```txt
ADMIN_CUSTOMIZER_SUPABASE_URL=
ADMIN_CUSTOMIZER_SUPABASE_SERVICE_ROLE_KEY=
```

Fallback names are also supported:

```txt
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
```

Do not expose the service role key through any `NEXT_PUBLIC_` variable.

## Schema

Create this table before enabling the Supabase env vars:

```sql
create table if not exists public.admin_customizer_store (
  store_key text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.admin_customizer_store enable row level security;
```

The Next.js server writes with the service role key. Do not create public client policies for this table.

## Local development

If the Supabase env vars are missing, the app falls back to:

```txt
data/admin-customizer-store.json
```

That fallback is intended for local development only. It is not durable on most production hosts.

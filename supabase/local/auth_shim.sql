-- LOCAL ONLY. Applied before migrations when the app runs on embedded Postgres (PGlite).
-- Supabase provides the real `auth` schema, roles and auth.uid(); this shim mirrors the small
-- surface our migrations depend on so the exact same SQL runs locally and in production.

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  created_at timestamptz not null default now(),
  raw_user_meta_data jsonb not null default '{}'::jsonb
);

-- Local password store (Supabase Auth owns credentials in production).
create table if not exists auth.local_credentials (
  user_id uuid primary key references auth.users (id) on delete cascade,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end
$$;

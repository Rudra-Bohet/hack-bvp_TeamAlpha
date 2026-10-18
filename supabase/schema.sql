-- Stockout Shield — Supabase database setup
-- Run this once in your Supabase project's SQL Editor (Dashboard -> SQL Editor -> New query).
-- It creates the tables, row-level security policies, and the signup trigger
-- the app needs. Safe to re-run.

-- ============================================================
-- 1. Profiles (one row per signed-up user, auto-created)
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  shop_type text not null default 'medical_shop',
  address text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile whenever someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, shop_type, address)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'shop_type', 'medical_shop'),
    coalesce(new.raw_user_meta_data ->> 'address', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 2. Medicine stock (each user only sees their own rows)
-- ============================================================
create table if not exists public.medicine_stock (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  category text not null default 'General',
  stock integer not null default 0,
  daily_usage integer not null default 0,
  expiry_date date,
  extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists medicine_stock_user_id_idx
  on public.medicine_stock (user_id);

alter table public.medicine_stock enable row level security;

create policy "Users can read their own stock"
  on public.medicine_stock for select
  using (auth.uid() = user_id);

create policy "Users can add their own stock"
  on public.medicine_stock for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own stock"
  on public.medicine_stock for update
  using (auth.uid() = user_id);

create policy "Users can delete their own stock"
  on public.medicine_stock for delete
  using (auth.uid() = user_id);

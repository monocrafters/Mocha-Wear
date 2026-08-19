create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  subtitle text not null default '',
  description text not null default '',
  cover_image text not null default '',
  cover_video text not null default '',
  link_url text not null default '',
  sale_label text not null default '',
  is_on_sale boolean not null default false,
  is_published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.collections enable row level security;

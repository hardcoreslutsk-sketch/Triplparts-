-- Uruchom ten skrypt w Supabase Dashboard → SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  make text,
  model text,
  years text,
  oem text,
  price numeric(12,2) not null check (price >= 0),
  status text not null default 'available' check (status in ('available','reserved','sold')),
  description text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_created_at_idx on public.products (created_at desc);
create index if not exists products_oem_idx on public.products (oem);
create index if not exists products_category_idx on public.products (category);
create index if not exists products_make_idx on public.products (make);
create index if not exists products_status_idx on public.products (status);

alter table public.products enable row level security;
drop policy if exists "Public can view products" on public.products;
create policy "Public can view products" on public.products for select to anon, authenticated using (true);
drop policy if exists "Authenticated users can insert products" on public.products;
create policy "Authenticated users can insert products" on public.products for insert to authenticated with check (true);
drop policy if exists "Authenticated users can update products" on public.products;
create policy "Authenticated users can update products" on public.products for update to authenticated using (true) with check (true);
drop policy if exists "Authenticated users can delete products" on public.products;
create policy "Authenticated users can delete products" on public.products for delete to authenticated using (true);

-- Public bucket for part photos. Only signed-in users can upload/change/delete images.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Anyone can view product images" on storage.objects;
create policy "Anyone can view product images" on storage.objects for select using (bucket_id = 'product-images');
drop policy if exists "Authenticated users can upload product images" on storage.objects;
create policy "Authenticated users can upload product images" on storage.objects for insert to authenticated with check (bucket_id = 'product-images');
drop policy if exists "Authenticated users can update product images" on storage.objects;
create policy "Authenticated users can update product images" on storage.objects for update to authenticated using (bucket_id = 'product-images') with check (bucket_id = 'product-images');
drop policy if exists "Authenticated users can delete product images" on storage.objects;
create policy "Authenticated users can delete product images" on storage.objects for delete to authenticated using (bucket_id = 'product-images');

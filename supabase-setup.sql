drop table if exists public.product_images cascade;
drop table if exists public.products cascade;
drop table if exists public.vehicles cascade;

create extension if not exists pgcrypto;

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  dismantling_number text not null unique,
  make text not null,
  model text not null,
  years text,
  vin text,
  engine_volume text,
  engine_fuel text,
  engine_code text,
  gearbox text,
  drive text,
  body text,
  color text,
  steering text,
  mileage integer,
  notes text,
  created_at timestamptz not null default now()
);

create index vehicles_dismantling_idx on public.vehicles (dismantling_number);
create index vehicles_make_idx on public.vehicles (make);
create index vehicles_model_idx on public.vehicles (model);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references public.vehicles(id) on delete set null,
  name text not null,
  category text not null,
  oem text,
  condition text,
  price_pln numeric(12,2) not null check (price_pln >= 0),
  status text not null default 'available'
    check (status in ('available','reserved','sold','hidden')),
  description text,
  created_at timestamptz not null default now()
);

create index products_vehicle_idx on public.products (vehicle_id);
create index products_category_idx on public.products (category);
create index products_status_idx on public.products (status);
create index products_created_idx on public.products (created_at desc);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index product_images_product_idx on public.product_images (product_id, sort_order);

alter table public.vehicles enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;

drop policy if exists "Public can view vehicles" on public.vehicles;
create policy "Public can view vehicles" on public.vehicles for select
  to anon, authenticated using (true);

drop policy if exists "Admin can write vehicles" on public.vehicles;
create policy "Admin can write vehicles" on public.vehicles for all
  to authenticated
  using ((auth.jwt() ->> 'email') = 'bigmusorka08@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'bigmusorka08@gmail.com');

drop policy if exists "Public can view products" on public.products;
create policy "Public can view products" on public.products for select
  to anon, authenticated using (true);

drop policy if exists "Admin can write products" on public.products;
create policy "Admin can write products" on public.products for all
  to authenticated
  using ((auth.jwt() ->> 'email') = 'bigmusorka08@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'bigmusorka08@gmail.com');

drop policy if exists "Public can view product images" on public.product_images;
create policy "Public can view product images" on public.product_images for select
  to anon, authenticated using (true);

drop policy if exists "Admin can write product images" on public.product_images;
create policy "Admin can write product images" on public.product_images for all
  to authenticated
  using ((auth.jwt() ->> 'email') = 'bigmusorka08@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'bigmusorka08@gmail.com');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images','product-images', true, 5242880,
  array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Anyone can view product images storage" on storage.objects;
create policy "Anyone can view product images storage" on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "Admin can write product images storage" on storage.objects;
create policy "Admin can write product images storage" on storage.objects for all
  to authenticated
  using (bucket_id = 'product-images'
    and (auth.jwt() ->> 'email') = 'bigmusorka08@gmail.com')
  with check (bucket_id = 'product-images'
    and (auth.jwt() ->> 'email') = 'bigmusorka08@gmail.com');
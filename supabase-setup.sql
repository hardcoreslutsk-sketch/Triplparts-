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
  vehicle_id uuid,
  dismantling_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_created_at_idx on public.products (created_at desc);
create index if not exists products_oem_idx        on public.products (oem);
create index if not exists products_category_idx   on public.products (category);
create index if not exists products_make_idx       on public.products (make);
create index if not exists products_status_idx     on public.products (status);
create index if not exists products_vehicle_idx    on public.products (vehicle_id);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  dismantling_number text not null,
  make text not null,
  model text not null,
  years text,
  vin text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vehicles_created_at_idx on public.vehicles (created_at desc);
create index if not exists vehicles_dismantling_idx on public.vehicles (dismantling_number);
create index if not exists vehicles_make_idx        on public.vehicles (make);
create index if not exists vehicles_model_idx       on public.vehicles (model);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists vehicles_set_updated_at on public.vehicles;
create trigger vehicles_set_updated_at
before update on public.vehicles
for each row execute function public.set_updated_at();

alter table public.products enable row level security;
alter table public.vehicles enable row level security;

drop policy if exists "Public can view products" on public.products;
create policy "Public can view products"
  on public.products for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can view vehicles" on public.vehicles;
create policy "Public can view vehicles"
  on public.vehicles for select
  to anon, authenticated
  using (true);

drop policy if exists "Authenticated users can insert products" on public.products;
drop policy if exists "Authenticated users can update products" on public.products;
drop policy if exists "Authenticated users can delete products" on public.products;
drop policy if exists "Only admin can write products" on public.products;

create policy "Only admin can write products"
  on public.products for all
  to authenticated
  using ( (auth.jwt() ->> 'email') = 'bigmusorka08@gmail.com' )
  with check ( (auth.jwt() ->> 'email') = 'bigmusorka08@gmail.com' );

drop policy if exists "Authenticated users can insert vehicles" on public.vehicles;
drop policy if exists "Authenticated users can update vehicles" on public.vehicles;
drop policy if exists "Authenticated users can delete vehicles" on public.vehicles;
drop policy if exists "Only admin can write vehicles" on public.vehicles;

create policy "Only admin can write vehicles"
  on public.vehicles for all
  to authenticated
  using ( (auth.jwt() ->> 'email') = 'bigmusorka08@gmail.com' )
  with check ( (auth.jwt() ->> 'email') = 'bigmusorka08@gmail.com' );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Anyone can view product images" on storage.objects;
create policy "Anyone can view product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "Authenticated users can upload product images" on storage.objects;
drop policy if exists "Authenticated users can update product images" on storage.objects;
drop policy if exists "Authenticated users can delete product images" on storage.objects;
drop policy if exists "Only admin can write product images" on storage.objects;

create policy "Only admin can write product images"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'product-images'
    and (auth.jwt() ->> 'email') = 'bigmusorka08@gmail.com'
  )
  with check (
    bucket_id = 'product-images'
    and (auth.jwt() ->> 'email') = 'bigmusorka08@gmail.com'
  );
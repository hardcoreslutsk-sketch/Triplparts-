-- =============================================================
-- TRIPL PARTS — полная схема БД
-- Запустить один раз в Supabase SQL Editor
-- =============================================================

create extension if not exists pgcrypto;

-- ===== АДМИНЫ =====
create table if not exists public.admins (
  email text primary key,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

-- ⚠️ ВПИШИТЕ СВОЙ ADMIN EMAIL ЗДЕСЬ:
insert into public.admins (email)
values ('bigmusorka08@gmail.com')
on conflict (email) do nothing;

-- Функция проверки админа
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins a
    where lower(a.email) = lower(auth.jwt() ->> 'email')
  );
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- ===== УДАЛЯЕМ СТАРЫЕ ТАБЛИЦЫ =====
drop table if exists public.product_images cascade;
drop table if exists public.products cascade;
drop table if exists public.vehicles cascade;
drop table if exists public.orders cascade;

-- ===== VEHICLES =====
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

-- ===== PRODUCTS =====
create table public.products (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references public.vehicles(id) on delete set null,
  sku text unique,
  name text not null,
  category text not null,
  oem text,
  license_number text,
  condition text,
  price_pln numeric(12,2) not null check (price_pln >= 0),
  price_eur numeric(12,2),
  status text not null default 'available'
    check (status in ('available','reserved','sold','hidden')),
  description text,
  created_at timestamptz not null default now()
);
create index products_vehicle_idx on public.products (vehicle_id);
create index products_category_idx on public.products (category);
create index products_status_idx on public.products (status);
create index products_created_idx on public.products (created_at desc);

-- ===== PRODUCT IMAGES =====
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id, sort_order);

-- ===== ORDERS =====
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_phone text,
  customer_email text,
  customer_address text not null,
  notes text,
  items jsonb not null default '[]'::jsonb,
  total_pln numeric(12,2) not null default 0,
  status text not null default 'new'
    check (status in ('new','contacted','completed','cancelled')),
  created_at timestamptz not null default now()
);
create index orders_created_idx on public.orders (created_at desc);
create index orders_status_idx on public.orders (status);
create index orders_user_idx on public.orders (user_id);
create index orders_email_idx on public.orders (lower(customer_email));

-- ===== RLS =====
alter table public.vehicles enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.orders enable row level security;

-- Vehicles
drop policy if exists "Public can view vehicles" on public.vehicles;
create policy "Public can view vehicles" on public.vehicles
  for select to anon, authenticated using (true);

drop policy if exists "Admin write vehicles" on public.vehicles;
create policy "Admin write vehicles" on public.vehicles
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Products
drop policy if exists "Public can view products" on public.products;
create policy "Public can view products" on public.products
  for select to anon, authenticated using (true);

drop policy if exists "Admin write products" on public.products;
create policy "Admin write products" on public.products
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Product images
drop policy if exists "Public can view product images" on public.product_images;
create policy "Public can view product images" on public.product_images
  for select to anon, authenticated using (true);

drop policy if exists "Admin write product images" on public.product_images;
create policy "Admin write product images" on public.product_images
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Orders (SELECT: админ или владелец; INSERT только через RPC; UPDATE/DELETE только админ)
drop policy if exists "Admin select orders" on public.orders;
create policy "Admin select orders" on public.orders
  for select to authenticated using (public.is_admin());

drop policy if exists "Users select own orders" on public.orders;
create policy "Users select own orders" on public.orders
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "Admin update orders" on public.orders;
create policy "Admin update orders" on public.orders
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admin delete orders" on public.orders;
create policy "Admin delete orders" on public.orders
  for delete to authenticated using (public.is_admin());

-- =============================================================
-- RPC create_order — сервер пересчитывает цены, защита от подмены
-- =============================================================
create or replace function public.create_order(
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_customer_address text,
  p_notes text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_total numeric(12,2) := 0;
  v_items jsonb := '[]'::jsonb;
  v_item jsonb;
  v_product record;
  v_qty int;
  v_uid uuid := auth.uid();
  v_email text;
  v_name text;
  v_addr text;
begin
  v_name := nullif(trim(p_customer_name), '');
  v_addr := nullif(trim(p_customer_address), '');
  v_email := nullif(lower(trim(p_customer_email)), '');

  if v_name is null then raise exception 'customer_name required'; end if;
  if v_addr is null then raise exception 'customer_address required'; end if;
  if v_email is null
     and nullif(trim(p_customer_phone), '') is null then
    raise exception 'phone or email required';
  end if;
  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'items required';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := greatest(1, least(99, coalesce((v_item->>'qty')::int, 1)));

    select id, name, sku, price_pln, price_eur, status
      into v_product
      from public.products
      where id = (v_item->>'id')::uuid;

    if not found then continue; end if;
    if v_product.status <> 'available' then
      raise exception 'Product not available: %', v_product.name;
    end if;

    v_total := v_total + (v_product.price_pln * v_qty);
    v_items := v_items || jsonb_build_object(
      'id', v_product.id,
      'sku', v_product.sku,
      'name', v_product.name,
      'price_pln', v_product.price_pln,
      'price_eur', v_product.price_eur,
      'qty', v_qty
    );
  end loop;

  if jsonb_array_length(v_items) = 0 then
    raise exception 'No valid items';
  end if;

  insert into public.orders (
    user_id, customer_name, customer_phone, customer_email,
    customer_address, notes, items, total_pln, status
  ) values (
    v_uid,
    v_name,
    nullif(trim(p_customer_phone), ''),
    v_email,
    v_addr,
    nullif(trim(p_notes), ''),
    v_items,
    round(v_total, 2),
    'new'
  ) returning id into v_order_id;

  return v_order_id;
end;
$$;
grant execute on function public.create_order(text,text,text,text,text,jsonb)
  to anon, authenticated;

-- =============================================================
-- STORAGE: bucket product-images
-- =============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images','product-images', true, 5242880,
  array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Public read product-images" on storage.objects;
create policy "Public read product-images" on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists "Admin write product-images" on storage.objects;
create policy "Admin write product-images" on storage.objects
  for all to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());
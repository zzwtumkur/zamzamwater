-- Run once in the Supabase SQL Editor to enable delivery-area management.
create table if not exists service_pincodes(
 id uuid primary key default gen_random_uuid(),
 pincode text not null unique check(pincode ~ '^\d{6}$'),
 area_name text not null,
 active boolean not null default true,
 created_at timestamptz not null default now()
);
alter table service_pincodes enable row level security;
insert into service_pincodes(pincode,area_name) values('572101','Tumkur') on conflict(pincode) do nothing;

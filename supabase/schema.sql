-- gen_random_uuid() is built into PostgreSQL 13+ (including Supabase), so no
-- CREATE EXTENSION statement is needed. This also allows the schema to run in
-- environments where extension management is read-only.
create table products(id uuid primary key default gen_random_uuid(),litres int not null,kind text not null check(kind in ('new','refill')),price numeric(12,2) not null check(price>=0),stock int not null default 100 check(stock>=0),min_qty int not null default 1 check(min_qty>=1),max_qty int not null default 50 check(max_qty>=min_qty),active boolean not null default true,unique(litres,kind));
create table slots(id uuid primary key default gen_random_uuid(),label text not null unique,start_time time not null,end_time time not null,capacity int not null default 20 check(capacity>=0),active boolean not null default true);
create table settings(id int primary key default 1 check(id=1),business_phone text not null default '+91 70194 54218',delivery_fee numeric(12,2) not null default 0,min_order numeric(12,2) not null default 0,service_area text not null default 'Tumkur');
create table orders(id uuid primary key default gen_random_uuid(),order_number text unique not null default ('ZZW-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),name text not null,phone text not null,pincode text check(pincode is null or pincode ~ '^\d{6}$'),address text not null,landmark text not null default '',latitude double precision,longitude double precision,delivery_date date not null,slot_id uuid not null references slots(id),subtotal numeric(12,2) not null,delivery_fee numeric(12,2) not null,total numeric(12,2) not null,status text not null default 'new' check(status in ('new','accepted','preparing','out_for_delivery','delivered','completed','rejected','cancelled','delivery_failed','rescheduled')),payment_status text not null default 'pending',created_at timestamptz not null default now());
create table order_items(id uuid primary key default gen_random_uuid(),order_id uuid not null references orders(id) on delete cascade,product_id uuid references products(id) on delete set null,litres int not null,kind text not null,qty int not null,unit_price numeric(12,2) not null,line_total numeric(12,2) not null);
create table order_events(id uuid primary key default gen_random_uuid(),order_id uuid not null references orders(id) on delete cascade,previous_status text,new_status text not null,actor text not null default 'system',created_at timestamptz not null default now());
create table product_daily_prices(id uuid primary key default gen_random_uuid(),product_id uuid not null references products(id) on delete cascade,price numeric(12,2) not null check(price>=0),start_time time not null,end_time time not null,active boolean not null default true,created_at timestamptz not null default now(),check(end_time<>start_time));
create table service_pincodes(id uuid primary key default gen_random_uuid(),pincode text not null unique check(pincode ~ '^\d{6}$'),area_name text not null,active boolean not null default true,created_at timestamptz not null default now());
create table customer_payment_requests(id uuid primary key default gen_random_uuid(),phone text not null check(phone ~ '^[6-9][0-9]{9}$'),amount numeric(12,2) not null check(amount>0),upi_id text not null,qr_data_url text not null,transaction_reference text check(transaction_reference is null or length(trim(transaction_reference)) between 6 and 100),status text not null default 'pending' check(status in ('pending','customer_reported','paid','cancelled')),created_at timestamptz not null default now());
create index orders_date_idx on orders(delivery_date,status);create index orders_created_idx on orders(created_at desc);
create index customer_payment_requests_phone_idx on customer_payment_requests(phone,created_at desc);
alter table products enable row level security;alter table slots enable row level security;alter table settings enable row level security;alter table orders enable row level security;alter table order_items enable row level security;alter table order_events enable row level security;alter table product_daily_prices enable row level security;alter table service_pincodes enable row level security;alter table customer_payment_requests enable row level security;
insert into settings(id) values(1) on conflict(id) do nothing;
insert into products(litres,kind,price,stock) values (5,'new',10,100),(5,'refill',10,100),(20,'new',150,100),(20,'refill',30,100),(50,'new',100,100),(50,'refill',70,100) on conflict(litres,kind) do update set price=excluded.price,stock=excluded.stock,active=true;
with quarter_hours as (select (time '00:00' + minute_offset * interval '1 minute')::time as start_time,(time '00:00' + (minute_offset + 15) * interval '1 minute')::time as end_time from generate_series(0,1425,15) as offsets(minute_offset)) insert into slots(label,start_time,end_time,capacity) select to_char(start_time,'FMHH12:MI AM')||' - '||to_char(end_time,'FMHH12:MI AM'),start_time,end_time,5 from quarter_hours on conflict(label) do update set start_time=excluded.start_time,end_time=excluded.end_time,capacity=excluded.capacity,active=true;
insert into service_pincodes(pincode,area_name) values('572101','Tumkur') on conflict(pincode) do nothing;
create or replace function place_order(p_name text,p_phone text,p_pincode text,p_address text,p_landmark text,p_lat double precision,p_lng double precision,p_date date,p_slot_id uuid,p_items jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_slot slots%rowtype;v_settings settings%rowtype;v_product products%rowtype;v_item jsonb;v_qty int;v_id uuid;v_order uuid;v_num text;v_sub numeric:=0;v_count int;v_unit_price numeric;
begin
 if length(trim(p_name))<2 or length(trim(p_name))>100 or p_phone !~ '^[6-9][0-9]{9}$' or p_pincode !~ '^\d{6}$' or length(trim(p_address))<8 or length(trim(p_address))>500 or length(coalesce(p_landmark,''))>150 then raise exception 'Invalid customer details';end if;
 if p_date<(now() at time zone 'Asia/Kolkata')::date or p_date>(now() at time zone 'Asia/Kolkata')::date+30 then raise exception 'Select a date within 30 days';end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>6 then raise exception 'Invalid items';end if;
 select * into v_slot from slots where id=p_slot_id and active for update;
 if not found then raise exception 'Slot unavailable';end if;
 if (p_date + v_slot.start_time) <= (now() at time zone 'Asia/Kolkata') then raise exception 'Select an upcoming delivery time';end if;
 select count(*) into v_count from orders where delivery_date=p_date and slot_id=p_slot_id and status not in ('rejected','cancelled','delivery_failed');
 if v_count>=v_slot.capacity then raise exception 'Delivery slot full';end if;
 select * into v_settings from settings where id=1;
 for v_item in select value from jsonb_array_elements(p_items) loop
  v_qty=(v_item->>'qty')::int;v_id=(v_item->>'product_id')::uuid;
  if v_qty<1 then raise exception 'Invalid quantity';end if;
  if (select count(*) from jsonb_array_elements(p_items) z where z->>'product_id'=v_id::text)>1 then raise exception 'Duplicate product';end if;
  select * into v_product from products where id=v_id and active for update;
  if not found or v_product.stock<v_qty then raise exception 'Product unavailable or out of stock';end if;
  if v_qty<v_product.min_qty or v_qty>v_product.max_qty then raise exception 'Quantity outside product order limits';end if;
  select d.price into v_unit_price from product_daily_prices d where d.product_id=v_id and d.active and ((d.start_time<d.end_time and d.start_time<=v_slot.start_time and d.end_time>v_slot.start_time) or (d.start_time>d.end_time and (d.start_time<=v_slot.start_time or d.end_time>v_slot.start_time))) order by d.start_time desc limit 1;
  v_unit_price=coalesce(v_unit_price,v_product.price);v_sub=v_sub+v_unit_price*v_qty;
 end loop;
 if v_sub<v_settings.min_order then raise exception 'Minimum order not met';end if;
 insert into orders(name,phone,pincode,address,landmark,latitude,longitude,delivery_date,slot_id,subtotal,delivery_fee,total) values(trim(p_name),p_phone,p_pincode,trim(p_address),coalesce(p_landmark,''),p_lat,p_lng,p_date,p_slot_id,v_sub,v_settings.delivery_fee,v_sub+v_settings.delivery_fee) returning id,order_number into v_order,v_num;
 for v_item in select value from jsonb_array_elements(p_items) loop
  v_qty=(v_item->>'qty')::int;v_id=(v_item->>'product_id')::uuid;select * into v_product from products where id=v_id;
  select d.price into v_unit_price from product_daily_prices d where d.product_id=v_id and d.active and ((d.start_time<d.end_time and d.start_time<=v_slot.start_time and d.end_time>v_slot.start_time) or (d.start_time>d.end_time and (d.start_time<=v_slot.start_time or d.end_time>v_slot.start_time))) order by d.start_time desc limit 1;
  v_unit_price=coalesce(v_unit_price,v_product.price);insert into order_items(order_id,product_id,litres,kind,qty,unit_price,line_total) values(v_order,v_id,v_product.litres,v_product.kind,v_qty,v_unit_price,v_qty*v_unit_price);
  update products set stock=stock-v_qty where id=v_id;
 end loop;
 insert into order_events(order_id,new_status) values(v_order,'new');
 return jsonb_build_object('id',v_order,'order_number',v_num,'total',v_sub+v_settings.delivery_fee);
end $$;
revoke all on function place_order(text,text,text,text,text,double precision,double precision,date,uuid,jsonb) from public,anon,authenticated;
grant execute on function place_order(text,text,text,text,text,double precision,double precision,date,uuid,jsonb) to service_role;

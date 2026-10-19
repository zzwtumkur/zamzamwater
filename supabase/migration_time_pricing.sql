-- Run once in the Supabase SQL Editor to enable repeating daily time-based prices.
-- Each product can have multiple non-overlapping price windows (for example,
-- 07:00-10:00 at one price and 18:00-21:00 at another price).
create table if not exists product_daily_prices(
 id uuid primary key default gen_random_uuid(),
 product_id uuid not null references products(id) on delete cascade,
 price numeric(12,2) not null check(price>=0),
 start_time time not null,
 end_time time not null,
 active boolean not null default true,
 created_at timestamptz not null default now(),
 check(end_time<>start_time)
);
alter table product_daily_prices drop constraint if exists product_daily_prices_check;
alter table product_daily_prices add constraint product_daily_prices_check check(end_time<>start_time);
create index if not exists daily_price_lookup_idx on product_daily_prices(product_id,active,start_time,end_time);
alter table product_daily_prices enable row level security;

create or replace function place_order(p_name text,p_phone text,p_address text,p_landmark text,p_lat double precision,p_lng double precision,p_date date,p_slot_id uuid,p_items jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_slot slots%rowtype;v_settings settings%rowtype;v_product products%rowtype;v_item jsonb;v_qty int;v_id uuid;v_order uuid;v_num text;v_sub numeric:=0;v_count int;v_unit_price numeric;
begin
 if length(trim(p_name))<2 or length(trim(p_name))>100 or p_phone !~ '^[6-9][0-9]{9}$' or length(trim(p_address))<8 or length(trim(p_address))>500 or length(coalesce(p_landmark,''))>150 then raise exception 'Invalid customer details';end if;
 if p_date<(now() at time zone 'Asia/Kolkata')::date or p_date>(now() at time zone 'Asia/Kolkata')::date+30 then raise exception 'Select a date within 30 days';end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>6 then raise exception 'Invalid items';end if;
 select * into v_slot from slots where id=p_slot_id and active for update;if not found then raise exception 'Slot unavailable';end if;
 select count(*) into v_count from orders where delivery_date=p_date and slot_id=p_slot_id and status not in ('rejected','cancelled','delivery_failed');if v_count>=v_slot.capacity then raise exception 'Delivery slot full';end if;
 select * into v_settings from settings where id=1;
 for v_item in select value from jsonb_array_elements(p_items) loop
  v_qty=(v_item->>'qty')::int;v_id=(v_item->>'product_id')::uuid;if v_qty<1 then raise exception 'Invalid quantity';end if;
  if (select count(*) from jsonb_array_elements(p_items) z where z->>'product_id'=v_id::text)>1 then raise exception 'Duplicate product';end if;
  select * into v_product from products where id=v_id and active for update;if not found or v_product.stock<v_qty then raise exception 'Product unavailable or out of stock';end if;if v_qty<v_product.min_qty or v_qty>v_product.max_qty then raise exception 'Quantity outside product order limits';end if;
  select d.price into v_unit_price from product_daily_prices d where d.product_id=v_id and d.active and ((d.start_time<d.end_time and d.start_time<=(now() at time zone 'Asia/Kolkata')::time and d.end_time>(now() at time zone 'Asia/Kolkata')::time) or (d.start_time>d.end_time and (d.start_time<=(now() at time zone 'Asia/Kolkata')::time or d.end_time>(now() at time zone 'Asia/Kolkata')::time))) order by d.start_time desc limit 1;
  v_unit_price=coalesce(v_unit_price,v_product.price);v_sub=v_sub+v_unit_price*v_qty;
 end loop;
 if v_sub<v_settings.min_order then raise exception 'Minimum order not met';end if;
 insert into orders(name,phone,address,landmark,latitude,longitude,delivery_date,slot_id,subtotal,delivery_fee,total) values(trim(p_name),p_phone,trim(p_address),coalesce(p_landmark,''),p_lat,p_lng,p_date,p_slot_id,v_sub,v_settings.delivery_fee,v_sub+v_settings.delivery_fee) returning id,order_number into v_order,v_num;
 for v_item in select value from jsonb_array_elements(p_items) loop
  v_qty=(v_item->>'qty')::int;v_id=(v_item->>'product_id')::uuid;select * into v_product from products where id=v_id;
  select d.price into v_unit_price from product_daily_prices d where d.product_id=v_id and d.active and ((d.start_time<d.end_time and d.start_time<=(now() at time zone 'Asia/Kolkata')::time and d.end_time>(now() at time zone 'Asia/Kolkata')::time) or (d.start_time>d.end_time and (d.start_time<=(now() at time zone 'Asia/Kolkata')::time or d.end_time>(now() at time zone 'Asia/Kolkata')::time))) order by d.start_time desc limit 1;
  v_unit_price=coalesce(v_unit_price,v_product.price);insert into order_items(order_id,product_id,litres,kind,qty,unit_price,line_total) values(v_order,v_id,v_product.litres,v_product.kind,v_qty,v_unit_price,v_qty*v_unit_price);update products set stock=stock-v_qty where id=v_id;
 end loop;
 insert into order_events(order_id,new_status) values(v_order,'new');return jsonb_build_object('id',v_order,'order_number',v_num,'total',v_sub+v_settings.delivery_fee);
end $$;
revoke all on function place_order(text,text,text,text,double precision,double precision,date,uuid,jsonb) from public,anon,authenticated;
grant execute on function place_order(text,text,text,text,double precision,double precision,date,uuid,jsonb) to service_role;

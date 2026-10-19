-- Run once in the Supabase SQL Editor to configure per-product order limits.
alter table products add column if not exists min_qty int not null default 1;
alter table products add column if not exists max_qty int not null default 50;
alter table products drop constraint if exists products_min_qty_check;
alter table products drop constraint if exists products_max_qty_check;
alter table products add constraint products_min_qty_check check(min_qty>=1);
alter table products add constraint products_max_qty_check check(max_qty>=min_qty);

-- Refresh place_order after adding the columns by running
-- migration_time_pricing.sql immediately after this migration.

-- Run once in the Supabase SQL Editor.
-- Historical order lines already store bottle size, type and price, so the
-- product reference can safely become null when an admin deletes a bottle.
alter table order_items drop constraint if exists order_items_product_id_fkey;
alter table order_items alter column product_id drop not null;
alter table order_items add constraint order_items_product_id_fkey
 foreign key(product_id) references products(id) on delete set null;

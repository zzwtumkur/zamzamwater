-- Run once after migration_saved_order_pincode.sql. Scheduled product prices
-- are matched against the selected delivery slot, not the order creation time.
do $$
declare
  function_definition text;
  updated_definition text;
begin
  select pg_get_functiondef(
    'place_order(text,text,text,text,text,double precision,double precision,date,uuid,jsonb)'::regprocedure
  ) into function_definition;

  updated_definition := replace(
    function_definition,
    '(now() at time zone ''Asia/Kolkata'')::time',
    'v_slot.start_time'
  );

  if updated_definition = function_definition then
    if position('v_slot.start_time' in function_definition) > 0 then
      return;
    end if;
    raise exception 'place_order pricing logic was not found; apply migration_saved_order_pincode.sql first';
  end if;

  execute updated_definition;
end $$;

revoke all on function place_order(text,text,text,text,text,double precision,double precision,date,uuid,jsonb) from public,anon,authenticated;
grant execute on function place_order(text,text,text,text,text,double precision,double precision,date,uuid,jsonb) to service_role;

-- Run once in the Supabase SQL Editor to offer 15-minute delivery windows
-- across the full day in India Standard Time. Existing slot rows stay in
-- place for historical orders, but non-quarter-hour slots are deactivated.
begin;

update slots
set active = false
where active;

with quarter_hours as (
  select
    (time '00:00' + minute_offset * interval '1 minute')::time as start_time,
    (time '00:00' + (minute_offset + 15) * interval '1 minute')::time as end_time
  from generate_series(0, 1425, 15) as offsets(minute_offset)
)
insert into slots (label, start_time, end_time, capacity, active)
select
  to_char(start_time, 'FMHH12:MI AM') || ' - ' || to_char(end_time, 'FMHH12:MI AM'),
  start_time,
  end_time,
  5,
  true
from quarter_hours
on conflict (label) do update
set start_time = excluded.start_time,
    end_time = excluded.end_time,
    active = true;

commit;
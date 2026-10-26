-- รีสอร์ทฝึกใช้งาน (practice) ถูกบังคับ active=false จึงจองผ่าน sd_price / sd_create_booking ไม่ได้ ("ไม่พบที่พักนี้ หรือปิดการขายแล้ว")
-- ยกเว้นให้เฉพาะเจ้าของรีสอร์ทนั้น หรือผู้ดูแล/นักพัฒนาที่ล็อกอินอยู่ จองเพื่อทดลองได้ — ลูกค้าทั่วไปยังจองไม่ได้
create or replace function public.sd_price(p_hotel text, p_room text, p_offer text, p_in date, p_out date, p_qty integer)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare h jsonb; r jsonb; d date; o float8; f float8; so float8 := 0; sf float8 := 0; n int; extra float8 := 0; bf boolean; fc boolean;
begin
  select data into h from sd_hotels where id = p_hotel
    and (coalesce((data ->> 'active')::boolean, true)
         or (data ->> 'practice' = 'true' and (owner_id = auth.uid() or exists (select 1 from sd_profiles where id = auth.uid() and role in ('dev', 'admin')))))
    and (owner_id is null or sd_owner_live(owner_id));
  if h is null then raise exception 'ไม่พบที่พักนี้ หรือปิดการขายแล้ว'; end if;
  select x into r from jsonb_array_elements(h -> 'rooms') x where x ->> 'id' = p_room;
  if r is null then raise exception 'ไม่พบห้องพักนี้'; end if;
  n := p_out - p_in;
  if n < 1 or n > 30 then raise exception 'จำนวนคืนไม่ถูกต้อง (1-30 คืน)'; end if;
  if p_qty < 1 or p_qty > 10 then raise exception 'จำนวนห้องไม่ถูกต้อง'; end if;
  for d in select generate_series(p_in, p_out - 1, interval '1 day')::date loop
    o := floor(coalesce((select (x.v ->> 'price')::float8 from jsonb_array_elements(coalesce(r -> 'priceRules', '[]'::jsonb)) with ordinality as x(v, n) where x.v ->> 'from' ~ '^\d{4}-\d\d-\d\d$' and x.v ->> 'to' ~ '^\d{4}-\d\d-\d\d$' and d between (x.v ->> 'from')::date and (x.v ->> 'to')::date and (jsonb_typeof(x.v -> 'days') is distinct from 'array' or (x.v -> 'days') @> to_jsonb(extract(dow from d)::int)) and coalesce((x.v ->> 'price')::float8, 0) > 0 order by x.n desc limit 1), nullif((r -> 'dayPrices' ->> (extract(dow from d)::int)::text)::float8, 0), case when extract(dow from d) in (5, 6) and coalesce((r ->> 'weekendPrice')::float8, 0) > 0 then (r ->> 'weekendPrice')::float8 else (r ->> 'price')::float8 end) + 0.5);
    f := floor(o * (1::float8 - coalesce((r ->> 'discount')::float8, 0) / 100::float8) + 0.5);
    so := so + o; sf := sf + f;
  end loop;
  so := so * p_qty; sf := sf * p_qty;
  bf := coalesce((r ->> 'breakfast')::boolean, false);
  fc := coalesce((r ->> 'freeCancel')::boolean, false);
  if p_offer = 'bf' and not bf then
    extra := 220 * least(2, (r ->> 'maxGuests')::int); fc := true;
  elsif not ((p_offer = 'bf' and bf) or (p_offer = 'ro' and not bf)) then
    raise exception 'แพ็กเกจห้องพักไม่ถูกต้อง';
  end if;
  so := so + extra * n * p_qty; sf := sf + extra * n * p_qty;
  return jsonb_build_object('nights', n, 'orig', so, 'sub', sf, 'hotel', h, 'room', r,
    'offer', jsonb_build_object('id', p_offer, 'breakfast', p_offer = 'bf', 'freeCancel', fc, 'payAtHotel', coalesce((r ->> 'payAtHotel')::boolean, false), 'extra', extra));
end $function$;

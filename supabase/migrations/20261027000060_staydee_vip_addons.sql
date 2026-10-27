-- บริการเสริมเลือกตอนชำระเงิน (จ่ายครั้งเดียว) — ส่ง p.addons = [{id,qty}] มากับ sd_create_booking
--   รีสอร์ท VIP        : รายการของเจ้าของที่ sd_hotels.data->vip->addons = [{id,name,desc,price}]
--   รีสอร์ททั่วไป       : รายการของ dev ที่ sd_kv 'settings'.extraServices — ยอดเข้าบัญชีเจ้าของรีสอร์ทพร้อมค่าห้อง
--                         dev เรียกเก็บส่วนนี้จากรีสอร์ทภายหลัง → ใส่คำขอใน sd_addon_requests ให้ dev เห็นเหมือนเดิม
-- ชื่อ/ราคาอ่านจากรายการบนเซิร์ฟเวอร์เท่านั้น (ไม่รับราคาจากเบราว์เซอร์) แล้วรวมเข้า price.total · เก็บรายการที่ b.addons
-- ส่วนลดสมาชิก/คูปองคิดจากค่าห้องเท่านั้น
-- แพตช์ sd_create_booking ฉบับล่าสุดด้วยการแทนข้อความ (เหมือน 20261011000017) — ถ้าไม่พบจุดแทรกจะ raise และไม่เปลี่ยนอะไร
do $mig$
declare def text; nd text; pick text; reqins text;
begin
  def := pg_get_functiondef('public.sd_create_booking(jsonb)'::regprocedure);
  nd := def;
  pick := $p$bpin := (100000 + floor(random() * 900000))::int::text;
  if jsonb_typeof(p -> 'addons') = 'array' and jsonb_array_length(p -> 'addons') > 0 then
    if coalesce((select (h.data #>> '{vip,on}')::boolean from sd_hotels h where h.id = p ->> 'hotelId'), false) then
      select coalesce(jsonb_agg(jsonb_build_object('id', s ->> 'id', 'name', s ->> 'name', 'price', greatest(0, coalesce((s ->> 'price')::float8, 0)), 'qty', 1)), '[]'::jsonb),
             coalesce(sum(greatest(0, coalesce((s ->> 'price')::float8, 0))), 0)
        into adj, adt
        from sd_hotels h
        cross join lateral jsonb_array_elements(coalesce(h.data #> '{vip,addons}', '[]'::jsonb)) s
       where h.id = p ->> 'hotelId' and exists (select 1 from jsonb_array_elements(p -> 'addons') i where i ->> 'id' = s ->> 'id');
    else
      select coalesce(jsonb_agg(jsonb_build_object('id', s ->> 'id', 'name', s ->> 'name', 'price', greatest(0, coalesce((s ->> 'price')::float8, 0)), 'qty', 1)), '[]'::jsonb),
             coalesce(sum(greatest(0, coalesce((s ->> 'price')::float8, 0))), 0)
        into adj, adt
        from sd_kv k
        cross join lateral jsonb_array_elements(coalesce(k.value -> 'extraServices', '[]'::jsonb)) s
       where k.key = 'settings' and exists (select 1 from jsonb_array_elements(p -> 'addons') i where i ->> 'id' = s ->> 'id');
    end if;
  end if;$p$;
  reqins := $p$returning data into b;
  if jsonb_array_length(adj) > 0 and not coalesce((select (h.data #>> '{vip,on}')::boolean from sd_hotels h where h.id = p ->> 'hotelId'), false) then
    insert into public.sd_addon_requests (booking_id, hotel_id, guest, items)
      values (bid, p ->> 'hotelId', jsonb_build_object('name', trim(coalesce(g ->> 'firstName', '') || ' ' || coalesce(g ->> 'lastName', '')),
        'phone', g ->> 'phone', 'email', g ->> 'email', 'hotel', q #>> '{hotel,name}', 'checkIn', ci, 'checkOut', co), adj)
      on conflict (booking_id) do nothing;
  end if;$p$;
  nd := replace(nd, 'sub float8; tax float8;', $p$sub float8; tax float8; adj jsonb := '[]'::jsonb; adt float8 := 0;$p$);
  nd := replace(nd, 'bpin := (100000 + floor(random() * 900000))::int::text;', pick);
  nd := replace(nd, $p$'tax', tax, 'total', sub - member - off + tax)$p$, $p$'tax', tax, 'addons', adt, 'total', sub - member - off + tax + adt)$p$);
  nd := replace(nd, $p$'status', 'pending', 'createdAt', now());$p$, $p$'addons', adj, 'addonsAt', case when jsonb_array_length(adj) > 0 then now() end, 'status', 'pending', 'createdAt', now());$p$);
  nd := replace(nd, 'returning data into b;', reqins);
  if position('adt float8' in nd) = 0 or position('+ adt)' in nd) = 0 or position($p$'addons', adj$p$ in nd) = 0 or position('into adj, adt' in nd) = 0 or position('sd_addon_requests' in nd) = 0 then
    raise exception 'ไม่พบจุดแทรกใน sd_create_booking';
  end if;
  execute nd;
end $mig$;

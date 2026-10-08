-- ปิดห้อง / ขายนอกระบบ: เจ้าของรีสอร์ท (หรือแอดมิน) บันทึกห้องที่ขายผ่านช่องทางอื่น (เว็บอื่น โทร LINE walk-in) หรือปิดซ่อมบำรุง
-- เก็บเป็นการจองสถานะ confirmed ที่มี source = 'external' จึงถูกนับเป็นห้องไม่ว่างใน sd_occupancy / sd_create_booking โดยอัตโนมัติ
-- เปิดห้องคืน = ยกเลิกรายการนี้ (update status = 'cancelled' ผ่านนโยบาย "sd_bookings update" ที่มีอยู่)
create function public.sd_block_rooms(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  hid text := p ->> 'hotelId'; rid text := p ->> 'roomId';
  ci date := (p ->> 'checkIn')::date; co date := (p ->> 'checkOut')::date;
  qty int := coalesce((p ->> 'qty')::int, 1);
  h jsonb; r jsonb; oid uuid; d date; booked int; bid text; bpin text; b jsonb;
  chan text := left(coalesce(nullif(trim(p ->> 'channel'), ''), 'นอกระบบ'), 40);
  gname text := left(coalesce(nullif(trim(p ->> 'guestName'), ''), coalesce(nullif(trim(p ->> 'channel'), ''), 'นอกระบบ')), 60);
  amount float8 := least(10000000, greatest(0, coalesce((p ->> 'amount')::float8, 0)));
begin
  if auth.uid() is null then raise exception 'ต้องเข้าสู่ระบบ'; end if;
  if not (sd_is_admin() or (sd_can('inventory') and sd_owns_hotel(hid))) then raise exception 'ไม่มีสิทธิ์จัดการที่พักนี้'; end if;
  if ci is null or co is null or co <= ci or co - ci > 90 then raise exception 'วันที่ไม่ถูกต้อง (ปิดได้ไม่เกิน 90 คืนต่อครั้ง)'; end if;
  if qty < 1 or qty > 50 then raise exception 'จำนวนห้องไม่ถูกต้อง'; end if;
  select data, owner_id into h, oid from sd_hotels where id = hid;
  if h is null then raise exception 'ไม่พบที่พักนี้'; end if;
  select x into r from jsonb_array_elements(h -> 'rooms') x where x ->> 'id' = rid;
  if r is null then raise exception 'ไม่พบห้องพักนี้'; end if;

  -- กันปิดเกินจำนวนห้องที่เหลือ (ล็อกต่อประเภทห้องเหมือน sd_create_booking)
  perform pg_advisory_xact_lock(hashtext('sd_room:' || rid));
  for d in select generate_series(ci, co - 1, interval '1 day')::date loop
    select coalesce(sum(x.qty), 0) into booked from sd_bookings x
      where x.room_id = rid and x.status <> 'cancelled' and d >= x.check_in and d < x.check_out;
    if booked + qty > (r ->> 'total')::int then
      raise exception 'วันที่ % เหลือห้องว่างไม่พอ (ว่าง % ห้อง) — ปิดได้ไม่เกินจำนวนที่ว่าง', d, greatest(0, (r ->> 'total')::int - booked);
    end if;
  end loop;

  loop
    bid := 'EX' || right((extract(epoch from clock_timestamp()) * 1000)::bigint::text, 6) || (100 + floor(random() * 900))::int::text;
    exit when not exists (select 1 from sd_bookings where id = bid);
  end loop;
  bpin := (1000 + floor(random() * 9000))::int::text;

  b := jsonb_build_object(
    'hotelId', hid, 'hotelName', h ->> 'name', 'ownerId', oid, 'roomId', rid, 'roomName', r ->> 'name',
    'offer', jsonb_build_object('id', 'ext', 'name', 'ขายนอกระบบ', 'breakfast', false, 'freeCancel', false, 'payAtHotel', false),
    'qty', qty, 'checkIn', ci, 'checkOut', co, 'nights', co - ci, 'adults', 1, 'children', 0, 'rooms', qty,
    'guest', jsonb_build_object('firstName', gname, 'lastName', '', 'email', '', 'phone', left(coalesce(trim(p ->> 'phone'), ''), 30),
      'country', '', 'arrival', '', 'note', left(coalesce(p ->> 'note', ''), 500), 'requests', '[]'::jsonb),
    'payment', jsonb_build_object('method', 'hotel', 'paid', true, 'paidAt', now(), 'external', true),
    'price', jsonb_build_object('orig', amount, 'room', amount, 'member', 0, 'coupon', 0, 'tax', 0, 'total', amount),
    'status', 'confirmed', 'createdAt', now(), 'source', 'external', 'channel', chan);
  insert into sd_bookings (id, pin, user_id, check_in, check_out, data) values (bid, bpin, null, ci, co, b)
    returning data into b;
  return b;
end $$;
revoke execute on function public.sd_block_rooms(jsonb) from public, anon;
grant execute on function public.sd_block_rooms(jsonb) to authenticated;

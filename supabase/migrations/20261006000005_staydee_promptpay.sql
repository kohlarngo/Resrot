-- ชำระเงินด้วย PromptPay QR (promptpay.io) / โอนธนาคาร / ชำระที่ที่พัก
-- promptpay.io แค่สร้าง QR — ไม่ยืนยันการชำระ: ทุกการจองออนไลน์จึงเป็น "รอชำระเงิน" จนทีมงานตรวจยอดแล้วกด "รับชำระเงิน"
-- ยกเลิกบัตรเครดิต (ไม่มี payment gateway จึงตัดบัตรจริงไม่ได้)
create or replace function public.sd_create_booking(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'Asia/Bangkok')::date;
  ci date := (p ->> 'checkIn')::date; co date := (p ->> 'checkOut')::date;
  qty int := coalesce((p ->> 'qty')::int, 1);
  q jsonb; g jsonb := coalesce(p -> 'guest', '{}'); pay jsonb; method text := p #>> '{payment,method}';
  st jsonb := coalesce((select value from sd_kv where key = 'settings'), '{}');
  member float8 := 0; off float8 := 0; cp jsonb; code text := upper(trim(coalesce(p ->> 'couponCode', '')));
  sub float8; tax float8; d date; booked int; bid text; bpin text; b jsonb;
begin
  if coalesce((select (value ->> 'maintenance')::boolean from sd_kv where key = 'flags'), false) then
    raise exception 'ระบบปิดปรับปรุงชั่วคราว ยังไม่สามารถจองได้';
  end if;
  if ci is null or co is null or ci < today then raise exception 'วันที่เข้าพักไม่ถูกต้อง'; end if;
  q := sd_price(p ->> 'hotelId', p ->> 'roomId', p ->> 'offerId', ci, co, qty);

  if length(trim(coalesce(g ->> 'firstName', ''))) < 1 or length(trim(coalesce(g ->> 'lastName', ''))) < 1 then raise exception 'กรุณากรอกชื่อและนามสกุล'; end if;
  if coalesce(g ->> 'email', '') !~ '^\S+@\S+\.\S+$' then raise exception 'รูปแบบอีเมลไม่ถูกต้อง'; end if;
  if length(regexp_replace(coalesce(g ->> 'phone', ''), '\D', '', 'g')) < 9 then raise exception 'เบอร์โทรไม่ถูกต้อง'; end if;
  g := jsonb_build_object(
    'firstName', left(trim(g ->> 'firstName'), 60), 'lastName', left(trim(g ->> 'lastName'), 60),
    'email', left(trim(g ->> 'email'), 120), 'phone', left(trim(g ->> 'phone'), 30),
    'country', left(coalesce(g ->> 'country', ''), 40), 'arrival', left(coalesce(g ->> 'arrival', ''), 20),
    'note', left(coalesce(g ->> 'note', ''), 500),
    'requests', coalesce((select jsonb_agg(left(x, 60)) from (select jsonb_array_elements_text(case when jsonb_typeof(g -> 'requests') = 'array' then g -> 'requests' else '[]' end) x limit 10) s), '[]'));

  if method = 'promptpay' then
    if coalesce(st ->> 'promptpayId', '') !~ '^(0\d{9}|\d{13})$' then raise exception 'ยังไม่เปิดรับชำระด้วยพร้อมเพย์ — กรุณาเลือกวิธีอื่น'; end if;
    pay := jsonb_build_object('method', method, 'paid', false, 'payTo', st ->> 'promptpayId', 'payToName', coalesce(st ->> 'promptpayName', ''));
  elsif method = 'bank' then
    if length(trim(coalesce(st ->> 'bankInfo', ''))) = 0 then raise exception 'ยังไม่เปิดรับชำระด้วยการโอนเงิน — กรุณาเลือกวิธีอื่น'; end if;
    pay := jsonb_build_object('method', method, 'paid', false, 'bankInfo', st ->> 'bankInfo');
  elsif method = 'hotel' then
    if not (q #>> '{offer,payAtHotel}')::boolean then raise exception 'ห้องนี้ไม่รองรับการชำระที่ที่พัก'; end if;
    pay := jsonb_build_object('method', method, 'paid', false);
  else
    raise exception 'วิธีชำระเงินนี้ยังไม่เปิดให้บริการ';
  end if;

  perform pg_advisory_xact_lock(hashtext('sd_room:' || (p ->> 'roomId')));
  for d in select generate_series(ci, co - 1, interval '1 day')::date loop
    select coalesce(sum(x.qty), 0) into booked from sd_bookings x
      where x.room_id = p ->> 'roomId' and x.status <> 'cancelled' and d >= x.check_in and d < x.check_out;
    if booked + qty > (q #>> '{room,total}')::int then raise exception 'ขออภัย ห้องเพิ่งถูกจองไป กรุณาเลือกห้องอื่น'; end if;
  end loop;

  sub := (q ->> 'sub')::float8;
  if uid is not null and exists (select 1 from sd_profiles where id = uid and active) then member := floor(sub * 0.05 + 0.5); end if;
  if code <> '' then
    cp := sd_check_coupon(code, (sub - member)::numeric);
    if cp ? 'error' then raise exception '%', cp ->> 'error'; end if;
    off := (cp ->> 'off')::float8;
  end if;
  tax := floor((sub - member - off) * 0.177::float8 + 0.5);

  loop
    bid := 'SD' || right((extract(epoch from clock_timestamp()) * 1000)::bigint::text, 6) || (100 + floor(random() * 900))::int::text;
    exit when not exists (select 1 from sd_bookings where id = bid);
  end loop;
  bpin := (1000 + floor(random() * 9000))::int::text;

  b := jsonb_build_object(
    'hotelId', p ->> 'hotelId', 'hotelName', q #>> '{hotel,name}', 'roomId', p ->> 'roomId', 'roomName', q #>> '{room,name}',
    'offer', q -> 'offer', 'qty', qty, 'checkIn', ci, 'checkOut', co, 'nights', (q ->> 'nights')::int,
    'adults', greatest(1, least(20, coalesce((p ->> 'adults')::int, 1))), 'children', greatest(0, least(20, coalesce((p ->> 'children')::int, 0))),
    'rooms', greatest(1, least(10, coalesce((p ->> 'rooms')::int, qty))),
    'guest', g, 'payment', pay,
    'price', jsonb_build_object('orig', (q ->> 'orig')::float8, 'room', sub, 'member', member, 'coupon', off,
      'couponCode', case when off > 0 then code end, 'tax', tax, 'total', sub - member - off + tax),
    'status', case when method = 'hotel' then 'confirmed' else 'pending' end,
    'createdAt', now());
  insert into sd_bookings (id, pin, user_id, check_in, check_out, data) values (bid, bpin, uid, ci, co, b)
    returning data into b;
  return b;
end $$;

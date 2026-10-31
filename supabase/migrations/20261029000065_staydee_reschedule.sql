-- ลูกค้าขอเปลี่ยนวันเข้าพักที่ "การจองของฉัน" → ส่งเป็นคำขอ รอเจ้าของรีสอร์ทอนุมัติ/ปฏิเสธ (เหมือนคำขอยกเลิก)
-- ตอนยื่นคำขอ ยังไม่เปลี่ยนวัน/ราคา/ห้องว่างของการจอง: เก็บใน data.rescheduleReq {status: pending|approved|rejected, at, in, out, nights, oldTotal, newTotal, price, paid, decidedAt, decidedBy, reason}
-- ลูกค้ายื่นได้ล่วงหน้า ≥ 7 วันก่อนเช็คอินเดิม · ยังไม่เช็คอิน · ไม่มีคำขอยกเลิกค้างอยู่ · ยื่นใหม่ = แทนที่คำขอเดิมที่ค้างอยู่
-- ราคาคิดที่เซิร์ฟเวอร์ (sd_price) · ภาษีคิดเฉพาะถ้าการจองเดิมมีภาษี · ส่วนลดสมาชิกคิดซ้ำอัตราเดิม · ส่วนลดโค้ดคงจำนวนเงินเดิม (ไม่เกินยอดห้อง) · บริการเสริมคงเดิม
-- ถ้าจ่ายเงินแล้ว/แนบสลิปแล้ว: ยอดใหม่สูงกว่าเดิมไม่ได้ (ไม่มีช่องทางเก็บเพิ่ม) · ยอดต่ำกว่า = เก็บส่วนต่างที่ data.reschedule.diff ให้เจ้าของโอนคืนเอง
-- เจ้าของ/ทีมงานอนุมัติ → ตรวจห้องว่างและราคาซ้ำ แล้วเปลี่ยนวัน + ราคา + เคลียร์เลขห้องที่จัดไว้ (units) · ประวัติที่ data.reschedule

drop function if exists public.sd_reschedule_booking(text, text, date, date);

-- ตรวจห้องว่าง + คิดราคาของช่วงวันใหม่ (ใช้ร่วมกันตอนยื่นคำขอและตอนอนุมัติ) — เรียกจากฟังก์ชันอื่นเท่านั้น
create or replace function public.sd_reschedule_calc(b sd_bookings, p_in date, p_out date) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  today date := (now() at time zone 'Asia/Bangkok')::date;
  q jsonb; d date; booked int; sub float8; member float8 := 0; off float8; tax float8; addons float8; total float8; old_total float8; money_in boolean; pr jsonb;
begin
  if p_in is null or p_out is null or p_in < today or p_out <= p_in then raise exception 'วันที่เข้าพักไม่ถูกต้อง'; end if;
  if p_in = b.check_in and p_out = b.check_out then raise exception 'ยังไม่ได้เลือกวันใหม่'; end if;
  perform pg_advisory_xact_lock(hashtext('sd_room:' || b.room_id));
  q := sd_price(b.hotel_id, b.room_id, b.data #>> '{offer,id}', p_in, p_out, b.qty);
  for d in select generate_series(p_in, p_out - 1, interval '1 day')::date loop
    select coalesce(sum(x.qty), 0) into booked from sd_bookings x
      where x.room_id = b.room_id and x.id <> b.id and x.status <> 'cancelled' and d >= x.check_in and d < x.check_out;
    if booked + b.qty > (q #>> '{room,total}')::int then raise exception 'ขออภัย ห้องไม่ว่างในวันที่เลือก (%)', to_char(d, 'DD/MM/YYYY'); end if;
  end loop;
  sub := (q ->> 'sub')::float8;
  if coalesce((b.data #>> '{price,member}')::float8, 0) > 0 then member := floor(sub * 0.05 + 0.5); end if;
  off := least(coalesce((b.data #>> '{price,coupon}')::float8, 0), greatest(0, sub - member));
  tax := case when coalesce((b.data #>> '{price,tax}')::float8, 0) > 0 then floor((sub - member - off) * 0.177::float8 + 0.5) else 0 end;
  addons := coalesce((b.data #>> '{price,addons}')::float8, 0);
  total := sub - member - off + tax + addons;
  old_total := coalesce((b.data #>> '{price,total}')::float8, 0);
  money_in := coalesce((b.data #>> '{payment,paid}')::boolean, false) or coalesce(b.data #>> '{payment,slip}', '') <> '';
  if money_in and total > old_total then
    raise exception 'ราคาช่วงวันใหม่สูงกว่าที่ชำระแล้ว (% → % บาท) — กรุณาติดต่อเจ้าของที่พักเพื่อเปลี่ยนวัน', old_total, total;
  end if;
  pr := (b.data -> 'price') || jsonb_build_object('orig', (q ->> 'orig')::float8, 'room', sub, 'member', member, 'coupon', off, 'tax', tax, 'total', total);
  return jsonb_build_object('nights', p_out - p_in, 'price', pr, 'oldTotal', old_total, 'newTotal', total, 'paid', money_in);
end $$;
revoke all on function public.sd_reschedule_calc(sd_bookings, date, date) from public, anon, authenticated;

-- ลูกค้ายื่นคำขอ
create or replace function public.sd_request_reschedule(p_id text, p_pin text, p_in date, p_out date) returns jsonb
language plpgsql security definer set search_path = public as $$
declare err text := sd_pin_gate(p_id, p_pin); b sd_bookings; v jsonb; c jsonb; today date := (now() at time zone 'Asia/Bangkok')::date;
begin
  if err is not null then return jsonb_build_object('error', err); end if;
  b := sd_my_booking(p_id, p_pin);
  if b.status not in ('pending', 'confirmed') or b.data ? 'checkedInAt' or b.check_out < today then
    raise exception 'ไม่สามารถเปลี่ยนวันของการจองนี้ได้';
  end if;
  if b.check_in - today < 7 then
    raise exception 'เปลี่ยนวันได้ล่วงหน้าอย่างน้อย 7 วันก่อนเช็คอิน — กรุณาติดต่อเจ้าของที่พัก';
  end if;
  if b.data #>> '{cancelReq,status}' = 'pending' then
    raise exception 'มีคำขอยกเลิกค้างอยู่ — ขอเปลี่ยนวันไม่ได้';
  end if;
  c := sd_reschedule_calc(b, p_in, p_out);
  update sd_bookings set data = data || jsonb_build_object('rescheduleReq', jsonb_build_object(
      'status', 'pending', 'at', now(), 'in', p_in, 'out', p_out, 'nights', p_out - p_in,
      'oldTotal', c -> 'oldTotal', 'newTotal', c -> 'newTotal', 'paid', c -> 'paid'))
    where id = b.id returning data into v;
  return v;
end $$;
revoke all on function public.sd_request_reschedule(text, text, date, date) from public;
grant execute on function public.sd_request_reschedule(text, text, date, date) to anon, authenticated;

-- เจ้าของรีสอร์ท/ทีมงาน (bookings.edit) หรือผู้ดูแลแพลตฟอร์ม อนุมัติ/ปฏิเสธคำขอ
create or replace function public.sd_decide_reschedule(p_id text, p_approve boolean, p_reason text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  b sd_bookings; v jsonb; c jsonb; r jsonb; who text;
  today date := (now() at time zone 'Asia/Bangkok')::date;
begin
  select * into b from sd_bookings where id = upper(trim(p_id));
  if not found then raise exception 'ไม่พบการจอง'; end if;
  if not (sd_is_admin() or (sd_can('bookings.edit') and sd_owns_hotel(b.hotel_id))) then raise exception 'ไม่มีสิทธิ์'; end if;
  r := b.data -> 'rescheduleReq';
  if r is null or r ->> 'status' <> 'pending' then raise exception 'ไม่มีคำขอเปลี่ยนวันที่รออยู่'; end if;
  select coalesce(nullif(trim(name), ''), 'เจ้าของที่พัก') into who from sd_profiles where id = auth.uid();
  if not p_approve then
    update sd_bookings set data = data || jsonb_build_object('rescheduleReq', r || jsonb_build_object('status', 'rejected', 'decidedAt', now(), 'decidedBy', who, 'reason', left(coalesce(trim(p_reason), ''), 300)))
      where id = b.id returning data into v;
    return v;
  end if;
  if b.status not in ('pending', 'confirmed') or b.data ? 'checkedInAt' or b.check_out < today then
    raise exception 'การจองนี้เปลี่ยนวันไม่ได้แล้ว';
  end if;
  c := sd_reschedule_calc(b, (r ->> 'in')::date, (r ->> 'out')::date);
  update sd_bookings set data = (data - 'units') || jsonb_build_object(
      'checkIn', r ->> 'in', 'checkOut', r ->> 'out', 'nights', (c ->> 'nights')::int, 'price', c -> 'price',
      'reschedule', jsonb_build_object('from', jsonb_build_array(b.check_in, b.check_out), 'to', jsonb_build_array(r ->> 'in', r ->> 'out'), 'at', now(),
        'oldTotal', c -> 'oldTotal', 'newTotal', c -> 'newTotal', 'paid', c -> 'paid',
        'diff', case when (c ->> 'paid')::boolean then (c ->> 'oldTotal')::float8 - (c ->> 'newTotal')::float8 else 0 end, 'decidedBy', who),
      'rescheduleReq', r || jsonb_build_object('status', 'approved', 'decidedAt', now(), 'decidedBy', who, 'newTotal', c -> 'newTotal'))
    where id = b.id returning data into v;
  return v;
end $$;
revoke all on function public.sd_decide_reschedule(text, boolean, text) from public, anon;
grant execute on function public.sd_decide_reschedule(text, boolean, text) to authenticated;

-- แจ้งเจ้าของเมื่อมีคำขอเปลี่ยนวันใหม่ (เหตุการณ์ 'reschedule' → sd-notify)
create or replace function public.sd_notify_booking()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'vault'
as $function$
declare ev text; oid text := new.data ->> 'ownerId';
begin
  if oid is null or oid = '' then return new; end if;
  if new.data ? 'practice' or new.data ->> 'demo' = 'true' then return new; end if;
  if exists (select 1 from sd_hotels h where h.id = new.data ->> 'hotelId' and (h.data ->> 'practice' = 'true' or h.data ->> 'demo' = 'true')) then return new; end if;
  if tg_op = 'INSERT' then
    ev := 'new';
  else
    if coalesce(old.data #>> '{payment,slip}', '') = '' and coalesce(new.data #>> '{payment,slip}', '') <> '' then ev := 'slip';
    elsif coalesce(old.data #>> '{cancelReq,status}', '') <> 'pending' and new.data #>> '{cancelReq,status}' = 'pending' then ev := 'cancel';
    elsif (old.data #>> '{rescheduleReq,at}') is distinct from (new.data #>> '{rescheduleReq,at}') and new.data #>> '{rescheduleReq,status}' = 'pending' then ev := 'reschedule';
    elsif not (old.data ? 'selfCheckinDoneAt') and new.data ? 'selfCheckinDoneAt' then ev := 'checkin';
    end if;
  end if;
  if ev is null then return new; end if;
  if auth.uid()::text = oid then return new; end if;
  begin
    perform net.http_post(
      url := 'https://whtomiamqwhhdrllibix.supabase.co/functions/v1/sd-notify',
      headers := jsonb_build_object('Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'sd_cron_secret')),
      body := jsonb_build_object('event', ev, 'booking_id', new.id));
  exception when others then
    raise warning 'sd_notify_booking: %', sqlerrm;
  end;
  return new;
end $function$;

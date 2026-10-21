-- ยกเลิกการจองล่วงหน้า ≥ 7 วัน: ลูกค้ายื่นคำขอ + ธนาคาร/เลขบัญชีรับเงินคืน → เจ้าของรีสอร์ทยืนยันหรือปฏิเสธ แล้วโอนคืนเอง
-- ไม่เปลี่ยนสถานะการจองตอนยื่นคำขอ: เก็บใน data.cancelReq {status: pending|approved|rejected, at, bank, account, name}
-- ยังไม่ได้จ่าย/ไม่มีสลิป = ไม่มีเงินต้องคืน ยกเลิกได้ทันที (ยังต้องล่วงหน้า ≥ 7 วัน)
create or replace function public.sd_request_cancel(p_id text, p_pin text, p_bank text default null, p_acct text default null, p_name text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare err text := sd_pin_gate(p_id, p_pin); b sd_bookings; v jsonb; today date := (now() at time zone 'Asia/Bangkok')::date; money_in boolean; acct text := regexp_replace(coalesce(p_acct, ''), '[^0-9]', '', 'g');
begin
  if err is not null then return jsonb_build_object('error', err); end if;
  b := sd_my_booking(p_id, p_pin);
  if b.status not in ('pending', 'confirmed') or b.data ? 'checkedInAt' or b.check_out < today then
    raise exception 'ไม่สามารถยกเลิกการจองนี้ได้';
  end if;
  if b.check_in - today < 7 then
    raise exception 'ยกเลิกได้ล่วงหน้าอย่างน้อย 7 วันก่อนเช็คอิน — กรุณาติดต่อเจ้าของที่พัก';
  end if;
  if b.data #>> '{cancelReq,status}' = 'pending' then
    raise exception 'ส่งคำขอยกเลิกไว้แล้ว รอเจ้าของที่พักยืนยัน';
  end if;
  money_in := coalesce((b.data #>> '{payment,paid}')::boolean, false) or coalesce(b.data #>> '{payment,slip}', '') <> '';
  if not money_in then
    update sd_bookings set data = data || jsonb_build_object('status', 'cancelled', 'refund', 0, 'cancelledAt', now(), 'cancelledBy', 'ลูกค้า')
      where id = b.id returning data into v;
    return v;
  end if;
  if coalesce(trim(p_bank), '') = '' or length(acct) not between 10 and 15 or length(trim(coalesce(p_name, ''))) < 2 then
    raise exception 'กรุณากรอกธนาคาร เลขบัญชี (10-15 หลัก) และชื่อบัญชีสำหรับรับเงินคืน';
  end if;
  update sd_bookings set data = data || jsonb_build_object('cancelReq', jsonb_build_object('status', 'pending', 'at', now(), 'bank', left(trim(p_bank), 60), 'account', acct, 'name', left(trim(p_name), 100)))
    where id = b.id returning data into v;
  return v;
end $$;

-- ทางเดิมใช้ได้เฉพาะที่ไม่ต้องคืนเงิน — ที่เหลือบังคับผ่านคำขอ (กันเรียก RPC ข้ามกฎ 7 วัน)
create or replace function public.sd_cancel_booking(p_id text, p_pin text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  return sd_request_cancel(p_id, p_pin);
end $$;
grant execute on function public.sd_request_cancel(text, text, text, text, text) to anon, authenticated;

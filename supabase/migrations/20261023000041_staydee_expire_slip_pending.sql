-- การจองที่ค้าง pending: แยกเวลาตามว่าแนบสลิปแล้วหรือยัง
--  · ยังไม่แนบสลิป → ยกเลิกเมื่อเกิน pendingHours (ค่าเริ่มต้น 24 ชม.)
--  · แนบสลิปแล้วแต่เจ้าของยังไม่กดอนุมัติ → ระบบอนุมัติให้อัตโนมัติเมื่อเกิน slipPendingHours (ค่าเริ่มต้น 72 ชม.)
-- ตั้งได้ที่ sd_kv key 'flags' · ฟิลด์ที่ตั้งตอนอนุมัติอัตโนมัติตรงกับปุ่ม "อนุมัติ" ใน admin.js
create or replace function public.sd_expire_pending() returns int
language plpgsql security definer set search_path = public as $$
declare
  hrs int := greatest(1, coalesce((select (value ->> 'pendingHours')::int from sd_kv where key = 'flags'), 24));
  slip_hrs int := greatest(1, coalesce((select (value ->> 'slipPendingHours')::int from sd_kv where key = 'flags'), 72));
  n int; m int;
begin
  update sd_bookings set data = data || jsonb_build_object('status', 'cancelled', 'refund', 0, 'cancelledAt', now(), 'cancelledBy', 'ระบบ (หมดเวลาชำระเงิน)')
  where status = 'pending' and created_at < now() - make_interval(hours => hrs)
    and not coalesce((data #>> '{payment,paid}')::boolean, false)
    and data #>> '{payment,method}' in ('promptpay', 'bank')
    and not ((data -> 'payment') ? 'slip');
  get diagnostics n = row_count;

  update sd_bookings set data = data
      || jsonb_build_object('status', 'confirmed', 'confirmedAt', now(), 'approvedBy', 'ระบบ (อนุมัติอัตโนมัติ)',
           'payment', (data -> 'payment') || jsonb_build_object('paid', true, 'paidAt', now(), 'paidBy', 'ระบบ (อนุมัติอัตโนมัติ)'))
  where status = 'pending' and created_at < now() - make_interval(hours => slip_hrs)
    and not coalesce((data #>> '{payment,paid}')::boolean, false)
    and data #>> '{payment,method}' in ('promptpay', 'bank')
    and (data -> 'payment') ? 'slip';
  get diagnostics m = row_count;

  delete from sd_pin_attempts where updated_at < now() - interval '1 day';
  return n + m;
end $$;
revoke execute on function public.sd_expire_pending() from public, anon, authenticated;

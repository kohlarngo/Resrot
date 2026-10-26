-- PMS (ต่อ): แจ้งเตือนเจ้าของเมื่อมีคิวรอห้องใหม่ / เมื่อห้องว่างตรงกับคิวที่รออยู่ + แก้คำเตือน search_path
-- ใช้ Edge Function `sd-notify` เดิม (event 'waitlist' / 'wl_check') ผ่าน pg_net · ส่งพังต้องไม่ทำให้การจอง/เข้าคิวพัง (จับ exception)

-- 1) กันแจ้งซ้ำ: ตั้งเวลาไว้เมื่อแจ้งว่า "ห้องว่างแล้ว" ให้คิวนั้นแล้ว
alter table public.sd_waitlist add column if not exists notified_at timestamptz;

-- 2) แก้ Function Search Path Mutable (advisor) — ตัวเดียวกับเดิม เพิ่มแค่ set search_path
create or replace function public.sd_staff_perm_list() returns text[]
language sql immutable set search_path = public as $$
  select array['ops.view', 'frontdesk', 'bookings.view', 'bookings.edit', 'inventory', 'hotels.edit', 'coupons.edit', 'reviews.view', 'customers.view', 'housekeeping'];
$$;

-- 3) มีคนเข้าคิวใหม่ → แจ้งเจ้าของ
create or replace function public.sd_notify_waitlist_new() returns trigger
language plpgsql security definer set search_path = public, vault as $$
begin
  begin
    perform net.http_post(
      url := 'https://whtomiamqwhhdrllibix.supabase.co/functions/v1/sd-notify',
      headers := jsonb_build_object('Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'sd_cron_secret')),
      body := jsonb_build_object('event', 'waitlist', 'waitlist_id', new.id));
  exception when others then
    raise warning 'sd_notify_waitlist_new: %', sqlerrm;
  end;
  return new;
end $$;
revoke execute on function public.sd_notify_waitlist_new() from public, anon, authenticated;
drop trigger if exists sd_waitlist_notify on public.sd_waitlist;
create trigger sd_waitlist_notify after insert on public.sd_waitlist
  for each row execute function public.sd_notify_waitlist_new();

-- 4) ห้องว่างขึ้น (ยกเลิก / ย้ายห้อง / ย่นวันพัก / ลดจำนวน) และที่พักนั้นมีคิวรออยู่ → ให้ Edge Function ตรวจว่าคิวไหนว่างพอแล้วแจ้งเจ้าของ
create or replace function public.sd_notify_waitlist_free() returns trigger
language plpgsql security definer set search_path = public, vault as $$
begin
  if not ((new.status = 'cancelled' and old.status is distinct from 'cancelled')
       or new.check_out < old.check_out or new.check_in > old.check_in
       or new.room_id is distinct from old.room_id or new.qty < old.qty) then
    return new;
  end if;
  if not exists (select 1 from sd_waitlist where hotel_id = old.hotel_id and status = 'waiting' and notified_at is null) then
    return new;
  end if;
  begin
    perform net.http_post(
      url := 'https://whtomiamqwhhdrllibix.supabase.co/functions/v1/sd-notify',
      headers := jsonb_build_object('Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'sd_cron_secret')),
      body := jsonb_build_object('event', 'wl_check', 'booking_id', new.id));
  exception when others then
    raise warning 'sd_notify_waitlist_free: %', sqlerrm;
  end;
  return new;
end $$;
revoke execute on function public.sd_notify_waitlist_free() from public, anon, authenticated;
drop trigger if exists sd_bookings_waitlist_free on public.sd_bookings;
create trigger sd_bookings_waitlist_free after update on public.sd_bookings
  for each row execute function public.sd_notify_waitlist_free();

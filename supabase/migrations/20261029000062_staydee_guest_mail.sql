-- อีเมลถึงลูกค้า (Edge Function sd-mail ผ่าน Resend): ได้รับการจอง / ยืนยันแล้ว / ยกเลิก / เตือนก่อนเข้าพัก 1 วัน
-- ไม่ส่ง: การจองที่เจ้าของคีย์เอง (source = external: OTA / ปิดห้อง / หน้าเคาน์เตอร์), บัญชีทดลอง / ข้อมูลฝึก, ไม่มีอีเมลลูกค้า
-- sd_mail_log กันส่งซ้ำ (1 ฉบับต่อการจองต่อประเภท) — อ่านได้เฉพาะแอดมิน, เขียนโดย service role เท่านั้น
create table public.sd_mail_log (
  booking_id text not null,
  kind text not null check (kind in ('received', 'confirmed', 'cancelled', 'remind')),
  to_email text not null default '',
  ok boolean,
  info text not null default '',
  created_at timestamptz not null default now(),
  primary key (booking_id, kind)
);
alter table public.sd_mail_log enable row level security;
create policy sd_mail_log_admin_read on public.sd_mail_log for select to authenticated using (public.sd_is_admin());

create function public.sd_mail_booking() returns trigger
language plpgsql security definer set search_path = public, vault as $$
declare ev text;
begin
  if coalesce(nullif(new.guest_email, ''), new.data #>> '{guest,email}', '') = '' then return new; end if;
  if new.data ->> 'source' = 'external' then return new; end if;
  if new.data ? 'practice' or new.data ->> 'demo' = 'true' then return new; end if;
  if exists (select 1 from sd_hotels h where h.id = new.data ->> 'hotelId' and (h.data ->> 'practice' = 'true' or h.data ->> 'demo' = 'true')) then return new; end if;
  if tg_op = 'INSERT' then
    ev := case new.status when 'confirmed' then 'confirmed' else 'received' end;
  elsif new.status is distinct from old.status then
    ev := case new.status when 'confirmed' then 'confirmed' when 'cancelled' then 'cancelled' end;
  end if;
  if ev is null then return new; end if;
  begin
    perform net.http_post(
      url := 'https://whtomiamqwhhdrllibix.supabase.co/functions/v1/sd-mail',
      headers := jsonb_build_object('Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'sd_cron_secret')),
      body := jsonb_build_object('event', ev, 'booking_id', new.id));
  exception when others then
    raise warning 'sd_mail_booking: %', sqlerrm;
  end;
  return new;
end $$;
revoke execute on function public.sd_mail_booking() from public, anon, authenticated;

create trigger sd_bookings_mail after insert or update of status on public.sd_bookings
  for each row execute function public.sd_mail_booking();

-- เตือนลูกค้าที่จะเข้าพักพรุ่งนี้ ทุกวัน 09:00 น. เวลาไทย (02:00 UTC)
select cron.schedule('sd-mail-remind', '0 2 * * *', $cron$
  select net.http_post(
    url := 'https://whtomiamqwhhdrllibix.supabase.co/functions/v1/sd-mail',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'sd_cron_secret')),
    body := '{"event":"remind"}'::jsonb);
$cron$);

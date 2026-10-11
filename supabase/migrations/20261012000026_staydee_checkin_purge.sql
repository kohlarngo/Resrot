-- ลบทะเบียนผู้เข้าพัก (ข้อมูล + รูปบัตร/พาสปอร์ต + ลายเซ็น) อัตโนมัติเมื่อเก็บครบ 45 วันนับจากวันลงทะเบียน
-- ลบไฟล์รูปด้วย SQL ตรงๆ ไม่ได้ (Supabase บังคับให้ผ่าน Storage API) → ใช้ Edge Function `sd-checkin-purge` (supabase/functions/sd-checkin-purge)
-- ที่ถูกเรียกทุกคืน 03:00 (เวลาไทย) โดย pg_cron + pg_net · ยืนยันตัวด้วยรหัสลับใน Vault ชื่อ `sd_cron_secret`
-- ⚠️ ต้องสร้างรหัสลับนี้เองก่อนใช้งาน (ไม่เก็บในไฟล์นี้):  select vault.create_secret('<สุ่มค่ายาวๆ>', 'sd_cron_secret');
create extension if not exists pg_net;

create or replace function public.sd_cron_ok(p text) returns boolean
language sql stable security definer set search_path = public, vault as $$
  select coalesce(p, '') <> '' and exists (select 1 from vault.decrypted_secrets where name = 'sd_cron_secret' and decrypted_secret = p);
$$;
revoke execute on function public.sd_cron_ok(text) from public, anon, authenticated; -- เรียกได้เฉพาะ service_role (Edge Function)

select cron.schedule('sd-checkin-purge', '0 20 * * *', $job$
  select net.http_post(
    url := 'https://whtomiamqwhhdrllibix.supabase.co/functions/v1/sd-checkin-purge',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'sd_cron_secret')),
    body := '{}'::jsonb);
$job$);

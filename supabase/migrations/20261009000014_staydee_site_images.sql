-- รูปทั้งเว็บ (โลโก้ ไอคอน แบนเนอร์หน้าแรก รูปโปรโมชั่น รูปชายหาด ฯลฯ) เก็บใน sd_kv คีย์ 'images' เป็น { ชื่อช่อง: URL }
-- นักพัฒนา (สิทธิ์ hotels.media) เป็นผู้แก้ · ทุกคนอ่านได้ (นโยบาย sd_kv read เปิดสาธารณะอยู่แล้ว)
create or replace function public.sd_kv_can(k text) returns boolean
language sql stable set search_path = public as $$
  select case k when 'settings' then sd_can('settings.business') when 'flags' then sd_can('flags.edit') when 'sos_contacts' then sd_can('sos.manage')
    when 'images' then sd_can('hotels.media') else false end;
$$;

-- ตาราง sd_kv จำกัดชื่อคีย์ที่ยอมรับ — เพิ่ม 'images'
alter table public.sd_kv drop constraint sd_kv_key_check;
alter table public.sd_kv add constraint sd_kv_key_check check (key in ('settings', 'flags', 'sos_contacts', 'images'));

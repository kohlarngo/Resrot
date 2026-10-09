-- เนื้อหาหน้าเว็บแบบยืดหยุ่น (Inline Content Editor): sd_kv คีย์ 'content'
-- รูปแบบ: { "texts": { "th": { "home.hero.title": "..." }, "en": {...}, "zh": {...} }, "styles": { "home.hero.title": { "color": "#fff", "size": 38, "bold": true, "align": "center" } } }
-- นักพัฒนา (สิทธิ์ hotels.media) เป็นผู้แก้ · ทุกคนอ่านได้ (นโยบาย sd_kv read เปิดสาธารณะ)
create or replace function public.sd_kv_can(k text) returns boolean
language sql stable set search_path = public as $$
  select case k when 'settings' then sd_can('settings.business') when 'flags' then sd_can('flags.edit') when 'sos_contacts' then sd_can('sos.manage')
    when 'images' then sd_can('hotels.media') when 'content' then sd_can('hotels.media') else false end;
$$;
alter table public.sd_kv drop constraint sd_kv_key_check;
alter table public.sd_kv add constraint sd_kv_key_check check (key in ('settings', 'flags', 'sos_contacts', 'images', 'content'));

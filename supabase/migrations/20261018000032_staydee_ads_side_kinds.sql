-- แบนเนอร์ลอยข้างจอ (ซ้าย / ขวา) มีปุ่มปิดด้านล่าง
alter table public.sd_ads drop constraint sd_ads_kind_check;
alter table public.sd_ads add constraint sd_ads_kind_check check (kind = any (array['banner','featured','card','popup','side_left','side_right']));

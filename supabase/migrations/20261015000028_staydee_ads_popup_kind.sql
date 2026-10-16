-- โฆษณาแบบป๊อปอัพหน้าแรก: เพิ่มชนิด 'popup' ใน sd_ads.kind
alter table public.sd_ads drop constraint sd_ads_kind_check;
alter table public.sd_ads add constraint sd_ads_kind_check check (kind = any (array['banner','featured','card','popup']));

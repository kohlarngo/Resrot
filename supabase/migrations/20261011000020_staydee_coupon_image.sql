-- โค้ดส่วนลด: แนบรูปได้ (URL จาก bucket sd-media)
alter table public.sd_coupons add column if not exists image text not null default '';

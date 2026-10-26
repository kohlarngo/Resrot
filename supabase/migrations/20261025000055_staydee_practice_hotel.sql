-- รีสอร์ทตัวอย่างสำหรับฝึกใช้งาน (เจ้าของใหม่ทุกราย): ห้ามเปิดขายจริงบนเว็บไซต์ลูกค้า
-- ขยาย guard เดิมของบัญชีทดลอง ให้ครอบคลุมรีสอร์ทที่ติดธง practice ด้วย
create or replace function public.sd_demo_hotel_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if (new.owner_id is not null and exists (select 1 from sd_demo_accounts d where d.owner_id = new.owner_id)) then
    new.data := coalesce(new.data, '{}'::jsonb) || '{"active": false, "demo": true}'::jsonb;
  elsif coalesce(new.data->>'practice', '') = 'true' then
    new.data := new.data || '{"active": false}'::jsonb;
  end if;
  return new;
end $$;

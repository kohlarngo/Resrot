-- ลิงก์ Facebook ของรีสอร์ท (sd_profiles.biz.facebook) แสดงให้ลูกค้าในใบยืนยันการจอง — ส่งออกเฉพาะลิงก์ที่ขึ้นต้น https://
create or replace function public.sd_public_owners() returns setof jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', id, 'name', coalesce(nullif(biz ->> 'resortName', ''), name), 'phone', coalesce(nullif(biz ->> 'phone', ''), phone),
    'line', coalesce(biz ->> 'line', ''), 'facebook', case when coalesce(biz ->> 'facebook', '') ~* '^https://' then biz ->> 'facebook' else '' end,
    'promptpay', coalesce(payout ->> 'promptpayId', '') ~ '^(0\d{9}|\d{13})$',
    'bank', length(trim(coalesce(payout ->> 'bankInfo', ''))) > 0)
  from sd_profiles where role = 'owner' and active and owner_status = 'approved';
$$;

-- บัญชีทดลองหมดอายุ → ปิดพนักงานตัวอย่าง (แม่บ้าน/แอดมินจำกัดสิทธิ์) ของบัญชีนั้นด้วย
create or replace function public.sd_demo_expire() returns void
language sql security definer set search_path = public as $$
  update sd_profiles p set active = false
  from sd_demo_accounts d
  where d.expires_at < now() and p.active and (p.id = d.owner_id or p.employer_id = d.owner_id);
$$;
revoke all on function public.sd_demo_expire() from public, anon, authenticated;

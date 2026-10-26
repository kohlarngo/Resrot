-- บัญชีทดลองใช้ (Demo) สำหรับลูกค้าที่สนใจ: นักพัฒนาสร้าง ID/รหัสผ่านให้ → ลูกค้าลองใช้พอร์ทัลเจ้าของรีสอร์ท
-- รีสอร์ทของบัญชีทดลองจะไม่ปรากฏบนเว็บไซต์ลูกค้า (บังคับ active=false) และหมดอายุอัตโนมัติ

create table if not exists public.sd_demo_accounts (
  owner_id   uuid primary key references public.sd_profiles(id) on delete cascade,
  label      text not null default '',
  note       text not null default '',
  expires_at timestamptz not null,
  created_by text,
  created_at timestamptz not null default now()
);
alter table public.sd_demo_accounts enable row level security;

drop policy if exists "sd_demo read" on public.sd_demo_accounts;
create policy "sd_demo read" on public.sd_demo_accounts for select
  using (sd_can('staff.manage') or owner_id = (select auth.uid()));
-- เขียนผ่าน edge function (service role) เท่านั้น

-- รีสอร์ทของบัญชีทดลอง: ห้ามเปิดขายจริงบนเว็บไซต์
create or replace function public.sd_demo_hotel_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.owner_id is not null and exists (select 1 from sd_demo_accounts d where d.owner_id = new.owner_id) then
    new.data := coalesce(new.data, '{}'::jsonb) || '{"active": false, "demo": true}'::jsonb;
  end if;
  return new;
end $$;
drop trigger if exists sd_demo_hotel_guard on public.sd_hotels;
create trigger sd_demo_hotel_guard before insert or update on public.sd_hotels
  for each row execute function public.sd_demo_hotel_guard();

-- หมดอายุ → ปิดบัญชี (ข้อมูลยังอยู่ ต่ออายุหรือลบได้จากหน้านักพัฒนา)
create or replace function public.sd_demo_expire() returns void
language sql security definer set search_path = public as $$
  update sd_profiles p set active = false
  from sd_demo_accounts d
  where d.owner_id = p.id and d.expires_at < now() and p.active;
$$;
revoke all on function public.sd_demo_expire() from public, anon, authenticated;

do $$ begin
  perform cron.unschedule('sd-demo-expire') where exists (select 1 from cron.job where jobname = 'sd-demo-expire');
  perform cron.schedule('sd-demo-expire', '7 * * * *', 'select public.sd_demo_expire()');
end $$;

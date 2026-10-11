-- สิทธิ์รายคนของผู้ดูแลแพลตฟอร์ม (admin): sd_profiles.perms (null = ตามบทบาท)
-- นักพัฒนา (staff.manage) เป็นผู้กำหนด · กำหนดได้เฉพาะสิทธิ์ที่บทบาท admin มีอยู่แล้ว (ให้เกินไม่ได้)
-- หมายเหตุ: นโยบาย RLS บางตารางตรวจด้วย sd_is_admin() (ทุกสิทธิ์ของผู้ดูแล) ไม่ผ่าน sd_can() — สิทธิ์รายคนจึงบังคับทั้งหน้าจอและฐานข้อมูลเฉพาะส่วนที่ใช้ sd_can()
alter table public.sd_profiles add column if not exists perms text[];

create or replace function public.sd_can(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from sd_profiles pr
    where pr.id = auth.uid() and pr.active and (
      case when pr.role = 'admin' and pr.perms is not null then p = any (pr.perms)
           else exists (select 1 from sd_role_perms rp where rp.role = pr.role and rp.perm = p) end)
  );
$$;

create or replace function public.sd_profiles_perms_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.perms is distinct from old.perms and not sd_privileged() and coalesce(current_setting('sd.trusted', true), '') <> 'on' then
    if not sd_can('staff.manage') then raise exception 'ไม่มีสิทธิ์กำหนดสิทธิ์การใช้งาน'; end if;
  end if;
  if new.role <> 'admin' then
    new.perms := null;
  elsif new.perms is not null then
    new.perms := coalesce((select array_agg(perm) from sd_role_perms where role = 'admin' and perm = any (new.perms)), '{}');
  end if;
  return new;
end $$;
drop trigger if exists sd_profiles_perms on public.sd_profiles;
create trigger sd_profiles_perms before insert or update on public.sd_profiles for each row execute function public.sd_profiles_perms_guard();
revoke execute on function public.sd_profiles_perms_guard() from public, anon, authenticated;

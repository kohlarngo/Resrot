-- พนักงานของเจ้าของรีสอร์ท (role = 'staff') — เจ้าของจ้างแอดมินส่วนตัวเข้ามาช่วยจัดการที่พักของตัวเอง
-- หลักการ: พนักงานคือ "ตัวแทนของเจ้าของ" ผ่านฟังก์ชัน sd_boss() (= รหัสเจ้าของที่จ้าง) · ทุกที่ที่เคยเทียบ owner_id = auth.uid() เปลี่ยนเป็น sd_boss()
-- สิทธิ์: เจ้าของติ๊กให้ทีละคน (sd_profiles.perms) · เรื่องเงิน (payout.edit, reports.view, exec.view) และการจัดการทีม/แจ้งเตือน (team.manage) เป็นของเจ้าของคนเดียว
-- สร้าง/รีเซ็ตรหัส/ลบพนักงานทำผ่าน Edge Function `sd-owner-staff` (ต้องใช้ service role) — เจ้าของแก้แถวพนักงานตรงๆ จากเบราว์เซอร์ไม่ได้

alter table public.sd_profiles drop constraint sd_profiles_role_check;
alter table public.sd_profiles add constraint sd_profiles_role_check check (role in ('owner', 'admin', 'dev', 'staff', 'user'));
alter table public.sd_profiles add column employer_id uuid references public.sd_profiles (id) on delete cascade;
alter table public.sd_profiles add constraint sd_profiles_staff_employer check ((role = 'staff') = (employer_id is not null));
create index sd_profiles_employer_idx on public.sd_profiles (employer_id) where employer_id is not null;

-- สิทธิ์ใหม่ของเจ้าของ: จัดการพนักงาน + ตั้งค่าแจ้งเตือน (พนักงานให้สิทธิ์นี้ไม่ได้)
insert into public.sd_role_perms (role, perm) values ('owner', 'team.manage') on conflict do nothing;

-- สิทธิ์ที่เจ้าของให้พนักงานได้ (ไม่รวมเรื่องเงิน/ทีม)
create function public.sd_staff_perm_list() returns text[]
language sql immutable as $$
  select array['ops.view', 'frontdesk', 'bookings.view', 'bookings.edit', 'inventory', 'hotels.edit', 'coupons.edit', 'reviews.view', 'customers.view'];
$$;

-- รหัสเจ้าของที่ผู้ใช้ปัจจุบันทำงานแทน: เจ้าของ = ตัวเอง · พนักงาน = เจ้าของที่จ้าง (เฉพาะเมื่อเจ้าของยังอนุมัติ/ใช้งานอยู่) · อื่นๆ = null
create function public.sd_boss() returns uuid
language sql stable security definer set search_path = public as $$
  select case
    when pr.role = 'owner' then pr.id
    when pr.role = 'staff' and exists (select 1 from sd_profiles o where o.id = pr.employer_id and o.role = 'owner' and o.active and o.owner_status = 'approved') then pr.employer_id
  end
  from sd_profiles pr where pr.id = auth.uid() and pr.active;
$$;
grant execute on function public.sd_boss() to authenticated;

create or replace function public.sd_can(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from sd_profiles pr
    where pr.id = auth.uid() and pr.active and (
      case when pr.role = 'staff' then sd_boss() is not null and p = any (coalesce(pr.perms, '{}')) and p = any (sd_staff_perm_list())
           when pr.role = 'admin' and pr.perms is not null then p = any (pr.perms)
           else exists (select 1 from sd_role_perms rp where rp.role = pr.role and rp.perm = p) end)
  );
$$;

create or replace function public.sd_is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from sd_profiles where id = auth.uid() and active and (role in ('admin', 'dev') or (role = 'owner' and owner_status = 'approved')))
    or sd_boss() is not null and exists (select 1 from sd_profiles where id = auth.uid() and role = 'staff');
$$;

create or replace function public.sd_owns_hotel(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select sd_is_staff() and exists (select 1 from sd_hotels where id = p and owner_id = sd_boss());
$$;

create or replace function public.sd_slip_visible(p_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select sd_is_admin() or exists (select 1 from sd_bookings b join sd_hotels h on h.id = b.hotel_id
    where b.id = split_part(p_name, '/', 1) and h.owner_id = sd_boss() and sd_is_staff());
$$;

-- ที่พัก: อ่าน/แก้ของเจ้าของที่ตัวเองทำงานแทน
drop policy "sd_hotels read" on public.sd_hotels;
create policy "sd_hotels read" on public.sd_hotels for select
  using (owner_id is null or sd_owner_live(owner_id) or owner_id = (select sd_boss()) or sd_is_admin() or sd_dev_media());
drop policy "sd_hotels insert" on public.sd_hotels;
create policy "sd_hotels insert" on public.sd_hotels for insert to authenticated
  with check (sd_is_admin() or (sd_can('hotels.edit') and owner_id = (select sd_boss())));
drop policy "sd_hotels update" on public.sd_hotels;
create policy "sd_hotels update" on public.sd_hotels for update to authenticated
  using (sd_is_admin() or sd_can('hotels.media') or (sd_can('hotels.edit') and owner_id = (select sd_boss())))
  with check (sd_is_admin() or sd_can('hotels.media') or (sd_can('hotels.edit') and owner_id = (select sd_boss())));
drop policy "sd_hotels delete" on public.sd_hotels;
create policy "sd_hotels delete" on public.sd_hotels for delete to authenticated
  using (sd_is_admin() or (sd_can('hotels.edit') and owner_id = (select sd_boss())));

-- โค้ดส่วนลด
drop policy "sd_coupons read" on public.sd_coupons;
drop policy "sd_coupons insert" on public.sd_coupons;
drop policy "sd_coupons update" on public.sd_coupons;
drop policy "sd_coupons delete" on public.sd_coupons;
create policy "sd_coupons read" on public.sd_coupons for select to authenticated
  using (sd_is_admin() or (sd_can('coupons.edit') and owner_id = (select sd_boss())));
create policy "sd_coupons insert" on public.sd_coupons for insert to authenticated
  with check (sd_is_admin() or (sd_can('coupons.edit') and owner_id = (select sd_boss())));
create policy "sd_coupons update" on public.sd_coupons for update to authenticated
  using (sd_is_admin() or (sd_can('coupons.edit') and owner_id = (select sd_boss())))
  with check (sd_is_admin() or (sd_can('coupons.edit') and owner_id = (select sd_boss())));
create policy "sd_coupons delete" on public.sd_coupons for delete to authenticated
  using (sd_is_admin() or (sd_can('coupons.edit') and owner_id = (select sd_boss())));

-- โปรไฟล์: เจ้าของเห็นแถวพนักงานของตัวเอง (แก้ผ่าน Edge Function เท่านั้น)
drop policy "sd_profiles read" on public.sd_profiles;
create policy "sd_profiles read" on public.sd_profiles for select to authenticated
  using (id = (select auth.uid()) or sd_is_admin() or (sd_can('staff.manage') and role in ('admin', 'dev')) or employer_id = (select auth.uid()));

-- พนักงานแก้ employer_id ของตัวเองไม่ได้ (กันย้ายไปสังกัดเจ้าของคนอื่น)
create function public.sd_profiles_employer_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and not sd_privileged() and coalesce(current_setting('sd.trusted', true), '') <> 'on' then
    new.employer_id := old.employer_id;
  end if;
  return new;
end $$;
revoke execute on function public.sd_profiles_employer_guard() from public, anon, authenticated;
create trigger sd_profiles_employer before update on public.sd_profiles for each row execute function public.sd_profiles_employer_guard();

-- กฎ perms เดิมล้างค่าของทุกบทบาทที่ไม่ใช่ admin → เพิ่มให้ staff เก็บ perms ได้ (กรองให้เหลือเฉพาะสิทธิ์ที่ให้พนักงานได้)
create or replace function public.sd_profiles_perms_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.perms is distinct from old.perms and not sd_privileged() and coalesce(current_setting('sd.trusted', true), '') <> 'on' then
    if not sd_can('staff.manage') then raise exception 'ไม่มีสิทธิ์กำหนดสิทธิ์การใช้งาน'; end if;
  end if;
  if new.role = 'staff' then
    new.perms := coalesce((select array_agg(x) from unnest(coalesce(new.perms, '{}')) x where x = any (sd_staff_perm_list())), '{}');
  elsif new.role <> 'admin' then
    new.perms := null;
  elsif new.perms is not null then
    new.perms := coalesce((select array_agg(perm) from sd_role_perms where role = 'admin' and perm = any (new.perms)), '{}');
  end if;
  return new;
end $$;

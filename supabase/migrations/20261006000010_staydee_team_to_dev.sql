-- จัดการทีม (ผู้ดูแลแพลตฟอร์ม / นักพัฒนา) ย้ายไปหน้านักพัฒนา
-- ผู้ดูแลแพลตฟอร์มยังระงับ / เปิดใช้เจ้าของรีสอร์ทได้ด้วยสิทธิ์ partners.manage
delete from public.sd_role_perms where role = 'admin' and perm = 'staff.manage';
insert into public.sd_role_perms (role, perm) values ('dev', 'staff.manage') on conflict do nothing;

-- นักพัฒนาเห็นโปรไฟล์ทีมงาน (ไม่เห็นลูกค้าหรือเจ้าของรีสอร์ท)
drop policy "sd_profiles read" on public.sd_profiles;
create policy "sd_profiles read" on public.sd_profiles for select to authenticated
  using (id = (select auth.uid()) or sd_is_admin() or (sd_can('staff.manage') and role in ('admin', 'dev')));

drop policy "sd_profiles update" on public.sd_profiles;
create policy "sd_profiles update" on public.sd_profiles for update to authenticated
  using (id = (select auth.uid()) or (sd_can('staff.manage') and role in ('admin', 'dev')) or (sd_can('partners.manage') and role = 'owner'))
  with check (id = (select auth.uid()) or (sd_can('staff.manage') and role in ('admin', 'dev')) or (sd_can('partners.manage') and role = 'owner'));

create or replace function public.sd_profiles_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and not sd_privileged() and coalesce(current_setting('sd.trusted', true), '') <> 'on' then
    new.id := old.id; new.email := old.email; new.created_at := old.created_at; new.created_by := old.created_by; new.applied_at := old.applied_at;
    if (new.role, new.active, new.owner_status, new.owner_note) is distinct from (old.role, old.active, old.owner_status, old.owner_note) then
      -- ทีมงาน: นักพัฒนา (staff.manage) · เจ้าของรีสอร์ท: ผู้ดูแลแพลตฟอร์ม (partners.manage) เปลี่ยนสถานะได้ แต่เปลี่ยนบทบาทไม่ได้
      if not ((sd_can('staff.manage') and old.role in ('admin', 'dev') and new.role in ('admin', 'dev'))
           or (sd_can('partners.manage') and old.role = 'owner' and new.role = 'owner')) then
        raise exception 'ไม่มีสิทธิ์เปลี่ยนบทบาทหรือสถานะบัญชี';
      end if;
    end if;
  end if;
  if old.role = 'admin' and old.active and (tg_op = 'DELETE' or new.role <> 'admin' or not new.active) then
    if not exists (select 1 from sd_profiles where role = 'admin' and active and id <> old.id) then
      raise exception 'ต้องมีผู้ดูแลแพลตฟอร์มที่ใช้งานได้อย่างน้อย 1 คน';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

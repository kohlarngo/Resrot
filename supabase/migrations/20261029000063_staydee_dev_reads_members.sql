-- หน้า "สมาชิก" ของนักพัฒนาขึ้น 0 ราย: นโยบายอ่าน/แก้ sd_profiles ให้ staff.manage เห็นเฉพาะ admin/dev — เพิ่มสมาชิก (role = user)
-- (แก้ชื่อ/อีเมล/รหัส และลบสมาชิกทำผ่าน Edge Function sd-staff · ระงับ/เปิดใช้งานเขียนตรงจากหน้าเว็บจึงต้องมีสิทธิ์ update ด้วย)
drop policy "sd_profiles read" on public.sd_profiles;
create policy "sd_profiles read" on public.sd_profiles for select to authenticated
  using (id = (select auth.uid()) or sd_is_admin() or (sd_can('staff.manage') and role in ('admin', 'dev', 'user')) or employer_id = (select auth.uid()));

drop policy "sd_profiles update" on public.sd_profiles;
create policy "sd_profiles update" on public.sd_profiles for update to authenticated
  using (id = (select auth.uid()) or (sd_can('staff.manage') and role in ('admin', 'dev', 'user')) or (sd_can('partners.manage') and role = 'owner'))
  with check (id = (select auth.uid()) or (sd_can('staff.manage') and role in ('admin', 'dev', 'user')) or (sd_can('partners.manage') and role = 'owner'));

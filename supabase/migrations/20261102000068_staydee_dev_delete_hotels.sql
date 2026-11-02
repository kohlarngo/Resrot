-- นักพัฒนา (dev) ลบที่พักได้ทุกแห่ง (หน้า "ที่พักทั้งหมด" ใน dev.html) — สิทธิ์ใหม่ hotels.delete
insert into public.sd_role_perms (role, perm) values ('dev', 'hotels.delete') on conflict do nothing;
drop policy if exists "sd_hotels delete" on public.sd_hotels;
create policy "sd_hotels delete" on public.sd_hotels for delete
  using (sd_is_admin() or sd_can('hotels.delete') or (sd_can('hotels.edit') and owner_id = (select sd_boss())));

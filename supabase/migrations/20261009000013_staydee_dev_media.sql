-- นักพัฒนา (dev) แก้รูป / สไลด์ / ข้อมูลที่พักของทุกรีสอร์ทได้ — สิทธิ์ใหม่ 'hotels.media' (ให้เฉพาะ dev)
-- ไม่รวมการสร้าง / ลบรีสอร์ท (ยังเป็นของเจ้าของรีสอร์ทและแอดมินเหมือนเดิม)
insert into public.sd_role_perms (role, perm) values ('dev', 'hotels.media') on conflict do nothing;

-- อ่านที่พักได้ทุกแห่ง (รวมของเจ้าของที่ยังรออนุมัติ)
-- ข้อควรระวัง: นโยบายอ่านใช้กับผู้เยี่ยมชมที่ไม่ล็อกอิน (anon) ด้วย จึงห้ามเรียก sd_can() (anon เรียกไม่ได้ → ทั้งเว็บลูกค้าพัง)
-- ใช้ sd_dev_media() ที่ anon เรียกได้ (คืน false เมื่อไม่ได้ล็อกอิน) เหมือน sd_is_admin() / sd_owner_live()
create function public.sd_dev_media() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from sd_profiles pr join sd_role_perms rp on rp.role = pr.role
    where pr.id = auth.uid() and pr.active and rp.perm = 'hotels.media'
  );
$$;
revoke execute on function public.sd_dev_media() from public;
grant execute on function public.sd_dev_media() to anon, authenticated;

drop policy "sd_hotels read" on public.sd_hotels;
create policy "sd_hotels read" on public.sd_hotels for select
  using (owner_id is null or sd_owner_live(owner_id) or owner_id = (select auth.uid()) or sd_is_admin() or sd_dev_media());

-- แก้ไขที่พักของทุกแห่งได้
drop policy "sd_hotels update" on public.sd_hotels;
create policy "sd_hotels update" on public.sd_hotels for update to authenticated
  using (sd_is_admin() or sd_can('hotels.media') or (sd_can('hotels.edit') and owner_id = (select auth.uid())))
  with check (sd_is_admin() or sd_can('hotels.media') or (sd_can('hotels.edit') and owner_id = (select auth.uid())));

-- อัปโหลด / แก้ / ลบรูปใน bucket sd-media ได้ (รูปของ dev เก็บใต้โฟลเดอร์ของ dev เอง)
drop policy "sd-media insert" on storage.objects;
drop policy "sd-media update" on storage.objects;
drop policy "sd-media delete" on storage.objects;
create policy "sd-media insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'sd-media' and (public.sd_is_admin() or (public.sd_can('hotels.media') and (storage.foldername(name))[2] = auth.uid()::text) or (public.sd_can('hotels.edit') and (storage.foldername(name))[2] = auth.uid()::text)));
create policy "sd-media update" on storage.objects for update to authenticated
  using (bucket_id = 'sd-media' and (public.sd_is_admin() or public.sd_can('hotels.media') or (public.sd_can('hotels.edit') and (storage.foldername(name))[2] = auth.uid()::text)));
create policy "sd-media delete" on storage.objects for delete to authenticated
  using (bucket_id = 'sd-media' and (public.sd_is_admin() or public.sd_can('hotels.media') or (public.sd_can('hotels.edit') and (storage.foldername(name))[2] = auth.uid()::text)));

-- แยกหน้าที่เจ้าของ / แอดมินให้ชัด
-- เจ้าของ = ดูเงิน ภาพรวม ทีมงาน ตั้งค่า (ดูการจอง/รีวิวได้ แต่ไม่ทำงานหน้าร้าน)
-- แอดมิน = งานหน้าร้านทั้งหมด (เช็คอิน ตรวจยอดโอน การจอง ที่พัก ราคา โค้ด รีวิว แจ้งเหตุ) แต่ไม่เห็นรายงานการเงินและจัดการทีมงานไม่ได้
-- ต้องตรงกับ ROLE_PERMS ใน js/store.js
delete from public.sd_role_perms where role = 'owner' and perm in
  ('ops.view', 'frontdesk', 'bookings.edit', 'bookings.delete', 'inventory', 'hotels.edit', 'coupons.edit', 'reviews.manage', 'sos.manage');
insert into public.sd_role_perms (role, perm) values ('owner', 'reviews.view'), ('admin', 'reviews.view')
  on conflict do nothing;

drop policy "sd_reviews read" on public.sd_reviews;
create policy "sd_reviews read" on public.sd_reviews for select to authenticated
  using (user_id = (select auth.uid()) or sd_can('reviews.view') or sd_can('reviews.manage'));

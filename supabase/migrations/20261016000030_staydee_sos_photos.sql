-- รูปประกอบการแจ้งเหตุฉุกเฉิน: ผู้แจ้ง (ไม่ต้องล็อกอิน) อัปโหลดได้สูงสุด 3 รูป/ครั้ง · เฉพาะผู้ที่มีสิทธิ์ sos.manage เปิดดู/ลบได้
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sd-sos', 'sd-sos', false, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 3145728, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

-- ชื่อไฟล์ต้องเป็น <uuid ของรายงาน>/<1-3>.jpg|png|webp
create policy "sd-sos upload" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'sd-sos' and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[1-3]\.(jpg|png|webp)$');
create policy "sd-sos read" on storage.objects for select to authenticated
  using (bucket_id = 'sd-sos' and sd_can('sos.manage'));
create policy "sd-sos delete" on storage.objects for delete to authenticated
  using (bucket_id = 'sd-sos' and sd_can('sos.manage'));

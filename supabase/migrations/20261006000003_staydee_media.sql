-- รูปที่พักที่อัปโหลดจากหลังบ้าน — อ่านได้สาธารณะ เขียนได้เฉพาะผู้มีสิทธิ์ hotels.edit
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sd-media', 'sd-media', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "sd-media insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'sd-media' and public.sd_can('hotels.edit'));
create policy "sd-media update" on storage.objects for update to authenticated
  using (bucket_id = 'sd-media' and public.sd_can('hotels.edit'));
create policy "sd-media delete" on storage.objects for delete to authenticated
  using (bucket_id = 'sd-media' and public.sd_can('hotels.edit'));

-- สมัครเจ้าของรีสอร์ท: เพิ่ม GPS + บัตรประชาชน (เลข + รูป)
-- รูปบัตรเก็บใน bucket ส่วนตัว sd-idcards/<uid>/... เจ้าของอัปโหลดได้เฉพาะโฟลเดอร์ตัวเอง · ดูได้เฉพาะเจ้าของรูปและผู้ที่มีสิทธิ์ partners.manage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sd-idcards', 'sd-idcards', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "sd-idcards upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'sd-idcards' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "sd-idcards read" on storage.objects for select to authenticated
  using (bucket_id = 'sd-idcards' and ((storage.foldername(name))[1] = (select auth.uid())::text or sd_can('partners.manage')));

create or replace function public.sd_apply_owner(p jsonb) returns public.sd_profiles
language plpgsql security definer set search_path = public as $$
declare r sd_profiles; v_lat float8; v_lng float8; v_id text := regexp_replace(coalesce(p ->> 'idNumber', ''), '\D', '', 'g'); v_photo text := coalesce(p ->> 'idPhoto', '');
begin
  if auth.uid() is null then raise exception 'กรุณาเข้าสู่ระบบก่อน'; end if;
  perform sd_ensure_profile(p ->> 'name', p ->> 'phone');
  select * into r from sd_profiles where id = auth.uid();
  if r.role = 'admin' then raise exception 'บัญชีผู้ดูแลแพลตฟอร์มสมัครเป็นเจ้าของรีสอร์ทไม่ได้'; end if;
  if r.role = 'owner' and r.owner_status = 'approved' then raise exception 'บัญชีนี้เป็นเจ้าของรีสอร์ทอยู่แล้ว'; end if;
  if length(trim(coalesce(p ->> 'resortName', ''))) < 2 then raise exception 'กรุณากรอกชื่อรีสอร์ท'; end if;
  if length(regexp_replace(coalesce(p ->> 'phone', ''), '\D', '', 'g')) < 9 then raise exception 'กรุณากรอกเบอร์โทรที่ติดต่อได้'; end if;
  begin v_lat := (p ->> 'lat')::float8; v_lng := (p ->> 'lng')::float8; exception when others then v_lat := null; end;
  if v_lat is null or v_lng is null or v_lat not between 12.88 and 12.96 or v_lng not between 100.74 and 100.82 then raise exception 'กรุณาระบุตำแหน่ง GPS ของรีสอร์ท (ต้องอยู่บนเกาะล้าน)'; end if;
  if coalesce(p ->> 'terms', '') <> 'true' then raise exception 'กรุณายอมรับเงื่อนไขสมาชิกก่อนสมัคร'; end if;
  if v_id !~ '^\d{13}$' then raise exception 'เลขบัตรประชาชนไม่ถูกต้อง'; end if;
  if split_part(v_photo, '/', 1) <> auth.uid()::text or not exists (select 1 from storage.objects where bucket_id = 'sd-idcards' and name = v_photo) then raise exception 'กรุณาแนบรูปบัตรประชาชน'; end if;
  perform set_config('sd.trusted', 'on', true);
  update sd_profiles set role = 'owner', owner_status = 'pending', owner_note = '', applied_at = now(),
    name = coalesce(nullif(left(trim(p ->> 'name'), 100), ''), name), phone = left(trim(p ->> 'phone'), 30),
    biz = jsonb_build_object('resortName', left(trim(p ->> 'resortName'), 100), 'phone', left(trim(p ->> 'phone'), 30),
      'line', left(trim(coalesce(p ->> 'line', '')), 60), 'location', left(trim(coalesce(p ->> 'location', '')), 200),
      'lat', v_lat, 'lng', v_lng, 'idNumber', v_id, 'idPhoto', v_photo, 'termsAt', now(),
      'rooms', left(trim(coalesce(p ->> 'rooms', '')), 20), 'note', left(trim(coalesce(p ->> 'note', '')), 1000))
  where id = auth.uid() returning * into r;
  perform set_config('sd.trusted', 'off', true);
  return r;
end $$;
revoke execute on function public.sd_apply_owner(jsonb) from public, anon;
grant execute on function public.sd_apply_owner(jsonb) to authenticated;

-- สิทธิ์ดูทะเบียนผู้เข้าพัก:
--   เจ้าของรีสอร์ท = เต็ม (ตามชุด 25) · นักพัฒนา (dev) = เปิดดูได้ทุกรีสอร์ท รวมรูปเอกสาร (อ่านอย่างเดียว) · แอดมิน = เห็นเฉพาะ "ชื่อ" ผ่าน sd_checkin_names — ไม่เห็นรูป เลขเอกสาร ลายเซ็น
insert into public.sd_role_perms (role, perm) values ('dev', 'checkin.view') on conflict do nothing;

create policy "sd_checkins dev read" on public.sd_checkins for select to authenticated using (sd_can('checkin.view'));
create policy "sd-checkin dev read" on storage.objects for select to authenticated
  using (bucket_id = 'sd-checkin' and sd_can('checkin.view'));

-- แอดมินอ่านตาราง/ไฟล์ตรงไม่ได้ (ไม่มี policy) — ได้เฉพาะรายชื่อผู้เข้าพักกับวันที่ลงทะเบียนจากฟังก์ชันนี้
create or replace function public.sd_checkin_names(p_booking text) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when sd_is_admin() and sd_can('bookings.view') then
    (select jsonb_build_object('registeredAt', c.data ->> 'registeredAt',
       'names', (select coalesce(jsonb_agg(g ->> 'name'), '[]'::jsonb) from jsonb_array_elements(coalesce(c.data -> 'guests', '[]'::jsonb)) g))
     from sd_checkins c where c.booking_id = p_booking)
  end;
$$;
revoke execute on function public.sd_checkin_names(text) from public, anon;
grant execute on function public.sd_checkin_names(text) to authenticated;

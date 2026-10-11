-- ทะเบียนผู้เข้าพัก (เช็คอินแบบไม่ใช้กระดาษ): ข้อมูลผู้เข้าพัก + รูปบัตรประชาชน/พาสปอร์ต + ลายเซ็น
-- เก็บแยกจาก sd_bookings เพราะลูกค้าอ่านการจองของตัวเองได้ (รหัสจอง + PIN) แต่เอกสารประจำตัวต้องให้เฉพาะ "เจ้าของรีสอร์ทนั้น" เห็น
-- แอดมินแพลตฟอร์ม / นักพัฒนา ไม่มีสิทธิ์อ่านหรือเปิดรูปเอกสาร (เก็บข้อมูลส่วนบุคคลเท่าที่จำเป็น — PDPA)
create table public.sd_checkins (
  id uuid primary key default gen_random_uuid(),
  booking_id text not null unique references public.sd_bookings (id) on delete cascade,
  hotel_id text not null,
  data jsonb not null default '{}'::jsonb,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.sd_checkins enable row level security;

create policy "sd_checkins owner" on public.sd_checkins for all to authenticated
  using (sd_can('frontdesk') and sd_owns_hotel(hotel_id))
  with check (sd_can('frontdesk') and sd_owns_hotel(hotel_id)
    and exists (select 1 from sd_bookings b where b.id = booking_id and b.hotel_id = sd_checkins.hotel_id));

-- รูปเอกสาร: bucket ส่วนตัว โฟลเดอร์แรก = รหัสที่พัก → เจ้าของที่พักนั้นเท่านั้นที่อัปโหลด/เปิด/ลบได้
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sd-checkin', 'sd-checkin', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "sd-checkin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'sd-checkin' and sd_can('frontdesk') and sd_owns_hotel((storage.foldername(name))[1]));
create policy "sd-checkin read" on storage.objects for select to authenticated
  using (bucket_id = 'sd-checkin' and sd_can('frontdesk') and sd_owns_hotel((storage.foldername(name))[1]));
create policy "sd-checkin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'sd-checkin' and sd_can('frontdesk') and sd_owns_hotel((storage.foldername(name))[1]));

-- ผู้ไม่ล็อกอินไม่มีสิทธิ์เข้าถึงตารางนี้เลย (กันซ้ำอีกชั้นนอกเหนือจาก RLS)
revoke all on public.sd_checkins from anon;

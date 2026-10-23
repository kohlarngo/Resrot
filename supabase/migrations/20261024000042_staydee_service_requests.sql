-- คำขอใช้บริการเสริม (เช่น ซิงก์ปฏิทิน iCal แบบ Plus): เจ้าของกรอกเบอร์ / LINE ส่งถึงทีมพัฒนา → ติดต่อกลับ รับเงิน แล้ว dev เปิดให้ทีละรีสอร์ท
-- เจ้าของเห็นและส่งได้เฉพาะรีสอร์ทของตัวเอง · dev (hotels.media) และแอดมินเห็น/ปิดคำขอได้ทุกรายการ · เบอร์/LINE ไม่ปนในข้อมูลรีสอร์ทที่เป็นสาธารณะ
create table public.sd_service_requests (
  id uuid primary key default gen_random_uuid(),
  hotel_id text not null references public.sd_hotels (id) on delete cascade,
  service text not null check (service in ('ical')),
  phone text not null default '' check (char_length(phone) <= 30),
  line text not null default '' check (char_length(line) <= 60),
  note text not null default '' check (char_length(note) <= 300),
  status text not null default 'new' check (status in ('new', 'done', 'rejected')),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  check (phone <> '' or line <> '')
);
create unique index sd_service_requests_open on public.sd_service_requests (hotel_id, service) where status = 'new';
create index sd_service_requests_hotel on public.sd_service_requests (hotel_id);
alter table public.sd_service_requests enable row level security;

create policy "sd_service_requests read" on public.sd_service_requests for select to authenticated
  using (sd_is_admin() or sd_can('hotels.media') or (sd_can('hotels.edit') and sd_owns_hotel(hotel_id)));
create policy "sd_service_requests insert" on public.sd_service_requests for insert to authenticated
  with check (status = 'new' and (sd_is_admin() or (sd_can('hotels.edit') and sd_owns_hotel(hotel_id))));
create policy "sd_service_requests update" on public.sd_service_requests for update to authenticated
  using (sd_is_admin() or sd_can('hotels.media')) with check (sd_is_admin() or sd_can('hotels.media'));

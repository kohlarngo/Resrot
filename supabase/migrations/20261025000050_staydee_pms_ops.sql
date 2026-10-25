-- PMS เบื้องต้น: สถานะห้อง / งานแม่บ้าน (สิทธิ์ housekeeping + ตาราง sd_room_status)

-- 1) สิทธิ์ใหม่ 'housekeeping' (แม่บ้าน): เจ้าของมีให้ · มอบให้พนักงานได้
insert into public.sd_role_perms (role, perm) values ('owner', 'housekeeping') on conflict do nothing;
create or replace function public.sd_staff_perm_list() returns text[]
language sql immutable as $$
  select array['ops.view', 'frontdesk', 'bookings.view', 'bookings.edit', 'inventory', 'hotels.edit', 'coupons.edit', 'reviews.view', 'customers.view', 'housekeeping'];
$$;

-- 2) สถานะห้องรายห้อง (ห้องที่ n ของประเภทห้อง) — clean สะอาด · dirty สกปรก · inspect รอตรวจ · ooo ปิดซ่อม
create table if not exists public.sd_room_status (
  hotel_id text not null,
  room_id text not null,
  unit int not null check (unit between 1 and 500),
  status text not null default 'clean' check (status in ('clean', 'dirty', 'inspect', 'ooo')),
  note text not null default '' check (length(note) <= 200),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  primary key (hotel_id, room_id, unit)
);
alter table public.sd_room_status enable row level security;
create policy "sd_room_status rw" on public.sd_room_status for all to authenticated
  using (sd_owns_hotel(hotel_id) and (sd_can('housekeeping') or sd_can('frontdesk')))
  with check (sd_owns_hotel(hotel_id) and (sd_can('housekeeping') or sd_can('frontdesk')));
create or replace function public.sd_room_status_stamp() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at := now(); new.updated_by := auth.uid(); return new; end $$;
create trigger sd_room_status_stamp before insert or update on public.sd_room_status
  for each row execute function public.sd_room_status_stamp();

-- PMS (ต่อ): คิวรอห้อง (Waitlist)

-- 4) คิวรอห้อง (Waitlist): ลูกค้าเข้าคิวเมื่อห้องเต็ม · เจ้าของเห็น/ติดต่อกลับ
create table if not exists public.sd_waitlist (
  id uuid primary key default gen_random_uuid(),
  hotel_id text not null,
  room_id text,
  check_in date not null,
  check_out date not null,
  qty int not null default 1 check (qty between 1 and 10),
  name text not null check (length(name) between 1 and 80),
  phone text not null check (length(phone) between 9 and 30),
  email text not null default '' check (length(email) <= 120),
  note text not null default '' check (length(note) <= 300),
  status text not null default 'waiting' check (status in ('waiting', 'contacted', 'done')),
  created_at timestamptz not null default now()
);
create index if not exists sd_waitlist_hotel_idx on public.sd_waitlist (hotel_id, status, check_in);
alter table public.sd_waitlist enable row level security;
create policy "sd_waitlist read" on public.sd_waitlist for select to authenticated
  using (sd_owns_hotel(hotel_id) and sd_can('bookings.view'));
create policy "sd_waitlist update" on public.sd_waitlist for update to authenticated
  using (sd_owns_hotel(hotel_id) and sd_can('bookings.edit')) with check (sd_owns_hotel(hotel_id) and sd_can('bookings.edit'));
create policy "sd_waitlist delete" on public.sd_waitlist for delete to authenticated
  using (sd_owns_hotel(hotel_id) and sd_can('bookings.edit'));

create or replace function public.sd_join_waitlist(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare ci date := (p ->> 'checkIn')::date; co date := (p ->> 'checkOut')::date; h text := p ->> 'hotelId';
  nm text := left(trim(coalesce(p ->> 'name', '')), 80); ph text := left(trim(coalesce(p ->> 'phone', '')), 30);
begin
  if not exists (select 1 from sd_hotels where id = h) then raise exception 'ไม่พบที่พัก'; end if;
  if ci is null or co is null or co <= ci or ci < (now() at time zone 'Asia/Bangkok')::date or co - ci > 60 then raise exception 'วันที่ไม่ถูกต้อง'; end if;
  if length(nm) < 1 then raise exception 'กรุณากรอกชื่อ'; end if;
  if length(regexp_replace(ph, '\D', '', 'g')) < 9 then raise exception 'เบอร์โทรไม่ถูกต้อง'; end if;
  if exists (select 1 from sd_waitlist where hotel_id = h and phone = ph and check_in = ci and check_out = co and status = 'waiting') then
    return jsonb_build_object('ok', true, 'dup', true);
  end if;
  if (select count(*) from sd_waitlist where phone = ph and created_at > now() - interval '1 day') >= 5 then raise exception 'ส่งคำขอบ่อยเกินไป กรุณาลองใหม่ภายหลัง'; end if;
  insert into sd_waitlist (hotel_id, room_id, check_in, check_out, qty, name, phone, email, note)
    values (h, nullif(p ->> 'roomId', ''), ci, co, greatest(1, least(10, coalesce((p ->> 'qty')::int, 1))), nm, ph, left(trim(coalesce(p ->> 'email', '')), 120), left(trim(coalesce(p ->> 'note', '')), 300));
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.sd_join_waitlist(jsonb) to anon, authenticated;

-- บริการเสริมหลังจอง (การจองทั่วไปที่ไม่ใช่ VIP) — เป็นของนักพัฒนา/แพลตฟอร์ม ไม่ใช่ของเจ้าของรีสอร์ท
-- นักพัฒนากำหนดรายการ (เช่น เช่ามอเตอร์ไซค์ เช่าเรือ ของผู้ให้บริการที่มาฝากปล่อยและจ่ายค่าบริการให้แพลตฟอร์ม) ที่ sd_kv key 'settings' ฟิลด์ extraServices
--   = [{id, name, desc, price, provider, providerPhone}]
-- ลูกค้าเลือกจากใบยืนยันการจองด้วยรหัสจอง + PIN → เก็บคำขอใน sd_addon_requests (เฉพาะนักพัฒนาเห็น) + สำเนารายการบนการจองเพื่อให้ลูกค้าเห็นของตัวเอง
-- ชื่อ/ราคาอ่านจากรายการของนักพัฒนาเท่านั้น (ไม่รับค่าจากเบราว์เซอร์) · ยังไม่รวมในยอดชำระของห้อง
create table if not exists public.sd_addon_requests (
  id bigint generated always as identity primary key,
  booking_id text not null references public.sd_bookings (id) on delete cascade,
  hotel_id text,
  guest jsonb not null default '{}',
  items jsonb not null default '[]',
  status text not null default 'new' check (status in ('new', 'done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booking_id)
);
alter table public.sd_addon_requests enable row level security;
create policy "sd_addon_requests read" on public.sd_addon_requests for select to authenticated using (sd_can('settings.business'));
create policy "sd_addon_requests update" on public.sd_addon_requests for update to authenticated using (sd_can('settings.business')) with check (sd_can('settings.business'));
create policy "sd_addon_requests delete" on public.sd_addon_requests for delete to authenticated using (sd_can('settings.business'));

create or replace function public.sd_request_addons(p_id text, p_pin text, p_items jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare err text := sd_pin_gate(p_id, p_pin); b sd_bookings; v jsonb; picked jsonb;
begin
  if err is not null then return jsonb_build_object('error', err); end if;
  b := sd_my_booking(p_id, p_pin);
  if b.status not in ('pending', 'confirmed') or b.check_out < current_date then
    raise exception 'การจองนี้ขอบริการเสริมไม่ได้';
  end if;
  if coalesce((select (h.data #>> '{vip,on}')::boolean from sd_hotels h where h.id = b.hotel_id), false) then
    raise exception 'รีสอร์ทนี้ไม่มีบริการเสริม';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', s->>'id', 'name', s->>'name', 'price', coalesce((s->>'price')::numeric, 0), 'qty', q.qty)), '[]'::jsonb)
    into picked
    from sd_kv k
    cross join lateral jsonb_array_elements(coalesce(k.value->'extraServices', '[]'::jsonb)) s
    join lateral (select least(10, greatest(1, coalesce((i->>'qty')::int, 1))) as qty
                    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) i where i->>'id' = s->>'id' limit 1) q on true
   where k.key = 'settings';
  update public.sd_bookings set data = data || jsonb_build_object('addons', picked, 'addonsAt', now())
    where id = b.id returning data into v;
  insert into public.sd_addon_requests (booking_id, hotel_id, guest, items)
    values (b.id, b.hotel_id, jsonb_build_object('name', trim(coalesce(b.data #>> '{guest,firstName}', '') || ' ' || coalesce(b.data #>> '{guest,lastName}', '')),
      'phone', b.data #>> '{guest,phone}', 'email', b.data #>> '{guest,email}', 'hotel', b.data->>'hotelName', 'checkIn', b.check_in, 'checkOut', b.check_out), picked)
    on conflict (booking_id) do update set items = excluded.items, status = 'new', updated_at = now();
  return v;
end $$;
revoke all on function public.sd_request_addons(text, text, jsonb) from public;
grant execute on function public.sd_request_addons(text, text, jsonb) to anon, authenticated;

-- ================= โมเดลแพลตฟอร์ม (marketplace) =================
-- ลูกค้า: จอง + ส่งสลิปโอนตรงถึงเจ้าของรีสอร์ท
-- เจ้าของรีสอร์ท (owner): สมัครเอง → รอแพลตฟอร์มอนุมัติ → จัดการเฉพาะรีสอร์ทของตัวเอง (ห้อง ราคา รูป ห้องว่าง) ตรวจสลิป อนุมัติ/ปฏิเสธการจอง
-- ผู้ดูแลแพลตฟอร์ม (admin): อนุมัติรีสอร์ทใหม่ ดูภาพรวมทั้งระบบ ช่วยเหลือ (รวมเครื่องมือนักพัฒนาเดิม)

-- ---------- บทบาท ----------
update public.sd_profiles set role = 'admin' where role = 'dev';
alter table public.sd_profiles drop constraint sd_profiles_role_check;
alter table public.sd_profiles add constraint sd_profiles_role_check check (role in ('owner', 'admin', 'user'));
alter table public.sd_profiles
  add column owner_status text check (owner_status in ('pending', 'approved', 'rejected')),
  add column owner_note text not null default '',
  add column applied_at timestamptz,
  add column biz jsonb not null default '{}',     -- ข้อมูลรีสอร์ทที่กรอกตอนสมัคร / ชื่อที่แสดง / ช่องทางติดต่อ
  add column payout jsonb not null default '{}';  -- พร้อมเพย์ / บัญชีธนาคารของเจ้าของ (เงินเข้าเจ้าของโดยตรง)

delete from public.sd_role_perms where true;
insert into public.sd_role_perms (role, perm)
select 'owner', p from unnest(array['exec.view','reports.view','ops.view','frontdesk','bookings.view','bookings.edit','inventory','hotels.edit','coupons.edit','reviews.view','customers.view','payout.edit']) p
union all
select 'admin', p from unnest(array['exec.view','reports.view','partners.manage','staff.manage','settings.business','bookings.view','bookings.edit','inventory','hotels.edit','coupons.edit','reviews.view','reviews.manage','customers.view','sos.manage','audit.view','dev.console','flags.edit','data.backup','data.reset']) p;

-- เจ้าของรีสอร์ทใช้สิทธิ์ได้เมื่อได้รับอนุมัติแล้วเท่านั้น
create or replace function public.sd_can(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from sd_profiles pr join sd_role_perms rp on rp.role = pr.role
    where pr.id = auth.uid() and pr.active and (pr.role <> 'owner' or pr.owner_status = 'approved') and rp.perm = p
  );
$$;
create or replace function public.sd_is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from sd_profiles where id = auth.uid() and active and (role = 'admin' or (role = 'owner' and owner_status = 'approved')));
$$;
create function public.sd_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from sd_profiles where id = auth.uid() and active and role = 'admin');
$$;
create function public.sd_owner_live(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from sd_profiles where id = p and role = 'owner' and active and owner_status = 'approved');
$$;

-- โปรไฟล์: เจ้าของรีสอร์ทแก้ข้อมูลรีสอร์ท/บัญชีรับเงินของตัวเองได้ แต่บทบาท/สถานะอนุมัติแก้ได้เฉพาะผู้ดูแลแพลตฟอร์ม
create or replace function public.sd_profiles_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and not sd_privileged() and coalesce(current_setting('sd.trusted', true), '') <> 'on' then
    new.id := old.id; new.email := old.email; new.created_at := old.created_at; new.created_by := old.created_by; new.applied_at := old.applied_at;
    if (new.role, new.active, new.owner_status, new.owner_note) is distinct from (old.role, old.active, old.owner_status, old.owner_note) and not sd_can('staff.manage') then
      raise exception 'ไม่มีสิทธิ์เปลี่ยนบทบาทหรือสถานะบัญชี';
    end if;
  end if;
  if old.role = 'admin' and old.active and (tg_op = 'DELETE' or new.role <> 'admin' or not new.active) then
    if not exists (select 1 from sd_profiles where role = 'admin' and active and id <> old.id) then
      raise exception 'ต้องมีผู้ดูแลแพลตฟอร์มที่ใช้งานได้อย่างน้อย 1 คน';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

drop policy "sd_profiles read" on public.sd_profiles;
create policy "sd_profiles read" on public.sd_profiles for select to authenticated
  using (id = (select auth.uid()) or sd_is_admin());

-- สมัครเป็นเจ้าของรีสอร์ท (บัญชีลูกค้าที่ล็อกอินอยู่ → รออนุมัติ)
create function public.sd_apply_owner(p jsonb) returns public.sd_profiles
language plpgsql security definer set search_path = public as $$
declare r sd_profiles;
begin
  if auth.uid() is null then raise exception 'กรุณาเข้าสู่ระบบก่อน'; end if;
  perform sd_ensure_profile(p ->> 'name', p ->> 'phone');
  select * into r from sd_profiles where id = auth.uid();
  if r.role = 'admin' then raise exception 'บัญชีผู้ดูแลแพลตฟอร์มสมัครเป็นเจ้าของรีสอร์ทไม่ได้'; end if;
  if r.role = 'owner' and r.owner_status = 'approved' then raise exception 'บัญชีนี้เป็นเจ้าของรีสอร์ทอยู่แล้ว'; end if;
  if length(trim(coalesce(p ->> 'resortName', ''))) < 2 then raise exception 'กรุณากรอกชื่อรีสอร์ท'; end if;
  if length(regexp_replace(coalesce(p ->> 'phone', ''), '\D', '', 'g')) < 9 then raise exception 'กรุณากรอกเบอร์โทรที่ติดต่อได้'; end if;
  perform set_config('sd.trusted', 'on', true);
  update sd_profiles set role = 'owner', owner_status = 'pending', owner_note = '', applied_at = now(),
    name = coalesce(nullif(left(trim(p ->> 'name'), 100), ''), name), phone = left(trim(p ->> 'phone'), 30),
    biz = jsonb_build_object('resortName', left(trim(p ->> 'resortName'), 100), 'phone', left(trim(p ->> 'phone'), 30),
      'line', left(trim(coalesce(p ->> 'line', '')), 60), 'location', left(trim(coalesce(p ->> 'location', '')), 200),
      'rooms', left(trim(coalesce(p ->> 'rooms', '')), 20), 'note', left(trim(coalesce(p ->> 'note', '')), 1000))
  where id = auth.uid() returning * into r;
  perform set_config('sd.trusted', 'off', true);
  return r;
end $$;
revoke execute on function public.sd_apply_owner(jsonb) from public, anon;
grant execute on function public.sd_apply_owner(jsonb) to authenticated;

create function public.sd_set_owner_status(p_id uuid, p_status text, p_note text default '') returns void
language plpgsql security definer set search_path = public as $$
begin
  if not sd_can('partners.manage') then raise exception 'ไม่มีสิทธิ์อนุมัติเจ้าของรีสอร์ท'; end if;
  if p_status not in ('pending', 'approved', 'rejected') then raise exception 'สถานะไม่ถูกต้อง'; end if;
  update sd_profiles set owner_status = p_status, owner_note = left(coalesce(p_note, ''), 500) where id = p_id and role = 'owner';
  if not found then raise exception 'ไม่พบเจ้าของรีสอร์ท'; end if;
end $$;
revoke execute on function public.sd_set_owner_status(uuid, text, text) from public, anon;
grant execute on function public.sd_set_owner_status(uuid, text, text) to authenticated;

-- ข้อมูลสาธารณะของเจ้าของรีสอร์ท (ชื่อ ช่องทางติดต่อ และวิธีรับเงินที่เปิด — ไม่เปิดเผยเลขบัญชีจนกว่าจะจอง)
create function public.sd_public_owners() returns setof jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', id, 'name', coalesce(nullif(biz ->> 'resortName', ''), name), 'phone', coalesce(nullif(biz ->> 'phone', ''), phone),
    'line', coalesce(biz ->> 'line', ''), 'promptpay', coalesce(payout ->> 'promptpayId', '') ~ '^(0\d{9}|\d{13})$',
    'bank', length(trim(coalesce(payout ->> 'bankInfo', ''))) > 0)
  from sd_profiles where role = 'owner' and active and owner_status = 'approved';
$$;

-- ---------- ที่พัก: มีเจ้าของ ----------
alter table public.sd_hotels add column owner_id uuid references public.sd_profiles (id) on delete set null;
create index sd_hotels_owner_idx on public.sd_hotels (owner_id);

create function public.sd_owns_hotel(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select sd_is_staff() and exists (select 1 from sd_hotels where id = p and owner_id = auth.uid());
$$;

create function public.sd_hotels_sync() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and not (sd_privileged() or sd_is_admin()) then new.owner_id := old.owner_id; end if;
  new.data := new.data || jsonb_build_object('ownerId', new.owner_id);
  new.updated_at := now();
  return new;
end $$;
create trigger sd_hotels_sync before insert or update on public.sd_hotels for each row execute function public.sd_hotels_sync();
revoke execute on function public.sd_hotels_sync() from public, anon, authenticated;

drop policy "sd_hotels read" on public.sd_hotels;
drop policy "sd_hotels insert" on public.sd_hotels;
drop policy "sd_hotels update" on public.sd_hotels;
drop policy "sd_hotels delete" on public.sd_hotels;
-- ลูกค้าเห็นเฉพาะที่พักของเจ้าของที่อนุมัติแล้ว
create policy "sd_hotels read" on public.sd_hotels for select
  using (owner_id is null or sd_owner_live(owner_id) or owner_id = (select auth.uid()) or sd_is_admin());
create policy "sd_hotels insert" on public.sd_hotels for insert to authenticated
  with check (sd_is_admin() or (sd_can('hotels.edit') and owner_id = (select auth.uid())));
create policy "sd_hotels update" on public.sd_hotels for update to authenticated
  using (sd_is_admin() or (sd_can('hotels.edit') and owner_id = (select auth.uid())))
  with check (sd_is_admin() or (sd_can('hotels.edit') and owner_id = (select auth.uid())));
create policy "sd_hotels delete" on public.sd_hotels for delete to authenticated
  using (sd_is_admin() or (sd_can('hotels.edit') and owner_id = (select auth.uid())));

-- ---------- การจอง: เจ้าของเห็น/จัดการเฉพาะรีสอร์ทตัวเอง ----------
drop policy "sd_bookings read" on public.sd_bookings;
drop policy "sd_bookings update" on public.sd_bookings;
drop policy "sd_bookings delete" on public.sd_bookings;
create policy "sd_bookings read" on public.sd_bookings for select to authenticated
  using (user_id = (select auth.uid()) or sd_is_admin() or (sd_can('bookings.view') and sd_owns_hotel(hotel_id)));
create policy "sd_bookings update" on public.sd_bookings for update to authenticated
  using (sd_is_admin() or ((sd_can('bookings.edit') or sd_can('frontdesk')) and sd_owns_hotel(hotel_id)))
  with check (sd_is_admin() or ((sd_can('bookings.edit') or sd_can('frontdesk')) and sd_owns_hotel(hotel_id)));
create policy "sd_bookings delete" on public.sd_bookings for delete to authenticated
  using (sd_is_admin() and sd_can('bookings.delete'));

-- ---------- โค้ดส่วนลด: ของรีสอร์ทแต่ละเจ้า (owner_id ว่าง = ใช้ได้ทุกรีสอร์ท สร้างโดยแพลตฟอร์ม) ----------
alter table public.sd_coupons add column owner_id uuid references public.sd_profiles (id) on delete cascade;
drop policy "sd_coupons read" on public.sd_coupons;
drop policy "sd_coupons insert" on public.sd_coupons;
drop policy "sd_coupons update" on public.sd_coupons;
drop policy "sd_coupons delete" on public.sd_coupons;
create policy "sd_coupons read" on public.sd_coupons for select to authenticated
  using (sd_is_admin() or (sd_can('coupons.edit') and owner_id = (select auth.uid())));
create policy "sd_coupons insert" on public.sd_coupons for insert to authenticated
  with check (sd_is_admin() or (sd_can('coupons.edit') and owner_id = (select auth.uid())));
create policy "sd_coupons update" on public.sd_coupons for update to authenticated
  using (sd_is_admin() or (sd_can('coupons.edit') and owner_id = (select auth.uid())))
  with check (sd_is_admin() or (sd_can('coupons.edit') and owner_id = (select auth.uid())));
create policy "sd_coupons delete" on public.sd_coupons for delete to authenticated
  using (sd_is_admin() or (sd_can('coupons.edit') and owner_id = (select auth.uid())));

drop function public.sd_check_coupon(text, numeric);
create function public.sd_check_coupon(p_code text, p_amount numeric, p_hotel text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c sd_coupons; off float8;
begin
  select * into c from sd_coupons where code = upper(trim(p_code)) and active
    and (owner_id is null or owner_id = (select owner_id from sd_hotels where id = p_hotel));
  if not found then return jsonb_build_object('error', 'ไม่พบโค้ดส่วนลดนี้ หรือใช้กับที่พักนี้ไม่ได้'); end if;
  if p_amount < c.min_amount then
    return jsonb_build_object('error', 'ยอดจองขั้นต่ำ ฿' || to_char(c.min_amount, 'FM999,999,999') || ' สำหรับโค้ดนี้');
  end if;
  off := case when c.type = 'percent' then floor(p_amount::float8 * c.value::float8 / 100 + 0.5) else c.value::float8 end;
  return jsonb_build_object(
    'coupon', jsonb_build_object('code', c.code, 'type', c.type, 'value', c.value, 'min', c.min_amount, 'desc', c.description, 'active', c.active),
    'off', least(off, p_amount::float8));
end $$;

-- ---------- รีวิว ----------
drop policy "sd_reviews read" on public.sd_reviews;
create policy "sd_reviews read" on public.sd_reviews for select to authenticated
  using (user_id = (select auth.uid()) or sd_is_admin() or (sd_can('reviews.view') and sd_owns_hotel(hotel_id)));

-- ---------- ราคา: ที่พักต้องเปิดขายและเจ้าของได้รับอนุมัติ ----------
create or replace function public.sd_price(p_hotel text, p_room text, p_offer text, p_in date, p_out date, p_qty int) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare h jsonb; r jsonb; d date; o float8; f float8; so float8 := 0; sf float8 := 0; n int; extra float8 := 0; bf boolean; fc boolean;
begin
  select data into h from sd_hotels where id = p_hotel and coalesce((data ->> 'active')::boolean, true) and (owner_id is null or sd_owner_live(owner_id));
  if h is null then raise exception 'ไม่พบที่พักนี้ หรือปิดการขายแล้ว'; end if;
  select x into r from jsonb_array_elements(h -> 'rooms') x where x ->> 'id' = p_room;
  if r is null then raise exception 'ไม่พบห้องพักนี้'; end if;
  n := p_out - p_in;
  if n < 1 or n > 30 then raise exception 'จำนวนคืนไม่ถูกต้อง (1-30 คืน)'; end if;
  if p_qty < 1 or p_qty > 10 then raise exception 'จำนวนห้องไม่ถูกต้อง'; end if;
  for d in select generate_series(p_in, p_out - 1, interval '1 day')::date loop
    o := floor((r ->> 'price')::float8 * (case when extract(dow from d) in (5, 6) then 1.15::float8 else 1::float8 end) + 0.5);
    f := floor(o * (1::float8 - coalesce((r ->> 'discount')::float8, 0) / 100::float8) + 0.5);
    so := so + o; sf := sf + f;
  end loop;
  so := so * p_qty; sf := sf * p_qty;
  bf := coalesce((r ->> 'breakfast')::boolean, false);
  fc := coalesce((r ->> 'freeCancel')::boolean, false);
  if p_offer = 'bf' and not bf then
    extra := 220 * least(2, (r ->> 'maxGuests')::int); fc := true;
  elsif not ((p_offer = 'bf' and bf) or (p_offer = 'ro' and not bf)) then
    raise exception 'แพ็กเกจห้องพักไม่ถูกต้อง';
  end if;
  so := so + extra * n * p_qty; sf := sf + extra * n * p_qty;
  return jsonb_build_object('nights', n, 'orig', so, 'sub', sf, 'hotel', h, 'room', r,
    'offer', jsonb_build_object('id', p_offer, 'breakfast', p_offer = 'bf', 'freeCancel', fc, 'payAtHotel', coalesce((r ->> 'payAtHotel')::boolean, false), 'extra', extra));
end $$;

-- ---------- จอง: เงินเข้าเจ้าของรีสอร์ทโดยตรง · ทุกการจองรอเจ้าของรีสอร์ทอนุมัติ ----------
create or replace function public.sd_create_booking(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'Asia/Bangkok')::date;
  ci date := (p ->> 'checkIn')::date; co date := (p ->> 'checkOut')::date;
  qty int := coalesce((p ->> 'qty')::int, 1);
  q jsonb; g jsonb := coalesce(p -> 'guest', '{}'); pay jsonb; method text := p #>> '{payment,method}';
  oid uuid; po jsonb;
  member float8 := 0; off float8 := 0; cp jsonb; code text := upper(trim(coalesce(p ->> 'couponCode', '')));
  sub float8; tax float8; d date; booked int; bid text; bpin text; b jsonb;
begin
  if coalesce((select (value ->> 'maintenance')::boolean from sd_kv where key = 'flags'), false) then
    raise exception 'ระบบปิดปรับปรุงชั่วคราว ยังไม่สามารถจองได้';
  end if;
  if ci is null or co is null or ci < today then raise exception 'วันที่เข้าพักไม่ถูกต้อง'; end if;
  q := sd_price(p ->> 'hotelId', p ->> 'roomId', p ->> 'offerId', ci, co, qty);

  if length(trim(coalesce(g ->> 'firstName', ''))) < 1 or length(trim(coalesce(g ->> 'lastName', ''))) < 1 then raise exception 'กรุณากรอกชื่อและนามสกุล'; end if;
  if coalesce(g ->> 'email', '') !~ '^\S+@\S+\.\S+$' then raise exception 'รูปแบบอีเมลไม่ถูกต้อง'; end if;
  if length(regexp_replace(coalesce(g ->> 'phone', ''), '\D', '', 'g')) < 9 then raise exception 'เบอร์โทรไม่ถูกต้อง'; end if;
  g := jsonb_build_object(
    'firstName', left(trim(g ->> 'firstName'), 60), 'lastName', left(trim(g ->> 'lastName'), 60),
    'email', left(trim(g ->> 'email'), 120), 'phone', left(trim(g ->> 'phone'), 30),
    'country', left(coalesce(g ->> 'country', ''), 40), 'arrival', left(coalesce(g ->> 'arrival', ''), 20),
    'note', left(coalesce(g ->> 'note', ''), 500),
    'requests', coalesce((select jsonb_agg(left(x, 60)) from (select jsonb_array_elements_text(case when jsonb_typeof(g -> 'requests') = 'array' then g -> 'requests' else '[]' end) x limit 10) s), '[]'));

  -- บัญชีรับเงิน: ของเจ้าของรีสอร์ท (หรือของแพลตฟอร์ม ถ้าที่พักไม่มีเจ้าของ)
  select owner_id into oid from sd_hotels where id = p ->> 'hotelId';
  po := case when oid is null then coalesce((select value from sd_kv where key = 'settings'), '{}') else (select payout from sd_profiles where id = oid) end;
  if method = 'promptpay' then
    if coalesce(po ->> 'promptpayId', '') !~ '^(0\d{9}|\d{13})$' then raise exception 'ที่พักนี้ยังไม่เปิดรับพร้อมเพย์ — กรุณาเลือกวิธีอื่น'; end if;
    pay := jsonb_build_object('method', method, 'paid', false, 'payTo', po ->> 'promptpayId', 'payToName', coalesce(po ->> 'promptpayName', ''));
  elsif method = 'bank' then
    if length(trim(coalesce(po ->> 'bankInfo', ''))) = 0 then raise exception 'ที่พักนี้ยังไม่เปิดรับโอนเงิน — กรุณาเลือกวิธีอื่น'; end if;
    pay := jsonb_build_object('method', method, 'paid', false, 'bankInfo', po ->> 'bankInfo');
  elsif method = 'hotel' then
    if not (q #>> '{offer,payAtHotel}')::boolean then raise exception 'ห้องนี้ไม่รองรับการชำระที่ที่พัก'; end if;
    pay := jsonb_build_object('method', method, 'paid', false);
  else
    raise exception 'วิธีชำระเงินนี้ยังไม่เปิดให้บริการ';
  end if;

  perform pg_advisory_xact_lock(hashtext('sd_room:' || (p ->> 'roomId')));
  for d in select generate_series(ci, co - 1, interval '1 day')::date loop
    select coalesce(sum(x.qty), 0) into booked from sd_bookings x
      where x.room_id = p ->> 'roomId' and x.status <> 'cancelled' and d >= x.check_in and d < x.check_out;
    if booked + qty > (q #>> '{room,total}')::int then raise exception 'ขออภัย ห้องเพิ่งถูกจองไป กรุณาเลือกห้องอื่น'; end if;
  end loop;

  sub := (q ->> 'sub')::float8;
  if uid is not null and exists (select 1 from sd_profiles where id = uid and active) then member := floor(sub * 0.05 + 0.5); end if;
  if code <> '' then
    cp := sd_check_coupon(code, (sub - member)::numeric, p ->> 'hotelId');
    if cp ? 'error' then raise exception '%', cp ->> 'error'; end if;
    off := (cp ->> 'off')::float8;
  end if;
  tax := floor((sub - member - off) * 0.177::float8 + 0.5);

  loop
    bid := 'SD' || right((extract(epoch from clock_timestamp()) * 1000)::bigint::text, 6) || (100 + floor(random() * 900))::int::text;
    exit when not exists (select 1 from sd_bookings where id = bid);
  end loop;
  bpin := (1000 + floor(random() * 9000))::int::text;

  b := jsonb_build_object(
    'hotelId', p ->> 'hotelId', 'hotelName', q #>> '{hotel,name}', 'ownerId', oid, 'roomId', p ->> 'roomId', 'roomName', q #>> '{room,name}',
    'offer', q -> 'offer', 'qty', qty, 'checkIn', ci, 'checkOut', co, 'nights', (q ->> 'nights')::int,
    'adults', greatest(1, least(20, coalesce((p ->> 'adults')::int, 1))), 'children', greatest(0, least(20, coalesce((p ->> 'children')::int, 0))),
    'rooms', greatest(1, least(10, coalesce((p ->> 'rooms')::int, qty))),
    'guest', g, 'payment', pay,
    'price', jsonb_build_object('orig', (q ->> 'orig')::float8, 'room', sub, 'member', member, 'coupon', off,
      'couponCode', case when off > 0 then code end, 'tax', tax, 'total', sub - member - off + tax),
    'status', 'pending', 'createdAt', now());
  insert into sd_bookings (id, pin, user_id, check_in, check_out, data) values (bid, bpin, uid, ci, co, b)
    returning data into b;
  return b;
end $$;

-- ---------- สลิปโอนเงิน (bucket ส่วนตัว — เจ้าของรีสอร์ทของการจองนั้นและผู้ดูแลแพลตฟอร์มเท่านั้นที่ดูได้) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sd-slips', 'sd-slips', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- อัปโหลดได้เฉพาะในโฟลเดอร์ของการจองที่ยังรอชำระด้วยการโอน (ไม่เกิน 5 ไฟล์ต่อการจอง)
create function public.sd_slip_upload_ok(p_name text) returns boolean
language sql stable security definer set search_path = public, storage as $$
  select exists (select 1 from public.sd_bookings where id = split_part(p_name, '/', 1) and status = 'pending'
      and not coalesce((data #>> '{payment,paid}')::boolean, false) and data #>> '{payment,method}' in ('promptpay', 'bank'))
    and (select count(*) from storage.objects where bucket_id = 'sd-slips' and name like split_part(p_name, '/', 1) || '/%') < 5;
$$;
create function public.sd_slip_visible(p_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select sd_is_admin() or exists (select 1 from sd_bookings b join sd_hotels h on h.id = b.hotel_id
    where b.id = split_part(p_name, '/', 1) and h.owner_id = auth.uid() and sd_is_staff());
$$;
create policy "sd-slips upload" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'sd-slips' and public.sd_slip_upload_ok(name));
create policy "sd-slips read" on storage.objects for select to authenticated
  using (bucket_id = 'sd-slips' and public.sd_slip_visible(name));

create function public.sd_submit_slip(p_id text, p_pin text, p_path text) returns jsonb
language plpgsql security definer set search_path = public, storage as $$
declare b sd_bookings; v jsonb;
begin
  b := sd_my_booking(p_id, p_pin);
  if b.status <> 'pending' or coalesce((b.data #>> '{payment,paid}')::boolean, false) or b.data #>> '{payment,method}' not in ('promptpay', 'bank') then
    raise exception 'การจองนี้ไม่อยู่ในสถานะรอชำระเงิน';
  end if;
  if split_part(p_path, '/', 1) <> b.id or not exists (select 1 from storage.objects where bucket_id = 'sd-slips' and name = p_path) then
    raise exception 'ไม่พบไฟล์สลิป กรุณาอัปโหลดใหม่';
  end if;
  update public.sd_bookings set data = jsonb_set(jsonb_set(data, '{payment,slip}', to_jsonb(p_path)), '{payment,claimedAt}', to_jsonb(now()))
    where id = b.id returning data into v;
  return v;
end $$;

drop function public.sd_claim_payment(text, text);

-- รูปที่พัก: เจ้าของอัปโหลดในโฟลเดอร์ของตัวเอง (hotels/<user id>/...) · ผู้ดูแลแพลตฟอร์มจัดการได้ทั้งหมด
drop policy "sd-media insert" on storage.objects;
drop policy "sd-media update" on storage.objects;
drop policy "sd-media delete" on storage.objects;
create policy "sd-media insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'sd-media' and (public.sd_is_admin() or (public.sd_can('hotels.edit') and (storage.foldername(name))[2] = auth.uid()::text)));
create policy "sd-media update" on storage.objects for update to authenticated
  using (bucket_id = 'sd-media' and (public.sd_is_admin() or (public.sd_can('hotels.edit') and (storage.foldername(name))[2] = auth.uid()::text)));
create policy "sd-media delete" on storage.objects for delete to authenticated
  using (bucket_id = 'sd-media' and (public.sd_is_admin() or (public.sd_can('hotels.edit') and (storage.foldername(name))[2] = auth.uid()::text)));

-- ---------- สำรอง / กู้คืน: เก็บเจ้าของที่พักและโค้ดส่วนลดด้วย ----------
create or replace function public.sd_admin_import(p jsonb, p_wipe boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k text; n_h int := 0; n_c int := 0; n_b int := 0; n_r int := 0; n_s int := 0;
begin
  if not sd_can('data.backup') then raise exception 'ไม่มีสิทธิ์กู้คืนข้อมูล'; end if;
  if p_wipe and not sd_can('data.reset') then raise exception 'ไม่มีสิทธิ์รีเซ็ตข้อมูล'; end if;
  perform set_config('sd.importing', 'on', true);
  if p_wipe then
    delete from sd_reviews where true; delete from sd_bookings where true; delete from sd_errors where true;
    delete from sd_sos where true; delete from sd_hotels where true; delete from sd_coupons where true; delete from sd_kv where true;
  end if;
  if jsonb_typeof(p -> 'hotels') = 'array' then
    insert into sd_hotels (id, data, owner_id)
      select x ->> 'id', x, (select pr.id from sd_profiles pr where pr.id::text = x ->> 'ownerId' and pr.role = 'owner')
      from jsonb_array_elements(p -> 'hotels') x
      on conflict (id) do update set data = excluded.data, owner_id = excluded.owner_id;
    get diagnostics n_h = row_count;
  end if;
  if jsonb_typeof(p -> 'coupons') = 'array' then
    insert into sd_coupons (code, type, value, min_amount, description, active, owner_id)
      select upper(x ->> 'code'), x ->> 'type', (x ->> 'value')::numeric, coalesce((x ->> 'min')::numeric, 0), coalesce(x ->> 'desc', ''), coalesce((x ->> 'active')::boolean, true),
        (select pr.id from sd_profiles pr where pr.id::text = x ->> 'ownerId' and pr.role = 'owner')
      from jsonb_array_elements(p -> 'coupons') x
      on conflict (code) do update set type = excluded.type, value = excluded.value, min_amount = excluded.min_amount, description = excluded.description, active = excluded.active, owner_id = excluded.owner_id;
    get diagnostics n_c = row_count;
  end if;
  if jsonb_typeof(p -> 'bookings') = 'array' then
    insert into sd_bookings (id, pin, user_id, check_in, check_out, data)
      select x ->> 'id', coalesce(nullif(x ->> 'pin', ''), (1000 + floor(random() * 9000))::int::text),
        (select u.id from auth.users u where u.id::text = x ->> 'userId'), (x ->> 'checkIn')::date, (x ->> 'checkOut')::date, x
      from jsonb_array_elements(p -> 'bookings') x where x ->> 'id' is not null
      on conflict (id) do update set data = excluded.data;
    get diagnostics n_b = row_count;
  end if;
  if jsonb_typeof(p -> 'reviews') = 'array' then
    insert into sd_reviews (booking_id, hotel_id, name, country, trip, score, title, text, room, date)
      select (select id from sd_bookings where id = x ->> 'bookingId'), x ->> 'hotelId', coalesce(x ->> 'name', ''), coalesce(x ->> 'country', 'TH'), coalesce(x ->> 'trip', ''),
        (x ->> 'score')::numeric, x ->> 'title', x ->> 'text', coalesce(x ->> 'room', ''), coalesce((x ->> 'date')::date, current_date)
      from jsonb_array_elements(p -> 'reviews') x
      on conflict (booking_id) do nothing;
    get diagnostics n_r = row_count;
  end if;
  if jsonb_typeof(p -> 'sos') = 'array' then
    insert into sd_sos (id, at, status, data)
      select x ->> 'id', coalesce((x ->> 'at')::timestamptz, now()), coalesce(x ->> 'status', 'new'), x
      from jsonb_array_elements(p -> 'sos') x where x ->> 'id' is not null
      on conflict (id) do update set status = excluded.status, data = excluded.data;
    get diagnostics n_s = row_count;
  end if;
  foreach k in array array['settings', 'flags', 'sos_contacts'] loop
    if p ? k and p -> k <> 'null'::jsonb then
      insert into sd_kv (key, value) values (k, p -> k) on conflict (key) do update set value = excluded.value, updated_at = now();
    end if;
  end loop;
  return jsonb_build_object('hotels', n_h, 'coupons', n_c, 'bookings', n_b, 'reviews', n_r, 'sos', n_s);
end $$;

-- ฟังก์ชันที่ต้องล็อกอิน
revoke execute on function public.sd_slip_visible(text) from public, anon;
grant execute on function public.sd_slip_visible(text) to authenticated;
revoke execute on function public.sd_owns_hotel(text) from public, anon;
grant execute on function public.sd_owns_hotel(text) to authenticated;

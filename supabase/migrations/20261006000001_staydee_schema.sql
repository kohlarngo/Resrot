-- StayDee — ระบบจองที่พัก + หลังบ้าน 3 บทบาท (owner / admin / dev)
-- ทุกตารางขึ้นต้นด้วย sd_ เพราะใช้โปรเจกต์ Supabase ร่วมกับระบบอื่น (wof-villa-resort)
-- สิทธิ์ทั้งหมดถูกบังคับที่ฐานข้อมูลด้วย RLS — โค้ดฝั่งเบราว์เซอร์มีไว้ซ่อนเมนูเท่านั้น

-- ================= บทบาท & สิทธิ์ =================
create table public.sd_role_perms (
  role text not null check (role in ('owner', 'admin', 'dev', 'user')),
  perm text not null,
  primary key (role, perm)
);
-- ต้องตรงกับ ROLE_PERMS ใน js/store.js
insert into public.sd_role_perms (role, perm)
select 'owner', p from unnest(array['exec.view','reports.view','staff.manage','settings.business','ops.view','frontdesk','bookings.view','bookings.edit','bookings.delete','inventory','hotels.edit','coupons.edit','reviews.manage','customers.view','sos.manage','audit.view','data.backup','data.reset']) p
union all
select 'admin', p from unnest(array['ops.view','frontdesk','bookings.view','bookings.edit','inventory','hotels.edit','coupons.edit','reviews.manage','customers.view','sos.manage']) p
union all
select 'dev', p from unnest(array['ops.view','bookings.view','inventory','audit.view','dev.console','flags.edit','data.backup','data.reset']) p;

create table public.sd_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null default '',
  phone text not null default '',
  role text not null default 'user' check (role in ('owner', 'admin', 'dev', 'user')),
  active boolean not null default true,
  last_login timestamptz,
  created_at timestamptz not null default now(),
  created_by text
);
create index sd_profiles_email_idx on public.sd_profiles (lower(email));

create function public.sd_can(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from sd_profiles pr join sd_role_perms rp on rp.role = pr.role
    where pr.id = auth.uid() and pr.active and rp.perm = p
  );
$$;

create function public.sd_is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from sd_profiles where id = auth.uid() and active and role in ('owner', 'admin', 'dev'));
$$;

-- คำขอที่มาจาก service role หรือจากการเชื่อมต่อฐานข้อมูลโดยตรง (ไม่มี JWT ผู้ใช้)
create function public.sd_privileged() returns boolean
language sql stable as $$
  select auth.uid() is null or coalesce(auth.role(), '') = 'service_role';
$$;

create function public.sd_profiles_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and not sd_privileged() then
    new.id := old.id; new.email := old.email; new.created_at := old.created_at; new.created_by := old.created_by;
    if (new.role, new.active) is distinct from (old.role, old.active) and not sd_can('staff.manage') then
      raise exception 'ไม่มีสิทธิ์เปลี่ยนบทบาทหรือสถานะบัญชี';
    end if;
  end if;
  if old.role = 'owner' and old.active and (tg_op = 'DELETE' or new.role <> 'owner' or not new.active) then
    if not exists (select 1 from sd_profiles where role = 'owner' and active and id <> old.id) then
      raise exception 'ต้องมีเจ้าของกิจการที่ใช้งานได้อย่างน้อย 1 คน';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
create trigger sd_profiles_guard before update or delete on public.sd_profiles
  for each row execute function public.sd_profiles_guard();

-- สร้างโปรไฟล์ลูกค้าให้ผู้ใช้ที่เพิ่งสมัคร (ไม่ใช้ trigger บน auth.users เพราะ Auth ใช้ร่วมกับระบบอื่น)
create function public.sd_ensure_profile(p_name text default null, p_phone text default null) returns public.sd_profiles
language plpgsql security definer set search_path = public as $$
declare r sd_profiles; em text := coalesce(auth.jwt() ->> 'email', '');
begin
  if auth.uid() is null then raise exception 'ต้องเข้าสู่ระบบ'; end if;
  insert into sd_profiles (id, email, name, phone)
  values (auth.uid(), em, left(coalesce(nullif(trim(p_name), ''), split_part(em, '@', 1)), 100), left(coalesce(trim(p_phone), ''), 30))
  on conflict (id) do nothing;
  select * into r from sd_profiles where id = auth.uid();
  return r;
end $$;

-- ใช้โดย Edge Function sd-staff เท่านั้น
create function public.sd_user_id_by_email(p_email text) returns uuid
language sql stable security definer set search_path = public, auth as $$
  select id from auth.users where lower(email) = lower(trim(p_email)) limit 1;
$$;
revoke execute on function public.sd_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.sd_user_id_by_email(text) to service_role;

alter table public.sd_role_perms enable row level security;
create policy "sd_role_perms read" on public.sd_role_perms for select using (true);

alter table public.sd_profiles enable row level security;
create policy "sd_profiles read" on public.sd_profiles for select to authenticated
  using (id = (select auth.uid()) or sd_can('staff.manage') or sd_can('customers.view') or sd_can('dev.console'));
create policy "sd_profiles update" on public.sd_profiles for update to authenticated
  using (id = (select auth.uid()) or sd_can('staff.manage'))
  with check (id = (select auth.uid()) or sd_can('staff.manage'));
create policy "sd_profiles delete" on public.sd_profiles for delete to authenticated
  using (sd_can('staff.manage') and id <> (select auth.uid()));

-- ================= ที่พัก =================
create table public.sd_hotels (
  id text primary key,
  data jsonb not null check (data ->> 'id' = id),
  updated_at timestamptz not null default now()
);
alter table public.sd_hotels enable row level security;
create policy "sd_hotels read" on public.sd_hotels for select using (true);
create policy "sd_hotels insert" on public.sd_hotels for insert to authenticated with check (sd_can('hotels.edit'));
create policy "sd_hotels update" on public.sd_hotels for update to authenticated using (sd_can('hotels.edit')) with check (sd_can('hotels.edit'));
create policy "sd_hotels delete" on public.sd_hotels for delete to authenticated using (sd_can('hotels.edit'));

-- ================= โค้ดส่วนลด =================
create table public.sd_coupons (
  code text primary key check (code ~ '^[A-Z0-9]{3,20}$'),
  type text not null check (type in ('percent', 'fixed')),
  value numeric not null check (value > 0),
  min_amount numeric not null default 0 check (min_amount >= 0),
  description text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (type <> 'percent' or value <= 100)
);
alter table public.sd_coupons enable row level security;
create policy "sd_coupons read" on public.sd_coupons for select to authenticated using (sd_can('coupons.edit'));
create policy "sd_coupons insert" on public.sd_coupons for insert to authenticated with check (sd_can('coupons.edit'));
create policy "sd_coupons update" on public.sd_coupons for update to authenticated using (sd_can('coupons.edit')) with check (sd_can('coupons.edit'));
create policy "sd_coupons delete" on public.sd_coupons for delete to authenticated using (sd_can('coupons.edit'));

-- ลูกค้าตรวจโค้ดผ่านฟังก์ชันนี้ (ไม่เปิดให้อ่านรายการโค้ดทั้งหมด)
create function public.sd_check_coupon(p_code text, p_amount numeric) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c sd_coupons; off float8;
begin
  select * into c from sd_coupons where code = upper(trim(p_code)) and active;
  if not found then return jsonb_build_object('error', 'ไม่พบโค้ดส่วนลดนี้ หรือโค้ดหมดอายุแล้ว'); end if;
  if p_amount < c.min_amount then
    return jsonb_build_object('error', 'ยอดจองขั้นต่ำ ฿' || to_char(c.min_amount, 'FM999,999,999') || ' สำหรับโค้ดนี้');
  end if;
  -- ปัดเศษแบบเดียวกับ Math.round ของ JavaScript
  off := case when c.type = 'percent' then floor(p_amount::float8 * c.value::float8 / 100 + 0.5) else c.value::float8 end;
  return jsonb_build_object(
    'coupon', jsonb_build_object('code', c.code, 'type', c.type, 'value', c.value, 'min', c.min_amount, 'desc', c.description, 'active', c.active),
    'off', least(off, p_amount::float8));
end $$;

-- ================= ค่าตั้งค่า (settings / flags / sos_contacts) =================
create table public.sd_kv (
  key text primary key check (key in ('settings', 'flags', 'sos_contacts')),
  value jsonb not null,
  updated_at timestamptz not null default now()
);
create function public.sd_kv_can(k text) returns boolean
language sql stable as $$
  select case k when 'settings' then sd_can('settings.business') when 'flags' then sd_can('flags.edit') when 'sos_contacts' then sd_can('sos.manage') else false end;
$$;
alter table public.sd_kv enable row level security;
create policy "sd_kv read" on public.sd_kv for select using (true);
create policy "sd_kv insert" on public.sd_kv for insert to authenticated with check (sd_kv_can(key));
create policy "sd_kv update" on public.sd_kv for update to authenticated using (sd_kv_can(key)) with check (sd_kv_can(key));
create policy "sd_kv delete" on public.sd_kv for delete to authenticated using (sd_kv_can(key));

-- ================= การจอง =================
create table public.sd_bookings (
  id text primary key,
  pin text not null,
  user_id uuid references auth.users (id) on delete set null,
  guest_email text not null default '',
  hotel_id text,
  room_id text,
  check_in date not null,
  check_out date not null,
  qty int not null default 1,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  data jsonb not null
);
create index sd_bookings_room_idx on public.sd_bookings (room_id, check_in, check_out) where status <> 'cancelled';
create index sd_bookings_user_idx on public.sd_bookings (user_id);
create index sd_bookings_created_idx on public.sd_bookings (created_at desc);

-- คอลัมน์ค้นหาถูกคัดลอกจาก data อัตโนมัติ · รหัส / PIN / เจ้าของการจองแก้ไม่ได้หลังสร้าง
create function public.sd_bookings_sync() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' then new.id := old.id; new.pin := old.pin; new.user_id := old.user_id; end if;
  new.data := new.data || jsonb_build_object('id', new.id, 'pin', new.pin, 'userId', new.user_id);
  new.status := coalesce(new.data ->> 'status', 'pending');
  new.check_in := (new.data ->> 'checkIn')::date;
  new.check_out := (new.data ->> 'checkOut')::date;
  new.hotel_id := new.data ->> 'hotelId';
  new.room_id := new.data ->> 'roomId';
  new.qty := coalesce((new.data ->> 'qty')::int, 1);
  new.guest_email := lower(coalesce(new.data #>> '{guest,email}', ''));
  new.created_at := coalesce((new.data ->> 'createdAt')::timestamptz, new.created_at, now());
  new.updated_at := now();
  return new;
end $$;
create trigger sd_bookings_sync before insert or update on public.sd_bookings
  for each row execute function public.sd_bookings_sync();

alter table public.sd_bookings enable row level security;
-- ลูกค้าเห็นเฉพาะการจองที่ผูกกับบัญชีตัวเอง · ผู้จองแบบไม่ล็อกอินใช้ รหัสจอง + PIN ผ่าน sd_get_booking
create policy "sd_bookings read" on public.sd_bookings for select to authenticated
  using (user_id = (select auth.uid()) or sd_can('bookings.view'));
create policy "sd_bookings update" on public.sd_bookings for update to authenticated
  using (sd_can('bookings.edit') or sd_can('frontdesk'))
  with check (sd_can('bookings.edit') or sd_can('frontdesk'));
create policy "sd_bookings delete" on public.sd_bookings for delete to authenticated
  using (sd_can('bookings.delete'));

-- จำนวนห้องที่ถูกจอง (ไม่มีข้อมูลส่วนตัว) — ใช้คำนวณห้องว่างฝั่งลูกค้า
create function public.sd_occupancy() returns table (room_id text, check_in date, check_out date, qty int)
language sql stable security definer set search_path = public as $$
  select room_id, check_in, check_out, qty from sd_bookings
  where status <> 'cancelled' and check_out >= (now() at time zone 'Asia/Bangkok')::date - 1;
$$;

-- คำนวณราคาฝั่งเซิร์ฟเวอร์ (ต้องตรงกับ DB.quote / quoteOffer / offersFor ในเบราว์เซอร์)
create function public.sd_price(p_hotel text, p_room text, p_offer text, p_in date, p_out date, p_qty int) returns jsonb
language plpgsql stable set search_path = public as $$
declare h jsonb; r jsonb; d date; o float8; f float8; so float8 := 0; sf float8 := 0; n int; extra float8 := 0; bf boolean; fc boolean;
begin
  select data into h from sd_hotels where id = p_hotel and coalesce((data ->> 'active')::boolean, true);
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

create function public.sd_create_booking(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'Asia/Bangkok')::date;
  ci date := (p ->> 'checkIn')::date; co date := (p ->> 'checkOut')::date;
  qty int := coalesce((p ->> 'qty')::int, 1);
  q jsonb; g jsonb := coalesce(p -> 'guest', '{}'); pay jsonb; method text := p #>> '{payment,method}';
  member float8 := 0; off float8 := 0; cp jsonb; code text := upper(trim(coalesce(p ->> 'couponCode', '')));
  sub float8; tax float8; paid boolean; d date; booked int; bid text; bpin text; b jsonb;
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

  if method is null or method not in ('card', 'promptpay', 'bank', 'hotel') then raise exception 'วิธีชำระเงินไม่ถูกต้อง'; end if;
  if method = 'hotel' and not (q #>> '{offer,payAtHotel}')::boolean then raise exception 'ห้องนี้ไม่รองรับการชำระที่ที่พัก'; end if;

  -- กันการจองซ้อน: ล็อกต่อประเภทห้อง แล้วตรวจห้องว่างทุกคืน
  perform pg_advisory_xact_lock(hashtext('sd_room:' || (p ->> 'roomId')));
  for d in select generate_series(ci, co - 1, interval '1 day')::date loop
    select coalesce(sum(x.qty), 0) into booked from sd_bookings x
      where x.room_id = p ->> 'roomId' and x.status <> 'cancelled' and d >= x.check_in and d < x.check_out;
    if booked + qty > (q #>> '{room,total}')::int then raise exception 'ขออภัย ห้องเพิ่งถูกจองไป กรุณาเลือกห้องอื่น'; end if;
  end loop;

  sub := (q ->> 'sub')::float8;
  if uid is not null and exists (select 1 from sd_profiles where id = uid and active) then member := floor(sub * 0.05 + 0.5); end if;
  if code <> '' then
    cp := sd_check_coupon(code, (sub - member)::numeric);
    if cp ? 'error' then raise exception '%', cp ->> 'error'; end if;
    off := (cp ->> 'off')::float8;
  end if;
  tax := floor((sub - member - off) * 0.177::float8 + 0.5);

  -- หมายเหตุ: ยังไม่มี payment gateway จริง — บัตร/พร้อมเพย์ถือว่าชำระแล้ว (จำลอง) ต้องเปลี่ยนเป็น webhook ของ gateway ก่อนรับเงินจริง
  paid := method in ('card', 'promptpay');
  pay := jsonb_build_object('method', method, 'paid', paid);
  if paid then pay := pay || jsonb_build_object('paidAt', now()); end if;
  if method = 'card' and coalesce(p #>> '{payment,last4}', '') ~ '^\d{4}$' then
    pay := pay || jsonb_build_object('last4', p #>> '{payment,last4}', 'brand', case when p #>> '{payment,brand}' in ('Visa', 'Mastercard', 'JCB') then p #>> '{payment,brand}' else 'Card' end);
  end if;

  loop
    bid := 'SD' || right((extract(epoch from clock_timestamp()) * 1000)::bigint::text, 6) || (100 + floor(random() * 900))::int::text;
    exit when not exists (select 1 from sd_bookings where id = bid);
  end loop;
  bpin := (1000 + floor(random() * 9000))::int::text;

  b := jsonb_build_object(
    'hotelId', p ->> 'hotelId', 'hotelName', q #>> '{hotel,name}', 'roomId', p ->> 'roomId', 'roomName', q #>> '{room,name}',
    'offer', q -> 'offer', 'qty', qty, 'checkIn', ci, 'checkOut', co, 'nights', (q ->> 'nights')::int,
    'adults', greatest(1, least(20, coalesce((p ->> 'adults')::int, 1))), 'children', greatest(0, least(20, coalesce((p ->> 'children')::int, 0))),
    'rooms', greatest(1, least(10, coalesce((p ->> 'rooms')::int, qty))),
    'guest', g, 'payment', pay,
    'price', jsonb_build_object('orig', (q ->> 'orig')::float8, 'room', sub, 'member', member, 'coupon', off,
      'couponCode', case when off > 0 then code end, 'tax', tax, 'total', sub - member - off + tax),
    'status', case when method = 'bank' then 'pending' else 'confirmed' end,
    'createdAt', now());
  insert into sd_bookings (id, pin, user_id, check_in, check_out, data) values (bid, bpin, uid, ci, co, b)
    returning data into b;
  return b;
end $$;

-- ค้นหาการจองด้วยรหัส + PIN (สำหรับผู้จองที่ไม่ได้ล็อกอิน)
create function public.sd_get_booking(p_id text, p_pin text) returns jsonb
language sql stable security definer set search_path = public as $$
  select data from sd_bookings where id = upper(trim(p_id)) and pin = trim(p_pin);
$$;

create function public.sd_my_booking(p_id text, p_pin text) returns sd_bookings
language plpgsql stable security definer set search_path = public as $$
declare b sd_bookings;
begin
  select * into b from sd_bookings where id = upper(trim(p_id))
    and ((auth.uid() is not null and user_id = auth.uid()) or pin = trim(coalesce(p_pin, '')));
  if not found then raise exception 'ไม่พบการจอง หรือ PIN ไม่ถูกต้อง'; end if;
  return b;
end $$;
revoke execute on function public.sd_my_booking(text, text) from public, anon, authenticated;

create function public.sd_cancel_booking(p_id text, p_pin text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare b sd_bookings; v jsonb; today date := (now() at time zone 'Asia/Bangkok')::date; free boolean; refund float8;
begin
  b := sd_my_booking(p_id, p_pin);
  if b.status not in ('pending', 'confirmed') or b.data ? 'checkedInAt' or b.check_out < today then
    raise exception 'ไม่สามารถยกเลิกการจองนี้ได้';
  end if;
  free := coalesce((b.data #>> '{offer,freeCancel}')::boolean, false) and today < b.check_in;
  refund := case when coalesce((b.data #>> '{payment,paid}')::boolean, false) and free then (b.data #>> '{price,total}')::float8 else 0 end;
  update sd_bookings set data = data || jsonb_build_object('status', 'cancelled', 'refund', refund, 'cancelledAt', now(), 'cancelledBy', 'ลูกค้า')
    where id = b.id returning data into v;
  return v;
end $$;

-- ลูกค้าแจ้งว่าโอนเงินแล้ว — ทีมงานต้องตรวจสอบและกด "รับชำระเงิน" เอง
create function public.sd_claim_payment(p_id text, p_pin text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare b sd_bookings; v jsonb;
begin
  b := sd_my_booking(p_id, p_pin);
  if b.status <> 'pending' or coalesce((b.data #>> '{payment,paid}')::boolean, false) then raise exception 'การจองนี้ไม่อยู่ในสถานะรอชำระเงิน'; end if;
  update sd_bookings set data = jsonb_set(data, '{payment,claimedAt}', to_jsonb(now())) where id = b.id returning data into v;
  return v;
end $$;

-- ================= รีวิว =================
create table public.sd_reviews (
  id bigint generated always as identity primary key,
  booking_id text unique references public.sd_bookings (id) on delete set null,
  hotel_id text not null,
  user_id uuid references auth.users (id) on delete set null,
  name text not null default '',
  country text not null default 'TH',
  trip text not null default '',
  score numeric(3, 1) not null check (score between 1 and 10),
  title text not null,
  text text not null,
  room text not null default '',
  date date not null default ((now() at time zone 'Asia/Bangkok')::date),
  created_at timestamptz not null default now()
);
create index sd_reviews_hotel_idx on public.sd_reviews (hotel_id);
alter table public.sd_reviews enable row level security;
create policy "sd_reviews read" on public.sd_reviews for select to authenticated
  using (user_id = (select auth.uid()) or sd_can('reviews.manage'));

create function public.sd_public_reviews() returns setof jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('hotelId', hotel_id, 'name', name, 'country', country, 'trip', trip, 'score', score,
    'title', title, 'text', text, 'date', date, 'room', room)
  from sd_reviews order by created_at;
$$;

create function public.sd_add_review(p_booking text, p_score numeric, p_title text, p_text text, p_trip text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare b sd_bookings; nm text; today date := (now() at time zone 'Asia/Bangkok')::date; rid bigint;
begin
  if auth.uid() is null then raise exception 'กรุณาเข้าสู่ระบบก่อนเขียนรีวิว'; end if;
  select * into b from sd_bookings where id = p_booking and user_id = auth.uid();
  if not found then raise exception 'ไม่พบการจองนี้ในบัญชีของคุณ'; end if;
  if b.status = 'cancelled' or not (b.check_out <= today or b.data ? 'checkedOutAt') then raise exception 'รีวิวได้หลังเข้าพักเสร็จสิ้นแล้วเท่านั้น'; end if;
  if exists (select 1 from sd_reviews where booking_id = b.id) then raise exception 'คุณรีวิวการจองนี้แล้ว'; end if;
  if p_score is null or p_score < 1 or p_score > 10 then raise exception 'คะแนนต้องอยู่ระหว่าง 1-10'; end if;
  if length(trim(coalesce(p_title, ''))) = 0 or length(trim(coalesce(p_text, ''))) = 0 then raise exception 'กรุณากรอกหัวข้อและรายละเอียด'; end if;
  select coalesce(nullif(name, ''), b.data #>> '{guest,firstName}') into nm from sd_profiles where id = auth.uid();
  insert into sd_reviews (booking_id, hotel_id, user_id, name, trip, score, title, text, room)
  values (b.id, b.hotel_id, auth.uid(), left(coalesce(nm, ''), 60), left(coalesce(p_trip, ''), 40), round(p_score, 1), left(trim(p_title), 120), left(trim(p_text), 2000), coalesce(b.data ->> 'roomName', ''))
  returning id into rid;
  update sd_hotels set updated_at = now(), data = data || jsonb_build_object(
      'rating', round((((data ->> 'rating')::numeric * (data ->> 'reviews')::numeric + round(p_score, 1)) / ((data ->> 'reviews')::numeric + 1)), 1),
      'reviews', (data ->> 'reviews')::int + 1)
    where id = b.hotel_id;
  return jsonb_build_object('id', rid);
end $$;

create function public.sd_delete_review(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare r sd_reviews;
begin
  if not sd_can('reviews.manage') then raise exception 'ไม่มีสิทธิ์ลบรีวิว'; end if;
  delete from sd_reviews where id = p_id returning * into r;
  if not found then return; end if;
  update sd_hotels set updated_at = now(), data = data || jsonb_build_object(
      'rating', round(least(10, greatest(0, ((data ->> 'rating')::numeric * (data ->> 'reviews')::numeric - r.score) / ((data ->> 'reviews')::numeric - 1))), 1),
      'reviews', (data ->> 'reviews')::int - 1)
    where id = r.hotel_id and (data ->> 'reviews')::int > 1;
end $$;

-- ================= บันทึกการใช้งาน (Audit log) =================
create table public.sd_audit (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  uid uuid,
  name text not null default 'ระบบ',
  role text not null default '-',
  action text not null check (length(action) <= 40),
  target text not null default '' check (length(target) <= 500)
);
create index sd_audit_at_idx on public.sd_audit (at desc);
create index sd_audit_uid_idx on public.sd_audit (uid);

-- ผู้ใช้ปลอมชื่อ/บทบาทในบันทึกไม่ได้ — ดึงจากโปรไฟล์จริงเสมอ
create function public.sd_audit_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not sd_privileged() then
    new.uid := auth.uid(); new.at := now();
    select name, role into new.name, new.role from sd_profiles where id = auth.uid();
  end if;
  return new;
end $$;
create trigger sd_audit_stamp before insert on public.sd_audit for each row execute function public.sd_audit_stamp();

alter table public.sd_audit enable row level security;
create policy "sd_audit insert" on public.sd_audit for insert to authenticated with check (sd_is_staff());
create policy "sd_audit read" on public.sd_audit for select to authenticated
  using (sd_can('audit.view') or uid = (select auth.uid()));

create function public.sd_log_auth_fail(p_email text) returns void
language plpgsql security definer set search_path = public as $$
declare pr sd_profiles;
begin
  select * into pr from sd_profiles where lower(email) = lower(trim(p_email)) and role in ('owner', 'admin', 'dev');
  if not found then return; end if;
  if (select count(*) from sd_audit where action = 'auth.fail' and target = pr.email and at > now() - interval '10 minutes') >= 20 then return; end if;
  insert into sd_audit (uid, name, role, action, target) values (pr.id, pr.name, pr.role, 'auth.fail', pr.email);
end $$;

-- ================= Error logs (ฝั่งเบราว์เซอร์) =================
create table public.sd_errors (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  uid uuid default auth.uid(),
  type text not null check (length(type) <= 20),
  msg text not null check (length(msg) <= 500),
  src text not null default '' check (length(src) <= 300),
  url text not null default '' check (length(url) <= 300)
);
create index sd_errors_at_idx on public.sd_errors (at desc);
alter table public.sd_errors enable row level security;
create policy "sd_errors insert" on public.sd_errors for insert to anon, authenticated with check (true);
create policy "sd_errors read" on public.sd_errors for select to authenticated using (sd_can('dev.console'));
create policy "sd_errors delete" on public.sd_errors for delete to authenticated using (sd_can('dev.console'));

-- ================= แจ้งเหตุฉุกเฉิน (SOS) =================
create table public.sd_sos (
  id text primary key,
  at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new', 'helping', 'done')),
  data jsonb not null check (length(data::text) <= 4000)
);
create index sd_sos_at_idx on public.sd_sos (at desc);
create function public.sd_sos_stamp() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' and not sd_privileged() and coalesce(current_setting('sd.importing', true), '') <> 'on' then
    new.status := 'new'; new.at := now();
    new.id := 'SOS' || (extract(epoch from clock_timestamp()) * 1000)::bigint || floor(random() * 10)::int;
  end if;
  if tg_op = 'UPDATE' then new.id := old.id; new.at := old.at; end if;
  new.data := new.data || jsonb_build_object('id', new.id, 'at', new.at, 'status', new.status);
  return new;
end $$;
create trigger sd_sos_stamp before insert or update on public.sd_sos for each row execute function public.sd_sos_stamp();
alter table public.sd_sos enable row level security;
create policy "sd_sos insert" on public.sd_sos for insert to anon, authenticated with check (status = 'new');
create policy "sd_sos read" on public.sd_sos for select to authenticated using (sd_can('sos.manage'));
create policy "sd_sos update" on public.sd_sos for update to authenticated using (sd_can('sos.manage')) with check (sd_can('sos.manage'));

-- ================= สำรอง / กู้คืน / รีเซ็ต =================
create function public.sd_admin_import(p jsonb, p_wipe boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k text; n_h int := 0; n_c int := 0; n_b int := 0; n_r int := 0; n_s int := 0;
begin
  if not sd_can('data.backup') then raise exception 'ไม่มีสิทธิ์กู้คืนข้อมูล'; end if;
  if p_wipe and not sd_can('data.reset') then raise exception 'ไม่มีสิทธิ์รีเซ็ตข้อมูล'; end if;
  perform set_config('sd.importing', 'on', true);
  if p_wipe then
    -- บัญชีผู้ใช้และ Audit log ไม่ถูกลบ เพื่อให้ตรวจสอบย้อนหลังได้
    delete from sd_reviews where true; delete from sd_bookings where true; delete from sd_errors where true;
    delete from sd_sos where true; delete from sd_hotels where true; delete from sd_coupons where true; delete from sd_kv where true;
  end if;
  if jsonb_typeof(p -> 'hotels') = 'array' then
    insert into sd_hotels (id, data) select x ->> 'id', x from jsonb_array_elements(p -> 'hotels') x
      on conflict (id) do update set data = excluded.data, updated_at = now();
    get diagnostics n_h = row_count;
  end if;
  if jsonb_typeof(p -> 'coupons') = 'array' then
    insert into sd_coupons (code, type, value, min_amount, description, active)
      select upper(x ->> 'code'), x ->> 'type', (x ->> 'value')::numeric, coalesce((x ->> 'min')::numeric, 0), coalesce(x ->> 'desc', ''), coalesce((x ->> 'active')::boolean, true)
      from jsonb_array_elements(p -> 'coupons') x
      on conflict (code) do update set type = excluded.type, value = excluded.value, min_amount = excluded.min_amount, description = excluded.description, active = excluded.active;
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

-- ================= Realtime (หลังบ้านอัปเดตทันทีเมื่อมีการจอง / แจ้งเหตุใหม่) =================
alter publication supabase_realtime add table public.sd_bookings, public.sd_sos;

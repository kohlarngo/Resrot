-- kohlarngo ทัวร์เกาะล้าน — สคีมาใหม่ตามโครงของระบบ StayDee (hotel)
-- วิธีใช้: Supabase Dashboard > SQL Editor > วางทั้งไฟล์ > Run  (รันซ้ำได้ ไม่ลบข้อมูลเดิม)
-- ตารางใหม่ทั้งหมดขึ้นต้นด้วย tour_ และไม่ชนกับตารางเดิม (tour_services / tour_bookings / tour_providers ... ยังอยู่ ไม่ถูกแตะ)
-- บทบาท: user (ลูกค้า) · owner (เจ้าของกิจการ/ผู้ให้บริการ) · admin (ผู้ดูแลแพลตฟอร์ม) · dev (นักพัฒนา)

-- ============ ตาราง ============
create table if not exists public.tour_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text,
  phone text,
  role text not null default 'user' check (role in ('user','owner','admin','dev')),
  active boolean not null default true,
  owner_status text check (owner_status in ('pending','approved','rejected')),
  biz jsonb not null default '{}'::jsonb,       -- ชื่อกิจการ, โลโก้, LINE, Facebook, เบอร์, ที่อยู่
  payout jsonb not null default '{}'::jsonb,    -- พร้อมเพย์/บัญชีรับเงิน
  last_login timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.tour_trips (
  id text primary key,
  owner_id uuid references public.tour_profiles(id) on delete set null,
  data jsonb not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tour_trips_owner_idx on public.tour_trips(owner_id);

create table if not exists public.tour_bookings (
  id text primary key,
  trip_id text not null references public.tour_trips(id) on delete restrict,
  owner_id uuid references public.tour_profiles(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  pin text not null,
  status text not null default 'pending' check (status in ('pending','confirmed','completed','cancelled')),
  trip_date date not null,
  trip_time text,
  qty int not null check (qty between 1 and 200),
  total numeric(12,2) not null check (total >= 0),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tour_bookings_owner_idx on public.tour_bookings(owner_id, trip_date);
create index if not exists tour_bookings_user_idx on public.tour_bookings(user_id, created_at desc);
create index if not exists tour_bookings_trip_idx on public.tour_bookings(trip_id, trip_date) where status <> 'cancelled';

create table if not exists public.tour_coupons (
  code text primary key,
  type text not null check (type in ('percent','fixed')),
  value numeric(10,2) not null check (value > 0),
  min_amount numeric(10,2) not null default 0,
  description text,
  active boolean not null default true,
  owner_id uuid references public.tour_profiles(id) on delete cascade,  -- null = คูปองของแพลตฟอร์ม
  max_uses int,
  used int not null default 0,
  expires date,
  created_at timestamptz not null default now()
);

create table if not exists public.tour_reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id text unique references public.tour_bookings(id) on delete cascade,
  trip_id text not null references public.tour_trips(id) on delete cascade,
  user_id uuid,
  name text not null,
  score numeric(2,1) not null check (score between 1 and 5),
  comment text check (char_length(comment) <= 1000),
  reply text,
  visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.tour_ads (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('popup','card','side_left','side_right','bottom_bar','featured')),
  advertiser text not null,
  trip_id text references public.tour_trips(id) on delete set null,
  title text, body text, image text, link text, phone text,
  start_date date, end_date date,
  active boolean not null default true,
  fee numeric(10,2) not null default 0,
  paid boolean not null default false,
  note text,
  views int not null default 0,
  clicks int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.tour_sos (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'new' check (status in ('new','handling','done')),
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.tour_kv (key text primary key, value jsonb not null, updated_at timestamptz not null default now());
create table if not exists public.tour_audit (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(), user_id uuid, name text, action text not null, detail text
);
create table if not exists public.tour_errors (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(), kind text, message text, page text, ua text
);

-- ============ ฟังก์ชันตรวจสิทธิ์ ============
create or replace function public.tour_role() returns text language sql stable security definer set search_path = '' as $$
  select role from public.tour_profiles where id = auth.uid() and active
$$;
create or replace function public.tour_is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select role in ('admin','dev') from public.tour_profiles where id = auth.uid() and active), false)
$$;
create or replace function public.tour_is_dev() returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select role = 'dev' from public.tour_profiles where id = auth.uid() and active), false)
$$;
create or replace function public.tour_is_owner() returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select role = 'owner' and owner_status = 'approved' from public.tour_profiles where id = auth.uid() and active), false)
$$;
revoke execute on function public.tour_role(), public.tour_is_admin(), public.tour_is_dev(), public.tour_is_owner() from public, anon;
grant execute on function public.tour_role(), public.tour_is_admin(), public.tour_is_dev(), public.tour_is_owner() to anon, authenticated; -- anon ต้องเรียกได้ เพราะนโยบายอ่านเรียกใช้ (คืน false เมื่อไม่ได้ล็อกอิน)

-- ============ RLS ============
alter table public.tour_profiles enable row level security;
alter table public.tour_trips    enable row level security;
alter table public.tour_bookings enable row level security;
alter table public.tour_coupons  enable row level security;
alter table public.tour_reviews  enable row level security;
alter table public.tour_ads      enable row level security;
alter table public.tour_sos      enable row level security;
alter table public.tour_kv       enable row level security;
alter table public.tour_audit    enable row level security;
alter table public.tour_errors   enable row level security;

-- โปรไฟล์: เห็น/แก้ของตัวเอง (ห้ามแก้ role / สถานะ) · แอดมินเห็นทั้งหมด
drop policy if exists tour_profiles_self on public.tour_profiles;
create policy tour_profiles_self on public.tour_profiles for select to authenticated using (id = (select auth.uid()) or (select public.tour_is_admin()));
drop policy if exists tour_profiles_upd on public.tour_profiles;
create policy tour_profiles_upd on public.tour_profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
drop policy if exists tour_profiles_admin on public.tour_profiles;
revoke update on public.tour_profiles from anon, authenticated;
grant update (name, phone, biz, payout, last_login) on public.tour_profiles to authenticated;

-- ทริป: ทุกคนดูที่เปิดอยู่ · เจ้าของจัดการของตัวเอง (ต้องอนุมัติแล้ว) · แอดมินทั้งหมด
drop policy if exists tour_trips_read on public.tour_trips;
create policy tour_trips_read on public.tour_trips for select to anon, authenticated
  using ((active and coalesce(data->>'banned','') <> 'true') or owner_id = (select auth.uid()) or (select public.tour_is_admin()));
drop policy if exists tour_trips_owner_ins on public.tour_trips;
create policy tour_trips_owner_ins on public.tour_trips for insert to authenticated with check ((select public.tour_is_owner()) and owner_id = (select auth.uid()));
drop policy if exists tour_trips_owner_upd on public.tour_trips;
create policy tour_trips_owner_upd on public.tour_trips for update to authenticated
  using ((select public.tour_is_owner()) and owner_id = (select auth.uid())) with check ((select public.tour_is_owner()) and owner_id = (select auth.uid()));
drop policy if exists tour_trips_owner_del on public.tour_trips;
create policy tour_trips_owner_del on public.tour_trips for delete to authenticated using ((select public.tour_is_owner()) and owner_id = (select auth.uid()));  -- มีการจองแล้วลบไม่ได้ (FK restrict) ให้ปิดทริปแทน
drop policy if exists tour_trips_admin on public.tour_trips;
create policy tour_trips_admin on public.tour_trips for all to authenticated using ((select public.tour_is_admin())) with check ((select public.tour_is_admin()));

-- การจอง: สร้างผ่าน RPC เท่านั้น · ลูกค้าเห็นของตัวเอง · เจ้าของเห็น/จัดการของร้านตัวเอง · แอดมินทั้งหมด
drop policy if exists tour_bookings_read on public.tour_bookings;
create policy tour_bookings_read on public.tour_bookings for select to authenticated
  using (user_id = (select auth.uid()) or owner_id = (select auth.uid()) or (select public.tour_is_admin()));
drop policy if exists tour_bookings_owner_upd on public.tour_bookings;
create policy tour_bookings_owner_upd on public.tour_bookings for update to authenticated
  using ((select public.tour_is_owner()) and owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists tour_bookings_admin_upd on public.tour_bookings;
create policy tour_bookings_admin_upd on public.tour_bookings for update to authenticated using ((select public.tour_is_admin())) with check ((select public.tour_is_admin()));
revoke select, update on public.tour_bookings from anon, authenticated;
grant select (id, trip_id, owner_id, user_id, status, trip_date, trip_time, qty, total, data, created_at, updated_at) on public.tour_bookings to authenticated;  -- ไม่ให้อ่านคอลัมน์ pin
grant update (status, data, updated_at) on public.tour_bookings to authenticated;

-- คูปอง
drop policy if exists tour_coupons_rw on public.tour_coupons;
create policy tour_coupons_rw on public.tour_coupons for all to authenticated
  using ((select public.tour_is_admin()) or (owner_id = (select auth.uid()) and (select public.tour_is_owner())))
  with check ((select public.tour_is_admin()) or (owner_id = (select auth.uid()) and (select public.tour_is_owner())));

-- รีวิว: ทุกคนอ่านที่แสดง · เจ้าของตอบกลับ (ผ่านการอัปเดตคอลัมน์ reply) · แอดมินซ่อน/ลบ
drop policy if exists tour_reviews_read on public.tour_reviews;
create policy tour_reviews_read on public.tour_reviews for select to anon, authenticated using (visible or (select public.tour_is_admin()));
drop policy if exists tour_reviews_owner_reply on public.tour_reviews;
drop policy if exists tour_reviews_admin on public.tour_reviews;
create policy tour_reviews_admin on public.tour_reviews for all to authenticated using ((select public.tour_is_admin())) with check ((select public.tour_is_admin()));
revoke update on public.tour_reviews from anon, authenticated;

-- โฆษณา / SOS / ตั้งค่า / log
drop policy if exists tour_ads_admin on public.tour_ads;
create policy tour_ads_admin on public.tour_ads for all to authenticated using ((select public.tour_is_admin())) with check ((select public.tour_is_admin()));
drop policy if exists tour_sos_admin on public.tour_sos;
create policy tour_sos_admin on public.tour_sos for all to authenticated using ((select public.tour_is_admin())) with check ((select public.tour_is_admin()));
drop policy if exists tour_kv_read on public.tour_kv;
create policy tour_kv_read on public.tour_kv for select to anon, authenticated using (true);
drop policy if exists tour_kv_admin on public.tour_kv;
create policy tour_kv_admin on public.tour_kv for all to authenticated using ((select public.tour_is_admin())) with check ((select public.tour_is_admin()));
drop policy if exists tour_audit_read on public.tour_audit;
create policy tour_audit_read on public.tour_audit for select to authenticated using ((select public.tour_is_admin()));
drop policy if exists tour_audit_ins on public.tour_audit;
create policy tour_audit_ins on public.tour_audit for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists tour_errors_read on public.tour_errors;
create policy tour_errors_read on public.tour_errors for select to authenticated using ((select public.tour_is_dev()));
drop policy if exists tour_errors_ins on public.tour_errors;
create policy tour_errors_ins on public.tour_errors for insert to anon, authenticated with check (char_length(coalesce(message,'')) <= 1000);

-- โน้ตภายในของเจ้าของ/แอดมินต่อการจอง (ลูกค้าอ่านไม่ได้)
create table if not exists public.tour_booking_notes (
  booking_id text primary key references public.tour_bookings(id) on delete cascade,
  owner_id uuid, note text not null default '' check (char_length(note) <= 1000), updated_at timestamptz not null default now()
);
alter table public.tour_booking_notes enable row level security;
drop policy if exists tour_notes_rw on public.tour_booking_notes;
create policy tour_notes_rw on public.tour_booking_notes for all to authenticated
  using ((select public.tour_is_admin()) or (owner_id = (select auth.uid()) and (select public.tour_is_owner())))
  with check ((select public.tour_is_admin()) or (owner_id = (select auth.uid()) and (select public.tour_is_owner())
    and exists (select 1 from public.tour_bookings b where b.id = booking_id and b.owner_id = (select auth.uid()))));

-- เจ้าของแก้ธง banned ของทริปตัวเองไม่ได้ (เฉพาะแอดมิน)
create or replace function public.tour_trip_guard() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not public.tour_is_admin() then
    new.data := case when tg_op = 'UPDATE' and old.data ? 'banned' then jsonb_set(new.data, '{banned}', old.data->'banned') else new.data - 'banned' end;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists tour_trip_guard on public.tour_trips;
create trigger tour_trip_guard before insert or update on public.tour_trips for each row execute function public.tour_trip_guard();

-- แอดมิน/นักพัฒนาแก้โปรไฟล์ผู้อื่น (บทบาทเปลี่ยนได้เฉพาะ dev · แอดมินจัดการลูกค้า/เจ้าของได้ ไม่แตะบัญชีทีมงาน)
create or replace function public.tour_admin_set_profile(p_id uuid, p_patch jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare t public.tour_profiles;
begin
  if not public.tour_is_admin() then raise exception 'ไม่มีสิทธิ์'; end if;
  select * into t from public.tour_profiles where id = p_id;
  if t.id is null then raise exception 'ไม่พบผู้ใช้'; end if;
  if p_id = auth.uid() then raise exception 'แก้บัญชีตัวเองไม่ได้'; end if;
  if p_patch ? 'role' and not public.tour_is_dev() then raise exception 'เปลี่ยนบทบาทได้เฉพาะนักพัฒนา'; end if;
  if t.role in ('admin','dev') and not public.tour_is_dev() then raise exception 'แก้บัญชีทีมงานได้เฉพาะนักพัฒนา'; end if;
  if (p_patch->>'role') is not null and (p_patch->>'role') not in ('user','owner','admin','dev') then raise exception 'บทบาทไม่ถูกต้อง'; end if;
  update public.tour_profiles set
    role = coalesce(p_patch->>'role', role),
    active = coalesce((p_patch->>'active')::boolean, active),
    owner_status = case when p_patch ? 'owner_status' then p_patch->>'owner_status' else owner_status end
  where id = p_id;
end $$;
revoke execute on function public.tour_admin_set_profile(uuid, jsonb) from public, anon;
grant execute on function public.tour_admin_set_profile(uuid, jsonb) to authenticated;

create or replace function public.tour_reply_review(p_id uuid, p_reply text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.tour_reviews r set reply = nullif(left(trim(p_reply), 600), '')
   where r.id = p_id and exists (select 1 from public.tour_trips t where t.id = r.trip_id and t.owner_id = auth.uid() and public.tour_is_owner());
  if not found then raise exception 'ไม่มีสิทธิ์ตอบรีวิวนี้'; end if;
end $$;
create or replace function public.tour_set_review_visible(p_id uuid, p_visible boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.tour_is_admin() then raise exception 'ไม่มีสิทธิ์'; end if;
  update public.tour_reviews set visible = p_visible where id = p_id;
end $$;
revoke execute on function public.tour_reply_review(uuid, text), public.tour_set_review_visible(uuid, boolean) from public, anon;
grant execute on function public.tour_reply_review(uuid, text), public.tour_set_review_visible(uuid, boolean) to authenticated;

-- ============ RPC สำหรับลูกค้า / สาธารณะ ============
-- สร้างโปรไฟล์หลังสมัคร/ล็อกอินครั้งแรก
create or replace function public.tour_ensure_profile(p_name text default null, p_phone text default null)
returns public.tour_profiles language plpgsql security definer set search_path = '' as $$
declare v public.tour_profiles; u auth.users;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into u from auth.users where id = auth.uid();
  insert into public.tour_profiles (id, name, email, phone)
    values (auth.uid(), left(coalesce(nullif(trim(p_name),''), split_part(u.email,'@',1), 'ลูกค้า'), 100), u.email, left(p_phone, 20))
    on conflict (id) do update set last_login = now()
    returning * into v;
  return v;
end $$;

-- สมัครเป็นเจ้าของกิจการ (รอแอดมินอนุมัติ)
create or replace function public.tour_apply_owner(p_biz jsonb, p_phone text default null)
returns public.tour_profiles language plpgsql security definer set search_path = '' as $$
declare v public.tour_profiles;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if jsonb_typeof(p_biz) <> 'object' or length(p_biz::text) > 4000 then raise exception 'ข้อมูลไม่ถูกต้อง'; end if;
  update public.tour_profiles
     set role = 'owner', owner_status = 'pending', biz = p_biz, phone = coalesce(left(p_phone,20), phone)
   where id = auth.uid() and (role = 'user' or (role = 'owner' and owner_status = 'rejected'))
   returning * into v;
  if v.id is null then raise exception 'บัญชีนี้สมัครเป็นเจ้าของกิจการไม่ได้'; end if;
  return v;
end $$;

-- ที่นั่งที่ถูกจองแล้ว (รวมเฉพาะจำนวน ไม่เปิดเผยข้อมูลลูกค้า)
create or replace function public.tour_occupancy()
returns table (trip_id text, trip_date date, trip_time text, qty bigint) language sql stable security definer set search_path = '' as $$
  select trip_id, trip_date, coalesce(trip_time,''), sum(qty) from public.tour_bookings
   where status <> 'cancelled' and trip_date >= current_date group by 1,2,3
$$;

drop function if exists public.tour_public_owners();
create function public.tour_public_owners()
returns table (id uuid, name text, phone text, line text, facebook text, logo text, promptpay_id text, promptpay_name text, bank_info text) language sql stable security definer set search_path = '' as $$
  select id, coalesce(nullif(biz->>'name',''), name), coalesce(biz->>'phone', phone), biz->>'line', biz->>'facebook', biz->>'logo',
         payout->>'promptpayId', payout->>'promptpayName', payout->>'bankInfo'
    from public.tour_profiles where role = 'owner' and owner_status = 'approved' and active
$$;

create or replace function public.tour_public_coupons()
returns table (code text, type text, value numeric, min_amount numeric, description text, owner_id uuid) language sql stable security definer set search_path = '' as $$
  select code, type, value, min_amount, description, owner_id from public.tour_coupons
   where active and (expires is null or expires >= current_date) and (max_uses is null or used < max_uses)
$$;

create or replace function public.tour_public_ads()
returns table (id uuid, kind text, advertiser text, trip_id text, title text, body text, image text, link text, phone text) language sql stable security definer set search_path = '' as $$
  select id, kind, advertiser, trip_id, title, body, image, link, phone from public.tour_ads
   where active and (start_date is null or start_date <= current_date) and (end_date is null or end_date >= current_date)
$$;
create or replace function public.tour_track_ad(p_id uuid, p_kind text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_kind = 'view' then update public.tour_ads set views = views + 1 where id = p_id;
  elsif p_kind = 'click' then update public.tour_ads set clicks = clicks + 1 where id = p_id; end if;
end $$;

-- จอง: เซิร์ฟเวอร์คิดราคา/ตรวจที่ว่าง/คูปองเอง ไม่เชื่อค่าจากหน้าเว็บ
create or replace function public.tour_create_booking(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  t public.tour_trips; d jsonb; opt jsonb; it jsonb; items jsonb := coalesce(p->'items','[]'::jsonb);
  v_date date; v_time text := nullif(p->>'time',''); v_qty int := 0; v_sub numeric := 0; v_disc numeric := 0; v_total numeric;
  v_cap int; v_taken bigint; v_id text; v_pin text; v_cp public.tour_coupons; v_name text; v_phone text; v_method text;
  v_a int; v_c int; v_closed jsonb; v_owner public.tour_profiles;
begin
  select * into t from public.tour_trips where id = p->>'trip_id' and active;
  if t.id is null or coalesce(t.data->>'banned','') = 'true' then raise exception 'ไม่พบทริปนี้ หรือปิดรับจองแล้ว'; end if;
  select * into v_owner from public.tour_profiles where id = t.owner_id;
  if v_owner.id is null or v_owner.owner_status <> 'approved' or not v_owner.active then raise exception 'ผู้ให้บริการยังไม่เปิดรับจอง'; end if;
  d := t.data;
  begin v_date := (p->>'date')::date; exception when others then raise exception 'วันที่ไม่ถูกต้อง'; end;
  if v_date < current_date then raise exception 'เลือกวันที่ย้อนหลังไม่ได้'; end if;
  if v_date > current_date + 365 then raise exception 'จองล่วงหน้าได้ไม่เกิน 1 ปี'; end if;
  v_closed := coalesce(d->'closedDates','[]'::jsonb);
  if v_closed ? (v_date::text) then raise exception 'วันที่เลือกปิดรับจอง'; end if;
  if jsonb_array_length(coalesce(d->'times','[]'::jsonb)) > 0 and (v_time is null or not (d->'times') ? v_time) then raise exception 'กรุณาเลือกรอบเวลา'; end if;
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 or jsonb_array_length(items) > 10 then raise exception 'กรุณาเลือกรายการที่ต้องการจอง'; end if;
  for it in select * from jsonb_array_elements(items) loop
    select o into opt from jsonb_array_elements(coalesce(d->'options','[]'::jsonb)) o where o->>'id' = it->>'o' limit 1;
    if opt is null then raise exception 'ไม่พบตัวเลือกที่เลือก'; end if;
    v_a := greatest(0, least(coalesce((it->>'a')::int,0), 100));
    v_c := greatest(0, least(coalesce((it->>'c')::int,0), 100));
    if v_a + v_c = 0 then continue; end if;
    v_qty := v_qty + v_a + v_c;
    v_sub := v_sub + v_a * coalesce((opt->>'price')::numeric,0) + v_c * coalesce(nullif(opt->>'childPrice','')::numeric, (opt->>'price')::numeric);
  end loop;
  if v_qty = 0 then raise exception 'กรุณาระบุจำนวน'; end if;
  v_cap := coalesce(nullif(d->>'dailyCap','')::int, 0);
  if v_cap > 0 then
    select coalesce(sum(qty),0) into v_taken from public.tour_bookings
      where trip_id = t.id and trip_date = v_date and status <> 'cancelled' and (v_time is null or coalesce(trip_time,'') = v_time);
    if v_taken + v_qty > v_cap then raise exception 'ที่ว่างไม่พอ (เหลือ % ที่)', greatest(0, v_cap - v_taken); end if;
  end if;
  -- คูปอง
  if nullif(p->>'coupon','') is not null then
    select * into v_cp from public.tour_coupons where code = upper(trim(p->>'coupon'))
      and active and (expires is null or expires >= current_date) and (max_uses is null or used < max_uses)
      and (owner_id is null or owner_id = t.owner_id) for update;
    if v_cp.code is null then raise exception 'โค้ดส่วนลดไม่ถูกต้องหรือหมดอายุ'; end if;
    if v_sub < v_cp.min_amount then raise exception 'ยอดไม่ถึงขั้นต่ำของโค้ดนี้'; end if;
    v_disc := least(v_sub, case v_cp.type when 'percent' then round(v_sub * v_cp.value / 100) else v_cp.value end);
    update public.tour_coupons set used = used + 1 where code = v_cp.code;
  end if;
  v_total := v_sub - v_disc;
  v_name := left(trim(coalesce(p#>>'{contact,name}','')), 100); v_phone := left(trim(coalesce(p#>>'{contact,phone}','')), 20);
  if char_length(v_name) < 2 then raise exception 'กรุณากรอกชื่อผู้จอง'; end if;
  if v_phone !~ '^[0-9+\- ]{9,20}$' then raise exception 'เบอร์โทรไม่ถูกต้อง'; end if;
  v_method := case when p->>'method' in ('promptpay','onsite') then p->>'method' else 'promptpay' end;
  v_id := 'T' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 7));
  v_pin := lpad((floor(random()*10000))::int::text, 4, '0');
  insert into public.tour_bookings (id, trip_id, owner_id, user_id, pin, trip_date, trip_time, qty, total, data)
  values (v_id, t.id, t.owner_id, auth.uid(), v_pin, v_date, v_time, v_qty, v_total, jsonb_build_object(
    'tripName', d->>'name', 'items', items, 'subtotal', v_sub, 'discount', v_disc, 'coupon', v_cp.code,
    'contact', jsonb_build_object('name', v_name, 'phone', v_phone, 'email', left(p#>>'{contact,email}', 120), 'note', left(p#>>'{contact,note}', 500), 'lang', left(p->>'lang', 5)),
    'pickup', case when p->'pickup' is null then null else jsonb_build_object('place', left(p#>>'{pickup,place}', 200), 'lat', p#>'{pickup,lat}', 'lng', p#>'{pickup,lng}') end,
    'payment', jsonb_build_object('method', v_method, 'paid', false, 'slip', null),
    'log', jsonb_build_array(jsonb_build_object('at', now(), 'by', 'customer', 'text', 'สร้างการจอง'))
  ));
  return jsonb_build_object('id', v_id, 'pin', v_pin, 'total', v_total);
end $$;
grant execute on function public.tour_create_booking(jsonb) to anon, authenticated;

create or replace function public.tour_get_booking(p_id text, p_pin text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', b.id, 'tripId', b.trip_id, 'ownerId', b.owner_id, 'status', b.status, 'date', b.trip_date, 'time', b.trip_time,
         'qty', b.qty, 'total', b.total, 'createdAt', b.created_at, 'data', b.data)
    from public.tour_bookings b where b.id = upper(trim(p_id)) and b.pin = trim(p_pin)
$$;

-- ลูกค้ายกเลิกเอง (ก่อนวันเดินทางอย่างน้อย 1 วัน หรือยังไม่ยืนยัน)
create or replace function public.tour_cancel_booking(p_id text, p_pin text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare b public.tour_bookings;
begin
  select * into b from public.tour_bookings where id = upper(trim(p_id)) and (pin = trim(p_pin) or user_id = auth.uid()) for update;
  if b.id is null then raise exception 'ไม่พบการจอง'; end if;
  if b.status in ('cancelled','completed') then raise exception 'การจองนี้ยกเลิกไม่ได้แล้ว'; end if;
  if b.status = 'confirmed' and b.trip_date <= current_date then raise exception 'ยืนยันแล้วและถึงวันเดินทาง ยกเลิกเองไม่ได้ กรุณาติดต่อผู้ให้บริการ'; end if;
  update public.tour_bookings set status = 'cancelled', updated_at = now(),
    data = jsonb_set(b.data, '{log}', coalesce(b.data->'log','[]'::jsonb) || jsonb_build_array(jsonb_build_object('at', now(), 'by', 'customer', 'text', 'ลูกค้ายกเลิก')))
   where id = b.id;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.tour_cancel_booking(text, text) to anon, authenticated;

-- ลูกค้าแนบสลิป (รูปย่อเป็น data URL ไม่เกิน ~450KB)
create or replace function public.tour_attach_slip(p_id text, p_pin text, p_slip text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare b public.tour_bookings;
begin
  if p_slip is null or length(p_slip) > 600000 or p_slip !~ '^data:image/(jpeg|png|webp);base64,' then raise exception 'ไฟล์สลิปไม่ถูกต้องหรือใหญ่เกินไป'; end if;
  select * into b from public.tour_bookings where id = upper(trim(p_id)) and pin = trim(p_pin) for update;
  if b.id is null then raise exception 'ไม่พบการจอง'; end if;
  if b.status <> 'pending' then raise exception 'การจองนี้ไม่อยู่ในสถานะรอชำระ'; end if;
  update public.tour_bookings set updated_at = now(),
    data = jsonb_set(jsonb_set(b.data, '{payment,slip}', to_jsonb(p_slip)), '{payment,claimedAt}', to_jsonb(now()))
   where id = b.id;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.tour_attach_slip(text, text, text) to anon, authenticated;

-- รีวิว (ได้เฉพาะหลังทริปเสร็จสิ้น)
create or replace function public.tour_submit_review(p_id text, p_pin text, p_score numeric, p_comment text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare b public.tour_bookings;
begin
  select * into b from public.tour_bookings where id = upper(trim(p_id)) and pin = trim(p_pin);
  if b.id is null then raise exception 'ไม่พบการจอง'; end if;
  if b.status <> 'completed' then raise exception 'รีวิวได้หลังทริปเสร็จสิ้นเท่านั้น'; end if;
  insert into public.tour_reviews (booking_id, trip_id, user_id, name, score, comment)
    values (b.id, b.trip_id, b.user_id, left(b.data#>>'{contact,name}', 60), least(5, greatest(1, p_score)), left(p_comment, 1000))
    on conflict (booking_id) do nothing;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.tour_submit_review(text, text, numeric, text) to anon, authenticated;

create or replace function public.tour_submit_sos(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if jsonb_typeof(p) <> 'object' or length(p::text) > 8000 then raise exception 'invalid'; end if;
  insert into public.tour_sos (data) values (p || jsonb_build_object('userId', auth.uid()));
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.tour_submit_sos(jsonb) to anon, authenticated;

grant execute on function public.tour_ensure_profile(text, text), public.tour_apply_owner(jsonb, text) to authenticated;
grant execute on function public.tour_occupancy(), public.tour_public_owners(), public.tour_public_coupons(), public.tour_public_ads(),
  public.tour_track_ad(uuid, text), public.tour_get_booking(text, text) to anon, authenticated;

-- ============ รูปภาพ (Storage) ============
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('tour-media', 'tour-media', true, 5242880, array['image/jpeg','image/png','image/webp'])
  on conflict (id) do nothing;
drop policy if exists tour_media_read on storage.objects;
create policy tour_media_read on storage.objects for select to anon, authenticated using (bucket_id = 'tour-media');
drop policy if exists tour_media_write on storage.objects;
create policy tour_media_write on storage.objects for insert to authenticated
  with check (bucket_id = 'tour-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists tour_media_del on storage.objects;
create policy tour_media_del on storage.objects for delete to authenticated
  using (bucket_id = 'tour-media' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.tour_is_admin())));

-- รูปแนบแจ้งเหตุ SOS: ผู้แจ้งไม่ต้องล็อกอิน อัปโหลดได้เฉพาะ jpeg ≤ 3MB (อ่านผ่านลิงก์สาธารณะ)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('tour-sos', 'tour-sos', true, 3145728, array['image/jpeg'])
  on conflict (id) do nothing;
drop policy if exists tour_sos_read on storage.objects;
create policy tour_sos_read on storage.objects for select to anon, authenticated using (bucket_id = 'tour-sos');
drop policy if exists tour_sos_write on storage.objects;
create policy tour_sos_write on storage.objects for insert to anon, authenticated with check (bucket_id = 'tour-sos');

-- ============ ตั้งต้น ============
insert into public.tour_kv (key, value) values
  ('settings', '{"bizName":"kohlarngo","legalName":"kohlarngo เที่ยวเกาะล้าน","phone":"","line":"","announce":"","announceOn":false,"announceType":"info"}'),
  ('flags', '{"maintenance":false,"maintenanceMsg":"ขออภัย ระบบกำลังปรับปรุงชั่วคราว"}')
  on conflict (key) do nothing;

-- ตั้งตัวเองเป็นนักพัฒนา (สมัครสมาชิกที่เว็บก่อน แล้วเปลี่ยนอีเมลก่อนรัน):
--   update public.tour_profiles set role = 'dev' where email = 'อีเมลของคุณ';


-- =====================================================================
-- ทริปตัวอย่าง (ข้อมูลปลอมสำหรับทดสอบหน้า trips.html) — id ขึ้นต้น 'demo-'
-- ไม่มีเจ้าของ (owner_id = null) · รันซ้ำได้ · ลบทิ้งด้วยคำสั่งท้ายไฟล์ก่อนเปิดขายจริง
-- =====================================================================
insert into public.tour_trips (id, owner_id, active, data) values
 ('demo-speedboat', null, true, '{"name":"ทัวร์สปีดโบ๊ท 3 เกาะ เกาะล้าน","category":"boat","duration":"4 ชั่วโมง","summary":"นั่งสปีดโบ๊ทเที่ยว 3 เกาะ ดำน้ำตื้น พร้อมไกด์และอุปกรณ์","images":[],"options":[{"id":"std","name":"ผู้ใหญ่","price":890,"unit":"คน"}]}'),
 ('demo-snorkel', null, true, '{"name":"ดำน้ำตื้นชมปะการัง เกาะล้าน","category":"activity","duration":"2 ชั่วโมง","summary":"ดำน้ำตื้นจุดปะการังสวย มีไกด์ดูแล พร้อมเสื้อชูชีพ","images":[],"options":[{"id":"std","name":"ผู้ใหญ่","price":590,"unit":"คน"}]}'),
 ('demo-package', null, true, '{"name":"แพ็กเกจ 2 วัน 1 คืน เกาะล้าน","category":"package","duration":"2 วัน 1 คืน","summary":"ที่พัก 1 คืน + สปีดโบ๊ท + ดำน้ำตื้น + อาหารเช้า","images":[],"options":[{"id":"std","name":"ต่อท่าน (พักคู่)","price":2490,"unit":"คน"}]}'),
 ('demo-motorbike', null, true, '{"name":"เช่ามอเตอร์ไซค์ เกาะล้าน","category":"vehicle","duration":"ต่อวัน","summary":"รถออโต้ใหม่ พร้อมหมวกกันน็อก ส่งรถที่ท่าเรือ","images":[],"options":[{"id":"std","name":"รถออโต้ 125cc","price":300,"unit":"วัน"}]}')
on conflict (id) do nothing;

-- ลบทริปตัวอย่างทิ้ง (รันเมื่อมีทริปจริงแล้ว):
-- delete from public.tour_trips where id like 'demo-%' and not exists (select 1 from public.tour_bookings b where b.trip_id = tour_trips.id);

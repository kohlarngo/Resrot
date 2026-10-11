-- ความปลอดภัยการจอง: (1) ล็อกการเดา PIN (2) PIN ใหม่ 6 หลัก (3) ยกเลิกการจองที่ค้างชำระอัตโนมัติ

-- ---------- 1) ล็อกการเดา PIN ----------
-- ผิดครบ 5 ครั้งต่อรหัสจอง → ล็อก 15 นาที · ต้องคืนค่าเป็น error (ไม่ raise) เพื่อให้ตัวนับไม่ถูก rollback
create table public.sd_pin_attempts (
  id text primary key,
  fails int not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.sd_pin_attempts enable row level security;  -- ไม่มี policy = เข้าถึงผ่าน API ไม่ได้

create function public.sd_pin_gate(p_id text, p_pin text) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_id text := upper(trim(coalesce(p_id, '')));
  a sd_pin_attempts; n int;
  bad constant text := 'ไม่พบการจอง หรือ PIN ไม่ถูกต้อง';
  locked constant text := 'ลองผิดหลายครั้ง ระบบล็อกชั่วคราว กรุณารอ 15 นาทีแล้วลองใหม่';
begin
  -- เจ้าของการจองที่ล็อกอินอยู่ ไม่ต้องใช้ PIN
  if auth.uid() is not null and exists (select 1 from sd_bookings where id = v_id and user_id = auth.uid()) then return null; end if;
  -- รหัสที่ไม่มีจริงไม่บันทึก (กันตารางบวม)
  if not exists (select 1 from sd_bookings where id = v_id) then return bad; end if;

  select * into a from sd_pin_attempts where id = v_id for update;
  if found and a.locked_until is not null then
    if a.locked_until > now() then return locked; end if;
    a.fails := 0;
  end if;

  if exists (select 1 from sd_bookings where id = v_id and pin = trim(coalesce(p_pin, ''))) then
    delete from sd_pin_attempts where id = v_id;
    return null;
  end if;

  n := coalesce(a.fails, 0) + 1;
  insert into sd_pin_attempts (id, fails, locked_until, updated_at)
    values (v_id, n, case when n >= 5 then now() + interval '15 minutes' end, now())
    on conflict (id) do update set fails = excluded.fails, locked_until = excluded.locked_until, updated_at = now();
  return case when n >= 5 then locked else bad end;
end $$;
revoke execute on function public.sd_pin_gate(text, text) from public, anon, authenticated;

-- ฟังก์ชันสาธารณะที่รับ PIN: ผ่านด่านตรวจก่อน · ผิดคืน {"error": "..."}
create or replace function public.sd_get_booking(p_id text, p_pin text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare err text := sd_pin_gate(p_id, p_pin); v jsonb;
begin
  if err is not null then return jsonb_build_object('error', err); end if;
  select data into v from sd_bookings where id = upper(trim(p_id));
  return v;
end $$;

create or replace function public.sd_cancel_booking(p_id text, p_pin text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare err text := sd_pin_gate(p_id, p_pin); b sd_bookings; v jsonb; today date := (now() at time zone 'Asia/Bangkok')::date; free boolean; refund float8;
begin
  if err is not null then return jsonb_build_object('error', err); end if;
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

create or replace function public.sd_submit_slip(p_id text, p_pin text, p_path text) returns jsonb
language plpgsql security definer set search_path = public, storage as $$
declare err text := sd_pin_gate(p_id, p_pin); b sd_bookings; v jsonb;
begin
  if err is not null then return jsonb_build_object('error', err); end if;
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

-- ---------- 2) PIN ใหม่ 6 หลัก (การจองเดิมที่ PIN 4 หลักยังใช้ได้) ----------
do $$
declare def text; nd text;
begin
  def := pg_get_functiondef('public.sd_create_booking(jsonb)'::regprocedure);
  nd := replace(def, '(1000 + floor(random() * 9000))::int::text', '(100000 + floor(random() * 900000))::int::text');
  if nd = def then raise exception 'ไม่พบบรรทัดสร้าง PIN ใน sd_create_booking'; end if;
  execute nd;
end $$;

-- ---------- 3) ยกเลิกการจองที่ค้างชำระอัตโนมัติ ----------
-- เงื่อนไข: รอชำระ (พร้อมเพย์/โอน) เกินกำหนด และลูกค้ายังไม่แนบสลิป → ยกเลิก คืนห้อง
-- กำหนดเวลาตั้งได้ที่ sd_kv key 'flags' ฟิลด์ pendingHours (ค่าเริ่มต้น 24 ชม.)
create function public.sd_expire_pending() returns int
language plpgsql security definer set search_path = public as $$
declare hrs int := greatest(1, coalesce((select (value ->> 'pendingHours')::int from sd_kv where key = 'flags'), 24)); n int;
begin
  update sd_bookings set data = data || jsonb_build_object('status', 'cancelled', 'refund', 0, 'cancelledAt', now(), 'cancelledBy', 'ระบบ (หมดเวลาชำระเงิน)')
  where status = 'pending' and created_at < now() - make_interval(hours => hrs)
    and not coalesce((data #>> '{payment,paid}')::boolean, false)
    and data #>> '{payment,method}' in ('promptpay', 'bank')
    and not ((data -> 'payment') ? 'slip');
  get diagnostics n = row_count;
  delete from sd_pin_attempts where updated_at < now() - interval '1 day';
  return n;
end $$;
revoke execute on function public.sd_expire_pending() from public, anon, authenticated;

-- ตั้งเวลารันทุก 15 นาทีด้วย pg_cron (ถ้าเปิดใช้ไม่ได้ ให้เปิด extension pg_cron เองแล้วรัน cron.schedule ตามคู่มือ)
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('sd-expire-pending', '*/15 * * * *', 'select public.sd_expire_pending()');
exception when others then
  raise notice 'ตั้ง pg_cron ไม่สำเร็จ: % — ดูวิธีตั้งเองในคู่มือ', sqlerrm;
end $$;

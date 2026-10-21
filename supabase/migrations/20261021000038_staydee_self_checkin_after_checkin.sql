-- ลูกค้ากรอกทะเบียนเองหลังเจ้าของกด "เช็คอิน" ได้ (เดิมบล็อกเมื่อมี checkedInAt) — ปิดเมื่อเช็คเอาท์ หรือยกเลิกการจอง
create or replace function public.sd_checkin_status(p_id text, p_pin text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare err text := sd_pin_gate(p_id, p_pin); b sd_bookings;
begin
  if err is not null then return jsonb_build_object('error', err); end if;
  b := sd_my_booking(p_id, p_pin);
  return jsonb_build_object(
    'open', jsonb_typeof(b.data -> 'selfCheckin') = 'object' and b.status in ('pending', 'confirmed') and not (b.data ? 'checkedOutAt'),
    'done', exists (select 1 from sd_checkins c where c.booking_id = b.id));
end $$;

create or replace function public.sd_checkin_upload_ok(p_name text) returns boolean
language sql stable security definer set search_path = public, storage as $$
  select exists (select 1 from public.sd_bookings b
      where b.hotel_id = split_part(p_name, '/', 1) and b.id = split_part(p_name, '/', 2)
        and jsonb_typeof(b.data -> 'selfCheckin') = 'object' and not (b.data ? 'checkedOutAt') and b.status in ('pending', 'confirmed')
        and not exists (select 1 from public.sd_checkins c where c.booking_id = b.id))
    and (select count(*) from storage.objects where bucket_id = 'sd-checkin'
         and name like split_part(p_name, '/', 1) || '/' || split_part(p_name, '/', 2) || '/%') < 12;
$$;

do $$
declare def text; nd text;
begin
  def := pg_get_functiondef('public.sd_checkin_submit(text, text, jsonb)'::regprocedure);
  nd := replace(def, 'or b.data ? ''checkedInAt'' then', 'or b.data ? ''checkedOutAt'' then');
  if nd = def then raise exception 'ไม่พบเงื่อนไข checkedInAt ใน sd_checkin_submit'; end if;
  execute nd;
end $$;

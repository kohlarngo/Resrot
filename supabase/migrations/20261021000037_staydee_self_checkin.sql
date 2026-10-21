-- ลูกค้ากรอกทะเบียนผู้เข้าพัก (บัตร/พาสปอร์ต + ลายเซ็น) เองบนมือถือ
-- เจ้าของรีสอร์ทกด "ให้ลูกค้ากรอกเอง" → เก็บ data.selfCheckin (object) ในการจอง · ปิดการกรอก = ตั้งเป็น null
-- ลูกค้าไม่ได้ล็อกอิน → ยืนยันตัวตนด้วยรหัสจอง + PIN (sd_pin_gate) · อัปโหลดรูปเข้า sd-checkin ได้เฉพาะโฟลเดอร์ของการจองที่เปิดให้กรอก
-- ข้อมูลที่ได้ลงตาราง sd_checkins เดียวกับที่เจ้าของกรอกเอง (อ่านได้เฉพาะเจ้าของรีสอร์ทนั้น — RLS เดิม)

create or replace function public.sd_checkin_status(p_id text, p_pin text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare err text := sd_pin_gate(p_id, p_pin); b sd_bookings;
begin
  if err is not null then return jsonb_build_object('error', err); end if;
  b := sd_my_booking(p_id, p_pin);
  return jsonb_build_object(
    'open', jsonb_typeof(b.data -> 'selfCheckin') = 'object' and b.status in ('pending', 'confirmed') and not (b.data ? 'checkedInAt'),
    'done', exists (select 1 from sd_checkins c where c.booking_id = b.id));
end $$;

-- อัปโหลดได้เฉพาะ <รหัสที่พัก>/<รหัสจอง>/… ของการจองที่เปิดให้กรอก ยังไม่มีทะเบียน และไม่เกิน 12 ไฟล์ต่อการจอง
create or replace function public.sd_checkin_upload_ok(p_name text) returns boolean
language sql stable security definer set search_path = public, storage as $$
  select exists (select 1 from public.sd_bookings b
      where b.hotel_id = split_part(p_name, '/', 1) and b.id = split_part(p_name, '/', 2)
        and jsonb_typeof(b.data -> 'selfCheckin') = 'object' and not (b.data ? 'checkedInAt') and b.status in ('pending', 'confirmed')
        and not exists (select 1 from public.sd_checkins c where c.booking_id = b.id))
    and (select count(*) from storage.objects where bucket_id = 'sd-checkin'
         and name like split_part(p_name, '/', 1) || '/' || split_part(p_name, '/', 2) || '/%') < 12;
$$;
create policy "sd-checkin guest upload" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'sd-checkin' and public.sd_checkin_upload_ok(name));

create or replace function public.sd_checkin_submit(p_id text, p_pin text, p_data jsonb) returns jsonb
language plpgsql security definer set search_path = public, storage as $$
declare
  err text := sd_pin_gate(p_id, p_pin); b sd_bookings; e jsonb; pre text; rules text; total int; reg jsonb; docs jsonb := '[]'::jsonb; sig text;
begin
  if err is not null then return jsonb_build_object('error', err); end if;
  b := sd_my_booking(p_id, p_pin);
  if jsonb_typeof(b.data -> 'selfCheckin') <> 'object' or b.status not in ('pending', 'confirmed') or b.data ? 'checkedInAt' then
    raise exception 'ที่พักยังไม่เปิดให้กรอกทะเบียนผู้เข้าพัก';
  end if;
  if exists (select 1 from sd_checkins where booking_id = b.id) then raise exception 'กรอกทะเบียนไว้เรียบร้อยแล้ว'; end if;
  pre := b.hotel_id || '/' || b.id || '/';
  total := greatest(1, coalesce((b.data ->> 'adults')::int, 1) + coalesce((b.data ->> 'children')::int, 0));
  if jsonb_typeof(p_data -> 'guests') <> 'array' or jsonb_array_length(p_data -> 'guests') not between 1 and total then
    raise exception 'จำนวนผู้เข้าพักไม่ถูกต้อง';
  end if;
  for e in select x from jsonb_array_elements(p_data -> 'guests') as x loop
    if length(trim(coalesce(e ->> 'name', ''))) < 2 or coalesce(e ->> 'docType', '') not in ('idcard', 'passport', 'other')
       or length(trim(coalesce(e ->> 'docNo', ''))) < 3 or length(trim(coalesce(e ->> 'nation', ''))) < 1 then
      raise exception 'ข้อมูลผู้เข้าพักไม่ครบ';
    end if;
    if e ->> 'docType' = 'idcard' and regexp_replace(e ->> 'docNo', '\D', '', 'g') !~ '^\d{13}$' then
      raise exception 'เลขบัตรประชาชนต้องมี 13 หลัก';
    end if;
    if left(coalesce(e ->> 'photo', ''), length(pre)) <> pre or not exists (select 1 from storage.objects where bucket_id = 'sd-checkin' and name = e ->> 'photo') then
      raise exception 'ไม่พบรูปเอกสาร กรุณาอัปโหลดใหม่';
    end if;
    docs := docs || jsonb_build_object('name', left(trim(e ->> 'name'), 100), 'docType', e ->> 'docType', 'docNo', left(trim(e ->> 'docNo'), 30),
      'nation', left(trim(e ->> 'nation'), 40), 'photo', e ->> 'photo');
  end loop;
  sig := p_data ->> 'signature';
  if left(coalesce(sig, ''), length(pre)) <> pre or not exists (select 1 from storage.objects where bucket_id = 'sd-checkin' and name = sig) then
    raise exception 'ไม่พบลายเซ็น กรุณาเซ็นใหม่';
  end if;
  if coalesce((p_data ->> 'consent')::boolean, false) is not true then raise exception 'ต้องติ๊กยินยอมให้เก็บข้อมูลก่อน'; end if;
  rules := nullif(trim(coalesce((select data ->> 'houseRules' from sd_hotels where id = b.hotel_id), '')), '');
  if rules is not null and coalesce((p_data ->> 'rulesAccepted')::boolean, false) is not true then raise exception 'ต้องติ๊กยอมรับกฎของรีสอร์ทก่อน'; end if;
  reg := jsonb_build_object('guests', docs, 'phone', left(trim(coalesce(p_data ->> 'phone', '')), 30), 'vehicle', left(trim(coalesce(p_data ->> 'vehicle', '')), 30),
    'signature', sig, 'consentAt', now(), 'registeredAt', now(), 'registeredBy', 'ลูกค้า (กรอกเองบนมือถือ)')
    || case when rules is not null then jsonb_build_object('rules', rules, 'rulesAcceptedAt', now()) else '{}'::jsonb end;
  insert into sd_checkins (booking_id, hotel_id, data) values (b.id, b.hotel_id, reg);
  update sd_bookings set data = data || jsonb_build_object('selfCheckinDoneAt', now()) where id = b.id;
  return jsonb_build_object('ok', true);
end $$;

grant execute on function public.sd_checkin_status(text, text) to anon, authenticated;
grant execute on function public.sd_checkin_submit(text, text, jsonb) to anon, authenticated;

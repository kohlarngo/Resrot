-- ค้นหาการจองด้วยอีเมล + เบอร์โทรที่ลูกค้ากรอกตอนจอง (ไม่ต้องจำรหัส SD... และ PIN)
-- เทียบอีเมลแบบไม่สนตัวพิมพ์ และเบอร์โทร 9 หลักท้าย (รองรับ 08x... / +668x...) · ผิดครบ 5 ครั้งต่ออีเมล → ล็อก 15 นาที (ใช้ตาราง sd_pin_attempts)
create or replace function public.sd_find_bookings(p_email text, p_phone text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_tail text := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 9);
  k text; a sd_pin_attempts; n int; res jsonb;
  bad constant text := 'ไม่พบการจอง กรุณาตรวจสอบอีเมลและเบอร์โทรที่กรอกตอนจอง';
  locked constant text := 'ลองผิดหลายครั้ง ระบบล็อกชั่วคราว กรุณารอ 15 นาทีแล้วลองใหม่';
begin
  if v_email !~ '^\S+@\S+\.\S+$' or length(v_tail) < 9 then return jsonb_build_object('error', bad); end if;
  k := 'F:' || left(v_email, 120);
  select * into a from sd_pin_attempts where id = k for update;
  if found and a.locked_until is not null then
    if a.locked_until > now() then return jsonb_build_object('error', locked); end if;
    a.fails := 0;
  end if;

  select coalesce(jsonb_agg(data order by created_at desc), '[]'::jsonb) into res from (
    select data, created_at from sd_bookings
    where lower(trim(data #>> '{guest,email}')) = v_email
      and right(regexp_replace(coalesce(data #>> '{guest,phone}', ''), '\D', '', 'g'), 9) = v_tail
    order by created_at desc limit 20) t;

  if jsonb_array_length(res) > 0 then
    delete from sd_pin_attempts where id = k;
    return res;
  end if;
  n := coalesce(a.fails, 0) + 1;
  insert into sd_pin_attempts (id, fails, locked_until, updated_at)
    values (k, n, case when n >= 5 then now() + interval '15 minutes' end, now())
    on conflict (id) do update set fails = excluded.fails, locked_until = excluded.locked_until, updated_at = now();
  return jsonb_build_object('error', case when n >= 5 then locked else bad end);
end $$;
grant execute on function public.sd_find_bookings(text, text) to anon, authenticated;

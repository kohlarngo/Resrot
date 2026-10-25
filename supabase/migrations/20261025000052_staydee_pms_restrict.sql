-- PMS (ต่อ): ข้อจำกัดการขาย (MinLOS / CTA / CTD / ปิดขาย) ตรวจฝั่งเซิร์ฟเวอร์ใน sd_create_booking

-- 3) ข้อจำกัดการขาย: เก็บที่ sd_hotels.data.restrict = [{from,to,roomId?,minLos?,cta?,ctd?,stop?}]
create or replace function public.sd_check_restrict(p_hotel text, p_room text, ci date, co date) returns void
language plpgsql stable security definer set search_path = public as $$
declare r jsonb; f date; t date; rid text; ml int;
begin
  for r in select * from jsonb_array_elements(coalesce((select data -> 'restrict' from sd_hotels where id = p_hotel), '[]'::jsonb)) loop
    begin f := (r ->> 'from')::date; t := (r ->> 'to')::date; exception when others then continue; end;
    if f is null or t is null then continue; end if;
    rid := coalesce(r ->> 'roomId', '');
    if rid <> '' and rid <> p_room then continue; end if;
    if coalesce((r ->> 'stop')::boolean, false) and ci <= t and (co - 1) >= f then
      raise exception 'ช่วงวันที่นี้ปิดรับจองชั่วคราว (%–%)', to_char(f, 'DD/MM/YYYY'), to_char(t, 'DD/MM/YYYY');
    end if;
    if coalesce((r ->> 'cta')::boolean, false) and ci between f and t then
      raise exception 'ไม่รับเช็คอินในวันที่ %', to_char(ci, 'DD/MM/YYYY');
    end if;
    if coalesce((r ->> 'ctd')::boolean, false) and co between f and t then
      raise exception 'ไม่รับเช็คเอาท์ในวันที่ %', to_char(co, 'DD/MM/YYYY');
    end if;
    ml := coalesce(nullif(r ->> 'minLos', '')::int, 0);
    if ml > 1 and ci between f and t and (co - ci) < ml then
      raise exception 'ช่วงนี้ต้องพักอย่างน้อย % คืน', ml;
    end if;
  end loop;
end $$;
revoke execute on function public.sd_check_restrict(text, text, date, date) from public, anon, authenticated;

-- ตรวจข้อจำกัดก่อนคำนวณราคาในฟังก์ชันจอง (แก้จากนิยามที่ใช้งานอยู่ ไม่คัดลอกทั้งฟังก์ชัน)
do $$
declare d text;
begin
  d := pg_get_functiondef('public.sd_create_booking(jsonb)'::regprocedure);
  if position('sd_check_restrict' in d) = 0 then
    d := replace(d, '  q := sd_price(p ->> ''hotelId''', '  perform sd_check_restrict(p ->> ''hotelId'', p ->> ''roomId'', ci, co);' || E'\n' || '  q := sd_price(p ->> ''hotelId''');
    if position('sd_check_restrict' in d) = 0 then raise exception 'ไม่พบจุดแทรกใน sd_create_booking'; end if;
    execute d;
  end if;
end $$;

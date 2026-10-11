-- โค้ดส่วนลด: จำกัดจำนวนครั้งที่ใช้ได้ทั้งหมด (null = ไม่จำกัด)
-- นับจากการจองที่ใช้โค้ดนี้และยังไม่ถูกยกเลิก — ตรวจทั้งตอนกรอกโค้ดและตอนสร้างการจอง (sd_create_booking เรียก sd_check_coupon)
alter table public.sd_coupons add column if not exists max_uses integer check (max_uses is null or max_uses > 0);

create or replace function public.sd_check_coupon(p_code text, p_amount numeric, p_hotel text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c sd_coupons; off float8; used integer;
begin
  select * into c from sd_coupons where code = upper(trim(p_code)) and active
    and (owner_id is null or owner_id = (select owner_id from sd_hotels where id = p_hotel));
  if not found then return jsonb_build_object('error', 'ไม่พบโค้ดส่วนลดนี้ หรือใช้กับที่พักนี้ไม่ได้'); end if;
  if c.max_uses is not null then
    select count(*) into used from sd_bookings where status <> 'cancelled' and data -> 'price' ->> 'couponCode' = c.code;
    if used >= c.max_uses then return jsonb_build_object('error', 'โค้ดนี้ถูกใช้ครบจำนวนครั้งแล้ว'); end if;
  end if;
  if p_amount < c.min_amount then
    return jsonb_build_object('error', 'ยอดจองขั้นต่ำ ฿' || to_char(c.min_amount, 'FM999,999,999') || ' สำหรับโค้ดนี้');
  end if;
  off := case when c.type = 'percent' then floor(p_amount::float8 * c.value::float8 / 100 + 0.5) else c.value::float8 end;
  return jsonb_build_object(
    'coupon', jsonb_build_object('code', c.code, 'type', c.type, 'value', c.value, 'min', c.min_amount, 'desc', c.description, 'active', c.active,
      'maxUses', c.max_uses, 'left', case when c.max_uses is null then null else greatest(0, c.max_uses - coalesce(used, 0)) end),
    'off', least(off, p_amount::float8));
end $$;

-- โค้ดสาธารณะของแพลตฟอร์ม (ไม่ผูกเจ้าของ) สำหรับการ์ดโปรโมชั่นหน้าแรก — ไม่เปิดเผยโค้ดของเจ้าของรีสอร์ท
create or replace function public.sd_public_coupons() returns setof jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('code', c.code, 'type', c.type, 'value', c.value, 'min', c.min_amount, 'desc', c.description, 'image', c.image,
    'maxUses', c.max_uses,
    'left', case when c.max_uses is null then null else greatest(0, c.max_uses - (select count(*) from sd_bookings b where b.status <> 'cancelled' and b.data -> 'price' ->> 'couponCode' = c.code)) end)
  from sd_coupons c where c.active and c.owner_id is null;
$$;
grant execute on function public.sd_public_coupons() to anon, authenticated;

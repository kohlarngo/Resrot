-- ยกเลิกภาษีและค่าธรรมเนียม 17.7% (ค่าบริการ 10% + VAT 7%) ในการจองใหม่
-- ต้องตรงกับ TAX_RATE = 0 ใน js/store.js · การจองเดิมไม่ถูกแก้ (ยังเก็บภาษีเดิมไว้ในรายการ)
do $$
declare def text; nd text;
begin
  def := pg_get_functiondef('public.sd_create_booking(jsonb)'::regprocedure);
  nd := replace(def, '0.177::float8', '0::float8');
  if nd = def then raise exception 'ไม่พบอัตราภาษี 0.177 ใน sd_create_booking'; end if;
  execute nd;
end $$;

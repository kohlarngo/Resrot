-- ราคาตามวัน: เจ้าของตั้งราคาเป็นช่วงวันที่ (rooms[].priceRules = [{from,to,price}], กฎหลังสุดชนะ)
-- ลำดับ: ราคาตามวัน > ราคาคืนศุกร์–เสาร์ (weekendPrice) > ราคาปกติ — ต้องตรงกับ DB.nightPrice ใน store.js
do $$
declare def text; nd text;
begin
  def := pg_get_functiondef('public.sd_price(text,text,text,date,date,integer)'::regprocedure);
  nd := replace(def, 'o := floor((case when extract(dow from d) in (5, 6) and coalesce((r ->> ''weekendPrice'')::float8, 0) > 0 then (r ->> ''weekendPrice'')::float8 else (r ->> ''price'')::float8 end) + 0.5);',
    'o := floor(coalesce((select (x.v ->> ''price'')::float8 from jsonb_array_elements(coalesce(r -> ''priceRules'', ''[]''::jsonb)) with ordinality as x(v, n) where x.v ->> ''from'' ~ ''^\d{4}-\d\d-\d\d$'' and x.v ->> ''to'' ~ ''^\d{4}-\d\d-\d\d$'' and d between (x.v ->> ''from'')::date and (x.v ->> ''to'')::date and coalesce((x.v ->> ''price'')::float8, 0) > 0 order by x.n desc limit 1), case when extract(dow from d) in (5, 6) and coalesce((r ->> ''weekendPrice'')::float8, 0) > 0 then (r ->> ''weekendPrice'')::float8 else (r ->> ''price'')::float8 end) + 0.5);');
  if nd = def then raise exception 'ไม่พบบรรทัดคิดราคาใน sd_price'; end if;
  execute nd;
end $$;

-- ราคาตามวันในสัปดาห์: rooms[].dayPrices = {"0":ราคา,...,"6":ราคา} (0=อาทิตย์) · ลำดับ: ช่วงวันที่ > dayPrices > weekendPrice > ราคาปกติ
do $$
declare def text; nd text;
begin
  def := pg_get_functiondef('public.sd_price(text,text,text,date,date,integer)'::regprocedure);
  nd := replace(def, 'limit 1), case when extract(dow from d) in (5, 6)',
    'limit 1), nullif((r -> ''dayPrices'' ->> (extract(dow from d)::int)::text)::float8, 0), case when extract(dow from d) in (5, 6)');
  if nd = def then raise exception 'ไม่พบตำแหน่งแทรก dayPrices ใน sd_price'; end if;
  execute nd;
end $$;

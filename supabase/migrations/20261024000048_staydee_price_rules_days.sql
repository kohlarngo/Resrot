-- ราคาตามวัน: กฎกำหนดเฉพาะวันในสัปดาห์ได้ (priceRules[].days = [0..6], 0=อาทิตย์ · ไม่ใส่ = ทุกวัน)
do $$
declare def text; nd text;
begin
  def := pg_get_functiondef('public.sd_price(text,text,text,date,date,integer)'::regprocedure);
  nd := replace(def, 'and d between (x.v ->> ''from'')::date and (x.v ->> ''to'')::date and',
    'and d between (x.v ->> ''from'')::date and (x.v ->> ''to'')::date and (jsonb_typeof(x.v -> ''days'') is distinct from ''array'' or (x.v -> ''days'') @> to_jsonb(extract(dow from d)::int)) and');
  if nd = def then raise exception 'ไม่พบเงื่อนไขช่วงวันใน sd_price'; end if;
  execute nd;
end $$;

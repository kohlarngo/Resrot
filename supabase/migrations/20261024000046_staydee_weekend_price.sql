-- ราคาคืนศุกร์–เสาร์: เจ้าของตั้งเองได้ที่ห้องพัก (rooms[].weekendPrice) · ไม่ตั้ง = ราคาเดียวกันทุกคืน (เดิมบวก 15% อัตโนมัติ)
do $$
declare def text; nd text;
begin
  def := pg_get_functiondef('public.sd_price(text,text,text,date,date,integer)'::regprocedure);
  nd := replace(def, 'o := floor((r ->> ''price'')::float8 * (case when extract(dow from d) in (5, 6) then 1.15::float8 else 1::float8 end) + 0.5);',
    'o := floor((case when extract(dow from d) in (5, 6) and coalesce((r ->> ''weekendPrice'')::float8, 0) > 0 then (r ->> ''weekendPrice'')::float8 else (r ->> ''price'')::float8 end) + 0.5);');
  if nd = def then raise exception 'ไม่พบบรรทัดคิดราคาใน sd_price'; end if;
  execute nd;
end $$;

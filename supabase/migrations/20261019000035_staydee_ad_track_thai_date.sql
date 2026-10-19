-- นับการแสดงผล/คลิกโฆษณาตามวันที่เวลาไทย (เดิมใช้ current_date แบบ UTC)
create or replace function public.sd_ad_track(p_id uuid, p_what text)
 returns void language plpgsql security definer set search_path to 'public' as $function$
declare d date := (now() at time zone 'Asia/Bangkok')::date;
begin
  if p_what = 'view' then
    update sd_ads set views = views + 1 where id = p_id and active and d between start_date and end_date;
  elsif p_what = 'click' then
    update sd_ads set clicks = clicks + 1 where id = p_id and active and d between start_date and end_date;
  end if;
end $function$;

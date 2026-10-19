-- ปรับการแสดงรูปโฆษณา: { mode: 'cover'|'contain', zoom: 1-3, x: 0-100, y: 0-100 }
alter table public.sd_ads add column if not exists fit jsonb not null default '{}'::jsonb;

create or replace function public.sd_public_ads()
 returns setof jsonb language sql stable security definer set search_path to 'public' as $function$
  select jsonb_build_object('id', a.id, 'kind', a.kind, 'advertiser', a.advertiser, 'hotelId', a.hotel_id, 'title', a.title, 'body', a.body,
    'image', a.image, 'link', a.link, 'phone', a.phone, 'line', a.line, 'fit', a.fit)
  from sd_ads a
  where a.active and current_date between a.start_date and a.end_date
    and (a.hotel_id is null or exists (select 1 from sd_hotels h where h.id = a.hotel_id and coalesce((h.data ->> 'active')::boolean, true) and not (h.data ? 'banned')))
  order by a.created_at;
$function$;

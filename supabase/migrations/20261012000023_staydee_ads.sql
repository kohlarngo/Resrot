-- โฆษณาบนเว็บ: 3 ตำแหน่ง
--   banner   = แบนเนอร์หน้าแรก (ใต้ช่องค้นหา)
--   featured = รีสอร์ทแนะนำ: ขึ้นอันดับบนสุดของผลค้นหา + ส่วน "รีสอร์ทแนะนำ" หน้าแรก (ผูกกับ hotel_id)
--   card     = การ์ดโฆษณาแทรกในรายการผลค้นหา และหน้ารายละเอียดที่พัก (ธุรกิจภายนอกหรือรีสอร์ท)
-- ราคาที่ตกลงกันนอกระบบ (fee/paid/note) เป็นข้อมูลภายใน — ลูกค้าอ่านผ่าน sd_public_ads() ซึ่งไม่ส่งฟิลด์เหล่านี้
create table public.sd_ads (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('banner', 'featured', 'card')),
  advertiser text not null default '',
  hotel_id text references public.sd_hotels (id) on delete cascade,
  title text not null default '',
  body text not null default '',
  image text not null default '',
  link text not null default '',
  phone text not null default '',
  line text not null default '',
  start_date date not null default current_date,
  end_date date not null default current_date + 30,
  active boolean not null default true,
  fee numeric not null default 0,
  paid boolean not null default false,
  note text not null default '',
  views integer not null default 0,
  clicks integer not null default 0,
  created_at timestamptz not null default now(),
  check (end_date >= start_date),
  check (kind <> 'featured' or hotel_id is not null)
);
alter table public.sd_ads enable row level security;

insert into public.sd_role_perms (role, perm) values ('admin', 'ads.manage') on conflict do nothing;

-- ตารางเข้าถึงได้เฉพาะผู้มีสิทธิ์ ads.manage (ลูกค้าอ่านผ่านฟังก์ชันด้านล่าง)
create policy "sd_ads manage" on public.sd_ads for all to authenticated
  using (sd_can('ads.manage')) with check (sd_can('ads.manage'));

create or replace function public.sd_public_ads() returns setof jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', a.id, 'kind', a.kind, 'advertiser', a.advertiser, 'hotelId', a.hotel_id, 'title', a.title, 'body', a.body,
    'image', a.image, 'link', a.link, 'phone', a.phone, 'line', a.line)
  from sd_ads a
  where a.active and current_date between a.start_date and a.end_date
    and (a.hotel_id is null or exists (select 1 from sd_hotels h where h.id = a.hotel_id and coalesce((h.data ->> 'active')::boolean, true) and not (h.data ? 'banned')))
  order by a.created_at;
$$;
grant execute on function public.sd_public_ads() to anon, authenticated;

-- นับการแสดงผล/การคลิก (เฉพาะโฆษณาที่กำลังแสดงอยู่)
create or replace function public.sd_ad_track(p_id uuid, p_what text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_what = 'view' then
    update sd_ads set views = views + 1 where id = p_id and active and current_date between start_date and end_date;
  elsif p_what = 'click' then
    update sd_ads set clicks = clicks + 1 where id = p_id and active and current_date between start_date and end_date;
  end if;
end $$;
grant execute on function public.sd_ad_track(uuid, text) to anon, authenticated;

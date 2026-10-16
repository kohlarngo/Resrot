-- ซิงก์ปฏิทิน iCal จาก Agoda / Booking.com ฯลฯ → ปิดห้องอัตโนมัติ
-- ตาราง sd_ical_feeds (ลิงก์ปฏิทินต่อประเภทห้อง) + ฟังก์ชัน sd_ical_apply (เรียกได้เฉพาะ service role จาก Edge Function sd-ical-sync) + pg_cron ทุก 20 นาที
-- สวิตช์เปิด-ปิดอยู่ที่ sd_kv.flags.icalSync (นักพัฒนาเปิด-ปิดที่หน้า "ฟีเจอร์ & โหมดระบบ") — ค่าเริ่มต้นปิด
create table public.sd_ical_feeds (
  id uuid primary key default gen_random_uuid(),
  hotel_id text not null references public.sd_hotels(id) on delete cascade,
  room_id text not null,
  channel text not null check (char_length(channel) between 1 and 40),
  url text not null check (url ~* '^https://' and char_length(url) <= 1000),
  active boolean not null default true,
  last_sync_at timestamptz,
  last_status text,
  last_error text,
  last_count int not null default 0,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index sd_ical_feeds_hotel on public.sd_ical_feeds(hotel_id);
alter table public.sd_ical_feeds enable row level security;

create policy "sd_ical_feeds all" on public.sd_ical_feeds for all to authenticated
  using (sd_is_admin() or (sd_can('inventory') and sd_owns_hotel(hotel_id)))
  with check (sd_is_admin() or (sd_can('inventory') and sd_owns_hotel(hotel_id)));

-- นำเหตุการณ์จาก iCal เข้าเป็นรายการปิดห้อง (source = 'external')
create or replace function public.sd_ical_apply(p_feed uuid, p_events jsonb, p_error text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  f sd_ical_feeds; h jsonb; r jsonb; oid uuid; ev jsonb; euid text; ci date; co date; summ text;
  ex sd_bookings; d date; booked int; conflict boolean; bid text; bpin text; b jsonb;
  today date := (now() at time zone 'Asia/Bangkok')::date;
  added int := 0; released int := 0; seen text[] := '{}'; rec sd_bookings;
begin
  select * into f from sd_ical_feeds where id = p_feed;
  if not found then raise exception 'ไม่พบฟีด'; end if;
  if p_error is not null then
    update sd_ical_feeds set last_sync_at = now(), last_status = 'error', last_error = left(p_error, 300) where id = p_feed;
    return jsonb_build_object('ok', false);
  end if;
  select data, owner_id into h, oid from sd_hotels where id = f.hotel_id;
  select x into r from jsonb_array_elements(coalesce(h -> 'rooms', '[]'::jsonb)) x where x ->> 'id' = f.room_id;
  if r is null then
    update sd_ical_feeds set last_sync_at = now(), last_status = 'error', last_error = 'ไม่พบห้องพักนี้ (อาจถูกลบแล้ว)' where id = p_feed;
    return jsonb_build_object('ok', false);
  end if;
  perform pg_advisory_xact_lock(hashtext('sd_room:' || f.room_id));

  for ev in select * from jsonb_array_elements(coalesce(p_events, '[]'::jsonb)) loop
    euid := left(ev ->> 'uid', 200); summ := left(coalesce(ev ->> 'summary', ''), 60);
    begin ci := (ev ->> 'start')::date; co := (ev ->> 'end')::date; exception when others then ci := null; end;
    if euid is null or ci is null or co is null or co <= ci or co <= today or co - ci > 120 or ci > today + 540 then continue; end if;
    seen := seen || euid;
    select * into ex from sd_bookings
      where hotel_id = f.hotel_id and data ->> 'icalFeed' = f.id::text and data ->> 'icalUid' = euid
      order by created_at desc limit 1;
    if found then
      if ex.status = 'cancelled' then continue; end if;  -- เจ้าของเปิดห้องคืนเองแล้ว หรือถูกยกเลิกไปแล้ว: ไม่สร้างซ้ำ
      if ex.check_in = ci and ex.check_out = co then continue; end if;
      update sd_bookings set data = data || jsonb_build_object('status', 'cancelled', 'cancelledBy', 'ซิงก์ iCal (วันที่เปลี่ยน)', 'cancelledAt', now()) where id = ex.id;
      released := released + 1;
    end if;
    conflict := false;
    for d in select generate_series(ci, co - 1, interval '1 day')::date loop
      select coalesce(sum(x.qty), 0) into booked from sd_bookings x
        where x.room_id = f.room_id and x.status <> 'cancelled' and d >= x.check_in and d < x.check_out;
      if booked + 1 > (r ->> 'total')::int then conflict := true; exit; end if;
    end loop;
    loop
      bid := 'IC' || right((extract(epoch from clock_timestamp()) * 1000)::bigint::text, 6) || (100 + floor(random() * 900))::int::text;
      exit when not exists (select 1 from sd_bookings where id = bid);
    end loop;
    bpin := (1000 + floor(random() * 9000))::int::text;
    b := jsonb_build_object(
      'hotelId', f.hotel_id, 'hotelName', h ->> 'name', 'ownerId', oid, 'roomId', f.room_id, 'roomName', r ->> 'name',
      'offer', jsonb_build_object('id', 'ext', 'name', 'ซิงก์อัตโนมัติ', 'breakfast', false, 'freeCancel', false, 'payAtHotel', false),
      'qty', 1, 'checkIn', ci, 'checkOut', co, 'nights', co - ci, 'adults', 1, 'children', 0, 'rooms', 1,
      'guest', jsonb_build_object('firstName', coalesce(nullif(summ, ''), f.channel), 'lastName', '', 'email', '', 'phone', '', 'country', '', 'arrival', '',
        'note', 'ซิงก์อัตโนมัติจาก iCal ' || f.channel, 'requests', '[]'::jsonb),
      'payment', jsonb_build_object('method', 'hotel', 'paid', true, 'paidAt', now(), 'external', true),
      'price', jsonb_build_object('orig', 0, 'room', 0, 'member', 0, 'coupon', 0, 'tax', 0, 'total', 0),
      'status', 'confirmed', 'createdAt', now(), 'source', 'external', 'channel', f.channel,
      'auto', true, 'icalFeed', f.id::text, 'icalUid', euid, 'conflict', conflict);
    insert into sd_bookings (id, pin, user_id, check_in, check_out, data) values (bid, bpin, null, ci, co, b);
    added := added + 1;
  end loop;

  -- รายการที่เคยซิงก์เข้ามาแต่หายไปจากฟีด (ลูกค้ายกเลิกที่ต้นทาง) → เปิดห้องคืน เฉพาะที่ยังไม่จบ
  for rec in select * from sd_bookings
    where hotel_id = f.hotel_id and data ->> 'icalFeed' = f.id::text and status <> 'cancelled' and check_out > today
      and not ((data ->> 'icalUid') = any (seen)) loop
    update sd_bookings set data = data || jsonb_build_object('status', 'cancelled', 'cancelledBy', 'ซิงก์ iCal (หายจากต้นทาง)', 'cancelledAt', now()) where id = rec.id;
    released := released + 1;
  end loop;

  update sd_ical_feeds set last_sync_at = now(), last_status = 'ok', last_error = null,
    last_count = (select count(*) from sd_bookings where hotel_id = f.hotel_id and data ->> 'icalFeed' = f.id::text and status <> 'cancelled' and check_out > today)
    where id = p_feed;
  return jsonb_build_object('ok', true, 'added', added, 'released', released);
end $$;
revoke all on function public.sd_ical_apply(uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.sd_ical_apply(uuid, jsonb, text) to service_role;

select cron.schedule('sd-ical-sync', '*/20 * * * *', $cron$
  select net.http_post(
    url := 'https://whtomiamqwhhdrllibix.supabase.co/functions/v1/sd-ical-sync',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'sd_cron_secret')),
    body := '{}'::jsonb);
$cron$);

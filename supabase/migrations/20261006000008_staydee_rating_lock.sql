-- คะแนนรีวิว / จำนวนรีวิวของที่พักมาจากรีวิวจริงเท่านั้น — เจ้าของรีสอร์ทตั้งเองไม่ได้
create or replace function public.sd_hotels_sync() returns trigger
language plpgsql security definer set search_path = public as $$
declare trusted boolean := sd_privileged() or sd_is_admin() or coalesce(current_setting('sd.trusted', true), '') = 'on';
begin
  if tg_op = 'UPDATE' and not trusted then
    new.owner_id := old.owner_id;
    new.data := new.data || jsonb_build_object('rating', old.data -> 'rating', 'reviews', old.data -> 'reviews');
  elsif tg_op = 'INSERT' and not trusted then
    new.data := new.data || jsonb_build_object('rating', 0, 'reviews', 0);
  end if;
  new.data := new.data || jsonb_build_object('ownerId', new.owner_id);
  new.updated_at := now();
  return new;
end $$;
revoke execute on function public.sd_hotels_sync() from public, anon, authenticated;

-- รีวิวอัปเดตคะแนนที่พักได้ (ผ่าน flag sd.trusted)
create or replace function public.sd_add_review(p_booking text, p_score numeric, p_title text, p_text text, p_trip text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare b sd_bookings; nm text; today date := (now() at time zone 'Asia/Bangkok')::date; rid bigint;
begin
  if auth.uid() is null then raise exception 'กรุณาเข้าสู่ระบบก่อนเขียนรีวิว'; end if;
  select * into b from sd_bookings where id = p_booking and user_id = auth.uid();
  if not found then raise exception 'ไม่พบการจองนี้ในบัญชีของคุณ'; end if;
  if b.status = 'cancelled' or not (b.check_out <= today or b.data ? 'checkedOutAt') then raise exception 'รีวิวได้หลังเข้าพักเสร็จสิ้นแล้วเท่านั้น'; end if;
  if exists (select 1 from sd_reviews where booking_id = b.id) then raise exception 'คุณรีวิวการจองนี้แล้ว'; end if;
  if p_score is null or p_score < 1 or p_score > 10 then raise exception 'คะแนนต้องอยู่ระหว่าง 1-10'; end if;
  if length(trim(coalesce(p_title, ''))) = 0 or length(trim(coalesce(p_text, ''))) = 0 then raise exception 'กรุณากรอกหัวข้อและรายละเอียด'; end if;
  select coalesce(nullif(name, ''), b.data #>> '{guest,firstName}') into nm from sd_profiles where id = auth.uid();
  insert into sd_reviews (booking_id, hotel_id, user_id, name, trip, score, title, text, room)
  values (b.id, b.hotel_id, auth.uid(), left(coalesce(nm, ''), 60), left(coalesce(p_trip, ''), 40), round(p_score, 1), left(trim(p_title), 120), left(trim(p_text), 2000), coalesce(b.data ->> 'roomName', ''))
  returning id into rid;
  perform set_config('sd.trusted', 'on', true);
  update sd_hotels set data = data || jsonb_build_object(
      'rating', round(((coalesce((data ->> 'rating')::numeric, 0) * coalesce((data ->> 'reviews')::numeric, 0) + round(p_score, 1)) / (coalesce((data ->> 'reviews')::numeric, 0) + 1)), 1),
      'reviews', coalesce((data ->> 'reviews')::int, 0) + 1)
    where id = b.hotel_id;
  perform set_config('sd.trusted', 'off', true);
  return jsonb_build_object('id', rid);
end $$;

create or replace function public.sd_delete_review(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare r sd_reviews;
begin
  if not sd_can('reviews.manage') then raise exception 'ไม่มีสิทธิ์ลบรีวิว'; end if;
  delete from sd_reviews where id = p_id returning * into r;
  if not found then return; end if;
  perform set_config('sd.trusted', 'on', true);
  update sd_hotels set data = data || case when (data ->> 'reviews')::int > 1 then jsonb_build_object(
      'rating', round(least(10, greatest(0, ((data ->> 'rating')::numeric * (data ->> 'reviews')::numeric - r.score) / ((data ->> 'reviews')::numeric - 1))), 1),
      'reviews', (data ->> 'reviews')::int - 1) else jsonb_build_object('rating', 0, 'reviews', 0) end
    where id = r.hotel_id;
  perform set_config('sd.trusted', 'off', true);
end $$;
revoke execute on function public.sd_add_review(text, numeric, text, text, text), public.sd_delete_review(bigint) from public, anon;
grant execute on function public.sd_add_review(text, numeric, text, text, text), public.sd_delete_review(bigint) to authenticated;

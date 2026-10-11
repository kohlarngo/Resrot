-- แบนรีสอร์ท: เก็บใน sd_hotels.data.banned = { at, byId, byName, reason, until (null = ถาวร), prevActive }
-- เฉพาะผู้ดูแลแพลตฟอร์ม (admin) / ระดับสูงเท่านั้นที่ตั้งหรือล้างค่านี้ได้ — เจ้าของแก้เองหรือเปิดขายกลับเองไม่ได้
create or replace function public.sd_hotels_ban_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not (sd_privileged() or sd_is_admin()) then
    if tg_op = 'UPDATE' and old.data ? 'banned' and (coalesce(old.data -> 'banned' ->> 'until', '') = '' or (old.data -> 'banned' ->> 'until')::timestamptz > now()) then
      new.data := new.data || jsonb_build_object('banned', old.data -> 'banned', 'active', false);
    else
      new.data := new.data - 'banned';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists sd_hotels_ban on public.sd_hotels;
create trigger sd_hotels_ban before insert or update on public.sd_hotels for each row execute function public.sd_hotels_ban_guard();
revoke execute on function public.sd_hotels_ban_guard() from public, anon, authenticated;

-- แบนแบบมีกำหนด: ครบเวลาแล้วปลดให้อัตโนมัติ (คืนสถานะเปิด/ปิดขายเดิมที่เจ้าของตั้งไว้) — รันทุก 5 นาที
create or replace function public.sd_expire_bans() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  with u as (
    update sd_hotels set data = (data - 'banned') || jsonb_build_object('active', coalesce((data -> 'banned' ->> 'prevActive')::boolean, true))
    where coalesce(data -> 'banned' ->> 'until', '') <> '' and (data -> 'banned' ->> 'until')::timestamptz <= now() returning 1)
  select count(*) into n from u;
  return n;
end $$;
revoke execute on function public.sd_expire_bans() from public, anon, authenticated;
do $$ begin
  create extension if not exists pg_cron;
  perform cron.schedule('sd-expire-bans', '*/5 * * * *', 'select public.sd_expire_bans()');
exception when others then raise notice 'ตั้ง pg_cron ไม่สำเร็จ: % — ให้รัน select public.sd_expire_bans(); เองเป็นระยะ', sqlerrm;
end $$;

-- การจองตัวอย่าง (บัญชีทดลอง / ข้อมูลฝึกของเจ้าของใหม่) ต้องไม่ส่งแจ้งเตือนจริง (LINE / อีเมล) ไปหาเจ้าของ
create or replace function public.sd_notify_booking()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'vault'
as $function$
declare ev text; oid text := new.data ->> 'ownerId';
begin
  if oid is null or oid = '' then return new; end if;
  if new.data ? 'practice' or new.data ->> 'demo' = 'true' then return new; end if;
  if exists (select 1 from sd_hotels h where h.id = new.data ->> 'hotelId' and (h.data ->> 'practice' = 'true' or h.data ->> 'demo' = 'true')) then return new; end if;
  if tg_op = 'INSERT' then
    ev := 'new';
  else
    if coalesce(old.data #>> '{payment,slip}', '') = '' and coalesce(new.data #>> '{payment,slip}', '') <> '' then ev := 'slip';
    elsif coalesce(old.data #>> '{cancelReq,status}', '') <> 'pending' and new.data #>> '{cancelReq,status}' = 'pending' then ev := 'cancel';
    elsif not (old.data ? 'selfCheckinDoneAt') and new.data ? 'selfCheckinDoneAt' then ev := 'checkin';
    end if;
  end if;
  if ev is null then return new; end if;
  if auth.uid()::text = oid then return new; end if;
  begin
    perform net.http_post(
      url := 'https://whtomiamqwhhdrllibix.supabase.co/functions/v1/sd-notify',
      headers := jsonb_build_object('Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'sd_cron_secret')),
      body := jsonb_build_object('event', ev, 'booking_id', new.id));
  exception when others then
    raise warning 'sd_notify_booking: %', sqlerrm;
  end;
  return new;
end $function$;

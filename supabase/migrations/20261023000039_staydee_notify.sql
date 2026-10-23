-- แจ้งเตือนเจ้าของรีสอร์ททาง Telegram (บอทของเจ้าของเอง) + Web Push เมื่อ: จองใหม่ · ลูกค้าส่งสลิป · ลูกค้าขอยกเลิก · ลูกค้ากรอกเช็คอินเอง
-- ทริกเกอร์บน sd_bookings → pg_net เรียก Edge Function `sd-notify` (ยืนยันตัวด้วยรหัสลับ sd_cron_secret ใน Vault เหมือน sd-checkin-purge)
-- ถ้าส่งแจ้งเตือนพัง การจองต้องไม่พังตาม (จับ exception ทุกกรณี)

-- อุปกรณ์ Web Push: 1 แถว = 1 อุปกรณ์
create table public.sd_notify_subs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.sd_profiles (id) on delete cascade,
  kind text not null check (kind = 'webpush'),
  endpoint text not null,            -- URL ของ push service
  keys jsonb not null default '{}'::jsonb, -- {p256dh, auth}
  label text not null default '',
  created_at timestamptz not null default now(),
  unique (kind, endpoint)
);
create index sd_notify_subs_owner_idx on public.sd_notify_subs (owner_id);
alter table public.sd_notify_subs enable row level security;
create policy "sd_notify_subs read own" on public.sd_notify_subs for select to authenticated using (owner_id = auth.uid());
create policy "sd_notify_subs delete own" on public.sd_notify_subs for delete to authenticated using (owner_id = auth.uid());
create policy "sd_notify_subs insert webpush" on public.sd_notify_subs for insert to authenticated
  with check (owner_id = auth.uid() and kind = 'webpush' and endpoint like 'https://%' and exists (select 1 from sd_profiles p where p.id = auth.uid() and p.role = 'owner'));

-- เลือกว่าจะรับแจ้งเตือนเรื่องอะไร (ไม่มีแถว = รับทุกเรื่อง)
create table public.sd_notify_prefs (
  owner_id uuid primary key references public.sd_profiles (id) on delete cascade,
  prefs jsonb not null default '{"new": true, "slip": true, "cancel": true, "checkin": true}'::jsonb
);
alter table public.sd_notify_prefs enable row level security;
create policy "sd_notify_prefs own" on public.sd_notify_prefs for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Telegram: เจ้าของสร้างบอทเอง (@BotFather) แล้ววาง token ในหน้าเว็บ → Edge Function ตรวจ + หาแชตให้
-- ไม่มี policy = เข้าถึงได้เฉพาะ service_role (token ไม่ถูกส่งกลับไปที่เบราว์เซอร์) · เจ้าของดูสถานะ/ยกเลิกผ่าน RPC ด้านล่าง
create table public.sd_notify_tg (
  owner_id uuid primary key references public.sd_profiles (id) on delete cascade,
  bot_token text not null,
  bot_name text not null default '',
  chat_id text,
  chat_label text not null default '',
  created_at timestamptz not null default now()
);
alter table public.sd_notify_tg enable row level security;

create function public.sd_notify_tg_status() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((select jsonb_build_object('bot', bot_name, 'connected', chat_id is not null, 'chat', chat_label) from sd_notify_tg where owner_id = auth.uid()), '{}'::jsonb);
$$;
create function public.sd_notify_tg_remove() returns void
language sql security definer set search_path = public as $$
  delete from sd_notify_tg where owner_id = auth.uid();
$$;
revoke execute on function public.sd_notify_tg_status(), public.sd_notify_tg_remove() from public, anon;
grant execute on function public.sd_notify_tg_status(), public.sd_notify_tg_remove() to authenticated;

-- ทริกเกอร์: ตัดสินว่าเกิดเหตุการณ์อะไร แล้วเรียก Edge Function
create function public.sd_notify_booking() returns trigger
language plpgsql security definer set search_path = public, vault as $$
declare ev text; oid text := new.data ->> 'ownerId';
begin
  if oid is null or oid = '' then return new; end if;
  if tg_op = 'INSERT' then
    ev := 'new';
  else
    if coalesce(old.data #>> '{payment,slip}', '') = '' and coalesce(new.data #>> '{payment,slip}', '') <> '' then ev := 'slip';
    elsif coalesce(old.data #>> '{cancelReq,status}', '') <> 'pending' and new.data #>> '{cancelReq,status}' = 'pending' then ev := 'cancel';
    elsif not (old.data ? 'selfCheckinDoneAt') and new.data ? 'selfCheckinDoneAt' then ev := 'checkin';
    end if;
  end if;
  if ev is null then return new; end if;
  if auth.uid()::text = oid then return new; end if; -- เจ้าของบันทึกเอง ไม่ต้องแจ้งตัวเอง
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
end $$;
revoke execute on function public.sd_notify_booking() from public, anon, authenticated;

create trigger sd_bookings_notify after insert or update of data on public.sd_bookings
  for each row execute function public.sd_notify_booking();

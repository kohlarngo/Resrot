-- ความปลอดภัยบัญชีรับเงิน: เปลี่ยนพร้อมเพย์ / บัญชีธนาคารได้เฉพาะผ่าน Edge Function sd-payout (ยืนยัน OTP อีเมล + รหัสผ่าน) เท่านั้น
--  · trigger กันการแก้ sd_profiles.payout โดยตรงจากฝั่งผู้ใช้ (แม้มีเซสชัน / token ของเจ้าของ) — ตั้งค่าครั้งแรก (ยังว่างอยู่) ทำได้ตามปกติ
--  · sd_payout_history เก็บประวัติเดิม → ใหม่ (ซ่อนเลขบางส่วน) เจ้าของอ่านของตัวเองได้ · เขียนได้เฉพาะ service role
create or replace function public.sd_payout_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.payout is distinct from old.payout
     and coalesce(auth.role(), '') in ('authenticated', 'anon')
     and coalesce(old.payout, '{}'::jsonb) <> '{}'::jsonb then
    raise exception 'เปลี่ยนบัญชีรับเงินต้องยืนยันตัวตน (OTP อีเมล) ที่หน้า "บัญชีรับเงิน"';
  end if;
  return new;
end $$;
revoke execute on function public.sd_payout_guard() from public, anon, authenticated;
create trigger sd_profiles_payout_guard before update of payout on public.sd_profiles
  for each row execute function public.sd_payout_guard();

create table public.sd_payout_history (
  id bigint generated always as identity primary key,
  owner_id uuid not null references public.sd_profiles (id) on delete cascade,
  at timestamptz not null default now(),
  old_masked jsonb not null default '{}',
  new_masked jsonb not null default '{}'
);
create index sd_payout_history_owner on public.sd_payout_history (owner_id, at desc);
alter table public.sd_payout_history enable row level security;
create policy "sd_payout_history read" on public.sd_payout_history for select to authenticated
  using (owner_id = (select auth.uid()) or sd_is_admin() or sd_can('audit.view'));

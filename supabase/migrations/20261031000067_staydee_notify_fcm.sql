-- แจ้งเตือนเข้าแอปมือถือ (Android) ผ่าน Firebase Cloud Messaging: ใช้ตารางอุปกรณ์เดิม sd_notify_subs เพิ่ม kind = 'fcm' (endpoint = FCM token)
alter table public.sd_notify_subs drop constraint if exists sd_notify_subs_kind_check;
alter table public.sd_notify_subs add constraint sd_notify_subs_kind_check check (kind in ('webpush', 'fcm'));
create policy "sd_notify_subs insert fcm" on public.sd_notify_subs for insert to authenticated
  with check (owner_id = auth.uid() and kind = 'fcm' and length(endpoint) between 20 and 4096 and exists (select 1 from sd_profiles p where p.id = auth.uid() and p.role = 'owner'));

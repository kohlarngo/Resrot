-- กลับมามีบทบาทนักพัฒนา (dev.html): ตั้งค่าเว็บไซต์ + เครื่องมือเทคนิค ย้ายออกจากผู้ดูแลแพลตฟอร์ม
alter table public.sd_profiles drop constraint sd_profiles_role_check;
alter table public.sd_profiles add constraint sd_profiles_role_check check (role in ('owner', 'admin', 'dev', 'user'));

delete from public.sd_role_perms where role = 'admin' and perm in ('settings.business', 'dev.console', 'flags.edit');
insert into public.sd_role_perms (role, perm)
select 'dev', p from unnest(array['settings.business', 'dev.console', 'flags.edit']) p
on conflict do nothing;

create or replace function public.sd_is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from sd_profiles where id = auth.uid() and active and (role in ('admin', 'dev') or (role = 'owner' and owner_status = 'approved')));
$$;

update public.sd_profiles set role = 'dev', name = 'ทีมนักพัฒนา' where email = 'dev@staydee.com';
update public.sd_profiles set role = 'dev', name = 'นักพัฒนา (ทดลอง)' where email = 'dev.demo@example.com';

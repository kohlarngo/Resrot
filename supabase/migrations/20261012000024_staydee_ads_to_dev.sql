-- การจัดการโฆษณาเป็นของนักพัฒนา (dev) ไม่ใช่ผู้ดูแลแพลตฟอร์ม (admin)
delete from public.sd_role_perms where role = 'admin' and perm = 'ads.manage';
insert into public.sd_role_perms (role, perm) values ('dev', 'ads.manage') on conflict do nothing;

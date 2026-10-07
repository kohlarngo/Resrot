-- บันทึกการใช้งาน (Audit log) ย้ายไปหน้านักพัฒนา — ผู้ดูแลแพลตฟอร์มยังเห็นกิจกรรมของตัวเองในหน้า "บัญชีของฉัน"
delete from public.sd_role_perms where role = 'admin' and perm = 'audit.view';
insert into public.sd_role_perms (role, perm) values ('dev', 'audit.view') on conflict do nothing;

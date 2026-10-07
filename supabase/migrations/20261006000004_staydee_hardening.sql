-- ปิดช่องที่ Supabase security advisor แจ้ง
alter function public.sd_privileged() set search_path = public;
alter function public.sd_kv_can(text) set search_path = public;
alter function public.sd_bookings_sync() set search_path = public;
alter function public.sd_sos_stamp() set search_path = public;

-- ฟังก์ชัน trigger ไม่ควรเรียกผ่าน API ได้ (trigger ยังทำงานตามปกติ)
revoke execute on function public.sd_profiles_guard(), public.sd_audit_stamp(), public.sd_bookings_sync(), public.sd_sos_stamp() from public, anon, authenticated;

-- ฟังก์ชันที่ต้องล็อกอินก่อนเท่านั้น
revoke execute on function public.sd_add_review(text, numeric, text, text, text), public.sd_delete_review(bigint),
  public.sd_admin_import(jsonb, boolean), public.sd_ensure_profile(text, text), public.sd_is_staff(), public.sd_can(text) from public, anon;
grant execute on function public.sd_add_review(text, numeric, text, text, text), public.sd_delete_review(bigint),
  public.sd_admin_import(jsonb, boolean), public.sd_ensure_profile(text, text), public.sd_is_staff(), public.sd_can(text) to authenticated;

-- ฟังก์ชันสาธารณะโดยตั้งใจ (ผู้จองไม่ต้องมีบัญชี): sd_create_booking, sd_get_booking, sd_cancel_booking, sd_claim_payment,
-- sd_check_coupon, sd_occupancy, sd_public_reviews, sd_log_auth_fail — ทุกตัวตรวจสิทธิ์/PIN ภายในฟังก์ชันเอง

-- แก้: คำขอจาก API แบบไม่ล็อกอิน (anon) ก็มี auth.uid() เป็น null — แยกด้วย session_user แทน
-- (คำขอผ่าน API เชื่อมต่อเป็น authenticator เสมอ ส่วน service role มี JWT role = service_role)
create or replace function public.sd_privileged() returns boolean
language sql stable set search_path = public as $$
  select coalesce(auth.role(), '') = 'service_role' or session_user <> 'authenticator';
$$;

-- เจ้าของรีสอร์ทดูบันทึกการใช้งานของพนักงานตัวเองได้ (ใครทำอะไรเมื่อไหร่)
-- เดิม: อ่านได้เฉพาะแถวของตัวเอง (uid = auth.uid()) หรือคนที่มีสิทธิ์ audit.view (นักพัฒนา)
-- เพิ่ม: แถวที่ uid เป็นพนักงานที่เจ้าของคนนี้จ้าง (sd_profiles.employer_id = เจ้าของ) — ไม่เห็นของเจ้าของ/พนักงานรายอื่น
-- นโยบาย SELECT ซ้อนกันแบบ OR จึงไม่กระทบเงื่อนไขเดิม · พนักงานเองยังเห็นแค่แถวของตัวเอง
create policy "sd_audit owner reads team" on public.sd_audit for select to authenticated
  using (exists (select 1 from public.sd_profiles p where p.id = sd_audit.uid and p.employer_id = (select auth.uid())));

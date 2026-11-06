// ใส่ค่าจาก Supabase Dashboard > Project Settings > API
// ถ้าเว้นว่างไว้ เว็บจะทำงานในโหมดเดโม (แสดงข้อมูลตัวอย่าง แต่ไม่บันทึกการจองจริง)
// publishable/anon key เปิดเผยในหน้าเว็บได้ ข้อมูลถูกป้องกันด้วย RLS ใน supabase/schema.sql
window.KOHLARDGO_CONFIG = {
  SUPABASE_URL: 'https://whtomiamqwhhdrllibix.supabase.co',
  // รีสอร์ทจากระบบ hotel (StayDee) — แสดงเป็นหมวด "ที่พัก" ในเว็บนี้ กดแล้วไปจองที่เว็บ hotel
  HOTEL_SUPABASE_URL: 'https://whtomiamqwhhdrllibix.supabase.co',
  HOTEL_SUPABASE_KEY: 'sb_publishable_zNqyiYcujJvjcTKthvo_Kw_EuGWsKCL',
  HOTEL_SITE: 'https://www.kohlarngo.com/hotel/',
  SUPABASE_ANON_KEY: 'sb_publishable_zNqyiYcujJvjcTKthvo_Kw_EuGWsKCL'
};

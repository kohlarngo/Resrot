// ใส่ค่าจาก Supabase Dashboard > Project Settings > API
// ถ้าเว้นว่างไว้ เว็บจะทำงานในโหมดเดโม (แสดงข้อมูลตัวอย่าง แต่ไม่บันทึกการจองจริง)
// publishable/anon key เปิดเผยในหน้าเว็บได้ ข้อมูลถูกป้องกันด้วย RLS ใน supabase/schema.sql
window.KOHLARDGO_CONFIG = {
  SUPABASE_URL: 'https://whtomiamqwhhdrllibix.supabase.co',
  // เว็บจองที่พัก (hotel) — ปุ่มย้อนกลับบนหน้าแรกในมือถือกลับไปที่นี่
  HOTEL_SITE: 'https://www.kohlarngo.com/hotel/',
  SUPABASE_ANON_KEY: 'sb_publishable_zNqyiYcujJvjcTKthvo_Kw_EuGWsKCL'
};

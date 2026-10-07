# StayDee เกาะล้าน

ระบบจองที่พักบนเกาะล้านแบบ marketplace — ลูกค้าจอง/ส่งสลิปให้เจ้าของรีสอร์ทโดยตรง

| หน้า | ไฟล์ | ผู้ใช้ |
|---|---|---|
| เว็บลูกค้า (ไทย / English / 中文) | `index.html` | ลูกค้า |
| ระบบเจ้าของรีสอร์ท | `owner.html` | เจ้าของรีสอร์ท |
| ผู้ดูแลแพลตฟอร์ม | `admin.html` | แอดมิน |
| นักพัฒนา | `dev.html` | ทีมพัฒนา |

- Front-end เป็น HTML/CSS/JS ล้วน (ไม่มี build step) — ข้อมูลอยู่ใน Supabase (ตาราง `sd_*`, RLS)
- `supabase/migrations/` = สคีมาฐานข้อมูล · `supabase/functions/sd-staff` = Edge Function จัดการบัญชีทีมงาน
- ลิงก์ประจำรีสอร์ท: `index.html#/hotel/<ชื่อลิงก์>?src=facebook&lang=en`

## เปิดเว็บด้วย GitHub Pages
Settings → Pages → Source: `Deploy from a branch` → Branch `main` / `(root)`
แล้วเพิ่ม URL เว็บใน Supabase → Authentication → URL Configuration (Site URL + Redirect URLs) เพื่อให้ล็อกอินด้วย Google / Facebook ได้

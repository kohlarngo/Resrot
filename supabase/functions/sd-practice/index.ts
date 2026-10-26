// ข้อมูลตัวอย่างสำหรับฝึกใช้งาน — เจ้าของรีสอร์ท (อนุมัติแล้ว) เรียกใช้กับบัญชีตัวเองเท่านั้น
// action: seed (สร้างรีสอร์ท + การจองตัวอย่างสำหรับภารกิจฝึก) · clear (ลบข้อมูลตัวอย่างทั้งหมดของตัวเอง)
// รีสอร์ทตัวอย่างติดธง practice=true (trigger sd_demo_hotel_guard บังคับ active=false) จึงไม่ปรากฏบนเว็บไซต์ลูกค้า
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const fail = (error: string, status = 400) => json({ error }, status);
const rnd = (n: number, chars: string) => Array.from(crypto.getRandomValues(new Uint32Array(n)), v => chars[v % chars.length]).join('');
// ชายหาดบนเกาะล้าน (ตรงกับ DESTINATIONS ใน js/data.js — ใช้ฟิลด์ city ของที่พักเป็นชื่อหาด) [ชื่อ, lat, lng]
const BEACHES: [string, number, number][] = [
  ['หน้าบ้าน', 12.92246, 100.79016], ['หาดตาแหวน', 12.92538, 100.77975], ['หาดแสม', 12.91210, 100.76978], ['หาดเทียน', 12.91913, 100.76997],
  ['หาดนวล', 12.90051, 100.77601], ['หาดตายาย', 12.93617, 100.78838], ['หาดสังวาลย์', 12.92655, 100.77275],
];
// เลือกหาดตามเลขท้ายชื่อ (“รีสอร์ท demo 3” → หาดแสม) ไม่มีเลข = สุ่ม · เลื่อนพิกัดเล็กน้อยไม่ให้หมุดทับกันบนแผนที่
const pickBeach = (label: string) => {
  const n = Number((/(\d+)\s*$/.exec(label) ?? /demo\s*(\d+)/i.exec(label))?.[1]);
  const b = n > 0 ? BEACHES[(n - 1) % BEACHES.length] : BEACHES[Math.floor(Math.random() * BEACHES.length)];
  const j = () => Math.round((Math.random() - 0.5) * 0.0016 * 1e5) / 1e5;
  return { city: b[0], lat: +(b[1] + j()).toFixed(5), lng: +(b[2] + j()).toFixed(5) };
};
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (s: string, n: number) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
// วันนี้ตามเวลาไทย (UTC+7)
const todayTH = () => iso(new Date(Date.now() + 7 * 3600000));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return fail('method not allowed', 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const authHeader = req.headers.get('Authorization') ?? '';
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
  const { data: { user } } = await caller.auth.getUser(authHeader.replace(/^Bearer\s+/i, ''));
  if (!user) return fail('กรุณาเข้าสู่ระบบ', 401);

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data: prof } = await admin.from('sd_profiles').select('role, owner_status, active, biz').eq('id', user.id).single();
  if (!prof || prof.role !== 'owner' || prof.active === false) return fail('เฉพาะเจ้าของรีสอร์ท', 403);
  if (prof.owner_status !== 'approved') return fail('บัญชียังไม่ได้รับการอนุมัติ', 403);

  let body: Record<string, any>;
  try { body = await req.json(); } catch { return fail('ข้อมูลไม่ถูกต้อง'); }

  const clear = async () => {
    await admin.from('sd_bookings').delete().eq('data->>ownerId', user.id).eq('data->practice->>seed', '1');
    // การจองที่เจ้าของลองจองเองจากหน้าลูกค้า (ภารกิจ “จองแบบลูกค้า”) ไม่มีธง practice แต่ผูกกับรีสอร์ทตัวอย่าง
    const { data: ph } = await admin.from('sd_hotels').select('id').eq('owner_id', user.id).eq('data->>practice', 'true');
    for (const h of ph ?? []) await admin.from('sd_bookings').delete().eq('data->>hotelId', h.id);
    await admin.from('sd_hotels').delete().eq('owner_id', user.id).eq('data->>practice', 'true');
  };

  if (body.action === 'clear') { await clear(); return json({ ok: true }); }
  if (body.action !== 'seed') return fail('ไม่รู้จักคำสั่ง');

  const { data: ex } = await admin.from('sd_hotels').select('id').eq('owner_id', user.id).eq('data->>practice', 'true').limit(1);
  if (ex?.length) return json({ ok: true, existed: true, hotelId: ex[0].id });

  const hid = 'h' + Date.now();
  const beach = pickBeach('');
  const resortName = 'รีสอร์ทตัวอย่าง (DEMO · ไว้ฝึกใช้งาน)';
  const rooms = [
    { id: `${hid}-r1`, name: 'ห้องสแตนดาร์ด', bed: '1 เตียงควีนไซซ์', size: 24, view: 'วิวสวน', price: 1200, img: 'assets/demo/demo-2.jpg', total: 5, discount: 0, breakfast: false, maxGuests: 2, freeCancel: true, payAtHotel: true },
    { id: `${hid}-r2`, name: 'ห้องดีลักซ์ วิวทะเล', bed: '1 เตียงคิงไซซ์', size: 32, view: 'วิวทะเล', price: 2200, img: 'assets/demo/demo-3.jpg', total: 3, discount: 0, breakfast: true, maxGuests: 3, freeCancel: true, payAtHotel: false },
    { id: `${hid}-r3`, name: 'บ้านพักครอบครัว', bed: '2 เตียงใหญ่', size: 50, view: 'วิวสวน', price: 3500, img: 'assets/demo/demo-4.jpg', total: 2, discount: 0, breakfast: true, maxGuests: 5, freeCancel: false, payAtHotel: false },
  ];
  const hotel = { id: hid, name: resortName, type: 'รีสอร์ท', city: beach.city, area: 'เกาะล้าน', lat: beach.lat, lng: beach.lng, stars: 0, active: false, practice: true, address: `เกาะล้าน ${beach.city}`, highlights: ['รีสอร์ทตัวอย่างสำหรับฝึกใช้งาน', 'ลองจองแบบลูกค้าจริงได้'], amenities: ['beach', 'pool', 'parking'], checkIn: '14:00', checkOut: '12:00', description: 'DEMO — รีสอร์ทตัวอย่างสำหรับฝึกใช้งาน ลองจองและใช้โค้ดส่วนลดได้เหมือนลูกค้าจริง ไม่แสดงบนเว็บไซต์จริง', rooms, images: [1, 2, 3, 4, 5].map(n => `assets/demo/demo-${n}.jpg`), desc: 'DEMO — รีสอร์ทตัวอย่างสำหรับฝึกใช้งาน — ลองย้ายห้อง เลื่อนวัน เช็คอินได้เต็มที่ ไม่แสดงบนเว็บไซต์จริง ลบทิ้งได้เมื่อฝึกเสร็จ' };
  const rh = await admin.from('sd_hotels').insert({ id: hid, owner_id: user.id, data: hotel });
  if (rh.error) return fail('สร้างรีสอร์ทตัวอย่างไม่สำเร็จ: ' + rh.error.message);

  // kind = ภารกิจที่การจองนี้ใช้ฝึก · room/ci/co = ค่าตั้งต้น (ไว้เทียบว่าย้ายห้อง/เลื่อนวันแล้วหรือยัง)
  const t = todayTH();
  const plan: [number, number, number, string, string, string, number[]][] = [
    // [ห้อง, เข้า(วัน), ออก(วัน), ชื่อ, kind, สถานะ]
    [0, 0, 2, 'สมชาย', 'checkin', 'confirmed', [1]],
    [1, -2, 0, 'วิภา', 'checkout', 'inhouse', [1]],
    [0, 2, 4, 'มาลี', 'approve', 'pending', []],
    [0, 3, 5, 'สมหญิง', 'move', 'confirmed', [2]],
    [1, 5, 7, 'ธนากร', 'shift', 'confirmed', [2]],
    [2, 8, 10, 'Emma', 'extra', 'confirmed', []],
  ];
  const rows = plan.map(([ri, a, b, first, kind, st, units], i) => {
    const r = rooms[ri], ci = addDays(t, a), co = addDays(t, b), nights = b - a, total = r.price * nights;
    const bid = `SD${Date.now().toString().slice(-6)}${i}${rnd(2, '0123456789')}`;
    const paid = st !== 'pending';
    const data = {
      id: bid, pin: rnd(4, '0123456789'), qty: 1, rooms: 1, units, practice: { seed: '1', kind, room: r.id, ci, co }, demo: true, source: 'web',
      status: st === 'pending' ? 'pending' : 'confirmed', userId: null, ownerId: user.id, hotelId: hid, hotelName: resortName, roomId: r.id, roomName: r.name,
      checkIn: ci, checkOut: co, nights, adults: 2, children: 0,
      guest: { firstName: first, lastName: '(ตัวอย่าง)', email: '', phone: '0812345678', country: 'ไทย', note: '', requests: [], arrival: '' },
      offer: { id: 'std', name: 'ราคามาตรฐาน', breakfast: r.breakfast, freeCancel: r.freeCancel, payAtHotel: false },
      price: { room: total, orig: total, sub: total, tax: 0, coupon: 0, member: 0, total },
      // ภารกิจ “อนุมัติ” มีสลิปปลอมแนบมาด้วย ให้เห็นว่าลูกค้าส่งสลิปแล้วเป็นอย่างไร
      payment: paid ? { paid: true, method: 'promptpay', paidAt: new Date().toISOString() } : { paid: false, method: 'promptpay', slip: 'assets/demo/slip-demo.svg', claimedAt: new Date().toISOString() },
      ...(st === 'inhouse' ? { checkedInAt: new Date(Date.now() - 2 * 86400000).toISOString(), checkedInBy: 'ตัวอย่าง' } : {}),
      createdAt: new Date().toISOString(),
    };
    return { id: bid, pin: data.pin, user_id: null, guest_email: '', hotel_id: hid, room_id: r.id, check_in: ci, check_out: co, qty: 1, status: data.status, data };
  });
  const rbk = await admin.from('sd_bookings').insert(rows);
  if (rbk.error) { await clear(); return fail('สร้างการจองตัวอย่างไม่สำเร็จ: ' + rbk.error.message); }
  await admin.from('sd_room_status').upsert([{ hotel_id: hid, room_id: rooms[0].id, unit: 1, status: 'dirty', note: 'แขกเข้าวันนี้ — รอทำความสะอาด' }], { onConflict: 'hotel_id,room_id,unit' });
  await admin.from('sd_profiles').update({ biz: { ...(prof.biz ?? {}), practiceSeeded: true } }).eq('id', user.id);
  return json({ ok: true, hotelId: hid });
});

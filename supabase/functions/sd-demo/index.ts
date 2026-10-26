// บัญชีทดลองใช้ (Demo) สำหรับลูกค้าที่สนใจ — นักพัฒนา (staff.manage) สร้าง ID/รหัสผ่านให้ลองพอร์ทัลเจ้าของรีสอร์ท
// action: create {label, days, note} · list · resetpw {id} · extend {id, days} · delete {id}
// create ได้บัญชีเจ้าของ + รีสอร์ท DEMO (3 ประเภทห้อง รูปมีลายน้ำ) + การจองปลอมสำหรับภารกิจฝึก + พนักงานตัวอย่าง 2 คน (แม่บ้าน / แอดมินจำกัดสิทธิ์)
// รีสอร์ทตัวอย่างถูกบังคับ active=false (trigger sd_demo_hotel_guard) จึงไม่ปรากฏบนเว็บไซต์ลูกค้า
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const fail = (error: string, status = 400) => json({ error }, status);
const rnd = (n: number, chars: string) => Array.from(crypto.getRandomValues(new Uint32Array(n)), v => chars[v % chars.length]).join('');
// รหัสผ่านจำง่ายตามเลขในชื่อ เช่น “รีสอร์ท demo 1” → demo01 / maid01 / admin01 (ไม่มีเลขในชื่อ = สุ่มเลข 2 หลัก)
// ใช้ได้เพราะบัญชีทดลองไม่มีข้อมูลจริง หมดอายุเอง และอีเมลเข้าสู่ระบบเป็นค่าสุ่มเดายาก
const simplePw = (label: string, prefix: string) => `${prefix}${(/(\d+)\s*$/.exec(label) ?? /demo\s*(\d+)/i.exec(label))?.[1]?.slice(-4).padStart(2, '0') ?? rnd(2, '0123456789')}`;
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
// บัญชีพนักงานตัวอย่างของบัญชีทดลอง: แม่บ้าน (เห็นเฉพาะงานแม่บ้าน) + แอดมินเจ้าของที่ถูกจำกัดสิทธิ์ (ไม่เห็นรายงานการเงิน/บัญชีรับเงิน/ตั้งค่า)
const DEMO_STAFF = [
  { key: 'hk', pre: 'maid', name: 'แม่บ้าน (ตัวอย่าง)', perms: ['housekeeping'] },
  { key: 'admin', pre: 'admin', name: 'แอดมินเจ้าของ (ตัวอย่าง · จำกัดสิทธิ์)', perms: ['ops.view', 'frontdesk', 'bookings.view', 'bookings.edit', 'inventory'] },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return fail('method not allowed', 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const authHeader = req.headers.get('Authorization') ?? '';
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
  const { data: { user } } = await caller.auth.getUser(authHeader.replace(/^Bearer\s+/i, ''));
  if (!user) return fail('กรุณาเข้าสู่ระบบ', 401);
  const { data: allowed } = await caller.rpc('sd_can', { p: 'staff.manage' });
  if (!allowed) return fail('คุณไม่มีสิทธิ์จัดการบัญชีทดลองใช้', 403);

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data: me } = await admin.from('sd_profiles').select('name').eq('id', user.id).single();

  let body: Record<string, any>;
  try { body = await req.json(); } catch { return fail('ข้อมูลไม่ถูกต้อง'); }

  // เป้าหมายต้องเป็นบัญชีทดลองเท่านั้น (ห้ามแตะบัญชีจริง)
  const demoTarget = async (id: string) => {
    const { data } = await admin.from('sd_demo_accounts').select('owner_id, label, expires_at').eq('owner_id', id).maybeSingle();
    return data;
  };

  switch (body.action) {
    case 'list': {
      const { data: rows, error } = await admin.from('sd_demo_accounts').select('owner_id, label, note, expires_at, created_by, created_at').order('created_at', { ascending: false });
      if (error) return fail(error.message);
      const ids = (rows ?? []).map(r => r.owner_id);
      const { data: profs } = ids.length ? await admin.from('sd_profiles').select('id, email, active, last_login').in('id', ids) : { data: [] };
      const m = new Map((profs ?? []).map(p => [p.id, p]));
      const { data: staff } = ids.length ? await admin.from('sd_profiles').select('id, email, name, employer_id, perms').in('employer_id', ids).order('created_at') : { data: [] };
      return json({ items: (rows ?? []).map(r => ({ ...r, email: m.get(r.owner_id)?.email ?? '', active: !!m.get(r.owner_id)?.active, lastLogin: m.get(r.owner_id)?.last_login ?? null,
        staff: (staff ?? []).filter(x => x.employer_id === r.owner_id).map(x => ({ name: x.name, email: x.email })) })) });
    }
    case 'create': {
      const label = String(body.label ?? '').trim().slice(0, 80);
      const note = String(body.note ?? '').trim().slice(0, 300);
      const days = Math.min(90, Math.max(1, Math.floor(Number(body.days) || 7)));
      if (!label) return fail('กรุณาใส่ชื่อลูกค้า / รีสอร์ทที่จะให้ลอง');
      // ID สั้นอ่านง่ายตามเลขท้ายชื่อ: “รีสอร์ท demo 1” → demo1@demo.invalid (รหัสผ่าน demo01) · ซ้ำกับของเดิม = ต่อเลขสุ่ม 2 หลัก
      const num = (/(\d+)\s*$/.exec(label) ?? /demo\s*(\d+)/i.exec(label))?.[1]?.slice(-4).replace(/^0+(?=\d)/, '') ?? rnd(3, '0123456789');
      const password = simplePw(label, 'demo');
      let email = '', data: any = null, error: any = null;
      for (let k = 0; k < 4 && !data?.user; k++) {
        email = `demo${num}${k ? rnd(2, '0123456789') : ''}@demo.invalid`;
        ({ data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name: label } }));
      }
      if (error || !data?.user) return fail(error?.message ?? 'สร้างบัญชีไม่สำเร็จ');
      const id = data.user.id;
      const resortName = `${label} (DEMO)`;
      const rb = await admin.from('sd_profiles').upsert({
        id, email, name: label, phone: '', role: 'owner', active: true, owner_status: 'approved',
        owner_note: 'บัญชีทดลองใช้', created_by: me?.name ?? null, biz: { resortName, demo: true },
      });
      if (rb.error) { await admin.auth.admin.deleteUser(id); return fail(rb.error.message); }
      const expires = new Date(Date.now() + days * 86400000).toISOString();
      const rd = await admin.from('sd_demo_accounts').insert({ owner_id: id, label, note, expires_at: expires, created_by: me?.name ?? null });
      if (rd.error) { await admin.from('sd_profiles').delete().eq('id', id); await admin.auth.admin.deleteUser(id); return fail(rd.error.message); }

      // รีสอร์ท DEMO: 3 ประเภทห้อง + รูปมีลายน้ำ DEMO (ไฟล์ใน assets/demo) · ติดธง practice เพื่อใช้ภารกิจฝึกชุดเดียวกับเจ้าของใหม่
      const hid = 'h' + Date.now();
      const beach = pickBeach(label);
      const rooms = [
        { id: `${hid}-r1`, name: 'ห้องสแตนดาร์ด', bed: '1 เตียงควีนไซซ์', size: 24, view: 'วิวสวน', price: 1200, total: 5, discount: 0, breakfast: false, maxGuests: 2, freeCancel: true, payAtHotel: true },
        { id: `${hid}-r2`, name: 'ห้องดีลักซ์ วิวทะเล', bed: '1 เตียงคิงไซซ์', size: 32, view: 'วิวทะเล', price: 2200, total: 3, discount: 0, breakfast: true, maxGuests: 3, freeCancel: true, payAtHotel: false },
        { id: `${hid}-r3`, name: 'บ้านพักครอบครัว', bed: '2 เตียงใหญ่', size: 50, view: 'วิวสวน', price: 3500, total: 2, discount: 0, breakfast: true, maxGuests: 5, freeCancel: false, payAtHotel: false },
      ];
      const images = [1, 2, 3, 4, 5].map(n => `assets/demo/demo-${n}.jpg`);
      const hotel = { id: hid, name: resortName, type: 'รีสอร์ท', city: beach.city, area: 'เกาะล้าน', lat: beach.lat, lng: beach.lng, stars: 0, active: false, demo: true, practice: true, vip: { on: true, tag: 'VIP' }, rooms, images, desc: 'DEMO — รีสอร์ทตัวอย่างสำหรับทดลองใช้ระบบ รูปภาพและข้อมูลทั้งหมดเป็นตัวอย่าง ไม่ใช่ที่พักจริง ไม่แสดงบนเว็บไซต์ลูกค้า แก้ไขได้อิสระ' };
      const rh = await admin.from('sd_hotels').insert({ id: hid, owner_id: id, data: hotel });
      if (rh.error) return json({ id, email, password, expiresAt: expires, warn: 'สร้างบัญชีแล้ว แต่สร้างรีสอร์ทตัวอย่างไม่สำเร็จ: ' + rh.error.message });

      // การจองปลอมสำหรับภารกิจ (kind = ภารกิจที่ใช้ฝึก · room/ci/co = ค่าตั้งต้นไว้เทียบว่าย้ายห้อง/เลื่อนวันแล้วหรือยัง)
      const t = todayTH();
      const plan: [number, number, number, string, string, string, number[]][] = [
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
          status: st === 'pending' ? 'pending' : 'confirmed', userId: null, ownerId: id, hotelId: hid, hotelName: resortName, roomId: r.id, roomName: r.name,
          checkIn: ci, checkOut: co, nights, adults: 2, children: 0,
          guest: { firstName: first, lastName: '(ตัวอย่าง)', email: '', phone: '0812345678', country: 'ไทย', note: '', requests: [], arrival: '' },
          offer: { id: 'std', name: 'ราคามาตรฐาน', breakfast: r.breakfast, freeCancel: r.freeCancel, payAtHotel: false },
          price: { room: total, orig: total, sub: total, tax: 0, coupon: 0, member: 0, total },
          payment: paid ? { paid: true, method: 'promptpay', paidAt: new Date().toISOString() } : { paid: false, method: 'promptpay' },
          ...(st === 'inhouse' ? { checkedInAt: new Date(Date.now() - 2 * 86400000).toISOString(), checkedInBy: 'ตัวอย่าง' } : {}),
          createdAt: new Date().toISOString(),
        };
        return { id: bid, pin: data.pin, user_id: null, guest_email: '', hotel_id: hid, room_id: r.id, check_in: ci, check_out: co, qty: 1, status: data.status, data };
      });
      const rbk = await admin.from('sd_bookings').insert(rows);
      // สถานะห้องเริ่มต้น: ห้องที่แขกกำลังจะเข้ามีสถานะ "สกปรก" ให้แม่บ้านลองกดทำความสะอาด
      await admin.from('sd_room_status').upsert([
        { hotel_id: hid, room_id: rooms[0].id, unit: 1, status: 'dirty', note: 'แขกเข้าวันนี้ — รอทำความสะอาด' },
        { hotel_id: hid, room_id: rooms[0].id, unit: 3, status: 'inspect', note: '' },
      ], { onConflict: 'hotel_id,room_id,unit' });

      // พนักงานตัวอย่าง: แม่บ้าน + แอดมินเจ้าของที่จำกัดสิทธิ์
      const staff: { name: string; email: string; password: string }[] = [];
      const tag = email.split('@')[0].slice(4); // demo1 → 1
      for (const d of DEMO_STAFF) {
        const se = `${d.pre}${tag}@demo.invalid`, sp = simplePw(label, d.pre);
        const c = await admin.auth.admin.createUser({ email: se, password: sp, email_confirm: true, user_metadata: { name: d.name } });
        if (c.error) continue;
        const u = await admin.from('sd_profiles').upsert({ id: c.data.user.id, email: se, name: d.name, phone: '', role: 'staff', employer_id: id, perms: d.perms, active: true, created_by: me?.name ?? null });
        if (u.error) { await admin.auth.admin.deleteUser(c.data.user.id); continue; }
        staff.push({ name: d.name, email: se, password: sp });
      }
      const warns = [rbk.error && 'สร้างการจองตัวอย่างไม่สำเร็จ: ' + rbk.error.message, staff.length < DEMO_STAFF.length && 'สร้างบัญชีพนักงานตัวอย่างได้ไม่ครบ'].filter(Boolean);
      return json({ id, email, password, expiresAt: expires, hotelId: hid, resortName, beach: beach.city, staff, warn: warns.length ? warns.join(' · ') : undefined });
    }
    case 'resetpw': {
      const dt = await demoTarget(body.id);
      if (!dt) return fail('ไม่พบบัญชีทดลองใช้', 404);
      const password = simplePw(dt.label, 'demo');
      const { error } = await admin.auth.admin.updateUserById(body.id, { password });
      if (error) return fail(error.message);
      const { data: sts } = await admin.from('sd_profiles').select('id, email, name').eq('employer_id', body.id).order('created_at');
      const staff: { name: string; email: string; password: string }[] = [];
      for (const x of sts ?? []) { const p2 = simplePw(dt.label, DEMO_STAFF.find(d => x.email.startsWith(d.pre))?.pre ?? 'staff'); const r2 = await admin.auth.admin.updateUserById(x.id, { password: p2 }); if (!r2.error) staff.push({ name: x.name, email: x.email, password: p2 }); }
      return json({ password, staff });
    }
    case 'extend': {
      const t = await demoTarget(body.id);
      if (!t) return fail('ไม่พบบัญชีทดลองใช้', 404);
      const days = Math.min(90, Math.max(1, Math.floor(Number(body.days) || 7)));
      const base = Math.max(Date.now(), new Date(t.expires_at).getTime());
      const expires = new Date(base + days * 86400000).toISOString();
      await admin.from('sd_demo_accounts').update({ expires_at: expires }).eq('owner_id', body.id);
      await admin.from('sd_profiles').update({ active: true }).eq('id', body.id);
      await admin.from('sd_profiles').update({ active: true }).eq('employer_id', body.id);
      return json({ expiresAt: expires });
    }
    case 'delete': {
      if (!(await demoTarget(body.id))) return fail('ไม่พบบัญชีทดลองใช้', 404);
      const { data: sts } = await admin.from('sd_profiles').select('id').eq('employer_id', body.id);
      for (const x of sts ?? []) { await admin.from('sd_profiles').delete().eq('id', x.id); await admin.auth.admin.deleteUser(x.id); }
      const { data: hts } = await admin.from('sd_hotels').select('id').eq('owner_id', body.id);
      if (hts?.length) await admin.from('sd_room_status').delete().in('hotel_id', hts.map(h => h.id));
      await admin.from('sd_bookings').delete().eq('data->>ownerId', body.id);
      await admin.from('sd_hotels').delete().eq('owner_id', body.id);
      await admin.from('sd_demo_accounts').delete().eq('owner_id', body.id);
      await admin.from('sd_profiles').delete().eq('id', body.id);
      const { error } = await admin.auth.admin.deleteUser(body.id);
      return error ? fail(error.message) : json({ ok: true });
    }
    default:
      return fail('ไม่รู้จักคำสั่ง');
  }
});

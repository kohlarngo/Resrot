// จัดการบัญชีพนักงานของเจ้าของรีสอร์ท (role = 'staff'): เพิ่ม / แก้ไขสิทธิ์ / ระงับ / รีเซ็ตรหัสผ่าน / ลบ
// ต้องใช้ service role จึงทำในเบราว์เซอร์ไม่ได้ — ผู้เรียกต้องเป็นเจ้าของรีสอร์ทที่ได้รับอนุมัติ และแตะได้เฉพาะพนักงานที่ตัวเองจ้าง (employer_id = ผู้เรียก)
// Deploy ด้วย --no-verify-jwt เหมือน sd-staff (ตรวจ JWT เองในโค้ด)
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
// ต้องตรงกับ sd_staff_perm_list() ในฐานข้อมูล (ฐานข้อมูลกรองซ้ำอีกชั้น)
const STAFF_PERMS = ['ops.view', 'frontdesk', 'bookings.view', 'bookings.edit', 'inventory', 'hotels.edit', 'coupons.edit', 'reviews.view', 'customers.view'];
const MAX_STAFF = 10;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const fail = (error: string, status = 400) => json({ error }, status);
const cleanPerms = (v: unknown) => (Array.isArray(v) ? v : []).filter((p) => STAFF_PERMS.includes(p));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return fail('method not allowed', 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: { user } } = await admin.auth.getUser(jwt);
  if (!user) return fail('กรุณาเข้าสู่ระบบ', 401);
  const { data: me } = await admin.from('sd_profiles').select('id, name, role, active, owner_status').eq('id', user.id).maybeSingle();
  if (!me || me.role !== 'owner' || !me.active || me.owner_status !== 'approved') return fail('เฉพาะเจ้าของรีสอร์ทเท่านั้น', 403);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return fail('ข้อมูลไม่ถูกต้อง'); }

  // เป้าหมายต้องเป็นพนักงานที่เจ้าของคนนี้จ้างเท่านั้น (Auth ใช้ร่วมกับระบบอื่น ห้ามแตะบัญชีอื่น)
  const mine = async (id: unknown) => {
    const { data } = await admin.from('sd_profiles').select('id, email').eq('id', String(id ?? '')).eq('role', 'staff').eq('employer_id', me.id).maybeSingle();
    return data;
  };

  switch (body.action) {
    case 'create': {
      const email = String(body.email ?? '').trim().toLowerCase();
      const name = String(body.name ?? '').trim().slice(0, 100);
      const phone = String(body.phone ?? '').trim().slice(0, 30);
      const password = String(body.password ?? '');
      if (!/^\S+@\S+\.\S+$/.test(email)) return fail('รูปแบบอีเมลไม่ถูกต้อง');
      if (!name) return fail('กรุณากรอกชื่อพนักงาน');
      if (password.length < 8) return fail('รหัสผ่านอย่างน้อย 8 ตัวอักษร');
      const { count } = await admin.from('sd_profiles').select('id', { count: 'exact', head: true }).eq('employer_id', me.id);
      if ((count ?? 0) >= MAX_STAFF) return fail(`เพิ่มพนักงานได้สูงสุด ${MAX_STAFF} คน`);
      const { data: exists } = await admin.rpc('sd_user_id_by_email', { p_email: email });
      if (exists) return fail('อีเมลนี้ถูกใช้สมัครไว้แล้ว — ใช้อีเมลอื่น หรือให้พนักงานสมัครด้วยอีเมลใหม่');
      const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } });
      if (created.error) return fail(created.error.message);
      const id = created.data.user.id;
      const { error } = await admin.from('sd_profiles').upsert({ id, email, name, phone, role: 'staff', employer_id: me.id, perms: cleanPerms(body.perms), active: true, created_by: me.name });
      if (error) { await admin.auth.admin.deleteUser(id); return fail(error.message); }
      return json({ id });
    }
    case 'update': {
      const t = await mine(body.id);
      if (!t) return fail('ไม่พบพนักงาน', 404);
      const patch: Record<string, unknown> = {};
      if (body.name !== undefined) { const n = String(body.name).trim().slice(0, 100); if (!n) return fail('กรุณากรอกชื่อพนักงาน'); patch.name = n; }
      if (body.phone !== undefined) patch.phone = String(body.phone).trim().slice(0, 30);
      if (body.perms !== undefined) patch.perms = cleanPerms(body.perms);
      if (body.active !== undefined) patch.active = !!body.active;
      const { error } = await admin.from('sd_profiles').update(patch).eq('id', t.id);
      return error ? fail(error.message) : json({ ok: true });
    }
    case 'resetpw': {
      const t = await mine(body.id);
      if (!t) return fail('ไม่พบพนักงาน', 404);
      if (String(body.password ?? '').length < 8) return fail('รหัสผ่านอย่างน้อย 8 ตัวอักษร');
      const { error } = await admin.auth.admin.updateUserById(t.id, { password: String(body.password) });
      return error ? fail(error.message) : json({ ok: true });
    }
    case 'delete': {
      const t = await mine(body.id);
      if (!t) return fail('ไม่พบพนักงาน', 404);
      const { error } = await admin.auth.admin.deleteUser(t.id);
      return error ? fail(error.message) : json({ ok: true });
    }
    default:
      return fail('ไม่รู้จักคำสั่ง');
  }
});

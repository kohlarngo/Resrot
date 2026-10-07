// จัดการบัญชีทีมงาน StayDee: ผู้ดูแลแพลตฟอร์ม / นักพัฒนา (เพิ่ม / รีเซ็ตรหัสผ่าน / ลบออกจากทีม)
// ต้องใช้ service role จึงทำในเบราว์เซอร์ไม่ได้ — ผู้เรียกต้องมีสิทธิ์ staff.manage (นักพัฒนา)
// บัญชีเจ้าของรีสอร์ทไม่ได้จัดการที่นี่ (สมัครเอง + ผู้ดูแลแพลตฟอร์มอนุมัติ / ระงับ)
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const TEAM_ROLES = ['admin', 'dev'];
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const fail = (error: string, status = 400) => json({ error }, status);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return fail('method not allowed', 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const authHeader = req.headers.get('Authorization') ?? '';
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: { user } } = await caller.auth.getUser(authHeader.replace(/^Bearer\s+/i, ''));
  if (!user) return fail('กรุณาเข้าสู่ระบบ', 401);
  const { data: allowed } = await caller.rpc('sd_can', { p: 'staff.manage' });
  if (!allowed) return fail('คุณไม่มีสิทธิ์จัดการทีมงาน', 403);

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data: me } = await admin.from('sd_profiles').select('name').eq('id', user.id).single();

  let body: Record<string, string>;
  try { body = await req.json(); } catch { return fail('ข้อมูลไม่ถูกต้อง'); }

  // เป้าหมายของ resetpw / delete ต้องเป็นทีมงาน StayDee เท่านั้น (Auth ใช้ร่วมกับระบบอื่น)
  const staffTarget = async (id: string) => {
    const { data } = await admin.from('sd_profiles').select('id, email, role').eq('id', id).maybeSingle();
    return data && TEAM_ROLES.includes(data.role) ? data : null;
  };

  switch (body.action) {
    case 'create': {
      const email = String(body.email ?? '').trim().toLowerCase();
      const name = String(body.name ?? '').trim().slice(0, 100);
      const phone = String(body.phone ?? '').trim().slice(0, 30);
      const password = String(body.password ?? '');
      if (!/^\S+@\S+\.\S+$/.test(email)) return fail('รูปแบบอีเมลไม่ถูกต้อง');
      if (!name) return fail('กรุณากรอกชื่อ');
      if (!TEAM_ROLES.includes(body.role)) return fail('บทบาทไม่ถูกต้อง');
      if (password.length < 8) return fail('รหัสผ่านอย่างน้อย 8 ตัวอักษร');

      let { data: id } = await admin.rpc('sd_user_id_by_email', { p_email: email });
      if (id) {
        const { data: prof } = await admin.from('sd_profiles').select('role').eq('id', id).maybeSingle();
        if (prof && prof.role !== 'user') return fail(prof.role === 'owner' ? 'อีเมลนี้เป็นบัญชีเจ้าของรีสอร์ท' : 'อีเมลนี้เป็นทีมงานอยู่แล้ว');
        // บัญชีเดิม (ลูกค้า) → อัปเกรดเป็นทีมงานและตั้งรหัสผ่านใหม่
        const { error } = await admin.auth.admin.updateUserById(id, { password, email_confirm: true });
        if (error) return fail(error.message);
      } else {
        const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } });
        if (error) return fail(error.message);
        id = data.user.id;
      }
      const { error } = await admin.from('sd_profiles').upsert({ id, email, name, phone, role: body.role, active: true, created_by: me?.name ?? null });
      if (error) return fail(error.message);
      return json({ id });
    }
    case 'resetpw': {
      const t = await staffTarget(body.id);
      if (!t) return fail('ไม่พบบัญชีทีมงาน', 404);
      if (String(body.password ?? '').length < 8) return fail('รหัสผ่านอย่างน้อย 8 ตัวอักษร');
      const { error } = await admin.auth.admin.updateUserById(t.id, { password: body.password });
      return error ? fail(error.message) : json({ ok: true });
    }
    case 'delete': {
      if (body.id === user.id) return fail('ไม่สามารถลบบัญชีของตัวเองได้');
      const t = await staffTarget(body.id);
      if (!t) return fail('ไม่พบบัญชีทีมงาน', 404);
      // ลบเฉพาะโปรไฟล์ทีมงาน (สิทธิ์ทั้งหมดหายทันที) — ไม่ลบบัญชี Auth เพราะอาจใช้กับระบบอื่นในโปรเจกต์เดียวกัน
      const { error } = await admin.from('sd_profiles').delete().eq('id', t.id);
      return error ? fail(error.message) : json({ ok: true });
    }
    default:
      return fail('action ไม่ถูกต้อง');
  }
});

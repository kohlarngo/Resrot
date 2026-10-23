// เปลี่ยนบัญชีรับเงินของเจ้าของรีสอร์ท — ต้องยืนยันตัวตนก่อนทุกครั้ง (บังคับที่ฝั่งเซิร์ฟเวอร์ ไม่ใช่แค่หน้าเว็บ)
//  action 'info'     → วิธียืนยันที่บัญชีนี้ใช้ได้ (มีรหัสผ่านหรือไม่) + อีเมลที่ซ่อนบางส่วน
//  action 'send-otp' → ส่งรหัส OTP ไปอีเมลของบัญชี (Supabase Auth · ต้องใส่ {{ .Token }} ในเทมเพลตอีเมล Magic Link)
//  action 'save'     → ตรวจ OTP + รหัสผ่าน (ถ้าบัญชีมีรหัสผ่าน) แล้วบันทึก · เก็บประวัติ (ซ่อนเลข) + audit + แจ้งเตือน Telegram / Web Push ให้เจ้าของ
// sd_profiles.payout แก้โดยตรงจากผู้ใช้ไม่ได้ (trigger sd_payout_guard) จึงต้องผ่านฟังก์ชันนี้ (service role) เท่านั้น
// Deploy ด้วย --no-verify-jwt (ตรวจ JWT เองในโค้ด เพื่อให้ preflight CORS ผ่าน)
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', ...CORS } });
const esc = (s: unknown) => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
// ซ่อนเลขยาว (พร้อมเพย์ / เลขบัญชี) เหลือ 4 ตัวท้าย
const mask = (s: unknown) => String(s ?? '').replace(/\d[\d\s-]{5,}\d/g, m => { const d = m.replace(/\D/g, ''); return '•'.repeat(Math.max(0, d.length - 4)) + d.slice(-4); });
const maskEmail = (e: string) => e.replace(/^(.{2}).*(@.*)$/, '$1•••$2');
const clean = { persistSession: false, autoRefreshToken: false };

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const url = Deno.env.get('SUPABASE_URL')!, anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const sb = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: clean });
  const body = await req.json().catch(() => ({}));

  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const user = jwt ? (await sb.auth.getUser(jwt)).data.user : null;
  if (!user?.email) return json({ error: 'กรุณาเข้าสู่ระบบ' }, 401);
  const { data: prof } = await sb.from('sd_profiles').select('id, name, role, active, owner_status, payout').eq('id', user.id).maybeSingle();
  if (!prof || prof.role !== 'owner' || prof.active === false || prof.owner_status !== 'approved') return json({ error: 'เฉพาะเจ้าของรีสอร์ทเท่านั้น' }, 403);
  const hasPassword = (user.app_metadata?.providers ?? []).includes('email');

  if (body.action === 'info') return json({ hasPassword, email: maskEmail(user.email) });

  if (body.action === 'send-otp') {
    const r = await createClient(url, anon, { auth: clean }).auth.signInWithOtp({ email: user.email, options: { shouldCreateUser: false } });
    if (r.error) return json({ error: /rate|seconds|too many/i.test(r.error.message) ? 'ขอรหัสถี่เกินไป — รอสักครู่แล้วลองใหม่' : 'ส่งรหัสไม่สำเร็จ: ' + r.error.message }, 429);
    return json({ ok: true, email: maskEmail(user.email) });
  }

  if (body.action !== 'save') return json({ error: 'bad request' }, 400);

  // กันเดารหัส: ผิดเกิน 5 ครั้งใน 15 นาที ล็อกชั่วคราว
  const since = new Date(Date.now() - 15 * 60_000).toISOString();
  const { count } = await sb.from('sd_audit').select('id', { count: 'exact', head: true }).eq('uid', user.id).eq('action', 'payout.fail').gte('at', since);
  if ((count ?? 0) >= 5) return json({ error: 'ยืนยันผิดหลายครั้ง — ล็อกชั่วคราว 15 นาที' }, 429);
  const fail = async (msg: string) => { await sb.from('sd_audit').insert({ uid: user.id, name: prof.name || user.email, role: 'owner', action: 'payout.fail', target: msg.slice(0, 200) }); return json({ error: msg }, 400); };

  const otp = String(body.otp ?? '').replace(/\s/g, '');
  if (!/^\d{6,10}$/.test(otp)) return json({ error: 'กรอกรหัส OTP จากอีเมล' }, 400);
  const v = await createClient(url, anon, { auth: clean }).auth.verifyOtp({ email: user.email, token: otp, type: 'email' });
  if (v.error || v.data.user?.id !== user.id) return fail('รหัส OTP ไม่ถูกต้องหรือหมดอายุ');
  if (hasPassword) {
    const pw = String(body.password ?? '');
    if (!pw) return json({ error: 'กรอกรหัสผ่านของบัญชีนี้' }, 400);
    const s = await createClient(url, anon, { auth: clean }).auth.signInWithPassword({ email: user.email, password: pw });
    if (s.error || s.data.user?.id !== user.id) return fail('รหัสผ่านไม่ถูกต้อง');
  }

  const inp = body.payout ?? {};
  const promptpayId = String(inp.promptpayId ?? '').replace(/\D/g, '');
  const next = { promptpayId, promptpayName: String(inp.promptpayName ?? '').trim().slice(0, 80), bankInfo: String(inp.bankInfo ?? '').trim().slice(0, 300) };
  if (promptpayId && !/^(0\d{9}|\d{13})$/.test(promptpayId)) return json({ error: 'หมายเลขพร้อมเพย์ต้องเป็นเบอร์มือถือ 10 หลัก หรือเลข 13 หลัก' }, 400);
  const old = prof.payout ?? {};
  const merged = { ...old, ...next };
  if (JSON.stringify([old.promptpayId ?? '', old.promptpayName ?? '', old.bankInfo ?? '']) === JSON.stringify([next.promptpayId, next.promptpayName, next.bankInfo])) return json({ ok: true, unchanged: true });

  const up = await sb.from('sd_profiles').update({ payout: merged }).eq('id', user.id);
  if (up.error) return json({ error: up.error.message }, 500);
  const view = (p: Record<string, unknown>) => ({ promptpayId: mask(p.promptpayId), promptpayName: String(p.promptpayName ?? ''), bankInfo: mask(p.bankInfo) });
  await sb.from('sd_payout_history').insert({ owner_id: user.id, old_masked: view(old), new_masked: view(merged) });
  await sb.from('sd_audit').insert({ uid: user.id, name: prof.name || user.email, role: 'owner', action: 'payout.change', target: `พร้อมเพย์ ${mask(old.promptpayId) || '-'} → ${mask(merged.promptpayId) || '-'}${old.bankInfo !== merged.bankInfo ? ' · แก้บัญชีธนาคาร' : ''}` });

  // แจ้งเตือนเจ้าของ (Telegram + Web Push) — เผื่อคนอื่นเปลี่ยนบัญชีโดยเจ้าของไม่รู้
  const text = `🔐 มีการเปลี่ยนบัญชีรับเงิน\nพร้อมเพย์: ${mask(old.promptpayId) || '-'} → ${mask(merged.promptpayId) || '-'}${old.bankInfo !== merged.bankInfo ? '\nบัญชีธนาคารถูกแก้ไข' : ''}\nถ้าไม่ใช่คุณ ติดต่อผู้พัฒนาทันที`;
  const jobs: Promise<unknown>[] = [];
  const { data: tgRow } = await sb.from('sd_notify_tg').select('bot_token, chat_id').eq('owner_id', user.id).maybeSingle();
  if (tgRow?.chat_id) jobs.push(fetch(`https://api.telegram.org/bot${tgRow.bot_token}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: tgRow.chat_id, text: esc(text), parse_mode: 'HTML' }) }).catch(() => null));
  const vapidPub = Deno.env.get('VAPID_PUBLIC_KEY'), vapidPriv = Deno.env.get('VAPID_PRIVATE_KEY');
  const { data: subs } = await sb.from('sd_notify_subs').select('*').eq('owner_id', user.id);
  if (subs?.length && vapidPub && vapidPriv) {
    webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@kohlarngo.com', vapidPub, vapidPriv);
    for (const s of subs) jobs.push(webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify({ title: '🔐 เปลี่ยนบัญชีรับเงิน', body: text, tag: 'payout-change', url: 'owner.html#/admin/payout' }), { TTL: 86400 }).catch(() => null));
  }
  await Promise.all(jobs);
  return json({ ok: true, payout: merged });
});

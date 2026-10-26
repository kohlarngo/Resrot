// แจ้งเตือนเจ้าของรีสอร์ท (Telegram บอทของเจ้าของเอง + Web Push) · 2 ทางเข้า (เหตุการณ์: new/slip/cancel/checkin + waitlist/wl_check สำหรับคิวรอห้อง):
//  1) ทริกเกอร์ sd_bookings_notify (pg_net) — หัว x-cron-secret ตรวจกับ Vault ผ่าน sd_cron_ok · body {event, booking_id}
//  2) หน้าเว็บเจ้าของ (JWT ผู้ใช้ใน Authorization) — body {action:'tg-connect', token} ตรวจ token บอท · {action:'tg-detect'} หาแชตที่ทักบอทไว้
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:…) — token Telegram เก็บในตาราง sd_notify_tg ต่อเจ้าของ
// Deploy ด้วย --no-verify-jwt (ทริกเกอร์ไม่มี JWT · ทางที่ 2 ตรวจ JWT เองในโค้ด)
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', ...CORS } });
const esc = (s: unknown) => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
const baht = (n: unknown) => '฿' + Math.round(Number(n) || 0).toLocaleString('en-US');
const SITE = 'https://www.kohlarngo.com/hotel';

const tg = (token: string, method: string, body: unknown = {}) =>
  fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then(async r => ({ ok: r.ok, status: r.status, d: await r.json().catch(() => ({})) }));

const TITLES: Record<string, string> = {
  new: '🛎 มีการจองใหม่', slip: '💸 ลูกค้าส่งสลิปโอนเงิน', cancel: '⚠️ ลูกค้าขอยกเลิกการจอง', checkin: '📝 ลูกค้ากรอกทะเบียนเช็คอินแล้ว',
  waitlist: '🕓 มีลูกค้าเข้าคิวรอห้อง', wl_free: '✅ ห้องว่างแล้ว — มีลูกค้ารอคิวอยู่',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const body = await req.json().catch(() => ({}));

  // ---------- จากหน้าเว็บเจ้าของ: เชื่อม Telegram ----------
  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (body.action && !req.headers.get('x-cron-secret')) {
    const u = jwt ? (await sb.auth.getUser(jwt)).data.user : null;
    const owner = u ? (await sb.from('sd_profiles').select('id').eq('id', u.id).eq('role', 'owner').eq('active', true).maybeSingle()).data : null;
    if (!owner) return json({ error: 'เฉพาะเจ้าของรีสอร์ทเท่านั้น' }, 401);

    if (body.action === 'tg-connect') {
      const token = String(body.token ?? '').trim();
      if (!/^\d{6,12}:[A-Za-z0-9_-]{30,50}$/.test(token)) return json({ error: 'รูปแบบ token ไม่ถูกต้อง (หน้าตาเช่น 123456789:AAH…)' }, 400);
      const me = await tg(token, 'getMe');
      if (!me.ok || !me.d?.result?.username) return json({ error: 'token ใช้ไม่ได้ ตรวจว่าคัดลอกมาครบจาก @BotFather' }, 400);
      await tg(token, 'deleteWebhook'); // ต้องไม่มี webhook ค้าง ไม่งั้น getUpdates ใช้ไม่ได้
      const up = await sb.from('sd_notify_tg').upsert({ owner_id: owner.id, bot_token: token, bot_name: me.d.result.username, chat_id: null, chat_label: '' });
      if (up.error) return json({ error: up.error.message }, 500);
      return json({ ok: true, bot: me.d.result.username });
    }

    if (body.action === 'tg-detect') {
      const { data: row } = await sb.from('sd_notify_tg').select('bot_token, bot_name').eq('owner_id', owner.id).maybeSingle();
      if (!row) return json({ error: 'ยังไม่ได้ใส่ token' }, 400);
      const r = await tg(row.bot_token, 'getUpdates', { limit: 100, allowed_updates: ['message', 'my_chat_member'] });
      if (!r.ok) return json({ error: 'ดึงข้อมูลจาก Telegram ไม่สำเร็จ' }, 502);
      const chats = (r.d.result ?? []).map((x: any) => x.message?.chat ?? x.my_chat_member?.chat).filter(Boolean);
      const chat = chats[chats.length - 1];
      if (!chat) return json({ error: 'ยังไม่พบข้อความ — เปิดบอทใน Telegram แล้วกด Start (หรือเพิ่มบอทเข้ากลุ่มแล้วพิมพ์ข้อความ) จากนั้นกดตรวจสอบอีกครั้ง' }, 404);
      const label = chat.title || [chat.first_name, chat.last_name].filter(Boolean).join(' ') || chat.username || 'Telegram';
      await sb.from('sd_notify_tg').update({ chat_id: String(chat.id), chat_label: label }).eq('owner_id', owner.id);
      await tg(row.bot_token, 'sendMessage', { chat_id: chat.id, text: '✅ เชื่อมต่อสำเร็จ จากนี้จะแจ้งเตือนการจองที่นี่' });
      return json({ ok: true, chat: label });
    }
    return json({ error: 'bad request' }, 400);
  }

  // ---------- เหตุการณ์จากทริกเกอร์ ----------
  const ok = await sb.rpc('sd_cron_ok', { p: req.headers.get('x-cron-secret') ?? '' });
  if (ok.error || ok.data !== true) return json({ error: 'unauthorized' }, 401);
  const { event, booking_id, waitlist_id } = body;

  // ----- คิวรอห้อง: มีคนเข้าคิวใหม่ -----
  if (event === 'waitlist') {
    if (!waitlist_id) return json({ error: 'bad request' }, 400);
    const { data: w } = await sb.from('sd_waitlist').select('*').eq('id', waitlist_id).maybeSingle();
    if (!w) return json({ ok: true, skipped: 'gone' });
    const { data: h } = await sb.from('sd_hotels').select('owner_id, data').eq('id', w.hotel_id).maybeSingle();
    if (!h?.owner_id) return json({ ok: true, skipped: 'no owner' });
    const room = (h.data?.rooms ?? []).find((r: any) => r.id === w.room_id);
    return json(await notifyOwner(sb, h.owner_id, 'waitlist', TITLES.waitlist, `คิว ${w.id.slice(0, 8)}`,
      [`${h.data?.name ?? ''} · ${w.qty} × ${room?.name ?? 'ทุกประเภทห้อง'}`, `ต้องการ ${w.check_in} → ${w.check_out}`, `${w.name} · ${w.phone}${w.note ? ' · ' + w.note : ''}`], 'waitlist', `wl-${w.id}`));
  }

  // ----- คิวรอห้อง: มีห้องว่างตรงกับคิวที่รออยู่ (หลังยกเลิก/ย้ายห้อง/เช็คเอาท์ก่อนกำหนด) -----
  if (event === 'wl_check') {
    if (!booking_id) return json({ error: 'bad request' }, 400);
    const { data: bk } = await sb.from('sd_bookings').select('hotel_id').eq('id', booking_id).maybeSingle();
    if (!bk) return json({ ok: true, skipped: 'gone' });
    const today = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
    const { data: waits } = await sb.from('sd_waitlist').select('*').eq('hotel_id', bk.hotel_id).eq('status', 'waiting').is('notified_at', null).gte('check_in', today);
    if (!waits?.length) return json({ ok: true, skipped: 'no waitlist' });
    const { data: h } = await sb.from('sd_hotels').select('owner_id, data').eq('id', bk.hotel_id).maybeSingle();
    if (!h?.owner_id) return json({ ok: true, skipped: 'no owner' });
    const { data: all } = await sb.from('sd_bookings').select('room_id, check_in, check_out, qty').eq('hotel_id', bk.hotel_id).neq('status', 'cancelled').gt('check_out', today);
    const freeOf = (roomId: string, ci: string, co: string) => {
      const room = (h.data?.rooms ?? []).find((r: any) => r.id === roomId); if (!room) return 0;
      let min = Number(room.total) || 0;
      for (let d = new Date(ci + 'T00:00:00Z'); d < new Date(co + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1)) {
        const day = d.toISOString().slice(0, 10);
        const used = (all ?? []).filter(x => x.room_id === roomId && day >= x.check_in && day < x.check_out).reduce((s, x) => s + x.qty, 0);
        min = Math.min(min, (Number(room.total) || 0) - used);
      }
      return Math.max(0, min);
    };
    const res = [];
    for (const w of waits) {
      const cands = w.room_id ? [w.room_id] : (h.data?.rooms ?? []).map((r: any) => r.id);
      const hit = cands.find((rid: string) => freeOf(rid, w.check_in, w.check_out) >= w.qty);
      if (!hit) continue;
      // จองสิทธิ์แจ้งเตือนก่อน (กันแจ้งซ้ำเมื่อมีหลายเหตุการณ์พร้อมกัน)
      const claim = await sb.from('sd_waitlist').update({ notified_at: new Date().toISOString() }).eq('id', w.id).is('notified_at', null).select('id');
      if (!claim.data?.length) continue;
      const room = (h.data?.rooms ?? []).find((r: any) => r.id === hit);
      res.push(await notifyOwner(sb, h.owner_id, 'waitlist', TITLES.wl_free, `คิว ${w.id.slice(0, 8)}`,
        [`${h.data?.name ?? ''} · ${w.qty} × ${room?.name ?? ''}`, `ว่างแล้ว ${w.check_in} → ${w.check_out} — ติดต่อลูกค้าก่อนที่จะมีคนจองตัดหน้า`, `${w.name} · ${w.phone}`], 'waitlist', `wlfree-${w.id}`));
    }
    return json({ ok: true, matched: res.length, res });
  }

  // ----- เหตุการณ์การจอง -----
  if (!['new', 'slip', 'cancel', 'checkin'].includes(event) || !booking_id) return json({ error: 'bad request' }, 400);
  const { data: b } = await sb.from('sd_bookings').select('id, check_in, check_out, qty, data').eq('id', booking_id).maybeSingle();
  const ownerId = b?.data?.ownerId;
  if (!b || !ownerId) return json({ ok: true, skipped: 'no owner' });

  const g = b.data.guest ?? {};
  const who = `${g.firstName ?? ''} ${g.lastName ?? ''}`.trim() || 'ลูกค้า';
  return json(await notifyOwner(sb, ownerId, event, TITLES[event], `#${b.id}`,
    [`${b.data.hotelName ?? ''} · ${b.qty} × ${b.data.roomName ?? ''}`, `เข้าพัก ${b.check_in} → ${b.check_out}`, `${who}${g.phone ? ' · ' + g.phone : ''} · ${baht(b.data.price?.total)}`], 'bookings', `${event}-${b.id}`));
});

// ส่งแจ้งเตือนหาเจ้าของ: Telegram (บอทของเจ้าของ) + Web Push · เคารพการตั้งค่าเปิด/ปิดรายเรื่อง (sd_notify_prefs)
async function notifyOwner(sb: ReturnType<typeof createClient>, ownerId: string, prefKey: string, title: string, head: string, lines: string[], page: string, tag: string) {
  const { data: pr } = await sb.from('sd_notify_prefs').select('prefs').eq('owner_id', ownerId).maybeSingle();
  if (pr && pr.prefs?.[prefKey] === false) return { ok: true, skipped: 'pref off' };
  const [{ data: subs }, { data: tgRow }] = await Promise.all([
    sb.from('sd_notify_subs').select('*').eq('owner_id', ownerId),
    sb.from('sd_notify_tg').select('bot_token, chat_id').eq('owner_id', ownerId).maybeSingle(),
  ]);
  let sent = 0, dead = 0;
  const jobs: Promise<void>[] = [];

  if (tgRow?.chat_id) {
    jobs.push(tg(tgRow.bot_token, 'sendMessage', { chat_id: tgRow.chat_id, parse_mode: 'HTML', disable_web_page_preview: true,
      text: `<b>${title}</b>\n${esc(head)}\n${lines.map(esc).join('\n')}\n${SITE}/owner.html#/admin/${page}` })
      .then(async r => { if (r.ok) sent++; else if (r.status === 401 || r.status === 403) { dead++; await sb.from('sd_notify_tg').update({ chat_id: null }).eq('owner_id', ownerId); } }));
  }

  const vapidPub = Deno.env.get('VAPID_PUBLIC_KEY'), vapidPriv = Deno.env.get('VAPID_PRIVATE_KEY');
  if (subs?.length && vapidPub && vapidPriv) {
    webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@kohlarngo.com', vapidPub, vapidPriv);
    for (const s of subs) jobs.push((async () => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys },
          JSON.stringify({ title, body: lines.join('\n'), tag, url: `owner.html#/admin/${page}` }), { TTL: 86400 });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) { dead++; await sb.from('sd_notify_subs').delete().eq('id', s.id); }
      }
    })());
  }
  await Promise.all(jobs);
  return { ok: true, sent, dead };
}

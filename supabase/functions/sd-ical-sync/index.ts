// ซิงก์ปฏิทิน iCal จาก Agoda / Booking.com / Airbnb ฯลฯ → ปิดห้องอัตโนมัติ
// เรียกได้ 2 แบบ: (1) pg_cron ทุก 20 นาที ผ่านหัว x-cron-secret (ซิงก์ทุกฟีด) (2) เจ้าของกด "ซิงก์ตอนนี้" ด้วย JWT ของตัวเอง (ซิงก์เฉพาะฟีดที่ RLS อนุญาต)
// สวิตช์: นักพัฒนาเปิด-ปิดที่หน้า "ฟีเจอร์ & โหมดระบบ" (sd_kv.flags.icalSync) — ปิดอยู่ = ไม่ดึงอะไรเลย
// ความปลอดภัย: รับเฉพาะ https และโดเมนผู้ให้บริการที่อนุญาต · ไม่ตามรีไดเรกต์ไปโดเมนอื่น · จำกัดขนาด/เวลา
import { createClient } from 'npm:@supabase/supabase-js@2';

const ALLOWED = ['booking.com', 'agoda.com', 'airbnb.com', 'airbnb.co.th', 'traveloka.com', 'trip.com', 'expedia.com', 'vrbo.com', 'google.com'];
const MAX_BYTES = 2_000_000, TIMEOUT_MS = 15_000, MAX_HOPS = 3;
const J = { 'Content-Type': 'application/json' };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: J });

const hostOk = (u: URL) => u.protocol === 'https:' && !u.port && ALLOWED.some(d => u.hostname === d || u.hostname.endsWith('.' + d));

async function fetchIcs(url: string): Promise<string> {
  let cur = new URL(url);
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    if (!hostOk(cur)) throw new Error('โดเมนนี้ไม่อยู่ในรายการที่อนุญาต: ' + cur.hostname);
    const ac = new AbortController(); const t = setTimeout(() => ac.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(cur, { redirect: 'manual', signal: ac.signal, headers: { Accept: 'text/calendar, text/plain, */*', 'User-Agent': 'kohlarngo-ical-sync/1.0' } });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location'); if (!loc) throw new Error('รีไดเรกต์ไม่มีปลายทาง');
        cur = new URL(loc, cur); continue;
      }
      if (!res.ok) throw new Error('ดึงปฏิทินไม่สำเร็จ (HTTP ' + res.status + ')');
      const len = Number(res.headers.get('content-length') || 0);
      if (len > MAX_BYTES) throw new Error('ไฟล์ปฏิทินใหญ่เกินไป');
      const text = await res.text();
      if (text.length > MAX_BYTES) throw new Error('ไฟล์ปฏิทินใหญ่เกินไป');
      return text;
    } finally { clearTimeout(t); }
  }
  throw new Error('รีไดเรกต์มากเกินไป');
}

const isoDate = (v: string): string | null => { const m = v.match(/(\d{4})(\d{2})(\d{2})/); return m ? `${m[1]}-${m[2]}-${m[3]}` : null; };

function parseIcs(text: string) {
  if (!/BEGIN:VCALENDAR/i.test(text)) throw new Error('ลิงก์นี้ไม่ใช่ไฟล์ปฏิทิน iCal');
  const lines = text.replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n');
  const events: { uid: string; start: string; end: string; summary: string }[] = [];
  let cur: Record<string, string> | null = null;
  for (const ln of lines) {
    if (/^BEGIN:VEVENT/i.test(ln)) { cur = {}; continue; }
    if (/^END:VEVENT/i.test(ln)) {
      if (cur && cur.UID && cur.DTSTART && !/CANCEL/i.test(cur.STATUS || '')) {
        const s = isoDate(cur.DTSTART); let e = cur.DTEND ? isoDate(cur.DTEND) : null;
        if (s) { if (!e) { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); e = d.toISOString().slice(0, 10); } events.push({ uid: cur.UID, start: s, end: e, summary: (cur.SUMMARY || '').slice(0, 60) }); }
      }
      cur = null; continue;
    }
    if (!cur) continue;
    const i = ln.indexOf(':'); if (i < 0) continue;
    const key = ln.slice(0, i).split(';')[0].toUpperCase();
    if (['UID', 'DTSTART', 'DTEND', 'SUMMARY', 'STATUS'].includes(key) && !(key in cur)) cur[key] = ln.slice(i + 1).trim();
  }
  return events;
}

Deno.serve(async (req: Request) => {
  const url = Deno.env.get('SUPABASE_URL')!, svc = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const admin = createClient(url, svc, { auth: { persistSession: false } });
  let body: { feedId?: string } = {}; try { body = await req.json(); } catch { /* ไม่มี body */ }

  let feeds: { id: string; url: string }[] = [];
  const cron = req.headers.get('x-cron-secret');
  if (cron) {
    const ok = await admin.rpc('sd_cron_ok', { p: cron });
    if (ok.error || ok.data !== true) return json({ error: 'unauthorized' }, 401);
  } else {
    const auth = req.headers.get('Authorization') ?? '';
    if (!auth.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401);
    const probe = createClient(url, anon, { auth: { persistSession: false } });
    const who = await probe.auth.getUser(auth.slice(7));
    if (who.error || !who.data.user) return json({ error: 'unauthorized' }, 401);
  }

  // สวิตช์จากนักพัฒนา: ปิดอยู่ = ไม่ดึงอะไรเลย
  const fl = await admin.from('sd_kv').select('value').eq('key', 'flags').maybeSingle();
  const allOn = fl.data?.value?.icalSync === true;
  // ไม่ได้เปิดทั้งระบบ → ดึงเฉพาะรีสอร์ทที่ dev เปิดรายแห่ง (sd_hotels.data.icalOn)
  // เปิดทั้งระบบ → ข้ามเฉพาะรีสอร์ทที่ถูกยกเว้น (sd_hotels.data.icalOff)
  let onHotels: string[] = [], offHotels: string[] = [];
  if (!allOn) {
    const hs = await admin.from('sd_hotels').select('id, off:data->>icalOff').eq('data->>icalOn', 'true');
    onHotels = (hs.data ?? []).filter((x: { off: string | null }) => x.off !== 'true').map((x: { id: string }) => x.id);
    if (!onHotels.length) return json({ disabled: true, synced: 0, results: [] });
  } else {
    const hs = await admin.from('sd_hotels').select('id').eq('data->>icalOff', 'true');
    offHotels = (hs.data ?? []).map((x: { id: string }) => x.id);
  }

  if (cron) {
    let q = admin.from('sd_ical_feeds').select('id, url').eq('active', true);
    q = allOn ? (offHotels.length ? q.not('hotel_id', 'in', `(${offHotels.join(',')})`) : q) : q.in('hotel_id', onHotels);
    if (body.feedId) q = q.eq('id', body.feedId);
    const r = await q; if (r.error) return json({ error: r.error.message }, 500); feeds = r.data ?? [];
  } else {
    const auth = req.headers.get('Authorization') ?? '';
    const user = createClient(url, anon, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
    let q = user.from('sd_ical_feeds').select('id, url').eq('active', true); // RLS: เห็นเฉพาะฟีดของตัวเอง
    q = allOn ? (offHotels.length ? q.not('hotel_id', 'in', `(${offHotels.join(',')})`) : q) : q.in('hotel_id', onHotels);
    if (body.feedId) q = q.eq('id', body.feedId);
    const r = await q; if (r.error) return json({ error: r.error.message }, 500); feeds = r.data ?? [];
  }

  const results: unknown[] = [];
  for (const f of feeds) {
    try {
      const events = parseIcs(await fetchIcs(f.url));
      const ap = await admin.rpc('sd_ical_apply', { p_feed: f.id, p_events: events, p_error: null });
      results.push({ id: f.id, ok: !ap.error, events: events.length, ...(ap.data ?? {}), error: ap.error?.message });
    } catch (e) {
      const msg = (e as Error).message || 'ผิดพลาด';
      await admin.rpc('sd_ical_apply', { p_feed: f.id, p_events: null, p_error: msg });
      results.push({ id: f.id, ok: false, error: msg });
    }
  }
  return json({ synced: results.length, results });
});

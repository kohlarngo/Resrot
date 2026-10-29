// อีเมลถึงลูกค้า (ไทย + English ในฉบับเดียว) ผ่าน Resend · เรียกจากทริกเกอร์ sd_bookings_mail และ pg_cron sd-mail-remind เท่านั้น
//  body {event: 'received' | 'confirmed' | 'cancelled', booking_id} หรือ {event: 'remind'} (ลูกค้าที่เข้าพักพรุ่งนี้)
//  หัว x-cron-secret ตรวจกับ Vault ผ่าน sd_cron_ok · กันส่งซ้ำด้วย sd_mail_log (1 ฉบับต่อการจองต่อประเภท)
// Secrets: RESEND_API_KEY, MAIL_FROM (เช่น "kohlarngo <booking@kohlarngo.com>" — โดเมนต้องยืนยันใน Resend แล้ว)
//  ยังไม่ตั้ง RESEND_API_KEY = ข้ามเงียบๆ (ไม่บันทึก log จึงไม่เสียสิทธิ์ส่งเมื่อเปิดใช้ภายหลัง)
// Deploy ด้วย --no-verify-jwt (ทริกเกอร์ไม่มี JWT)
import { createClient } from 'npm:@supabase/supabase-js@2';

const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const baht = (n: unknown) => '฿' + Math.round(Number(n) || 0).toLocaleString('en-US');
const SITE = 'https://www.kohlarngo.com/hotel';
const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dTh = (s: string) => { const [y, m, d] = s.split('-').map(Number); return `${d} ${TH_MONTHS[m - 1]} ${y + 543}`; };
const dEn = (s: string) => { const [y, m, d] = s.split('-').map(Number); return `${d} ${EN_MONTHS[m - 1]} ${y}`; };
const bkkDay = (addDays = 0) => new Date(Date.now() + 7 * 3600 * 1000 + addDays * 86400 * 1000).toISOString().slice(0, 10);

type Kind = 'received' | 'confirmed' | 'cancelled' | 'remind';
const COPY: Record<Kind, { subj: [string, string]; head: [string, string]; color: string }> = {
  received: { subj: ['ได้รับการจองแล้ว', 'Booking received'], head: ['เราได้รับการจองของคุณแล้ว', 'We have received your booking'], color: '#0e7490' },
  confirmed: { subj: ['ยืนยันการจองแล้ว', 'Booking confirmed'], head: ['การจองของคุณได้รับการยืนยันแล้ว', 'Your booking is confirmed'], color: '#15803d' },
  cancelled: { subj: ['ยกเลิกการจอง', 'Booking cancelled'], head: ['การจองของคุณถูกยกเลิก', 'Your booking has been cancelled'], color: '#b91c1c' },
  remind: { subj: ['พรุ่งนี้เข้าพัก', 'Your stay starts tomorrow'], head: ['พรุ่งนี้เป็นวันเข้าพักของคุณ', 'See you tomorrow'], color: '#b45309' },
};

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const ok = await sb.rpc('sd_cron_ok', { p: req.headers.get('x-cron-secret') ?? '' });
  if (ok.error || ok.data !== true) return json({ error: 'unauthorized' }, 401);
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) return json({ ok: true, skipped: 'no RESEND_API_KEY' });
  const { event, booking_id } = await req.json().catch(() => ({}));

  if (event === 'remind') {
    const { data: list } = await sb.from('sd_bookings').select('id').eq('status', 'confirmed').eq('check_in', bkkDay(1));
    const res = [];
    for (const r of list ?? []) res.push(await mailBooking(sb, key, r.id, 'remind'));
    return json({ ok: true, count: res.length, res });
  }
  if (!['received', 'confirmed', 'cancelled'].includes(event) || !booking_id) return json({ error: 'bad request' }, 400);
  return json(await mailBooking(sb, key, String(booking_id), event));
});

async function mailBooking(sb: ReturnType<typeof createClient>, key: string, id: string, kind: Kind) {
  const { data: b } = await sb.from('sd_bookings').select('id, pin, guest_email, check_in, check_out, qty, status, data').eq('id', id).maybeSingle();
  if (!b) return { id, skipped: 'gone' };
  const d = b.data ?? {}, g = d.guest ?? {};
  const to = String(b.guest_email || g.email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { id, skipped: 'no email' };
  if (d.source === 'external' || d.practice || d.demo === true || d.demo === 'true') return { id, skipped: 'not a guest booking' };
  const { data: h } = await sb.from('sd_hotels').select('data').eq('id', d.hotelId).maybeSingle();
  const hd = h?.data ?? {};
  if (hd.practice === true || hd.practice === 'true' || hd.demo === true || hd.demo === 'true') return { id, skipped: 'demo hotel' };
  // เหตุการณ์เก่าที่มาถึงช้า (เช่น ยืนยันแล้วถูกยกเลิกทันที) — ส่งเฉพาะที่ตรงกับสถานะปัจจุบัน
  if ((kind === 'confirmed' || kind === 'remind') && b.status !== 'confirmed') return { id, skipped: 'status changed' };
  if (kind === 'cancelled' && b.status !== 'cancelled') return { id, skipped: 'status changed' };

  // จองสิทธิ์ส่งก่อน (กันส่งซ้ำเมื่อทริกเกอร์ยิงซ้ำ)
  const claim = await sb.from('sd_mail_log').insert({ booking_id: id, kind, to_email: to }).select('booking_id');
  if (claim.error) return { id, skipped: 'already sent' };

  const { data: owner } = d.ownerId ? await sb.from('sd_profiles').select('name, phone, biz').eq('id', d.ownerId).maybeSingle() : { data: null };
  const phone = owner?.biz?.phone || owner?.phone || '';
  const line = owner?.biz?.line || '';
  const c = COPY[kind];
  const hotelName = d.hotelName || hd.name || 'kohlarngo';
  const subject = `${c.subj[0]} / ${c.subj[1]} · ${hotelName} · #${b.id}`;
  const html = render(kind, c, b, d, g, hd, hotelName, phone, line);

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: Deno.env.get('MAIL_FROM') ?? 'kohlarngo <booking@kohlarngo.com>', to: [to], subject, html }),
  });
  const info = (await r.text()).slice(0, 300);
  await sb.from('sd_mail_log').update({ ok: r.ok, info }).eq('booking_id', id).eq('kind', kind);
  return { id, kind, ok: r.ok, status: r.status };
}

function render(kind: Kind, c: typeof COPY[Kind], b: any, d: any, g: any, hd: any, hotelName: string, phone: string, line: string) {
  const name = `${g.firstName ?? ''} ${g.lastName ?? ''}`.trim();
  const row = (th: string, en: string, v: string) =>
    `<tr><td style="padding:6px 0;color:#64748b;width:42%">${th}<br><span style="font-size:12px">${en}</span></td><td style="padding:6px 0;font-weight:600">${v}</td></tr>`;
  const nights = Number(d.nights) || Math.round((Date.parse(b.check_out) - Date.parse(b.check_in)) / 86400000);
  const method = d.payment?.method;
  const paid = d.payment?.paid === true;

  let note = '';
  if (kind === 'received') note = method === 'hotel'
    ? ['รอรีสอร์ทยืนยันการจอง ชำระเงินที่รีสอร์ทในวันเข้าพัก', 'Waiting for the resort to confirm. You will pay at the resort on arrival.']
      .join('<br>')
    : paid ? 'รอรีสอร์ทตรวจสอบการชำระเงินและยืนยันการจอง<br>The resort is checking your payment and will confirm shortly.'
    : 'โปรดชำระเงินและแนบสลิปโดยเร็ว ไม่เช่นนั้นการจองจะถูกยกเลิกอัตโนมัติ<br>Please pay and upload your transfer slip soon, otherwise the booking will be cancelled automatically.';
  if (kind === 'confirmed') note = 'แสดงรหัสการจองนี้เมื่อเช็คอิน<br>Please show this booking number at check-in.';
  if (kind === 'cancelled') note = (d.cancelReason ? `เหตุผล / Reason: ${esc(d.cancelReason)}<br>` : '')
    + 'หากมีข้อสงสัย โปรดติดต่อรีสอร์ท<br>If you have any questions, please contact the resort.';
  if (kind === 'remind') note = `เช็คอินตั้งแต่ / Check-in from <b>${esc(hd.checkIn || '14:00')}</b><br>`
    + `กรอกทะเบียนเช็คอินล่วงหน้าบนมือถือได้ / Save time — fill in your check-in form online:<br><a href="${SITE}/#/checkin/${encodeURIComponent(b.id)}" style="color:${c.color}">${SITE}/#/checkin/${esc(b.id)}</a>`;

  const contact = [phone && `โทร / Tel: <a href="tel:${esc(phone)}" style="color:#0f172a">${esc(phone)}</a>`, line && `LINE: ${esc(line)}`].filter(Boolean).join(' · ');
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Tahoma,Arial,sans-serif;color:#0f172a">
<div style="max-width:560px;margin:0 auto;padding:20px 12px">
 <div style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
  <div style="background:${c.color};color:#fff;padding:18px 22px">
   <div style="font-size:13px;opacity:.9">${esc(hotelName)}</div>
   <div style="font-size:20px;font-weight:700;margin-top:4px">${c.head[0]}</div>
   <div style="font-size:14px;opacity:.9">${c.head[1]}</div>
  </div>
  <div style="padding:18px 22px;font-size:14px;line-height:1.5">
   ${name ? `<p style="margin:0 0 12px">เรียน / Dear ${esc(name)}</p>` : ''}
   <table style="width:100%;border-collapse:collapse;font-size:14px">
    ${row('รหัสการจอง', 'Booking no.', `#${esc(b.id)}`)}
    ${b.pin ? row('PIN', 'PIN', esc(b.pin)) : ''}
    ${row('ห้อง', 'Room', `${esc(b.qty)} × ${esc(d.roomName ?? '')}`)}
    ${row('เข้าพัก', 'Check-in', `${dTh(b.check_in)}<br><span style="font-weight:400;font-size:12px">${dEn(b.check_in)}</span>`)}
    ${row('เช็คเอาท์', 'Check-out', `${dTh(b.check_out)}<br><span style="font-weight:400;font-size:12px">${dEn(b.check_out)}</span>`)}
    ${row('จำนวนคืน / ผู้เข้าพัก', 'Nights / Guests', `${nights} / ${Number(d.adults) || 0}${Number(d.children) ? ' + ' + Number(d.children) : ''}`)}
    ${row('ยอดรวม', 'Total', baht(d.price?.total))}
   </table>
   <div style="margin:16px 0;padding:12px 14px;background:#f8fafc;border-left:4px solid ${c.color};border-radius:6px">${note}</div>
   <p style="margin:0 0 6px"><a href="${SITE}/#/my-bookings" style="display:inline-block;background:${c.color};color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">ดูการจองของฉัน / My bookings</a></p>
   <p style="margin:6px 0 0;font-size:12px;color:#64748b">ค้นหาด้วยอีเมลและเบอร์โทรที่ใช้จอง / Look up with the email and phone you booked with.</p>
   ${hd.address || contact ? `<hr style="border:0;border-top:1px solid #e2e8f0;margin:16px 0">
   <div style="font-size:13px;color:#334155"><b>${esc(hotelName)}</b>${hd.address ? `<br>${esc(hd.address)}` : ''}${contact ? `<br>${contact}` : ''}</div>` : ''}
  </div>
 </div>
 <p style="text-align:center;font-size:11px;color:#94a3b8;margin:12px 0 0">อีเมลนี้ส่งอัตโนมัติจาก kohlarngo · This is an automated email from kohlarngo</p>
</div></body></html>`;
}

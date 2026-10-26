// ================= เจ้าของรีสอร์ทมือใหม่: ภารกิจฝึกใช้งานด้วยข้อมูลตัวอย่าง =================
// - เจ้าของที่ได้รับอนุมัติใหม่ (ไม่เกิน 14 วัน) จะได้รีสอร์ทตัวอย่าง + การจองปลอมอัตโนมัติ (Edge Function sd-practice · ไม่แสดงบนเว็บไซต์จริง)
// - การ์ด “ภารกิจฝึกใช้งาน” ที่หน้าภาพรวม: ย้ายห้อง · เลื่อนวัน · เช็คอิน · อนุมัติ · เช็คเอาท์ ฯลฯ — ติ๊กเสร็จเองจากข้อมูลจริงที่ลูกค้าลงมือทำ
// - ครบ 100% การ์ดหายไป แล้วถามว่าจะลบข้อมูลตัวอย่างไหม
// ต่อเข้ากับ admin.js ผ่าน prCard()/prBind() (boToday) และ onboard.js ผ่าน prAfterShell()

const PR_REAL = b => !!b.practice?.seed;
const prHotel = () => DB.hotels(true).find(h => h.practice);
const prFirst = kind => DB.bookings().find(b => PR_REAL(b) && b.practice.kind === kind);
// การจองตัวอย่างของภารกิจเช็คอิน/เช็คเอาท์ต้องตรงกับ “วันนี้” — เลยวัน หรือถูกลากย้ายไปวันอื่นแล้ว = ใช้ฝึกไม่ได้ → ปรับให้ตรงวันนี้ได้ (prAlign)
const prStale = kind => {
  const b = prFirst(kind), t = todayISO(); if (!b) return false;
  if (kind === 'checkin') return !b.checkedInAt && (b.status === 'cancelled' || b.checkIn !== t);
  if (kind === 'checkout') return !b.checkedOutAt && (b.status === 'cancelled' || !b.checkedInAt || b.checkOut > t);
  return false;
};
function prAlign(kind) {
  const b = prFirst(kind); if (!b) return false;
  const t = todayISO(), nights = Math.max(1, b.nights || 2);
  const ci = kind === 'checkin' ? t : addDays(t, -nights), co = kind === 'checkin' ? addDays(t, nights) : t;
  DB.updateBooking(b.id, { checkIn: ci, checkOut: co, nights, status: 'confirmed', cancelledAt: undefined, cancelReason: undefined,
    practice: { ...b.practice, ci, co }, ...(kind === 'checkout' && !b.checkedInAt ? { checkedInAt: new Date(Date.now() - nights * 864e5).toISOString() } : {}) });
  return true;
}
const prWho = kind => { const b = prFirst(kind); return b ? `“${b.guest.firstName} ${b.guest.lastName}”` : 'การจองตัวอย่าง'; };

// ภารกิจ: ok() ดูจากข้อมูลจริง · tip = ขั้นตอนที่แสดงเป็นแถบนำทางเมื่อกด “ทำเลย”
const PR_MISSIONS = [
  { id: 'move', ic: 'fa-right-left', t: 'ย้ายห้อง / อัปเกรดแขก', href: '#/admin/tape?tab=tape',
    d: () => `ย้าย ${prWho('move')} จากห้องสแตนดาร์ดไปห้องดีลักซ์`,
    tip: () => [`เปิด <b>ผังห้อง</b> หาแถบสีของ ${prWho('move')} (ห้องสแตนดาร์ด)`, '<b>แตะที่ชื่อ</b>บนแถบ แล้วกด <b>ย้ายห้อง</b>', 'เลือก <b>ห้องดีลักซ์ วิวทะเล</b> (และเลขห้อง) แล้วกด ถัดไป', 'ระบบถามยืนยันและส่วนต่างราคา — กด <b>ยืนยัน</b> (ใช้คอมพิวเตอร์ ลากแถบไปวางที่แถวห้องดีลักซ์ก็ได้)'],
    ok: () => DB.bookings().some(b => PR_REAL(b) && b.roomId !== b.practice.room) },
  { id: 'shift', ic: 'fa-calendar-days', t: 'เลื่อนวันเข้าพัก', href: '#/admin/tape?tab=tape',
    d: () => `เลื่อนวันของ ${prWho('shift')} ไปอีก 1 วัน`,
    tip: () => [`เปิด <b>ผังห้อง</b> หาแถบของ ${prWho('shift')}`, '<b>แตะที่ชื่อ</b>บนแถบ แล้วกด <b>ย้ายวันที่พัก</b>', 'เลือกวันเข้าพักใหม่ให้เลื่อนไป <b>1 วัน</b> แล้วกด ถัดไป', 'ดูวันที่ใหม่และส่วนต่างราคา แล้วกด <b>ยืนยัน</b>'],
    ok: () => DB.bookings().some(b => PR_REAL(b) && b.checkIn !== b.practice.ci) },
  { id: 'approve', ic: 'fa-clipboard-check', t: 'อนุมัติการจองที่รออยู่', href: '#/admin/approvals',
    d: () => `ตรวจและอนุมัติการจองของ ${prWho('approve')}`,
    tip: () => [`ที่หน้านี้หา ${prWho('approve')} ที่มีป้าย “รออนุมัติ”`, 'ปกติให้ดูสลิปว่ายอดเงินตรงไหม (ของจริงลูกค้าจะแนบสลิปมา)', 'กด <b>อนุมัติ</b> (ถ้ามีถามว่ายังไม่มีสลิป ให้กดยืนยันเพื่อฝึก)'],
    ok: () => { const b = prFirst('approve'); return !!b && b.status !== 'pending'; } },
  { id: 'checkin', ic: 'fa-plane-arrival', t: 'เช็คอินแขกที่มาถึง', href: '#/admin/frontdesk',
    d: () => `เช็คอิน ${prWho('checkin')} ที่เข้าพักวันนี้${prStale('checkin') ? ' · ⚠ วันที่ไม่ตรงกับวันนี้แล้ว (กดทำเลย ระบบปรับให้)' : ''}`,
    tip: () => [`ที่ <b>แขกเข้า-ออกวันนี้</b> หา ${prWho('checkin')} ในแท็บแขกเข้า`, 'กด <b>เช็คอิน</b> (ถ้าระบบให้ลงทะเบียนผู้เข้าพัก กรอกชื่อคร่าวๆ ได้เลย เป็นข้อมูลตัวอย่าง)'],
    ok: () => !!prFirst('checkin')?.checkedInAt },
  { id: 'checkout', ic: 'fa-door-open', t: 'เช็คเอาท์แขกที่จะกลับ', href: '#/admin/frontdesk?tab=departures',
    d: () => `เช็คเอาท์ ${prWho('checkout')} ที่ครบกำหนดวันนี้${prStale('checkout') ? ' · ⚠ วันที่ไม่ตรงกับวันนี้แล้ว (กดทำเลย ระบบปรับให้)' : ''}`,
    tip: () => [`ที่ <b>แขกเข้า-ออกวันนี้</b> เลือกแท็บ <b>แขกออก</b>`, `หา ${prWho('checkout')} แล้วกด <b>เช็คเอาท์</b>`],
    ok: () => !!prFirst('checkout')?.checkedOutAt },
  { id: 'block', ic: 'fa-ban', t: 'ปิดห้องที่ขายทางอื่นแล้ว', href: '#/admin/tape?tab=month',
    d: () => 'ลองปิดห้อง 1 วัน (เช่น ขายทาง LINE ไปแล้ว) กันลูกค้าจองซ้ำ',
    tip: () => ['ที่ <b>ตารางห้องว่าง / ปิดห้อง</b> เลือกรีสอร์ทตัวอย่าง', 'กดปุ่ม <b>ปิดห้อง</b> เลือกประเภทห้องและวันที่ แล้วบันทึก'],
    ok: () => DB.bookings().some(b => b.source === 'external' && DB.hotel(b.hotelId)?.practice) },
  // ----- หมวด 2: ตั้งค่าการขาย (เลือกทำตามที่รีสอร์ทต้องการ · ข้ามได้) -----
  { id: 'restrict', grp: 'sell', opt: true, ic: 'fa-ban', t: 'ตั้งข้อจำกัดการขาย', href: '#/admin/restrict',
    d: () => 'เช่น ต้องพักขั้นต่ำ 2 คืนช่วงวันหยุด หรือห้ามเช็คอินบางวัน',
    tip: () => ['เลือกรีสอร์ทตัวอย่าง แล้วกำหนดช่วงวันที่ + ห้อง', 'เลือกกฎ เช่น <b>พักขั้นต่ำ (MinLOS)</b> = 2 คืน', 'กดเพิ่มกฎ — ลูกค้าที่จองไม่ตรงกฎจะจองไม่ได้ (ลบกฎทิ้งทีหลังได้)'],
    ok: () => !!prHotel()?.restrict?.length },
  { id: 'coupon', grp: 'sell', opt: true, ic: 'fa-ticket', t: 'สร้างโค้ดส่วนลด', href: '#/admin/coupons',
    d: () => 'สร้างโค้ดไว้แจกลูกค้า เช่น HELLO10 ลด 10% — ใช้ในภารกิจ “จองแบบลูกค้า” ต่อไป',
    tip: () => ['กดสร้างโค้ดใหม่ ตั้งชื่อโค้ด เช่น <b>HELLO10</b>', 'เลือกลดเป็น % หรือเป็นบาท และกำหนดยอดขั้นต่ำ (ถ้าต้องการ)', 'บันทึก — โค้ดนี้ใช้ได้กับรีสอร์ทของคุณเท่านั้น'],
    ok: () => DB.coupons().some(c => c.ownerId === DB.currentUser()?.id) },
  { id: 'guest', grp: 'sell', opt: true, ic: 'fa-user-check', t: 'ลองจองแบบลูกค้า + ใส่โค้ดส่วนลด', href: '#/admin/coupons', poll: true,
    d: () => 'ลองจองรีสอร์ทตัวอย่างเหมือนลูกค้าจริง ใส่โค้ดส่วนลด แล้วกลับมาอนุมัติในหน้า “ตรวจสลิป & อนุมัติ”',
    tip: () => [`<a href="${prGuestUrl()}" target="_blank" rel="noopener"><b>เปิดหน้ารีสอร์ทตัวอย่างแบบที่ลูกค้าเห็น (คลิกเพื่อทดสอบ)</b></a>`, 'เลือกวันและห้อง (ห้องสแตนดาร์ดจ่ายที่รีสอร์ทได้) แล้วกด จอง', 'ที่ขั้นกรอกข้อมูล ใส่<b>โค้ดส่วนลด</b>ที่สร้างไว้ แล้วกดใช้โค้ด ดูยอดที่ลดลง', 'กรอกชื่อ/อีเมล/เบอร์ปลอมได้ แล้วยืนยันการจอง — กลับมาที่นี่ ระบบจะติ๊กให้เอง และการจองจะไปอยู่ใน “ตรวจสลิป & อนุมัติ”'],
    ok: () => { const h = prHotel(); return !!h && DB.bookings().some(b => b.hotelId === h.id && b.source !== 'external' && !b.practice?.seed && b.price?.couponCode); } },
  { id: 'docs', grp: 'sell', opt: true, ic: 'fa-receipt', t: 'ดูเอกสารการเงิน', href: '#/admin/docs',
    d: () => 'ใบเสร็จ / ใบกำกับภาษี ออกให้ลูกค้าและส่งออกเป็น Excel',
    tip: () => ['ดูรายการเอกสารของการจองที่ชำระแล้ว', 'กดเปิดใบเสร็จ 1 ใบเพื่อดูหน้าตา และลองปุ่มส่งออก Excel'],
    ok: () => !!prGet('pr_open_docs') },
  { id: 'links', grp: 'sell', opt: true, ic: 'fa-link', t: 'ลิงก์จอง & กำหนดวัน', href: '#/admin/links', visit: '#/admin/links',
    d: () => 'คัดลอกลิงก์รีสอร์ท (กำหนดวันเข้าพัก/จำนวนคนล่วงหน้าได้) ไปแปะ LINE / Facebook',
    tip: () => ['ดูลิงก์ของรีสอร์ท แล้วลองกำหนดวันที่เข้าพักในลิงก์', 'กดคัดลอกลิงก์ — ส่งให้ลูกค้าแล้วเขาจะเห็นวันที่และราคาตรงกันทันที'],
    ok: () => !!prGet('pr_vis_links') },
  // ----- หมวด 3: เริ่มใช้งานจริง -----
  { id: 'real', ic: 'fa-store', t: 'เพิ่มรีสอร์ทจริงของคุณ', href: '#/admin/hotels', real: true,
    d: () => 'พร้อมแล้ว! ใส่ชื่อ รูป ห้อง และราคาของรีสอร์ทคุณเอง',
    tip: () => ['กด <b>เพิ่มรีสอร์ท</b> แล้วกรอกชื่อ รูป และประเภทห้อง', 'ตั้งราคาและจำนวนห้อง แล้วบันทึก'],
    ok: () => DB.hotels(true).some(h => !h.practice && h.rooms?.length) }, // รีสอร์ทที่เจ้าของเพิ่มเอง (ไม่ใช่รีสอร์ทตัวอย่าง) — ในบัญชีทดลอง trigger จะติดธง demo ให้รีสอร์ทใหม่ด้วย จึงไม่ใช้ !h.demo
  { id: 'payout', ic: 'fa-building-columns', t: 'ตั้งบัญชีรับเงิน', href: '#/admin/payout', real: true,
    d: () => 'ใส่พร้อมเพย์หรือเลขบัญชี เพื่อให้ลูกค้าโอนเงินถึงคุณโดยตรง',
    tip: () => ['กรอกพร้อมเพย์หรือเลขบัญชีธนาคาร', 'กดบันทึก'],
    ok: () => { const u = DB.currentUser(), po = (u?.biz?.demo ? u.biz.demoPayout : u?.payout) || {}; return (typeof isPromptpayId === 'function' && isPromptpayId(po.promptpayId)) || !!(po.bankInfo || '').trim(); } },
];

const PR_GROUPS = { ops: '1) จัดการการจองหน้างาน', sell: '2) ตั้งค่าการขาย · เลือกทำตามที่รีสอร์ทต้องการ (ข้ามได้)', real: '3) เริ่มใช้งานจริง' };
const prGrp = m => m.grp || (m.real ? 'real' : 'ops');
const prSkips = () => { try { return JSON.parse(prGet('pr_skip_') || '[]'); } catch { return []; } };
const prOk = m => m.ok() || prSkips().includes(m.id);
const prGuestUrl = () => siteUrl(`#/hotel/${prHotel()?.id}?practice=1`);
const prUid = () => DB.currentUser()?.id || '';
const prGet = k => { try { return localStorage.getItem(k + prUid()); } catch { return null; } };
const prSet = (k, v) => { try { v == null ? localStorage.removeItem(k + prUid()) : localStorage.setItem(k + prUid(), v); } catch { /* เบราว์เซอร์ไม่ให้เก็บค่า */ } };
const prOwner = () => { const u = DB.currentUser(); return !!u && u.role === 'owner' && u.ownerStatus === 'approved' && typeof portalRole === 'function' && portalRole(u) === 'owner'; };

async function prCall(action) {
  const { data, error } = await supa.functions.invoke('sd-practice', { body: { action } });
  if (error) { const body = await error.context?.json?.().catch(() => null); return { error: body?.error || error.message }; }
  return data?.error ? { error: data.error } : data;
}
async function prReload() { await DB.load(); if (typeof render === 'function') render(); }

async function prSeed(manual) {
  const r = await prCall('seed');
  if (r.error) { if (manual) toast(r.error, 'err'); return false; }
  prSet('pr_done_', null);
  await prReload();
  toast(manual ? 'สร้างข้อมูลตัวอย่างแล้ว — ลองทำภารกิจได้เลย' : 'เราเตรียมรีสอร์ทและการจองตัวอย่างไว้ให้ฝึกแล้ว 🎓');
  return true;
}
async function prClear() {
  if (!await confirmBox('ลบรีสอร์ทและการจองตัวอย่างทั้งหมด? (ข้อมูลจริงของคุณไม่ถูกลบ)', 'ลบข้อมูลตัวอย่าง')) return;
  const r = await prCall('clear'); if (r.error) return toast(r.error, 'err');
  prSet('pr_active_', null); prSet('pr_done_', '1');
  await prReload(); toast('ลบข้อมูลตัวอย่างแล้ว');
}

// เริ่มใหม่: ลบข้อมูลตัวอย่างเดิมแล้วสร้างชุดใหม่ (วันที่ตรงกับวันนี้ ภารกิจกลับมาเป็น 0%)
async function prReset() {
  if (!await confirmBox('เริ่มภารกิจใหม่ทั้งหมด? ระบบจะลบรีสอร์ทและการจองตัวอย่างเดิม แล้วสร้างชุดใหม่ที่วันที่ตรงกับวันนี้ (ข้อมูลจริงไม่ถูกลบ)', 'เริ่มใหม่')) return;
  const c = await prCall('clear'); if (c.error) return toast(c.error, 'err');
  prSet('pr_active_', null);
  await prSeed(true);
}

// ภารกิจที่ใช้ได้: ไม่มีรีสอร์ทตัวอย่าง → ข้ามภารกิจที่ต้องใช้ข้อมูลตัวอย่าง
// มีรีสอร์ทตัวอย่างแล้ว = ทำเฉพาะภารกิจฝึก (หมวด 1-2) ไม่แสดง “เริ่มใช้งานจริง” เพราะเป็นข้อมูลที่ระบบสร้างให้
function prList() { const has = !!prHotel(); return PR_MISSIONS.filter(m => has ? !m.real : m.real); }
function prProgress() { const l = prList(), done = l.filter(prOk).length; return { l, done, pct: l.length ? Math.round(done / l.length * 100) : 0 }; }

// กำลังแสดงการ์ดภารกิจฝึกอยู่ไหม — ถ้าใช่ เช็กลิสต์ “เริ่มต้นใช้งาน” จะซ่อน (ภารกิจ “เพิ่มรีสอร์ทจริง/ตั้งบัญชีรับเงิน” ซ้ำกับมัน)
const prShowing = () => prOwner() && !prGet('pr_done_') && !!prHotel() && prProgress().pct < 100;

// การ์ดที่หน้าภาพรวม — ครบ 100% แล้วหายไป
function prCard() {
  if (!prOwner() || prGet('pr_done_')) return '';
  const has = !!prHotel(), { l, done, pct } = prProgress();
  if (!has) {
    return DB.currentUser()?.biz?.demo ? `<section class="card pr-card"><div class="card-h"><h3><i class="fa-solid fa-graduation-cap"></i> ฝึกใช้งานด้วยข้อมูลตัวอย่าง</h3></div>
      <p class="small muted" style="margin:0 0 10px">สร้างรีสอร์ทและการจองปลอม แล้วลองย้ายห้อง เลื่อนวัน เช็คอิน ได้เต็มที่ — ไม่กระทบเว็บไซต์จริง</p><button class="btn btn-primary btn-sm" id="pr-seed"><i class="fa-solid fa-wand-magic-sparkles"></i> สร้างข้อมูลตัวอย่าง</button></section>` : '';
  }
  if (pct >= 100) return '';
  const act = prGet('pr_active_');
  return `<section class="card pr-card"><div class="card-h"><h3><i class="fa-solid fa-graduation-cap"></i> ภารกิจฝึกใช้งาน — ทำจริงกับข้อมูลตัวอย่าง</h3><span class="small muted">${done}/${l.length} ภารกิจ</span></div>
    <div class="pr-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span><b>${pct}%</b></div>
    <p class="small muted" style="margin:8px 0 4px">ในระบบมีรีสอร์ท “ตัวอย่าง” และแขกปลอมให้ลองกดได้เต็มที่ ไม่แสดงบนเว็บไซต์จริง · กด “ทำเลย” แล้วระบบจะพาไปและบอกขั้นตอนทีละข้อ</p>
    ${l.map((m, i) => { const ok = prOk(m), skipped = !m.ok() && ok, head = i === 0 || prGrp(l[i - 1]) !== prGrp(m) ? `<div class="small muted" style="margin:12px 0 2px;font-weight:600">${PR_GROUPS[prGrp(m)]}</div>` : '';
      return head + `<div class="ck-step pr-step ${ok ? 'done' : ''} ${act === m.id ? 'on' : ''}"><span class="ck-n">${ok ? '<i class="fa-solid fa-check"></i>' : `<i class="fa-solid ${m.ic}"></i>`}</span><div><b>${m.t}</b><small>${m.d()}</small></div>${ok ? `<span class="pill ok">${skipped ? 'ข้ามแล้ว' : 'เสร็จแล้ว'}</span>` : `${m.opt ? `<button type="button" class="btn btn-sm btn-ghost" data-prskip="${m.id}">ข้าม</button>` : ''}<button type="button" class="btn btn-sm btn-primary" data-pr="${m.id}">ทำเลย</button>`}</div>`; }).join('')}
    <div class="row" style="justify-content:space-between;margin-top:8px"><button type="button" class="btn btn-primary btn-sm" id="pr-go"><i class="fa-solid fa-forward"></i> ทำต่อเนื่องตามลำดับ</button><button type="button" class="btn btn-ghost btn-sm" id="pr-reset"><i class="fa-solid fa-rotate-left"></i> เริ่มใหม่</button><button type="button" class="btn btn-ghost btn-sm" id="pr-clear"><i class="fa-regular fa-trash-can"></i> ลบข้อมูลตัวอย่าง</button></div></section>`;
}
function prBind(main) {
  $('#pr-seed', main)?.addEventListener('click', e => { e.target.disabled = true; prSeed(true); });
  $('#pr-clear', main)?.addEventListener('click', prClear);
  $('#pr-reset', main)?.addEventListener('click', prReset);
  $('#pr-go', main)?.addEventListener('click', () => { const n = prList().find(x => !prOk(x)); if (n) prStart(n.id); });
  $$('[data-prskip]', main).forEach(b => b.onclick = () => { prSet('pr_skip_', JSON.stringify([...prSkips(), b.dataset.prskip])); prReload().then(prCheckDone); });
  $$('[data-pr]', main).forEach(b => b.onclick = () => prStart(b.dataset.pr));
}

function prStart(id) {
  const m = PR_MISSIONS.find(x => x.id === id); if (!m) return;
  if ((id === 'checkin' || id === 'checkout') && prStale(id) && prAlign(id)) toast('ปรับวันที่ของการจองตัวอย่างให้ตรงกับวันนี้แล้ว', 'info');
  prSet('pr_active_', id); prSet('pr_tipoff_', null);
  if (location.hash === m.href) prAfterShell(); else location.hash = m.href;
}

let prTimer;
// แถบนำทางขั้นตอน (อยู่เหนือเนื้อหา) + เช็คความสำเร็จทุก 1.2 วินาทีขณะทำภารกิจ
function prAfterShell() {
  if (!prOwner()) return;
  prAutoSeed();
  const nav = $('.bo-nav');
  if (nav && !$('#pr-clr') && prHotel()) {
    const box = $('#obx') || nav.appendChild(Object.assign(document.createElement('div'), { id: 'obx', className: 'tour-box' }));
    const b = document.createElement('button'); b.type = 'button'; b.id = 'pr-clr'; b.className = 'tour-btn'; b.innerHTML = '<i class="fa-regular fa-trash-can"></i> ลบข้อมูลตัวอย่าง'; b.onclick = prClear; box.appendChild(b);
  }
  $('#pr-tip')?.remove();
  const id = prGet('pr_active_'), m = PR_MISSIONS.find(x => x.id === id), main = $('#bo-main');
  if (!m || !main || !prHotel()) { clearInterval(prTimer); return; }
  if (m.ok()) return prDone(m);
  prVisit(m);
  if (prGet('pr_tipoff_') === id) return prWatch(m);
  const bar = document.createElement('div'); bar.id = 'pr-tip'; bar.className = 'pr-tip';
  bar.innerHTML = `<div class="pr-tip-h"><b><i class="fa-solid fa-graduation-cap"></i> ภารกิจ: ${m.t}</b><button type="button" class="btn btn-ghost btn-sm" id="pr-tip-x">ซ่อน</button></div>
    <ol>${m.tip().map(s => `<li>${s}</li>`).join('')}</ol><div class="small muted">ทำเสร็จแล้วระบบจะติ๊กให้เอง · ข้อมูลที่เห็นเป็นตัวอย่าง ลองผิดได้ไม่เสียหาย</div>`;
  main.parentElement.insertBefore(bar, main);
  $('#pr-tip-x', bar).onclick = () => { prSet('pr_tipoff_', id); bar.remove(); };
  prWatch(m);
}

// เฝ้าดูว่าภารกิจที่กำลังทำเสร็จหรือยัง (ทำงานแม้ผู้ใช้ซ่อนแถบนำทางแล้ว)
// ภารกิจ “ดูเอกสารการเงิน”: ติ๊กเมื่อกดเปิดเอกสารจริง (เรียกจาก boDocs) ไม่ใช่แค่เข้าหน้า
function prMarkDoc() { if (prGet('pr_active_') === 'docs') prSet('pr_open_docs', '1'); }
function prVisit(m) { if (m.visit && location.hash.split('?')[0] === m.visit && prGet('pr_active_') === m.id) prSet('pr_vis_' + m.id, '1'); }
function prWatch(m) {
  clearInterval(prTimer); let n = 0;
  prTimer = setInterval(async () => {
    if (!prGet('pr_active_')) return clearInterval(prTimer);
    if (m.poll && ++n % 4 === 0) { try { await DB.load(); } catch { /* ลองใหม่รอบหน้า */ } }
    prVisit(m);
    if (m.ok()) prDone(m);
  }, 1000);
}

// ภารกิจเสร็จ → แจ้ง แล้วพากลับหน้าภาพรวมวันนี้ · ไม่เหลือแล้ว = ปิดภารกิจ
function prDone(m) {
  clearInterval(prTimer); prSet('pr_active_', null); $('#pr-tip')?.remove();
  const next = prList().find(x => !prOk(x));
  toast(`🎉 ทำภารกิจ “${m.t}” สำเร็จ!${next ? ` · ต่อไป: ${next.t}` : ''}`);
  if (!next) { if (/^#\/admin(\/today)?\/?(\?|$)/.test(location.hash)) prReload(); prFinish(); return; }
  // กลับหน้า “ภาพรวมวันนี้” ให้เห็นการ์ดภารกิจ แล้วเลือกทำภารกิจต่อเอง (หรือกด “ทำต่อเนื่องตามลำดับ”)
  setTimeout(() => {
    if (!location.hash.startsWith('#/admin') || prGet('pr_active_')) return;
    if (/^#\/admin(\/today)?\/?(\?|$)/.test(location.hash)) prReload(); else location.hash = '#/admin/today';
  }, 1200);
}

// ครบทุกภารกิจ → การ์ดหาย + เสนอลบข้อมูลตัวอย่าง
async function prFinish() {
  if (prGet('pr_done_')) return;
  prSet('pr_done_', '1');
  if (await confirmBox('🎉 ทำครบทุกภารกิจแล้ว! พร้อมรับแขกจริง<br>ลบรีสอร์ทและการจองตัวอย่างออกเลยไหม?', 'ลบข้อมูลตัวอย่าง')) {
    const r = await prCall('clear'); if (r.error) return toast(r.error, 'err');
    toast('ลบข้อมูลตัวอย่างแล้ว');
  }
  await prReload();
}

// เจ้าของใหม่ที่ได้รับอนุมัติ: สร้างข้อมูลตัวอย่างให้อัตโนมัติครั้งเดียว (ไม่รวมบัญชีทดลอง)
async function prAutoSeed() {
  if (window.__prAuto || !prOwner()) return;
  const u = DB.currentUser();
  if (u.biz?.demo || u.biz?.practiceSeeded || prHotel() || prGet('pr_done_') || prGet('pr_tried_')) return;
  if (!u.createdAt || Date.now() - new Date(u.createdAt).getTime() > 14 * 86400000) return;
  window.__prAuto = true; prSet('pr_tried_', '1');
  await prSeed(false);
}

// ภารกิจครบเมื่อไรก็ตามที่มีการ render หน้าภาพรวม (เช่น ทำเสร็จแล้วค่อยกลับมา)
function prCheckDone() { if (prOwner() && prHotel() && !prGet('pr_done_') && prProgress().pct >= 100) prFinish(); }

(function prStyle() {
  const s = document.createElement('style');
  s.textContent = `.pr-card{margin-bottom:16px;border:1px solid #bae6fd;background:linear-gradient(180deg,#f0f9ff,#fff)}
.pr-bar{position:relative;height:22px;border-radius:99px;background:#e2e8f0;overflow:hidden}
.pr-bar span{position:absolute;inset:0 auto 0 0;background:linear-gradient(90deg,#38bdf8,#22c55e);border-radius:99px;transition:width .4s}
.pr-bar b{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:.78rem;color:#0f172a}
.pr-step.on{background:#fffbeb;border-radius:10px}.pr-step.done small{text-decoration:line-through}
.pr-tip{margin:0;padding:12px 24px;background:#fffbeb;border-bottom:1px solid #fde68a;color:#78350f;font-size:.9rem;line-height:1.7}
.pr-tip ol{margin:6px 0;padding-left:20px}.pr-tip-h{display:flex;align-items:center;justify-content:space-between;gap:8px}`;
  document.head.appendChild(s);
})();

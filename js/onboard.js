// ================= เจ้าของรีสอร์ทมือใหม่: เมนูพื้นฐาน + ตัวนำทางทีละขั้น (coach marks) =================
// - โหมดเมนูพื้นฐาน: แสดงเฉพาะเมนูที่จำเป็น (กด “แสดงเมนูทั้งหมด” ได้ตลอด) · เปิดอัตโนมัติสำหรับบัญชีทดลองและบัญชีที่สมัครไม่เกิน 14 วัน
// - ตัวนำทาง: ไฮไลต์เมนูทีละจุดพร้อมคำอธิบาย (ถัดไป / ย้อนกลับ / ข้าม) · เปิดซ้ำได้จากปุ่มท้ายเมนู
// ต่อเข้ากับ admin.js ผ่าน obHidden() (ใน navArrange) และ obAfterShell() (หลังวาดเมนู)

const OB_BASIC = ['today', 'tape', 'approvals', 'bookings', 'frontdesk', 'calendar', 'rooms', 'prices', 'shop', 'links', 'payout'];
const OB_STEPS = [
  { k: null, t: 'ยินดีต้อนรับ 👋', d: 'ระบบนี้ช่วยรับจอง จัดห้อง และเก็บเงินแทนคุณ — เราจะพาดูเมนูหลักทีละจุด ใช้เวลาไม่ถึง 1 นาที (กด “ข้าม” เมื่อไหร่ก็ได้)' },
  { k: 'today', t: '1) ภาพรวมวันนี้', d: 'หน้าแรกของคุณ — ดูว่าวันนี้มีแขกเข้า-ออกกี่ห้อง และมีอะไรต้องทำบ้าง เปิดทุกเช้าเพื่อดูงานของวัน' },
  { k: 'rooms', t: '2) ห้องพัก (เริ่มที่นี่)', d: 'เพิ่มประเภทห้อง ใส่รูป จำนวนห้อง และราคาพื้นฐาน — ต้องตั้งก่อน ลูกค้าถึงจะเห็นห้องบนหน้าเว็บ' },
  { k: 'prices', t: '3) ตั้งราคา', d: 'ปรับราคาเฉพาะวัน เช่น วันหยุดยาวขึ้นราคา ช่วงโลว์ซีซันลดราคา ไม่ต้องแก้ราคาพื้นฐาน' },
  { k: 'shop', t: '4) หน้ารีสอร์ท', d: 'แต่งหน้าที่ลูกค้าเห็น: ชื่อ รูปสวยๆ จุดเด่น แผนที่ เวลาเช็คอิน-เอาท์ แล้วกดเปิดขาย' },
  { k: 'payout', t: '5) บัญชีรับเงิน', d: 'ใส่บัญชีธนาคารที่จะรับเงินจากลูกค้า ต้องกรอกก่อนเริ่มรับจองจริง' },
  { k: 'links', t: '6) ลิงก์ส่งลูกค้า', d: 'คัดลอกลิงก์รีสอร์ทไปแปะใน LINE / Facebook / Instagram ให้ลูกค้าจองเองได้ทันที' },
  { k: 'bookings', t: '7) การจอง', d: 'รายการจองทั้งหมด — ดูรายละเอียด ตรวจสลิป อนุมัติ หรือยกเลิก ลูกค้าจองใหม่จะมีจุดแดงแจ้งที่เมนูนี้' },
  { k: 'frontdesk', t: '8) แขกเข้า-ออกวันนี้', d: 'ใช้ตอนหน้างาน: กดเช็คอินเมื่อแขกมาถึง และเช็คเอาท์เมื่อแขกกลับ' },
  { k: 'calendar', t: '9) ตารางห้องว่าง', d: 'ดูห้องว่างทั้งเดือน และ “ปิดห้อง” วันที่ไม่ต้องการขาย (เช่น ซ่อมแซม หรือเจ้าของพักเอง)' },
  { k: '.bo-nav .nav-more', t: 'เมนูอื่นๆ อยู่ตรงไหน?', d: 'เราพับเมนูที่ยังไม่ต้องใช้ไว้ล่างสุดของแต่ละหมวด กด “แสดงเมนูเพิ่ม” เพื่อกางออกเมื่อต้องการ — จะปรับว่าเมนูไหนแสดงประจำได้ที่ “ตั้งค่าเมนู”' },
];
const obUid = () => DB.currentUser()?.id || '';
const obGet = k => { try { return localStorage.getItem(k + obUid()); } catch { return null; } };
const obSet = (k, v) => { try { v == null ? localStorage.removeItem(k + obUid()) : localStorage.setItem(k + obUid(), v); } catch { /* เบราว์เซอร์ไม่ให้เก็บค่า */ } };
const obIsOwner = () => { const u = DB.currentUser(); return !!u && u.role === 'owner' && portalRole(u) === 'owner'; };
const obIsDemo = () => !!DB.currentUser()?.biz?.demo;
function obIsBasic() {
  if (!obIsOwner()) return false;
  const m = obGet('bo_mode_');
  if (m) return m === 'basic';
  const u = DB.currentUser();
  return obIsDemo() || (!!u.createdAt && Date.now() - new Date(u.createdAt).getTime() < 14 * 86400000);
}
// เมนูที่ซ่อนในโหมดพื้นฐาน (เรียกจาก navArrange)
function obHidden() {
  if (!obIsBasic()) return new Set();
  return new Set(navFor('owner').flatMap(g => g.items.map(i => i[0])).filter(k => !OB_BASIC.includes(k) && k !== 'menuset'));
}

let obDemoInfo; // undefined = ยังไม่โหลด · null = ไม่ใช่บัญชีทดลอง/โหลดไม่ได้
async function obLoadDemo() {
  if (obDemoInfo !== undefined || !obIsDemo()) return;
  obDemoInfo = null;
  try { const r = await supa.from('sd_demo_accounts').select('expires_at,label').maybeSingle(); if (r.data) { obDemoInfo = r.data; obAfterShell(); } } catch { /* ยังไม่มีตาราง */ }
}

function obAfterShell() {
  if (!obIsOwner()) return;
  const nav = $('.bo-nav'); if (!nav) return;
  $('#obx')?.remove();
  const basic = obIsBasic(), hiddenN = obHidden().size;
  const box = document.createElement('div');
  box.id = 'obx'; box.className = 'tour-box';
  box.innerHTML = `${obGet('bo_tour_') ? '' : '<button type="button" class="tour-btn" id="ob-tour"><i class="fa-solid fa-route"></i> ดูวิธีใช้ทีละขั้น</button>'}
    ${basic ? '' : `<button type="button" class="tour-btn" id="ob-mode"><i class="fa-solid fa-eye-slash"></i> ใช้เมนูพื้นฐาน</button>`}`;
  if (box.querySelector('button')) nav.appendChild(box);
  $('#ob-tour', box)?.addEventListener('click', () => obTour());
  $('#ob-mode', box)?.addEventListener('click', () => { obSet('bo_mode_', basic ? 'all' : 'basic'); render(); });

  // กาง/พับเมนูที่ซ่อนไว้ของแต่ละหมวด
  $$('.bo-nav .nav-more').forEach(btn => btn.onclick = () => {
    const ex = $(`.bo-nav .nav-extra[data-ne="${btn.dataset.nm}"]`), open = ex.hidden;
    ex.hidden = !open; btn.classList.toggle('open', open);
    btn.lastChild.textContent = open ? ' ซ่อนเมนูที่ไม่ได้ใช้' : ` แสดงเมนูเพิ่ม (+${ex.children.length})`;
    navOpenSet(btn.dataset.gn, open);
  });

  // แถบบัญชีทดลอง
  const main = $('#bo-main');
  $('#ob-demo')?.remove();
  if (main && obIsDemo()) {
    const exp = obDemoInfo?.expires_at, left = exp ? Math.max(0, Math.ceil((new Date(exp) - Date.now()) / 86400000)) : null;
    const bn = document.createElement('div'); bn.id = 'ob-demo'; bn.className = 'bo-banner warn';
    bn.innerHTML = `<i class="fa-solid fa-flask"></i> บัญชีทดลองใช้ — ข้อมูลเป็นตัวอย่าง ไม่แสดงบนเว็บไซต์จริง${left != null ? ` · ใช้ได้อีก ${left} วัน` : ''}`;
    main.parentElement.insertBefore(bn, main);
    obLoadDemo();
  }

  // เปิดตัวนำทางอัตโนมัติครั้งแรก (เฉพาะโหมดพื้นฐานที่เปิดอัตโนมัติ)
  if (typeof prAfterShell === 'function') prAfterShell();
  if (basic && !obGet('bo_tour_') && !window.__obAuto) { window.__obAuto = true; setTimeout(() => { if (!obGet('bo_tour_') && $('.bo-nav')) obTour(); }, 700); }
}

function obTour() {
  document.getElementById('tour-ov')?.remove();
  const side = $('#bo-side'), scrim = $('#bo-scrim'), mobile = window.matchMedia('(max-width: 900px)').matches;
  if (mobile) { side?.classList.add('open'); scrim?.classList.add('open'); }
  const steps = OB_STEPS.filter(s => !s.k || (s.k[0] === '#' ? $(s.k) : $(`.bo-nav a[href="#/admin/${s.k}"]`)));
  let i = 0;
  const ov = document.createElement('div'); ov.id = 'tour-ov'; ov.className = 'tour-ov';
  ov.innerHTML = '<div class="tour-spot"></div><div class="tour-card" role="dialog" aria-live="polite"></div>';
  document.body.appendChild(ov);
  const spot = $('.tour-spot', ov), card = $('.tour-card', ov);
  const done = () => { obSet('bo_tour_', '1'); $('#ob-tour')?.remove(); ov.remove(); window.removeEventListener('resize', place); if (mobile) { side?.classList.remove('open'); scrim?.classList.remove('open'); } };
  function place() {
    const s = steps[i], el = !s.k ? null : s.k[0] === '#' ? $(s.k) : $(`.bo-nav a[href="#/admin/${s.k}"]`);
    if (el) el.scrollIntoView({ block: 'center' });
    const r = el?.getBoundingClientRect();
    if (r) { spot.style.cssText = `display:block;left:${r.left - 4}px;top:${r.top - 4}px;width:${r.width + 8}px;height:${r.height + 8}px`; }
    else spot.style.cssText = 'display:none';
    const last = i === steps.length - 1;
    card.innerHTML = `<div class="small muted">ขั้นที่ ${i + 1} / ${steps.length}</div><h4>${esc(s.t)}</h4><p>${esc(s.d)}</p>
      <div class="tour-act"><button type="button" class="btn btn-sm btn-ghost" id="ob-skip">${last ? '' : 'ข้าม'}</button><span style="flex:1"></span>
      ${i ? '<button type="button" class="btn btn-sm btn-outline" id="ob-back">ย้อนกลับ</button>' : ''}<button type="button" class="btn btn-sm btn-primary" id="ob-next">${last ? 'เริ่มใช้งาน' : 'ถัดไป'}</button></div>`;
    $('#ob-skip', card)?.addEventListener('click', done);
    $('#ob-back', card)?.addEventListener('click', () => { i--; place(); });
    $('#ob-next', card).onclick = () => { if (last) done(); else { i++; place(); } };
    // วางการ์ด: เดสก์ท็อป = ขวาของจุดที่ไฮไลต์ · มือถือ = ด้านล่างจอ
    if (mobile || !r) card.style.cssText = mobile ? 'left:12px;right:12px;bottom:12px' : 'left:50%;top:50%;transform:translate(-50%,-50%)';
    else { const top = Math.min(Math.max(12, r.top - 8), window.innerHeight - card.offsetHeight - 12); card.style.cssText = `left:${r.right + 18}px;top:${top}px`; }
  }
  window.addEventListener('resize', place);
  ov.addEventListener('keydown', e => { if (e.key === 'Escape') done(); });
  place();
}

(function obStyle() {
  const s = document.createElement('style');
  s.textContent = `.tour-box{margin:14px 10px 18px;padding-top:12px;border-top:1px dashed rgba(255,255,255,.25);display:grid;gap:8px}
.tour-btn{display:flex;align-items:center;gap:8px;width:100%;padding:9px 12px;border-radius:10px;border:1px solid rgba(148,163,184,.45);background:transparent;color:inherit;font:inherit;font-size:.86rem;cursor:pointer;text-align:left}
.nav-more{display:flex;align-items:center;gap:8px;width:100%;margin:2px 0 4px;padding:7px 10px;border-radius:8px;border:1px dashed rgba(148,163,184,.4);background:transparent;color:inherit;opacity:.75;font:inherit;font-size:.8rem;cursor:pointer;text-align:left}
.nav-more:hover{opacity:1;background:rgba(148,163,184,.14)}
.nav-more i{transition:transform .2s;font-size:.7rem}.nav-more.open i{transform:rotate(180deg)}
.nav-extra[hidden]{display:none}
.tour-btn:hover{background:rgba(148,163,184,.16)}
.tour-ov{position:fixed;inset:0;z-index:9000}
.tour-spot{position:fixed;border-radius:10px;box-shadow:0 0 0 9999px rgba(10,15,30,.62),0 0 0 3px #38bdf8;pointer-events:none;transition:all .2s}
.tour-card{position:fixed;width:min(340px,calc(100vw - 24px));background:#fff;color:#0f172a;border-radius:14px;padding:16px;box-shadow:0 18px 50px rgba(0,0,0,.35)}
.tour-card h4{margin:2px 0 6px;font-size:1.05rem}.tour-card p{margin:0 0 12px;font-size:.92rem;line-height:1.6;color:#334155}
.tour-act{display:flex;gap:8px;align-items:center}`;
  document.head.appendChild(s);
})();

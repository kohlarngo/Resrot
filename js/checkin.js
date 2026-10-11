// ================= ทะเบียนผู้เข้าพัก (เช็คอินแบบไม่ใช้กระดาษ) =================
// เจ้าของรีสอร์ทเปิดบนมือถือ/แท็บเล็ต → กรอกข้อมูลผู้เข้าพัก ถ่ายรูปบัตรประชาชน/พาสปอร์ตด้วยกล้อง → ผู้เข้าพักเซ็นบนหน้าจอ → เช็คอิน
// ข้อมูลเก็บใน sd_checkins + bucket sd-checkin (ส่วนตัว) — เฉพาะเจ้าของรีสอร์ทนั้นเปิดดูได้ แอดมิน/นักพัฒนาเปิดไม่ได้ (บังคับที่ RLS)

const CK_DOC = { idcard: 'บัตรประชาชน', passport: 'พาสปอร์ต', other: 'เอกสารอื่น (ใบขับขี่ ฯลฯ)' };
const CK_KEEP_DAYS = 45; // ต้องตรงกับ KEEP_DAYS ใน Edge Function sd-checkin-purge
const ckExpiry = reg => { const d = new Date(new Date(reg.registeredAt || reg.savedAt).getTime() + CK_KEEP_DAYS * 864e5); return { date: d, left: Math.max(0, Math.ceil((d - Date.now()) / 864e5)) }; };
const CK_CONSENT = 'ข้าพเจ้ายินยอมให้รีสอร์ทเก็บสำเนาบัตรประชาชน/พาสปอร์ตและลายเซ็นของข้าพเจ้า เพื่อใช้ลงทะเบียนผู้เข้าพักตามที่กฎหมายกำหนดและเพื่อความปลอดภัย ข้อมูลจะถูกเก็บเป็นความลับ เข้าถึงได้เฉพาะรีสอร์ทนี้และผู้ดูแลระบบที่ได้รับมอบหมาย (ดูเพื่อดูแลระบบเท่านั้น) และจะถูกลบอัตโนมัติเมื่อครบ 45 วัน';

function ckDocOk(g) {
  const n = String(g.docNo || '').trim();
  if (g.docType === 'idcard') return /^\d{13}$/.test(n.replace(/\D/g, ''));
  if (g.docType === 'passport') return /^[A-Za-z0-9]{5,20}$/.test(n.replace(/[\s-]/g, ''));
  return n.length >= 3;
}

// เปิดฟอร์มลงทะเบียน — คืน 'saved' (บันทึกแล้ว) · 'skip' (ข้าม เช็คอินอย่างเดียว) · null (ปิด/ยกเลิก)
function ckForm(b, { allowSkip = false } = {}) {
  return new Promise(resolve => {
    const total = Math.max(1, (b.adults || 1) + (b.children || 0));
    const rules = String(DB.hotel(b.hotelId)?.houseRules || '').split('\n').map(x => x.trim()).filter(Boolean); // กฎที่เจ้าของตั้ง ณ ตอนนี้ (เก็บสำเนาไว้ในทะเบียนที่เซ็น)
    const guests = [{ name: guestName(b), docType: 'idcard', docNo: '', nation: 'ไทย', photo: null, url: '' }];
    const ov = document.createElement('div');
    ov.className = 'ck-screen';
    ov.innerHTML = `<div class="ck-wrap">
      <div class="ck-head"><div><h2><i class="fa-solid fa-id-card"></i> ลงทะเบียนผู้เข้าพัก</h2>
        <div class="small muted">${esc(b.id)} · ${esc(b.hotelName)} · ${b.qty} × ${esc(b.roomName)} · ${fmtDate(b.checkIn, false)} – ${fmtDate(b.checkOut, false)}</div></div>
        <button type="button" class="ck-x" data-ck="close" aria-label="ปิด"><i class="fa-solid fa-xmark"></i></button></div>
      <div id="ck-guests"></div>
      <button type="button" class="btn btn-outline btn-block" id="ck-add" style="margin:8px 0 18px"><i class="fa-solid fa-user-plus"></i> เพิ่มผู้เข้าพักอีกท่าน</button>
      <section class="ck-card"><h3>ข้อมูลติดต่อ</h3><div class="form-grid">
        <div class="fg"><label>เบอร์โทร</label><input id="ck-phone" type="tel" inputmode="tel" value="${esc(b.guest.phone || '')}" maxlength="30"></div>
        <div class="fg"><label>ทะเบียนรถ / มอเตอร์ไซค์ (ถ้ามี)</label><input id="ck-car" maxlength="30" placeholder="เช่น กข 1234 ชลบุรี"></div></div></section>
      ${rules.length ? `<section class="ck-card"><h3><i class="fa-solid fa-scale-balanced"></i> กฎของรีสอร์ท</h3>
        <ol class="ck-rules">${rules.map(r => `<li>${esc(r)}</li>`).join('')}</ol>
        <label class="small" style="display:flex;gap:8px;align-items:flex-start;margin-top:8px"><input type="checkbox" id="ck-rules" style="margin-top:3px"><span><b>ข้าพเจ้าได้อ่านและยอมรับกฎของรีสอร์ทข้างต้นทุกข้อ</b></span></label></section>` : ''}
      <section class="ck-card"><h3>ลายเซ็นผู้เข้าพัก</h3>
        <label class="small" style="display:flex;gap:8px;align-items:flex-start;margin-bottom:10px"><input type="checkbox" id="ck-consent" style="margin-top:3px"><span>${CK_CONSENT}</span></label>
        <canvas id="ck-sig" class="ck-sig" aria-label="พื้นที่เซ็นชื่อ"></canvas>
        <div class="row between" style="margin-top:6px"><span class="small muted">ให้ผู้เข้าพักเซ็นด้วยนิ้วหรือปากกาบนหน้าจอ</span><button type="button" class="btn btn-sm btn-ghost" id="ck-clear"><i class="fa-solid fa-eraser"></i> ล้างลายเซ็น</button></div></section>
      <label class="small" style="display:flex;gap:8px;align-items:center;margin:0 0 10px"><input type="checkbox" id="ck-print" ${(() => { try { return localStorage.getItem('sd_ck_print') === '1' ? 'checked' : ''; } catch { return ''; } })()}><span><i class="fa-solid fa-print"></i> พิมพ์ / บันทึกเป็น PDF ทันทีหลังบันทึก</span></label>
      <div class="red small" id="ck-err" style="margin:0 0 8px"></div>
      <div class="ck-actions">${allowSkip ? '<button type="button" class="btn btn-ghost" data-ck="skip">ข้าม (เช็คอินอย่างเดียว)</button>' : '<button type="button" class="btn btn-ghost" data-ck="close">ยกเลิก</button>'}
        <button type="button" class="btn btn-primary btn-lg" id="ck-save"><i class="fa-solid fa-check"></i> บันทึกทะเบียน</button></div></div>`;
    document.body.appendChild(ov);
    document.body.style.overflow = 'hidden';

    const finish = r => { guests.forEach(g => g.url && URL.revokeObjectURL(g.url)); ov.remove(); if (!$('#modal')) document.body.style.overflow = ''; resolve(r); };
    const err = t => { $('#ck-err', ov).textContent = t || ''; if (t) $('#ck-err', ov).scrollIntoView({ block: 'center', behavior: 'smooth' }); };

    // ---------- รายการผู้เข้าพัก ----------
    const gHtml = (g, i) => `<section class="ck-card" data-g="${i}">
      <div class="row between"><h3>ผู้เข้าพักท่านที่ ${i + 1}${i === 0 ? ' <span class="small muted">(ผู้จอง)</span>' : ''}</h3>${i ? `<button type="button" class="btn btn-sm btn-ghost red" data-ck="rm" data-i="${i}"><i class="fa-solid fa-trash"></i> ลบ</button>` : ''}</div>
      <div class="ck-seg">${Object.entries(CK_DOC).map(([k, l]) => `<button type="button" class="${g.docType === k ? 'on' : ''}" data-ck="doc" data-i="${i}" data-k="${k}">${l}</button>`).join('')}</div>
      <div class="form-grid" style="margin-top:12px">
        <div class="fg full"><label>ชื่อ-นามสกุล (ตามเอกสาร)</label><input data-f="name" data-i="${i}" value="${esc(g.name)}" maxlength="100" autocomplete="off"></div>
        <div class="fg"><label>${g.docType === 'passport' ? 'เลขพาสปอร์ต' : g.docType === 'idcard' ? 'เลขบัตรประชาชน 13 หลัก' : 'เลขที่เอกสาร'}</label><input data-f="docNo" data-i="${i}" value="${esc(g.docNo)}" maxlength="30" inputmode="${g.docType === 'idcard' ? 'numeric' : 'text'}" autocomplete="off"></div>
        <div class="fg"><label>สัญชาติ</label><input data-f="nation" data-i="${i}" value="${esc(g.nation)}" maxlength="40" autocomplete="off"></div></div>
      <div class="ck-photo">${g.url ? `<img src="${g.url}" alt="รูปเอกสาร">` : '<div class="ck-ph-empty"><i class="fa-solid fa-camera"></i><span>ยังไม่มีรูปเอกสาร</span></div>'}
        <div class="row" style="gap:8px;margin-top:8px"><button type="button" class="btn btn-primary" data-ck="cam" data-i="${i}"><i class="fa-solid fa-camera"></i> ${g.url ? 'ถ่ายใหม่' : 'ถ่ายรูปเอกสาร'}</button>
          <button type="button" class="btn btn-outline" data-ck="pick" data-i="${i}"><i class="fa-regular fa-image"></i> เลือกจากเครื่อง</button></div></div></section>`;
    const draw = () => { $('#ck-guests', ov).innerHTML = guests.map(gHtml).join(''); $('#ck-add', ov).style.display = guests.length >= total ? 'none' : ''; };
    draw();

    const pickPhoto = (i, camera) => {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; if (camera) inp.setAttribute('capture', 'environment');
      inp.onchange = async () => {
        const f = inp.files[0]; if (!f) return;
        try {
          toast('กำลังประมวลผลรูป...', 'info');
          const blob = await Promise.race([resizeImage(f, 1800), new Promise((_, no) => setTimeout(() => no(new Error('ไฟล์รูปนี้เปิดไม่ได้ ลองถ่ายใหม่หรือเลือกไฟล์ JPG/PNG')), 15000))]);
          if (!blob) throw new Error('แปลงรูปไม่สำเร็จ'); if (guests[i].url) URL.revokeObjectURL(guests[i].url); guests[i].photo = blob; guests[i].url = URL.createObjectURL(blob); draw(); }
        catch (e) { toast('อ่านรูปไม่สำเร็จ: ' + e.message, 'err'); }
      };
      inp.click();
    };

    ov.addEventListener('input', e => { const f = e.target.dataset?.f; if (f) guests[+e.target.dataset.i][f] = e.target.value; });
    ov.addEventListener('click', e => {
      const t = e.target.closest('[data-ck]'); if (!t) return;
      const i = +t.dataset.i, k = t.dataset.ck;
      if (k === 'close') finish(null);
      else if (k === 'skip') finish('skip');
      else if (k === 'doc') { const g = guests[i]; g.docType = t.dataset.k; if (g.docType === 'passport' && g.nation === 'ไทย') g.nation = ''; if (g.docType === 'idcard' && !g.nation) g.nation = 'ไทย'; draw(); }
      else if (k === 'cam') pickPhoto(i, true);
      else if (k === 'pick') pickPhoto(i, false);
      else if (k === 'rm') { if (guests[i].url) URL.revokeObjectURL(guests[i].url); guests.splice(i, 1); draw(); }
    });
    $('#ck-add', ov).onclick = () => { if (guests.length < total) { guests.push({ name: '', docType: 'idcard', docNo: '', nation: 'ไทย', photo: null, url: '' }); draw(); } };

    // ---------- ช่องเซ็นชื่อ (นิ้ว / ปากกา / เมาส์) ----------
    const cv = $('#ck-sig', ov), ctx = cv.getContext('2d');
    let dirty = false, drawing = false;
    const setup = () => {
      const dpr = window.devicePixelRatio || 1, w = cv.clientWidth || 600, h = 200;
      cv.width = w * dpr; cv.height = h * dpr; cv.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
      ctx.lineWidth = 2.6; ctx.lineCap = ctx.lineJoin = 'round'; ctx.strokeStyle = '#111'; dirty = false;
    };
    requestAnimationFrame(setup);
    const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    cv.addEventListener('pointerdown', e => { e.preventDefault(); cv.setPointerCapture(e.pointerId); drawing = true; const [x, y] = pos(e); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + .1, y + .1); ctx.stroke(); dirty = true; });
    cv.addEventListener('pointermove', e => { if (!drawing) return; e.preventDefault(); const [x, y] = pos(e); ctx.lineTo(x, y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => cv.addEventListener(n, () => { drawing = false; }));
    $('#ck-clear', ov).onclick = setup;

    // ---------- บันทึก ----------
    $('#ck-save', ov).onclick = async () => {
      err('');
      const used = guests.filter((g, i) => i === 0 || g.name.trim() || g.docNo.trim() || g.photo);
      for (const [i, g] of used.entries()) {
        const who = `ผู้เข้าพักท่านที่ ${i + 1}`;
        if (!g.name.trim()) return err(`${who}: กรุณากรอกชื่อ-นามสกุล`);
        if (!ckDocOk(g)) return err(`${who}: เลข${CK_DOC[g.docType].split(' ')[0]}ไม่ถูกต้อง`);
        if (!g.nation.trim()) return err(`${who}: กรุณากรอกสัญชาติ`);
        if (!g.photo) return err(`${who}: กรุณาถ่ายรูปเอกสาร`);
      }
      if (rules.length && !$('#ck-rules', ov).checked) return err('ผู้เข้าพักต้องติ๊กยอมรับกฎของรีสอร์ทก่อน');
      if (!$('#ck-consent', ov).checked) return err('ผู้เข้าพักต้องติ๊กยินยอมให้เก็บข้อมูลก่อน');
      if (!dirty) return err('กรุณาให้ผู้เข้าพักเซ็นชื่อ');
      const wantPrint = $('#ck-print', ov).checked; try { localStorage.setItem('sd_ck_print', wantPrint ? '1' : '0'); } catch {}
      const pw = wantPrint ? window.open('', '_blank') : null;
      const btn = $('#ck-save', ov); btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึก...';
      const uploaded = [];
      try {
        const out = [];
        for (const [i, g] of used.entries()) {
          const photo = await DB.checkinUpload(b.hotelId, b.id, g.photo, `g${i + 1}`); uploaded.push(photo);
          out.push({ name: g.name.trim(), docType: g.docType, docNo: g.docNo.trim(), nation: g.nation.trim(), photo });
        }
        const sigBlob = await new Promise(r => cv.toBlob(r, 'image/png'));
        const signature = await DB.checkinUpload(b.hotelId, b.id, sigBlob, 'sign', 'image/png'); uploaded.push(signature);
        const now = new Date().toISOString(), u = DB.currentUser();
        const regData = { guests: out, phone: $('#ck-phone', ov).value.trim(), vehicle: $('#ck-car', ov).value.trim(), signature, consentAt: now, registeredAt: now, registeredBy: u?.name || '', ...(rules.length ? { rules: rules.join('\n'), rulesAcceptedAt: now } : {}) };
        await DB.checkinSave(b.hotelId, b.id, regData);
        DB.log('checkin.register', `${b.id} · ${out.length} ท่าน`);
        toast('บันทึกทะเบียนผู้เข้าพักแล้ว'); finish('saved');
        if (pw) ckPrint(b, regData, pw);
      } catch (e) {
        if (uploaded.length) supa.storage.from('sd-checkin').remove(uploaded).catch(() => {}); // ล้างไฟล์ที่อัปโหลดค้างเมื่อบันทึกไม่สำเร็จ
        pw?.close();
        btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-check"></i> บันทึกทะเบียน'; err('บันทึกไม่สำเร็จ: ' + (e.message || e));
      }
    };
  });
}

// ก่อนเช็คอิน: ถ้ายังไม่มีทะเบียน เปิดฟอร์มให้กรอก (ข้ามได้) — คืน false = ยกเลิกการเช็คอิน
async function ckEnsure(b) {
  try { if (await DB.checkinGet(b.id)) return true; }
  catch (e) { return confirmBox(`เปิดทะเบียนผู้เข้าพักไม่ได้ (${esc(e.message || e)})<br>เช็คอินต่อโดยไม่ลงทะเบียนหรือไม่?`, 'เช็คอินต่อ'); }
  return (await ckForm(b, { allowSkip: true })) !== null;
}

// ส่วนทะเบียนในหน้ารายละเอียดการจอง (drawer)
async function ckDrawer(m, b) {
  const box = $('#ck-sec', m); if (!box) return;
  if (!can('frontdesk')) { // แอดมินแพลตฟอร์ม: เห็นแค่ชื่อผู้เข้าพัก (ไม่มีรูป เลขเอกสาร ลายเซ็น)
    const h4 = '<h4><i class="fa-solid fa-id-card"></i> ทะเบียนผู้เข้าพัก <span class="muted small">(แสดงเฉพาะชื่อ)</span></h4>';
    box.innerHTML = h4 + '<p class="small muted"><i class="fa-solid fa-spinner fa-spin"></i> กำลังโหลด...</p>';
    try {
      const r = await DB.checkinNames(b.id);
      box.innerHTML = h4 + (r
        ? `<p class="small" style="margin:0 0 6px"><span class="pill ok">ลงทะเบียนแล้ว</span> <span class="muted">${fmtDateTime(r.registeredAt)}</span></p>${r.names.map(n => `<div class="small">• ${esc(n)}</div>`).join('')}<p class="small muted" style="margin-top:6px">รูปบัตร/พาสปอร์ตและเลขเอกสาร เปิดดูได้เฉพาะเจ้าของรีสอร์ท</p>`
        : '<p class="small muted">ยังไม่ได้ลงทะเบียน</p>');
    } catch (e) { box.innerHTML = h4 + `<p class="small muted">โหลดไม่ได้: ${esc(e.message || e)}</p>`; }
    return;
  }
  const head = '<h4><i class="fa-solid fa-id-card"></i> ทะเบียนผู้เข้าพัก <span class="muted small">(เฉพาะเจ้าของรีสอร์ทเห็น)</span></h4>';
  const paint = async () => {
    box.innerHTML = head + '<p class="small muted"><i class="fa-solid fa-spinner fa-spin"></i> กำลังโหลด...</p>';
    let reg;
    try { reg = await DB.checkinGet(b.id); } catch (e) { box.innerHTML = head + `<p class="small muted">โหลดไม่ได้: ${esc(e.message || e)}</p>`; return; }
    if (!reg) {
      box.innerHTML = head + '<p class="small muted" style="margin:0 0 8px">ยังไม่ได้ลงทะเบียน — ถ่ายรูปบัตร/พาสปอร์ตและให้ผู้เข้าพักเซ็นบนหน้าจอ ไม่ต้องพิมพ์เอกสาร</p><button class="btn btn-sm btn-primary" id="ck-open"><i class="fa-solid fa-id-card"></i> ลงทะเบียนผู้เข้าพัก</button>';
      $('#ck-open', box).onclick = async () => { if (await ckForm(b)) paint(); };
      return;
    }
    box.innerHTML = head + `<p class="small" style="margin:0 0 8px"><span class="pill ok">ลงทะเบียนแล้ว</span> <span class="muted">${fmtDateTime(reg.registeredAt)}${reg.registeredBy ? ' · ' + esc(reg.registeredBy) : ''}</span></p>
      <p class="small muted" style="margin:0 0 8px"><i class="fa-regular fa-clock"></i> ระบบลบรูปและข้อมูลเอกสารอัตโนมัติใน ${ckExpiry(reg).left} วัน (${fmtDate(isoOf(ckExpiry(reg).date), false)})</p>
      ${reg.guests.map((g, i) => `<div class="dl"><span>${esc(g.name)}<div class="small muted">${esc(CK_DOC[g.docType] || '')} ${esc(g.docNo)} · ${esc(g.nation)}</div></span><b><button class="btn btn-sm btn-outline" data-ckv="${esc(g.photo)}"><i class="fa-regular fa-image"></i> ดูรูปเอกสาร</button></b></div>`).join('')}
      ${reg.vehicle ? `<div class="dl"><span>ทะเบียนรถ</span><b>${esc(reg.vehicle)}</b></div>` : ''}
      ${reg.rules ? `<div class="dl"><span>กฎของรีสอร์ท</span><b><span class="pill ok">รับทราบแล้ว</span></b></div>` : ''}
      <div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap"><button class="btn btn-sm btn-outline" data-ckv="${esc(reg.signature)}"><i class="fa-solid fa-signature"></i> ดูลายเซ็น</button>
        <button class="btn btn-sm btn-primary" id="ck-prt"><i class="fa-solid fa-print"></i> พิมพ์ / บันทึกเป็น PDF</button>
        <button class="btn btn-sm btn-ghost red" id="ck-del"><i class="fa-solid fa-trash"></i> ลบข้อมูลเอกสาร</button></div>`;
    $('#ck-prt', box).onclick = () => ckPrint(b, reg);
    $$('[data-ckv]', box).forEach(btn => btn.onclick = async () => { const url = await DB.checkinUrl(btn.dataset.ckv); url ? window.open(url, '_blank', 'noopener') : toast('เปิดไฟล์ไม่ได้', 'err'); });
    $('#ck-del', box).onclick = async () => {
      if (!(await confirmBox('ลบรูปบัตร/พาสปอร์ตและลายเซ็นของการจองนี้ถาวร?<br><span class="small muted">ระบบจะลบให้เองอยู่แล้วเมื่อครบ 45 วัน ใช้ปุ่มนี้เมื่อผู้เข้าพักร้องขอให้ลบก่อนกำหนด</span>', 'ลบถาวร'))) return;
      try { await DB.checkinDelete(b.id, [...reg.guests.map(g => g.photo), reg.signature].filter(Boolean)); DB.log('checkin.delete', b.id); toast('ลบข้อมูลเอกสารแล้ว'); paint(); }
      catch (e) { toast('ลบไม่สำเร็จ: ' + (e.message || e), 'err'); }
    };
  };
  paint();
}

// ================= หน้านักพัฒนา: ทะเบียนผู้เข้าพักทุกรีสอร์ท (ดูอย่างเดียว) =================
async function boCheckins(main) {
  main.innerHTML = pageHead('ทะเบียนผู้เข้าพัก', `ดูอย่างเดียว · ระบบลบอัตโนมัติเมื่อครบ ${CK_KEEP_DAYS} วัน นับจากวันลงทะเบียน`) + '<section class="card"><p class="muted"><i class="fa-solid fa-spinner fa-spin"></i> กำลังโหลด...</p></section>';
  let list;
  try { list = await DB.checkinList(); } catch (e) { main.innerHTML = pageHead('ทะเบียนผู้เข้าพัก', '') + `<section class="card"><p class="muted">โหลดไม่ได้: ${esc(e.message || e)}</p></section>`; return; }
  const hname = id => DB.hotel(id)?.name || id;
  let q = '';
  const draw = () => {
    const rows = list.filter(r => !q || [r.bookingId, hname(r.hotelId), ...r.guests.map(g => g.name)].join(' ').toLowerCase().includes(q));
    $('#ck-list', main).innerHTML = rows.length ? `<div class="table-scroll"><table class="tbl"><thead><tr><th>รหัสจอง</th><th>รีสอร์ท</th><th>ผู้เข้าพัก</th><th>ลงทะเบียน</th><th>ลบอัตโนมัติ</th><th></th></tr></thead><tbody>
      ${rows.map(r => `<tr><td><span class="code">${esc(r.bookingId)}</span></td><td>${esc(hname(r.hotelId))}</td><td>${r.guests.map(g => esc(g.name)).join(', ')}</td><td class="small">${fmtDateTime(r.registeredAt || r.savedAt)}</td><td class="small">อีก ${ckExpiry(r).left} วัน</td>
        <td style="text-align:right"><button class="btn btn-sm btn-outline" data-ckr="${list.indexOf(r)}"><i class="fa-solid fa-eye"></i> เปิดดู</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="bo-empty sm"><i class="fa-solid fa-id-card"></i><p class="muted">ไม่พบทะเบียน</p></div>';
    $$('[data-ckr]', main).forEach(b => b.onclick = () => ckView(list[+b.dataset.ckr], hname));
  };
  main.innerHTML = pageHead('ทะเบียนผู้เข้าพัก', `${list.length} รายการ · ดูอย่างเดียว · ระบบลบอัตโนมัติเมื่อครบ ${CK_KEEP_DAYS} วัน`) + `<div class="filters"><div class="f-search"><i class="fa-solid fa-magnifying-glass"></i><input id="ck-q" placeholder="รหัสจอง / ชื่อผู้เข้าพัก / รีสอร์ท"></div></div><section class="card flush" id="ck-list"></section>`;
  $('#ck-q', main).oninput = debounce(e => { q = e.target.value.trim().toLowerCase(); draw(); }, 200);
  draw();
}
function ckView(r, hname) {
  const m = openModal(`<h2>ทะเบียนผู้เข้าพัก <span class="code">${esc(r.bookingId)}</span></h2><div class="small muted">${esc(hname(r.hotelId))} · ${fmtDateTime(r.registeredAt || r.savedAt)}${r.registeredBy ? ' · ลงทะเบียนโดย ' + esc(r.registeredBy) : ''}</div>
    <div style="margin-top:12px">${r.guests.map(g => `<div class="dl"><span><b>${esc(g.name)}</b><div class="small muted">${esc(CK_DOC[g.docType] || '')} ${esc(g.docNo)} · ${esc(g.nation)}</div></span><b><button class="btn btn-sm btn-outline" data-ckv="${esc(g.photo)}"><i class="fa-regular fa-image"></i> ดูรูปเอกสาร</button></b></div>`).join('')}
    ${r.phone ? `<div class="dl"><span>เบอร์โทร</span><b>${esc(r.phone)}</b></div>` : ''}${r.vehicle ? `<div class="dl"><span>ทะเบียนรถ</span><b>${esc(r.vehicle)}</b></div>` : ''}</div>
    <div class="row" style="gap:8px;margin-top:10px"><button class="btn btn-sm btn-outline" data-ckv="${esc(r.signature)}"><i class="fa-solid fa-signature"></i> ดูลายเซ็น</button></div>
    <p class="small muted" style="margin-top:10px">นักพัฒนาเปิดดูได้อย่างเดียว ลบไม่ได้ — ระบบลบอัตโนมัติเมื่อครบกำหนด · การเปิดดูรูปทุกครั้งถูกบันทึกใน Audit log</p>`, 'wide');
  $$('[data-ckv]', m).forEach(btn => btn.onclick = async () => {
    const url = await DB.checkinUrl(btn.dataset.ckv);
    if (!url) return toast('เปิดไฟล์ไม่ได้', 'err');
    DB.log('checkin.view', `${r.bookingId} · ${hname(r.hotelId)}`); window.open(url, '_blank', 'noopener');
  });
}

// ================= พิมพ์ทะเบียนผู้เข้าพักเป็นเอกสาร A4 / บันทึกเป็น PDF =================
// เปิดหน้าต่างใหม่ที่มีเอกสารพร้อมรูปบัตร+ลายเซ็น แล้วเรียกหน้าต่างพิมพ์ของเครื่อง (เลือก "บันทึกเป็น PDF" ได้) — ใช้ได้กับคอม มือถือ แท็บเล็ต
// เฉพาะเจ้าของรีสอร์ท · เอกสารที่พิมพ์/เซฟไว้แล้ว อยู่นอกระบบ ไม่ถูกลบอัตโนมัติ
async function ckPrint(b, reg, w) {
  w ||= window.open('', '_blank');
  if (!w) return toast('เบราว์เซอร์บล็อกหน้าต่างพิมพ์ — กรุณาอนุญาตป๊อปอัปของเว็บนี้แล้วลองใหม่', 'err');
  w.document.write('<!doctype html><meta charset="utf-8"><title>กำลังเตรียมเอกสาร</title><p style="font:18px sans-serif;padding:32px">กำลังเตรียมเอกสาร...</p>');
  try {
    reg ||= await DB.checkinGet(b.id);
    if (!reg) throw new Error('ยังไม่มีทะเบียนของการจองนี้');
    const [photos, sig] = await Promise.all([Promise.all(reg.guests.map(g => DB.checkinUrl(g.photo))), DB.checkinUrl(reg.signature)]);
    const h = DB.hotel(b.hotelId) || {}, owner = h.ownerId ? DB.owner(h.ownerId) : null, me = DB.currentUser();
    const T = x => esc(x == null ? '' : String(x));
    const row = (l, v) => v ? `<tr><th>${l}</th><td>${T(v)}</td></tr>` : '';
    const html = `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>ทะเบียนผู้เข้าพัก ${T(b.id)}</title><style>
      @page { size: A4; margin: 12mm; }
      * { box-sizing: border-box; }
      body { font: 14px/1.5 'Sarabun','Noto Sans Thai',Tahoma,sans-serif; color: #111; margin: 0; padding: 16px; max-width: 800px; margin: 0 auto; }
      h1 { font-size: 22px; margin: 0; } h2 { font-size: 15px; margin: 18px 0 6px; border-bottom: 1.5px solid #111; padding-bottom: 3px; }
      .top { display: flex; justify-content: space-between; gap: 16px; border-bottom: 2px solid #111; padding-bottom: 10px; }
      .muted { color: #555; font-size: 12px; }
      table { border-collapse: collapse; width: 100%; } td, th { border: 1px solid #999; padding: 5px 8px; text-align: left; vertical-align: top; }
      th { background: #f1f1f1; width: 34%; font-weight: 600; } table.g th { width: auto; }
      .ph { display: inline-block; margin: 6px 10px 6px 0; vertical-align: top; page-break-inside: avoid; } .ph img { max-height: 230px; max-width: 340px; border: 1px solid #999; display: block; }
      .sig { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; margin-top: 10px; page-break-inside: avoid; } .sig img { height: 90px; border-bottom: 1px solid #111; }
      .box { border: 1px solid #999; padding: 8px 10px; font-size: 12px; margin-top: 8px; }
      .noprint { position: sticky; top: 0; background: #fff8e1; border: 1px solid #f0c36d; padding: 10px 14px; margin-bottom: 14px; display: flex; gap: 10px; align-items: center; justify-content: space-between; }
      .noprint button { font: inherit; font-weight: 700; padding: 8px 16px; border: 0; border-radius: 8px; background: #1a5fd0; color: #fff; cursor: pointer; }
      @media print { .noprint { display: none; } body { padding: 0; } }
    </style></head><body>
      <div class="noprint"><span>เลือก <b>พิมพ์</b> หรือเลือกปลายทางเป็น <b>บันทึกเป็น PDF</b> ในหน้าต่างพิมพ์</span><button onclick="window.print()">พิมพ์ / บันทึกเป็น PDF</button></div>
      <div class="top"><div><h1>ทะเบียนผู้เข้าพัก <span style="font-weight:400;font-size:14px">/ Guest Registration</span></h1><div>${T(b.hotelName)}</div>
        <div class="muted">${T(h.address || '')}${owner?.phone ? ' · โทร ' + T(owner.phone) : ''}</div></div>
        <div style="text-align:right"><div class="muted">รหัสการจอง</div><div style="font-size:20px;font-weight:700">${T(b.id)}</div></div></div>
      <h2>รายละเอียดการเข้าพัก</h2>
      <table>${row('ห้องพัก', `${b.qty} × ${b.roomName}`)}${row('วันที่เข้าพัก', fmtDate(b.checkIn))}${row('วันที่ออก', fmtDate(b.checkOut))}${row('จำนวนคืน', b.nights + ' คืน')}${row('จำนวนผู้เข้าพัก', `ผู้ใหญ่ ${b.adults}${b.children ? ' · เด็ก ' + b.children : ''}`)}${row('เบอร์โทรติดต่อ', reg.phone)}${row('ทะเบียนรถ', reg.vehicle)}</table>
      <h2>ผู้เข้าพัก</h2>
      <table class="g"><thead><tr><th style="width:36px">#</th><th>ชื่อ-นามสกุล</th><th>ประเภทเอกสาร</th><th>เลขที่เอกสาร</th><th>สัญชาติ</th></tr></thead><tbody>
        ${reg.guests.map((g, i) => `<tr><td>${i + 1}</td><td>${T(g.name)}</td><td>${T(CK_DOC[g.docType] || '')}</td><td>${T(g.docNo)}</td><td>${T(g.nation)}</td></tr>`).join('')}</tbody></table>
      <h2>สำเนาเอกสารประจำตัว</h2>
      <div>${reg.guests.map((g, i) => photos[i] ? `<div class="ph"><img src="${photos[i]}" alt=""><div class="muted">ผู้เข้าพักท่านที่ ${i + 1} — ${T(g.name)}</div></div>` : '').join('')}</div>
      ${reg.rules ? `<h2>กฎของรีสอร์ท <span style="font-weight:400;font-size:12px">(ผู้เข้าพักรับทราบและยอมรับ เมื่อ ${T(fmtDateTime(reg.rulesAcceptedAt || reg.registeredAt))})</span></h2><ol style="margin:4px 0 0;padding-left:22px">${reg.rules.split('\n').map(r => `<li>${T(r)}</li>`).join('')}</ol>` : ''}
      <div class="box">${CK_CONSENT.replace('จะถูกลบอัตโนมัติเมื่อครบ 45 วัน', 'จะถูกลบออกจากระบบอัตโนมัติเมื่อครบ 45 วัน')}</div>
      <div class="sig"><div>${sig ? `<img src="${sig}" alt="ลายเซ็น">` : ''}<div>(${T(reg.guests[0]?.name || '')})</div><div class="muted">ลายเซ็นผู้เข้าพัก</div></div>
        <div style="text-align:right"><div class="muted">ลงทะเบียนเมื่อ</div><div>${T(fmtDateTime(reg.registeredAt || reg.savedAt))}</div><div class="muted">ผู้รับลงทะเบียน: ${T(reg.registeredBy || '')}</div></div></div>
      <div class="muted" style="margin-top:14px">พิมพ์เมื่อ ${T(fmtDateTime(new Date().toISOString()))}${me ? ' โดย ' + T(me.name) : ''} · เอกสารนี้มีข้อมูลส่วนบุคคล โปรดเก็บรักษาให้ปลอดภัยและทำลายเมื่อพ้นความจำเป็น</div>
      <script>addEventListener('load', function () { setTimeout(function () { window.print(); }, 400); });<\/script>
    </body></html>`;
    w.document.open(); w.document.write(html); w.document.close();
    DB.log('checkin.print', b.id);
  } catch (e) { w.close(); toast('เตรียมเอกสารไม่สำเร็จ: ' + (e.message || e), 'err'); }
}

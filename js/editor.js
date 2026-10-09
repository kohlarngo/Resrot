// ================= Inline Content Editor (แก้ข้อความ / รูป บนหน้าเว็บสดๆ) =================
// หลักการ: ข้อความที่แก้ได้ติดป้าย data-edit="คีย์" (ค่าตั้งต้นอยู่ในโค้ด) · รูปติดป้าย data-img-slot="ช่อง" (ดู SITE_IMAGE_SLOTS)
// เนื้อหาที่แก้เก็บเป็น JSON ใน sd_kv คีย์ 'content' (ข้อความแยกตามภาษา + สไตล์) แล้วถูกนำมาแทนที่ตอนเรนเดอร์ทุกครั้ง
// ผู้ที่มีสิทธิ์ hotels.media (นักพัฒนา) จะเห็นปุ่ม "แก้ไขหน้าเว็บ" มุมขวาล่าง → เปิดโหมดแก้ไข → คลิกข้อความเพื่อพิมพ์ / คลิก "เปลี่ยนรูป" → กด "บันทึก"
const ED = { on: false, dirty: null, sel: null };
const edFresh = () => ({ texts: { th: {}, en: {}, zh: {} }, styles: {} });
ED.dirty = edFresh();
const edAllowed = () => !PORTAL && !!DB.currentUser() && can('hotels.media');
const edDirtyCount = () => ['th', 'en', 'zh'].reduce((s, l) => s + Object.keys(ED.dirty.texts[l]).length, 0) + Object.keys(ED.dirty.styles).length;

function edStyle(el, s) {
  el.style.color = s?.color || ''; el.style.fontSize = s?.size ? s.size + 'px' : ''; el.style.fontWeight = s?.bold ? '800' : ''; el.style.textAlign = s?.align || '';
}
// นำเนื้อหาที่บันทึกไว้ (และร่างที่ยังไม่บันทึก) มาแทนข้อความตั้งต้น — เรียกหลังเรนเดอร์ทุกครั้ง
function applyContent() {
  const c = DB.content();
  $$('[data-edit]').forEach(el => {
    const key = el.dataset.edit, n = el.dataset.editN;
    const draft = ED.dirty.texts[LANG][key];
    const txt = draft !== undefined ? draft : c.texts[LANG]?.[key];
    if (txt != null) {
      if (LANG !== 'th') el.setAttribute('data-notr', ''); // ข้อความที่แก้เองไม่ต้องผ่านตัวแปลภาษา
      el.textContent = txt.replace('{n}', n ?? '{n}');
      el.dataset.edited = '1';
    }
    const st = ED.dirty.styles[key] !== undefined ? ED.dirty.styles[key] : c.styles[key];
    edStyle(el, st);
  });
}

function afterRender() {
  applyContent();
  if (!edAllowed()) { if (ED.on) setEditMode(false); $('#ed-fab')?.remove(); return; }
  if (/[?&]edit=1/.test(location.hash) && !ED.on) { ED.on = true; document.body.classList.add('edit-mode'); }
  if (ED.on) { edBar(); edDecorate(); } else edFab();
}

function edFab() {
  if ($('#ed-fab')) return;
  const b = document.createElement('button');
  b.id = 'ed-fab'; b.setAttribute('data-notr', ''); b.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> แก้ไขหน้าเว็บ';
  b.onclick = () => setEditMode(true);
  document.body.appendChild(b);
}
function setEditMode(on) {
  ED.on = on; document.body.classList.toggle('edit-mode', on);
  if (on) { $('#ed-fab')?.remove(); edBar(); edDecorate(); toast('เข้าสู่โหมดแก้ไข — คลิกข้อความเพื่อพิมพ์ คลิก "เปลี่ยนรูป" บนรูป', 'info'); }
  else { $('#ed-bar')?.remove(); ED.sel = null; render(); }
}

function edKeyText(el) { // ข้อความที่จะเก็บ: ถ้ามีตัวเลขแทรก ({n}) ให้เก็บเป็นโทเคน
  let t = el.textContent.replace(/\s+/g, ' ').trim();
  if (el.dataset.editN) t = t.split(el.dataset.editN).join('{n}');
  return t;
}
function edDecorate() {
  $$('[data-edit]').forEach(el => {
    el.setAttribute('contenteditable', 'true'); el.setAttribute('spellcheck', 'false');
    el.onclick = e => { e.stopPropagation(); e.preventDefault(); }; // กันคลิกทะลุไปโดนลิงก์ / ปุ่มของกล่องที่ครอบอยู่
    el.onfocus = () => edSelect(el);
    el.oninput = () => { ED.dirty.texts[LANG][el.dataset.edit] = edKeyText(el); el.classList.add('ed-dirty'); edUpdateBar(); };
    el.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } };
    el.onpaste = e => { e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain')); };
    if (ED.dirty.texts[LANG][el.dataset.edit] !== undefined || ED.dirty.styles[el.dataset.edit] !== undefined) el.classList.add('ed-dirty');
  });
  $$('[data-img-slot]').forEach(el => {
    if (el.querySelector(':scope > .ed-imgtools')) return;
    const slot = SITE_IMAGE_SLOTS.find(s => s.key === el.dataset.imgSlot); if (!slot) return;
    const tools = document.createElement('div');
    tools.className = 'ed-imgtools'; tools.setAttribute('data-notr', '');
    const mk = (cls, html, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'ed-chg ' + cls; b.innerHTML = html; b.onclick = async e => { e.preventDefault(); e.stopPropagation(); await fn(); }; tools.appendChild(b); };
    if (slot.multi) mk('', '<i class="fa-solid fa-images"></i> สไลด์รูป', async () => slideSlotModal(slot, () => render()));
    else mk('', '<i class="fa-solid fa-camera"></i> เปลี่ยนรูป', async () => {
      try {
        toast('เลือกรูปจากเครื่อง...', 'info');
        const url = await pickAndUploadImage(slot.max); if (!url) return;
        const r = await DB.saveSiteImages({ [slot.key]: url }); if (!r) return;
        DB.log('site.image', `${slot.label} → เปลี่ยนรูป (โหมดแก้ไข)`); applySiteIcons(); toast('เปลี่ยนรูปแล้ว'); render();
      } catch (err) { toast('อัปโหลดรูปไม่สำเร็จ: ' + err.message, 'err'); }
    });
    // รูปที่เปลี่ยนไปแล้วต้องคืนรูปเดิมได้จากตรงนี้ด้วย
    if (DB.siteImages()[slot.key]) mk('rst', '<i class="fa-solid fa-rotate-left"></i> คืนรูปเดิม', async () => {
      if (!(await confirmBox(`คืนรูปเดิมของ "${esc(slot.label)}"?`, 'คืนรูปเดิม'))) return;
      const r = await DB.saveSiteImages({ [slot.key]: null }); if (!r) return;
      DB.log('site.image', `${slot.label} → คืนค่าเดิม (โหมดแก้ไข)`); applySiteIcons(); toast('คืนรูปเดิมแล้ว'); render();
    });
    el.appendChild(tools);
  });
}

// ---------- แถบเครื่องมือลอย ----------
function edBar() {
  if ($('#ed-bar')) return edUpdateBar();
  const bar = document.createElement('div');
  bar.id = 'ed-bar'; bar.setAttribute('data-notr', '');
  bar.innerHTML = `<div class="ed-row ed-top"><b><i class="fa-solid fa-pen-to-square"></i> โหมดแก้ไข</b><span class="ed-lang" id="ed-lang"></span><span class="ed-count" id="ed-count"></span></div>
    <div class="ed-row ed-tools" id="ed-tools">
      <label title="สีตัวอักษร"><i class="fa-solid fa-palette"></i><input type="color" id="ed-color" value="#222222"></label>
      <button type="button" id="ed-dec" title="เล็กลง">A−</button><span id="ed-size" class="ed-size">–</span><button type="button" id="ed-inc" title="ใหญ่ขึ้น">A+</button>
      <button type="button" id="ed-bold" title="ตัวหนา"><b>B</b></button>
      <button type="button" data-al="left" title="ชิดซ้าย"><i class="fa-solid fa-align-left"></i></button><button type="button" data-al="center" title="กึ่งกลาง"><i class="fa-solid fa-align-center"></i></button><button type="button" data-al="right" title="ชิดขวา"><i class="fa-solid fa-align-right"></i></button>
      <button type="button" id="ed-reset" title="คืนข้อความและสไตล์ตั้งต้นของกล่องนี้"><i class="fa-solid fa-rotate-left"></i> คืนค่าเดิม</button>
    </div>
    <div class="ed-row ed-hint">คลิกข้อความเพื่อพิมพ์แก้ · รูปกด "เปลี่ยนรูป" (รูปบันทึกทันที ข้อความต้องกด "บันทึก") · กำลังแก้ข้อความของภาษาที่เลือกอยู่</div>
    <div class="ed-row ed-act"><button type="button" class="ed-btn" id="ed-exit">ออก</button><button type="button" class="ed-btn" id="ed-cancel">ยกเลิกที่แก้</button><button type="button" class="ed-btn save" id="ed-save"><i class="fa-solid fa-floppy-disk"></i> บันทึก</button></div>`;
  document.body.appendChild(bar);
  // ปุ่มสไตล์ต้องไม่ดึงโฟกัสออกจากข้อความที่กำลังแก้
  bar.addEventListener('mousedown', e => { if (e.target.closest('button')) e.preventDefault(); });
  const cur = () => ED.sel && document.body.contains(ED.sel) ? ED.sel : null;
  const upd = patch => { const el = cur(); if (!el) return toast('คลิกข้อความที่ต้องการก่อน', 'err'); const k = el.dataset.edit;
    const base = { ...(DB.content().styles[k] || {}), ...(ED.dirty.styles[k] || {}) }; const next = { ...base, ...patch }; Object.keys(next).forEach(x => (next[x] === '' || next[x] == null || next[x] === false) && delete next[x]);
    ED.dirty.styles[k] = next; edStyle(el, next); el.classList.add('ed-dirty'); edUpdateBar(); };
  $('#ed-color', bar).oninput = e => upd({ color: e.target.value });
  const size = () => { const el = cur(); return el ? Math.round(parseFloat(getComputedStyle(el).fontSize)) : 16; };
  $('#ed-dec', bar).onclick = () => upd({ size: Math.max(10, size() - 2) });
  $('#ed-inc', bar).onclick = () => upd({ size: Math.min(96, size() + 2) });
  $('#ed-bold', bar).onclick = () => { const el = cur(); upd({ bold: !(el && parseInt(getComputedStyle(el).fontWeight) >= 700 && el.style.fontWeight) }); };
  $$('[data-al]', bar).forEach(b => b.onclick = () => upd({ align: b.dataset.al }));
  $('#ed-reset', bar).onclick = () => { const el = cur(); if (!el) return toast('คลิกข้อความที่ต้องการก่อน', 'err'); const k = el.dataset.edit;
    ED.dirty.texts[LANG][k] = null; ED.dirty.styles[k] = null; // null = ลบของที่บันทึกไว้เมื่อกดบันทึก
    el.removeAttribute('data-notr'); edStyle(el, null); render(); toast('จะคืนค่าตั้งต้นของกล่องนี้เมื่อกด "บันทึก"', 'info'); };
  $('#ed-save', bar).onclick = edSave;
  $('#ed-cancel', bar).onclick = async () => { if (!edDirtyCount()) return toast('ยังไม่มีการแก้ไข', 'info'); if (await confirmBox('ยกเลิกข้อความและสไตล์ที่แก้ไว้ทั้งหมด (ที่ยังไม่บันทึก)?', 'ยกเลิกที่แก้')) { ED.dirty = edFresh(); render(); } };
  $('#ed-exit', bar).onclick = async () => { if (edDirtyCount() && !(await confirmBox('มีการแก้ไขที่ยังไม่บันทึก — ออกจากโหมดแก้ไขโดยทิ้งการแก้ไขเหล่านี้?', 'ออกโดยไม่บันทึก'))) return; ED.dirty = edFresh(); setEditMode(false); };
  edUpdateBar();
}
function edUpdateBar() {
  const n = edDirtyCount();
  if ($('#ed-count')) $('#ed-count').textContent = n ? `แก้ไขแล้ว ${n} รายการ (ยังไม่บันทึก)` : 'ยังไม่มีการแก้ไข';
  if ($('#ed-lang')) $('#ed-lang').textContent = `ภาษา: ${LANGS[LANG].flag} ${LANGS[LANG].name}`;
  $('#ed-save')?.classList.toggle('on', n > 0);
}
function edSelect(el) {
  ED.sel = el;
  const cs = getComputedStyle(el), hex = (cs.color.match(/\d+/g) || [34, 34, 34]).slice(0, 3).map(x => (+x).toString(16).padStart(2, '0')).join('');
  if ($('#ed-color')) $('#ed-color').value = '#' + hex;
  if ($('#ed-size')) $('#ed-size').textContent = Math.round(parseFloat(cs.fontSize)) + 'px';
  $$('[data-edit]').forEach(x => x.classList.toggle('ed-sel', x === el));
}
async function edSave() {
  if (!edDirtyCount()) return toast('ยังไม่มีการแก้ไข', 'info');
  const c = DB.content();
  for (const l of ['th', 'en', 'zh']) for (const [k, v] of Object.entries(ED.dirty.texts[l])) { if (v == null || v === '') delete c.texts[l][k]; else c.texts[l][k] = v; }
  for (const [k, s] of Object.entries(ED.dirty.styles)) { if (!s || !Object.keys(s).length) delete c.styles[k]; else c.styles[k] = s; }
  const btn = $('#ed-save'); btn.disabled = true;
  const r = await DB.saveContent(c);
  btn.disabled = false;
  if (!r) return; // dbWrite แจ้ง error ให้แล้ว
  DB.log('site.content', `แก้เนื้อหาหน้าเว็บ ${edDirtyCount()} รายการ`);
  ED.dirty = edFresh(); toast('บันทึกเนื้อหาแล้ว — ลูกค้าเห็นทันที'); render();
}
// กันออกจากหน้าโดยลืมบันทึก + กันคลิกพาไปหน้าอื่นระหว่างแก้ไข
window.addEventListener('beforeunload', e => { if (ED.on && edDirtyCount()) { e.preventDefault(); e.returnValue = ''; } });
document.addEventListener('click', e => {
  if (!ED.on || e.target.closest('#ed-bar, #modal, #toast, .ed-chg, [data-edit]')) return;
  if (e.target.closest('#app, footer, .header')) { e.preventDefault(); e.stopPropagation(); }
}, true);

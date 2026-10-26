// ================= นักพัฒนา: บัญชีทดลองใช้ (Demo) =================
// สร้าง ID + รหัสผ่านให้ลูกค้าที่สนใจลองพอร์ทัลเจ้าของรีสอร์ท (มีรีสอร์ท/การจองตัวอย่างให้) · หมดอายุอัตโนมัติ
// เบื้องหลัง: Edge Function sd-demo (service role) · ตาราง sd_demo_accounts

async function demoCall(action, payload = {}) {
  const { data, error } = await supa.functions.invoke('sd-demo', { body: { action, ...payload } });
  if (error) {
    const body = await error.context?.json?.().catch(() => null);
    return { error: body?.error || error.message };
  }
  return data?.error ? { error: data.error } : data;
}
const demoLoginUrl = () => new URL('owner.html', location.href).href.replace(/[#?].*$/, '');

function boDemo(main) {
  let items = null, err = '';
  const draw = () => {
    const now = Date.now();
    main.innerHTML = pageHead('บัญชีทดลองใช้ (Demo)', 'สร้าง ID + รหัสผ่านให้ลูกค้าที่สนใจลองใช้ระบบเจ้าของรีสอร์ท — มีรีสอร์ทและการจองตัวอย่างให้ ไม่แสดงบนเว็บไซต์จริง และหมดอายุเองตามจำนวนวันที่ตั้ง',
      '<button class="btn btn-primary" id="dm-new"><i class="fa-solid fa-plus"></i> สร้างบัญชีทดลอง</button>') + `
      <section class="card flush">${err ? `<div class="pad"><p class="muted">${esc(err)}</p></div>` : !items ? '<div class="pad muted">กำลังโหลด…</div>' : !items.length ? '<div class="bo-empty"><i class="fa-solid fa-flask"></i><h3>ยังไม่มีบัญชีทดลอง</h3><p class="muted">กด “สร้างบัญชีทดลอง” เพื่อสร้าง ID/รหัสผ่านให้ลูกค้า</p></div>' : `<div class="table-scroll"><table class="tbl"><thead><tr><th>ลูกค้า</th><th>ID (อีเมลเข้าสู่ระบบ)</th><th>สถานะ</th><th>เข้าใช้ล่าสุด</th><th></th></tr></thead><tbody>
        ${items.map(d => { const exp = new Date(d.expires_at).getTime(), left = Math.ceil((exp - now) / 86400000), dead = exp < now || !d.active; return `<tr>
          <td><b>${esc(d.label)}</b>${d.note ? `<div class="small muted">${esc(d.note)}</div>` : ''}<div class="small muted">สร้างโดย ${esc(d.created_by || '-')} · ${fmtDate(d.created_at.slice(0, 10), false)}</div></td>
          <td class="mono small">${esc(d.email)}${(d.staff || []).map(x => `<div class="muted">${esc(x.email)}</div>`).join('')}</td>
          <td>${dead ? '<span class="badge" style="background:#fee2e2;color:#b91c1c">หมดอายุ</span>' : `<span class="badge" style="background:#dcfce7;color:#15803d">ใช้ได้อีก ${left} วัน</span>`}<div class="small muted">ถึง ${fmtDate(d.expires_at.slice(0, 10), false)}</div></td>
          <td class="small muted">${d.lastLogin ? relTime(d.lastLogin) : 'ยังไม่เคยเข้าใช้'}</td>
          <td style="text-align:right;white-space:nowrap"><button class="btn btn-sm btn-outline" data-pw="${d.owner_id}"><i class="fa-solid fa-key"></i> รหัสใหม่</button> <button class="btn btn-sm btn-outline" data-ex="${d.owner_id}"><i class="fa-solid fa-calendar-plus"></i> ต่ออายุ</button> <button class="btn btn-sm btn-ghost" data-del="${d.owner_id}" style="color:#b91c1c"><i class="fa-solid fa-trash"></i></button></td></tr>`; }).join('')}
        </tbody></table></div>`}</section>
      <section class="card pad"><h3 style="margin:0 0 6px">วิธีใช้</h3><ol class="small muted" style="margin:0;padding-left:18px;line-height:1.8"><li>กด “สร้างบัญชีทดลอง” ใส่ชื่อลูกค้า + จำนวนวัน → ระบบสร้าง ID และรหัสผ่านให้ (รหัสผ่านจะแสดงครั้งเดียว — ลืมแล้วกด “รหัสใหม่”)</li><li>คัดลอกข้อความที่ระบบเตรียมไว้ส่งให้ลูกค้าทาง LINE / อีเมล</li><li>ได้ 3 บัญชี: <b>เจ้าของ</b> (สิทธิ์เต็ม) · <b>แม่บ้าน</b> (เห็นเฉพาะงานแม่บ้าน) · <b>แอดมินเจ้าของ</b> (จำกัดสิทธิ์ ไม่เห็นการเงิน/ตั้งค่า) พร้อมรีสอร์ท DEMO 3 ประเภทห้อง รูปมีลายน้ำ DEMO และแขกปลอมสำหรับฝึกย้ายห้อง/เลื่อนวัน/เช็คอิน/อนุมัติ</li><li>ลูกค้าเข้าสู่ระบบด้วยบัญชีเจ้าของจะเห็นการ์ด “ภารกิจฝึกใช้งาน” ที่หน้าภาพรวม พร้อมตัวนำทางทีละขั้น</li><li>หมดอายุแล้วบัญชีถูกปิดอัตโนมัติ — ต่ออายุหรือลบได้ที่หน้านี้ (ลบแล้วข้อมูลตัวอย่างหายทั้งหมด)</li></ol></section>`;
    $('#dm-new', main).onclick = create;
    $$('[data-pw]', main).forEach(b => b.onclick = () => resetpw(b.dataset.pw));
    $$('[data-ex]', main).forEach(b => b.onclick = () => extend(b.dataset.ex));
    $$('[data-del]', main).forEach(b => b.onclick = () => del(b.dataset.del));
  };
  const load = async () => { const r = await demoCall('list'); if (r.error) err = r.error; else { items = r.items; err = ''; } if (main.isConnected) draw(); };
  // บัญชีที่ให้ลูกค้า: เจ้าของ + พนักงานตัวอย่าง (แม่บ้าน / แอดมินจำกัดสิทธิ์) — รหัสผ่านแสดงครั้งเดียว
  const credCard = (label, email, password, expires, staff = [], beach = '') => {
    const accts = [['เจ้าของรีสอร์ท (สิทธิ์เต็ม)', email, password], ...staff.map(s => [s.name, s.email, s.password])];
    const text = `สวัสดีครับ/ค่ะ 🙏 ขอเชิญทดลองใช้ระบบจัดการรีสอร์ท (${label})\n\nเข้าสู่ระบบที่: ${demoLoginUrl()}\n\n${accts.map(([n, e, p]) => `▪ ${n}\n  ID: ${e}\n  รหัสผ่าน: ${p}`).join('\n\n')}\n\nใช้ทดลองได้ถึงวันที่ ${fmtDate(expires.slice(0, 10), false)}\n${beach ? `รีสอร์ท DEMO ตั้งอยู่ที่${beach} เกาะล้าน\n` : ''}มีรีสอร์ท DEMO และแขกปลอมให้ลองย้ายห้อง เลื่อนวัน เช็คอิน อนุมัติ ได้เต็มที่ ไม่กระทบเว็บไซต์จริง — ดูภารกิจฝึกที่หน้า “ภาพรวมวันนี้” หลังเข้าด้วยบัญชีเจ้าของ\nลองบัญชีแม่บ้านเพื่อดูมุมมองทำความสะอาดห้อง และบัญชีแอดมินเพื่อดูมุมมองที่ถูกจำกัดสิทธิ์ครับ/ค่ะ`;
    const m = openModal(`<h2><i class="fa-solid fa-flask"></i> บัญชีทดลองพร้อมใช้งาน</h2>
      <div class="card pad" style="background:var(--surface-2,#f8fafc);margin:10px 0">${accts.map(([n, e, p], i) => `<div style="${i ? 'margin-top:10px;padding-top:10px;border-top:1px dashed var(--border,#e5e7eb)' : ''}"><div class="small muted">${esc(n)}</div><div class="mono"><b>${esc(e)}</b></div><div class="mono">รหัสผ่าน <b style="font-size:1.05rem">${esc(p)}</b></div></div>`).join('')}<div class="small muted" style="margin-top:8px">รหัสผ่านแสดงครั้งเดียว — ลืมแล้วกด “รหัสใหม่”</div></div>
      <textarea id="dm-t" rows="12" style="width:100%">${esc(text)}</textarea>
      <div class="row wrap" style="gap:8px;margin-top:12px"><button class="btn btn-primary" id="dm-copy"><i class="fa-regular fa-copy"></i> คัดลอกข้อความ</button><a class="btn btn-outline" id="dm-line" target="_blank" rel="noopener"><i class="fa-brands fa-line"></i> ส่งทาง LINE</a><button class="btn btn-ghost" data-close style="margin-left:auto">ปิด</button></div>`);
    const sync = () => { $('#dm-line', m).href = `https://line.me/R/share?text=${encodeURIComponent($('#dm-t', m).value)}`; };
    sync(); $('#dm-t', m).oninput = sync;
    $('#dm-copy', m).onclick = () => { copyText($('#dm-t', m).value); toast('คัดลอกแล้ว'); };
  };
  // ชื่อถัดไป: “รีสอร์ท demo N” (N = เลขสูงสุดที่ใช้แล้ว + 1)
  const nextLabel = () => `รีสอร์ท demo ${Math.max(0, ...(items || []).map(d => +(/^รีสอร์ท demo (\d+)/.exec(d.label || '')?.[1]) || 0)) + 1}`;
  const create = () => {
    const m = openModal(`<h2><i class="fa-solid fa-flask"></i> สร้างบัญชีทดลอง</h2>
      <div class="field"><label>ชื่อลูกค้า / รีสอร์ทที่จะให้ลอง</label><input id="dn-l" value="${esc(nextLabel())}" placeholder="เช่น รีสอร์ท demo 1"><div class="small muted">ชื่อนี้จะเป็นชื่อรีสอร์ท DEMO ของลูกค้า (ระบบเติมเลขถัดไปให้ แก้ได้)</div></div>
      <div class="field"><label>ใช้ได้กี่วัน</label><select id="dn-d"><option value="3">3 วัน</option><option value="7" selected>7 วัน</option><option value="14">14 วัน</option><option value="30">30 วัน</option></select></div>
      <div class="field"><label>บันทึกช่วยจำ (ไม่บังคับ)</label><input id="dn-n" placeholder="เช่น ได้เบอร์จากงานแสดงสินค้า"></div>
      <div class="row" style="justify-content:flex-end;gap:8px;margin-top:12px"><button class="btn btn-ghost" data-close>ยกเลิก</button><button class="btn btn-primary" id="dn-go">สร้างบัญชี</button></div>`);
    $('#dn-go', m).onclick = async () => {
      const label = $('#dn-l', m).value.trim(); if (!label) return toast('กรุณาใส่ชื่อลูกค้า', 'err');
      const b = $('#dn-go', m); b.disabled = true; b.textContent = 'กำลังสร้าง…';
      const r = await demoCall('create', { label, days: +$('#dn-d', m).value, note: $('#dn-n', m).value });
      if (r.error) { b.disabled = false; b.textContent = 'สร้างบัญชี'; return toast(r.error, 'err'); }
      m.querySelector('[data-close]')?.click();
      if (r.warn) toast(r.warn, 'err');
      credCard(label, r.email, r.password, r.expiresAt, r.staff || [], r.beach || ''); load();
    };
  };
  const resetpw = async id => {
    const d = items?.find(x => x.owner_id === id); if (!d || !await confirmBox(`ออกรหัสผ่านใหม่ให้ “${d.label}”? รหัสเดิมจะใช้ไม่ได้`, 'ออกรหัสใหม่')) return;
    const r = await demoCall('resetpw', { id }); if (r.error) return toast(r.error, 'err');
    credCard(d.label, d.email, r.password, d.expires_at, r.staff || []);
  };
  const extend = async id => {
    const d = items?.find(x => x.owner_id === id); if (!d) return;
    const m = openModal(`<h2><i class="fa-solid fa-calendar-plus"></i> ต่ออายุ “${esc(d.label)}”</h2><div class="field"><label>ต่ออีกกี่วัน (นับจากวันหมดอายุเดิม หรือวันนี้ถ้าหมดแล้ว)</label><select id="de-d"><option value="3">3 วัน</option><option value="7" selected>7 วัน</option><option value="14">14 วัน</option><option value="30">30 วัน</option></select></div><div class="row" style="justify-content:flex-end;gap:8px"><button class="btn btn-ghost" data-close>ยกเลิก</button><button class="btn btn-primary" id="de-go">ต่ออายุ</button></div>`);
    $('#de-go', m).onclick = async () => { const r = await demoCall('extend', { id, days: +$('#de-d', m).value }); if (r.error) return toast(r.error, 'err'); m.querySelector('[data-close]')?.click(); toast('ต่ออายุแล้ว'); load(); };
  };
  const del = async id => {
    const d = items?.find(x => x.owner_id === id); if (!d || !await confirmBox(`ลบบัญชีทดลอง “${d.label}” พร้อมรีสอร์ทและการจองตัวอย่างทั้งหมด? ย้อนกลับไม่ได้`, 'ลบถาวร')) return;
    const r = await demoCall('delete', { id }); if (r.error) return toast(r.error, 'err');
    toast('ลบบัญชีทดลองแล้ว'); load();
  };
  draw(); load();
}

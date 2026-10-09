// ================= ขอความช่วยเหลือฉุกเฉิน (SOS) =================
// เบอร์ในพื้นที่แก้ไขได้ที่ หลังบ้าน → แจ้งเหตุฉุกเฉิน
const DEFAULT_SOS_CONTACTS = [
  { id: 'police', icon: 'fa-shield-halved', name: 'ตำรวจ', hotline: '191', local: '038424186', localName: 'สภ.เมืองพัทยา' },
  { id: 'tourist', icon: 'fa-user-shield', name: 'ตำรวจท่องเที่ยว', hotline: '1155', local: '038425937', localName: 'ตำรวจท่องเที่ยวพัทยา' },
  { id: 'medical', icon: 'fa-truck-medical', name: 'โรงพยาบาล / รถพยาบาล', hotline: '1669', local: '0631607442', localName: 'ศูนย์แพทย์ชุมชนบ้านเกาะล้าน' },
  { id: 'marine', icon: 'fa-life-ring', name: 'กู้ภัยทางทะเล', hotline: '1199', local: '038488134', localName: 'ตำรวจน้ำพัทยา' },
];
const SOS_INCIDENTS = [
  { id: 'injury', icon: 'fa-user-injured', label: 'อุบัติเหตุ / บาดเจ็บ', en: 'Accident / injury', to: 'medical' },
  { id: 'sick', icon: 'fa-heart-pulse', label: 'เจ็บป่วยฉุกเฉิน', en: 'Medical emergency', to: 'medical' },
  { id: 'drown', icon: 'fa-person-drowning', label: 'จมน้ำ / เหตุในทะเล', en: 'Drowning / sea incident', to: 'marine' },
  { id: 'boat', icon: 'fa-ship', label: 'เรือเสีย / เรือล่ม', en: 'Boat breakdown / capsized', to: 'marine' },
  { id: 'crime', icon: 'fa-hand-fist', label: 'ทะเลาะวิวาท / ถูกทำร้าย', en: 'Fight / assault', to: 'police' },
  { id: 'theft', icon: 'fa-sack-xmark', label: 'ทรัพย์สินหาย / ถูกขโมย', en: 'Lost / stolen belongings', to: 'tourist' },
  { id: 'lost', icon: 'fa-person-circle-question', label: 'หลงทาง / พลัดหลง', en: 'Lost / separated', to: 'tourist' },
  { id: 'scam', icon: 'fa-triangle-exclamation', label: 'ถูกโกง / ถูกเอาเปรียบ', en: 'Scammed / overcharged', to: 'tourist' },
  { id: 'other', icon: 'fa-circle-exclamation', label: 'เหตุอื่นๆ', en: 'Other', to: 'police' },
];
const KOH_LARN_CENTER = [12.9170, 100.7800];

const sosContacts = () => DB.sosContacts();
const fmtPhone = n => { const d = String(n).replace(/\D/g, ''); return d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : d.length === 9 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : d; };
const isMobileNo = n => /^0[689]\d{8}$/.test(String(n).replace(/\D/g, ''));
const mapsLink = (lat, lng) => `https://maps.google.com/?q=${lat.toFixed(6)},${lng.toFixed(6)}`;

// ผู้ใช้ที่เลือกภาษาอังกฤษ/จีน = ชาวต่างชาติ → แนะนำตำรวจท่องเที่ยว 1155 ก่อน (มีเจ้าหน้าที่พูดได้หลายภาษา)
const sosForeign = () => typeof LANG !== 'undefined' && LANG !== 'th';
const sosOrdered = () => { const l = sosContacts(); return sosForeign() ? [...l.filter(c => c.id === 'tourist'), ...l.filter(c => c.id !== 'tourist')] : l; };

function sosFooterHtml() {
  return `<div class="foot-sos"><h4 data-edit="footer.sos.title">ติดต่อความช่วยเหลือ</h4>
    ${sosOrdered().map(c => `<a href="javascript:" data-sos="${c.id}"><i class="fa-solid ${c.icon}"></i><span>${esc(c.name)}</span><b>${esc(c.hotline)}${c.local ? ` / ${fmtPhone(c.local)}` : ''}</b></a>`).join('')}
    <button class="btn btn-sos btn-sm" data-sos=""><i class="fa-solid fa-bell"></i> <span data-edit="footer.sos.btn">แจ้งเหตุพร้อมปักหมุดพิกัด</span></button></div>`;
}
function bindSosLinks(root = document) {
  $$('[data-sos]', root).forEach(a => a.onclick = e => { e.preventDefault(); openSos(a.dataset.sos); });
}

function openSos(serviceId) {
  const contacts = sosContacts();
  const u = DB.currentUser();
  const foreign = sosForeign();
  const st = { service: serviceId || (foreign ? 'tourist' : 'police'), incident: null, lat: null, lng: null, acc: null, located: false };
  const m = openModal(`
    <div class="sos-head"><i class="fa-solid fa-bell"></i><div><h2>ขอความช่วยเหลือฉุกเฉิน</h2><div class="small">เกาะล้าน · เลือกหน่วยงาน แล้วกดโทรได้ที่ขั้นที่ 4 ด้านล่าง</div></div></div>
    ${foreign ? (() => { const t = contacts.find(c => c.id === 'tourist'), md = contacts.find(c => c.id === 'medical'), po = contacts.find(c => c.id === 'police');
      return t ? `<div class="notice warn" id="sos-foreign"><i class="fa-solid fa-language"></i><div><b>ชาวต่างชาติ? โทร ${esc(t.hotline)} ตำรวจท่องเที่ยว</b><br>เจ้าหน้าที่พูดได้หลายภาษา (เช่น อังกฤษ จีน) และช่วยประสานงานกับหน่วยงานอื่นให้<br>
        <span class="small">กรณีเจ็บป่วยรุนแรงหรืออันตรายถึงชีวิต โทร ${esc(md?.hotline || '1669')} หรือ ${esc(po?.hotline || '191')} ทันที</span>
        <div style="margin-top:8px"><a class="btn btn-sos" href="tel:${esc(t.hotline)}" data-rec="call ${esc(t.hotline)}"><i class="fa-solid fa-phone"></i> โทร ${esc(t.hotline)} ตำรวจท่องเที่ยว</a></div></div></div>` : ''; })() : ''}
    <div class="sos-quick" id="sos-quick"></div>

    <h3 class="sos-step"><span>1</span> เกิดเหตุอะไร?</h3>
    <div class="sos-inc">${SOS_INCIDENTS.map(i => `<button type="button" data-inc="${i.id}"><i class="fa-solid ${i.icon}"></i>${i.label}</button>`).join('')}</div>

    <h3 class="sos-step"><span>2</span> ปักหมุดตำแหน่งที่เกิดเหตุ</h3>
    <div class="row wrap" style="margin-bottom:8px"><button type="button" class="btn btn-primary btn-sm" id="sos-gps"><i class="fa-solid fa-location-crosshairs"></i> ใช้ตำแหน่งปัจจุบันของฉัน</button><span class="small muted" id="sos-loc">แตะบนแผนที่ หรือลากหมุดเพื่อเลือกตำแหน่ง</span></div>
    <div id="sos-map"></div>

    <h3 class="sos-step"><span>3</span> ข้อมูลผู้แจ้ง <span class="small muted" style="font-weight:400">(ไม่บังคับ แต่ช่วยให้เจ้าหน้าที่ติดต่อกลับได้)</span></h3>
    <div class="form-grid">
      <div class="fg"><label>ชื่อผู้แจ้ง</label><input id="sos-name" value="${esc(u?.name || '')}"></div>
      <div class="fg"><label>เบอร์โทรติดต่อกลับ</label><input id="sos-phone" type="tel" value="${esc(u?.phone || '')}"></div>
      <div class="fg"><label>จำนวนผู้ประสบเหตุ</label><select id="sos-people">${[1, 2, 3, 4, 5].map(n => `<option>${n}</option>`).join('')}<option value="มากกว่า 5">มากกว่า 5</option></select></div>
      <div class="fg"><label>จุดสังเกต</label><input id="sos-mark" placeholder="เช่น หน้าร้าน..., ปลายหาดแสม"></div>
      <div class="fg full"><label>รายละเอียดเหตุการณ์</label><textarea id="sos-note" rows="2" placeholder="เล่าสั้นๆ ว่าเกิดอะไรขึ้น"></textarea></div>
    </div>

    <h3 class="sos-step" id="sos-step4"><span>4</span> ส่งคำขอความช่วยเหลือ</h3>
    <div id="sos-actions"></div>
    <p class="small muted" style="margin:10px 0 0"><i class="fa-solid fa-circle-info"></i> ระบบจะเปิดแอปโทรศัพท์ / ข้อความของเครื่องคุณ — โปรดอ่านพิกัดหรือส่งข้อความที่เตรียมไว้ให้เจ้าหน้าที่</p>`, 'wide sos-modal');

  const svc = () => contacts.find(c => c.id === st.service) || contacts[0];
  const message = () => {
    const inc = SOS_INCIDENTS.find(i => i.id === st.incident);
    const lines = [
      `🚨 แจ้งเหตุฉุกเฉิน เกาะล้าน`,
      `เหตุ: ${inc ? inc.label : 'ไม่ระบุ'}`,
      `จำนวนผู้ประสบเหตุ: ${$('#sos-people', m).value} คน`,
      st.lat != null ? `พิกัด: ${st.lat.toFixed(6)}, ${st.lng.toFixed(6)}${st.acc ? ` (±${Math.round(st.acc)} ม.)` : ''}` : 'พิกัด: ยังไม่ได้ปักหมุด',
      st.lat != null ? `แผนที่: ${mapsLink(st.lat, st.lng)}` : '',
      $('#sos-mark', m).value.trim() ? `จุดสังเกต: ${$('#sos-mark', m).value.trim()}` : '',
      $('#sos-note', m).value.trim() ? `รายละเอียด: ${$('#sos-note', m).value.trim()}` : '',
      `ผู้แจ้ง: ${$('#sos-name', m).value.trim() || '-'} โทร ${$('#sos-phone', m).value.trim() || '-'}`,
    ];
    let text = lines.filter(Boolean).join('\n');
    // ชาวต่างชาติ: ภาษาไทยก่อนเสมอ (เผื่อส่งต่อหน่วยงานไทย) แล้วต่อด้วยภาษาอังกฤษสำหรับตำรวจท่องเที่ยว
    if (foreign) {
      const en = [
        `🚨 EMERGENCY — Koh Larn, Pattaya`,
        `Incident: ${inc ? inc.en : 'Not specified'}`,
        `People involved: ${$('#sos-people', m).value}`,
        st.lat != null ? `Location: ${st.lat.toFixed(6)}, ${st.lng.toFixed(6)}${st.acc ? ` (±${Math.round(st.acc)} m)` : ''}` : 'Location: not pinned yet',
        st.lat != null ? `Map: ${mapsLink(st.lat, st.lng)}` : '',
        $('#sos-mark', m).value.trim() ? `Landmark: ${$('#sos-mark', m).value.trim()}` : '',
        $('#sos-note', m).value.trim() ? `Details: ${$('#sos-note', m).value.trim()}` : '',
        `Caller: ${$('#sos-name', m).value.trim() || '-'}, tel ${$('#sos-phone', m).value.trim() || '-'}`,
      ];
      text += '\n\n' + en.filter(Boolean).join('\n');
    }
    return text;
  };
  const record = channel => {
    DB.addSos({ service: st.service, incident: st.incident, lat: st.lat, lng: st.lng, acc: st.acc,
      name: $('#sos-name', m).value.trim(), phone: $('#sos-phone', m).value.trim(), people: $('#sos-people', m).value, mark: $('#sos-mark', m).value.trim(), note: $('#sos-note', m).value.trim(), channel });
  };

  function drawQuick() {
    $('#sos-quick', m).innerHTML = sosOrdered().map(c => `<button type="button" class="sos-call ${c.id === st.service ? 'active' : ''}" data-svc="${c.id}"><i class="fa-solid ${c.icon}"></i><span>${esc(c.name)}</span><b>${esc(c.hotline)}</b></button>`).join('');
    // ไม่โทรออกทันที — เลือกหน่วยงานแล้วเลื่อนลงไปที่ขั้นที่ 4 (ปุ่มโทร / SMS / แชร์)
    $$('[data-svc]', m).forEach(a => a.onclick = () => {
      st.service = a.dataset.svc; drawQuick(); drawActions();
      $('#sos-step4', m).scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  function drawActions() {
    const c = svc();
    const msg = encodeURIComponent(message());
    $('#sos-actions', m).innerHTML = `
      <div class="small" style="margin-bottom:8px">ส่งถึง: <select id="sos-svc">${sosOrdered().map(x => `<option value="${x.id}" ${x.id === c.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
      <div class="sos-btns">
        <a class="btn btn-sos btn-lg" href="tel:${c.hotline}" data-rec="call ${c.hotline}"><i class="fa-solid fa-phone"></i> โทร ${esc(c.hotline)}</a>
        ${c.local ? `<a class="btn btn-danger btn-lg" href="tel:${c.local}" data-rec="call ${c.local}"><i class="fa-solid fa-phone"></i> ${fmtPhone(c.local)}<span class="small" style="font-weight:400">${esc(c.localName || '')}</span></a>` : ''}
        ${c.local && isMobileNo(c.local) ? `<a class="btn btn-outline btn-lg" href="sms:${c.local}?&body=${msg}" data-rec="sms ${c.local}"><i class="fa-solid fa-comment-sms"></i> ส่ง SMS พร้อมพิกัด</a>` : ''}
        <button type="button" class="btn btn-outline btn-lg" id="sos-share"><i class="fa-solid fa-share-nodes"></i> แชร์ข้อความ + พิกัด (LINE ฯลฯ)</button>
        <button type="button" class="btn btn-ghost btn-lg" id="sos-copy"><i class="fa-regular fa-copy"></i> คัดลอกข้อความแจ้งเหตุ</button>
      </div>
      <pre class="sos-preview">${esc(message())}</pre>`;
    $('#sos-svc', m).onchange = e => { st.service = e.target.value; drawQuick(); drawActions(); };
    $$('[data-rec]', m).forEach(a => a.addEventListener('click', () => { record(a.dataset.rec); toast('กำลังเปิดแอปโทรศัพท์...'); }));
    $('#sos-share', m).onclick = async () => {
      record('share');
      if (navigator.share) { try { await navigator.share({ title: 'แจ้งเหตุฉุกเฉิน เกาะล้าน', text: message() }); } catch {} }
      else { copyText(message()); toast('คัดลอกข้อความแล้ว — วางในแชทเพื่อส่งได้เลย'); }
    };
    $('#sos-copy', m).onclick = () => { copyText(message()); toast('คัดลอกข้อความแจ้งเหตุแล้ว'); };
  }

  // incidents
  $$('[data-inc]', m).forEach(b => b.onclick = () => {
    st.incident = b.dataset.inc;
    const to = SOS_INCIDENTS.find(i => i.id === st.incident).to;
    st.service = foreign && to === 'police' ? 'tourist' : to; // ชาวต่างชาติเรื่องทั่วไป → ตำรวจท่องเที่ยว (หลายภาษา)
    $$('[data-inc]', m).forEach(x => x.classList.toggle('active', x === b));
    drawQuick(); drawActions();
  });
  ['#sos-name', '#sos-phone', '#sos-people', '#sos-mark', '#sos-note'].forEach(s => $(s, m).addEventListener('input', debounce(drawActions, 250)));

  // map
  let map = null, marker = null;
  const setPin = (lat, lng, acc = null) => {
    st.lat = lat; st.lng = lng; st.acc = acc;
    if (marker) marker.setLatLng([lat, lng]);
    $('#sos-loc', m).innerHTML = `<i class="fa-solid fa-location-dot red"></i> ${lat.toFixed(5)}, ${lng.toFixed(5)}${acc ? ` (แม่นยำ ±${Math.round(acc)} ม.)` : ''} · <a href="${mapsLink(lat, lng)}" target="_blank" rel="noopener">เปิดใน Google Maps</a>`;
    drawActions();
  };
  if (window.L) {
    // ระดับซูมคงที่ — ปิดการซูมทุกรูปแบบ (แตะสองครั้ง, สองนิ้ว, ลูกกลิ้ง, ปุ่ม +/-) เพื่อให้หมุดและแผนที่อยู่กับที่
    map = L.map($('#sos-map', m), { zoomControl: false, doubleClickZoom: false, scrollWheelZoom: false, touchZoom: false, boxZoom: false, keyboard: false }).setView(KOH_LARN_CENTER, 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
    const icon = L.divIcon({ className: '', html: '<div class="sos-pin"><i class="fa-solid fa-location-dot"></i></div>', iconSize: [36, 36], iconAnchor: [18, 34] });
    marker = L.marker(KOH_LARN_CENTER, { draggable: true, icon }).addTo(map);
    marker.on('dragend', () => { const p = marker.getLatLng(); setPin(p.lat, p.lng); });
    map.on('click', e => setPin(e.latlng.lat, e.latlng.lng));
    setTimeout(() => map.invalidateSize(), 150);
  } else $('#sos-map', m).innerHTML = '<div class="empty small">โหลดแผนที่ไม่ได้ (ไม่มีอินเทอร์เน็ต) — กด "ใช้ตำแหน่งปัจจุบันของฉัน" แทน</div>';

  $('#sos-gps', m).onclick = () => {
    if (!navigator.geolocation) return toast('อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง', 'err');
    const btn = $('#sos-gps', m); btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังหาตำแหน่ง...';
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude, accuracy } = pos.coords;
      setPin(latitude, longitude, accuracy);
      if (map) map.panTo([latitude, longitude], { animate: false }); // เลื่อนไปที่ตำแหน่ง โดยไม่เปลี่ยนระดับซูม
      btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i> อัปเดตตำแหน่งอีกครั้ง';
    }, err => {
      btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i> ใช้ตำแหน่งปัจจุบันของฉัน';
      toast(err.code === 1 ? 'กรุณาอนุญาตการเข้าถึงตำแหน่งในเบราว์เซอร์ หรือปักหมุดบนแผนที่เอง' : 'หาตำแหน่งไม่สำเร็จ — ปักหมุดบนแผนที่เองได้', 'err');
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  };

  $$('#sos-foreign [data-rec]', m).forEach(a => a.addEventListener('click', () => { record(a.dataset.rec); toast('กำลังเปิดแอปโทรศัพท์...'); }));
  drawQuick(); drawActions();
  $('#sos-gps', m).click(); // พยายามหาตำแหน่งทันทีที่เปิด
}
function copyText(t) {
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(t).catch(() => fallbackCopy(t)); else fallbackCopy(t);
}
function fallbackCopy(t) { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch {} ta.remove(); }

// ---------- Admin: แจ้งเหตุฉุกเฉิน ----------
function admSos(main) {
  const list = DB.sos();
  const contacts = sosContacts();
  const ST = { new: ['ใหม่', 'pending'], helping: ['กำลังช่วยเหลือ', 'confirmed'], done: ['เสร็จสิ้น', 'completed'] };
  main.innerHTML = pageHead('แจ้งเหตุฉุกเฉิน', 'รายการแจ้งเหตุจากลูกค้า และเบอร์ติดต่อหน่วยงานในพื้นที่') + `
    <div class="notice info"><i class="fa-solid fa-tower-broadcast"></i><div>รายการแจ้งเหตุจากลูกค้าทุกเครื่องแบบเรียลไทม์ — หน้านี้จะอัปเดตเองเมื่อมีการแจ้งเหตุใหม่</div></div>
    <h3>รายการแจ้งเหตุ (${list.length})</h3>
    ${list.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>เวลา</th><th>เหตุ</th><th>ส่งถึง / ช่องทาง</th><th>ผู้แจ้ง</th><th>พิกัด</th><th>สถานะ</th></tr></thead><tbody>
      ${list.map(r => { const inc = SOS_INCIDENTS.find(x => x.id === r.incident); const c = contacts.find(x => x.id === r.service); return `<tr>
        <td class="small">${fmtDateTime(r.at)}</td>
        <td>${inc ? `<i class="fa-solid ${inc.icon} red"></i> ${inc.label}` : '-'}${r.note ? `<div class="small muted">${esc(r.note)}</div>` : ''}${r.mark ? `<div class="small muted">จุดสังเกต: ${esc(r.mark)}</div>` : ''}</td>
        <td class="small">${esc(c?.name || r.service)}<br>${esc(r.channel)}</td>
        <td class="small">${esc(r.name || '-')}<br>${r.phone ? `<a href="tel:${esc(r.phone)}">${esc(r.phone)}</a>` : ''} · ${esc(r.people)} คน</td>
        <td class="small">${r.lat != null ? `<a href="${mapsLink(r.lat, r.lng)}" target="_blank" rel="noopener">${r.lat.toFixed(5)}, ${r.lng.toFixed(5)}</a>` : '-'}</td>
        <td><select data-sst="${esc(r.id)}">${Object.entries(ST).map(([k, [l]]) => `<option value="${k}" ${r.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></td></tr>`; }).join('')}
    </tbody></table></div>` : '<div class="empty"><i class="fa-solid fa-bell-slash"></i><p class="muted">ยังไม่มีการแจ้งเหตุ</p></div>'}
    <h3 style="margin-top:28px">เบอร์ติดต่อฉุกเฉิน</h3>
    <p class="small muted">เบอร์ในพื้นที่รวบรวมจากแหล่งข้อมูลสาธารณะ — <b>ควรโทรตรวจสอบก่อนเปิดใช้งานจริง</b> แล้วแก้ไขได้ที่นี่</p>
    <form id="sos-cf" class="table-wrap"><table class="tbl"><thead><tr><th>บริการ</th><th>สายด่วน</th><th>เบอร์ในพื้นที่</th><th>ชื่อหน่วยงานในพื้นที่</th></tr></thead><tbody>
      ${contacts.map((c, i) => `<tr><td><i class="fa-solid ${c.icon} red"></i> <input data-ci="${i}" data-k="name" value="${esc(c.name)}" style="width:170px"></td>
        <td><input data-ci="${i}" data-k="hotline" value="${esc(c.hotline)}" style="width:80px"></td>
        <td><input data-ci="${i}" data-k="local" value="${esc(c.local)}" style="width:130px" placeholder="08XXXXXXXX"></td>
        <td><input data-ci="${i}" data-k="localName" value="${esc(c.localName)}" style="width:220px"></td></tr>`).join('')}
    </tbody></table>
    <div class="row" style="padding:12px 14px"><button class="btn btn-primary">บันทึกเบอร์</button><button type="button" class="btn btn-ghost" id="sos-reset">คืนค่าเริ่มต้น</button></div></form>`;
  $$('[data-sst]', main).forEach(s => s.onchange = () => { DB.setSosStatus(s.dataset.sst, s.value); DB.log('sos.status', `${s.dataset.sst} → ${ST[s.value][0]}`); toast('อัปเดตสถานะแล้ว'); });
  $$('#sos-cf input', main).forEach(i => i.style.cssText += ';padding:6px 8px;border:1px solid var(--border);border-radius:6px');
  $('#sos-cf', main).onsubmit = e => {
    e.preventDefault();
    const next = contacts.map(c => ({ ...c }));
    $$('[data-ci]', main).forEach(i => { next[+i.dataset.ci][i.dataset.k] = i.dataset.k === 'local' || i.dataset.k === 'hotline' ? i.value.replace(/[^\d]/g, '') : i.value.trim(); });
    if (next.some(c => !c.hotline)) return toast('สายด่วนต้องไม่ว่าง', 'err');
    DB.saveSosContacts(next); DB.log('sos.contacts', 'แก้ไขเบอร์ติดต่อฉุกเฉิน'); toast('บันทึกเบอร์ติดต่อแล้ว'); render();
  };
  $('#sos-reset', main).onclick = () => { DB.saveSosContacts(null); toast('คืนค่าเริ่มต้นแล้ว'); render(); };
}

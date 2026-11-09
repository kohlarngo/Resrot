// ================= หน้าหมวด: จองเรือ / เช่ารถ / ที่พัก (#/c/boat · #/c/car · #/c/stay) =================
// ฟอร์มค้นหาทุกช่องทำงานจริง: วันที่/เวลา/จำนวนคนถูกส่งต่อไปเติมให้ในหน้าทริป (PREFILL) · ที่พักเปิดหน้าค้นหาของเว็บ hotel พร้อมวันที่

const PREFILL = {
  get: () => { try { return JSON.parse(sessionStorage.getItem('tour_prefill') || 'null'); } catch { return null; } },
  set: v => { try { sessionStorage.setItem('tour_prefill', JSON.stringify(v)); } catch {} },
};
const isoDay = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const plusDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return isoDay(d); };
const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);

// การ์ดทริปแบบกะทัดรัด (ใช้ทั้งหน้าแรกและหน้าหมวด)
function miniCard(t, extra = '') {
  const p = lowest(t), r = t.external ? { score: t.hotelRating, count: t.hotelReviews } : DB.tripRating(t.id);
  const spec = [t.seats && `<i class="fa-regular fa-user"></i> ${esc(t.seats)} ${T('ที่นั่ง')}`, t.cc && `${esc(t.cc)} cc`, t.fuel && esc(t.fuel)].filter(Boolean).join(' · ');
  return `<div class="h2-card" ${t.external ? `data-ext="${esc(t.href)}"` : `data-href="/trip/${esc(t.slug || t.id)}"`}><div class="im"><img src="${esc(tripImg(t))}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${DEFAULT_IMG}'"></div>
    <div class="bd"><b>${esc(t.name)}</b>${t.duration || t.area ? `<span class="sm">${esc(t.duration || t.area)}</span>` : ''}${spec ? `<span class="sm">${spec}</span>` : ''}${+r.count ? `<span class="sm"><i class="fa-solid fa-star" style="color:#ffb400"></i> ${(+r.score).toFixed(1)} (${r.count})</span>` : ''}
    ${isFinite(p) ? `<span class="pr">${T('เริ่มต้น')} <b>${money(p)}</b>${t.external ? '/' + T('คืน') : (t.options?.[0]?.unit ? '/' + esc(t.options[0].unit) : '')}</span>` : ''}${extra}</div></div>`;
}

const CAT_TABS = [['stay', 'ที่พัก', 'fa-bed', '#/c/stay'], ['car', 'รถ/มอเตอร์ไซค์', 'fa-motorcycle', '#/c/car'], ['boat', 'เรือ/ดำน้ำ', 'fa-ship', '#/c/boat'], ['act', 'ทัวร์/กิจกรรม', 'fa-person-swimming', '#/search?cat=activity'], ['food', 'ร้านอาหาร', 'fa-utensils', '#/search?cat=food']];
const CAT_PAGES = {
  boat: {
    cat: 'boat', hero: 'hero-boat', ar: '1070 / 212', title: 'จองเรือไปเกาะล้าน', listTitle: 'เรือแนะนำ', tilesTitle: 'ประเภทเรือที่ให้บริการ', icon: 'fa-ship',
    tiles: [['เรือโดยสาร', 'boat-ferry', 'โดยสาร', 'เดินทางประจำ / ราคาประหยัด'], ['เรือสปีดโบ๊ท', 'boat-speed', 'สปีดโบ๊ท', 'เร็ว สะดวก สบาย'], ['เรือเหมาลำ', 'boat-charter', 'เหมาลำ', 'กลุ่ม / ครอบครัว / คณะ'],
      ['เรือหางยาว', 'boat-longtail', 'หางยาว', 'บรรยากาศริมทะเล'], ['เรือ + รถรับส่ง', 'boat-transfer', 'รับส่ง', 'ถึงที่พักบนเกาะ'], ['ทัวร์ดำน้ำ', 'boat-diving', 'ดำน้ำ', 'ชมปะการัง / จุดดำน้ำ']],
    trust: [['fa-shield-halved', 'เรือปลอดภัย', 'ได้มาตรฐาน'], ['fa-headset', 'เจ้าหน้าที่ดูแล', '24 ชม.'], ['fa-calendar-check', 'จองง่าย', 'ได้ทันที'], ['fa-ship', 'หลากหลาย', 'ประเภทเรือ']],
  },
  car: {
    cat: 'vehicle', hero: 'hero-car', ar: '1040 / 232', title: 'เช่ารถเที่ยวเกาะล้าน', listTitle: 'รถเช่ายอดนิยม', tilesTitle: '', icon: 'fa-car-side',
    tiles: [['รถเก๋ง', 'car-sedan', 'เก๋ง', 'เหมาะกับ 2-4 คน'], ['SUV', 'car-suv', 'SUV', 'เหมาะกับ 4-7 คน'], ['กระบะ', 'car-pickup', 'กระบะ', 'เหมาะ งาน/เดินทาง'], ['มอเตอร์ไซค์', 'car-moto', 'มอเตอร์ไซค์', 'ขับสนุก คล่องตัว'], ['รถกอล์ฟ', 'car-golf', 'กอล์ฟ', 'เหมาะกับครอบครัว/กลุ่ม'], ['รถตู้', 'car-van', 'ตู้', 'เหมาะกับ 8-12 คน']],
    trust: [['fa-shield-halved', 'ประกันชั้น 1', ''], ['fa-life-ring', 'ช่วยเหลือเดินทาง', '24 ชม.'], ['fa-truck-fast', 'บริการจัดส่ง', 'ถึงที่พัก'], ['fa-star', 'รีวิวจาก', 'ลูกค้าจริง']],
  },
  stay: {
    cat: 'stay', hero: 'hero-stay', ar: '1066 / 205', title: 'จองที่พักเกาะล้าน', listTitle: 'ที่พักแนะนำบนเกาะล้าน', tilesTitle: '', icon: 'fa-house',
    tiles: [],
    trust: [['fa-house-chimney', 'ที่พักหลากหลายสไตล์', 'รีสอร์ท / โรงแรม / วิลล่า'], ['fa-umbrella-beach', 'ติดทะเล / ใกล้ชายหาด', 'เดินทางสะดวก'], ['fa-tags', 'ราคาดี มีโปรโมชั่น', 'จองตรงกับที่พัก'], ['fa-star', 'รีวิวจริงจากผู้เข้าพัก', 'มั่นใจได้ทุกการจอง'], ['fa-headset', 'บริการช่วยเหลือ 24 ชม.', 'พร้อมดูแลตลอดทริป']],
  },
};

function pageCategory(app, params, key) {
  const c = CAT_PAGES[key];
  if (!c) return notFound(app);
  const today = todayISO(), tmr = plusDays(today, 1);
  const own = DB.trips().filter(t => (key === 'stay' ? t.external : t.category === c.cat && !t.external)).slice(0, 8);
  const sel = (id, label, opts, val) => `<label class="cp-f"><span>${T(label)}</span><select id="${id}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
  const dat = (id, label, val, min) => `<label class="cp-f"><span>${T(label)}</span><input type="date" id="${id}" value="${val}" min="${min}"></label>`;
  const nums = (n, f) => Array.from({ length: n }, (_, i) => [i + 1, f(i + 1)]);
  const fields = {
    boat: dat('f-d', 'วันที่เดินทาง', today, today) + sel('f-t', 'เวลา', [['', T('ทุกรอบ')], ...['08:00', '10:00', '12:00', '14:00', '16:00'].map(x => [x, x])], '') + sel('f-g', 'จำนวนผู้โดยสาร', nums(10, n => `${n} ${T('คน')}`), 1),
    car: dat('f-d', 'วันที่รับรถ', today, today) + dat('f-r', 'วันที่คืนรถ', tmr, tmr) + sel('f-ty', 'ประเภทรถ', [['', T('ทั้งหมด')], ...c.tiles.map(x => [x[2], x[0]])], ''),
    stay: dat('f-d', 'เช็คอิน', today, today) + dat('f-r', 'เช็คเอาท์', tmr, tmr) + sel('f-a', 'ผู้ใหญ่', nums(8, n => `${n} ${T('ท่าน')}`), 2) + sel('f-c', 'เด็ก', [0, 1, 2, 3, 4].map(n => [n, `${n} ${T('คน')}`]), 0),
  }[key];
  const tilesHtml = c.tiles.length ? `<section class="cp-sec">${c.tilesTitle ? `<h2 class="cp-h"><i class="fa-solid ${c.icon}"></i> ${T(c.tilesTitle)}</h2>` : ''}<div class="cp-tiles ${key}">${c.tiles.map(([l, im, q, sub]) => `<a class="cp-tile" href="#/search?${new URLSearchParams({ cat: c.cat, q })}"><img src="images/cat/${im}.jpg" alt="" loading="lazy"><b>${T(l)}</b><span>${T(sub)}</span></a>`).join('')}</div></section>` : '';
  document.body.classList.add('home2');
  app.innerHTML = `<div class="cp">
    <div class="cp-wrap"><section class="h2-hero cp-hero" style="background-image:url('images/cat/${c.hero}.jpg');aspect-ratio:${c.ar}"><h1 class="cp-h1">${T(c.title)}</h1></section>
      <form class="h2-search cp-search" id="cf"><div class="h2-tabs">${CAT_TABS.map(([k, l, i, href]) => `<a href="${href}" class="${k === key ? 'on' : ''}"><i class="fa-solid ${i}"></i> ${T(l)}</a>`).join('')}</div>
        <div class="cp-fields">${fields}<button class="h2-go"><i class="fa-solid fa-magnifying-glass"></i> ${T('ค้นหา')}</button></div></form></div>
    <div class="container cp-body">
      ${tilesHtml}
      <section class="cp-sec"><div class="h2-hd"><h3><i class="fa-solid ${c.icon}" style="color:#ff7a1a"></i> ${T(c.listTitle)}</h3>${key === 'stay' ? `<a href="${esc((window.KOHLARDGO_CONFIG || {}).HOTEL_SITE || '#')}" target="_blank" rel="noopener">${T('ดูทั้งหมด')} ›</a>` : `<a href="#/search?cat=${c.cat}">${T('ดูทั้งหมด')} ›</a>`}</div>
        ${own.length ? `<div class="cp-grid">${own.map(t => miniCard(t, `<span class="h2-book">${T('จองเลย')}</span>`)).join('')}</div>` : `<div class="h2-empty">${T('เร็ว ๆ นี้')}</div>`}</section>
      <div class="cp-trust">${c.trust.map(([i, a, b]) => `<span><i class="fa-solid ${i}"></i><b>${T(a)}</b>${b ? `<small>${T(b)}</small>` : ''}</span>`).join('')}</div>
    </div>
    <nav class="h2-bnav"><a href="#/"><i class="fa-solid fa-house"></i>${T('หน้าแรก')}</a><a href="#/c/stay" class="${key === 'stay' ? 'on' : ''}"><i class="fa-solid fa-bed"></i>${T('ที่พัก')}</a><a href="#/c/car" class="${key === 'car' ? 'on' : ''}"><i class="fa-solid fa-motorcycle"></i>${T('รถ')}</a><a href="#/c/boat" class="${key === 'boat' ? 'on' : ''}"><i class="fa-solid fa-ship"></i>${T('เรือ')}</a><a href="#/profile"><i class="fa-regular fa-user"></i>${T('โปรไฟล์')}</a></nav>
  </div>`;
  const v = id => $('#' + id, app)?.value;
  // วันคืน/เช็คเอาท์ต้องอยู่หลังวันรับ
  const d = $('#f-d', app), r = $('#f-r', app);
  if (r) d.onchange = () => { r.min = plusDays(d.value || today, 1); if (!r.value || r.value <= d.value) r.value = r.min; };
  $('#cf', app).onsubmit = e => {
    e.preventDefault();
    const date = v('f-d') || today;
    if (key === 'boat') { PREFILL.set({ date, time: v('f-t'), qty: +v('f-g') || 1 }); return go('/search?cat=boat'); }
    const back = v('f-r') || plusDays(date, 1), days = Math.max(1, daysBetween(date, back));
    if (key === 'car') { PREFILL.set({ date, qty: days }); return go('/search?' + new URLSearchParams({ cat: 'vehicle', ...(v('f-ty') ? { q: v('f-ty') } : {}) })); }
    if (back <= date) return toast(T('วันเช็คเอาท์ต้องหลังวันเช็คอิน'), 'err');
    location.href = ((window.KOHLARDGO_CONFIG || {}).HOTEL_SITE || '') + '#/search?' + new URLSearchParams({ in: date, out: back, a: v('f-a') || 2, c: v('f-c') || 0, r: 1 });
  };
  bindCards(app);
}

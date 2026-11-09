// ================= หน้าเว็บลูกค้า =================
const PRICE_UNITS = ['คน', 'ลำ', 'คัน', 'คืน', 'วัน', 'ชม.'];
const lowest = t => Math.min(...(t.options || []).map(o => +o.price).filter(n => n >= 0), Infinity);
const optUnit = o => o.unit || 'คน';
const catLabel = c => T(CATEGORIES[c]?.label || c);
const favBtn = id => `<button class="fav-btn ${favs().includes(id) ? 'on' : ''}" data-fav="${esc(id)}" aria-label="favorite"><i class="fa-${favs().includes(id) ? 'solid' : 'regular'} fa-heart"></i></button>`;
const adBadge = id => (CACHE.pubAds.some(a => a.kind === 'featured' && a.trip_id === id) ? `<span class="ad-badge">${T('แนะนำ · โฆษณา')}</span>` : '');

function tripCard(t) {
  const p = lowest(t), r = t.external ? { score: t.hotelRating, count: t.hotelReviews } : DB.tripRating(t.id);
  const o = (t.options || [])[0] || {};
  return `<div class="h-card" ${t.external ? `data-ext="${esc(t.href)}"` : `data-href="/trip/${esc(t.slug || t.id)}"`}>
    <div class="img">${t.external ? '<span class="ad-badge" style="left:10px;right:auto;background:#7c3aed;color:#fff">รีสอร์ท</span>' : ''}<img src="${esc(tripImg(t))}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${DEFAULT_IMG}'">${adBadge(t.id)}${favBtn(t.id)}</div>
    <div class="body"><div class="name">${esc(t.name)}</div>
      <div class="loc"><i class="fa-solid ${CATEGORIES[t.category]?.icon || 'fa-location-dot'}"></i> ${catLabel(t.category)}${t.duration ? ` · ${esc(t.duration)}` : ''}</div>
      <div class="row between" style="align-items:flex-end;margin-top:auto">${scoreHtml(r.score, r.count)}
        <div class="price-box">${isFinite(p) ? `<div class="per">${T('เริ่มต้น')}</div><div class="price">${money(p)}</div><div class="per">${T('ต่อ {0}', T(optUnit(o)))}</div>` : ''}</div></div>
    </div></div>`;
}
function bindCards(root) {
  $$('[data-href]', root).forEach(c => c.onclick = e => { if (!e.target.closest('button,a')) go(c.dataset.href); });
  $$('[data-ext]', root).forEach(c => c.onclick = e => { if (!e.target.closest('button,a')) window.open(c.dataset.ext, '_blank', 'noopener'); });
  $$('[data-fav]', root).forEach(b => b.onclick = e => {
    e.stopPropagation(); const on = toggleFav(b.dataset.fav);
    b.classList.toggle('on', on); b.innerHTML = `<i class="fa-${on ? 'solid' : 'regular'} fa-heart"></i>`;
  });
}

// ---------- โฆษณา ----------
const adLink = a => (a.link && /^https?:\/\//i.test(a.link) ? a.link : a.trip_id ? `#/trip/${a.trip_id}` : a.phone ? telUrl(a.phone) : '#');
function adInner(a) { return `<a href="${esc(adLink(a))}" data-ad="${a.id}" ${/^https?:/.test(adLink(a)) ? 'target="_blank" rel="noopener sponsored"' : ''}>${a.image ? `<img src="${esc(a.image)}" alt="${esc(a.title || a.advertiser)}">` : ''}<span class="ad-t">${esc(a.title || a.advertiser)}</span>${a.body ? `<span class="small">${esc(a.body)}</span>` : ''}</a>`; }
function trackAds(root) {
  const seen = (window.__adSeen ||= new Set());
  $$('[data-ad]', root).forEach(el => { const id = el.dataset.ad; if (!seen.has(id)) { seen.add(id); DB.trackAd(id, 'view'); } el.addEventListener('click', () => DB.trackAd(id, 'click')); });
}
function adCards() {
  const l = DB.publicAds('card').slice(0, 2);
  return l.length ? `<section class="block ad-home-cards">${l.map(a => `<div class="ad-card"><span class="ad-badge">${T('โฆษณา')}</span>${adInner(a)}</div>`).join('')}</section>` : '';
}
function showSideAds() {
  $$('.ad-side, .ad-bottom, #adp').forEach(e => e.remove());
  let closed = []; try { closed = JSON.parse(sessionStorage.getItem('tour_ad_closed') || '[]'); } catch {}
  const pick = k => DB.publicAds(k).find(a => a.image && !closed.includes(a.id));
  const html = [['side_left', 'L'], ['side_right', 'R']].map(([k, c]) => { const a = pick(k); return a ? `<aside class="ad-side ${c}"><button class="ad-side-x" aria-label="close">×</button><span class="ad-badge">${T('โฆษณา')}</span>${adInner(a)}</aside>` : ''; }).join('');
  const b = pick('bottom_bar');
  document.body.insertAdjacentHTML('beforeend', html + (b ? `<div class="ad-bottom"><button class="ad-bottom-x" aria-label="close">×</button><span class="ad-badge">${T('โฆษณา')}</span>${adInner(b)}</div>` : ''));
  document.body.classList.toggle('has-bottom-ad', !!b);
  $$('.ad-side, .ad-bottom').forEach(el => {
    trackAds(el);
    $('.ad-side-x, .ad-bottom-x', el).onclick = () => { const id = $('[data-ad]', el)?.dataset.ad; if (id) { closed.push(id); try { sessionStorage.setItem('tour_ad_closed', JSON.stringify(closed)); } catch {} } el.remove(); document.body.classList.toggle('has-bottom-ad', !!$('.ad-bottom')); };
  });
  const pop = pick('popup');
  if (pop && !sessionStorage.getItem('tour_popup_' + pop.id)) {
    try { sessionStorage.setItem('tour_popup_' + pop.id, '1'); } catch {}
    setTimeout(() => { if ($('#modal')) return; const m = openModal(`<span class="ad-badge">${T('โฆษณา')}</span>${adInner(pop)}`, 'ad-pop'); m.id = 'adp'; trackAds(m); }, 2500);
  }
}

// ================= หน้าแรก =================
function pageHome(app) {
  const trips = DB.trips(), own = trips.filter(t => !t.external), feat = CACHE.pubAds.filter(a => a.kind === 'featured').map(a => DB.trip(a.trip_id)).filter(Boolean);
  const pick = (cats, n) => [...new Set([...feat, ...own])].filter(t => cats.includes(t.category)).slice(0, n);
  const pkgs = pick(['package'], 3), acts = pick(['activity', 'boat'], 4), stays = trips.filter(t => t.external).slice(0, 2), near = pick(['activity', 'boat', 'vehicle'], 6);
  const qs = k => '/search?q=' + encodeURIComponent(k);
  const tiles = [['เจ็ทสกี', 'cat-jetski', qs('เจ็ท'), 'fa-person-swimming'], ['ดำน้ำตื้น', 'cat-snorkel', qs('ดำน้ำ'), 'fa-mask-snorkel'], ['ฟรีไดฟ์', 'cat-freedive', qs('ฟรีไดฟ์'), 'fa-water'],
    ['สกูบ้า', 'cat-scuba', qs('สกูบ้า'), 'fa-person-swimming'], ['พาราเซล', 'cat-parasail', qs('พาราเซล'), 'fa-parachute-box'], ['สปีดโบ๊ท', 'cat-speedboat', '/search?cat=boat', 'fa-ship'],
    ['จอดเรือ', 'cat-mooring', qs('จอดเรือ'), 'fa-anchor'], ['มอเตอร์ไซค์', 'cat-motorbike', '/search?cat=vehicle', 'fa-motorcycle']];
  const tabs = [['stay', 'ที่พัก', 'fa-bed'], ['vehicle', 'รถ/มอเตอร์ไซค์', 'fa-motorcycle'], ['activity', 'กิจกรรมทางน้ำ', 'fa-person-swimming'], ['boat', 'เรือ/จอดเรือ', 'fa-ship']];
  const rowItem = t => {
    const p = lowest(t);
    return `<div class="h2-row" data-href="/trip/${esc(t.slug || t.id)}"><img src="${esc(tripImg(t))}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${DEFAULT_IMG}'"><div><b>${esc(t.name)}</b><span class="sm">${T('เริ่มต้น')} ${isFinite(p) ? money(p) : '-'}</span></div></div>`;
  };
  const none = `<div class="h2-empty">${T('เร็ว ๆ นี้')}</div>`;
  const big = [['stay', 'ที่พัก', 'fa-bed', '#ff7a1a', '#/c/stay'], ['vehicle', 'รถ', 'fa-motorcycle', '#2f6fe4', '#/c/car'], ['activity', 'กิจกรรม', 'fa-person-swimming', '#119a9a', '#/search?cat=activity'], ['boat', 'เรือ', 'fa-ship', '#6a5be2', '#/c/boat']];
  document.body.classList.add('home2');
  app.innerHTML = `<section class="h2-hero" style="background-image:url('images/hero.jpg')"><div class="h2-shade"></div><div class="container">
      <h1 class="h2-title">${T('เที่ยวเกาะล้าน')}<br><span>${T('ครบจบในที่เดียว')}</span></h1>
      <p class="h2-sub">${T('จองรถ')} • ${T('ที่พัก')} • ${T('กิจกรรมทางน้ำ')} • ${T('เรือ')} • ${T('ทริป')}</p>
      <form class="h2-search" id="hs"><div class="h2-tabs">${tabs.map(([k, l, i], n) => `<button type="button" class="${n ? '' : 'on'}" data-tab="${k}"><i class="fa-solid ${i}"></i> ${T(l)}</button>`).join('')}</div>
        <div class="h2-fields"><label><i class="fa-solid fa-magnifying-glass"></i><input id="hs-q" placeholder="${esc(T('ค้นหาทริป กิจกรรม ที่พัก...'))}"></label><button class="h2-go"><i class="fa-solid fa-magnifying-glass"></i> ${T('ค้นหา')}</button></div></form>
    </div></section>
    <div class="container h2">
      <section class="h2-tiles">${tiles.map(([l, im, href, ic]) => `<a href="#${href}"><img src="images/${im}.jpg" alt="" loading="lazy"><span><i class="fa-solid ${ic}"></i> ${T(l)}</span></a>`).join('')}</section>
      <section class="h2-mq"><h2>${T('คุณอยากจองอะไร?')}</h2><div class="h2-big">${big.map(([k, l, i, c, h]) => `<a href="${h}" style="background:${c}"><i class="fa-solid ${i}"></i>${T(l)}</a>`).join('')}</div></section>
      ${adCards()}
      <section class="h2-near"><div class="h2-hd"><h3><i class="fa-solid fa-location-dot" style="color:#ff7a1a"></i> ${T('ใกล้คุณบนเกาะล้าน')}</h3><a href="#/search">${T('ดูทั้งหมด')} ›</a></div><div class="h2-scroll">${near.length ? near.map(t => miniCard(t)).join('') : none}</div></section>
      <div class="h2-cols">
        <section><div class="h2-hd"><h3><i class="fa-solid fa-fire" style="color:#ff7a1a"></i> ${T('แพ็กเกจยอดนิยม')}</h3><a href="#/search?cat=package">${T('ดูทั้งหมด')} ›</a></div>
          <div class="h2-grid3">${pkgs.length ? pkgs.map(t => miniCard(t, `<span class="h2-book">${T('จองเลย')}</span>`)).join('') : none}</div></section>
        <section><div class="h2-hd"><h3><i class="fa-solid fa-house" style="color:#119a9a"></i> ${T('ที่พักแนะนำ')}</h3><a href="#/search?cat=stay">${T('ดูทั้งหมด')} ›</a></div>
          <div class="h2-grid2">${stays.length ? stays.map(t => miniCard(t)).join('') : none}</div></section>
        <section><div class="h2-hd"><h3><i class="fa-solid fa-star" style="color:#ffb400"></i> ${T('กิจกรรมยอดนิยม')}</h3><a href="#/search?cat=activity">${T('ดูทั้งหมด')} ›</a></div>
          <div class="h2-list">${acts.length ? acts.map(rowItem).join('') : none}</div></section>
      </div>
      <a class="h2-map" href="https://www.google.com/maps/search/?api=1&query=Koh+Larn+Pattaya" target="_blank" rel="noopener" aria-label="${T('ดูแผนที่เกาะล้าน')}"><img src="images/map.jpg" alt="" loading="lazy"></a>
      <div class="h2-trust"><span><i class="fa-solid fa-circle-check"></i> ${T('จองง่าย ในไม่กี่คลิก')}</span><span><i class="fa-solid fa-shield-halved"></i> ${T('ปลอดภัย มั่นใจได้')}</span><span><i class="fa-regular fa-clock"></i> ${T('บริการ 24 ชม.')}</span><span><i class="fa-solid fa-headset"></i> ${T('ทีมงานดูแลตลอดทริป')}</span></div>
    </div>
    <nav class="h2-bnav"><a href="#/" class="on"><i class="fa-solid fa-house"></i>${T('หน้าแรก')}</a><a href="#/search"><i class="fa-solid fa-magnifying-glass"></i>${T('ค้นหา')}</a><a href="#/my-bookings"><i class="fa-regular fa-clipboard"></i>${T('การจอง')}</a><a href="#/favorites"><i class="fa-regular fa-heart"></i>${T('รายการโปรด')}</a><a href="#/profile"><i class="fa-regular fa-user"></i>${T('โปรไฟล์')}</a></nav>
    <a class="h2-help" href="#/help"><i class="fa-solid fa-headset"></i> ${T('ช่วยเหลือ')}</a>`;
  let tab = 'stay';
  $$('[data-tab]', app).forEach(b => b.onclick = () => { tab = b.dataset.tab; $$('[data-tab]', app).forEach(x => x.classList.toggle('on', x === b)); });
  $('#hs').onsubmit = e => { e.preventDefault(); const q = $('#hs-q').value.trim(); const page = { stay: '/c/stay', vehicle: '/c/car', boat: '/c/boat' }[tab]; if (page && !q) return go(page); go('/search?' + new URLSearchParams({ cat: tab, ...(q ? { q } : {}) })); };
  bindCards(app);
}

// ================= ค้นหา =================
function pageSearch(app, params) {
  const q = (params.get('q') || '').trim().toLowerCase(), cat = params.get('cat') || '', sort = params.get('sort') || 'rec';
  let list = DB.trips().filter(t => (!cat || t.category === cat) && (!q || [t.name, t.summary, t.desc, t.area].join(' ').toLowerCase().includes(q)));
  const sorters = { rec: () => 0, asc: (a, b) => lowest(a) - lowest(b), desc: (a, b) => lowest(b) - lowest(a), rate: (a, b) => DB.tripRating(b.id).score - DB.tripRating(a.id).score };
  list = [...list].sort(sorters[sort] || sorters.rec);
  const url = (k, v) => { const p = new URLSearchParams(params); v ? p.set(k, v) : p.delete(k); return '/search?' + p; };
  app.innerHTML = `<div class="container" style="padding-top:20px">
    <form id="sf" class="row" style="gap:8px;margin-bottom:14px"><input id="sq" value="${esc(params.get('q') || '')}" placeholder="${esc(T('ค้นหาทริป กิจกรรม ที่พัก...'))}" style="flex:1;padding:11px 12px;border:1px solid var(--border);border-radius:8px;min-width:0"><button class="btn btn-primary"><i class="fa-solid fa-magnifying-glass"></i></button></form>
    <div class="cat-row" style="margin-bottom:14px"><a class="cat-chip ${cat ? '' : 'on'}" href="#${url('cat', '')}"><span>${T('ทั้งหมด')}</span></a>${Object.entries(CATEGORIES).map(([k, v]) => `<a class="cat-chip ${cat === k ? 'on' : ''}" href="#${url('cat', k)}" style="--c:${v.color}"><i class="fa-solid ${v.icon}"></i><span>${T(v.label)}</span></a>`).join('')}</div>
    <div class="row between" style="margin-bottom:12px"><b>${list.length} ${T('ทริปและกิจกรรม')}</b><label class="small">${T('เรียงตาม')} <select id="so">${[['rec', 'แนะนำ'], ['asc', 'ราคาต่ำ → สูง'], ['desc', 'ราคาสูง → ต่ำ'], ['rate', 'คะแนนสูงสุด']].map(([v, l]) => `<option value="${v}" ${sort === v ? 'selected' : ''}>${T(l)}</option>`).join('')}</select></label></div>
    ${list.length ? `<div class="card-grid">${list.map(tripCard).join('')}</div>` : `<div class="empty"><i class="fa-solid fa-magnifying-glass"></i><h3>${T('ไม่พบรายการที่ตรงกับการค้นหา')}</h3></div>`}</div>`;
  $('#sf').onsubmit = e => { e.preventDefault(); go(url('q', $('#sq').value.trim())); };
  $('#so').onchange = e => go(url('sort', e.target.value));
  bindCards(app);
}

// ================= หน้าทริป =================
const DRAFT = { get: () => { try { return JSON.parse(sessionStorage.getItem('tour_draft') || 'null'); } catch { return null; } }, set: v => { try { sessionStorage.setItem('tour_draft', JSON.stringify(v)); } catch {} } };
function calcQuote(t, items, coupon) {
  let sub = 0, qty = 0;
  for (const it of items) { const o = (t.options || []).find(x => x.id === it.o); if (!o) continue; sub += (+it.a || 0) * +o.price + (+it.c || 0) * (o.childPrice !== undefined && o.childPrice !== '' && o.childPrice !== null ? +o.childPrice : +o.price); qty += (+it.a || 0) + (+it.c || 0); }
  let disc = 0;
  if (coupon && sub >= coupon.min) disc = Math.min(sub, coupon.type === 'percent' ? Math.round(sub * coupon.value / 100) : coupon.value);
  return { sub, disc, total: sub - disc, qty };
}
function pageTrip(app, params, id) {
  const t = DB.trip(decodeURIComponent(id));
  if (!t) return notFound(app);
  const o = DB.owner(t.ownerId), r = DB.tripRating(t.id), reviews = DB.tripReviews(t.id);
  const pf = PREFILL.get(), draft = DRAFT.get()?.tripId === t.id ? DRAFT.get() : { tripId: t.id, date: pf?.date >= todayISO() ? pf.date : '', time: (t.times || []).includes(pf?.time) ? pf.time : '', items: pf?.qty && t.options?.[0] ? [{ o: t.options[0].id, a: Math.min(50, +pf.qty), c: 0 }] : [] };
  const imgs = (t.images && t.images.length ? t.images : [tripImg(t)]);
  const list = s => (s || []).filter(Boolean);
  app.innerHTML = `<div class="container" style="padding-top:16px">
    <a href="#/search" class="small">← ${T('ทริปและกิจกรรม')}</a>
    <div class="trip-gal"><img id="gal-main" src="${esc(imgs[0])}" alt="" onerror="this.onerror=null;this.src='${DEFAULT_IMG}'">${imgs.length > 1 ? `<div class="gal-th">${imgs.map((u, i) => `<img src="${esc(u)}" data-i="${i}" alt="" loading="lazy">`).join('')}</div>` : ''}</div>
    <div class="trip-grid">
      <div>
        <div class="panel"><div class="small muted"><i class="fa-solid ${CATEGORIES[t.category]?.icon}"></i> ${catLabel(t.category)}${t.area ? ` · ${esc(t.area)}` : ''}</div>
          <h1 style="margin:6px 0">${esc(t.name)}</h1>${scoreHtml(r.score, r.count)}${adBadge(t.id)}
          ${t.summary ? `<p>${esc(t.summary)}</p>` : ''}
          <div class="trip-facts">${t.duration ? `<div><i class="fa-regular fa-clock"></i><b>${T('ระยะเวลา')}</b>${esc(t.duration)}</div>` : ''}${t.meetPoint ? `<div><i class="fa-solid fa-location-dot"></i><b>${T('จุดนัดพบ')}</b>${esc(t.meetPoint)}</div>` : ''}${t.languages ? `<div><i class="fa-solid fa-language"></i><b>Language</b>${esc(t.languages)}</div>` : ''}</div></div>
        ${t.desc ? `<div class="panel"><h2>${T('รายละเอียด')}</h2><p style="white-space:pre-line">${esc(t.desc)}</p></div>` : ''}
        ${list(t.includes).length || list(t.excludes).length ? `<div class="panel trip-inc"><div>${list(t.includes).length ? `<h3>${T('รวมในราคา')}</h3><ul class="ck">${list(t.includes).map(x => `<li><i class="fa-solid fa-check"></i>${esc(x)}</li>`).join('')}</ul>` : ''}</div><div>${list(t.excludes).length ? `<h3>${T('ไม่รวม')}</h3><ul class="ck x">${list(t.excludes).map(x => `<li><i class="fa-solid fa-xmark"></i>${esc(x)}</li>`).join('')}</ul>` : ''}</div></div>` : ''}
        ${t.cancelPolicy ? `<div class="panel"><h3>${T('เงื่อนไขการยกเลิก')}</h3><p style="white-space:pre-line">${esc(t.cancelPolicy)}</p></div>` : ''}
        <div class="panel"><h2>${T('รีวิวจากลูกค้า')}</h2>${reviews.length ? reviews.slice(0, 20).map(rv => `<div class="rv"><div class="row between"><b>${esc(rv.name)}</b>${starsHtml(rv.score)}</div><p>${esc(rv.comment || '')}</p>${rv.reply ? `<div class="rv-reply"><b>${T('ตอบกลับจากผู้ให้บริการ')}</b><br>${esc(rv.reply)}</div>` : ''}</div>`).join('') : `<p class="muted">${T('ยังไม่มีรีวิว')}</p>`}</div>
      </div>
      <aside><div class="panel book-box" id="bx"></div>
        ${o ? `<div class="panel"><h3>${T('ผู้ให้บริการ')}</h3><b>${esc(o.name)}</b>${o.phone ? `<div><a href="${telUrl(o.phone)}"><i class="fa-solid fa-phone"></i> ${esc(o.phone)}</a></div>` : ''}${o.line ? `<div><a target="_blank" rel="noopener" href="${esc(socialUrl('line', o.line))}"><i class="fa-brands fa-line"></i> ${esc(o.line)}</a></div>` : ''}${o.facebook ? `<div><a target="_blank" rel="noopener" href="${esc(o.facebook)}"><i class="fa-brands fa-facebook"></i> Facebook</a></div>` : ''}</div>` : ''}
      </aside></div></div>`;
  $$('.gal-th img', app).forEach(i => i.onclick = () => ($('#gal-main').src = imgs[+i.dataset.i]));
  drawBookBox(t, draft);
}
function drawBookBox(t, st) {
  const box = $('#bx'), opts = t.options || [], times = (t.times || []).filter(Boolean);
  if (!st.items.length && opts.length) st.items = [{ o: opts[0].id, a: 1, c: 0 }];
  const left = st.date ? DB.seatsLeft(t, st.date, st.time) : undefined, q = calcQuote(t, st.items, null);
  const need = q.qty, closed = st.date && (t.closedDates || []).includes(st.date);
  const ok = st.date && q.qty > 0 && !closed && (!times.length || st.time) && (left === null || left === undefined || left >= need);
  box.innerHTML = `<h3 style="margin-top:0">${T('จองเลย')}</h3>
    ${opts.map(o => { const it = st.items.find(x => x.o === o.id) || { a: 0, c: 0 }; const hasChild = o.childPrice !== undefined && o.childPrice !== '' && o.childPrice !== null;
      return `<div class="opt ${it.a + it.c ? 'on' : ''}" data-o="${esc(o.id)}"><div class="row between"><b>${esc(o.name)}</b><span class="price">${money(o.price)}<small>/${T(optUnit(o))}</small></span></div>${o.desc ? `<div class="small muted">${esc(o.desc)}</div>` : ''}
        <div class="row" style="gap:14px;margin-top:6px;flex-wrap:wrap"><div class="qty"><span>${optUnit(o) === 'คน' ? T('ผู้ใหญ่') : T(optUnit(o))}</span><button type="button" data-q="a-1">−</button><b>${it.a}</b><button type="button" data-q="a+1">+</button></div>
        ${hasChild ? `<div class="qty"><span>${T('เด็ก')} ${money(o.childPrice)}</span><button type="button" data-q="c-1">−</button><b>${it.c}</b><button type="button" data-q="c+1">+</button></div>` : ''}</div></div>`; }).join('')}
    <div class="fg" style="margin-top:12px"><label>${T('วันที่เดินทาง')}</label><input type="date" id="bd" min="${todayISO()}" value="${esc(st.date)}"></div>
    ${times.length ? `<div class="fg" style="margin-top:8px"><label>${T('รอบเวลา')}</label><select id="bt"><option value="">${T('เลือกวันที่')}</option>${times.map(x => { const l = st.date ? DB.seatsLeft(t, st.date, x) : null; return `<option value="${esc(x)}" ${st.time === x ? 'selected' : ''} ${l === 0 ? 'disabled' : ''}>${esc(x)}${l === 0 ? ' · ' + T('เต็ม') : l !== null && st.date ? ' · ' + T('เหลือ {0} ที่', l) : ''}</option>`; }).join('')}</select></div>` : ''}
    ${st.date ? `<div class="small" style="margin-top:6px;color:${closed || left === 0 ? 'var(--accent)' : 'var(--green)'}">${closed ? T('ปิดรับจอง') : left === 0 ? T('เต็ม') : left != null && !times.length ? T('เหลือ {0} ที่', left) : ''}${left != null && left > 0 && left < need ? ` — ${T('เหลือ {0} ที่', left)}` : ''}</div>` : ''}
    <div class="row between" style="margin-top:14px"><span>${T('รวมทั้งหมด')}</span><b class="price" style="font-size:22px">${money(q.sub)}</b></div>
    <button class="btn btn-primary btn-block btn-lg" id="bgo" style="margin-top:10px" ${ok ? '' : 'disabled'}>${T('จองเลย')}</button>`;
  const redraw = () => { DRAFT.set(st); drawBookBox(t, st); };
  $$('.opt [data-q]', box).forEach(b => b.onclick = () => {
    const oid = b.closest('.opt').dataset.o, [k, d] = [b.dataset.q[0], +b.dataset.q.slice(1)];
    let it = st.items.find(x => x.o === oid); if (!it) st.items.push(it = { o: oid, a: 0, c: 0 });
    it[k] = Math.max(0, Math.min(50, it[k] + d)); st.items = st.items.filter(x => x.a + x.c > 0); redraw();
  });
  $('#bd', box).onchange = e => { st.date = e.target.value; if (st.time && DB.seatsLeft(t, st.date, st.time) === 0) st.time = ''; redraw(); };
  $('#bt', box)?.addEventListener('change', e => { st.time = e.target.value; redraw(); });
  $('#bgo', box).onclick = () => { DRAFT.set(st); go('/book'); };
}

// ================= จอง =================
function pageBook(app) {
  const st = DRAFT.get(), t = st && DB.trip(st.tripId);
  if (!t || !st.items?.length || !st.date) return go('/search', true);
  const u = DB.currentUser(); let coupon = null; const o = DB.owner(t.ownerId);
  const draw = () => {
    const q = calcQuote(t, st.items, coupon);
    app.innerHTML = `<div class="container" style="padding-top:16px;max-width:980px"><a href="#/trip/${esc(t.slug || t.id)}" class="small">← ${esc(t.name)}</a>
      <div class="trip-grid" style="margin-top:12px"><form id="bf" class="panel" novalidate><h2>${T('ข้อมูลผู้จอง')}</h2><div class="form-grid" style="grid-template-columns:1fr 1fr">
        <div class="fg"><label>${T('ชื่อ-นามสกุล')} *</label><input name="name" value="${esc(u?.name || '')}" maxlength="100" autocomplete="name"></div>
        <div class="fg"><label>${T('เบอร์โทรศัพท์')} *</label><input name="phone" type="tel" value="${esc(u?.phone || '')}" maxlength="20" autocomplete="tel"></div>
        <div class="fg" style="grid-column:1/-1"><label>${T('อีเมล (ไม่บังคับ)')}</label><input name="email" type="email" value="${esc(u?.email || '')}"></div>
        ${t.pickup ? `<div class="fg" style="grid-column:1/-1"><label>${T('จุดรับ (ถ้ามี)')}</label><input name="pickup" maxlength="200"></div>` : ''}
        <div class="fg" style="grid-column:1/-1"><label>${T('หมายเหตุถึงผู้ให้บริการ')}</label><textarea name="note" rows="2" maxlength="500"></textarea></div></div>
        <h2 style="margin-top:18px">${T('โค้ดส่วนลด')}</h2><div class="row"><input id="cp" placeholder="CODE" style="flex:1;padding:10px;border:1px solid var(--border);border-radius:8px;text-transform:uppercase" value="${esc(coupon?.code || '')}"><button type="button" class="btn btn-outline" id="cpb">${T('ใช้โค้ด')}</button></div><div class="small" id="cpm" style="margin-top:4px">${coupon ? `<span class="green">✓ ${esc(coupon.desc || coupon.code)}</span>` : ''}</div>
        <h2 style="margin-top:18px">${T('วิธีชำระเงิน')}</h2>
        <label class="pay-opt"><input type="radio" name="method" value="promptpay" checked><span>${T('โอน / พร้อมเพย์ (ส่งสลิป)')}</span></label>
        <label class="pay-opt"><input type="radio" name="method" value="onsite"><span>${T('จ่ายหน้างานกับผู้ให้บริการ')}</span></label>
        <div class="red small" id="be" style="min-height:20px;margin-top:8px"></div>
        <button class="btn btn-primary btn-block btn-lg" id="bsub">${T('ยืนยันการจอง')} · ${money(q.total)}</button></form>
      <aside class="panel"><img src="${esc(tripImg(t))}" alt="" style="width:100%;border-radius:8px;aspect-ratio:16/9;object-fit:cover"><h3>${esc(t.name)}</h3>
        <div class="small muted">${fmtDate(st.date)}${st.time ? ' · ' + esc(st.time) : ''}</div>
        ${st.items.map(it => { const op = (t.options || []).find(x => x.id === it.o); return op ? `<div class="row between small"><span>${esc(op.name)} × ${it.a}${it.c ? ` + ${it.c} ${T('เด็ก')}` : ''}</span></div>` : ''; }).join('')}
        <hr><div class="row between"><span>${T('รวมทั้งหมด')}</span><span>${money(q.sub)}</span></div>${q.disc ? `<div class="row between green"><span>${T('ส่วนลด')}</span><span>−${money(q.disc)}</span></div>` : ''}
        <div class="row between" style="font-size:20px"><b>${T('รวมทั้งหมด')}</b><b class="price">${money(q.total)}</b></div></aside></div></div>`;
    $('#cpb').onclick = () => { const c = DB.findCoupon($('#cp').value, t); if (!c) { coupon = null; draw(); $('#cpm').innerHTML = '<span class="red">✗</span>'; return; } coupon = c; draw(); };
    $('#bf').onsubmit = async e => {
      e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)), err = $('#be'); err.textContent = '';
      if (f.name.trim().length < 2) return err.textContent = T('ชื่อ-นามสกุล') + ' ?';
      if (!/^[0-9+\- ]{9,20}$/.test(f.phone.trim())) return err.textContent = T('เบอร์โทรศัพท์') + ' ?';
      $('#bsub').disabled = true; $('#bsub').textContent = T('กำลังจอง...');
      try {
        const r = await DB.createBooking({ trip_id: t.id, items: st.items, date: st.date, time: st.time || '', coupon: coupon?.code || '', method: f.method, lang: LANG,
          contact: { name: f.name.trim(), phone: f.phone.trim(), email: f.email, note: f.note }, pickup: f.pickup ? { place: f.pickup } : null });
        DRAFT.set(null); if (u) await DB.refreshBookings().catch(() => {});
        go(`/booking/${r.id}?pin=${r.pin}&new=1`);
      } catch (ex) { err.textContent = ex.message; $('#bsub').disabled = false; $('#bsub').textContent = T('ยืนยันการจอง'); }
    };
  };
  draw();
}

// ================= PromptPay QR =================
function crc16(s) { let c = 0xFFFF; for (let i = 0; i < s.length; i++) { c ^= s.charCodeAt(i) << 8; for (let j = 0; j < 8; j++) c = c & 0x8000 ? (c << 1) ^ 0x1021 : c << 1; c &= 0xFFFF; } return c.toString(16).toUpperCase().padStart(4, '0'); }
function promptpayPayload(id, amount) {
  const d = String(id).replace(/\D/g, ''), tag = (k, v) => k + String(v.length).padStart(2, '0') + v;
  const acct = d.length >= 13 ? tag('02', d) : tag('01', '0066' + d.replace(/^0/, ''));
  const body = tag('00', '01') + tag('01', amount ? '12' : '11') + tag('29', tag('00', 'A000000677010111') + acct) + tag('53', '764') + (amount ? tag('54', (+amount).toFixed(2)) : '') + tag('58', 'TH') + '6304';
  return body + crc16(body);
}
function qrSvg(text) { try { const q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 5, margin: 2, scalable: true }); } catch { return ''; } }

// ================= หน้าการจอง =================
const ST = { pending: ['รอยืนยัน', 'warn'], confirmed: ['ยืนยันแล้ว', 'ok'], completed: ['เสร็จสิ้น', 'ok'], cancelled: ['ยกเลิกแล้ว', 'bad'] };
const stPill = s => `<span class="pill ${ST[s][1]}">${T(ST[s][0])}</span>`;
async function pageBookingView(app, params, id) {
  const pin = params.get('pin') || LS.get('mybk', []).find(x => x.id === id)?.pin || '';
  let b = DB.booking(id);
  if (!b || b._pin === undefined && pin) {
    try { const r = await rpc('tour_get_booking', { p_id: id, p_pin: pin }); if (r) { b = { ...r.data, id: r.id, tripId: r.tripId, ownerId: r.ownerId, status: r.status, date: r.date, time: r.time || '', qty: r.qty, total: +r.total, createdAt: r.createdAt, payment: { method: 'promptpay', ...(r.data?.payment || {}) }, log: r.data?.log || [], _pin: pin }; } } catch {}
  }
  if (!b) return app.innerHTML = `<div class="container"><div class="empty" style="margin-top:30px"><h3>${T('ไม่พบหน้านี้')}</h3><a class="btn btn-primary" href="#/my-bookings">${T('การจองของฉัน')}</a></div></div>`;
  const pinUse = b._pin || pin, t = DB.trip(b.tripId), o = DB.owner(b.ownerId);
  // บัญชีรับเงินของผู้ให้บริการ (เจ้าของตั้งใจเปิดให้ลูกค้าเห็นผ่าน tour_public_owners)
  const payId = o?.promptpay_id, payName = o?.promptpay_name, bank = o?.bank_info;
  const needPay = b.status === 'pending' && b.payment.method === 'promptpay' && !b.payment.paid;
  app.innerHTML = `<div class="container" style="padding-top:16px;max-width:820px">
    ${params.get('new') ? `<div class="notice"><i class="fa-solid fa-circle-check"></i><div><b>${T('จองสำเร็จ')}</b><br>${T('เก็บรหัสและ PIN ไว้ใช้ตรวจสอบการจอง')}</div></div>` : ''}
    <div class="panel"><div class="row between"><div><div class="small muted">${T('รหัสการจอง')}</div><h1 style="margin:0;letter-spacing:1px">${esc(b.id)}</h1></div>${stPill(b.status)}</div>
      <div class="small" style="margin:6px 0">${T('รหัส PIN')}: <b>${esc(pinUse)}</b></div><hr>
      <h3>${esc(b.tripName || t?.name || '')}</h3><div>${fmtDate(b.date)}${b.time ? ' · ' + esc(b.time) : ''} · ${b.qty} ${T('คน')}</div>
      ${(b.items || []).map(it => { const op = (t?.options || []).find(x => x.id === it.o); return op ? `<div class="small muted">${esc(op.name)} × ${it.a}${it.c ? ` + ${it.c} ${T('เด็ก')}` : ''}</div>` : ''; }).join('')}
      ${b.discount ? `<div class="small green">${T('ส่วนลด')} −${money(b.discount)} ${b.coupon ? `(${esc(b.coupon)})` : ''}</div>` : ''}
      <div class="row between" style="margin-top:8px;font-size:20px"><b>${T('รวมทั้งหมด')}</b><b class="price">${money(b.total)}</b></div>
      <div class="small" style="margin-top:4px">${b.payment.paid ? `<span class="green">${T('ชำระแล้ว')}</span>` : `<span class="muted">${T('ยังไม่ชำระ')}</span>`} · ${b.payment.method === 'onsite' ? T('จ่ายหน้างานกับผู้ให้บริการ') : T('โอน / พร้อมเพย์ (ส่งสลิป)')}</div></div>
    ${needPay ? `<div class="panel"><h2>${T('ส่งสลิปการโอน')}</h2>
      ${payId ? `<div style="text-align:center"><div style="max-width:220px;margin:0 auto">${qrSvg(promptpayPayload(payId, b.total))}</div><div class="small muted">${T('สแกนจ่ายผ่านพร้อมเพย์')} · ${T('ชื่อบัญชี')}: ${esc(payName || '-')}</div></div>` : ''}
      ${bank ? `<pre class="sos-preview">${esc(bank)}</pre>` : ''}${!payId && !bank ? `<p class="muted small">ติดต่อผู้ให้บริการเพื่อขอข้อมูลบัญชีรับเงิน${o?.phone ? ` · <a href="${telUrl(o.phone)}">${esc(o.phone)}</a>` : ''}</p>` : ''}
      ${b.payment.slip ? `<div class="notice info"><i class="fa-solid fa-hourglass-half"></i><div>${T('ส่งสลิปแล้ว รอผู้ให้บริการตรวจสอบ')}</div></div><img src="${esc(b.payment.slip)}" alt="slip" style="max-width:240px;border-radius:8px">` : ''}
      <button class="btn btn-primary" id="slip"><i class="fa-solid fa-upload"></i> ${T('ส่งสลิปการโอน')}</button></div>` : ''}
    ${b.status === 'completed' ? `<div class="panel" id="rvbox"><h2>${T('ให้คะแนนทริปนี้')}</h2><div id="rv-s" class="rate"></div><textarea id="rv-c" rows="2" maxlength="1000" style="width:100%;margin:8px 0"></textarea><button class="btn btn-primary" id="rv-go">${T('ส่งรีวิว')}</button></div>` : ''}
    <div class="row" style="gap:8px;flex-wrap:wrap">${o?.phone ? `<a class="btn btn-outline" href="${telUrl(o.phone)}"><i class="fa-solid fa-phone"></i> ${T('โทร')} ${esc(o.name)}</a>` : ''}
      ${['pending', 'confirmed'].includes(b.status) ? `<button class="btn btn-ghost" id="cx" style="color:var(--accent)">${T('ยกเลิกการจอง')}</button>` : ''}</div></div>`;
  $('#slip')?.addEventListener('click', async () => {
    const f = await pickFile(); if (!f) return;
    try { const d = await slipDataUrl(f); await rpc('tour_attach_slip', { p_id: b.id, p_pin: pinUse, p_slip: d }); toast(T('ส่งสลิปแล้ว รอผู้ให้บริการตรวจสอบ')); const c = DB.booking(b.id); if (c) c.payment = { ...c.payment, slip: d }; else b.payment.slip = d; pageBookingView(app, new URLSearchParams('pin=' + pinUse), id); }
    catch (e) { toast(e.message, 'err'); }
  });
  $('#cx')?.addEventListener('click', async () => {
    if (!(await confirmBox(T('ยกเลิกการจอง') + '?'))) return;
    try { await rpc('tour_cancel_booking', { p_id: b.id, p_pin: pinUse }); const c = DB.booking(b.id); if (c) c.status = 'cancelled'; await DB.load(); render(); } catch (e) { toast(e.message, 'err'); }
  });
  if (b.status === 'completed') {
    let sc = 5; const draw = () => ($('#rv-s').innerHTML = [1, 2, 3, 4, 5].map(n => `<i class="fa-${n <= sc ? 'solid' : 'regular'} fa-star" data-s="${n}"></i>`).join(''));
    draw(); $('#rv-s').onclick = e => { const n = +e.target.dataset?.s; if (n) { sc = n; draw(); } };
    $('#rv-go').onclick = async () => { try { await rpc('tour_submit_review', { p_id: b.id, p_pin: pinUse, p_score: sc, p_comment: $('#rv-c').value }); $('#rvbox').innerHTML = `<p class="green">${T('ขอบคุณสำหรับรีวิว')}</p>`; } catch (e) { toast(e.message, 'err'); } };
  }
}

function pageMyBookings(app) {
  const mine = CACHE.bookings.filter(b => !PORTAL), u = DB.currentUser();
  app.innerHTML = `<div class="container" style="padding-top:20px;max-width:820px"><h1>${T('การจองของฉัน')}</h1>
    <form id="fb" class="panel row" style="gap:8px;flex-wrap:wrap"><input name="id" placeholder="${esc(T('รหัสการจอง'))}" style="flex:1;min-width:140px;padding:10px;border:1px solid var(--border);border-radius:8px;text-transform:uppercase"><input name="pin" placeholder="PIN" maxlength="4" inputmode="numeric" style="width:90px;padding:10px;border:1px solid var(--border);border-radius:8px"><button class="btn btn-primary">${T('ตรวจสอบการจอง')}</button></form>
    ${!u ? `<p class="small muted">${T('เข้าสู่ระบบ')} → ${T('การจองของฉัน')}</p>` : ''}
    ${mine.length ? mine.map(b => `<a class="panel row between bk-row" href="#/booking/${esc(b.id)}${b._pin ? '?pin=' + b._pin : ''}"><div><b>${esc(b.tripName || '')}</b><div class="small muted">${fmtDate(b.date)}${b.time ? ' · ' + esc(b.time) : ''} · ${b.qty} ${T('คน')} · ${esc(b.id)}</div></div><div style="text-align:right">${stPill(b.status)}<div><b>${money(b.total)}</b></div></div></a>`).join('') : `<div class="empty"><i class="fa-solid fa-suitcase"></i><h3>${T('ยังไม่มีการจอง')}</h3><a href="#/search" class="btn btn-primary">${T('ทริปและกิจกรรม')}</a></div>`}</div>`;
  $('#fb').onsubmit = e => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); if (f.id.trim()) go(`/booking/${f.id.trim().toUpperCase()}?pin=${f.pin.trim()}`); };
}
function pageFavorites(app) {
  const l = favs().map(id => DB.trip(id)).filter(t => t && t.active !== false);
  app.innerHTML = `<div class="container" style="padding-top:20px"><h1>${T('รายการโปรด')}</h1>${l.length ? `<div class="card-grid">${l.map(tripCard).join('')}</div>` : `<div class="empty"><i class="fa-regular fa-heart"></i><h3>${T('ยังไม่มีการจอง')}</h3></div>`}</div>`;
  bindCards(app);
}
function pageProfile(app) {
  const u = DB.currentUser(); if (!u) { app.innerHTML = ''; return authModal('login', render); }
  app.innerHTML = `<div class="container" style="padding-top:20px;max-width:560px"><h1>${T('ข้อมูลส่วนตัว')}</h1><form id="pf" class="panel form-grid" style="grid-template-columns:1fr"><div class="fg"><label>${T('ชื่อ-นามสกุล')}</label><input name="name" value="${esc(u.name)}" maxlength="80"></div><div class="fg"><label>${T('เบอร์โทรศัพท์')}</label><input name="phone" value="${esc(u.phone || '')}" maxlength="20"></div><div class="fg"><label>Email</label><input value="${esc(u.email)}" disabled></div><button class="btn btn-primary">${T('บันทึก')}</button></form></div>`;
  $('#pf').onsubmit = async e => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); await DB.saveMyProfile({ name: f.name.trim(), phone: f.phone.trim() }); toast('✓'); render(); };
}
function pageHelp(app) {
  const s = DB.settings();
  app.innerHTML = `<div class="container" style="padding-top:20px;max-width:760px"><h1>${T('ศูนย์ช่วยเหลือ')}</h1>
    ${[['จองอย่างไร?', 'เลือกทริป → เลือกจำนวนและวันที่ → กด "จองเลย" → กรอกข้อมูล → โอนผ่านพร้อมเพย์แล้วส่งสลิป (หรือเลือกจ่ายหน้างาน) ผู้ให้บริการจะตรวจและยืนยันการจองให้'], ['ชำระเงินกับใคร?', 'ชำระตรงกับผู้ให้บริการแต่ละราย kohlarngo เป็นแพลตฟอร์มเชื่อมต่อ ไม่เก็บเงินแทน'], ['ยกเลิกได้ไหม?', 'ยกเลิกเองได้ที่หน้าการจอง หากยังไม่ยืนยัน หรือยืนยันแล้วแต่ยังไม่ถึงวันเดินทาง ตามเงื่อนไขของแต่ละทริป'], ['ลืมรหัสการจอง?', 'ล็อกอินด้วยบัญชีที่ใช้จอง หรือติดต่อผู้ให้บริการ/ทีมงานพร้อมเบอร์โทรที่ใช้จอง'], ['ฉุกเฉิน', 'กดปุ่ม SOS ด้านบนเพื่อโทรหาหน่วยงานและส่งพิกัดของคุณ']].map(([q, a]) => `<details class="panel"><summary><b>${q}</b></summary><p>${a}</p></details>`).join('')}
    <div class="panel">${s.phone ? `<div><a href="${telUrl(s.phone)}"><i class="fa-solid fa-phone"></i> ${esc(s.phone)}</a></div>` : ''}${s.line ? `<div><a href="${esc(socialUrl('line', s.line))}" target="_blank" rel="noopener"><i class="fa-brands fa-line"></i> LINE ${esc(s.line)}</a></div>` : ''}</div></div>`;
}
function pageTerms(app, params) {
  const priv = params.get('t') === 'privacy';
  app.innerHTML = `<div class="container" style="padding-top:20px;max-width:760px"><h1>${priv ? T('นโยบายความเป็นส่วนตัว') : T('เงื่อนไขการใช้งาน')}</h1><div class="panel">${priv ?
    '<p>เราเก็บข้อมูลที่จำเป็นต่อการจอง (ชื่อ เบอร์โทร อีเมล สลิปการโอน) เพื่อส่งต่อให้ผู้ให้บริการที่คุณเลือกเท่านั้น ไม่ขายข้อมูลให้บุคคลที่สาม สลิปและข้อมูลติดต่อจะถูกลบเมื่อพ้นระยะเวลาที่กฎหมายกำหนด คุณขอดู แก้ไข หรือลบข้อมูลได้โดยติดต่อทีมงาน</p>' :
    '<p>kohlarngo เป็นแพลตฟอร์มเชื่อมต่อลูกค้ากับผู้ให้บริการบนเกาะล้าน การให้บริการและการชำระเงินเป็นสัญญาระหว่างลูกค้ากับผู้ให้บริการโดยตรง ราคาและเงื่อนไขการยกเลิกเป็นไปตามที่ผู้ให้บริการแต่ละรายกำหนดในหน้าทริป ผู้ใช้ต้องมีอายุ 18 ปีขึ้นไป และให้ข้อมูลที่ถูกต้อง ทริปทางทะเลอาจถูกเลื่อนหรือยกเลิกตามสภาพอากาศเพื่อความปลอดภัย</p>'}</div></div>`;
}
function notFound(app) { app.innerHTML = `<div class="container"><div class="empty" style="margin-top:30px"><h3>${T('ไม่พบหน้านี้')}</h3><a href="#/" class="btn btn-primary">${T('กลับหน้าแรก')}</a></div></div>`; }

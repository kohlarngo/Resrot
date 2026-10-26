// การ์ดโปรโมชั่นหน้าแรกดึงข้อมูลจากโค้ดส่วนลดจริง (ยอดขั้นต่ำ / จำนวนครั้ง) — ถ้าอ่านโค้ดไม่ได้ใช้ข้อความตั้งต้น
function promoOff(code, fallback, prefix = 'ลด ') { const c = pubCoupon(code); return c ? `${prefix}${couponOffText(c)}` : fallback; }
function promoLine(code, fallbackCond, tail = '') {
  const c = pubCoupon(code);
  if (!c) return CACHE.pubCoupons ? `<span class="muted">โค้ด <code>${code}</code> ปิดใช้งานแล้ว</span>` : `ใช้โค้ด <code>${code}</code> ${fallbackCond}${tail}`;
  const full = c.maxUses && c.left != null && c.left <= 0;
  return `ใช้โค้ด <code>${esc(c.code)}</code> ${full ? '— ครบจำนวนแล้ว' : couponCondText(c)}${full ? '' : tail}`;
}

// ================= Ads (โฆษณา) =================
// 3 ตำแหน่ง: banner (หน้าแรก) · featured (รีสอร์ทแนะนำ ขึ้นอันดับบนสุด) · card (แทรกในผลค้นหาและหน้ารายละเอียด)
// ลิงก์รับเฉพาะ http(s) / เบอร์โทร / LINE — กันลิงก์อันตราย
function adHref(a) {
  if (/^https?:\/\//i.test(a.link || '')) return a.link;
  if (a.hotelId) return `#/hotel/${a.hotelId}`;
  const tel = String(a.phone || '').replace(/[^\d+]/g, '');
  if (tel.length >= 8) return `tel:${tel}`;
  return a.line ? socialUrl('line', a.line) : '';
}
function adAttrs(a) { const h = adHref(a); return `${h ? `href="${esc(h)}"` : ''} data-ad="${esc(a.id)}" ${/^https?:/i.test(h) ? 'target="_blank" rel="noopener sponsored"' : ''}`; }
// การปรับรูปโฆษณา: fit = { mode: 'cover' | 'contain', zoom: 1–3, x: 0–100, y: 0–100 } (ตั้งในฟอร์มโฆษณา + มีตัวอย่างสด)
function adFit(a) {
  const f = a.fit || {}, n = (v, lo, hi, d) => Math.min(hi, Math.max(lo, Number.isFinite(+v) && v !== '' && v != null ? +v : d));
  return { mode: f.mode === 'contain' ? 'contain' : 'cover', z: n(f.zoom, 1, 3, 1), x: n(f.x, 0, 100, 50), y: n(f.y, 0, 100, 50) };
}
const adImgStyle = a => { const f = adFit(a); return `object-fit:${f.mode};object-position:${f.x}% ${f.y}%;transform:scale(${f.z});transform-origin:${f.x}% ${f.y}%;`; };
function adBannerSlide(a, on, style = '') {
  const f = adFit(a);
  return `<a class="ad-slide ${on ? 'on' : ''}" ${adAttrs(a)} style="${style}"><div class="ad-bg" style="background-image:url('${esc(imgUrl(a.image, 1400))}');background-size:${f.mode};background-position:${f.x}% ${f.y}%;transform:scale(${f.z});transform-origin:${f.x}% ${f.y}%"></div>
    <span class="ad-tag">โฆษณา</span>${a.title || a.body ? `<div class="ad-cap"><b>${esc(a.title)}</b>${a.body ? `<span>${esc(a.body)}</span>` : ''}</div>` : ''}</a>`;
}
function adBanner() {
  const list = DB.publicAds('banner'); if (!list.length) return '';
  return `<section class="block ad-banner" style="padding-top:28px">${list.map((a, i) => adBannerSlide(a, !i)).join('')}
    ${list.length > 1 ? `<div class="sl-dots">${list.map((_, i) => `<button class="sl-dot ${i ? '' : 'on'}" data-d="${i}" aria-label="แบนเนอร์ที่ ${i + 1}"></button>`).join('')}</div>` : ''}</section>`;
}
function adCard(a, wide) {
  const call = a.phone ? `<span><i class="fa-solid fa-phone"></i> ${esc(a.phone)}</span>` : '', line = a.line ? `<span><i class="fa-brands fa-line"></i> ${esc(a.line)}</span>` : '';
  return `<a class="ad-card ${wide ? 'wide' : ''}" ${adAttrs(a)}>
    ${a.image ? `<div class="img">${imgTag(a.image, 600, '', a.id).replace('<img ', `<img style="${adImgStyle(a)}" `)}</div>` : ''}
    <div class="body"><span class="ad-tag">โฆษณา</span><h3>${esc(a.title || a.advertiser)}</h3>${a.body ? `<p>${esc(a.body)}</p>` : ''}
      <div class="ad-meta small">${a.advertiser && a.title ? `<b>${esc(a.advertiser)}</b>` : ''}${call}${line}</div></div></a>`;
}
// ป๊อปอัพหน้าแรก — เด้งครั้งเดียวต่อการเปิดเว็บ (ต่อโฆษณา) ปิดได้ด้วยปุ่ม X / คลิกพื้นหลัง / ปุ่ม Esc
function adPopupHtml(a, inline) {
  const body = `${a.image ? `<img src="${esc(imgUrl(a.image, 900))}" alt="${esc(a.title || a.advertiser)}">` : ''}
    ${a.title || a.body ? `<div class="ad-pop-txt">${a.title ? `<h3>${esc(a.title)}</h3>` : ''}${a.body ? `<p>${esc(a.body)}</p>` : ''}</div>` : ''}`;
  const h = adHref(a), inner = h ? `<a ${adAttrs(a)}>${body}</a>` : `<div data-ad="${esc(a.id)}">${body}</div>`;
  return `<div class="ad-pop-box ${inline ? 'inline' : ''}"><button type="button" class="ad-pop-x" aria-label="ปิด"><i class="fa-solid fa-xmark"></i></button>${inner}</div>`;
}
function showAdPopup() {
  if (document.querySelector('.ad-pop')) return;
  let seen = []; try { seen = JSON.parse(sessionStorage.getItem('sd_ad_pop') || '[]'); } catch {}
  const a = DB.publicAds('popup').find(x => !seen.includes(x.id)); if (!a) return;
  try { sessionStorage.setItem('sd_ad_pop', JSON.stringify([...seen, a.id])); } catch {}
  const pos = ['left', 'right'].includes(a.fit?.pos) ? a.fit.pos : 'center'; // center = กลางจอ (ฉากหลังมืด) · left/right = ลอยมุมล่าง ไม่บังหน้าเว็บ
  const el = document.createElement('div'); el.className = 'ad-pop' + (pos === 'center' ? '' : ` ad-pop-side ad-pop-${pos}`); el.setAttribute('role', pos === 'center' ? 'dialog' : 'complementary'); if (pos === 'center') el.setAttribute('aria-modal', 'true');
  el.innerHTML = adPopupHtml(a);
  const close = () => { el.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  el.onclick = e => { if (e.target === el || e.target.closest('.ad-pop-x')) close(); };
  document.addEventListener('keydown', onKey);
  document.body.appendChild(el); initAds(el);
  $('.ad-pop-x', el).focus();
}
// แบนเนอร์ลอยข้างจอ (ซ้าย/ขวา) มีปุ่มปิดด้านล่าง — จอใหญ่ลอยกลางขอบจอ · จอเล็ก/มือถือเป็นการ์ดเล็กมุมล่าง · ปิดแล้วไม่แสดงอีกจนกว่าจะเปิดเว็บใหม่
function adSideHtml(a, side, inline = false, size = '') {
  // ค่าตั้งต้นของแบนเนอร์ข้างจอ = แสดงทั้งรูป (contain) กรอบสูงตามสัดส่วนรูป ไม่ตัดส่วนล่าง (เช่นปุ่ม/ข้อความท้ายรูป) · เลือก "เต็มกรอบ" ในฟอร์มโฆษณาได้
  const fa = (a.fit && a.fit.mode) ? a : { ...a, fit: { ...(a.fit || {}), mode: 'contain' } };
  const contain = adFit(fa).mode === 'contain';
  const img = imgTag(a.image, 480, '', a.id).replace('<img ', `<img style="${adImgStyle(fa)}" `);
  return `<div class="ad-side ad-side-${side} ${inline ? 'inline' : ''} ${size}" role="complementary" aria-label="โฆษณา">
    <a class="ad-side-img ${contain ? 'fit-contain' : ''}" ${adAttrs(a)}>${img}<span class="ad-tag">โฆษณา</span></a>
    <button type="button" class="ad-side-x" aria-label="ปิดโฆษณา">ปิด <i class="fa-solid fa-xmark"></i></button></div>`;
}
// แถบโฆษณาติดขอบล่างจอ (Bottom Sticky / Footer Banner) — เกาะขอบล่างตลอดเมื่อเลื่อนหน้า มีปุ่มปิดสีแดงที่มุมบนขวาของแถบ
function adBottomHtml(a, inline = false, size = '') {
  const img = imgTag(a.image, 1200, '', a.id).replace('<img ', `<img style="${adImgStyle(a)}" `);
  return `<div class="ad-bottom ${inline ? 'inline' : ''} ${size}" role="complementary" aria-label="โฆษณา"><div class="ad-bottom-in">
    <a class="ad-bottom-img" ${adAttrs(a)}>${img}<span class="ad-tag">โฆษณา</span></a>
    <button type="button" class="ad-bottom-x" aria-label="ปิดโฆษณา"><i class="fa-solid fa-xmark"></i></button></div></div>`;
}
function showSideAds() { // แบนเนอร์ลอยข้างจอ (ซ้าย/ขวา) + แถบติดขอบล่าง
  $$('.ad-side:not(.inline), .ad-bottom:not(.inline)').forEach(e => e.remove());
  document.body.classList.remove('has-bottom-ad');
  if (PORTAL || document.body.classList.contains('vip-site')) return; // เว็บจองส่วนตัว VIP ไม่มีโฆษณา
  let closed = []; try { closed = JSON.parse(sessionStorage.getItem('sd_ad_side') || '[]'); } catch {}
  const pick = kind => DB.publicAds(kind).find(x => x.image && !closed.includes(x.id));
  const side = (kind, cls) => { const a = pick(kind); return a ? adSideHtml(a, cls) : ''; };
  const bottom = pick('bottom_bar');
  const html = side('side_left', 'L') + side('side_right', 'R') + (bottom ? adBottomHtml(bottom) : ''); if (!html) return;
  document.body.insertAdjacentHTML('beforeend', html);
  if (bottom) document.body.classList.add('has-bottom-ad');
  $$('.ad-side:not(.inline), .ad-bottom:not(.inline)').forEach(el => {
    initAds(el);
    $('.ad-side-x, .ad-bottom-x', el).onclick = () => {
      const id = $('[data-ad]', el)?.dataset.ad; if (id) { closed.push(id); try { sessionStorage.setItem('sd_ad_side', JSON.stringify(closed)); } catch {} }
      el.remove(); if (!$('.ad-bottom:not(.inline)')) document.body.classList.remove('has-bottom-ad');
    };
  });
}
// รีสอร์ทแนะนำ (จ่ายค่าโฆษณา) — แสดงป้ายกำกับให้ชัดเจนว่าเป็นโฆษณา
const isFeatured = id => DB.featuredIds().includes(id);
const featuredBadge = id => isFeatured(id) ? '<span class="ad-badge">แนะนำ · โฆษณา</span>' : '';
// รีสอร์ท VIP — นักพัฒนาเปิดรายแห่ง (h.vip = {on, tag}) · ป้ายสีทองบนการ์ด/หน้ารีสอร์ท และขึ้นอันดับบนในผลค้นหา
const isVip = h => { const v = h?.vip; if (v?.on !== true) return false; const t = todayISO(); return !(v.from && t < v.from) && !(v.to && t > v.to); }; // เปิด + อยู่ในช่วงวันที่ที่นักพัฒนากำหนด (ว่าง = ไม่จำกัด)
const vipTag = h => ['VIP', 'แนะนำ', 'ยอดนิยม'].includes(h?.vip?.tag) ? h.vip.tag : 'VIP';
// รูป VIP (h.vip.images — รูปแรกเป็นปก) ขึ้นก่อนรูปปกติของรีสอร์ท · คืนสำเนา ไม่แก้ข้อมูลเดิม
const withVip = h => { const v = isVip(h) && (h.vip.images || []).filter(Boolean); return v?.length ? { ...h, images: [...v, ...(h.images || []).filter(x => !v.includes(x))] } : h; };
const vipBadge = h => isVip(h) ? `<span class="vip-badge"><i class="fa-solid fa-crown"></i> ${vipTag(h)}</span>` : '';
function adHomeVip() {
  const hs = DB.hotels().filter(h => isVip(h) && h.active !== false);
  return hs.length ? `<section class="block"><h2 class="sec-title"><i class="fa-solid fa-crown" style="color:#d4a017"></i> รีสอร์ท VIP</h2><div class="card-grid">${hs.slice(0, 4).map(h => hotelCard(h)).join('')}</div></section>` : '';
}
function adHomeFeatured() {
  const hs = DB.featuredIds().map(id => DB.hotel(id)).filter((h, i, a) => h && h.active !== false && a.indexOf(h) === i);
  return hs.length ? `<section class="block"><h2 class="sec-title"><i class="fa-solid fa-award" style="color:var(--accent)"></i> รีสอร์ทแนะนำ</h2><div class="card-grid">${hs.slice(0, 4).map(h => hotelCard(h)).join('')}</div></section>` : '';
}
function adHomeCards() {
  const cards = DB.publicAds('card');
  return cards.length ? `<section class="block ad-home-cards">${cards.slice(0, 2).map(a => adCard(a, true)).join('')}</section>` : '';
}
// ผูกการนับ + สไลด์แบนเนอร์ — นับการแสดงผลเมื่อโฆษณาถูกวาดบนหน้า และนับคลิกเมื่อกด
function initAds(root) {
  $$('[data-ad]', root).forEach(el => { DB.trackAd(el.dataset.ad, 'view'); if (!el.dataset.adBound) { el.dataset.adBound = 1; el.addEventListener('click', () => DB.trackAd(el.dataset.ad, 'click')); } });
  const ban = $('.ad-banner', root); if (!ban) return;
  const slides = $$('.ad-slide', ban), dots = $$('.sl-dot', ban); if (slides.length < 2) return;
  let i = 0; const show = n => { slides[i].classList.remove('on'); dots[i]?.classList.remove('on'); i = n; slides[i].classList.add('on'); dots[i]?.classList.add('on'); };
  dots.forEach((d, n) => d.onclick = () => show(n));
  const t = setInterval(() => { if (!document.body.contains(ban)) return clearInterval(t); if (!document.hidden) show((i + 1) % slides.length); }, 5000);
}

// ================= Shared cards =================
function favBtn(id) { const on = DB.favs().includes(id); return `<button class="fav-btn ${on ? 'on' : ''}" data-fav="${id}" title="บันทึกในรายการโปรด"><i class="fa-${on ? 'solid' : 'regular'} fa-heart"></i></button>`; }
function bindFavs(root) {
  $$('[data-fav]', root).forEach(b => b.onclick = e => {
    e.stopPropagation();
    const on = DB.toggleFav(b.dataset.fav);
    b.classList.toggle('on', on);
    b.innerHTML = `<i class="fa-${on ? 'solid' : 'regular'} fa-heart"></i>`;
    toast(on ? 'บันทึกในรายการโปรดแล้ว' : 'ลบออกจากรายการโปรดแล้ว');
  });
}
// รูปปกบนการ์ด: ถ้า dev เปิดสไลด์ของรีสอร์ท และมีรูป ≥ 2 → สไลด์ (สูงสุด 5 รูป) ไม่งั้นแสดงรูปแรกรูปเดียว
function cardImgHtml(h) {
  const list = (h.images || []).filter(Boolean).slice(0, 5);
  if (h.slideshow?.on !== true || list.length < 2) return imgTag(h.images[0], 600, '', h.id);
  return `<div class="card-slider" data-rsl="${h.slideshow.seconds || 4}">${list.map((u, i) => imgTag(u, 600, 'sl-slide' + (i ? '' : ' on'), h.id)).join('')}
    <button type="button" class="sl-nav prev" aria-label="รูปก่อนหน้า"><i class="fa-solid fa-chevron-left"></i></button><button type="button" class="sl-nav next" aria-label="รูปถัดไป"><i class="fa-solid fa-chevron-right"></i></button>
    <div class="sl-dots">${list.map((_, i) => `<button type="button" class="sl-dot ${i ? '' : 'on'}" data-d="${i}" aria-label="รูปที่ ${i + 1}"></button>`).join('')}</div></div>`;
}
const soldBadge = '<span class="sold-badge">เต็ม</span>'; // ไม่มีห้องว่างในวันที่เลือก → รูปเป็นสีเทา + ป้าย "เต็ม"
function hotelCard(h0) {
  const h = withVip(h0);
  const best = DB.cheapest(h, S);
  const r = best?.room || h.rooms[0];
  const q = best || DB.quote(r, S.checkIn, S.checkOut);
  const off = q.perNightOrig ? Math.round((1 - q.perNight / q.perNightOrig) * 100) : 0;
  return `<div class="h-card${best ? '' : ' sold'}" data-href="/hotel/${h.id}?${searchQuery()}">
    <div class="img">${cardImgHtml(h)}${demoWm(h)}${best ? '' : soldBadge}${off > 0 ? `<span class="badge-off">-${off}%</span>` : ''}${isVip(h) ? vipBadge(h) : featuredBadge(h.id)}${favBtn(h.id)}</div>
    <div class="body">
      <div class="name">${esc(h.name)}</div>
      ${starsHtml(h.stars)}
      <div class="loc"><i class="fa-solid fa-location-dot"></i> ${esc(h.area)}, ${esc(h.city)}</div>
      <div class="row between" style="align-items:flex-end;margin-top:auto">
        ${scoreHtml(h.rating, h.reviews)}
        <div class="price-box">${off > 0 ? `<div class="old-price">${money(q.perNightOrig)}</div>` : ''}<div class="price">${best ? money(q.perNight) : '<span class="small">เต็ม</span>'}</div><div class="per">ต่อคืน</div></div>
      </div>
    </div></div>`;
}
function bindCards(root) {
  $$('[data-href]', root).forEach(c => c.onclick = e => { if (!e.target.closest('button,a')) go(c.dataset.href); });
  bindFavs(root);
  $$('.card-slider', root).forEach(el => initSlider(el, el.dataset.rsl));
}

// ================= Home =================
// รูปพื้นหลังที่สไลด์ได้ (แบนเนอร์ + โปรโมชั่น): เรียงรูปซ้อนกันแล้วค่อยๆ สลับ — ตั้งรูป/เวลาได้ในโหมดแก้ไข
const bgSlides = (key, def, w) => `<div class="bgs" data-slide-sec="${siteImgSec(key)}">${siteImgList(key, def).map((u, i) => `<i class="${i ? '' : 'on'}" style="background-image:url('${esc(imgUrl(u, w))}')"></i>`).join('')}</div>`;
function initBgSlides(root) {
  $$('.bgs[data-slide-sec]', root).forEach(box => {
    const layers = $$('i', box); if (layers.length < 2 || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let i = 0; const t = setInterval(() => { if (!document.body.contains(box)) return clearInterval(t); if (document.hidden) return; layers[i].classList.remove('on'); i = (i + 1) % layers.length; layers[i].classList.add('on'); }, Math.max(2, +box.dataset.slideSec || 5) * 1000);
  });
}
function pageHome(app) {
  const hotels = DB.hotels();
  const recent = DB.recent().map(id => DB.hotel(id)).filter(Boolean);
  const deals = [...hotels].sort((a, b) => Math.max(...b.rooms.map(r => r.discount)) - Math.max(...a.rooms.map(r => r.discount))).slice(0, 8);
  app.innerHTML = `
  <div class="hero" data-img-slot="hero">${bgSlides('hero', IMG.pool2, 1800)}<div class="hero-shade"></div><div class="container">
    <h1 data-edit="home.hero.title">ค้นหาที่พักราคาดีที่สุด</h1>
    <p class="sub" data-edit="home.hero.sub" data-edit-n="${hotels.length}">ที่พัก รีสอร์ท และพูลวิลล่ากว่า ${hotels.length} แห่งทั่วเกาะล้าน พร้อมราคาพิเศษเฉพาะสมาชิก</p>
    ${searchBoxHtml('hero')}
  </div></div>
  <div class="container">
    ${adBanner()}
    <section class="block" style="padding-top:${DB.publicAds('banner').length ? 28 : 56}px">
      <h2 class="sec-title" data-edit="home.promo.title">โปรโมชั่นที่คุณไม่ควรพลาด</h2>
      <div class="promo-row">
        <div class="promo" data-img-slot="promo1" data-q="หาดแสม">${bgSlides('promo1', IMG.beach1, 700)}<span class="tag" data-edit="home.promo1.tag">ลดสูงสุด 35%</span><h3 data-edit="home.promo1.title">ทะเลใสเกาะล้านเรียกหา</h3><p data-edit="home.promo1.text">รีสอร์ทริมหาดแสม ราคาพิเศษ</p></div>
        <div class="promo" data-img-slot="promo2" data-copy="WELCOME10">${bgSlides('promo2', IMG.pool2, 700)}<span class="tag" data-edit="home.promo2.tag">สมาชิกใหม่</span><h3 data-edit="home.promo2.title">${promoOff('WELCOME10', 'ลดเพิ่ม 10%')}</h3><p>${promoLine('WELCOME10', '', ' (คลิกเพื่อคัดลอก)')}</p></div>
        <div class="promo" data-img-slot="promo3" data-copy="SUMMER500">${bgSlides('promo3', IMG.villa1, 700)}<span class="tag" data-edit="home.promo3.tag">ดีลพูลวิลล่า</span><h3 data-edit="home.promo3.title">${promoOff('SUMMER500', 'ลดทันที ฿500', 'ลดทันที ')}</h3><p>${promoLine('SUMMER500', 'เมื่อจองครบ ฿3,000')}</p></div>
      </div>
    </section>
    ${adHomeVip()}
    ${adHomeFeatured()}
    ${adHomeCards()}
    ${recent.length ? `<section class="block"><h2 class="sec-title">ที่พักที่คุณดูล่าสุด</h2><div class="card-grid">${recent.slice(0, 4).map(hotelCard).join('')}</div></section>` : ''}
    <section class="block">
      <h2 class="sec-title" data-edit="home.dest.title">จุดหมายปลายทางยอดนิยมในเกาะล้าน</h2>
      <div class="dest-grid">${DESTINATIONS.slice(0, 6).map(d => `<div class="dest" data-q="${d.name}"><div class="img" data-img-slot="dest${DESTINATIONS.indexOf(d)}">${imgTag(siteImgId('dest' + DESTINATIONS.indexOf(d), d.img), 400, '', d.en)}</div><div class="n">${d.name}</div><div class="c">${hotels.filter(h => h.city === d.name).length} ที่พัก</div></div>`).join('')}</div>
    </section>
    <section class="block">
      <div class="sec-title-row"><h2 class="sec-title"><span data-edit="home.deals.title">ดีลสุดคุ้มวันนี้</span> <i class="fa-solid fa-fire red"></i></h2><a href="#/deals">ดูทั้งหมด <i class="fa-solid fa-chevron-right small"></i></a></div>
      <div class="card-grid">${deals.map(hotelCard).join('')}</div>
    </section>
    <section class="block">
      <h2 class="sec-title" data-edit="home.beach.title">ที่พักแนะนำตามชายหาด</h2>
      <div class="chips" id="city-chips">${DESTINATIONS.map((d, i) => `<span class="chip ${i === 0 ? 'active' : ''}" data-city="${d.name}">${d.name}</span>`).join('')}</div>
      <div class="card-grid" id="city-grid"></div>
    </section>
    <section class="block">
      <h2 class="sec-title" data-edit="home.why.title">ทำไมต้องจองกับ kohlarngo</h2>
      <div class="why-grid">
        <div class="why"><i class="fa-solid fa-tags"></i><h4 data-edit="home.why1.title">จองตรงกับที่พักเกาะล้าน</h4><p data-edit="home.why1.text">ราคาตรงจากเจ้าของที่พัก ไม่ผ่านคนกลาง</p></div>
        <div class="why"><i class="fa-solid fa-calendar-xmark"></i><h4 data-edit="home.why2.title">ยกเลิกฟรี</h4><p data-edit="home.why2.text">เลือกห้องแบบยกเลิกฟรีได้ ดูเงื่อนไขของแต่ละห้องก่อนจอง</p></div>
        <div class="why"><i class="fa-solid fa-shield-halved"></i><h4 data-edit="home.why3.title">ชำระเงินปลอดภัย</h4><p data-edit="home.why3.text">สแกนจ่ายพร้อมเพย์ได้ทุกธนาคาร หรือชำระที่ที่พัก</p></div>
        <div class="why"><i class="fa-solid fa-headset"></i><h4 data-edit="home.why4.title">บริการ 24 ชม.</h4><p data-edit="home.why4.text">ทีมงานพร้อมช่วยเหลือคุณตลอดเวลา</p></div>
      </div>
    </section>
  </div>`;
  bindSearchBox(app);
  initBgSlides(app);
  initAds(app); setTimeout(showAdPopup, 600);
  const showCity = c => { $('#city-grid').innerHTML = hotels.filter(h => h.city === c).slice(0, 4).map(hotelCard).join('') || '<p class="muted">ยังไม่มีที่พักในบริเวณนี้</p>'; bindCards($('#city-grid')); };
  $$('#city-chips .chip').forEach(c => c.onclick = () => { $$('#city-chips .chip').forEach(x => x.classList.toggle('active', x === c)); showCity(c.dataset.city); });
  showCity(DESTINATIONS[0].name);
  $$('[data-q]', app).forEach(el => el.onclick = () => { S.q = el.dataset.q; saveSearch(); go(`/search?${searchQuery()}`); });
  $$('[data-copy]', app).forEach(el => el.onclick = () => { navigator.clipboard?.writeText(el.dataset.copy).catch(() => {}); toast(`คัดลอกโค้ด ${el.dataset.copy} แล้ว`); });
  bindCards(app);
}

// ================= Search results =================
let F = null, sortBy = 'best', viewMode = 'list', page = 1;
const PAGE_SIZE = 10;
function resetFilters() { F = { min: 0, max: 0, stars: [], score: 0, types: [], amen: [], areas: [], freeCancel: false, payAtHotel: false, breakfast: false }; }
resetFilters();

function matchQuery(h, q) {
  if (!q) return true;
  const t = q.toLowerCase().trim();
  const d = DESTINATIONS.find(x => x.name === q || x.en.toLowerCase() === t);
  if (d) return h.city === d.name;
  if ([h.name, h.city, h.area, h.type].some(v => v.toLowerCase().includes(t))) return true; // พิมพ์ชื่อ/ย่านตรงๆ
  // ค้นแบบธรรมชาติ: สิ่งอำนวยความสะดวก (ทุกข้อที่พิมพ์ต้องมี) + ชายหาด + คำที่เหลือต้องอยู่ในชื่อ/ย่าน/จุดเด่น/ชื่อห้อง
  const p = parseSearch(q);
  if (p.groups.length && !p.groups.every(gi => AMEN_WORDS[gi][0].some(k => h.amenities.includes(k)))) return false;
  if (p.dest && h.city !== p.dest.name) return false;
  if (!p.groups.length && !p.dest && p.tokens.length < 2) return false; // คำเดียวที่ไม่รู้จัก = ต้องตรงตามเดิม (ด้านบน)
  const hay = [h.name, h.city, h.area, h.type, ...(h.highlights || []), ...h.rooms.map(r => r.name)].join(' ').toLowerCase();
  return p.tokens.every(w => hay.includes(w));
}

function pageSearch(app, params) {
  readSearchFromParams(params);
  if (params.get('type')) { resetFilters(); F.types = [params.get('type')]; }
  if (params.get('sort')) sortBy = params.get('sort');
  page = 1;
  app.innerHTML = `${searchBoxHtml('mini')}
    <div class="container">
      <div class="breadcrumb"><a href="#/"><span data-edit="search.crumb.home">หน้าแรก</span></a> › ${S.q ? esc(S.q) : '<span data-edit="search.crumb.all">ที่พักทั้งหมด</span>'}</div>
      <div class="results-layout" style="padding-top:0">
        <aside class="filters" id="filters"></aside>
        <div>
          <div class="res-head"><div><h2 id="res-title"></h2><div id="res-hint" class="small muted" style="margin-top:2px"></div></div>
            <div class="row"><button class="btn btn-outline btn-sm" id="f-toggle" style="display:none"><i class="fa-solid fa-sliders"></i> <span data-edit="search.filter.toggle">ตัวกรอง</span></button>
            <button class="btn btn-outline btn-sm" id="view-t"></button></div></div>
          <div class="sort-bar" id="sort-bar">
            ${[['best', 'แนะนำ'], ['price', 'ราคาต่ำสุด'], ['rating', 'คะแนนรีวิว'], ['distance', 'ใกล้ท่าเรือ'], ['stars', 'ระดับดาว'], ['deals', 'ดีลร้อนแรง']].map(([k, l]) => `<button data-sort="${k}" class="${sortBy === k ? 'active' : ''}"><span data-edit="search.sort.${k}">${l}</span></button>`).join('')}
          </div>
          <div id="results"></div>
        </div>
      </div>
    </div>`;
  bindSearchBox(app, () => { history.replaceState(null, '', `#/search?${searchQuery()}`); resetFilters(); page = 1; renderFilters(); renderResults(); });
  if (innerWidth <= 820) $('#f-toggle').style.display = '';
  $('#f-toggle').onclick = () => $('#filters').classList.toggle('open');
  $('#view-t').onclick = () => { viewMode = viewMode === 'list' ? 'map' : 'list'; renderResults(); };
  $$('#sort-bar button').forEach(b => b.onclick = () => { sortBy = b.dataset.sort; $$('#sort-bar button').forEach(x => x.classList.toggle('active', x === b)); page = 1; renderResults(); });
  renderFilters();
  renderResults();
}

function baseResults() {
  return DB.hotels().filter(h => matchQuery(h, S.q)).map(h => ({ h, best: DB.cheapest(h, S) }));
}
function applyFilters(list) {
  return list.filter(({ h, best }) => {
    if (!best) return F.min === 0 && F.max === 0 && !F.freeCancel && !F.payAtHotel && !F.breakfast ? true : false;
    if (F.min && best.perNight < F.min) return false;
    if (F.max && best.perNight > F.max) return false;
    if (F.stars.length && !F.stars.includes(h.stars)) return false;
    if (F.score && h.rating < F.score) return false;
    if (F.types.length && !F.types.includes(h.type)) return false;
    if (F.areas.length && !F.areas.includes(h.area)) return false;
    if (F.amen.length && !F.amen.every(a => h.amenities.includes(a))) return false;
    if (F.freeCancel && !h.rooms.some(r => r.freeCancel)) return false;
    if (F.payAtHotel && !h.rooms.some(r => r.payAtHotel)) return false;
    if (F.breakfast && !h.rooms.some(r => r.breakfast) && !h.amenities.includes('breakfast')) return false;
    return true;
  });
}
function renderFilters() {
  const base = baseResults();
  const prices = base.filter(x => x.best).map(x => x.best.perNight);
  const maxP = prices.length ? Math.ceil(Math.max(...prices) / 500) * 500 : 10000;
  const count = fn => base.filter(({ h }) => fn(h)).length;
  const ck = (group, val, label, n) => `<label class="ck"><input type="checkbox" data-g="${group}" value="${val}" ${F[group].includes(isNaN(val) ? val : +val) ? 'checked' : ''}> ${label}<span class="cnt">${n}</span></label>`;
  const types = [...new Set(base.map(x => x.h.type))];
  const areas = [...new Set(base.map(x => x.h.area))];
  $('#filters').innerHTML = `
    <div class="map-preview" data-img-slot="mapbg" style="background-image:url(${siteImgUrl('mapbg', 'photo-1524661135-423995f22d0b', 600)})"><button class="btn btn-primary btn-sm" id="map-open"><i class="fa-solid fa-map-location-dot"></i> ดูบนแผนที่</button></div>
    <div class="f-sec"><div class="row between"><h4 style="margin:0" data-edit="search.filter.title">ตัวกรอง</h4><a href="javascript:" id="f-clear" class="small"><span data-edit="search.filter.clear">ล้างทั้งหมด</span></a></div></div>
    <div class="f-sec"><h4 data-edit="search.filter.budget">งบประมาณต่อคืน</h4>
      <input type="range" id="f-max" min="0" max="${maxP}" step="100" value="${F.max || maxP}">
      <div class="range-row"><input type="number" id="f-min-n" placeholder="ต่ำสุด" value="${F.min || ''}"> – <input type="number" id="f-max-n" placeholder="สูงสุด" value="${F.max || ''}"></div></div>
    <div class="f-sec"><h4 data-edit="search.filter.popular">ตัวเลือกยอดนิยม</h4>
      <label class="ck"><input type="checkbox" data-b="freeCancel" ${F.freeCancel ? 'checked' : ''}> ยกเลิกฟรี<span class="cnt">${count(h => h.rooms.some(r => r.freeCancel))}</span></label>
      <label class="ck"><input type="checkbox" data-b="payAtHotel" ${F.payAtHotel ? 'checked' : ''}> ชำระเงินที่ที่พัก<span class="cnt">${count(h => h.rooms.some(r => r.payAtHotel))}</span></label>
      <label class="ck"><input type="checkbox" data-b="breakfast" ${F.breakfast ? 'checked' : ''}> รวมอาหารเช้า<span class="cnt">${count(h => h.rooms.some(r => r.breakfast))}</span></label></div>
    <div class="f-sec"><h4 data-edit="search.filter.stars">ระดับดาว</h4>${[5, 4, 3, 2].map(s => ck('stars', s, starsHtml(s), count(h => h.stars === s))).join('')}</div>
    <div class="f-sec"><h4 data-edit="search.filter.score">คะแนนรีวิว</h4>${[[9, 'ยอดเยี่ยม 9+'], [8.5, 'ดีเยี่ยม 8.5+'], [8, 'ดีมาก 8+'], [7, 'ดี 7+'], [0, 'ทั้งหมด']].map(([v, l]) => `<label class="ck"><input type="radio" name="score" value="${v}" ${F.score === v ? 'checked' : ''}> ${l}<span class="cnt">${count(h => h.rating >= v)}</span></label>`).join('')}</div>
    <div class="f-sec"><h4 data-edit="search.filter.type">ประเภทที่พัก</h4>${types.map(t => ck('types', t, t, count(h => h.type === t))).join('')}</div>
    <div class="f-sec"><h4 data-edit="search.filter.amen">สิ่งอำนวยความสะดวก</h4>${['pool', 'beach', 'spa', 'gym', 'parking', 'airport', 'kids', 'pets', 'freebike', 'restaurant'].map(a => ck('amen', a, `<i class="fa-solid ${AMENITIES[a][0]} muted" style="width:16px"></i> ${AMENITIES[a][1]}`, count(h => h.amenities.includes(a)))).join('')}</div>
    ${areas.length > 1 ? `<div class="f-sec"><h4 data-edit="search.filter.area">ย่าน / พื้นที่</h4>${areas.map(a => ck('areas', a, a, count(h => h.area === a))).join('')}</div>` : ''}`;
  const fl = $('#filters');
  const upd = () => { page = 1; renderResults(); };
  $$('[data-g]', fl).forEach(i => i.onchange = () => { const g = i.dataset.g, v = isNaN(i.value) ? i.value : +i.value; F[g] = i.checked ? [...F[g], v] : F[g].filter(x => x !== v); upd(); });
  $$('[data-b]', fl).forEach(i => i.onchange = () => { F[i.dataset.b] = i.checked; upd(); });
  $$('[name=score]', fl).forEach(i => i.onchange = () => { F.score = +i.value; upd(); });
  $('#f-max', fl).oninput = e => { F.max = +e.target.value >= maxP ? 0 : +e.target.value; $('#f-max-n', fl).value = F.max || ''; debounce(upd, 200)(); };
  $('#f-min-n', fl).onchange = e => { F.min = +e.target.value || 0; upd(); };
  $('#f-max-n', fl).onchange = e => { F.max = +e.target.value || 0; upd(); };
  $('#f-clear', fl).onclick = () => { resetFilters(); renderFilters(); upd(); };
  $('#map-open', fl).onclick = () => { viewMode = 'map'; renderResults(); };
  // ตัวกรองถูกวาดใหม่หลังหน้าโหลด — ใส่เนื้อหาที่แก้ไว้ / ปุ่มแก้ไขให้ป้ายข้อความเหล่านี้ด้วย
  if (!PORTAL && typeof applyContent === 'function') { applyContent(); if (ED.on) edDecorate(); }
}
function sortList(list) {
  const p = x => x.best ? x.best.perNight : 1e9;
  const disc = x => x.best ? 1 - x.best.perNight / x.best.perNightOrig : 0;
  const fn = {
    best: (a, b) => (!!b.best - !!a.best) || (b.h.rating * 10 + disc(b) * 30 + Math.log10(b.h.reviews)) - (a.h.rating * 10 + disc(a) * 30 + Math.log10(a.h.reviews)),
    price: (a, b) => p(a) - p(b),
    rating: (a, b) => b.h.rating - a.h.rating,
    distance: (a, b) => a.h.distance - b.h.distance,
    stars: (a, b) => b.h.stars - a.h.stars || p(a) - p(b),
    deals: (a, b) => disc(b) - disc(a),
  }[sortBy];
  // รีสอร์ทแนะนำ (โฆษณา) ที่ไม่ได้กำหนดอันดับ ขึ้นบนสุดเสมอ ไม่ว่าเรียงแบบไหน — กลุ่มที่เหลือเรียงตามที่ลูกค้าเลือก
  // ที่พักที่เต็มในวันที่เลือกอยู่ท้ายรายการเสมอ ไม่ว่าเรียงแบบไหน
  const rank = x => DB.featuredRank(x.h.id), pin = x => isVip(x.h) || (isFeatured(x.h.id) && !rank(x));
  const rest = list.sort((a, b) => (!!b.best - !!a.best) || (pin(b) - pin(a)) || fn(a, b));
  // รีสอร์ทแนะนำที่ dev กำหนดอันดับ (เช่น 1, 5, 9) ถูกแทรกลงตำแหน่งนั้น ส่วนตำแหน่งอื่นเป็นไปตามจริง · ไม่แทรกเลยท้ายรายการที่ยังว่าง
  const fixed = rest.filter(x => x.best && rank(x)).sort((a, b) => rank(a) - rank(b));
  if (!fixed.length) return rest;
  const out = rest.filter(x => !fixed.includes(x));
  fixed.forEach(x => { const sold = out.findIndex(y => !y.best); out.splice(Math.min(rank(x) - 1, sold < 0 ? out.length : sold), 0, x); });
  return out;
}
function resultCard({ h: h0, best }) {
  const h = withVip(h0);
  const r = best?.room;
  const off = best ? Math.round((1 - best.perNight / best.perNightOrig) * 100) : 0;
  const total = best ? best.perNight * nights() * S.rooms : 0;
  return `<div class="r-card${best ? '' : ' sold'}" data-href="/hotel/${h.id}?${searchQuery()}">
    <div class="img">${imgTag(h.images[0], 600, '', h.id)}${demoWm(h)}${best ? '' : soldBadge}${isVip(h) ? vipBadge(h) : featuredBadge(h.id)}${favBtn(h.id)}
      <div class="thumbs">${h.images.slice(1, 5).map(i => imgTag(i, 160)).join('')}</div></div>
    <div class="mid">
      <h3>${esc(h.name)}</h3>
      <div class="row" style="gap:8px">${starsHtml(h.stars)}<span class="tag-s">${esc(h.type)}</span></div>
      <div class="area"><i class="fa-solid fa-location-dot"></i> ${esc(h.area)}, ${esc(h.city)} · <span class="muted">ห่างจากท่าเรือหน้าบ้าน ${h.distance} กม.</span></div>
      <div class="tags">
        ${r?.freeCancel ? '<span class="tag-s green"><i class="fa-solid fa-check"></i> ยกเลิกฟรี</span>' : ''}
        ${r?.payAtHotel ? '<span class="tag-s green"><i class="fa-solid fa-check"></i> ไม่ต้องชำระล่วงหน้า</span>' : ''}
        ${r?.breakfast ? '<span class="tag-s blue"><i class="fa-solid fa-mug-saucer"></i> รวมอาหารเช้า</span>' : ''}
        ${h.amenities.includes('beach') ? '<span class="tag-s"><i class="fa-solid fa-umbrella-beach"></i> ติดชายหาด</span>' : ''}
      </div>
      <div class="amen-icons">${h.amenities.slice(0, 6).map(a => { const i = amenInfo(a); return i ? `<i class="fa-solid ${i[0]}" title="${esc(i[1])}"></i>` : ''; }).join('')}</div>
      ${r ? `<div class="small" style="margin-top:8px"><b>${esc(r.name)}</b> · ${r.bed}</div>` : ''}
    </div>
    <div class="right">
      ${scoreHtml(h.rating, h.reviews)}
      ${best ? `<div>
        ${best.avail <= 3 ? `<div class="urgent"><i class="fa-solid fa-fire"></i> เหลือเพียง ${best.avail} ห้องในราคานี้!</div>` : ''}
        ${off >= 25 ? '<span class="deal-badge">ดีลพิเศษ</span>' : ''}
        ${off > 0 ? `<div><span class="tag-s red">-${off}%</span> <span class="old-price">${money(best.perNightOrig)}</span></div>` : ''}
        <div class="price">${money(best.perNight)}</div>
        <div class="per">ต่อห้องต่อคืน</div>
        <div class="small muted">${nights()} คืน, ${S.rooms} ห้อง: <b style="color:var(--text)">${money(total)}</b></div>
      </div>` : '<div><div class="red bold">ห้องเต็มในวันที่เลือก</div><div class="small muted">ลองเปลี่ยนวันเข้าพัก</div></div>'}
    </div></div>`;
}
let mapInst = null;
function renderResults() {
  const list = sortList(applyFilters(baseResults()));
  const available = list.filter(x => x.best).length;
  $('#res-title').textContent = `${S.q || 'ทุกจุดหมาย'}: พบที่พัก ${list.length} แห่ง${available < list.length ? ` (ว่าง ${available})` : ''}`;
  const ps = S.q ? parseSearch(S.q) : null; // บอกลูกค้าว่าระบบเข้าใจคำค้นว่าอย่างไร
  $('#res-hint').innerHTML = ps && (ps.groups.length || ps.dest) ? `<i class="fa-solid fa-wand-magic-sparkles"></i> กรองตาม: ${[ps.dest && 'ย่าน' + ps.dest.name, ...ps.labels].filter(Boolean).map(esc).join(' · ')}` : '';
  $('#view-t').innerHTML = viewMode === 'list' ? '<i class="fa-solid fa-map"></i> แผนที่' : '<i class="fa-solid fa-list"></i> รายการ';
  const box = $('#results');
  if (mapInst) { mapInst.remove(); mapInst = null; }
  if (!list.length) { box.innerHTML = `<div class="empty"><i class="fa-solid fa-hotel"></i><h3>ไม่พบที่พักที่ตรงกับเงื่อนไข</h3><p class="muted">ลองปรับตัวกรองหรือค้นหาจุดหมายอื่น</p><button class="btn btn-outline" id="clr">ล้างตัวกรอง</button></div>`; $('#clr').onclick = () => { resetFilters(); renderFilters(); renderResults(); }; return; }
  if (viewMode === 'map') {
    box.innerHTML = '<div id="map"></div>';
    if (!window.L) { box.innerHTML = '<div class="empty">ไม่สามารถโหลดแผนที่ได้ (ต้องเชื่อมต่ออินเทอร์เน็ต)</div>'; return; }
    mapInst = L.map('map');
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(mapInst);
    const bounds = [];
    list.forEach(({ h, best }) => {
      const icon = L.divIcon({ className: '', html: `<span class="price-marker">${best ? money(best.perNight) : 'เต็ม'}</span>`, iconSize: null });
      L.marker([h.lat, h.lng], { icon }).addTo(mapInst).bindPopup(`<div style="width:200px">${imgTag(h.images[0], 400)}<b>${esc(h.name)}</b><br>${starsHtml(h.stars)} ${h.rating}/10<br><a href="#/hotel/${h.id}?${searchQuery()}">ดูรายละเอียด →</a></div>`);
      bounds.push([h.lat, h.lng]);
    });
    mapInst.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    return;
  }
  const shown = list.slice(0, page * PAGE_SIZE);
  const cards = DB.publicAds('card'); let ci = 0;
  box.innerHTML = shown.map((x, i) => resultCard(x) + (cards.length && i % 6 === 2 ? adCard(cards[ci++ % cards.length], true) : '')).join('') + (list.length > shown.length ? `<div style="text-align:center"><button class="btn btn-outline" id="more">แสดงเพิ่มเติม (${list.length - shown.length})</button></div>` : '');
  bindCards(box);
  initAds(box);
  $('#more')?.addEventListener('click', () => { page++; renderResults(); });
}

// ================= Deals / Favorites =================
function pageDeals(app) {
  sortBy = 'deals'; resetFilters(); S.q = ''; saveSearch();
  go(`/search?${searchQuery({ sort: 'deals' })}`, true);
}
function pageFavorites(app) {
  const list = DB.favs().map(id => DB.hotel(id)).filter(Boolean);
  app.innerHTML = `<div class="container" style="padding-top:24px"><h1 class="sec-title"><i class="fa-solid fa-heart red"></i> รายการโปรดของฉัน</h1>
    ${list.length ? `<div class="card-grid">${list.map(hotelCard).join('')}</div>` : `<div class="empty"><i class="fa-regular fa-heart"></i><h3>ยังไม่มีที่พักในรายการโปรด</h3><p class="muted">กดรูปหัวใจที่ที่พักเพื่อบันทึกไว้ดูภายหลัง</p><a class="btn btn-primary" href="#/search">ค้นหาที่พัก</a></div>`}</div>`;
  bindCards(app);
  $$('[data-fav]', app).forEach(b => b.addEventListener('click', () => setTimeout(() => pageFavorites(app), 50)));
}

// ================= Hotel detail =================
function offersFor(room) {
  if (room.breakfast) return [{ id: 'bf', breakfast: true, freeCancel: room.freeCancel, payAtHotel: room.payAtHotel, extra: 0 }];
  return [
    { id: 'ro', breakfast: false, freeCancel: room.freeCancel, payAtHotel: room.payAtHotel, extra: 0 },
    { id: 'bf', breakfast: true, freeCancel: true, payAtHotel: room.payAtHotel, extra: 220 * Math.min(2, room.maxGuests) },
  ];
}
function quoteOffer(room, offer, qty) {
  const q = DB.quote(room, S.checkIn, S.checkOut, qty);
  const add = offer.extra * q.nights * qty;
  return { ...q, orig: q.orig + add, sub: q.sub + add, perNight: q.perNight + offer.extra, perNightOrig: q.perNightOrig + offer.extra };
}

function pageHotel(app, params, id) {
  readSearchFromParams(params);
  const h = withVip(DB.hotel(id));
  if (!h || (h.active === false && !(h.practice && /[?&]practice=1/.test(location.hash)))) { app.innerHTML = `<div class="container"><div class="empty" style="margin-top:30px"><h3>ไม่พบที่พักนี้</h3><a href="#/search" class="btn btn-primary">กลับไปค้นหา</a></div></div>`; return; }
  DB.pushRecent(h.id);
  const reviews = DB.reviews(h.id);
  const best = DB.cheapest(h, S);
  // แถบข้าง: แสดงเฉพาะเมื่อมีเนื้อหา (คะแนนรีวิว / ห้องเต็ม) ไม่งั้นไม่เหลือกรอบว่าง
  const sideHtml = [scoreHtml(h.rating, h.reviews) && `<div class="row between">${scoreHtml(h.rating, h.reviews)}</div>`, best ? '' : '<div class="red bold">ห้องเต็มในวันที่เลือก</div><p class="small muted">ลองเปลี่ยนวันเข้าพัก</p>'].filter(Boolean).join('<hr style="border:0;border-top:1px solid var(--border);margin:14px 0">');
  const slideOn = h.slideshow?.on === true && h.images.length > 1; // สไลด์รูปอัตโนมัติ (เจ้าของเปิด/ปิด และตั้งเวลาได้ในหลังบ้าน)
  const guestsPerRoom = Math.ceil((S.adults + S.children) / S.rooms);
  const cats =[['ความสะอาด', 0.2], ['ทำเลที่ตั้ง', 0.35], ['การบริการ', 0.1], ['สิ่งอำนวยความสะดวก', -0.2], ['ความคุ้มค่า', -0.05], ['ห้องพัก', 0]];

  app.innerHTML = `${searchBoxHtml('mini')}
  <div class="container">
    <div class="breadcrumb"><a href="#/">หน้าแรก</a> › <a href="#/search?q=${encodeURIComponent(h.city)}">${esc(h.city)}</a> › ${esc(h.name)}</div>
    ${slideOn
      ? `<div class="gallery slider" id="gallery" role="region" aria-roledescription="carousel"><button class="gal-back" aria-label="ย้อนกลับ" onclick="history.length>1?history.back():(location.hash='#/search')"><i class="fa-solid fa-chevron-left"></i></button>${demoWm(h)}${h.images.map((im, i) => `<img class="sl-slide ${i === 0 ? 'on' : ''}" src="${imgUrl(im, 1400)}" data-i="${i}" ${i ? 'loading="lazy"' : ''} onerror="${fallback(h.id + i)}" alt="">`).join('')}
        <button class="sl-nav prev" aria-label="รูปก่อนหน้า"><i class="fa-solid fa-chevron-left"></i></button><button class="sl-nav next" aria-label="รูปถัดไป"><i class="fa-solid fa-chevron-right"></i></button>
        <div class="sl-dots">${h.images.map((_, i) => `<button class="sl-dot ${i === 0 ? 'on' : ''}" data-d="${i}" aria-label="รูปที่ ${i + 1}"></button>`).join('')}</div>
        <button class="btn btn-sm more" style="background:#fff" data-i="0"><i class="fa-regular fa-images"></i> ดูรูปทั้งหมด (${h.images.length + h.rooms.length})</button></div>`
      : `<div class="gallery" id="gallery"><button class="gal-back" aria-label="ย้อนกลับ" onclick="history.length>1?history.back():(location.hash='#/search')"><i class="fa-solid fa-chevron-left"></i></button>${demoWm(h)}${h.images.slice(0, 5).map((im, i) => `<img src="${imgUrl(im, i ? 600 : 1200)}" data-i="${i}" onerror="${fallback(h.id + i)}" alt="">`).join('')}
      <button class="btn btn-sm more" style="background:#fff" data-i="0"><i class="fa-regular fa-images"></i> ดูรูปทั้งหมด (${h.images.length + h.rooms.length})</button></div>`}
  </div>
  ${isDemoHotel(h) ? `<div class="container">${demoBanner(h)}</div>` : ''}
  <div class="d-tabs"><div class="container">
    <a href="javascript:" data-go="ov">ภาพรวม</a><a href="javascript:" data-go="rooms">ห้องพัก</a><a href="javascript:" data-go="amen">สิ่งอำนวยความสะดวก</a><a href="javascript:" data-go="rev">รีวิว</a><a href="javascript:" data-go="loc">ที่ตั้ง</a><a href="javascript:" data-go="pol">นโยบาย</a>
  </div></div>
  <div class="container">
    <div class="detail-layout${sideHtml ? '' : ' solo'}">
      <div>
        <div class="panel" id="ov">
          <div class="row between wrap" style="align-items:flex-start">
            <div style="flex:1;min-width:240px">
              <div class="row" style="gap:8px"><span class="tag-s blue">${esc(h.type)}</span>${starsHtml(h.stars)}</div>
              <h1 class="d-title">${esc(h.name)}${isVip(h) ? ` ${vipBadge(h).replace('vip-badge', 'vip-badge inline')}` : ''}</h1>
              <div class="small"><i class="fa-solid fa-location-dot" style="color:var(--primary)"></i> ${esc(h.address)} · <a href="javascript:" data-go="loc">ดูแผนที่</a></div>
            </div>
            <div class="row"><span class="fav-inline">${favBtn(h.id)}</span><button class="btn btn-outline btn-sm" id="share"><i class="fa-solid fa-share-nodes"></i> แชร์</button>${(c => (c.tel ? `<a class="btn btn-outline btn-sm" href="tel:${esc(c.tel)}"><i class="fa-solid fa-phone"></i> โทร</a>` : '<span class="btn btn-outline btn-sm muted" aria-disabled="true"><i class="fa-solid fa-phone"></i> โทร: รอกรอกเพิ่มเติม</span>') + (c.line ? `<a class="btn btn-outline btn-sm" href="${esc(c.line)}" target="_blank" rel="noopener"><i class="fa-brands fa-line" style="color:#06c755"></i> LINE</a>` : '<span class="btn btn-outline btn-sm muted" aria-disabled="true"><i class="fa-brands fa-line"></i> LINE: รอกรอกเพิ่มเติม</span>'))(contactOf(h))}</div>
          </div>
          <div class="tags" style="margin-top:14px">${h.highlights.map(x => `<span class="tag-s green"><i class="fa-solid fa-thumbs-up"></i> ${esc(x)}</span>`).join('')}</div>
          <p style="margin:14px 0 0">${esc(h.description)}</p>
          ${Object.keys(SOCIALS).some(k => h.social?.[k]) ? `<div class="row wrap" style="gap:8px;margin-top:14px"><span class="small muted">ติดตามรีสอร์ท:</span>${Object.entries(SOCIALS).filter(([k]) => h.social?.[k]).map(([k, c]) => `<a class="btn btn-ghost btn-sm" href="${esc(socialUrl(k, h.social[k]))}" target="_blank" rel="noopener"><i class="${c.icon}" style="color:${c.color}"></i> ${k === 'line' ? esc(h.social[k]) : c.label}</a>`).join('')}</div>` : ''}
        </div>

        <div class="panel" id="rooms">
          <h2>เลือกห้องพัก</h2>
          <div class="notice info"><i class="fa-solid fa-circle-info"></i><div>${fmtDate(S.checkIn)} – ${fmtDate(S.checkOut)} · ${nights()} คืน · ${guestsText()} <a href="javascript:" id="chg">เปลี่ยน</a></div></div>
          ${h.rooms.map(r => roomHtml(h, r, guestsPerRoom)).join('')}
        </div>

        <div class="panel" id="amen"><h2>สิ่งอำนวยความสะดวก</h2>
          <div class="amen-grid">${h.amenities.map(a => { const i = amenInfo(a); return i ? `<div><i class="fa-solid ${i[0]}"></i>${esc(i[1])}</div>` : ''; }).join('')}</div></div>

        <div class="panel" id="rev"><h2>รีวิวจากผู้เข้าพักจริง</h2>
          <div class="row wrap" style="gap:30px;align-items:flex-start;margin-bottom:10px">
            ${!h.reviews ? '<p class="muted"><i class="fa-solid fa-seedling"></i> ยังไม่มีรีวิว ผู้เข้าพักจะรีวิวได้หลังเช็คเอาท์</p>' : `<div class="score-big"><b>${h.rating.toFixed(1)}</b><div><div class="bold" style="font-size:20px;color:var(--primary)">${scoreWord(h.rating)}</div><div class="muted small">จาก ${h.reviews.toLocaleString()} รีวิว</div></div></div>
            <div class="bars" style="flex:1;min-width:260px">${cats.map(([c, d]) => { const v = Math.min(10, h.rating + d); return `<div class="bar-row"><span>${c}</span><div class="bar"><span style="width:${v * 10}%"></span></div><b>${v.toFixed(1)}</b></div>`; }).join('')}</div>`}
          </div>
          <div id="rev-list">${reviews.slice(0, 5).map(reviewHtml).join('')}</div>
          ${reviews.length > 5 ? '<button class="btn btn-outline btn-block" id="rev-more">ดูรีวิวเพิ่มเติม</button>' : ''}
        </div>

        <div class="panel" id="loc"><h2>ที่ตั้ง</h2><p class="small"><i class="fa-solid fa-location-dot"></i> ${esc(h.address)}</p><div id="detail-map"></div><a class="btn btn-outline btn-sm" style="margin-top:10px" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${h.lat},${h.lng}"><i class="fa-solid fa-map-location-dot"></i> เปิดใน Google Maps</a></div>

        <div class="panel" id="pol"><h2>นโยบายที่พัก</h2>
          <table class="policy-table">
            <tr><td>เช็คอิน</td><td>ตั้งแต่ ${h.checkIn} น.</td></tr>
            <tr><td>เช็คเอาท์</td><td>ก่อน ${h.checkOut} น.</td></tr>
            <tr><td>เด็กและเตียงเสริม</td><td>เด็กอายุต่ำกว่า 6 ปีพักฟรีเมื่อใช้เตียงที่มีอยู่ · เตียงเสริม ฿800/คืน</td></tr>
            <tr><td>สัตว์เลี้ยง</td><td>${h.amenities.includes('pets') ? 'อนุญาต (อาจมีค่าธรรมเนียมเพิ่มเติม)' : 'ไม่อนุญาต'}</td></tr>
            <tr><td>การยกเลิก</td><td>ขึ้นอยู่กับประเภทห้องที่เลือก — ดูรายละเอียดในแต่ละข้อเสนอ</td></tr>
            <tr><td>การชำระเงิน</td><td>พร้อมเพย์ (สแกน QR) โอนผ่านธนาคาร หรือชำระที่ที่พัก (บางห้อง)</td></tr>
          </table></div>

        ${h.highlights.length ? `<div class="panel" id="hl"><h2>จุดเด่น</h2>${h.highlights.map(x => `<div class="small" style="margin:6px 0"><i class="fa-solid fa-check green"></i> ${esc(x)}</div>`).join('')}</div>` : ''}
      </div>

      ${sideHtml ? `<aside><div class="side-box"><div class="panel">${sideHtml}</div></div></aside>` : ''}
    </div>
  </div>`;
  bindSearchBox(app, () => go(`/hotel/${h.id}?${searchQuery()}`));
  bindFavs(app);
  initAds(app);
  $$('[data-go]', app).forEach(a => a.onclick = () => { const t = $('#' + a.dataset.go); scrollTo({ top: t.getBoundingClientRect().top + scrollY - ($('.header')?.offsetHeight || 64) - 66, behavior: 'smooth' }); });
  $('#chg').onclick = () => { scrollTo({ top: 0, behavior: 'smooth' }); setTimeout(() => $('.date-field').dispatchEvent(new MouseEvent('mousedown', { bubbles: true })), 300); };
  $('#share').onclick = () => { copyText(resortLink(h, '', { in: S.checkIn, out: S.checkOut, a: S.adults, r: S.rooms })); toast('คัดลอกลิงก์รีสอร์ทแล้ว (พร้อมวันที่ที่เลือกอยู่)'); };
  if (slideOn) initSlider($('#gallery'), h.slideshow?.seconds);
  $$('.room-slider', app).forEach(el => initSlider(el, el.dataset.rsl));
  const allImgs = [...h.images, ...h.rooms.map(r => r.img)];
  $$('#gallery [data-i]').forEach(el => el.onclick = () => lightbox(allImgs, +el.dataset.i));
  $$('[data-rimg]', app).forEach(el => el.onclick = () => lightbox(allImgs, h.images.length + +el.dataset.rimg));
  $('#rev-more')?.addEventListener('click', e => { $('#rev-list').innerHTML = reviews.map(reviewHtml).join(''); e.target.remove(); });
  $$('[data-book]', app).forEach(b => b.onclick = () => {
    const [rid, oid] = b.dataset.book.split('|');
    const qty = +$(`select[data-qty="${rid}|${oid}"]`).value;
    go(`/book?h=${h.id}&room=${rid}&o=${oid}&n=${qty}&${searchQuery()}`);
  });
  $$('select[data-qty]', app).forEach(s => s.onchange = () => {
    const [rid, oid] = s.dataset.qty.split('|');
    const r = h.rooms.find(x => x.id === rid), o = offersFor(r).find(x => x.id === oid);
    $(`[data-total="${rid}|${oid}"]`).textContent = money(quoteOffer(r, o, +s.value).sub);
  });
  if (window.L) {
    // ล็อกแผนที่ให้อยู่กับที่ (ไม่เลื่อน/ซูมด้วยนิ้วหรือเมาส์ — กันแผนที่แย่งการเลื่อนหน้าบนมือถือ) · ดูแผนที่เต็มได้จากลิงก์ด้านล่าง
    const m = L.map('detail-map', { scrollWheelZoom: false, dragging: false, touchZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, zoomControl: false, tap: false }).setView([h.lat, h.lng], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(m);
    L.marker([h.lat, h.lng]).addTo(m).bindPopup(esc(h.name)).openPopup();
  }
}
// สไลด์รูปอัตโนมัติ: เปลี่ยนรูปทุก N วินาที (2–15) · หยุดเมื่อเอาเมาส์ชี้/แตะ · ปัดซ้ายขวาบนมือถือ · ไม่เล่นเองถ้าผู้ใช้ตั้งลดการเคลื่อนไหว
function initSlider(el, seconds) {
  if (!el) return;
  const slides = $$('.sl-slide', el), dots = $$('.sl-dot', el), sec = Math.min(15, Math.max(2, Math.round(+seconds || 4)));
  let i = 0, timer = null, hover = false;
  const show = n => { i = (n + slides.length) % slides.length; slides.forEach((s, k) => s.classList.toggle('on', k === i)); dots.forEach((d, k) => d.classList.toggle('on', k === i)); };
  const stop = () => { clearInterval(timer); timer = null; };
  const play = () => {
    stop();
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    timer = setInterval(() => { if (!document.body.contains(el)) return stop(); if (!hover && !document.hidden) show(i + 1); }, sec * 1000);
  };
  $('.prev', el).onclick = e => { e.stopPropagation(); show(i - 1); play(); };
  $('.next', el).onclick = e => { e.stopPropagation(); show(i + 1); play(); };
  dots.forEach(d => d.onclick = e => { e.stopPropagation(); show(+d.dataset.d); play(); });
  el.addEventListener('mouseenter', () => hover = true); el.addEventListener('mouseleave', () => hover = false);
  let x0 = null;
  el.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; hover = true; }, { passive: true });
  el.addEventListener('touchend', e => { hover = false; if (x0 != null) { const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) { show(i + (dx < 0 ? 1 : -1)); play(); } } x0 = null; });
  el.dataset.interval = sec; play();
}
// รูปห้อง: ถ้านักพัฒนาเปิดสไลด์ของรีสอร์ท และห้องมีรูปเพิ่ม (r.imgs) → สไลด์รูปห้อง ไม่งั้นแสดงรูปเดียวเหมือนเดิม
function roomImgHtml(h, r, idx) {
  const one = (u, cls) => imgTag(u, 500, cls, r.id).replace('<img', `<img data-rimg="${idx}" style="cursor:pointer"`);
  const list = [r.img, ...(r.imgs || [])].filter(Boolean);
  if (h.slideshow?.on !== true || list.length < 2) return one(r.img, '');
  return `<div class="room-slider" data-rsl="${h.slideshow.seconds || 4}" role="region" aria-roledescription="carousel">${list.map((u, i) => one(u, 'sl-slide' + (i ? '' : ' on'))).join('')}
    <button type="button" class="sl-nav prev" aria-label="รูปก่อนหน้า"><i class="fa-solid fa-chevron-left"></i></button><button type="button" class="sl-nav next" aria-label="รูปถัดไป"><i class="fa-solid fa-chevron-right"></i></button>
    <div class="sl-dots">${list.map((_, i) => `<button type="button" class="sl-dot ${i ? '' : 'on'}" data-d="${i}" aria-label="รูปที่ ${i + 1}"></button>`).join('')}</div></div>`;
}
function roomHtml(h, r, guestsPerRoom) {
  const rmsg = restrictMsg(h, r.id, S.checkIn, S.checkOut), avail = rmsg ? 0 : DB.available(r, S.checkIn, S.checkOut);
  const fits = r.maxGuests >= guestsPerRoom;
  const idx = h.rooms.indexOf(r);
  return `<div class="room">
    <div class="room-head"><span>${esc(r.name)}</span>${avail > 0 && avail <= 3 ? `<span class="urgent" style="margin:0">เหลือเพียง ${avail} ห้อง!</span>` : ''}</div>
    <div class="room-body">
      <div class="room-info">${roomImgHtml(h, r, idx)}
        <div><i class="fa-solid fa-bed"></i>${esc(r.bed)}</div>
        <div><i class="fa-solid fa-up-right-and-down-left-from-center"></i>${r.size} ตร.ม.</div>
        <div><i class="fa-solid fa-mountain-sun"></i>${esc(r.view)}</div>
        <div><i class="fa-solid fa-user-group"></i>พักได้สูงสุด ${r.maxGuests} ท่าน</div>
        <div><i class="fa-solid fa-wifi"></i>Wi-Fi ฟรี</div>
        <div><i class="fa-solid fa-snowflake"></i>เครื่องปรับอากาศ</div>
      </div>
      <div>
        <div class="offer-head"><div>สิ่งที่รวมในราคา</div><div>ผู้เข้าพัก</div><div style="text-align:right">ราคาต่อคืน</div><div>จำนวนห้อง</div></div>
        ${avail <= 0 ? soldRoomHtml(h, r, rmsg) : offersFor(r).map(o => {
          const q = quoteOffer(r, o, 1);
          const off = Math.round((1 - q.perNight / q.perNightOrig) * 100);
          const maxQ = Math.min(avail, 8);
          const defQ = Math.min(maxQ, Math.max(S.rooms, Math.ceil((S.adults + S.children) / r.maxGuests)));
          return `<div class="offer">
            <div class="ben">
              ${o.breakfast ? '<div class="green"><i class="fa-solid fa-mug-saucer"></i><b>รวมอาหารเช้า</b></div>' : '<div class="muted"><i class="fa-solid fa-mug-saucer"></i>ไม่รวมอาหารเช้า</div>'}
              ${o.freeCancel ? (addDays(S.checkIn, -CANCEL_MIN_DAYS) >= todayISO() ? `<div class="green"><i class="fa-solid fa-check"></i><span><b>ยกเลิกได้</b> ล่วงหน้า ${CANCEL_MIN_DAYS} วัน (ได้ถึงวันที่ ${fmtDate(addDays(S.checkIn, -CANCEL_MIN_DAYS), false)})</span></div>` : `<div class="muted"><i class="fa-solid fa-xmark"></i>ไม่สามารถยกเลิกได้ — เลยกำหนดยกเลิกล่วงหน้า ${CANCEL_MIN_DAYS} วันแล้ว</div>`) : '<div class="muted"><i class="fa-solid fa-xmark"></i>ไม่สามารถคืนเงินได้</div>'}
              ${o.payAtHotel ? '<div class="green"><i class="fa-solid fa-check"></i><b>ชำระเงินที่ที่พัก</b></div>' : '<div><i class="fa-solid fa-credit-card"></i>ชำระเงินล่วงหน้า</div>'}
              <div><i class="fa-solid fa-wifi green"></i>Wi-Fi ฟรี</div>
            </div>
            <div>${'<i class="fa-solid fa-user"></i>'.repeat(r.maxGuests)}${!fits ? '<div class="small red" style="margin-top:4px">ต้องจองหลายห้อง</div>' : ''}</div>
            <div style="text-align:right">
              ${off > 0 ? `<span class="tag-s red">-${off}%</span><div class="old-price">${money(q.perNightOrig)}</div>` : ''}
              <div class="price">${money(q.perNight)}</div><div class="per">ต่อห้องต่อคืน</div>
            </div>
            <div>
              <select data-qty="${r.id}|${o.id}">${Array.from({ length: maxQ }, (_, i) => `<option value="${i + 1}" ${i + 1 === defQ ? 'selected' : ''}>${i + 1} ห้อง</option>`).join('')}</select>
              <div class="small muted" style="margin:6px 0 2px"><span>(${fmtRange(S.checkIn, S.checkOut)})</span> ${nights()} คืนรวม</div>
              <div class="bold" data-total="${r.id}|${o.id}">${money(quoteOffer(r, o, defQ).sub)}</div>
              <button class="btn btn-primary btn-block btn-sm" style="margin-top:8px" data-book="${r.id}|${o.id}">จองเลย</button>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div></div>`;
}
function reviewHtml(r) {
  return `<div class="review"><div class="who"><b>${esc(r.name)}</b>${esc(r.country)} · ${esc(r.trip)}<br>${esc(r.room || '')}<br>เข้าพัก ${fmtDate(r.date, false)}</div>
    <div><div class="row" style="gap:10px;margin-bottom:4px"><span class="score"><b>${(+r.score).toFixed(1)}</b></span><h4>${esc(r.title)}</h4></div><p>${esc(r.text)}</p></div></div>`;
}
function lightbox(imgs, i) {
  const lb = document.createElement('div');
  lb.className = 'lightbox';
  const show = () => lb.innerHTML = `<img src="${imgUrl(imgs[i], 1600)}" onerror="${fallback('lb' + i)}"><button class="lb-btn lb-close"><i class="fa-solid fa-xmark"></i></button><button class="lb-btn lb-prev"><i class="fa-solid fa-chevron-left"></i></button><button class="lb-btn lb-next"><i class="fa-solid fa-chevron-right"></i></button><div class="lb-count">${i + 1} / ${imgs.length}</div>`;
  const nav = d => { i = (i + d + imgs.length) % imgs.length; show(); };
  const key = e => { if (e.key === 'Escape') done(); if (e.key === 'ArrowLeft') nav(-1); if (e.key === 'ArrowRight') nav(1); };
  const done = () => { lb.remove(); document.removeEventListener('keydown', key); };
  lb.onclick = e => { if (e.target.closest('.lb-close') || e.target === lb) done(); else if (e.target.closest('.lb-prev')) nav(-1); else if (e.target.closest('.lb-next')) nav(1); };
  document.addEventListener('keydown', key);
  show(); document.body.appendChild(lb);
}

// ================= Booking =================
let bookTimer = null;
function pageBook(app, params) {
  readSearchFromParams(params);
  const h = DB.hotel(params.get('h'));
  const room = h?.rooms.find(r => r.id === params.get('room'));
  const offer = room && offersFor(room).find(o => o.id === params.get('o'));
  const qty = Math.max(1, +params.get('n') || 1);
  if (!h || !room || !offer) { app.innerHTML = '<div class="container"><div class="empty" style="margin-top:30px"><h3>ข้อมูลการจองไม่ถูกต้อง</h3><a href="#/" class="btn btn-primary">กลับหน้าแรก</a></div></div>'; return; }
  if (restrictMsg(h, room.id, S.checkIn, S.checkOut) || DB.available(room, S.checkIn, S.checkOut) < qty) { app.innerHTML = `<div class="container"><div class="empty" style="margin-top:30px"><h3>ขออภัย ห้องว่างไม่เพียงพอแล้ว</h3><a href="#/hotel/${h.id}?${searchQuery()}" class="btn btn-primary">เลือกห้องอื่น</a></div></div>`; return; }

  const u = DB.currentUser();
  const q = quoteOffer(room, offer, qty);
  const demoAcct = isDemoHotel(h) && u?.email === 'dev.demo@example.com'; // บัญชีทดสอบจองรีสอร์ทตัวอย่าง → เติมอีเมล/เบอร์ตัวอย่างให้
  const st = { step: 1, guest: { firstName: demoAcct ? 'ทดสอบ' : u?.name.split(' ')[0] || '', lastName: u?.name.split(' ').slice(1).join(' ') || '', email: demoAcct ? 'demo.demo@example.com' : u?.email || '', phone: demoAcct ? '01234567890' : u?.phone || '', country: 'ไทย', requests: [], note: '', arrival: '' }, pay: payMethods(offer, h)[0] || null, coupon: null, off: 0 };
  const memberOff = u ? Math.round(q.sub * 0.05) : 0;
  const calc = () => {
    const sub = q.sub - memberOff - st.off;
    const tax = Math.round(sub * TAX_RATE);
    return { sub, tax, total: sub + tax };
  };
  let deadline = Date.now() + 20 * 60 * 1000;

  const summary = () => {
    const c = calc();
    return `<div class="panel">
      <div class="sum-hotel">${imgTag(h.images[0], 300, '', h.id)}<div><b>${esc(h.name)}</b><br>${starsHtml(h.stars)}<div class="small muted">${esc(h.area)}, ${esc(h.city)}</div>${scoreHtml(h.rating)}</div></div>
      <div class="sum-dates"><div><div class="small muted">เช็คอิน</div><b>${fmtDate(S.checkIn)}</b><div class="small muted">ตั้งแต่ ${h.checkIn}</div></div><div><div class="small muted">เช็คเอาท์</div><b>${fmtDate(S.checkOut)}</b><div class="small muted">ก่อน ${h.checkOut}</div></div></div>
      <div class="small"><b>${qty} x ${esc(room.name)}</b> · ${q.nights} คืน<br>${guestsText()}</div>
      <div class="tags">${offer.breakfast ? '<span class="tag-s blue">รวมอาหารเช้า</span>' : ''}${offer.freeCancel ? '<span class="tag-s green">ยกเลิกฟรี</span>' : '<span class="tag-s red">ไม่สามารถคืนเงินได้</span>'}</div>
      <hr style="border:0;border-top:1px solid var(--border);margin:12px 0">
      ${q.orig > q.sub ? `<div class="sum-row"><span>ราคาปกติ (${qty} ห้อง x ${q.nights} คืน)</span><span class="old-price">${money(q.orig)}</span></div><div class="sum-row green"><span>ส่วนลดที่พัก</span><span>-${money(q.orig - q.sub)}</span></div>` : ''}
      <div class="sum-row"><span>ราคาห้องพัก</span><span>${money(q.sub)}</span></div>
      ${memberOff ? `<div class="sum-row green"><span>ส่วนลดสมาชิก 5%</span><span>-${money(memberOff)}</span></div>` : ''}
      ${st.off ? `<div class="sum-row green"><span>โค้ด ${esc(st.coupon.code)}</span><span>-${money(st.off)}</span></div>` : ''}
      ${c.tax ? `<div class="sum-row"><span>ภาษีและค่าธรรมเนียม</span><span>${money(c.tax)}</span></div>` : ''}
      <div class="sum-row total"><span>ราคารวมทั้งหมด</span><span class="red">${money(c.total)}</span></div>
      <div class="coupon-row"><input id="cp" placeholder="ใส่โค้ดส่วนลด" value="${st.coupon ? esc(st.coupon.code) : ''}"><button class="btn btn-outline" id="cp-btn">${st.coupon ? 'ลบ' : 'ใช้ส่วนลด'}</button></div>
      ${st.coupon ? `<div class="small green" style="margin-top:6px"><i class="fa-solid fa-circle-check"></i> ${esc(st.coupon.code)}: ลด ${couponOffText(st.coupon)} · ${couponCondText(st.coupon)}</div>` : '<div class="small muted" style="margin-top:6px">โค้ดบางรายการมีเงื่อนไข เช่น ยอดจองขั้นต่ำหรือจำนวนครั้งที่ใช้ได้</div>'}
    </div>`;
  };
  const steps = () => `<div class="steps">${['กรอกข้อมูลผู้เข้าพัก', 'ชำระเงิน', 'ยืนยันการจอง'].map((s, i) => `<div class="step ${st.step === i + 1 ? 'active' : st.step > i + 1 ? 'done' : ''}"><span class="n">${st.step > i + 1 ? '<i class="fa-solid fa-check"></i>' : i + 1}</span>${s}</div>`).join('')}</div>`;

  function draw() {
    app.innerHTML = `<div class="container">${steps()}<div class="book-layout"><div id="book-main"></div><aside><div class="side-box"><div id="book-sum">${summary()}</div>${st.step === 1 ? '<button class="btn btn-primary btn-lg" id="next1" style="width:100%;margin-top:12px">ถัดไป: ชำระเงิน <i class="fa-solid fa-chevron-right"></i></button>' : ''}</div></aside></div></div>`;
    st.step === 1 ? drawGuest() : drawPay();
    bindSum();
  }
  function bindSum() {
    $('#cp-btn').onclick = async () => {
      if (st.coupon) { st.coupon = null; st.off = 0; }
      else {
        const r = await DB.applyCoupon($('#cp').value, q.sub - memberOff, h.id);
        if (r.error) return toast(r.error, 'err');
        st.coupon = r.coupon; st.off = r.off; toast(`ใช้โค้ดสำเร็จ ลด ${money(r.off)}`);
      }
      $('#book-sum').innerHTML = summary(); bindSum();
      if (st.step === 2) $('#pay-total').textContent = money(calc().total);
    };
  }
  function tick() {
    clearInterval(bookTimer);
    const el = () => $('#timer-t');
    bookTimer = setInterval(() => {
      if (!el()) return clearInterval(bookTimer);
      const left = Math.max(0, deadline - Date.now());
      el().textContent = `${pad(Math.floor(left / 60000))}:${pad(Math.floor(left / 1000) % 60)}`;
      if (!left) { clearInterval(bookTimer); toast('หมดเวลาการจอง กรุณาเลือกห้องใหม่อีกครั้ง', 'err'); go(`/hotel/${h.id}?${searchQuery()}`); }
    }, 1000);
  }
  const timerHtml = () => '';

  // กล่อง "เลือกวิธีชำระเงิน" — แสดงเฉพาะขั้นชำระเงิน (ขั้นกรอกข้อมูลผู้เข้าพักไม่มี) · st.pay ตั้งค่าเริ่มต้นไว้แล้ว
  const PAY_LABEL = {
    hotel: ['<b>ชำระเงินที่ที่พัก</b> <span class="tag-s green">ไม่ต้องชำระตอนนี้</span>', '<i class="fa-solid fa-hotel"></i>'],
    promptpay: ['<b>พร้อมเพย์ (PromptPay QR)</b> <span class="tag-s blue">สแกนจ่ายได้ทุกธนาคาร</span>', '<i class="fa-solid fa-qrcode"></i>'],
    bank: ['<b>โอนผ่านธนาคาร / Mobile Banking</b>', '<i class="fa-solid fa-building-columns"></i>'],
  };
  function payPanelHtml() {
    const set = DB.settings(), methods = payMethods(offer, h), ow = DB.owner(h.ownerId);
    if (!methods.includes(st.pay)) st.pay = methods[0] || null;
    return `<div class="panel" id="pay-panel"><h2>เลือกวิธีชำระเงิน</h2>
      ${methods.length ? `<div class="pay-opts">${methods.map(k => `<label class="pay-opt ${st.pay === k ? 'active' : ''}"><input type="radio" name="pay" value="${k}" ${st.pay === k ? 'checked' : ''}> <span>${PAY_LABEL[k][0]}</span><span class="logos">${PAY_LABEL[k][1]}</span></label>`).join('')}</div>`
      : `<div class="notice warn"><i class="fa-solid fa-circle-info"></i><div>ที่พักนี้ยังไม่เปิดรับชำระเงินออนไลน์สำหรับห้องนี้ — กรุณาติดต่อ ${esc(ow?.phone || set.phone)} · LINE ${esc(ow?.line || set.line)}</div></div>`}
      <div id="pay-detail"></div></div>`;
  }
  function bindPayPanel() {
    const detail = () => {
      const d = $('#pay-detail'); if (!d) return;
      // QR จะแสดงหลังยืนยันการจอง เพื่อให้ยอดตรงกับที่เซิร์ฟเวอร์คำนวณ และกันการโอนก่อนได้ห้อง
      if (st.pay === 'promptpay') d.innerHTML = `<div class="notice info"><i class="fa-solid fa-qrcode"></i><div>กด "ยืนยันการจอง" แล้วระบบจะแสดง <b>QR พร้อมเพย์ของเจ้าของรีสอร์ทพร้อมยอดเงิน</b><br>สแกนจ่ายผ่านแอปธนาคาร แล้ว <b>แนบสลิป</b> — เจ้าของรีสอร์ทจะตรวจสอบและยืนยันการจอง</div></div>`;
      else if (st.pay === 'bank') d.innerHTML = `<div class="notice info"><i class="fa-solid fa-building-columns"></i><div>กด "ยืนยันการจอง" แล้วระบบจะแสดง <b>เลขบัญชีของเจ้าของรีสอร์ท</b> โอนแล้วแนบสลิป — เจ้าของรีสอร์ทจะตรวจสอบและยืนยันการจอง</div></div>`;
      else if (st.pay === 'hotel') d.innerHTML = `<div class="notice"><i class="fa-solid fa-circle-check"></i><div>ชำระเงินที่ที่พักในวันเข้าพัก ไม่มีการเรียกเก็บเงินในตอนนี้ — เจ้าของรีสอร์ทจะยืนยันการจองให้</div></div>`;
      else d.innerHTML = '';
    };
    $$('[name=pay]').forEach(r => r.onchange = () => { st.pay = r.value; $$('.pay-opt').forEach(o => o.classList.toggle('active', o.contains(r))); detail(); });
    detail();
  }

  function drawGuest() {
    const g = st.guest;
    const fg = (name, label, type = 'text', req = true, full = false, msg = 'กรุณากรอกข้อมูล') => `<div class="fg ${full ? 'full' : ''}"><label>${label} ${req ? '<span class="req">*</span>' : ''}</label><input name="${name}" type="${type}" value="${esc(g[name])}"><div class="err-msg">${msg}</div></div>`;
    $('#book-main').innerHTML = `${timerHtml()}
      ${!u ? `<div class="panel row between wrap"><div><b>มีบัญชีแล้ว?</b> <span class="small muted">เข้าสู่ระบบเพื่อจองเร็วขึ้นและรับส่วนลด 5%</span></div><button class="btn btn-outline btn-sm" id="b-login">เข้าสู่ระบบ</button></div>` : ''}
      <form class="panel" id="g-form" novalidate>
        <h2>ข้อมูลผู้เข้าพัก</h2>
        <div class="form-grid">
          ${fg('firstName', 'ชื่อ')}${fg('lastName', 'นามสกุล')}
          ${fg('email', 'อีเมล', 'email', true, false, 'กรุณากรอกอีเมลที่ถูกต้อง')}
          ${fg('phone', 'เบอร์โทรศัพท์', 'tel', true, false, 'กรุณากรอกเบอร์โทร 9-10 หลัก')}
          <div class="fg full"><label>ประเทศของคุณ</label><select name="country">${['ไทย', 'ญี่ปุ่น', 'จีน', 'สหรัฐอเมริกา', 'สหราชอาณาจักร', 'อื่นๆ'].map(c => `<option ${g.country === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
        </div>
        <div class="notice" style="margin-top:14px"><i class="fa-solid fa-envelope"></i>เราจะส่งใบยืนยันการจองไปที่อีเมลนี้</div>
      </form>
      <div class="panel"><h2>คำขอพิเศษ <span class="small muted" style="font-weight:400">(ไม่บังคับ)</span></h2>
        <p class="small muted" style="margin-top:0">คำขอพิเศษขึ้นอยู่กับความพร้อมของที่พัก</p>
        <div class="form-grid">${['ห้องปลอดบุหรี่', 'ชั้นสูง', 'เตียงใหญ่', 'เช็คอินก่อนเวลา', 'เช็คเอาท์ล่าช้า', 'ห้องติดกัน'].map(r => `<label class="ck row" style="gap:8px"><input type="checkbox" name="req" value="${r}" ${g.requests.includes(r) ? 'checked' : ''} style="accent-color:var(--primary);width:18px;height:18px"> ${r}</label>`).join('')}</div>
        <div class="form-grid" style="margin-top:14px">
          <div class="fg"><label>เวลาที่คาดว่าจะมาถึง</label><select id="arrival"><option value="">ไม่ระบุ</option>${Array.from({ length: 24 }, (_, i) => `<option ${g.arrival === pad(i) + ':00' ? 'selected' : ''}>${pad(i)}:00</option>`).join('')}</select></div>
          <div class="fg full"><label>ข้อความถึงที่พัก</label><textarea id="note" rows="3">${esc(g.note)}</textarea></div>
        </div>
      </div>`;
    $('#b-login')?.addEventListener('click', () => authModal('login', () => pageBook(app, params)));
    $('#next1').onclick = () => {
      const f = $('#g-form');
      Object.assign(g, Object.fromEntries(new FormData(f)));
      g.requests = $$('[name=req]:checked').map(x => x.value);
      g.note = $('#note').value; g.arrival = $('#arrival').value;
      const checks = { firstName: v => v.trim(), lastName: v => v.trim(), email: v => /^\S+@\S+\.\S+$/.test(v), phone: v => /^[0-9+\-\s]{9,15}$/.test(v) };
      let ok = true;
      Object.entries(checks).forEach(([k, fn]) => { const bad = !fn(g[k] || ''); $(`[name=${k}]`, f).parentElement.classList.toggle('err', bad); if (bad) ok = false; });
      if (!ok) { toast('กรุณากรอกข้อมูลให้ครบถ้วน', 'err'); return; }
      // รีสอร์ทฝึกใช้งาน: ต้องใส่โค้ดส่วนลดก่อน จึงไปขั้นชำระเงินได้ (โค้ดที่เจ้าของสร้างไว้ในภารกิจ เช่น HELLO10)
      if (h.practice && !st.coupon) { toast('รีสอร์ทตัวอย่าง: กรุณาใส่โค้ดส่วนลด (เช่น HELLO10) แล้วกด “ใช้ส่วนลด” ก่อน จึงจะไปขั้นชำระเงินได้', 'err'); $('#cp')?.focus(); return; }
      st.step = 2; draw(); scrollTo(0, 0);
    };
  }

  function drawPay() {
    const c = calc(), set = DB.settings(), methods = payMethods(offer, h), ow = DB.owner(h.ownerId);
    if (!methods.includes(st.pay)) st.pay = methods[0] || null;
    $('#book-main').innerHTML = `${timerHtml()}
      ${payPanelHtml()}
      <div class="panel small muted"><i class="fa-solid fa-shield-halved"></i> ${ow ? `ชำระเงินตรงถึงเจ้าของรีสอร์ท <b>${esc(ow.name)}</b> · ` : ''}การจองจะสมบูรณ์เมื่อเจ้าของรีสอร์ทยืนยัน · การกด "ยืนยันการจอง" ถือว่าคุณยอมรับ<a href="#/terms" target="_blank" rel="noopener">ข้อกำหนดและเงื่อนไข</a></div>
      <label class="panel small" style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" id="tc-ok" ${st.terms ? 'checked' : ''} style="margin-top:3px"><span class="terms-lbl">${TERMS_GUEST_LABEL} <a href="#/terms" target="_blank" rel="noopener">(อ่านเงื่อนไข)</a></span></label>
      <div class="row between wrap">
        <button class="btn btn-ghost" id="back1"><i class="fa-solid fa-chevron-left"></i> ย้อนกลับ</button>
        <div class="row"><div style="text-align:right"><div class="small muted">ยอดชำระ</div><div class="price" id="pay-total">${money(c.total)}</div></div>
        <button class="btn btn-primary btn-lg" id="confirm" ${methods.length ? '' : 'disabled'}><i class="fa-solid fa-lock"></i> ยืนยันการจอง</button></div>
      </div>`;
    bindPayPanel();
    $('#back1').onclick = () => { st.step = 1; draw(); };
    $('#tc-ok').onchange = e => { st.terms = e.target.checked; };
    $('#confirm').onclick = () => {
      if (!st.pay) return;
      if (!$('#tc-ok').checked) return toast('กรุณาติ๊กยอมรับเงื่อนไขการใช้งานและการรับส่วนลดก่อนยืนยันการจอง', 'err');
      { const rm = restrictMsg(h, room.id, S.checkIn, S.checkOut); if (rm) return toast(rm, 'err'); }
      if (DB.available(room, S.checkIn, S.checkOut) < qty) return toast('ขออภัย ห้องเพิ่งถูกจองไป กรุณาเลือกห้องอื่น', 'err');
      const btn = $('#confirm'); btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังดำเนินการ...';
      // ราคา โค้ดส่วนลด และห้องว่างถูกคำนวณ/ตรวจซ้ำที่เซิร์ฟเวอร์ (sd_create_booking)
      DB.createBooking({
        hotelId: h.id, roomId: room.id, offerId: offer.id, qty, checkIn: S.checkIn, checkOut: S.checkOut,
        adults: S.adults, children: S.children, rooms: S.rooms, guest: { ...st.guest }, payment: { method: st.pay }, couponCode: st.coupon?.code || null,
      }).then(b => {
        clearInterval(bookTimer);
        go(`/booking/${b.id}?new=1`);
      }).catch(e => {
        toast(e.message, 'err');
        btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-lock"></i> ยืนยันการจอง';
      });
    };
  }
  draw();
}

// ================= Confirmation / voucher =================
function bookingStatus(b) { return b.status === 'confirmed' && b.checkOut < todayISO() ? 'completed' : b.status; }
const STATUS_TH = { confirmed: 'ยืนยันแล้ว', pending: 'รอยืนยัน', cancelled: 'ยกเลิกแล้ว', completed: 'เข้าพักแล้ว' };
const PAY_TH = { card: 'บัตรเครดิต/เดบิต', promptpay: 'พร้อมเพย์', bank: 'โอนผ่านธนาคาร', hotel: 'ชำระที่ที่พัก' };

// ================= ลูกค้ากรอกทะเบียนผู้เข้าพักเองบนมือถือ (#/checkin/<รหัสจอง>) =================
// เจ้าของรีสอร์ทกด "ให้ลูกค้ากรอกเอง" ที่การจองก่อน · ลูกค้าใส่ PIN → กรอก ถ่ายรูปบัตร เซ็นชื่อ → เข้าทะเบียนของรีสอร์ท
async function pageSelfCheckin(app, params, id) {
  const wrap = html => { app.innerHTML = `<div class="container" style="max-width:560px;padding-top:24px"><div class="panel" style="text-align:center">${html}</div></div>`; };
  const ask = msg => {
    wrap(`<h2><i class="fa-solid fa-id-card"></i> ลงทะเบียนผู้เข้าพัก</h2><p class="muted small" style="margin:6px 0 14px">การจอง <b>${esc(id)}</b> — ใส่ PIN 6 หลักที่ได้รับตอนจองเพื่อเริ่มกรอก</p>
      ${msg ? `<div class="red small" style="margin-bottom:10px">${esc(msg)}</div>` : ''}
      <form id="sc-f" style="display:flex;gap:8px;justify-content:center"><input name="pin" inputmode="numeric" autocomplete="off" maxlength="6" placeholder="PIN 6 หลัก" style="max-width:160px;text-align:center;font-size:18px"><button class="btn btn-primary">ถัดไป</button></form>`);
    $('#sc-f').onsubmit = e => { e.preventDefault(); start(e.target.pin.value.trim()); };
  };
  const start = async pin => {
    if (!/^\d{4,6}$/.test(pin)) return ask('กรุณาใส่ PIN ที่ได้รับตอนจอง');
    wrap('<p class="muted"><i class="fa-solid fa-spinner fa-spin"></i> กำลังตรวจสอบ...</p>');
    let b, st;
    try { b = await DB.lookupBooking(id, pin); st = await DB.checkinSelfStatus(id, pin); } catch (e) { return ask(e.message); }
    if (!b) return ask('ไม่พบการจอง หรือ PIN ไม่ถูกต้อง');
    if (st.done) return wrap('<h2><i class="fa-solid fa-circle-check green"></i> กรอกทะเบียนเรียบร้อยแล้ว</h2><p class="muted">ขอบคุณครับ/ค่ะ — แสดงรหัสจองกับเจ้าหน้าที่ตอนเช็คอินได้เลย</p>');
    if (!st.open) return wrap('<h2><i class="fa-solid fa-hourglass-half"></i> ที่พักยังไม่เปิดให้กรอก</h2><p class="muted">กรุณาแจ้งเจ้าหน้าที่ที่พัก แล้วลองใหม่อีกครั้ง หรือกรอกที่เคาน์เตอร์ตอนเช็คอิน</p>');
    const begin = async () => {
      const r = await ckForm(b, { self: { pin } });
      if (r === 'saved') wrap('<h2><i class="fa-solid fa-circle-check green"></i> ส่งทะเบียนเรียบร้อยแล้ว</h2><p class="muted">ขอบคุณครับ/ค่ะ — แสดงรหัสจองกับเจ้าหน้าที่ตอนเช็คอินได้เลย<br><b>' + esc(b.id) + '</b></p>');
    };
    wrap(`<h2><i class="fa-solid fa-id-card"></i> ลงทะเบียนผู้เข้าพัก</h2>
      <p class="muted small" style="margin:6px 0 14px">${esc(b.hotelName)} · ${b.qty} × ${esc(b.roomName)}<br>${fmtDate(b.checkIn, false)} – ${fmtDate(b.checkOut, false)}</p>
      <p class="small" style="text-align:left;margin:0 0 14px">เตรียม <b>บัตรประชาชนหรือพาสปอร์ต</b> ของผู้เข้าพักทุกท่าน — ระบบจะให้ถ่ายรูปเอกสาร และเซ็นชื่อบนหน้าจอ ข้อมูลเก็บเป็นความลับ เห็นเฉพาะรีสอร์ทนี้ และลบอัตโนมัติเมื่อครบ 45 วัน</p>
      <button class="btn btn-primary btn-lg" id="sc-go"><i class="fa-solid fa-play"></i> เริ่มกรอกทะเบียน</button>`);
    $('#sc-go').onclick = begin;
  };
  const saved = LS.get('mybk', []).find(x => x.id === id.toUpperCase());
  saved?.pin ? start(saved.pin) : ask('');
}
// เจ้าของกดเช็คอิน / เปิดให้ลูกค้ากรอกแล้ว → ปุ่มกรอกทะเบียนผู้เข้าพักบนมือถือลูกค้า (ปิดเมื่อกรอกแล้ว เช็คเอาท์ หรือยกเลิก)
const selfCheckinBannerHtml = b => b.selfCheckin && typeof b.selfCheckin === 'object' && !b.selfCheckinDoneAt && !b.checkedOutAt && b.status !== 'cancelled'
  ? `<div class="panel" style="border:2px solid var(--primary,#1a5fd0);text-align:center"><h2 style="margin:0 0 6px"><i class="fa-solid fa-id-card"></i> กรอกทะเบียนผู้เข้าพัก</h2>
      <p class="small muted" style="margin:0 0 12px">ที่พักเปิดให้กรอกแล้ว — เตรียมบัตรประชาชนหรือพาสปอร์ตของผู้เข้าพัก ใช้เวลาไม่ถึง 2 นาที</p>
      <a class="btn btn-primary btn-lg" href="#/checkin/${esc(b.id)}"><i class="fa-solid fa-pen-to-square"></i> กรอกทะเบียนเข้าพัก</a></div>` : '';
// ใบยืนยันการจอง (Voucher) — ใช้ร่วมกันระหว่างหน้าลูกค้าและหน้าต่างดูใบยืนยันในหลังบ้าน
function voucherHtml(b, st) {
  const h = DB.hotel(b.hotelId), o = DB.owner(b.ownerId || h?.ownerId);
  return `<div class="panel" id="voucher">
      <div class="row between wrap"><h2 style="margin:0">ใบยืนยันการจอง (Voucher)</h2><span class="status ${st}">${STATUS_TH[st]}</span></div>
      <div class="row wrap" style="gap:20px;margin-top:16px;align-items:flex-start">
        ${h ? imgTag(h.images[0], 400, '', h.id).replace('<img', '<img style="width:200px;height:150px;object-fit:cover;border-radius:10px"') : ''}
        <div style="flex:1;min-width:220px"><h3 style="margin:0">${esc(b.hotelName)}</h3>${h ? starsHtml(h.stars) + `<div class="small muted">${esc(h.address)}</div>` : ''}
          <div class="small" style="margin-top:8px">หมายเลขการจอง: <b>${b.id}</b> · PIN: <b>${b.pin}</b><br>จองเมื่อ: ${fmtDateTime(b.createdAt)}</div>
          ${o ? `<div class="small" style="margin-top:8px"><i class="fa-solid fa-hotel"></i> ดำเนินการโดย <b>${esc(o.name)}</b>${o.phone ? ` · <a href="tel:${esc(o.phone)}">${esc(o.phone)}</a>` : ''}${o.line ? ` · LINE ${esc(o.line)}` : ''}${o.facebook ? ` · <a href="${esc(o.facebook)}" target="_blank" rel="noopener"><i class="fa-brands fa-facebook"></i> Facebook</a>` : ''}</div>` : ''}</div>
      </div>
      <div class="sum-dates" style="margin-top:16px"><div><div class="small muted">เช็คอิน</div><b>${fmtDate(b.checkIn)}</b><div class="small muted">ตั้งแต่ ${h?.checkIn || '14:00'}</div></div><div><div class="small muted">เช็คเอาท์</div><b>${fmtDate(b.checkOut)}</b><div class="small muted">ก่อน ${h?.checkOut || '12:00'}</div></div></div>
      <table class="policy-table">
        <tr><td>ผู้เข้าพักหลัก</td><td>${esc(b.guest.firstName)} ${esc(b.guest.lastName)}<br><span class="small muted">${esc(b.guest.email)} · ${esc(b.guest.phone)}</span></td></tr>
        <tr><td>ห้องพัก</td><td>${b.qty} x ${esc(b.roomName)} · ${b.nights} คืน<br><span class="small muted">ผู้ใหญ่ ${b.adults}${b.children ? `, เด็ก ${b.children}` : ''}</span></td></tr>
        <tr><td>สิทธิประโยชน์</td><td>${b.offer.breakfast ? 'รวมอาหารเช้า' : 'ไม่รวมอาหารเช้า'} · ${b.offer.freeCancel ? `ยกเลิกได้ล่วงหน้า ${CANCEL_MIN_DAYS} วัน (ได้ถึงวันที่ ${fmtDate(addDays(b.checkIn, -CANCEL_MIN_DAYS), false)}) — เจ้าของที่พักยืนยันและโอนเงินคืน` : 'ไม่สามารถคืนเงินได้'}</td></tr>
        ${b.addons?.length ? `<tr><td>บริการเสริมที่ขอ</td><td>${b.addons.map(a => `${esc(a.name)}${a.qty > 1 ? ' x' + a.qty : ''} (${+a.price ? money(a.price * a.qty) : 'ฟรี'})`).join('<br>')}<br><span class="small muted">ยังไม่รวมในยอดค่าห้อง — ทีมงาน kohlarngo จะติดต่อกลับ</span></td></tr>` : ''}
        ${b.guest.requests?.length || b.guest.note ? `<tr><td>คำขอพิเศษ</td><td>${esc([...(b.guest.requests || []), b.guest.note].filter(Boolean).join(', '))}</td></tr>` : ''}
        <tr><td>การชำระเงิน</td><td>${PAY_TH[b.payment.method]}${b.payment.last4 ? ` (${b.payment.brand} •••• ${b.payment.last4})` : ''} — ${b.payment.paid ? '<span class="green bold">ชำระแล้ว</span>' : b.payment.slip ? '<span class="bold">ส่งสลิปแล้ว รอตรวจสอบ</span>' : '<span class="red bold">ยังไม่ได้ชำระ</span>'}</td></tr>
        ${b.refund != null ? `<tr><td>การคืนเงิน</td><td>${b.refund > 0 ? money(b.refund) + ' (เจ้าของรีสอร์ทเป็นผู้คืนเงิน)' : 'ไม่มีการคืนเงิน'}</td></tr>` : ''}
        ${b.cancelReq ? `<tr><td>คำขอยกเลิก</td><td>${{ pending: '<span class="bold">ส่งคำขอแล้ว — รอเจ้าของที่พักยืนยัน</span>', approved: '<span class="green bold">เจ้าของที่พักยืนยันแล้ว</span>', rejected: `<span class="red bold">เจ้าของที่พักปฏิเสธ</span>${b.cancelReq.reason ? ' — ' + esc(b.cancelReq.reason) : ''}` }[b.cancelReq.status] || ''}<br><span class="small muted">โอนคืนเข้า ${esc(b.cancelReq.bank)} ${esc(b.cancelReq.account)} (${esc(b.cancelReq.name)})${b.refundedAt ? ' · <span class="green">โอนเงินคืนแล้ว</span>' : ''}</span></td></tr>` : ''}
      </table>
      <div style="max-width:380px;margin-left:auto;margin-top:14px">
        <div class="sum-row"><span>ราคาห้องพัก</span><span>${money(b.price.room)}</span></div>
        ${b.price.member ? `<div class="sum-row green"><span>ส่วนลดสมาชิก</span><span>-${money(b.price.member)}</span></div>` : ''}
        ${b.price.coupon ? `<div class="sum-row green"><span>โค้ด ${esc(b.price.couponCode)}</span><span>-${money(b.price.coupon)}</span></div>` : ''}
        ${b.price.tax ? `<div class="sum-row"><span>ภาษีและค่าธรรมเนียม</span><span>${money(b.price.tax)}</span></div>` : ''}
        <div class="sum-row total"><span>รวมทั้งหมด</span><span>${money(b.price.total)}</span></div>
      </div>
    </div>`;
}
// บริการเสริมหลังจอง — เฉพาะการจองทั่วไป (ไม่ใช่ VIP) · รายการนักพัฒนากำหนดที่ settings.extraServices · ติ๊กแล้วคำขอเข้าหน้า dev (ผู้ให้บริการเป็นของแพลตฟอร์ม ไม่ใช่เจ้าของรีสอร์ท)
function addonsHtml(b, st) {
  const h = DB.hotel(b.hotelId), list = DB.settings().extraServices || [];
  if (!h || isVip(h) || !list.length || ['cancelled', 'completed'].includes(st)) return '';
  const cur = Object.fromEntries((b.addons || []).map(a => [a.id, a.qty]));
  return `<div class="panel" id="addons-box"><h3 style="margin:0 0 4px"><i class="fa-solid fa-bell-concierge"></i> บริการเสริม</h3>
    <p class="small muted" style="margin:0 0 10px">เลือกบริการที่ต้องการ ทีมงาน kohlarngo จะติดต่อกลับเพื่อยืนยัน (ราคาด้านล่างยังไม่รวมในยอดค่าห้อง)</p>
    ${list.map(x => `<label class="row between" style="gap:10px;padding:8px 0;border-top:1px solid #eee"><span style="flex:1"><input type="checkbox" data-ad="${esc(x.id)}" ${cur[x.id] ? 'checked' : ''}> <b>${esc(x.name)}</b>${x.desc ? `<span class="small muted" style="display:block;margin-left:22px">${esc(x.desc)}</span>` : ''}</span><b>${+x.price ? money(x.price) : 'ฟรี'}</b></label>`).join('')}
    <div class="row" style="justify-content:flex-end;margin-top:10px;gap:10px">${b.addonsAt ? `<span class="small green" style="align-self:center"><i class="fa-solid fa-circle-check"></i> ส่งคำขอแล้ว ${fmtDateTime(b.addonsAt)}</span>` : ''}<button class="btn btn-primary" id="ad-send">ส่งคำขอบริการเสริม</button></div></div>`;
}
function pageBookingView(app, params, id) {
  const b = DB.booking(id);
  if (!b) { app.innerHTML = `<div class="container"><div class="empty" style="margin-top:30px"><h3>ไม่พบการจองนี้</h3><a href="#/my-bookings" class="btn btn-primary">การจองของฉัน</a></div></div>`; return; }
  const st = bookingStatus(b);
  const isNew = params.get('new');
  const rejected = b.status === 'cancelled' && b.cancelledBy && b.cancelledBy !== 'ลูกค้า';
  app.innerHTML = `<div class="container" style="max-width:900px;padding-top:20px">
    ${isNew ? `<div class="panel confirm-hero"><i class="fa-solid fa-paper-plane big"></i><h1>ส่งคำขอจองแล้ว — รอเจ้าของรีสอร์ทยืนยัน</h1>
      <p class="muted">${['promptpay', 'bank'].includes(b.payment.method) ? 'ชำระเงินและแนบสลิปด้านล่าง เจ้าของรีสอร์ทจะตรวจสอบและยืนยันการจอง' : 'เจ้าของรีสอร์ทจะตรวจสอบห้องว่างและยืนยันการจองโดยเร็ว'}</p>
      <div class="muted small">หมายเลขการจอง</div><div class="bk-id">${b.id}</div><div class="small muted">PIN: ${b.pin} — ค้นหาการจองได้ที่ "การจองของฉัน" ด้วยอีเมลและเบอร์โทรที่กรอกตอนจอง</div></div>` : ''}
    ${rejected ? `<div class="notice warn"><i class="fa-solid fa-circle-xmark"></i><div><b>เจ้าของรีสอร์ทปฏิเสธการจองนี้</b>${b.cancelReason ? ` — ${esc(b.cancelReason)}` : ''}<br>หากโอนเงินไปแล้ว กรุณาติดต่อเจ้าของรีสอร์ทเพื่อขอรับเงินคืน</div></div>` : ''}
    ${st === 'pending' && b.payment.method === 'hotel' ? '<div class="notice info"><i class="fa-solid fa-hourglass-half"></i><div>รอเจ้าของรีสอร์ทยืนยันการจอง — ชำระเงินที่ที่พักในวันเข้าพัก</div></div>' : ''}
    ${selfCheckinBannerHtml(b)}
    ${payBoxHtml(b, st)}
    ${addonsHtml(b, st)}
    ${voucherHtml(b, st)}
    <div class="row wrap" style="justify-content:center">
      <button class="btn btn-outline" onclick="window.print()"><i class="fa-solid fa-print"></i> พิมพ์ / บันทึก PDF</button>
      ${cancelBtnHtml(b, st)}
      <a class="btn btn-primary" href="#/my-bookings">การจองทั้งหมดของฉัน</a>
    </div>
  </div>`;
  $('#cancel-bk')?.addEventListener('click', () => cancelBooking(b, () => pageBookingView(app, new URLSearchParams(), id)));
  $('#ad-send')?.addEventListener('click', async e => {
    const items = $$('[data-ad]:checked', app).map(c => ({ id: c.dataset.ad, qty: 1 })); e.target.disabled = true;
    try { await DB.requestAddons(b, items); toast(items.length ? 'ส่งคำขอบริการเสริมแล้ว' : 'ยกเลิกบริการเสริมแล้ว'); pageBookingView(app, new URLSearchParams(), id); }
    catch (err) { toast(err.message, 'err'); e.target.disabled = false; }
  });
  $('#slip-in')?.addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    const lbl = $('#slip-lbl'); lbl.classList.add('disabled'); lbl.querySelector('span').textContent = 'กำลังส่งสลิป...';
    try { await DB.uploadSlip(b, file); toast('ส่งสลิปแล้ว — เจ้าของรีสอร์ทจะตรวจสอบและยืนยันการจอง'); }
    catch (err) { toast('ส่งสลิปไม่สำเร็จ: ' + err.message, 'err'); }
    pageBookingView(app, new URLSearchParams(), id);
  });
}
// กล่องชำระเงิน + แนบสลิป (พร้อมเพย์ / โอนธนาคาร) — เงินเข้าบัญชีเจ้าของรีสอร์ทโดยตรง
function payBoxHtml(b, st) {
  const p = b.payment;
  if (st !== 'pending' || p.paid || !['promptpay', 'bank'].includes(p.method)) return '';
  const total = b.price.total;
  const slip = `<div class="slip-box">${p.slip
    ? `<div class="notice"><i class="fa-solid fa-hourglass-half"></i><div><b>ส่งสลิปแล้ว</b> เมื่อ ${fmtDateTime(p.claimedAt)} — เจ้าของรีสอร์ทกำลังตรวจสอบยอดและจะยืนยันการจอง<br><span class="small muted">ส่งผิดรูป? แนบใหม่ได้ด้านล่าง</span></div></div>` : ''}
    <label class="btn ${p.slip ? 'btn-outline' : 'btn-primary btn-lg'}" id="slip-lbl" style="cursor:pointer"><i class="fa-solid fa-receipt"></i> <span>${p.slip ? 'แนบสลิปใหม่' : 'แนบสลิปโอนเงิน'}</span><input type="file" id="slip-in" accept="image/*" hidden></label>
    <div class="small muted" style="margin-top:6px">รูปภาพ JPG / PNG — สลิปจะถูกส่งให้เจ้าของรีสอร์ทและผู้ดูแลระบบเท่านั้น</div></div>`;
  if (p.method === 'promptpay' && p.payTo) return `<div class="panel pp-box"><h2 style="margin-top:0"><i class="fa-solid fa-qrcode"></i> ชำระเงินด้วยพร้อมเพย์</h2>
    <div class="row wrap" style="gap:24px;align-items:center">
      <div class="pp-qr"><img src="${promptpayQr(p.payTo, total)}" alt="QR พร้อมเพย์ ยอด ${money(total)}" width="220" height="220"></div>
      <div style="flex:1;min-width:220px"><div class="small muted">ยอดที่ต้องชำระ</div><div class="price" style="font-size:28px">${money(total)}</div>
        <div class="small" style="margin-top:8px">${p.payToName ? `ชื่อบัญชี <b>${esc(p.payToName)}</b><br>` : ''}พร้อมเพย์ <b>${esc(fmtPromptpay(p.payTo))}</b> · อ้างอิง <b>${b.id}</b></div>
        <ol class="small" style="margin:10px 0 0;padding-left:18px"><li>เปิดแอปธนาคาร เลือก "สแกน QR"</li><li>สแกน QR นี้ (ยอดเงินถูกใส่ไว้ให้แล้ว) แล้วโอน</li><li>แนบสลิปด้านล่าง</li></ol>
        <a class="btn btn-ghost btn-sm" href="${promptpayQr(p.payTo, total)}" download="promptpay-${b.id}.png" target="_blank" rel="noopener" style="margin-top:8px"><i class="fa-solid fa-download"></i> บันทึกรูป QR</a></div>
    </div>${slip}</div>`;
  return `<div class="panel pp-box"><h2 style="margin-top:0"><i class="fa-solid fa-building-columns"></i> ชำระเงินด้วยการโอน</h2>
    <div class="small muted">ยอดที่ต้องชำระ</div><div class="price" style="font-size:28px">${money(total)}</div>
    <p class="small" style="white-space:pre-line;margin:8px 0">${esc(p.bankInfo || '')}</p><div class="small muted">ระบุรหัสอ้างอิง <b>${b.id}</b> ในบันทึกการโอน แล้วแนบสลิปด้านล่าง</div>${slip}</div>`;
}
const fmtPromptpay = id => id.length === 10 ? `${id.slice(0, 3)}-${id.slice(3, 6)}-${id.slice(6)}` : `${id.slice(0, 1)}-${id.slice(1, 5)}-${id.slice(5, 10)}-${id.slice(10, 12)}-${id.slice(12)}`;
async function cancelBooking(b, done) {
  const send = async acct => {
    try { const nb = await DB.cancelMyBooking(b, acct); toast(nb.status === 'cancelled' ? 'ยกเลิกการจองเรียบร้อยแล้ว' : 'ส่งคำขอยกเลิกแล้ว — รอเจ้าของที่พักยืนยัน'); } catch (e) { toast(e.message, 'err'); }
    done();
  };
  if (!(b.payment.paid || b.payment.slip)) { if (await confirmBox(`ยกเลิกการจอง <b>${b.id}</b>?<br><span class="muted small">ยังไม่มีการชำระเงิน</span>`, 'ยืนยันยกเลิก')) send(null); return; }
  const m = openModal(`<h2><i class="fa-solid fa-rotate-left"></i> ขอยกเลิกการจอง <span class="small muted">· ${b.id}</span></h2>
    <p class="small muted" style="margin:8px 0 14px">ยกเลิกได้ล่วงหน้าอย่างน้อย ${CANCEL_MIN_DAYS} วันก่อนเช็คอิน · เจ้าของที่พักจะตรวจสอบและกดยืนยัน แล้วโอนเงินคืน <b>${money(b.price.total)}</b> เข้าบัญชีที่คุณกรอกด้านล่าง</p>
    <form id="cq-f" class="form-grid" novalidate>
      <div class="fg full"><label>ธนาคาร <span class="req">*</span></label><select name="bank"><option value="">— เลือกธนาคาร —</option>${BANKS_TH.map(x => `<option>${esc(x)}</option>`).join('')}</select></div>
      <div class="fg"><label>เลขบัญชี <span class="req">*</span></label><input name="account" inputmode="numeric" autocomplete="off" maxlength="20" placeholder="เฉพาะตัวเลข 10-15 หลัก"></div>
      <div class="fg"><label>ชื่อบัญชี <span class="req">*</span></label><input name="name" autocomplete="off" maxlength="100" placeholder="ชื่อ-นามสกุลตามสมุดบัญชี"></div>
    </form>
    <div class="row" style="justify-content:flex-end;gap:8px;margin-top:16px"><button class="btn btn-ghost" data-close><i class="fa-solid fa-arrow-left"></i> ย้อนกลับ</button><button class="btn btn-danger" id="cq-ok"><i class="fa-solid fa-paper-plane"></i> ส่งคำขอยกเลิก</button></div>`);
  $('#cq-ok', m).onclick = () => {
    const f = $('#cq-f', m).elements, acct = { bank: f.bank.value, account: f.account.value.replace(/\D/g, ''), name: f.name.value.trim() };
    if (!acct.bank) return toast('กรุณาเลือกธนาคาร', 'err');
    if (acct.account.length < 10 || acct.account.length > 15) return toast('เลขบัญชีต้องเป็นตัวเลข 10-15 หลัก', 'err');
    if (acct.name.length < 2) return toast('กรุณากรอกชื่อบัญชี', 'err');
    closeModal(); send(acct);
  };
}
function cancelBtnHtml(b, st) {
  if (st !== 'confirmed' && st !== 'pending') return '';
  if (b.cancelReq?.status === 'pending') return '<span class="small muted">ส่งคำขอยกเลิกแล้ว — รอเจ้าของที่พักยืนยัน</span>';
  if (cancelDaysLeft(b) < CANCEL_MIN_DAYS) return `<span class="small muted">ยกเลิกได้ถึงวันที่ ${fmtDate(addDays(b.checkIn, -CANCEL_MIN_DAYS), false)} (ล่วงหน้า ${CANCEL_MIN_DAYS} วัน) — ตอนนี้เลยกำหนดแล้ว กรุณาติดต่อเจ้าของที่พัก</span>`;
  return `<button class="btn btn-danger" id="cancel-bk"><i class="fa-solid fa-xmark"></i> ${b.payment.paid || b.payment.slip ? 'ขอยกเลิกการจอง' : 'ยกเลิกการจอง'}</button>`;
}

// ================= My bookings =================
function pageMyBookings(app, params) {
  const u = DB.currentUser();
  const tab = params.get('tab') || 'upcoming';
  const all = DB.bookings().filter(b => u ? (b.userId === u.id || b.guest.email.toLowerCase() === u.email.toLowerCase()) : false);
  const groups = { upcoming: all.filter(b => ['confirmed', 'pending'].includes(bookingStatus(b))), completed: all.filter(b => bookingStatus(b) === 'completed'), cancelled: all.filter(b => b.status === 'cancelled') };
  app.innerHTML = `<div class="container" style="padding-top:24px;max-width:980px">
    <h1 class="sec-title">การจองของฉัน</h1>
    ${!u ? `<div class="panel"><h3>ค้นหาการจอง</h3><p class="small muted">ใส่อีเมลและเบอร์โทรที่กรอกตอนจอง หรือเข้าสู่ระบบเพื่อดูการจองทั้งหมด</p>
      <div class="form-grid"><div class="fg"><label>อีเมล</label><input id="f-email" type="email" autocomplete="email" placeholder="name@example.com"></div><div class="fg"><label>เบอร์โทร</label><input id="f-phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="08x-xxx-xxxx"></div></div>
      <div class="row" style="margin-top:14px"><button class="btn btn-primary" id="f-go">ค้นหา</button><button class="btn btn-outline" data-auth2>เข้าสู่ระบบ</button></div>
      <div id="f-res" style="margin-top:14px"></div></div>` : `
    <div class="tabs-line">${[['upcoming', 'กำลังจะมาถึง'], ['completed', 'เข้าพักแล้ว'], ['cancelled', 'ยกเลิกแล้ว']].map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? 'active' : ''}">${l} (${groups[k].length})</button>`).join('')}</div>
    ${groups[tab].length ? groups[tab].map(b => {
      const h = DB.hotel(b.hotelId); const st = bookingStatus(b);
      const reviewed = DB.reviewsAll().some(r => r.bookingId === b.id);
      return `<div class="bk-card">${h ? imgTag(h.images[0], 400, '', h.id) : '<div></div>'}
        <div><div class="row" style="gap:8px"><span class="status ${st}">${STATUS_TH[st]}</span><span class="small muted">#${b.id}</span></div>
          <h3 style="margin:6px 0 2px">${esc(b.hotelName)}</h3><div class="small muted">${h ? esc(h.city) : ''}</div>
          <div class="small" style="margin-top:6px"><i class="fa-regular fa-calendar"></i> ${fmtDate(b.checkIn)} – ${fmtDate(b.checkOut)} · ${b.nights} คืน<br><i class="fa-solid fa-bed"></i> ${b.qty} x ${esc(b.roomName)}</div></div>
        <div style="text-align:right;display:flex;flex-direction:column;gap:8px;align-items:flex-end"><div class="bold" style="font-size:18px">${money(b.price.total)}</div>
          <a class="btn btn-outline btn-sm" href="#/booking/${b.id}">ดูรายละเอียด</a>
          ${st === 'completed' && !reviewed ? `<button class="btn btn-primary btn-sm" data-review="${b.id}"><i class="fa-solid fa-star"></i> เขียนรีวิว</button>` : ''}
          ${st === 'completed' || st === 'cancelled' ? `<a class="btn btn-ghost btn-sm" href="#/hotel/${b.hotelId}">จองอีกครั้ง</a>` : ''}
        </div></div>`;
    }).join('') : `<div class="empty"><i class="fa-solid fa-suitcase-rolling"></i><h3>ไม่มีรายการ</h3><a href="#/search" class="btn btn-primary">ค้นหาที่พัก</a></div>`}`}
  </div>`;
  $$('[data-tab]', app).forEach(b => b.onclick = () => go(`/my-bookings?tab=${b.dataset.tab}`));
  $('[data-auth2]', app)?.addEventListener('click', () => authModal('login'));
  $('#f-go', app)?.addEventListener('click', async () => {
    let err = '';
    const list = await DB.findBookings($('#f-email').value.trim(), $('#f-phone').value.trim()).catch(e => { err = e.message; return null; });
    if (!list?.length) return toast(err || 'ไม่พบการจอง กรุณาตรวจสอบอีเมลและเบอร์โทรที่กรอกตอนจอง', 'err');
    if (list.length === 1) return go(`/booking/${list[0].id}`);
    $('#f-res').innerHTML = list.map(b => `<a class="bk-card" href="#/booking/${b.id}" style="text-decoration:none;color:inherit"><div><div class="row" style="gap:8px"><span class="status ${bookingStatus(b)}">${STATUS_TH[bookingStatus(b)]}</span><span class="small muted">#${b.id}</span></div><h3 style="margin:6px 0 2px">${esc(b.hotelName)}</h3><div class="small"><i class="fa-regular fa-calendar"></i> ${fmtDate(b.checkIn)} – ${fmtDate(b.checkOut)} · ${b.nights} คืน</div></div></a>`).join('');
  });
  $$('[data-review]', app).forEach(btn => btn.onclick = () => reviewModal(DB.booking(btn.dataset.review), () => pageMyBookings(app, params)));
}
function reviewModal(b, done) {
  let score = 9;
  const m = openModal(`<h2>รีวิวการเข้าพัก</h2><p class="small muted">${esc(b.hotelName)}</p>
    <div class="fg"><label>คะแนน (1-10)</label><div class="row"><input type="range" min="1" max="10" step="0.5" value="9" id="rv-s" style="flex:1"><span class="score"><b id="rv-v">9.0</b></span></div></div>
    <div class="fg" style="margin-top:12px"><label>หัวข้อ</label><input id="rv-t" placeholder="สรุปการเข้าพักของคุณ"></div>
    <div class="fg" style="margin-top:12px"><label>รายละเอียด</label><textarea id="rv-x" rows="4" placeholder="เล่าประสบการณ์ของคุณ"></textarea></div>
    <div class="fg" style="margin-top:12px"><label>ประเภทการเดินทาง</label><select id="rv-trip">${['คู่รัก', 'ครอบครัว', 'เดินทางคนเดียว', 'กลุ่มเพื่อน', 'ธุรกิจ'].map(x => `<option>${x}</option>`).join('')}</select></div>
    <button class="btn btn-primary btn-block" style="margin-top:16px" id="rv-go">ส่งรีวิว</button>`);
  $('#rv-s', m).oninput = e => { score = +e.target.value; $('#rv-v', m).textContent = score.toFixed(1); };
  $('#rv-go', m).onclick = async () => {
    const t = $('#rv-t', m).value.trim(), x = $('#rv-x', m).value.trim();
    if (!t || !x) return toast('กรุณากรอกหัวข้อและรายละเอียด', 'err');
    // คะแนนเฉลี่ยของที่พักถูกคำนวณใหม่ที่เซิร์ฟเวอร์
    try { await DB.addReview({ bookingId: b.id, trip: $('#rv-trip', m).value, score, title: t, text: x }); } catch (e) { return toast(e.message, 'err'); }
    closeModal(); toast('ขอบคุณสำหรับรีวิว!'); done();
  };
}

// ================= Profile / help =================
function pageProfile(app) {
  const u = DB.currentUser();
  if (!u) { app.innerHTML = '<div class="container"><div class="empty" style="margin-top:30px"><h3>กรุณาเข้าสู่ระบบ</h3><button class="btn btn-primary" id="lg">เข้าสู่ระบบ</button></div></div>'; $('#lg').onclick = () => authModal('login'); return; }
  app.innerHTML = `<div class="container" style="max-width:640px;padding-top:24px"><h1 class="sec-title">ข้อมูลส่วนตัว</h1>
    <form class="panel form-grid" id="pf"><div class="fg full"><label>ชื่อ-นามสกุล</label><input name="name" value="${esc(u.name)}"></div>
    <div class="fg"><label>อีเมล</label><input value="${esc(u.email)}" disabled></div><div class="fg"><label>เบอร์โทร</label><input name="phone" value="${esc(u.phone || '')}"></div>
    <div class="fg full"><label>รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)</label><input name="pass" type="password"></div>
    <div class="full"><button class="btn btn-primary">บันทึก</button></div></form></div>`;
  $('#pf').onsubmit = async e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    if (f.pass && f.pass.length < 6) return toast('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', 'err');
    if (f.pass) { const r = await DB.changePassword(null, f.pass); if (r.error) return toast(r.error, 'err'); }
    DB.updateUser(u.id, { name: f.name.trim() || u.name, phone: f.phone.trim() });
    toast('บันทึกข้อมูลแล้ว'); render();
  };
}
// ช่องทางติดต่อ: เจ้าของรีสอร์ท (ถ้ามี) ไม่ก็ของ kohlarngo จากหน้าตั้งค่า — ไม่มีค่าไหนก็ไม่แสดงปุ่ม
function contactOf(h) {
  const s = DB.settings(), o = h && DB.owner(h.ownerId);
  const tel = String((o && o.phone) || s.phone || '').replace(/[^\d+]/g, '');
  const line = (o && o.line) || cleanContact(h?.social?.line) || s.line || '';
  return { tel: tel.length >= 8 ? tel : '', line: line ? socialUrl('line', line) : '' };
}
function pageHelp(app) {
  const s = DB.settings();
  const faq = [
    ['จะยกเลิกการจองได้อย่างไร?', 'ไปที่ "การจองของฉัน" เลือกการจองที่ต้องการ แล้วกด "ยกเลิกการจอง" หากห้องเป็นแบบยกเลิกฟรีและยังไม่ถึงวันก่อนเช็คอิน คุณจะได้รับเงินคืนเต็มจำนวน'],
    ['ราคาที่แสดงรวมภาษีหรือไม่?', 'ราคาที่แสดงเป็นราคาสุทธิ ไม่มีค่าธรรมเนียมหรือภาษีเพิ่ม ราคารวมทั้งหมดจะแสดงในขั้นตอนการจอง'],
    ['ใครเป็นผู้ยืนยันการจองและรับเงิน?', 'ที่พักแต่ละแห่งดำเนินการโดยเจ้าของรีสอร์ทเอง — คุณโอนเงินตรงถึงเจ้าของรีสอร์ท แนบสลิป แล้วเจ้าของรีสอร์ทจะตรวจสอบและยืนยันการจอง หากมีปัญหาติดต่อทีมงาน kohlarngo ได้ตลอด'],
    ['ชำระเงินด้วยวิธีใดได้บ้าง?', 'พร้อมเพย์ (สแกน QR จากแอปธนาคารใดก็ได้) โอนผ่านธนาคาร และชำระที่ที่พัก (เฉพาะห้องที่ระบุ) — ยังไม่รับบัตรเครดิต'],
    ['ค้นหาการจองโดยไม่มีบัญชีได้ไหม?', 'ได้ ใส่อีเมลและเบอร์โทรที่กรอกตอนจองในหน้า "การจองของฉัน"'],
  ];
  app.innerHTML = `<div class="container" style="max-width:800px;padding-top:24px"><h1 class="sec-title">ศูนย์ช่วยเหลือ</h1>
    ${faq.map(([q, a]) => `<details class="panel"><summary class="bold" style="cursor:pointer">${q}</summary><p style="margin:10px 0 0">${a}</p></details>`).join('')}
    <div class="panel"><h3>ติดต่อเรา</h3><p class="small">${[s.phone && `<a href="tel:${esc(s.phone.replace(/[^\d+]/g, ''))}"><i class="fa-solid fa-phone"></i> ${esc(s.phone)}</a>`, s.email && `<a href="mailto:${esc(s.email)}"><i class="fa-solid fa-envelope"></i> ${esc(s.email)}</a>`, s.line && `<a href="${esc(socialUrl('line', s.line))}" target="_blank" rel="noopener"><i class="fa-brands fa-line"></i> LINE ${esc(s.line)}</a>`].filter(Boolean).join(' · ')}${[!s.phone && 'เบอร์โทร', !s.email && 'อีเมล', !s.line && 'LINE'].filter(Boolean).map(x => ` <span class="muted">${x}: รอกรอกเพิ่มเติม</span>`).join(' · ')}</p></div></div>`;
}

// ================= เว็บจองส่วนตัว (VIP) =================
// #/vip/<id หรือ slug> — หน้าเว็บของรีสอร์ทเดียว แบรนด์ของรีสอร์ทเอง (ไม่มีเมนู kohlarngo / รีสอร์ทอื่น / โฆษณา)
// ใช้ห้อง ราคา และขั้นตอนจองชุดเดียวกับหน้ารีสอร์ทปกติ · ตั้งค่าได้ที่หลังบ้านเจ้าของ เมนู "เว็บจองส่วนตัว (VIP)"
const VIP_COLOR = '#12305a';
const vipColor = h => /^#[0-9a-f]{6}$/i.test(h?.vip?.color || '') ? h.vip.color : VIP_COLOR;
// จำรีสอร์ท VIP ที่ลูกค้าเข้ามาไว้ในแท็บนี้ — หน้าจอง / ยืนยันการจอง คงแบรนด์รีสอร์ทต่อ · ออกไปหน้าอื่นของเว็บหลัก = เลิกจำ
function vipSiteHotel(path, params) {
  let id = null;
  const m = path.match(/^\/vip\/([\w-]+)$/);
  try {
    if (m) { id = DB.hotel(m[1])?.id; if (id) sessionStorage.setItem('sd_vip', id); }
    else if (/^\/(book|booking\/\w+|checkin\/\w+|my-bookings|profile)$/.test(path)) id = sessionStorage.getItem('sd_vip');
    else sessionStorage.removeItem('sd_vip');
  } catch {}
  const h = id && DB.hotel(id);
  if (!h || !isVip(h) || (path === '/book' && params.get('h') !== h.id)) return null;
  return h;
}
function vipHeaderHtml(h) {
  const c = contactOf(h), home = `#/vip/${h.slug || h.id}?${searchQuery()}`;
  return `<header class="vip-head"><div class="container vip-head-in">
    <a class="vip-logo" href="${home}"><i class="fa-solid fa-crown"></i><span><b>${esc(h.name)}</b><small>${esc(h.area || h.city || '')}</small></span></a>
    <nav>${c.tel ? `<a href="tel:${esc(c.tel)}" title="โทร"><i class="fa-solid fa-phone"></i></a>` : ''}${c.line ? `<a href="${esc(c.line)}" target="_blank" rel="noopener" title="LINE"><i class="fa-brands fa-line"></i></a>` : ''}
      <a class="vip-cta-sm" href="${vipHref(h, 'search')}">จองห้องพัก</a></nav></div></header>`;
}
function vipFooterHtml(h) {
  const c = contactOf(h);
  return `<footer class="vip-foot"><div class="container"><b><i class="fa-solid fa-crown"></i> ${esc(h.name)}</b>
    <div class="small">${esc(h.address || '')}${c.tel ? ` · <a href="tel:${esc(c.tel)}">${esc(c.tel)}</a>` : ''}</div>
    <div class="small muted">ระบบจองโดย kohlarngo · <a href="#/terms">เงื่อนไขการใช้บริการ</a></div></div></footer>`;
}
const vipSvcIcon = t => [[/สปา|นวด/, 'fa-spa'], [/อาหาร|ห้องอาหาร|ดื่ม|บาร์/, 'fa-utensils'], [/สนามบิน|รับส่ง|รถตู้/, 'fa-van-shuttle'], [/เช่า|รถ|มอเตอร์|จยย/, 'fa-motorcycle'], [/ซัก|รีด|ทำความสะอาด/, 'fa-shirt'], [/ฟิตเนส|ยิม|สระ/, 'fa-dumbbell'], [/เรือ|ดำน้ำ|ทัวร์/, 'fa-ship']].find(([re]) => re.test(t))?.[1] || 'fa-bell-concierge';

// หน้าจอแบบแอป (ตามดีไซน์): s= (ว่าง) หน้าแรก · search ค้นหา/เลือกวัน · rooms รายละเอียดรีสอร์ท+ประเภทห้อง · room เลือกห้อง · services บริการเพิ่มเติม
// ขั้นกรอกข้อมูลผู้เข้าพัก / ชำระเงิน / รายละเอียดการจอง ใช้หน้าจองเดิม (#/book, #/booking) ในธีม VIP
const vipHref = (h, s = '', extra = {}) => `#/vip/${h.slug || h.id}?${searchQuery({ ...(s ? { s } : {}), ...extra })}`;
const vipTop = (title, back) => `<div class="va-top"><a class="va-ib" href="${back}" aria-label="ย้อนกลับ"><i class="fa-solid fa-chevron-left"></i></a><b>${title}</b><span class="va-ib-sp"></span></div>`;
function vipTabs(h, on) {
  const c = contactOf(h);
  const t = [['home', 'fa-house', 'หน้าแรก', vipHref(h)], ['bk', 'fa-regular fa-calendar-check', 'การจอง', '#/my-bookings'], ['msg', 'fa-regular fa-envelope', 'ข้อความ', c.line || (c.tel ? 'tel:' + c.tel : '')], ['acc', 'fa-regular fa-user', 'บัญชี', '#/profile']];
  return `<nav class="va-tabs">${t.map(([k, i, l, href]) => `<a class="${k === on ? 'on' : ''}" href="${esc(href || 'javascript:')}"${/^https?:/.test(href) ? ' target="_blank" rel="noopener"' : ''}><i class="${i.includes(' ') ? i : 'fa-solid ' + i}"></i>${l}</a>`).join('')}</nav>`;
}
// ปุ่มเลื่อนรูป ซ้าย/ขวา + ตัวนับ 1/N บนแกลเลอรีเว็บ VIP
const vipGalNav = n => `<button class="va-nav prev" aria-label="รูปก่อนหน้า"><i class="fa-solid fa-chevron-left"></i></button><button class="va-nav next" aria-label="รูปถัดไป"><i class="fa-solid fa-chevron-right"></i></button><span class="va-gal-n"><b class="va-gal-i">1</b>/${n}</span>`;
const vipRoomAvail = (h, r) => restrictMsg(h, r.id, S.checkIn, S.checkOut) ? 0 : DB.available(r, S.checkIn, S.checkOut);
const vipRoomAmen = r => [['fa-wifi', 'WiFi'], ['fa-snowflake', 'เครื่องปรับอากาศ'], ['fa-shower', 'ห้องน้ำส่วนตัว'], r.breakfast && ['fa-mug-saucer', 'อาหารเช้า'], r.view && ['fa-mountain-sun', r.view]].filter(Boolean);

// ข้อความบนหน้าเว็บ VIP ที่เจ้าของแก้ได้ (h.vip.text) — ค่าตั้งต้นตามดีไซน์
const VIP_TEXT = { searchTitle: 'ค้นหาห้องพัก', galleryTitle: 'บรรยากาศรีสอร์ท', roomsTitle: 'ประเภทห้องพัก', pickBtn: 'เลือกห้องพัก', aboutTitle: 'เกี่ยวกับที่พัก',
  roomTitle: 'เลือกห้องพัก', roomAmenTitle: 'สิ่งอำนวยความสะดวกในห้อง', bookBtn: 'จองเลย', svcPage: 'บริการเพิ่มเติม', svcNote: 'กดที่บริการเพื่อสอบถาม/สั่งกับรีสอร์ทโดยตรง' };

function pageVip(app, params, id) {
  readSearchFromParams(params);
  // โหมดตัวอย่างในหน้าตั้งค่าเว็บ (iframe ของหลังบ้าน): ใช้ค่าที่ยังไม่บันทึกจาก window.__vipDraft + ใส่ data-vedit ให้กดแก้ได้
  const pv = params.get('preview') === '1';
  let h0 = DB.hotel(id);
  if (pv && h0 && window.__vipDraft) h0 = { ...h0, vip: { ...h0.vip, ...window.__vipDraft } };
  const h = withVip(h0);
  if (!h || !isVip(h) || (h.active === false && !pv && !h.practice)) { // รีสอร์ทเดโม/ฝึกใช้งาน (active:false) เปิดเว็บ VIP ได้ด้วยลิงก์ตรง
    app.innerHTML = `<div class="container"><div class="empty" style="margin-top:30px"><h3>ไม่พบเว็บจองนี้ หรือยังไม่เปิดใช้งาน</h3>${h && h.active !== false ? `<a href="#/hotel/${h.id}" class="btn btn-primary">ดูหน้ารีสอร์ท</a>` : '<a href="#/" class="btn btn-primary">กลับหน้าแรก</a>'}</div></div>`;
    return;
  }
  document.body.classList.add('vip-app');
  document.body.classList.toggle('vip-edit', pv);
  document.body.style.setProperty('--vip', vipColor(h));
  const v = h.vip, s = params.get('s') || '', c = contactOf(h);
  const T = k => esc(v.text?.[k] || VIP_TEXT[k]);
  // E(k): ทำให้กดแก้ได้ในจอตัวอย่าง + สีตัวอักษร (h.vip.tcolor) + ตำแหน่ง/ขนาด/จัดแนว ที่เจ้าของขยับไว้ (h.vip.tpos = {x, y, s, a})
  const tc = (k, extra = []) => {
    const st = [...extra], col = v.tcolor?.[k], ps = v.tpos?.[k] || {};
    if (/^#[0-9a-f]{6}$/i.test(col || '')) st.push('color:' + col);
    const x = Math.max(-400, Math.min(400, Math.round(+ps.x || 0))), y = Math.max(-800, Math.min(800, Math.round(+ps.y || 0))), sc = Math.max(0.5, Math.min(2.5, +ps.s || 1));
    if (x || y || sc !== 1) st.push(`transform:translate(${x}px,${y}px) scale(${sc})`);
    if (['left', 'center', 'right'].includes(ps.a)) st.push('text-align:' + ps.a);
    return st.length ? ` style="${st.join(';')}"` : '';
  };
  const E = (k, extra) => (pv ? ` data-vedit="${k}"` : '') + tc(k, extra);
  // ปุ่ม/กรอบ "จองห้องพัก" หน้าแรก: รูปแบบ (h.vip.ctaStyle) + สีพื้น (h.vip.ctaBg)
  const ctaSt = ['pill', 'solid', 'outline', 'glass', 'square', 'gold'].includes(v.ctaStyle) ? v.ctaStyle : 'pill';
  const ctaBg = /^#[0-9a-f]{6}$/i.test(v.ctaBg || '') ? v.ctaBg : '';
  const imgs = h.images.filter(Boolean);
  const allImgs = [...imgs, ...h.rooms.map(r => r.img)];
  const hide = v.hide || {}; // ส่วนที่เจ้าของรีสอร์ทปิดไว้ (gallery / about / svc / tabs)
  const svc = hide.svc ? [] : String(v.services || '').split('\n').map(x => x.trim()).filter(Boolean).slice(0, 12).map(x => { const [t, ...d] = x.split(/\s+-\s+|\|/); return [t.trim(), d.join(' ').trim()]; });
  const dateLine = `${fmtDate(S.checkIn)} – ${fmtDate(S.checkOut)} · ${nights()} คืน · ${guestsText()}`;
  const top = (k, back) => vipTop(`<span${E(k)}>${T(k)}</span>`, back);
  let html = '';

  if (!s) { // 1) หน้าแรก
    html = `<div class="va va-home${hide.tabs ? ' no-tabs' : ''}"><div${E('images')}>${imgTag(imgs[0], 1200, 'va-home-bg', h.id)}<div class="va-home-shade"></div></div>
      <div class="va-brand"><span${E('logo')}>${v.logo ? `<img class="va-logo" src="${esc(imgUrl(v.logo, 300))}" alt="">` : '<i class="fa-solid fa-hotel"></i>'}</span><b${E('brand')}>${esc(v.brand || h.name)}</b><small${E('brandSub')}>${esc(v.brandSub || [h.type, h.area].filter(Boolean).join(' · ') || 'HOTELS & RESORTS')}</small></div>
      <div class="va-home-txt"><h1${E('tagline')}>${esc(v.tagline || 'พักผ่อน… ให้ทุกการเดินทางพิเศษกว่าเดิม')}</h1><p${E('sub')}>${esc(v.sub || 'ที่พักคุณภาพ ในทุกช่วงเวลาของคุณ')}</p>
        <a class="va-pill va-pill--${ctaSt}" href="${vipHref(h, 'search')}"${E('cta', ctaBg ? [ctaSt === 'outline' ? 'border-color:' + ctaBg : 'background:' + ctaBg] : [])}><i class="fa-regular fa-calendar-check"></i> ${esc(v.cta || 'จองห้องพัก')}</a></div>
      ${hide.tabs ? '' : `<div${E('tabs')}>${vipTabs(h, 'home')}</div>`}</div>`;
  } else if (s === 'search') { // 2) ค้นหา / เลือกวัน
    html = `<div class="va va-page">${top('searchTitle', vipHref(h))}
      <div class="va-loc"><i class="fa-solid fa-location-dot"></i><div><b>${esc(h.name)}</b><small>${esc([h.area, h.city].filter(Boolean).join(', '))}</small></div></div>
      <div class="va-sb">${searchBoxHtml()}</div>
      <div class="va-tiles">
        <a href="${vipHref(h, 'rooms')}"><i class="fa-solid fa-bed"></i>ห้องพักทั้งหมด</a>
        ${h.lat && h.lng ? `<a href="https://www.google.com/maps/search/?api=1&query=${h.lat},${h.lng}" target="_blank" rel="noopener"><i class="fa-solid fa-location-dot"></i>แผนที่</a>` : ''}
        ${svc.length ? `<a href="${vipHref(h, 'services')}"><i class="fa-solid fa-bell-concierge"></i>${T('svcPage')}</a>` : `<a href="${vipHref(h, 'rooms')}"><i class="fa-solid fa-tags"></i>ราคาดีที่สุด</a>`}</div>
      ${imgs.length > 1 && !hide.gallery ? `<div${E('gallery')}><h3 class="va-h"${E('galleryTitle')}>${T('galleryTitle')}</h3><div class="va-dest">${imgs.slice(0, 6).map((u, i) => `<button data-vimg="${i}">${imgTag(u, 400, '', h.id + i)}</button>`).join('')}</div></div>` : ''}</div>`;
  } else if (s === 'room') { // 5) เลือกห้อง
    const r = h.rooms.find(x => x.id === params.get('room')) || h.rooms[0];
    const ri = h.rooms.indexOf(r), avail = vipRoomAvail(h, r), offers = offersFor(r);
    const pics = [r.img, ...(r.imgs || [])].filter(Boolean);
    const maxQ = Math.max(1, Math.min(avail, 8)), defQ = Math.min(maxQ, Math.max(S.rooms, Math.ceil((S.adults + S.children) / r.maxGuests)));
    html = `<div class="va va-page has-bar">${top('roomTitle', vipHref(h, 'rooms'))}
      <div class="va-gal va-gal-room"><div class="va-gal-track">${pics.map((u, i) => `<div data-rpi="${i}">${imgTag(u, 900, '', r.id + i)}</div>`).join('')}</div>${pics.length > 1 ? vipGalNav(pics.length) : ''}</div>
      <h2 class="va-title">${esc(r.name)}</h2>
      <div class="va-meta"><span><i class="fa-solid fa-up-right-and-down-left-from-center"></i> ${r.size} ตร.ม.</span><span><i class="fa-solid fa-bed"></i> ${esc(r.bed)}</span><span><i class="fa-solid fa-user-group"></i> ผู้เข้าพัก ${r.maxGuests} คน</span></div>
      ${pics.length > 1 ? `<div class="va-thumbs">${pics.slice(0, 8).map((u, i) => `<button data-rpic="${i}" class="${i ? '' : 'on'}">${imgTag(u, 300, '', r.id + i)}</button>`).join('')}</div>` : ''}
      <h3 class="va-h"${E('roomAmenTitle')}>${T('roomAmenTitle')}</h3>
      <div class="va-amen">${vipRoomAmen(r).map(([i, l]) => `<div><span><i class="fa-solid ${i}"></i></span>${esc(l)}</div>`).join('')}</div>
      <div class="va-date"><i class="fa-regular fa-calendar"></i> ${dateLine} <a href="${vipHref(h, 'search')}">เปลี่ยน</a></div>
      ${avail <= 0 ? `<div class="va-card">${soldRoomHtml(h, r, restrictMsg(h, r.id, S.checkIn, S.checkOut))}</div>` : `
      <h3 class="va-h">เลือกแพ็กเกจ</h3>
      <div class="va-offers">${offers.map((o, i) => { const q = quoteOffer(r, o, 1); return `<label class="va-offer"><input type="radio" name="vo" value="${o.id}" ${i ? '' : 'checked'}>
        <div><b>${o.breakfast ? 'รวมอาหารเช้า' : 'ไม่รวมอาหารเช้า'}</b><small>${o.freeCancel ? 'ยกเลิกได้ล่วงหน้า ' + CANCEL_MIN_DAYS + ' วัน' : 'ไม่สามารถคืนเงินได้'}${o.payAtHotel ? ' · ชำระที่ที่พักได้' : ''}</small></div>
        <span>${q.perNightOrig > q.perNight ? `<s>${money(q.perNightOrig)}</s>` : ''}<b>${money(q.perNight)}</b><small>/ คืน</small></span></label>`; }).join('')}</div>
      <div class="va-qty"><span>จำนวนห้อง</span><select id="va-q">${Array.from({ length: maxQ }, (_, i) => `<option value="${i + 1}" ${i + 1 === defQ ? 'selected' : ''}>${i + 1} ห้อง</option>`).join('')}</select></div>`}
      ${avail > 0 ? `<div class="va-bar"><div><small>ราคารวม ${nights()} คืน</small><b id="va-tot"></b><small>รวมภาษีและค่าบริการ</small></div><button class="va-btn" id="va-book"${E('bookBtn')}>${T('bookBtn')}</button></div>` : ''}</div>`;
  } else if (s === 'services') { // 8) บริการเพิ่มเติม
    html = `<div class="va va-page">${top('svcPage', vipHref(h, 'search'))}
      <div class="va-banner"${E('svcImg')}>${imgTag(v.svcImg || imgs[1] || imgs[0], 900, '', h.id)}<b${E('svcTitle')}>${v.svcTitle ? esc(v.svcTitle) : 'เพิ่มความสะดวกสบาย<br>ให้การเข้าพักของคุณ'}</b></div>
      <div class="va-list"${E('services')}>${svc.map(([t, d]) => `<a href="${esc(c.line || (c.tel ? 'tel:' + c.tel : 'javascript:'))}"${c.line ? ' target="_blank" rel="noopener"' : ''}><span><i class="fa-solid ${vipSvcIcon(t + ' ' + d)}"></i></span><div><b>${esc(t)}</b>${d ? `<small>${esc(d)}</small>` : ''}</div><i class="fa-solid fa-chevron-right"></i></a>`).join('') || '<p class="muted small" style="padding:16px">ยังไม่มีบริการเพิ่มเติม</p>'}</div>
      <p class="small muted va-note"${E('svcNote')}>${T('svcNote')}</p></div>`;
  } else { // 3-4) รายละเอียดรีสอร์ท + ประเภทห้องพัก
    const best = DB.cheapest(h, S);
    const amen = h.amenities.map(amenInfo).filter(Boolean).slice(0, 5);
    const stars = Math.round(h.rating / 2) || h.stars || 0;
    html = `<div class="va va-page has-bar">
      <div class="va-gal"${E('images')}>${imgs.length > 1 ? vipGalNav(imgs.length) : ''}<div class="va-gal-track" id="va-gal">${imgs.map((u, i) => `<div data-vimg="${i}">${imgTag(u, 1000, '', h.id + i)}</div>`).join('')}</div>
        <a class="va-ib va-gal-back" href="${vipHref(h, 'search')}" aria-label="ย้อนกลับ"><i class="fa-solid fa-chevron-left"></i></a>
        <div class="va-gal-act"><button class="va-ib" id="va-share" aria-label="แชร์"><i class="fa-solid fa-arrow-up-from-bracket"></i></button><span class="fav-inline">${favBtn(h.id)}</span></div>
        </div>
      <div class="va-sheet">
        <h2 class="va-title">${esc(h.name)} ${vipBadge(h).replace('vip-badge', 'vip-badge inline')}</h2>
        ${h.reviews ? `<div class="va-rate">${'<i class="fa-solid fa-star"></i>'.repeat(Math.min(5, stars))} <b>${h.rating.toFixed(1)}</b> <span>(${h.reviews.toLocaleString()} รีวิว)</span></div>` : starsHtml(h.stars)}
        ${h.address ? `<div class="va-addr"><i class="fa-solid fa-location-dot"></i> ${esc(h.address)}</div>` : ''}
        ${amen.length ? `<div class="va-amen">${amen.map(a => `<div><span><i class="fa-solid ${a[0]}"></i></span>${esc(a[1])}</div>`).join('')}</div>` : ''}
        <div class="va-date"><i class="fa-regular fa-calendar"></i> ${dateLine} <a href="${vipHref(h, 'search')}">เปลี่ยน</a></div>
        <h3 class="va-h" id="va-rooms"${E('roomsTitle')}>${T('roomsTitle')}</h3>
        ${h.rooms.map(r => { const a = vipRoomAvail(h, r), q = DB.quote(r, S.checkIn, S.checkOut); return `<a class="va-rm${a > 0 ? '' : ' sold'}" href="${vipHref(h, 'room', { room: r.id })}">${imgTag(r.img, 300, '', r.id)}
          <div><b>${esc(r.name)}</b><small>${r.size} ตร.ม. | ${esc(r.bed)}</small>${a > 0 ? `<span class="va-price">${money(q.perNight)} <small>/ คืน</small></span>${a <= 3 ? `<small class="red">เหลือ ${a} ห้อง</small>` : ''}` : '<small class="red bold">เต็มในวันที่เลือก</small>'}</div><i class="fa-solid fa-chevron-right"></i></a>`; }).join('')}
        ${h.description && !hide.about ? `<div${E('about')}><h3 class="va-h"${E('aboutTitle')}>${T('aboutTitle')}</h3><p class="small">${esc(h.description)}</p></div>` : ''}
        <h3 class="va-h">นโยบายที่พัก</h3><p class="small">เช็คอิน ${esc(h.checkIn)} น. · เช็คเอาท์ ${esc(h.checkOut)} น.</p>
        ${svc.length ? `<a class="va-link" href="${vipHref(h, 'services')}"><i class="fa-solid fa-bell-concierge"></i> ${T('svcPage')} (${svc.length})<i class="fa-solid fa-chevron-right"></i></a>` : ''}
      </div>
      <div class="va-bar"><div>${best ? `<b>${money(best.perNight)}</b><small>ต่อคืน · รวมภาษีและค่าบริการ</small>` : '<b class="red" style="font-size:15px">ห้องเต็มในวันที่เลือก</b>'}</div><button class="va-btn" id="va-pick"${E('pickBtn')}>${best ? T('pickBtn') : 'เปลี่ยนวัน'}</button></div></div>`;
  }
  app.innerHTML = `<div class="va-wrap">${html}</div>`;

  // ---------- bind ----------
  $$('[data-vimg]', app).forEach(el => el.onclick = () => lightbox(allImgs, +el.dataset.vimg));
  $$('[data-rimg]', app).forEach(el => el.onclick = () => lightbox(allImgs, imgs.length + +el.dataset.rimg));
  // แกลเลอรีเลื่อนได้: ปัดนิ้ว / ปุ่มลูกศร / รูปย่อ · ตัวเลข 1/N อัปเดตตามรูปที่เห็น
  $$('.va-gal', app).forEach(g => {
    const tr = $('.va-gal-track', g), n = tr.children.length, to = i => tr.scrollTo({ left: Math.max(0, Math.min(n - 1, i)) * tr.clientWidth, behavior: 'smooth' });
    const cur = () => Math.round(tr.scrollLeft / tr.clientWidth);
    tr.addEventListener('scroll', () => { const i = cur(); const c = $('.va-gal-i', g); if (c) c.textContent = i + 1; $$('[data-rpic]', app).forEach((b, k) => g.classList.contains('va-gal-room') && b.classList.toggle('on', k === i)); }, { passive: true });
    $('.va-nav.prev', g)?.addEventListener('click', e => { e.stopPropagation(); to(cur() - 1); });
    $('.va-nav.next', g)?.addEventListener('click', e => { e.stopPropagation(); to(cur() + 1); });
    if (g.classList.contains('va-gal-room')) $$('[data-rpic]', app).forEach(b => b.onclick = () => to(+b.dataset.rpic));
  });
  $$('[data-rpi]', app).forEach(el => el.onclick = () => { const r = h.rooms.find(x => x.id === params.get('room')) || h.rooms[0]; lightbox([r.img, ...(r.imgs || [])].filter(Boolean), +el.dataset.rpi); });
  if (s === 'search') bindSearchBox(app, () => go(vipHref(h, 'rooms').slice(1)));
  if (s === 'rooms') {
    bindFavs(app);
    $('#va-share', app).onclick = () => { copyText(vipLink(h)); toast('คัดลอกลิงก์เว็บจองแล้ว'); };
    // ปุ่ม "เลือกห้องพัก": ไปหน้าเลือกห้องของห้องที่ถูกที่สุดที่ยังว่าง (เต็มหมด = ไปเปลี่ยนวัน)
    $('#va-pick', app).onclick = () => { const b = DB.cheapest(h, S); go(b?.room ? vipHref(h, 'room', { room: b.room.id }).slice(1) : vipHref(h, 'search').slice(1)); };
  }
  if (s === 'room' && $('#va-book', app)) {
    const r = h.rooms.find(x => x.id === params.get('room')) || h.rooms[0];
    const oid = () => $('input[name=vo]:checked', app)?.value, qty = () => +$('#va-q', app).value;
    const upd = () => { $('#va-tot', app).textContent = money(quoteOffer(r, offersFor(r).find(o => o.id === oid()), qty()).sub); };
    $$('input[name=vo]', app).forEach(x => x.onchange = upd); $('#va-q', app).onchange = upd; upd();
    $('#va-book', app).onclick = () => go(`/book?h=${h.id}&room=${r.id}&o=${oid()}&n=${qty()}&${searchQuery()}`);
  }
}

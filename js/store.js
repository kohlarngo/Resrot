// ชั้นข้อมูล (data layer) — ข้อมูลหลักเก็บใน Supabase (ตาราง sd_*) และสิทธิ์ถูกบังคับที่ฐานข้อมูลด้วย RLS
// DB อ่านจากแคชในหน่วยความจำ (โหลดตอนเปิดเว็บ / หลังล็อกอิน) เพื่อให้หน้าเว็บเรนเดอร์ได้ทันที
// การเขียนทั่วไปอัปเดตแคชทันทีแล้วส่งไปฐานข้อมูลเบื้องหลัง — ถ้าล้มเหลวจะแจ้งเตือนและโหลดข้อมูลจริงใหม่
// งานที่ต้องให้เซิร์ฟเวอร์ตัดสิน (จอง ยกเลิก โค้ดส่วนลด รีวิว ล็อกอิน) เป็นฟังก์ชัน async
const SUPABASE_URL = 'https://whtomiamqwhhdrllibix.supabase.co';
const SUPABASE_KEY = 'sb_publishable_zNqyiYcujJvjcTKthvo_Kw_EuGWsKCL'; // publishable key — เปิดเผยได้ ความปลอดภัยอยู่ที่ RLS
// PKCE: ล็อกอินด้วย Google / Facebook กลับมาเป็น ?code=... (ไม่ใช้ #access_token เพราะหน้าเว็บใช้ hash เป็นเส้นทาง)
// owner / admin แยก session คนละคีย์ (เข้าพร้อมกันได้) · dev ใช้คีย์เดียวกับหน้าเว็บลูกค้า เพื่อให้ "แก้ไขหน้าเว็บ" (โหมดแก้ไขบน index.html) เห็นว่าล็อกอินเป็นนักพัฒนาอยู่
const supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { storageKey: /^(owner|admin)$/.test(window.PORTAL) ? 'sd_auth_' + window.PORTAL : 'sd_auth', flowType: 'pkce' } });

// ค่าที่เก็บเฉพาะในเบราว์เซอร์นี้ (การค้นหาล่าสุด รายการโปรด การจองที่ทำแบบไม่ล็อกอิน)
const LS = {
  get(k, d) { try { const v = localStorage.getItem('sd_' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('sd_' + k, JSON.stringify(v)); } catch (e) { console.warn(e); } },
  del(k) { try { localStorage.removeItem('sd_' + k); } catch {} },
};
const LOCAL_KEYS = ['search', 'recent', 'favs', 'mybk'];
// ล้างข้อมูลระบบเดิมที่เคยเก็บใน localStorage (เวอร์ชันก่อนย้ายไป Supabase)
['hotels', 'coupons', 'users', 'bookings', 'reviews', 'session', 'seedVersion', 'staffSeed', 'audit', 'errors', 'settings', 'flags', 'sos', 'sos_contacts'].forEach(LS.del);

const TAX_RATE = 0; // ไม่คิดภาษี/ค่าธรรมเนียมเพิ่ม (เดิม 0.177 = ค่าบริการ 10% + VAT 7%) — ต้องตรงกับ sd_create_booking ในฐานข้อมูล

// แคชข้อมูลจากฐานข้อมูล — แต่ละคนเห็นเฉพาะแถวที่ RLS อนุญาต
// ข้อมูลตัวอย่างชุดเก่า (สร้างก่อนมีสลิปปลอม) → แนบสลิปปลอมให้การจองภารกิจ “อนุมัติ” ตอนแสดงผล ไม่แตะฐานข้อมูล
const demoSlip = b => {
  if (b?.practice?.kind === 'approve' && b.status === 'pending' && !b.payment?.slip && !b.payment?.paid)
    return { ...b, payment: { ...b.payment, slip: 'assets/demo/slip-demo.svg', claimedAt: b.createdAt } };
  return b;
};
const CACHE = { pubAds: [], ads: [], pubCoupons: null, loaded: false, hotels: [], owners: {}, kv: {}, occ: [], pubReviews: [], me: null, bookings: [], profiles: [], coupons: [], reviews: [], audit: [], errors: [], sos: [] };
let lastLocalWrite = 0;

async function fetchAll(build) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build().range(from, from + 999);
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000) return out;
  }
}
async function rpc(fn, args) {
  const { data, error } = await supa.rpc(fn, args);
  if (error) throw new Error(error.message);
  if (data && data.error) throw new Error(data.error); // ฟังก์ชันที่ตรวจ PIN คืน {error} แทน raise เพื่อให้ตัวนับล็อกไม่ถูก rollback
  return data;
}
function dbWrite(req, what) {
  lastLocalWrite = Date.now();
  return Promise.resolve(req).then(r => { if (r?.error) throw r.error; return r; }).catch(e => {
    console.error(what, e);
    logError('db', `${what}: ${e?.message || e}`);
    toast(`บันทึกไม่สำเร็จ (${what}): ${e?.message || e}`, 'err');
    DB.load().then(render);
  });
}
const toUser = p => p && { id: p.id, name: p.name, email: p.email, phone: p.phone, role: p.role, active: p.active, lastLogin: p.last_login, createdAt: p.created_at, createdBy: p.created_by,
  perms: p.perms ?? null, employerId: p.employer_id || null, ownerStatus: p.owner_status, ownerNote: p.owner_note, appliedAt: p.applied_at, biz: p.biz || {}, payout: p.payout || {} };
const toReview = r => ({ id: r.id, bookingId: r.booking_id, hotelId: r.hotel_id, userId: r.user_id, name: r.name, country: r.country, trip: r.trip, score: +r.score, title: r.title, text: r.text, room: r.room, date: r.date });
const toCoupon = c => ({ code: c.code, type: c.type, value: +c.value, min: +c.min_amount, desc: c.description, active: c.active, ownerId: c.owner_id, image: c.image || '', maxUses: c.max_uses ?? null, hasMax: 'max_uses' in c });
const fromCoupon = c => ({ code: c.code, type: c.type, value: +c.value, min_amount: +c.min || 0, description: c.desc || '', active: !!c.active, owner_id: c.ownerId || null, ...(c.image ? { image: c.image } : {}), ...(c.maxUses || c.hasMax ? { max_uses: c.maxUses || null } : {}) });
const toAd = a => ({ id: a.id, kind: a.kind, advertiser: a.advertiser, hotelId: a.hotel_id || '', title: a.title, body: a.body, image: a.image, link: a.link, phone: a.phone, line: a.line,
  start: a.start_date, end: a.end_date, active: a.active, fee: +a.fee || 0, paid: a.paid, note: a.note, views: a.views, clicks: a.clicks, fit: a.fit || {} });
const fromAd = a => ({ kind: a.kind, advertiser: a.advertiser, hotel_id: a.kind === 'featured' ? a.hotelId : null, title: a.title, body: a.body, image: a.image, link: a.link, phone: a.phone, line: a.line,
  start_date: a.start, end_date: a.end, active: !!a.active, fee: +a.fee || 0, paid: !!a.paid, note: a.note, fit: a.fit || {} });
const byNaturalId = (a, b) => a.id.localeCompare(b.id, 'en', { numeric: true });

const DB = {
  // โหลดข้อมูลทั้งหมดที่ผู้ใช้ปัจจุบันมีสิทธิ์เห็น
  async load() {
    const [hotels, kv, occ, pub, owners, pubCp, pubAds, { data: { session } }] = await Promise.all([
      fetchAll(() => supa.from('sd_hotels').select('data')),
      supa.from('sd_kv').select('key,value'),
      fetchAll(() => supa.rpc('sd_occupancy')),
      fetchAll(() => supa.rpc('sd_public_reviews')),
      fetchAll(() => supa.rpc('sd_public_owners')),
      supa.rpc('sd_public_coupons').then(r => (r.error ? null : r.data || [])).catch(() => null), // โค้ดส่วนลดสาธารณะ (null = ฐานข้อมูลยังไม่มีฟังก์ชันนี้)
      supa.rpc('sd_public_ads').then(r => (r.error ? [] : r.data || [])).catch(() => []), // โฆษณาที่กำลังแสดง (ไม่มีข้อมูลราคา)
      supa.auth.getSession(),
    ]);
    CACHE.pubAds = pubAds;
    CACHE.owners = Object.fromEntries(owners.map(o => [o.id, { ...o, phone: cleanContact(o.phone), line: cleanContact(o.line), facebook: /^https:\/\//i.test(o.facebook || '') ? o.facebook : '' }]));
    if (kv.error) throw kv.error;
    // รีสอร์ทที่สร้างจากระบบ (ตัวอย่าง/ฝึกใช้งาน) อาจยังไม่มีฟิลด์รายการ — เติมค่าว่างกันหน้าเว็บพัง
    CACHE.hotels = hotels.map(r => {
      const h = { highlights: [], amenities: [], images: [], rooms: [], checkIn: '14:00', checkOut: '12:00', address: '', description: '', ...r.data };
      h.rooms = h.rooms.map((rm, i) => ({ img: h.images[i % (h.images.length || 1)] || 'assets/demo/demo-1.jpg', ...rm }));
      return h;
    }).sort(byNaturalId);
    CACHE.kv = Object.fromEntries(kv.data.map(r => [r.key, r.value]));
    CACHE.occ = occ.map(r => ({ roomId: r.room_id, checkIn: r.check_in, checkOut: r.check_out, qty: r.qty }));
    CACHE.pubReviews = pub; CACHE.pubCoupons = pubCp;
    Object.assign(CACHE, { me: null, svcReq: [], ads: [], bookings: [], profiles: [], coupons: [], reviews: [], audit: [], errors: [], sos: [] });
    if (session) {
      let { data: p } = await supa.from('sd_profiles').select('*').eq('id', session.user.id).maybeSingle();
      const meta = session.user.user_metadata || {}; // Google / Facebook ส่งชื่อมาเป็น full_name หรือ name
      if (!p) p = await rpc('sd_ensure_profile', { p_name: meta.name || meta.full_name || null, p_phone: null }).catch(() => null);
      if (p?.active === false) await supa.auth.signOut();
      else { CACHE.me = toUser(p); if (CACHE.me) CACHE.me.termsAt = meta.termsAt || null; } // วันที่ลูกค้ายอมรับเงื่อนไข (เก็บใน metadata ของบัญชี)
    }
    if (CACHE.me) {
      const none = Promise.resolve([]);
      const [bookings, profiles, coupons, reviews, audit, errors, sos, ads] = await Promise.all([
        fetchAll(() => supa.from('sd_bookings').select('data').order('created_at', { ascending: false })).then(r => r.map(x => x.data).map(demoSlip)),
        isAdmin(CACHE.me) || can('staff.manage') ? fetchAll(() => supa.from('sd_profiles').select('*').order('created_at')).then(r => r.map(toUser)) : Promise.resolve([CACHE.me]),
        can('coupons.edit') ? fetchAll(() => supa.from('sd_coupons').select('*').order('created_at')).then(r => r.map(toCoupon)) : none,
        fetchAll(() => supa.from('sd_reviews').select('*').order('created_at')).then(r => r.map(toReview)),
        isStaff(CACHE.me) ? supa.from('sd_audit').select('*').order('at', { ascending: false }).limit(1000).then(r => r.data || []) : none,
        can('dev.console') ? supa.from('sd_errors').select('*').order('at', { ascending: false }).limit(200).then(r => r.data || []) : none,
        can('sos.manage') ? fetchAll(() => supa.from('sd_sos').select('data').order('at', { ascending: false })).then(r => r.map(x => x.data)) : none,
        can('ads.manage') ? fetchAll(() => supa.from('sd_ads').select('*').order('created_at', { ascending: false })).then(r => r.map(toAd)) : none,
      ]);
      const svcReq = can('hotels.media') ? await supa.from('sd_service_requests').select('*').eq('status', 'new').order('created_at').then(r => r.data || []) : [];
      Object.assign(CACHE, { bookings, profiles, coupons, reviews, audit, errors, sos, ads, svcReq });
    }
    // การจองที่ทำจากเครื่องนี้โดยไม่ล็อกอิน — ดึงด้วยรหัส + PIN (เฉพาะหน้าเว็บลูกค้า ไม่ปนกับหลังบ้าน)
    const extra = PORTAL ? [] : await Promise.all(LS.get('mybk', []).filter(x => !CACHE.bookings.some(b => b.id === x.id))
      .map(x => rpc('sd_get_booking', { p_id: x.id, p_pin: x.pin }).catch(() => null)));
    CACHE.bookings.push(...extra.filter(Boolean));
    CACHE.loaded = true;
    watchRealtime();
  },

  // ---- Hotels ----
  // ในหน้าเจ้าของรีสอร์ท (owner.html) เห็นเฉพาะที่พักของตัวเอง
  hotels(all = false) {
    const list = PORTAL === 'owner' && CACHE.me ? CACHE.hotels.filter(h => h.ownerId === bossId(CACHE.me)) : CACHE.hotels;
    return all ? list : list.filter(x => x.active !== false && !x.banned);
  },
  hotel(id) { return CACHE.hotels.find(h => h.id === id) || CACHE.hotels.find(h => h.slug && h.slug === id); },
  saveHotel(hotel) {
    const i = CACHE.hotels.findIndex(h => h.id === hotel.id);
    if (i >= 0) CACHE.hotels[i] = hotel; else CACHE.hotels.push(hotel);
    // ที่พักที่มีอยู่แล้ว = อัปเดตอย่างเดียว (ไม่แตะเจ้าของ) — นักพัฒนาแก้ได้แต่สร้าง/ลบรีสอร์ทไม่ได้ จึงใช้ upsert ไม่ได้ · ที่พักใหม่ = สร้าง
    // RLS ปฏิเสธการอัปเดตจะไม่ error แต่แก้ 0 แถว → ตรวจจำนวนแถวแล้วแจ้งเตือน (กันบันทึกเงียบๆ ที่ไม่สำเร็จ)
    const req = i >= 0 ? supa.from('sd_hotels').update({ data: hotel }).eq('id', hotel.id).select('id').then(r => (!r.error && !r.data?.length ? { error: new Error('ไม่มีสิทธิ์แก้ไขที่พักนี้') } : r))
      : supa.from('sd_hotels').insert({ id: hotel.id, data: hotel, owner_id: hotel.ownerId || null });
    return dbWrite(req, 'ที่พัก');
  },
  owner(id) { return CACHE.owners[id] || null; }, // ข้อมูลสาธารณะของเจ้าของรีสอร์ท
  deleteHotel(id) {
    CACHE.hotels = CACHE.hotels.filter(h => h.id !== id);
    return dbWrite(supa.from('sd_hotels').delete().eq('id', id), 'ลบที่พัก');
  },

  // ---- Availability & pricing (ต้องตรงกับ sd_price ในฐานข้อมูล) ----
  nightPrice(room, date) {
    const d = new Date(date + 'T00:00:00').getDay();
    const weekend = d === 5 || d === 6;
    // ลำดับความสำคัญ: ช่วงวันที่ (priceRules · กฎหลังสุดชนะ) > ราคาตามวันในสัปดาห์ (dayPrices) > ราคาคืนศุกร์–เสาร์ (weekendPrice · ข้อมูลเดิม) > ราคาปกติ — ต้องตรงกับ sd_price ในฐานข้อมูล
    const dow = new Date(date + 'T00:00:00').getDay();
    const rule = (room.priceRules || []).filter(x => x.from <= date && date <= x.to && +x.price > 0 && (!Array.isArray(x.days) || x.days.includes(dow))).pop();
    const dp = +room.dayPrices?.[dow];
    const orig = Math.round(rule ? +rule.price : dp > 0 ? dp : weekend && +room.weekendPrice > 0 ? +room.weekendPrice : room.price);
    const final = Math.round(orig * (1 - (room.discount || 0) / 100));
    return { orig, final };
  },
  quote(room, checkIn, checkOut, qty = 1) {
    const nights = nightsList(checkIn, checkOut);
    let orig = 0, sub = 0;
    nights.forEach(d => { const p = this.nightPrice(room, d); orig += p.orig; sub += p.final; });
    orig *= qty; sub *= qty;
    const n = nights.length || 1;
    return { nights: nights.length, orig, sub, perNight: Math.round(sub / n / qty), perNightOrig: Math.round(orig / n / qty) };
  },
  // ทีมงานใช้ข้อมูลการจองเต็ม · ลูกค้าใช้ตารางห้องที่ถูกจอง (ไม่มีข้อมูลส่วนตัว)
  // หลังบ้านใช้ข้อมูลการจองเต็ม · หน้าเว็บลูกค้าใช้ตารางห้องที่ถูกจองของทุกรีสอร์ท (ไม่มีข้อมูลส่วนตัว)
  occupancy() { return PORTAL && can('bookings.view') ? this.bookings().filter(b => b.status !== 'cancelled') : CACHE.occ; },
  bookedCount(roomId, checkIn, checkOut, excludeId) {
    const nights = nightsList(checkIn, checkOut);
    let max = 0;
    const bks = this.occupancy().filter(b => b.roomId === roomId && (!excludeId || b.id !== excludeId));
    nights.forEach(d => {
      const c = bks.filter(b => d >= b.checkIn && d < b.checkOut).reduce((s, b) => s + b.qty, 0);
      if (c > max) max = c;
    });
    return max;
  },
  available(room, checkIn, checkOut) { return Math.max(0, room.total - this.bookedCount(room.id, checkIn, checkOut)); },
  cheapest(hotel, s) {
    const guestsPerRoom = Math.ceil((s.adults + s.children) / s.rooms);
    let best = null;
    hotel.rooms.forEach(r => {
      if (r.maxGuests < guestsPerRoom && r.maxGuests * s.rooms < s.adults) return;
      if (typeof restrictMsgOfRoom === 'function' && restrictMsgOfRoom(r, s.checkIn, s.checkOut)) return; // MinLOS / CTA / CTD / ปิดขาย
      const avail = this.available(r, s.checkIn, s.checkOut);
      if (avail < s.rooms) return;
      const q = this.quote(r, s.checkIn, s.checkOut, 1);
      if (!best || q.perNight < best.perNight) best = { ...q, room: r, avail };
    });
    return best;
  },

  // ---- Bookings ----
  bookings() {
    if (PORTAL !== 'owner' || !CACHE.me) return CACHE.bookings;
    const mine = new Set(this.hotels(true).map(h => h.id));
    return CACHE.bookings.filter(b => mine.has(b.hotelId));
  },
  booking(id) { return this.bookings().find(b => b.id === id); },
  // เซิร์ฟเวอร์คำนวณราคา ตรวจโค้ดส่วนลด และตรวจห้องว่างใหม่ทั้งหมด — ราคาที่ส่งจากเบราว์เซอร์ไม่ถูกใช้
  async createBooking(input) {
    const b = await rpc('sd_create_booking', { p: input });
    CACHE.bookings.unshift(b);
    CACHE.occ.push({ roomId: b.roomId, checkIn: b.checkIn, checkOut: b.checkOut, qty: b.qty });
    LS.set('mybk', [{ id: b.id, pin: b.pin }, ...LS.get('mybk', []).filter(x => x.id !== b.id)].slice(0, 30));
    return b;
  },
  // ปิดห้อง — เซิร์ฟเวอร์ตรวจสิทธิ์เจ้าของและห้องว่าง แล้วบันทึกเป็นการจอง source = 'external' (นับเป็นห้องไม่ว่างทันที)
  async blockRooms(input) {
    const b = await rpc('sd_block_rooms', { p: input });
    CACHE.bookings.unshift(b);
    CACHE.occ.push({ roomId: b.roomId, checkIn: b.checkIn, checkOut: b.checkOut, qty: b.qty });
    return b;
  },
  updateBooking(id, patch) {
    const i = CACHE.bookings.findIndex(b => b.id === id);
    if (i < 0) return null;
    CACHE.bookings[i] = { ...CACHE.bookings[i], ...patch };
    dbWrite(supa.from('sd_bookings').update({ data: CACHE.bookings[i] }).eq('id', id), 'การจอง');
    return CACHE.bookings[i];
  },
  // ---- ทะเบียนผู้เข้าพัก (เช็คอินไม่ใช้กระดาษ) — เจ้าของรีสอร์ทนั้นเท่านั้นที่อ่านได้ (RLS) ----
  async checkinGet(bookingId) {
    const { data, error } = await supa.from('sd_checkins').select('data,created_at').eq('booking_id', bookingId).maybeSingle();
    if (error) throw error;
    return data ? { ...data.data, savedAt: data.created_at } : null;
  },
  // แอดมินเห็นเฉพาะชื่อผู้เข้าพัก (ไม่มีรูป/เลขเอกสาร/ลายเซ็น) — ฟังก์ชันฐานข้อมูลคืนเฉพาะฟิลด์เหล่านี้
  async checkinNames(bookingId) {
    const { data, error } = await supa.rpc('sd_checkin_names', { p_booking: bookingId });
    if (error) throw error;
    return data;
  },
  // นักพัฒนา: รายการทะเบียนทั้งหมด (ใหม่สุดก่อน)
  async checkinList() {
    const { data, error } = await supa.from('sd_checkins').select('booking_id,hotel_id,data,created_at').order('created_at', { ascending: false }).limit(500);
    if (error) throw error;
    return data.map(r => ({ bookingId: r.booking_id, hotelId: r.hotel_id, savedAt: r.created_at, ...r.data }));
  },
  async checkinUpload(hotelId, bookingId, blob, name, type = 'image/jpeg') {
    const path = `${hotelId}/${bookingId}/${Date.now()}-${name}.${type === 'image/png' ? 'png' : 'jpg'}`;
    const { error } = await supa.storage.from('sd-checkin').upload(path, blob, { contentType: type, upsert: false });
    if (error) throw new Error('อัปโหลดไม่สำเร็จ: ' + error.message);
    return path;
  },
  async checkinSave(hotelId, bookingId, data) {
    const { error } = await supa.from('sd_checkins').upsert({ booking_id: bookingId, hotel_id: hotelId, data, updated_at: new Date().toISOString() }, { onConflict: 'booking_id' });
    if (error) throw error;
  },
  // ลูกค้ากรอกทะเบียนเองบนมือถือ (ยืนยันด้วยรหัสจอง + PIN) — เจ้าของต้องกด "ให้ลูกค้ากรอกเอง" ที่การจองก่อน
  async checkinSelfStatus(id, pin) { return rpc('sd_checkin_status', { p_id: id, p_pin: pin }); },
  async checkinSelfSubmit(id, pin, data) { return rpc('sd_checkin_submit', { p_id: id, p_pin: pin, p_data: data }); },
  async checkinUrl(path) {
    const { data, error } = await supa.storage.from('sd-checkin').createSignedUrl(path, 300);
    return error ? null : data.signedUrl;
  },
  // ลบทะเบียน + ไฟล์รูปทั้งหมดของการจองนี้ (ใช้เมื่อพ้นระยะเวลาเก็บข้อมูล หรือแขกขอให้ลบ)
  async checkinDelete(bookingId, paths) {
    if (paths.length) await supa.storage.from('sd-checkin').remove(paths);
    const { error } = await supa.from('sd_checkins').delete().eq('booking_id', bookingId);
    if (error) throw error;
  },
  deleteBooking(id) {
    CACHE.bookings = CACHE.bookings.filter(b => b.id !== id);
    return dbWrite(supa.from('sd_bookings').delete().eq('id', id), 'ลบการจอง');
  },
  _replaceBooking(b) { const i = CACHE.bookings.findIndex(x => x.id === b.id); if (i >= 0) CACHE.bookings[i] = b; else CACHE.bookings.push(b); return b; },
  async cancelMyBooking(b, acct) {
    const nb = this._replaceBooking(await rpc('sd_request_cancel', { p_id: b.id, p_pin: b.pin, p_bank: acct?.bank || null, p_acct: acct?.account || null, p_name: acct?.name || null }));
    // คืนห้องในตารางห้องที่ถูกจอง (ใช้คำนวณห้องว่างฝั่งลูกค้า) ทันที ไม่ต้องรีเฟรชหน้า
    const i = CACHE.occ.findIndex(o => o.roomId === b.roomId && o.checkIn === b.checkIn && o.checkOut === b.checkOut && o.qty === b.qty);
    if (i >= 0 && nb.status === 'cancelled') CACHE.occ.splice(i, 1); // ยื่นคำขอยกเลิก = ยังจองห้องไว้จนกว่าเจ้าของจะยืนยัน
    return nb;
  },
  // ลูกค้าแนบสลิป → เก็บใน bucket ส่วนตัว sd-slips/<รหัสจอง>/ แล้วผูกกับการจอง (เจ้าของรีสอร์ทจะเห็นและกดอนุมัติ)
  async uploadSlip(b, file) {
    const blob = await resizeImage(file, 1600);
    const path = `${b.id}/${Date.now()}.jpg`;
    const { error } = await supa.storage.from('sd-slips').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
    if (error) throw new Error(error.message);
    return this._replaceBooking(await rpc('sd_submit_slip', { p_id: b.id, p_pin: b.pin, p_path: path }));
  },
  // บริการเสริมหลังจอง: ส่ง [{id, qty}] — เซิร์ฟเวอร์ดึงชื่อ/ราคาจากรายการที่นักพัฒนากำหนด (settings.extraServices)
  async requestAddons(b, items) { return this._replaceBooking(await rpc('sd_request_addons', { p_id: b.id, p_pin: b.pin, p_items: items })); },
  async slipUrl(path) {
    if (/^assets\/demo\//.test(path)) return path; // สลิปปลอมของข้อมูลตัวอย่าง (ไฟล์ในเว็บ ไม่ได้อยู่ใน bucket)
    const { data, error } = await supa.storage.from('sd-slips').createSignedUrl(path, 600);
    return error ? null : data.signedUrl;
  },
  async lookupBooking(id, pin) {
    const b = await rpc('sd_get_booking', { p_id: id, p_pin: pin });
    if (!b) return null;
    LS.set('mybk', [{ id: b.id, pin: b.pin }, ...LS.get('mybk', []).filter(x => x.id !== b.id)].slice(0, 30));
    return this._replaceBooking(b);
  },

  // ค้นหาด้วยอีเมล + เบอร์โทรที่กรอกตอนจอง (ไม่ต้องใช้รหัส SD... / PIN) — จำไว้ในเครื่องนี้ด้วย
  async findBookings(email, phone) {
    const list = await rpc('sd_find_bookings', { p_email: email, p_phone: phone });
    if (!Array.isArray(list) || !list.length) return [];
    LS.set('mybk', [...list.map(b => ({ id: b.id, pin: b.pin })), ...LS.get('mybk', []).filter(x => !list.some(b => b.id === x.id))].slice(0, 30));
    return list.map(b => this._replaceBooking(b));
  },

  // ---- Ads (โฆษณา) ----
  ads() { return CACHE.ads; },
  publicAds(kind) { return CACHE.pubAds.filter(a => a.kind === kind); },
  serviceRequests() { return CACHE.svcReq || []; }, // คำขอใช้บริการเสริมที่ยังไม่ได้ติดต่อกลับ (เฉพาะ dev)
  featuredIds() { return CACHE.pubAds.filter(a => a.kind === 'featured').map(a => a.hotelId); },
  // อันดับที่ dev กำหนดให้รีสอร์ทแนะนำในผลค้นหา (เก็บใน fit.rank) — 0 = ไม่กำหนด (ขึ้นบนสุด)
  featuredRank(id) { const a = CACHE.pubAds.find(x => x.kind === 'featured' && x.hotelId === id); return Math.max(0, Math.floor(+a?.fit?.rank) || 0); },
  async saveAd(ad) {
    const row = fromAd(ad);
    const req = ad.id ? supa.from('sd_ads').update(row).eq('id', ad.id).select().single() : supa.from('sd_ads').insert(row).select().single();
    const r = await dbWrite(req, 'โฆษณา'); if (!r?.data) return null;
    const saved = toAd(r.data), i = CACHE.ads.findIndex(x => x.id === saved.id);
    if (i >= 0) CACHE.ads[i] = saved; else CACHE.ads.unshift(saved);
    return saved;
  },
  deleteAd(id) { CACHE.ads = CACHE.ads.filter(a => a.id !== id); return dbWrite(supa.from('sd_ads').delete().eq('id', id), 'ลบโฆษณา'); },
  // นับการแสดงผล (ครั้งเดียวต่อโฆษณาต่อการเปิดหน้าเว็บ) และการคลิก — ไม่นับตอนเจ้าหน้าที่ดูเว็บ
  trackAd(id, what) {
    if (CACHE.me && isStaff(CACHE.me)) return;
    const seen = (this._adSeen ||= new Set()); if (what === 'view') { if (seen.has(id)) return; seen.add(id); }
    supa.rpc('sd_ad_track', { p_id: id, p_what: what }).then(() => {}, () => {});
  },

  // ---- Coupons ----
  coupons() { return CACHE.coupons; },
  saveCoupons(list) {
    const gone = CACHE.coupons.filter(c => !list.some(x => x.code === c.code)).map(c => c.code);
    CACHE.coupons = list;
    if (gone.length) dbWrite(supa.from('sd_coupons').delete().in('code', gone), 'ลบโค้ดส่วนลด');
    if (list.length) dbWrite(supa.from('sd_coupons').upsert(list.map(fromCoupon)), 'โค้ดส่วนลด');
  },
  async applyCoupon(code, amount, hotelId) {
    try { return await rpc('sd_check_coupon', { p_code: code, p_amount: amount, p_hotel: hotelId }); } catch (e) { return { error: e.message }; }
  },

  // ---- Reviews ----
  reviews(hotelId) {
    const h = this.hotel(hotelId);
    const user = CACHE.pubReviews.filter(r => r.hotelId === hotelId);
    const seed = hashNum(hotelId);
    const gen = [];
    for (let i = 0; i < (h?.reviews > 0 ? 6 : 0); i++) {
      const p = REVIEW_POOL[(seed + i * 7) % REVIEW_POOL.length];
      const adj = h ? (h.rating - 8.6) : 0;
      const d = new Date(); d.setDate(d.getDate() - (i * 11 + (seed % 9) + 3));
      gen.push({ name: p[0], country: p[1], trip: p[2], score: Math.min(10, Math.max(5, +(p[3] + adj).toFixed(1))), title: p[4], text: p[5], date: d.toISOString().slice(0, 10), room: h?.rooms[i % h.rooms.length]?.name });
    }
    return [...user.slice().reverse().map(r => ({ ...r, score: +r.score })), ...gen];
  },
  reviewsAll() { return CACHE.reviews; }, // ทีมงาน: ทั้งหมด · ลูกค้า: ของตัวเอง
  async addReview(r) { await rpc('sd_add_review', { p_booking: r.bookingId, p_score: r.score, p_title: r.title, p_text: r.text, p_trip: r.trip }); await this.load(); },
  async deleteReview(id) { await rpc('sd_delete_review', { p_id: id }); await this.load(); },

  // ---- Users / session ----
  users() { return CACHE.profiles; },
  // ---- เจ้าของรีสอร์ท ----
  // สมัครเจ้าของรีสอร์ท: รูปบัตรประชาชนเก็บใน bucket ส่วนตัว sd-idcards/<uid>/ (ผู้ดูแลแพลตฟอร์มดูได้ผ่านลิงก์ชั่วคราว)
  async applyOwner(form, idFile) {
    if (idFile) {
      const { data: { session } } = await supa.auth.getSession();
      if (!session) throw new Error('กรุณาเข้าสู่ระบบก่อน');
      const path = `${session.user.id}/${Date.now()}.jpg`;
      const { error } = await supa.storage.from('sd-idcards').upload(path, await resizeImage(idFile, 1600), { contentType: 'image/jpeg', upsert: false });
      if (error) throw new Error('อัปโหลดรูปบัตรไม่สำเร็จ: ' + error.message);
      form = { ...form, idPhoto: path };
    }
    await rpc('sd_apply_owner', { p: form }); await this.load();
  },
  async idCardUrl(path) {
    const { data, error } = await supa.storage.from('sd-idcards').createSignedUrl(path, 600);
    return error ? null : data.signedUrl;
  },
  async setOwnerStatus(id, status, note = '') { await rpc('sd_set_owner_status', { p_id: id, p_status: status, p_note: note }); await this.load(); },
  saveBusiness(biz, payout) { // ข้อมูลรีสอร์ท + บัญชีรับเงินของเจ้าของ (แก้ได้เฉพาะของตัวเอง)
    const me = CACHE.me;
    Object.assign(me, { biz: { ...me.biz, ...biz } });
    return dbWrite(supa.from('sd_profiles').update({ biz: me.biz }).eq('id', me.id), 'ข้อมูลรีสอร์ท'); // บัญชีรับเงินเปลี่ยนผ่านฟังก์ชัน sd-payout เท่านั้น (ยืนยัน OTP)
  },
  currentUser() { return CACHE.me && CACHE.me.active !== false ? CACHE.me : null; },
  async login(email, pass) {
    const { error } = await supa.auth.signInWithPassword({ email: email.trim(), password: pass });
    if (error) {
      rpc('sd_log_auth_fail', { p_email: email }).catch(() => {});
      return { error: /invalid login/i.test(error.message) ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' : error.message };
    }
    await this.load();
    if (!CACHE.me) return { error: 'บัญชีนี้ถูกระงับการใช้งาน — โปรดติดต่อเจ้าของกิจการ' };
    this.updateUser(CACHE.me.id, { lastLogin: new Date().toISOString() });
    if (isStaff(CACHE.me)) this.log('auth.login', CACHE.me.email);
    return { user: CACHE.me };
  },
  async register(name, email, pass, phone = '', marketing = false) {
    const { data, error } = await supa.auth.signUp({ email: email.trim(), password: pass, options: { data: { name: name.trim(), phone, marketing, termsAt: new Date().toISOString() } } });
    if (error) return { error: /already|exists/i.test(error.message) ? 'อีเมลนี้ถูกใช้งานแล้ว' : error.message };
    if (!data.session) return { error: 'กรุณายืนยันอีเมลจากลิงก์ที่ส่งไป แล้วเข้าสู่ระบบอีกครั้ง' };
    await rpc('sd_ensure_profile', { p_name: name.trim(), p_phone: phone });
    await this.load();
    return { user: CACHE.me };
  },
  // สมัคร / เข้าสู่ระบบด้วย Google หรือ Facebook — เบราว์เซอร์ถูกส่งไปหน้าอนุญาตของผู้ให้บริการ แล้วกลับมาที่หน้านี้พร้อม session
  // (ต้องเปิด provider ใน Supabase → Authentication → Providers และเพิ่ม URL เว็บใน Redirect URLs ก่อน)
  async loginOAuth(provider) {
    if (!/^https?:$/.test(location.protocol)) return { error: 'ต้องเปิดเว็บผ่านโดเมนจริง (https) จึงจะเข้าสู่ระบบด้วย Google / Facebook ได้' };
    try { localStorage.setItem('sd_after_login', location.hash || '#/'); } catch {}
    const { error } = await supa.auth.signInWithOAuth({ provider, options: { redirectTo: location.origin + location.pathname, queryParams: provider === 'google' ? { prompt: 'select_account' } : undefined } });
    return error ? { error: error.message } : {};
  },
  // ลูกค้าที่เข้าด้วย Google/Facebook ครั้งแรกยังไม่เคยยอมรับเงื่อนไข — บันทึกวันที่ยอมรับไว้ใน metadata ของบัญชี
  async acceptTerms() {
    const termsAt = new Date().toISOString();
    const { error } = await supa.auth.updateUser({ data: { termsAt } });
    if (error) return { error: error.message };
    if (CACHE.me) CACHE.me.termsAt = termsAt;
    return {};
  },
  async logout() {
    if (isStaff(CACHE.me)) await this.log('auth.logout', CACHE.me.email);
    await supa.auth.signOut();
    await this.load();
  },
  updateUser(id, patch) {
    const map = { name: 'name', phone: 'phone', role: 'role', active: 'active', lastLogin: 'last_login', perms: 'perms' };
    const row = Object.fromEntries(Object.entries(patch).filter(([k]) => map[k]).map(([k, v]) => [map[k], v]));
    const i = CACHE.profiles.findIndex(u => u.id === id);
    if (i >= 0) CACHE.profiles[i] = { ...CACHE.profiles[i], ...patch };
    if (CACHE.me?.id === id) CACHE.me = { ...CACHE.me, ...patch };
    dbWrite(supa.from('sd_profiles').update(row).eq('id', id), 'ข้อมูลผู้ใช้');
    return i >= 0 ? CACHE.profiles[i] : CACHE.me;
  },
  async changePassword(current, next) {
    if (current != null) {
      const { error } = await supa.auth.signInWithPassword({ email: CACHE.me.email, password: current });
      if (error) return { error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' };
    }
    const { error } = await supa.auth.updateUser({ password: next });
    return error ? { error: error.message } : {};
  },
  // เพิ่ม / รีเซ็ตรหัสผ่าน / ลบทีมงาน — ผ่าน Edge Function sd-staff (ต้องใช้ service role)
  async staffAdmin(action, payload) {
    const { data, error } = await supa.functions.invoke('sd-staff', { body: { action, ...payload } });
    if (error) {
      const body = await error.context?.json?.().catch(() => null);
      return { error: body?.error || error.message };
    }
    await this.load();
    return data;
  },

  // พนักงานของเจ้าของรีสอร์ท — Edge Function sd-owner-staff (service role) · รายชื่ออ่านตรงจากตาราง (RLS ให้เจ้าของเห็นเฉพาะพนักงานของตัวเอง)
  async ownerStaffAdmin(action, payload) {
    const { data, error } = await supa.functions.invoke('sd-owner-staff', { body: { action, ...payload } });
    if (error) { const body = await error.context?.json?.().catch(() => null); return { error: body?.error || error.message }; }
    return data || {};
  },
  async ownerStaffList() {
    const r = await supa.from('sd_profiles').select('*').eq('role', 'staff').order('created_at');
    return r.error ? [] : r.data.map(toUser);
  },

  // ---- Audit log (บันทึกการใช้งานหลังบ้าน) — ชื่อ/บทบาทถูกประทับจากฐานข้อมูล ปลอมไม่ได้ ----
  audit() { return CACHE.audit; },
  log(action, target = '') {
    const u = this.currentUser();
    if (!isStaff(u) || (u.role === 'owner' && u.ownerStatus !== 'approved')) return Promise.resolve();
    CACHE.audit.unshift({ at: new Date().toISOString(), uid: u.id, name: u.name, role: u.role, action, target: String(target).slice(0, 500) });
    return supa.from('sd_audit').insert({ action, target: String(target).slice(0, 500) }).then(({ error }) => { if (error) console.warn('audit', error); });
  },

  // ---- Settings, feature flags, เบอร์ฉุกเฉิน ----
  _kv(key, value) {
    if (value == null) { delete CACHE.kv[key]; return dbWrite(supa.from('sd_kv').delete().eq('key', key), key); }
    CACHE.kv[key] = value;
    return dbWrite(supa.from('sd_kv').upsert({ key, value, updated_at: new Date().toISOString() }), key);
  },
  settings() { const s = { ...DEFAULT_SETTINGS, ...CACHE.kv.settings }; return { ...s, phone: cleanContact(s.phone), line: cleanContact(s.line), email: s.email || DEFAULT_SETTINGS.email }; },
  saveSettings(patch) { return this._kv('settings', { ...this.settings(), ...patch }); },
  flags() { return { ...DEFAULT_FLAGS, ...CACHE.kv.flags }; },
  saveFlags(patch) { return this._kv('flags', { ...this.flags(), ...patch }); },
  // รูปทั้งเว็บที่นักพัฒนาตั้งไว้ (ดู SITE_IMAGE_SLOTS ใน data.js) — ค่า null = คืนรูปตั้งต้น
  siteImages() { return CACHE.kv.images || {}; },
  saveSiteImages(patch) {
    const next = { ...this.siteImages(), ...patch };
    Object.keys(next).forEach(k => { if (!next[k]) delete next[k]; });
    return this._kv('images', Object.keys(next).length ? next : null);
  },
  // เนื้อหาหน้าเว็บที่แก้สดได้ (Inline Content Editor): { texts: { th|en|zh: { key: ข้อความ } }, styles: { key: { color, size, bold, align } } }
  content() { const c = CACHE.kv.content || {}; return { texts: { th: {}, en: {}, zh: {}, ...c.texts }, styles: { ...c.styles } }; },
  saveContent(c) {
    const empty = !['th', 'en', 'zh'].some(l => Object.keys(c.texts[l] || {}).length) && !Object.keys(c.styles || {}).length;
    return this._kv('content', empty ? null : { texts: c.texts, styles: c.styles || {} });
  },
  sosContacts() { return CACHE.kv.sos_contacts || DEFAULT_SOS_CONTACTS; },
  saveSosContacts(list) { return this._kv('sos_contacts', list); },

  // ---- แจ้งเหตุฉุกเฉิน ----
  sos() { return CACHE.sos; },
  addSos(rec) { return supa.from('sd_sos').insert({ id: 'new', data: rec }).then(({ error }) => { if (error) logError('db', 'sos: ' + error.message); }); },
  setSosStatus(id, status) {
    const r = CACHE.sos.find(x => x.id === id);
    if (r) r.status = status;
    return dbWrite(supa.from('sd_sos').update({ status }).eq('id', id), 'สถานะแจ้งเหตุ');
  },

  // ---- Error logs ----
  errors() { return CACHE.errors; },
  clearErrors() { CACHE.errors = []; return dbWrite(supa.from('sd_errors').delete().gt('id', 0), 'ล้าง error logs'); },

  // ---- สำรอง / กู้คืน / รีเซ็ต (ตรวจสิทธิ์ data.backup / data.reset ที่เซิร์ฟเวอร์) ----
  async adminImport(payload, wipe = false) {
    lastLocalWrite = Date.now();
    const r = await rpc('sd_admin_import', { p: payload, p_wipe: wipe });
    await this.load();
    return r;
  },

  // ---- Favorites / recent (เฉพาะเครื่องนี้) ----
  favs() { return LS.get('favs', []); },
  toggleFav(id) { let f = this.favs(); f = f.includes(id) ? f.filter(x => x !== id) : [id, ...f]; LS.set('favs', f); return f.includes(id); },
  recent() { return LS.get('recent', []); },
  pushRecent(id) { LS.set('recent', [id, ...this.recent().filter(x => x !== id)].slice(0, 8)); },
};

// อัปโหลดรูปไป Supabase Storage (bucket sd-media) — ต้องมีสิทธิ์ hotels.edit
async function uploadImage(blob) {
  const path = `hotels/${CACHE.me?.id || 'platform'}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supa.storage.from('sd-media').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  return supa.storage.from('sd-media').getPublicUrl(path).data.publicUrl;
}

// รูปทั้งเว็บ: id/URL ที่ตั้งไว้ (หรือรูปตั้งต้น) · siteImgUrl = แปลงเป็น URL พร้อมใช้
// ค่ารูปของช่อง: ข้อความ URL เดียว หรือ { list: [url...], seconds } (สไลด์หลายรูป)
const siteImgVal = key => CACHE.kv.images?.[key];
const siteImgList = (key, def) => { const v = siteImgVal(key); const l = v && typeof v === 'object' ? (v.list || []).filter(Boolean) : v ? [v] : []; return l.length ? l : [def]; };
const siteImgSec = key => { const v = siteImgVal(key); return Math.min(15, Math.max(2, Math.round(+(v && typeof v === 'object' && v.seconds) || 5))); };
const siteImgId = (key, def) => siteImgList(key, def)[0];
const siteImgUrl = (key, def, w = 800) => imgUrl(siteImgId(key, def), w);
// ไอคอนแท็บ (favicon) ตามรูปที่ตั้งไว้
function applySiteIcons() {
  const icon = siteImgId('icon', 'assets/icon-192.png');
  document.querySelector('link[rel=icon]')?.setAttribute('href', icon);
  document.querySelector('link[rel=apple-touch-icon]')?.setAttribute('href', icon);
}

// เสียง "ติ๊งหน่อง" สั้นๆ ด้วย Web Audio (ไม่ต้องมีไฟล์เสียง) — เบราว์เซอร์บางตัวต้องมีการคลิกในหน้าก่อนจึงจะเล่นเสียงได้
function playDing() {
  try {
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
    const ctx = new A(), now = ctx.currentTime;
    [[880, 0], [1175, .16]].forEach(([hz, at]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = hz; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, now + at); g.gain.exponentialRampToValueAtTime(0.25, now + at + .02); g.gain.exponentialRampToValueAtTime(0.0001, now + at + .45);
      o.start(now + at); o.stop(now + at + .5);
    });
    setTimeout(() => ctx.close().catch(() => {}), 1200);
  } catch {}
}
function notifyNewBooking(b, n) {
  playDing();
  toast(n > 1 ? `มีการจองใหม่ ${n} รายการ` : `มีการจองใหม่: ${(b.guest.firstName + ' ' + b.guest.lastName).trim()} · ${b.hotelName}`, 'info');
}

// เลือกไฟล์ → ย่อ → อัปโหลด → คืน URL (ใช้กับปุ่ม "เปลี่ยนรูป")
function pickAndUploadImage(max = 1600) {
  return new Promise((res, rej) => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = async () => { const file = inp.files[0]; if (!file) return res(null); try { res(await uploadImage(await resizeImage(file, max))); } catch (e) { rej(e); } };
    inp.click();
  });
}


// ---- Realtime: หลังบ้านอัปเดตเองเมื่อมีการจอง / แจ้งเหตุใหม่จากเครื่องอื่น ----
let rtChannel = null, rtFor = null;
function watchRealtime() {
  const uid = isStaff(CACHE.me) ? CACHE.me.id : null;
  if (rtFor === uid) return;
  if (rtChannel) { supa.removeChannel(rtChannel); rtChannel = null; }
  rtFor = uid;
  if (!uid) return;
  const refresh = debounce(async () => {
    if (Date.now() - lastLocalWrite < 3000) return; // การเปลี่ยนแปลงที่เราเพิ่งทำเอง
    const known = new Set(CACHE.bookings.map(b => b.id));
    await DB.load();
    // มีการจองใหม่จากลูกค้า → ส่งเสียง + ข้อความแจ้งเตือน (เปิดหน้าหลังบ้านค้างไว้ก็ได้ยิน)
    const fresh = CACHE.bookings.filter(b => !known.has(b.id) && b.source !== 'external' && b.status === 'pending');
    if (fresh.length && CACHE.me?.role !== 'dev') { notifyNewBooking(fresh[0], fresh.length); }
    const busy = $('#modal') || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
    if (!location.hash.startsWith('#/admin')) return;
    if (busy) toast('มีข้อมูลอัปเดตใหม่ — เปลี่ยนหน้าหรือรีเฟรชเพื่อดู', 'info'); else render();
  }, 800);
  rtChannel = supa.channel('sd-backoffice')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sd_bookings' }, refresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sd_sos' }, refresh)
    .subscribe();
}
// ออกจากระบบจากแท็บอื่น / session หมดอายุ
supa.auth.onAuthStateChange(ev => {
  if (ev === 'SIGNED_OUT' && CACHE.me) setTimeout(() => DB.load().then(render), 0);
});

// ---- บทบาท & สิทธิ์ (RBAC) ----
// ใช้ซ่อน/แสดงเมนูในเบราว์เซอร์ — สิทธิ์จริงถูกบังคับที่ฐานข้อมูล (ตาราง sd_role_perms + RLS) ต้องแก้ทั้งสองที่ให้ตรงกัน
const ROLES = {
  owner: { label: 'เจ้าของรีสอร์ท', en: 'Resort Owner', icon: 'fa-hotel', color: '#b7791f', bg: '#fdf3df' },
  admin: { label: 'ผู้ดูแลแพลตฟอร์ม', en: 'Platform Admin', icon: 'fa-user-shield', color: '#2067da', bg: '#e8f0fd' },
  dev: { label: 'นักพัฒนา', en: 'Developer', icon: 'fa-code', color: '#7c3aed', bg: '#f1eafd' },
  staff: { label: 'พนักงานรีสอร์ท', en: 'Resort Staff', icon: 'fa-user-tie', color: '#0f766e', bg: '#e0f5f1' },
  user: { label: 'ลูกค้า', en: 'Customer', icon: 'fa-user', color: '#6b6f7a', bg: '#f0f1f4' },
};
const PERMS = {
  'exec.view': 'ดูภาพรวม KPI / รายได้',
  'reports.view': 'ดูรายงานการเงิน & ส่งออก',
  'partners.manage': 'อนุมัติ / ระงับเจ้าของรีสอร์ท',
  'staff.manage': 'จัดการทีมงาน (ผู้ดูแล / นักพัฒนา)',
  'settings.business': 'ตั้งค่าเว็บไซต์ & ประกาศ',
  'ops.view': 'งานประจำวันของรีสอร์ท',
  'frontdesk': 'อนุมัติการจอง / เช็คอิน-เช็คเอาท์',
  'bookings.view': 'ดูรายการจอง',
  'bookings.edit': 'ยืนยัน / ยกเลิก / รับชำระเงิน',
  'bookings.delete': 'ลบการจองถาวร',
  'inventory': 'ดูตารางห้องว่าง',
  'hotels.media': 'แก้รูป / สไลด์ / ข้อมูลที่พักของทุกรีสอร์ท (นักพัฒนา)',
  'hotels.edit':'จัดการที่พัก ห้อง รูป และราคา',
  'coupons.edit': 'จัดการโค้ดส่วนลด',
  'checkin.view': 'เปิดดูทะเบียนผู้เข้าพัก + รูปบัตร/พาสปอร์ต (อ่านอย่างเดียว) (นักพัฒนา)',
  'ads.manage': 'จัดการโฆษณา (แบนเนอร์ / รีสอร์ทแนะนำ / การ์ดโฆษณา) (นักพัฒนา)',
  'payout.edit': 'ตั้งค่าบัญชีรับเงินของรีสอร์ท',
  'reviews.view': 'ดูรีวิวจากลูกค้า',
  'reviews.manage': 'ลบ / จัดการรีวิว',
  'customers.view': 'ดูข้อมูลลูกค้า',
  'housekeeping': 'งานแม่บ้าน / สถานะห้อง',
  'sos.manage': 'จัดการแจ้งเหตุฉุกเฉิน',
  'audit.view': 'ดูบันทึกการใช้งาน (Audit log)',
  'dev.console': 'เครื่องมือเทคนิค (System / Data / Logs)',
  'flags.edit': 'เปิด-ปิดฟีเจอร์ / โหมดปิดปรับปรุง',
  'data.backup': 'สำรอง / กู้คืนข้อมูล',
  'data.reset': 'รีเซ็ตข้อมูลทั้งระบบ',
};
// เจ้าของรีสอร์ท = จัดการรีสอร์ทของตัวเอง (ทุกอย่างถูกจำกัดเฉพาะที่พักของตัวเองด้วย RLS)
// ผู้ดูแลแพลตฟอร์ม = อนุมัติรีสอร์ท ดูภาพรวมทั้งระบบ ช่วยเหลือ
// นักพัฒนา = จัดการทีมงาน บันทึกการใช้งาน ตั้งค่าเว็บไซต์ และเครื่องมือเทคนิค (สถานะระบบ / ข้อมูลดิบ / Error logs / ฟีเจอร์)
// ต้องตรงกับตาราง sd_role_perms
const ROLE_PERMS = {
  owner: ['exec.view', 'reports.view', 'ops.view', 'frontdesk', 'bookings.view', 'bookings.edit', 'inventory', 'hotels.edit', 'coupons.edit', 'reviews.view', 'customers.view', 'payout.edit', 'team.manage', 'housekeeping'],
  staff: ['ops.view', 'frontdesk', 'bookings.view', 'bookings.edit', 'inventory', 'hotels.edit', 'coupons.edit', 'reviews.view', 'customers.view', 'housekeeping'], // เพดานสิทธิ์ · ของจริงตาม perms ที่เจ้าของติ๊กให้รายคน
  admin: ['exec.view', 'reports.view', 'partners.manage', 'bookings.view', 'bookings.edit', 'inventory', 'hotels.edit', 'coupons.edit', 'reviews.view', 'reviews.manage', 'customers.view', 'sos.manage', 'data.backup', 'data.reset'],
  dev: ['staff.manage', 'audit.view', 'settings.business', 'dev.console', 'flags.edit', 'hotels.media', 'ads.manage', 'checkin.view'],
  user: [],
};
const STAFF_ROLES = ['owner', 'admin', 'dev', 'staff'];
// พนักงานรีสอร์ททำงานในหน้าเจ้าของรีสอร์ท (owner.html) แทนเจ้าของที่จ้าง
const portalRole = u => u?.role === 'staff' ? 'owner' : u?.role;
const bossId = u => u?.role === 'staff' ? u.employerId : u?.id;
// สิทธิ์ที่เจ้าของให้พนักงานได้ (ไม่รวมเรื่องเงินและการจัดการทีม) — ต้องตรงกับ sd_staff_perm_list()
const STAFF_PERM_LABELS = { 'housekeeping': 'งานแม่บ้าน / สถานะห้อง (แม่บ้านเห็นเฉพาะหน้านี้ได้)', 'bookings.view': 'ดูรายการจอง', 'bookings.edit': 'แก้ไข / อนุมัติการจอง', 'frontdesk': 'แขกเข้า-ออก · ตรวจสลิป · เช็คอิน', 'inventory': 'ตารางห้องว่าง / ปิดห้อง / จองจากช่องทางอื่น', 'hotels.edit': 'แก้ไขห้องพักและหน้ารีสอร์ท', 'coupons.edit': 'โค้ดส่วนลด', 'ops.view': 'ภาพรวมวันนี้', 'reviews.view': 'ดูรีวิว', 'customers.view': 'ดูรายชื่อลูกค้า' };
// หลังบ้านแยกไฟล์ — owner.html (เจ้าของรีสอร์ท) / admin.html (ผู้ดูแลแพลตฟอร์ม) / dev.html (นักพัฒนา) ตั้ง window.PORTAL ก่อนโหลดสคริปต์ · index.html = หน้าเว็บลูกค้า
const PORTAL = STAFF_ROLES.includes(window.PORTAL) ? window.PORTAL : null;
const SITE_URL = 'index.html';
const portalUrl = (role, hash = '#/admin') => `${role}.html${hash}`;
const siteUrl = (hash = '#/') => PORTAL ? SITE_URL + hash : hash;
// ---------- ลิงก์ประจำรีสอร์ท & ข้อความโปรโมต ----------
// ลูกค้ากดลิงก์ → เข้าหน้ารีสอร์ทนั้นและจองผ่านแพลตฟอร์มได้ทันที · ?src= บอกว่ามาจากช่องทางไหน
const SOCIALS = {
  facebook: { label: 'Facebook', icon: 'fa-brands fa-facebook', color: '#1877f2', ph: 'https://facebook.com/ชื่อเพจ' },
  tiktok: { label: 'TikTok', icon: 'fa-brands fa-tiktok', color: '#111', ph: 'https://tiktok.com/@ชื่อช่อง' },
  instagram: { label: 'Instagram', icon: 'fa-brands fa-instagram', color: '#e1306c', ph: 'https://instagram.com/ชื่อบัญชี' },
  line: { label: 'LINE ID', icon: 'fa-brands fa-line', color: '#06c755', ph: '@ไลน์ไอดี หรือ https://line.me/ti/p/...' },
};
const normSlug = v => String(v || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
// ลิงก์ให้ลูกค้ากรอกทะเบียนผู้เข้าพักเองบนมือถือ (ลูกค้าต้องใส่ PIN ของการจอง)
function selfCheckinLink(id) { return location.href.split('#')[0].replace(/[^/]*$/, '') + SITE_URL + '#/checkin/' + id; }
// trip = { in, out, a, r } (ไม่บังคับ): ลิงก์ที่กำหนดวันเข้าพัก/จำนวนผู้เข้าพักไว้ล่วงหน้า — ลูกค้าเปิดแล้วเห็นราคาและห้องว่างของวันนั้นทันที ไม่ต้องเลือกวันเอง
function resortLink(h, src, trip) {
  const base = location.href.split('#')[0].replace(/[^/]*$/, '') + SITE_URL;
  const p = new URLSearchParams();
  if (src) p.set('src', src);
  if (trip?.in && trip?.out && trip.out > trip.in) { p.set('in', trip.in); p.set('out', trip.out); if (trip.a) p.set('a', trip.a); if (trip.r) p.set('r', trip.r); }
  const qs = p.toString();
  return `${base}#/hotel/${h.slug || h.id}${qs ? '?' + qs : ''}`;
}
// ลิงก์เว็บจองส่วนตัว (VIP) ของรีสอร์ท — หน้าแบรนด์ของรีสอร์ทเอง ไม่มีรีสอร์ทอื่นปน
function vipLink(h) { return location.href.split('#')[0].replace(/[^/]*$/, '') + SITE_URL + '#/vip/' + (h.slug || h.id); }
// ลิงก์เปิดโปรไฟล์โซเชียลของรีสอร์ท (รับทั้ง URL เต็ม @ไอดี หรือชื่อเฉยๆ)
// เบอร์/LINE ตัวอย่างที่หลุดมาจากข้อมูลทดลอง (เช่น 081-888-8888, @demo-h8) — ถือว่าไม่มีค่า จะได้ไม่โทร/แชทไปหาคนที่ไม่เกี่ยวข้อง
function isDemoContact(v) {
  const s = String(v || '').trim();
  return /demo/i.test(s) || /^(\+?66|0)?(\d)\2{7,}$/.test(s.replace(/\D/g, '')) || s.replace(/\D/g, '').replace(/^66/, '0') === '0818888888';
}
const cleanContact = v => (isDemoContact(v) ? '' : v || '');
// ยกเลิกการจอง: ต้องล่วงหน้าอย่างน้อย N วันก่อนเช็คอิน · ลูกค้ายื่นคำขอ + บัญชีรับเงินคืน → เจ้าของยืนยัน/ปฏิเสธ (ต้องตรงกับ sd_request_cancel)
const CANCEL_MIN_DAYS = 7;
const cancelDaysLeft = b => Math.round((new Date(b.checkIn) - new Date(todayISO())) / 864e5);
const BANKS_TH = ['กสิกรไทย', 'ไทยพาณิชย์', 'กรุงเทพ', 'กรุงไทย', 'กรุงศรีอยุธยา', 'ทหารไทยธนชาต (ttb)', 'ออมสิน', 'ธ.ก.ส.', 'ซีไอเอ็มบี ไทย', 'ยูโอบี', 'เกียรตินาคินภัทร', 'ทิสโก้', 'แลนด์ แอนด์ เฮ้าส์', 'อื่นๆ'];
function socialUrl(key, v) {
  v = String(v || '').trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  const id = v.replace(/^@/, '');
  return { facebook: `https://facebook.com/${id}`, tiktok: `https://tiktok.com/@${id}`, instagram: `https://instagram.com/${id}`, line: `https://line.me/R/ti/p/@${id}` }[key];
}
function promoText(h, channel, extra = '', trip) {
  const NL = String.fromCharCode(10);
  const from = Math.min(...h.rooms.map(r => Math.round(r.price * (1 - (r.discount || 0) / 100))));
  const hl = (h.highlights || []).slice(0, 3).map(x => '✔ ' + x).join(NL);
  const tags = channel === 'tiktok' || channel === 'instagram' ? NL + NL + `#เกาะล้าน #ที่พักเกาะล้าน #${h.name.replace(/\s+/g, '')} #kohlarngo` : '';
  const line = h.social?.line ? NL + `💬 LINE: ${h.social.line}` : '';
  return [`🏝️ ${h.name} — ${h.type}${h.area ? ' ' + h.area : ''} เกาะล้าน`, `ห้องพักเริ่มต้น ${from.toLocaleString()} บาท/คืน`, hl, extra, '', '📲 จองตรงกับรีสอร์ท ยืนยันไว ไม่มีค่าธรรมเนียมเพิ่ม', `👉 ${resortLink(h, channel, trip)}`].filter((x, i) => x || i === 4).join(NL) + line + tags;
}
const isStaff = u => !!u && STAFF_ROLES.includes(u.role);
// ข้อความเงื่อนไขของโค้ดส่วนลด (ใช้ทั้งหน้าแรก หน้าจอง และหน้าแอดมิน)
const couponOffText = c => c.type === 'percent' ? `${c.value}%` : money(c.value);
const couponCondText = c => [+c.min > 0 ? `เมื่อจองขั้นต่ำ ${money(c.min)}` : 'ไม่มียอดขั้นต่ำ', c.maxUses ? `จำกัด ${c.maxUses} ครั้ง${c.left != null ? ` (เหลือ ${c.left})` : ''}` : ''].filter(Boolean).join(' · ');
const pubCoupon = code => (CACHE.pubCoupons || []).find(c => c.code === code);
const isAdmin = u => !!u && u.role === 'admin' && u.active !== false;
const ownerApproved = u => !!u && u.role === 'owner' && u.ownerStatus === 'approved';
// สิทธิ์จริงของผู้ใช้: ผู้ดูแลแพลตฟอร์มที่นักพัฒนากำหนดสิทธิ์รายคนไว้ (perms) ใช้ชุดนั้น · ที่เหลือใช้ตามบทบาท (ถูกจำกัดไม่เกินสิทธิ์ของบทบาทผู้ดูแล)
const userPerms = u => u.role === 'staff' ? (Array.isArray(u.perms) ? u.perms.filter(p => ROLE_PERMS.staff.includes(p)) : []) : u.role === 'admin' && Array.isArray(u.perms) ? u.perms.filter(p => ROLE_PERMS.admin.includes(p)) : (ROLE_PERMS[u.role] || []);
const can = (perm, u = DB.currentUser()) => !!u && u.active !== false && (u.role !== 'owner' || u.ownerStatus === 'approved') && userPerms(u).includes(perm);

const DEFAULT_SETTINGS = { bizName: 'kohlarngo', legalName: 'kohlarngo', taxId: '', phone: '', email: 'kohlarngo@gmail.com', line: '', address: 'เกาะล้าน อ.บางละมุง จ.ชลบุรี 20150', announceOn: false, announce: '', announceType: 'info', targetMonthly: 300000, promptpayId: '', promptpayName: '', bankInfo: '' };
// QR พร้อมเพย์จาก promptpay.io (สร้าง QR อย่างเดียว ไม่ยืนยันการชำระ) — id = เบอร์มือถือ 10 หลัก หรือเลขบัตร/เลขผู้เสียภาษี 13 หลัก
const isPromptpayId = v => /^(0\d{9}|\d{13})$/.test(String(v || ''));
const promptpayQr = (id, amount) => `https://promptpay.io/${encodeURIComponent(id)}${amount != null ? '/' + (+amount).toFixed(2) : ''}.png`;
// เงินเข้าบัญชีของเจ้าของรีสอร์ทโดยตรง — ที่พักที่ไม่มีเจ้าของใช้บัญชีของแพลตฟอร์ม (ตั้งค่าเว็บไซต์)
function payMethods(offer, hotel) {
  const m = [];
  if (offer?.payAtHotel) m.push('hotel');
  if (hotel?.ownerId) {
    const o = DB.owner(hotel.ownerId);
    if (o?.promptpay) m.push('promptpay');
    if (o?.bank) m.push('bank');
  } else {
    const s = DB.settings();
    if (isPromptpayId(s.promptpayId)) m.push('promptpay');
    if (s.bankInfo.trim()) m.push('bank');
  }
  return m;
}
const DEFAULT_FLAGS = { maintenance: false, maintenanceMsg: 'ระบบกำลังปิดปรับปรุงชั่วคราว จะกลับมาให้บริการเร็วๆ นี้', debug: false, icalSync: false };
const APP_VERSION = '3.0.0';

// เก็บ error ฝั่ง client ลงฐานข้อมูลให้นักพัฒนาดูในหน้า Logs
function logError(type, msg, src = '') {
  try {
    const row = { type: String(type).slice(0, 20), msg: String(msg).slice(0, 500), src: String(src).slice(0, 300), url: location.hash.slice(0, 300) };
    CACHE.errors.unshift({ ...row, at: new Date().toISOString() });
    supa.from('sd_errors').insert(row).then(() => {}, () => {});
  } catch {}
}
window.addEventListener('error', e => logError('error', e.message, `${e.filename || ''}:${e.lineno || ''}:${e.colno || ''}`));
window.addEventListener('unhandledrejection', e => logError('promise', e.reason?.message || e.reason, e.reason?.stack || ''));

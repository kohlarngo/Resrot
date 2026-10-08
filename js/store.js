// ชั้นข้อมูล (data layer) — ข้อมูลหลักเก็บใน Supabase (ตาราง sd_*) และสิทธิ์ถูกบังคับที่ฐานข้อมูลด้วย RLS
// DB อ่านจากแคชในหน่วยความจำ (โหลดตอนเปิดเว็บ / หลังล็อกอิน) เพื่อให้หน้าเว็บเรนเดอร์ได้ทันที
// การเขียนทั่วไปอัปเดตแคชทันทีแล้วส่งไปฐานข้อมูลเบื้องหลัง — ถ้าล้มเหลวจะแจ้งเตือนและโหลดข้อมูลจริงใหม่
// งานที่ต้องให้เซิร์ฟเวอร์ตัดสิน (จอง ยกเลิก โค้ดส่วนลด รีวิว ล็อกอิน) เป็นฟังก์ชัน async
const SUPABASE_URL = 'https://whtomiamqwhhdrllibix.supabase.co';
const SUPABASE_KEY = 'sb_publishable_zNqyiYcujJvjcTKthvo_Kw_EuGWsKCL'; // publishable key — เปิดเผยได้ ความปลอดภัยอยู่ที่ RLS
// PKCE: ล็อกอินด้วย Google / Facebook กลับมาเป็น ?code=... (ไม่ใช้ #access_token เพราะหน้าเว็บใช้ hash เป็นเส้นทาง)
const supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { storageKey: 'sd_auth', flowType: 'pkce' } });

// ค่าที่เก็บเฉพาะในเบราว์เซอร์นี้ (การค้นหาล่าสุด รายการโปรด การจองที่ทำแบบไม่ล็อกอิน)
const LS = {
  get(k, d) { try { const v = localStorage.getItem('sd_' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('sd_' + k, JSON.stringify(v)); } catch (e) { console.warn(e); } },
  del(k) { try { localStorage.removeItem('sd_' + k); } catch {} },
};
const LOCAL_KEYS = ['search', 'recent', 'favs', 'mybk'];
// ล้างข้อมูลระบบเดิมที่เคยเก็บใน localStorage (เวอร์ชันก่อนย้ายไป Supabase)
['hotels', 'coupons', 'users', 'bookings', 'reviews', 'session', 'seedVersion', 'staffSeed', 'audit', 'errors', 'settings', 'flags', 'sos', 'sos_contacts'].forEach(LS.del);

const TAX_RATE = 0.177; // ค่าบริการ 10% + VAT 7%

// แคชข้อมูลจากฐานข้อมูล — แต่ละคนเห็นเฉพาะแถวที่ RLS อนุญาต
const CACHE = { loaded: false, hotels: [], owners: {}, kv: {}, occ: [], pubReviews: [], me: null, bookings: [], profiles: [], coupons: [], reviews: [], audit: [], errors: [], sos: [] };
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
  ownerStatus: p.owner_status, ownerNote: p.owner_note, appliedAt: p.applied_at, biz: p.biz || {}, payout: p.payout || {} };
const toReview = r => ({ id: r.id, bookingId: r.booking_id, hotelId: r.hotel_id, userId: r.user_id, name: r.name, country: r.country, trip: r.trip, score: +r.score, title: r.title, text: r.text, room: r.room, date: r.date });
const toCoupon = c => ({ code: c.code, type: c.type, value: +c.value, min: +c.min_amount, desc: c.description, active: c.active, ownerId: c.owner_id });
const fromCoupon = c => ({ code: c.code, type: c.type, value: +c.value, min_amount: +c.min || 0, description: c.desc || '', active: !!c.active, owner_id: c.ownerId || null });
const byNaturalId = (a, b) => a.id.localeCompare(b.id, 'en', { numeric: true });

const DB = {
  // โหลดข้อมูลทั้งหมดที่ผู้ใช้ปัจจุบันมีสิทธิ์เห็น
  async load() {
    const [hotels, kv, occ, pub, owners, { data: { session } }] = await Promise.all([
      fetchAll(() => supa.from('sd_hotels').select('data')),
      supa.from('sd_kv').select('key,value'),
      fetchAll(() => supa.rpc('sd_occupancy')),
      fetchAll(() => supa.rpc('sd_public_reviews')),
      fetchAll(() => supa.rpc('sd_public_owners')),
      supa.auth.getSession(),
    ]);
    CACHE.owners = Object.fromEntries(owners.map(o => [o.id, o]));
    if (kv.error) throw kv.error;
    CACHE.hotels = hotels.map(r => r.data).sort(byNaturalId);
    CACHE.kv = Object.fromEntries(kv.data.map(r => [r.key, r.value]));
    CACHE.occ = occ.map(r => ({ roomId: r.room_id, checkIn: r.check_in, checkOut: r.check_out, qty: r.qty }));
    CACHE.pubReviews = pub;
    Object.assign(CACHE, { me: null, bookings: [], profiles: [], coupons: [], reviews: [], audit: [], errors: [], sos: [] });
    if (session) {
      let { data: p } = await supa.from('sd_profiles').select('*').eq('id', session.user.id).maybeSingle();
      const meta = session.user.user_metadata || {}; // Google / Facebook ส่งชื่อมาเป็น full_name หรือ name
      if (!p) p = await rpc('sd_ensure_profile', { p_name: meta.name || meta.full_name || null, p_phone: null }).catch(() => null);
      if (p?.active === false) await supa.auth.signOut();
      else CACHE.me = toUser(p);
    }
    if (CACHE.me) {
      const none = Promise.resolve([]);
      const [bookings, profiles, coupons, reviews, audit, errors, sos] = await Promise.all([
        fetchAll(() => supa.from('sd_bookings').select('data').order('created_at', { ascending: false })).then(r => r.map(x => x.data)),
        isAdmin(CACHE.me) || can('staff.manage') ? fetchAll(() => supa.from('sd_profiles').select('*').order('created_at')).then(r => r.map(toUser)) : Promise.resolve([CACHE.me]),
        can('coupons.edit') ? fetchAll(() => supa.from('sd_coupons').select('*').order('created_at')).then(r => r.map(toCoupon)) : none,
        fetchAll(() => supa.from('sd_reviews').select('*').order('created_at')).then(r => r.map(toReview)),
        isStaff(CACHE.me) ? supa.from('sd_audit').select('*').order('at', { ascending: false }).limit(1000).then(r => r.data || []) : none,
        can('dev.console') ? supa.from('sd_errors').select('*').order('at', { ascending: false }).limit(200).then(r => r.data || []) : none,
        can('sos.manage') ? fetchAll(() => supa.from('sd_sos').select('data').order('at', { ascending: false })).then(r => r.map(x => x.data)) : none,
      ]);
      Object.assign(CACHE, { bookings, profiles, coupons, reviews, audit, errors, sos });
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
    const list = PORTAL === 'owner' && CACHE.me ? CACHE.hotels.filter(h => h.ownerId === CACHE.me.id) : CACHE.hotels;
    return all ? list : list.filter(x => x.active !== false);
  },
  hotel(id) { return CACHE.hotels.find(h => h.id === id) || CACHE.hotels.find(h => h.slug && h.slug === id); },
  saveHotel(hotel) {
    const i = CACHE.hotels.findIndex(h => h.id === hotel.id);
    if (i >= 0) CACHE.hotels[i] = hotel; else CACHE.hotels.push(hotel);
    return dbWrite(supa.from('sd_hotels').upsert({ id: hotel.id, data: hotel, owner_id: hotel.ownerId || null }), 'ที่พัก');
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
    const orig = Math.round(room.price * (weekend ? 1.15 : 1));
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
  deleteBooking(id) {
    CACHE.bookings = CACHE.bookings.filter(b => b.id !== id);
    return dbWrite(supa.from('sd_bookings').delete().eq('id', id), 'ลบการจอง');
  },
  _replaceBooking(b) { const i = CACHE.bookings.findIndex(x => x.id === b.id); if (i >= 0) CACHE.bookings[i] = b; else CACHE.bookings.push(b); return b; },
  async cancelMyBooking(b) {
    const nb = this._replaceBooking(await rpc('sd_cancel_booking', { p_id: b.id, p_pin: b.pin }));
    // คืนห้องในตารางห้องที่ถูกจอง (ใช้คำนวณห้องว่างฝั่งลูกค้า) ทันที ไม่ต้องรีเฟรชหน้า
    const i = CACHE.occ.findIndex(o => o.roomId === b.roomId && o.checkIn === b.checkIn && o.checkOut === b.checkOut && o.qty === b.qty);
    if (i >= 0) CACHE.occ.splice(i, 1);
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
  async slipUrl(path) {
    const { data, error } = await supa.storage.from('sd-slips').createSignedUrl(path, 600);
    return error ? null : data.signedUrl;
  },
  async lookupBooking(id, pin) {
    const b = await rpc('sd_get_booking', { p_id: id, p_pin: pin });
    if (!b) return null;
    LS.set('mybk', [{ id: b.id, pin: b.pin }, ...LS.get('mybk', []).filter(x => x.id !== b.id)].slice(0, 30));
    return this._replaceBooking(b);
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
  async applyOwner(form) { await rpc('sd_apply_owner', { p: form }); await this.load(); },
  async setOwnerStatus(id, status, note = '') { await rpc('sd_set_owner_status', { p_id: id, p_status: status, p_note: note }); await this.load(); },
  saveBusiness(biz, payout) { // ข้อมูลรีสอร์ท + บัญชีรับเงินของเจ้าของ (แก้ได้เฉพาะของตัวเอง)
    const me = CACHE.me;
    Object.assign(me, { biz: { ...me.biz, ...biz }, payout: { ...me.payout, ...payout } });
    return dbWrite(supa.from('sd_profiles').update({ biz: me.biz, payout: me.payout }).eq('id', me.id), 'ข้อมูลรีสอร์ท');
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
  async register(name, email, pass, phone = '') {
    const { data, error } = await supa.auth.signUp({ email: email.trim(), password: pass, options: { data: { name: name.trim() } } });
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
  async logout() {
    if (isStaff(CACHE.me)) await this.log('auth.logout', CACHE.me.email);
    await supa.auth.signOut();
    await this.load();
  },
  updateUser(id, patch) {
    const map = { name: 'name', phone: 'phone', role: 'role', active: 'active', lastLogin: 'last_login' };
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
  settings() { return { ...DEFAULT_SETTINGS, ...CACHE.kv.settings }; },
  saveSettings(patch) { return this._kv('settings', { ...this.settings(), ...patch }); },
  flags() { return { ...DEFAULT_FLAGS, ...CACHE.kv.flags }; },
  saveFlags(patch) { return this._kv('flags', { ...this.flags(), ...patch }); },
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
    await DB.load();
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
  'hotels.edit': 'จัดการที่พัก ห้อง รูป และราคา',
  'coupons.edit': 'จัดการโค้ดส่วนลด',
  'payout.edit': 'ตั้งค่าบัญชีรับเงินของรีสอร์ท',
  'reviews.view': 'ดูรีวิวจากลูกค้า',
  'reviews.manage': 'ลบ / จัดการรีวิว',
  'customers.view': 'ดูข้อมูลลูกค้า',
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
  owner: ['exec.view', 'reports.view', 'ops.view', 'frontdesk', 'bookings.view', 'bookings.edit', 'inventory', 'hotels.edit', 'coupons.edit', 'reviews.view', 'customers.view', 'payout.edit'],
  admin: ['exec.view', 'reports.view', 'partners.manage', 'bookings.view', 'bookings.edit', 'inventory', 'hotels.edit', 'coupons.edit', 'reviews.view', 'reviews.manage', 'customers.view', 'sos.manage', 'data.backup', 'data.reset'],
  dev: ['staff.manage', 'audit.view', 'settings.business', 'dev.console', 'flags.edit'],
  user: [],
};
const STAFF_ROLES = ['owner', 'admin', 'dev'];
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
function resortLink(h, src) {
  const base = location.href.split('#')[0].replace(/[^/]*$/, '') + SITE_URL;
  return `${base}#/hotel/${h.slug || h.id}${src ? '?src=' + src : ''}`;
}
// ลิงก์เปิดโปรไฟล์โซเชียลของรีสอร์ท (รับทั้ง URL เต็ม @ไอดี หรือชื่อเฉยๆ)
function socialUrl(key, v) {
  v = String(v || '').trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  const id = v.replace(/^@/, '');
  return { facebook: `https://facebook.com/${id}`, tiktok: `https://tiktok.com/@${id}`, instagram: `https://instagram.com/${id}`, line: `https://line.me/R/ti/p/@${id}` }[key];
}
function promoText(h, channel, extra = '') {
  const NL = String.fromCharCode(10);
  const from = Math.min(...h.rooms.map(r => Math.round(r.price * (1 - (r.discount || 0) / 100))));
  const hl = (h.highlights || []).slice(0, 3).map(x => '✔ ' + x).join(NL);
  const tags = channel === 'tiktok' || channel === 'instagram' ? NL + NL + `#เกาะล้าน #ที่พักเกาะล้าน #${h.name.replace(/\s+/g, '')} #StayDee` : '';
  const line = h.social?.line ? NL + `💬 LINE: ${h.social.line}` : '';
  return [`🏝️ ${h.name} — ${h.type}${h.area ? ' ' + h.area : ''} เกาะล้าน`, `ห้องพักเริ่มต้น ${from.toLocaleString()} บาท/คืน`, hl, extra, '', '📲 จองตรงกับรีสอร์ท ยืนยันไว ไม่มีค่าธรรมเนียมเพิ่ม', `👉 ${resortLink(h, channel)}`].filter((x, i) => x || i === 4).join(NL) + line + tags;
}
const isStaff = u => !!u && STAFF_ROLES.includes(u.role);
const isAdmin = u => !!u && u.role === 'admin' && u.active !== false;
const ownerApproved = u => !!u && u.role === 'owner' && u.ownerStatus === 'approved';
const can = (perm, u = DB.currentUser()) => !!u && u.active !== false && (u.role !== 'owner' || u.ownerStatus === 'approved') && (ROLE_PERMS[u.role] || []).includes(perm);

const DEFAULT_SETTINGS = { bizName: 'StayDee เกาะล้าน', legalName: 'บริษัท สเตย์ดี จำกัด', taxId: '', phone: '038-000-000', email: 'contact@staydee.com', line: '@staydee', address: 'เกาะล้าน อ.บางละมุง จ.ชลบุรี 20150', announceOn: false, announce: '', announceType: 'info', targetMonthly: 300000, promptpayId: '', promptpayName: '', bankInfo: '' };
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
const DEFAULT_FLAGS = { maintenance: false, maintenanceMsg: 'ระบบกำลังปิดปรับปรุงชั่วคราว จะกลับมาให้บริการเร็วๆ นี้', debug: false };
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

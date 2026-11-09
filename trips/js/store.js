// ชั้นข้อมูล (data layer) — ตาม StayDee: แคชในหน่วยความจำ + Supabase (ตาราง tour_*) · สิทธิ์ถูกบังคับด้วย RLS ฝั่งเซิร์ฟเวอร์
// การจอง/ยกเลิก/คูปอง/รีวิว ผ่าน RPC ที่เซิร์ฟเวอร์ตัดสิน — หน้าเว็บคิดราคาเพื่อแสดงเท่านั้น
const CFG = window.KOHLARDGO_CONFIG || {};
const PORTAL = window.PORTAL || null; // null = เว็บลูกค้า · 'owner' | 'admin' | 'dev'
const supa = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {
  auth: { flowType: 'pkce', storageKey: /^(owner|admin)$/.test(PORTAL) ? 'tour_auth_' + PORTAL : 'tour_auth' },
});

const LS = {
  get(k, d) { try { const v = localStorage.getItem('tour_' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('tour_' + k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem('tour_' + k); } catch {} },
};

const ROLES = {
  user:  { label: 'ลูกค้า', icon: 'fa-user', color: '#64748b' },
  owner: { label: 'เจ้าของกิจการ', icon: 'fa-store', color: '#b7791f' },
  admin: { label: 'ผู้ดูแลแพลตฟอร์ม', icon: 'fa-user-shield', color: '#2067da' },
  dev:   { label: 'นักพัฒนา', icon: 'fa-code', color: '#7c3aed' },
};
const isAdmin = u => !!u && (u.role === 'admin' || u.role === 'dev');
const isStaff = u => !!u && u.role !== 'user';
const portalRole = u => (u ? u.role : null);

const CATEGORIES = {
  boat:     { label: 'ทริปเรือ / สปีดโบ๊ท', icon: 'fa-ship', color: '#0ea5e9' },
  activity: { label: 'กิจกรรมทางน้ำ', icon: 'fa-person-swimming', color: '#16a34a' },
  package:  { label: 'แพ็กเกจทัวร์', icon: 'fa-suitcase-rolling', color: '#f59e0b' },
  vehicle:  { label: 'เช่ารถ / มอเตอร์ไซค์', icon: 'fa-motorcycle', color: '#ef4444' },
  food:     { label: 'อาหาร / ร้านอาหาร', icon: 'fa-utensils', color: '#ec4899' },
};

const CACHE = { hotels: [], loaded: false, me: null, trips: [], owners: {}, occ: [], reviews: [], coupons: [], pubCoupons: [], ads: [], pubAds: [], bookings: [], profiles: [], sos: [], audit: [], errors: [], kv: {} };

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
  if (error) throw new Error(error.message.replace(/^.*?:\s*/, '') || error.message);
  return data;
}
const dbWrite = (req, what) => Promise.resolve(req).then(r => { if (r?.error) throw r.error; return r; }).catch(e => {
  console.error(what, e); logError('db', `${what}: ${e?.message || e}`);
  toast(`บันทึกไม่สำเร็จ (${what}): ${e?.message || e}`, 'err'); throw e;
});
function logError(kind, message) {
  supa.from('tour_errors').insert({ kind, message: String(message).slice(0, 900), page: location.pathname + location.hash, ua: navigator.userAgent.slice(0, 200) }).then(() => {}, () => {});
}
window.addEventListener('error', e => logError('js', `${e.message} @${(e.filename || '').split('/').pop()}:${e.lineno}`));
window.addEventListener('unhandledrejection', e => logError('promise', e.reason?.message || e.reason));

const toUser = p => p && ({ id: p.id, name: p.name, email: p.email, phone: p.phone, role: p.role, active: p.active, ownerStatus: p.owner_status, biz: p.biz || {}, payout: p.payout || {}, lastLogin: p.last_login, createdAt: p.created_at });
const toBooking = r => ({ id: r.id, tripId: r.trip_id, ownerId: r.owner_id, userId: r.user_id, status: r.status, date: r.trip_date, time: r.trip_time || '', qty: r.qty, total: +r.total, createdAt: r.created_at, ...r.data,
  payment: { method: 'promptpay', paid: false, slip: null, ...(r.data?.payment || {}) }, log: r.data?.log || [] });
const fromBookingData = b => { const { id, tripId, ownerId, userId, status, date, time, qty, total, createdAt, ...rest } = b; return rest; };
const toCoupon = c => ({ code: c.code, type: c.type, value: +c.value, min: +c.min_amount, desc: c.description || '', active: c.active, ownerId: c.owner_id, maxUses: c.max_uses, used: c.used, expires: c.expires });
const fromCoupon = c => ({ code: c.code.toUpperCase(), type: c.type, value: +c.value, min_amount: +c.min || 0, description: c.desc || '', active: !!c.active, owner_id: c.ownerId || null, max_uses: c.maxUses || null, expires: c.expires || null });
const toAd = a => ({ id: a.id, kind: a.kind, advertiser: a.advertiser, tripId: a.trip_id || '', title: a.title || '', body: a.body || '', image: a.image || '', link: a.link || '', phone: a.phone || '', start: a.start_date, end: a.end_date, active: a.active, fee: +a.fee, paid: a.paid, note: a.note || '', views: a.views, clicks: a.clicks });
const fromAd = a => ({ kind: a.kind, advertiser: a.advertiser, trip_id: a.tripId || null, title: a.title, body: a.body, image: a.image, link: a.link, phone: a.phone, start_date: a.start || null, end_date: a.end || null, active: !!a.active, fee: +a.fee || 0, paid: !!a.paid, note: a.note });

const DB = {
  async load() {
    const [trips, kv, occ, owners, reviews, pubCp, pubAds, { data: { session } }] = await Promise.all([
      fetchAll(() => supa.from('tour_trips').select('id,owner_id,data,active,created_at')),
      supa.from('tour_kv').select('key,value'),
      supa.rpc('tour_occupancy').then(r => r.data || []),
      supa.rpc('tour_public_owners').then(r => r.data || []),
      fetchAll(() => supa.from('tour_reviews').select('*').order('created_at', { ascending: false })).catch(() => []),
      supa.rpc('tour_public_coupons').then(r => r.data || []),
      supa.rpc('tour_public_ads').then(r => r.data || []),
      supa.auth.getSession(),
    ]);
    if (kv.error) throw kv.error;
    CACHE.trips = trips.map(r => ({ ...r.data, id: r.id, ownerId: r.owner_id, active: r.active }));
    CACHE.kv = Object.fromEntries(kv.data.map(r => [r.key, r.value]));
    CACHE.occ = occ.map(o => ({ tripId: o.trip_id, date: o.trip_date, time: o.trip_time || '', qty: +o.qty }));
    CACHE.owners = Object.fromEntries(owners.map(o => [o.id, o]));
    CACHE.reviews = reviews; CACHE.pubCoupons = pubCp; CACHE.pubAds = pubAds;
    Object.assign(CACHE, { me: null, bookings: [], profiles: [], coupons: [], ads: [], sos: [], audit: [], errors: [] });
    if (session) {
      let { data: p } = await supa.from('tour_profiles').select('*').eq('id', session.user.id).maybeSingle();
      const meta = session.user.user_metadata || {};
      if (!p) p = await rpc('tour_ensure_profile', { p_name: meta.name || meta.full_name || null, p_phone: null }).catch(() => null);
      if (p?.active === false) await supa.auth.signOut(); else CACHE.me = toUser(p);
    }
    if (CACHE.me) {
      const none = Promise.resolve([]), me = CACHE.me, adm = isAdmin(me);
      CACHE.notes = {};
      if (me.role === 'owner' || adm) await fetchAll(() => supa.from('tour_booking_notes').select('booking_id,note')).then(r => r.forEach(x => (CACHE.notes[x.booking_id] = x.note))).catch(() => {});
      const [bookings, profiles, coupons, ads, sos, audit, errors] = await Promise.all([
        fetchAll(() => supa.from('tour_bookings').select('id,trip_id,owner_id,user_id,status,trip_date,trip_time,qty,total,data,created_at').order('created_at', { ascending: false })).then(r => r.map(toBooking)),
        adm ? fetchAll(() => supa.from('tour_profiles').select('*').order('created_at')).then(r => r.map(toUser)) : none,
        me.role === 'owner' || adm ? fetchAll(() => supa.from('tour_coupons').select('*').order('created_at')).then(r => r.map(toCoupon)) : none,
        adm ? fetchAll(() => supa.from('tour_ads').select('*').order('created_at', { ascending: false })).then(r => r.map(toAd)) : none,
        adm ? fetchAll(() => supa.from('tour_sos').select('*').order('created_at', { ascending: false })).then(r => r.map(x => ({ ...x.data, id: x.id, status: x.status, at: x.created_at }))) : none,
        adm ? supa.from('tour_audit').select('*').order('at', { ascending: false }).limit(500).then(r => r.data || []) : none,
        me.role === 'dev' ? supa.from('tour_errors').select('*').order('at', { ascending: false }).limit(200).then(r => r.data || []) : none,
      ]);
      Object.assign(CACHE, { bookings, profiles, coupons, ads, sos, audit, errors });
    }
    // การจองที่ทำโดยไม่ล็อกอินจากเครื่องนี้ — ดึงด้วยรหัส + PIN
    if (!PORTAL) {
      const extra = await Promise.all(LS.get('mybk', []).filter(x => !CACHE.bookings.some(b => b.id === x.id)).map(x => rpc('tour_get_booking', { p_id: x.id, p_pin: x.pin }).catch(() => null)));
      CACHE.bookings.push(...extra.filter(Boolean).map(b => ({ ...b.data, id: b.id, tripId: b.tripId, ownerId: b.ownerId, status: b.status, date: b.date, time: b.time || '', qty: b.qty, total: +b.total, createdAt: b.createdAt, payment: { method: 'promptpay', paid: false, slip: null, ...(b.data?.payment || {}) }, log: b.data?.log || [], _pin: LS.get('mybk', []).find(x => x.id === b.id)?.pin })));
    }
    CACHE.loaded = true;
  },

  currentUser: () => CACHE.me,
  settings: () => ({ bizName: 'kohlarngo', legalName: 'kohlarngo เที่ยวเกาะล้าน', phone: '', line: '', announce: '', announceOn: false, announceType: 'info', ...(CACHE.kv.settings || {}) }),
  flags: () => ({ maintenance: false, maintenanceMsg: '', ...(CACHE.kv.flags || {}) }),
  setKv: (key, value) => { CACHE.kv[key] = value; return dbWrite(supa.from('tour_kv').upsert({ key, value, updated_at: new Date().toISOString() }), 'ตั้งค่า'); },

  // ---- ทริป ----
  trips(all = false) {
    const mine = PORTAL === 'owner' && CACHE.me ? CACHE.trips.filter(t => t.ownerId === CACHE.me.id) : CACHE.trips;
    return all ? mine : mine.filter(t => t.active !== false && !t.banned);
  },
  trip: id => CACHE.trips.find(t => t.id === id || (t.slug && t.slug === id)),
  async saveTrip(trip) {
    const { id, ownerId, active, ...data } = trip, i = CACHE.trips.findIndex(t => t.id === id);
    const row = { data, active: active !== false, updated_at: new Date().toISOString() };
    if (i >= 0 && ownerId && CACHE.me?.role === 'dev') row.owner_id = ownerId; // นักพัฒนาย้ายเจ้าของทริปได้
    await dbWrite(i >= 0 ? supa.from('tour_trips').update(row).eq('id', id).select('id').then(r => (!r.error && !r.data?.length ? { error: new Error('ไม่มีสิทธิ์แก้ไขทริปนี้') } : r))
      : supa.from('tour_trips').insert({ id, owner_id: ownerId || CACHE.me.id, ...row }), 'ทริป');
    if (i >= 0) CACHE.trips[i] = trip; else CACHE.trips.push({ ...trip, ownerId: ownerId || CACHE.me.id });
  },
  async deleteTrip(id) { await dbWrite(supa.from('tour_trips').delete().eq('id', id), 'ลบทริป'); CACHE.trips = CACHE.trips.filter(t => t.id !== id); },
  owner: id => CACHE.owners[id] || null,
  tripReviews: id => CACHE.reviews.filter(r => r.trip_id === id && r.visible),
  tripRating(id) { const l = DB.tripReviews(id); return l.length ? { score: l.reduce((s, r) => s + +r.score, 0) / l.length, count: l.length } : { score: 0, count: 0 }; },

  // ที่ว่างของทริปในวัน/รอบนั้น (null = ไม่จำกัด)
  seatsLeft(trip, date, time = '') {
    if ((trip.closedDates || []).includes(date)) return 0;
    const cap = +trip.dailyCap || 0; if (!cap) return null;
    const taken = CACHE.occ.filter(o => o.tripId === trip.id && o.date === date && (!time || o.time === time)).reduce((s, o) => s + o.qty, 0);
    return Math.max(0, cap - taken);
  },

  // ---- การจอง ----
  bookings() { return PORTAL === 'owner' ? CACHE.bookings.filter(b => b.ownerId === CACHE.me?.id) : CACHE.bookings; },
  booking: id => CACHE.bookings.find(b => b.id === id),
  async createBooking(payload) {
    const r = await rpc('tour_create_booking', { p: payload });
    if (!CACHE.me) LS.set('mybk', [{ id: r.id, pin: r.pin }, ...LS.get('mybk', [])].slice(0, 20));
    return r;
  },
  async refreshBookings() {
    const rows = await fetchAll(() => supa.from('tour_bookings').select('id,trip_id,owner_id,user_id,status,trip_date,trip_time,qty,total,data,created_at').order('created_at', { ascending: false }));
    CACHE.bookings = rows.map(toBooking);
  },
  // เจ้าของ/แอดมินเปลี่ยนสถานะ (RLS ตรวจสิทธิ์) + บันทึกประวัติ
  async setBookingStatus(id, status, text) {
    const b = DB.booking(id); if (!b) return;
    const log = [...(b.log || []), { at: new Date().toISOString(), by: CACHE.me?.role || 'staff', text: text || `เปลี่ยนสถานะเป็น ${status}` }];
    const data = { ...fromBookingData(b), log };
    if (status === 'confirmed' && b.payment?.slip) data.payment = { ...b.payment, paid: true, paidAt: new Date().toISOString() };
    const r = await supa.from('tour_bookings').update({ status, data, updated_at: new Date().toISOString() }).eq('id', id).select('id');
    if (r.error || !r.data?.length) throw r.error || new Error('ไม่มีสิทธิ์แก้ไขการจองนี้');
    Object.assign(b, { status, log, payment: data.payment || b.payment });
  },
  async patchBooking(id, patch, text) { // แก้ข้อมูลใน data (เช่น หมายเหตุเจ้าของ)
    const b = DB.booking(id); if (!b) return;
    const log = text ? [...(b.log || []), { at: new Date().toISOString(), by: CACHE.me?.role || 'staff', text }] : b.log;
    const data = { ...fromBookingData(b), ...patch, log };
    const r = await supa.from('tour_bookings').update({ data, updated_at: new Date().toISOString() }).eq('id', id).select('id');
    if (r.error || !r.data?.length) throw r.error || new Error('ไม่มีสิทธิ์แก้ไขการจองนี้');
    Object.assign(b, patch, { log });
  },

  note: id => (CACHE.notes || {})[id] || '',
  async setNote(id, note) {
    const b = DB.booking(id);
    await dbWrite(supa.from('tour_booking_notes').upsert({ booking_id: id, owner_id: b?.ownerId || CACHE.me.id, note, updated_at: new Date().toISOString() }), 'โน้ต');
    (CACHE.notes ||= {})[id] = note;
  },

  // ---- คูปอง ----
  coupons: () => CACHE.coupons,
  async saveCoupon(c) {
    const row = fromCoupon({ ...c, ownerId: c.ownerId === undefined ? (CACHE.me.role === 'owner' ? CACHE.me.id : null) : c.ownerId });
    await dbWrite(supa.from('tour_coupons').upsert(row), 'โค้ดส่วนลด');
    const i = CACHE.coupons.findIndex(x => x.code === row.code); const v = { ...toCoupon({ ...row, used: CACHE.coupons[i]?.used || 0 }) };
    if (i >= 0) CACHE.coupons[i] = v; else CACHE.coupons.push(v);
  },
  async deleteCoupon(code) { await dbWrite(supa.from('tour_coupons').delete().eq('code', code), 'ลบโค้ด'); CACHE.coupons = CACHE.coupons.filter(c => c.code !== code); },
  findCoupon(code, trip) {
    const c = CACHE.pubCoupons.find(x => x.code === String(code).trim().toUpperCase());
    return c && (!c.owner_id || c.owner_id === trip.ownerId) ? { code: c.code, type: c.type, value: +c.value, min: +c.min_amount, desc: c.description } : null;
  },

  // ---- โฆษณา ----
  publicAds: kind => CACHE.pubAds.filter(a => !kind || a.kind === kind),
  ads: () => CACHE.ads,
  async saveAd(a) {
    const r = a.id ? await supa.from('tour_ads').update(fromAd(a)).eq('id', a.id).select().single() : await supa.from('tour_ads').insert(fromAd(a)).select().single();
    if (r.error) { toast('บันทึกโฆษณาไม่สำเร็จ: ' + r.error.message, 'err'); throw r.error; }
    const v = toAd(r.data), i = CACHE.ads.findIndex(x => x.id === v.id); if (i >= 0) CACHE.ads[i] = v; else CACHE.ads.unshift(v);
  },
  async deleteAd(id) { await dbWrite(supa.from('tour_ads').delete().eq('id', id), 'ลบโฆษณา'); CACHE.ads = CACHE.ads.filter(a => a.id !== id); },
  trackAd: (id, kind) => { supa.rpc('tour_track_ad', { p_id: id, p_kind: kind }).then(() => {}, () => {}); },

  // ---- SOS ----
  sos: () => CACHE.sos,
  sosContacts: () => CACHE.kv.sos_contacts || DEFAULT_SOS_CONTACTS,
  saveSosContacts: list => DB.setKv('sos_contacts', list),
  addSos: data => rpc('tour_submit_sos', { p: data }),
  async setSosStatus(id, status) { await dbWrite(supa.from('tour_sos').update({ status }).eq('id', id), 'SOS'); const s = CACHE.sos.find(x => x.id === id); if (s) s.status = status; },

  // ---- ผู้ใช้ ----
  users: () => CACHE.profiles,
  async setProfile(id, patch) { // แอดมิน: role / active / owner_status
    await dbWrite(supa.rpc('tour_admin_set_profile', { p_id: id, p_patch: patch }), 'ผู้ใช้');
    const u = CACHE.profiles.find(p => p.id === id); if (u) Object.assign(u, { role: patch.role ?? u.role, active: patch.active ?? u.active, ownerStatus: patch.owner_status ?? u.ownerStatus });
  },
  async saveMyProfile(patch) { // ชื่อ เบอร์ biz payout
    const me = CACHE.me;
    await dbWrite(supa.from('tour_profiles').update(patch).eq('id', me.id), 'โปรไฟล์');
    Object.assign(me, patch.name != null ? { name: patch.name } : {}, patch.phone !== undefined ? { phone: patch.phone } : {}, patch.biz ? { biz: patch.biz } : {}, patch.payout ? { payout: patch.payout } : {});
  },

  // ---- รีวิว ----
  allReviews: () => CACHE.reviews,
  async replyReview(id, reply) { await dbWrite(supa.rpc('tour_reply_review', { p_id: id, p_reply: reply || '' }), 'ตอบรีวิว'); const r = CACHE.reviews.find(x => x.id === id); if (r) r.reply = reply; },
  async setReviewVisible(id, visible) { await dbWrite(supa.rpc('tour_set_review_visible', { p_id: id, p_visible: visible }), 'รีวิว'); const r = CACHE.reviews.find(x => x.id === id); if (r) r.visible = visible; },

  // ---- ล็อกอิน ----
  async login(email, pass) {
    const { error } = await supa.auth.signInWithPassword({ email: email.trim(), password: pass });
    if (error) throw new Error(/invalid/i.test(error.message) ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' : error.message);
    await DB.load();
  },
  async signup(name, email, pass, phone) {
    const { data, error } = await supa.auth.signUp({ email: email.trim(), password: pass, options: { data: { name } } });
    if (error) throw new Error(error.message);
    if (!data.session) throw new Error('สมัครสำเร็จ — กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ');
    await rpc('tour_ensure_profile', { p_name: name, p_phone: phone || null });
    await DB.load();
  },
  async oauth(provider) { LS.set('after_login', location.hash); await supa.auth.signInWithOAuth({ provider, options: { redirectTo: location.origin + location.pathname } }); },
  async logout() { await supa.auth.signOut(); await DB.load(); },
  log(action, detail) { const me = CACHE.me; if (me) supa.from('tour_audit').insert({ user_id: me.id, name: me.name, action, detail: String(detail || '').slice(0, 500) }).then(() => {}, () => {}); },
};

// อัปโหลดรูปไป Storage (ย่อก่อนส่ง) → คืน URL สาธารณะ
async function resizeImage(file, max = 1400, q = 0.82) {
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
  const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(img.src);
  return c;
}
async function uploadImage(file) {
  if (!CACHE.me) throw new Error('กรุณาเข้าสู่ระบบ');
  const c = await resizeImage(file), blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.82));
  const path = `${CACHE.me.id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
  const { error } = await supa.storage.from('tour-media').upload(path, blob, { contentType: 'image/jpeg' });
  if (error) throw error;
  return supa.storage.from('tour-media').getPublicUrl(path).data.publicUrl;
}
async function slipDataUrl(file) { // สลิป: ย่อเป็น data URL เล็กพอส่งผ่าน RPC
  for (const [max, q] of [[1100, 0.78], [900, 0.65], [700, 0.55]]) {
    const u = (await resizeImage(file, max, q)).toDataURL('image/jpeg', q);
    if (u.length < 550000) return u;
  }
  throw new Error('รูปสลิปใหญ่เกินไป');
}

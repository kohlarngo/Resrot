// หลายภาษา: ไทย / English / 中文 — ต้นฉบับเป็นภาษาไทย ใช้ T('ข้อความไทย', ...ค่า) · {0} = ตัวเลข/ข้อความที่แทรก · {0?a:b} = เอกพจน์:พหูพจน์
// หน้าหลังบ้านใช้ภาษาไทยอย่างเดียว · ข้อมูลที่เจ้าของกิจการกรอกเอง (ชื่อทริป คำอธิบาย) ไม่ถูกแปล
const LANGS = {
  th: { flag: '🇹🇭', name: 'ไทย', title: 'kohlarngo — เที่ยวเกาะล้านครบจบในที่เดียว' },
  en: { flag: '🇬🇧', name: 'English', title: 'kohlarngo — Koh Larn tours & activities, all in one place' },
  zh: { flag: '🇨🇳', name: '中文', title: 'kohlarngo — 格兰岛旅游一站式预订' },
};
let LANG = (() => {
  try {
    const q = new URLSearchParams(location.hash.split('?')[1] || '').get('lang');
    if (LANGS[q]) { localStorage.setItem('tour_lang', q); return q; }
    const s = localStorage.getItem('tour_lang'); if (LANGS[s]) return s;
  } catch {}
  return 'th';
})();
// [ไทย, English, 中文]
const I18N_ROWS = [
  [`ยืนยัน`, `Confirm`, `确认`], [`ยกเลิก`, `Cancel`, `取消`], [`ปิด`, `Close`, `关闭`], [`ทั้งหมด`, `All`, `全部`], [`ค้นหา`, `Search`, `搜索`],
  [`บันทึก`, `Save`, `保存`], [`เต็ม`, `Full`, `已满`], [`กำลังโหลดข้อมูล...`, `Loading...`, `加载中...`], [`ลองอีกครั้ง`, `Try again`, `重试`],
  [`หน้าแรก`, `Home`, `首页`], [`ทริปและกิจกรรม`, `Tours & activities`, `旅游与活动`], [`ดีลสุดคุ้ม`, `Top deals`, `超值优惠`], [`การจองของฉัน`, `My bookings`, `我的预订`],
  [`รายการโปรด`, `Favorites`, `收藏`], [`ข้อมูลส่วนตัว`, `My profile`, `个人资料`], [`ออกจากระบบ`, `Log out`, `退出登录`], [`ออกจากระบบแล้ว`, `Logged out`, `已退出登录`],
  [`เข้าสู่ระบบ`, `Log in`, `登录`], [`สร้างบัญชี`, `Sign up`, `注册`], [`ไม่พบหน้านี้`, `Page not found`, `页面不存在`], [`กลับหน้าแรก`, `Back to home`, `返回首页`],
  [`ปิดปรับปรุงชั่วคราว`, `Temporarily closed for maintenance`, `系统维护中`],
  // หมวดหมู่
  [`ทริปเรือ / สปีดโบ๊ท`, `Boat & speedboat trips`, `船游 / 快艇`], [`กิจกรรมทางน้ำ`, `Water activities`, `水上活动`], [`แพ็กเกจทัวร์`, `Tour packages`, `旅游套餐`],
  [`เช่ารถ / มอเตอร์ไซค์`, `Car & scooter rental`, `租车 / 摩托车`], [`ที่พัก`, `Stays`, `住宿`], [`อาหาร / ร้านอาหาร`, `Food & dining`, `美食 / 餐厅`],
  // หน้าแรก / ค้นหา
  [`เที่ยวเกาะล้านครบจบในที่เดียว`, `Koh Larn, all in one place`, `格兰岛一站式玩转`],
  [`จองทริป กิจกรรมทางน้ำ เรือ รถ และที่พัก จ่ายตรงกับผู้ให้บริการ ยืนยันเร็ว`, `Book tours, water sports, boats, rentals and stays — pay the operator directly, fast confirmation.`, `预订旅游、水上活动、船、租车和住宿，直接向商家付款，快速确认。`],
  [`ค้นหาทริป กิจกรรม ที่พัก...`, `Search tours, activities, stays...`, `搜索旅游、活动、住宿...`], [`ทริปแนะนำ`, `Featured`, `精选推荐`], [`หมวดหมู่`, `Categories`, `分类`],
  [`ผู้ให้บริการ`, `Operators`, `服务商`], [`ไม่พบรายการที่ตรงกับการค้นหา`, `No results found`, `没有找到结果`], [`เรียงตาม`, `Sort by`, `排序`],
  [`แนะนำ`, `Recommended`, `推荐`], [`ราคาต่ำ → สูง`, `Price: low to high`, `价格从低到高`], [`ราคาสูง → ต่ำ`, `Price: high to low`, `价格从高到低`], [`คะแนนสูงสุด`, `Top rated`, `评分最高`],
  [`เริ่มต้น`, `From`, `起`], [`ต่อ {0}`, `per {0}`, `每{0}`], [`คน`, `person`, `人`], [`ลำ`, `boat`, `艘`], [`คัน`, `vehicle`, `辆`], [`คืน`, `night`, `晚`], [`วัน`, `day`, `天`], [`ชม.`, `hr`, `小时`],
  [`รีวิว {0} รายการ`, `{0} {0?review:reviews}`, `{0} 条评价`], [`ยังไม่มีรีวิว`, `No reviews yet`, `暂无评价`],
  [`โฆษณา`, `Ad`, `广告`], [`แนะนำ · โฆษณา`, `Featured · Ad`, `推荐 · 广告`],
  // หน้าทริป
  [`รายละเอียด`, `Details`, `详情`], [`ระยะเวลา`, `Duration`, `时长`], [`จุดนัดพบ`, `Meeting point`, `集合地点`], [`รวมในราคา`, `Included`, `费用包含`], [`ไม่รวม`, `Not included`, `费用不含`],
  [`เงื่อนไขการยกเลิก`, `Cancellation policy`, `取消政策`], [`เลือกตัวเลือก`, `Choose an option`, `选择套餐`], [`ผู้ใหญ่`, `Adults`, `成人`], [`เด็ก`, `Children`, `儿童`],
  [`วันที่เดินทาง`, `Travel date`, `出行日期`], [`รอบเวลา`, `Time slot`, `时间场次`], [`เลือกวันที่`, `Select date`, `选择日期`], [`เหลือ {0} ที่`, `{0} left`, `剩余 {0} 位`],
  [`ปิดรับจอง`, `Not available`, `暂不可订`], [`จองเลย`, `Book now`, `立即预订`], [`รวมทั้งหมด`, `Total`, `合计`], [`ส่วนลด`, `Discount`, `优惠`], [`ราคาเด็ก`, `Child price`, `儿童价`],
  [`ผู้ให้บริการ`, `Operator`, `服务商`], [`โทร`, `Call`, `致电`], [`รีวิวจากลูกค้า`, `Customer reviews`, `客户评价`], [`ตอบกลับจากผู้ให้บริการ`, `Reply from operator`, `商家回复`],
  // จอง
  [`ข้อมูลผู้จอง`, `Your details`, `预订人信息`], [`ชื่อ-นามสกุล`, `Full name`, `姓名`], [`เบอร์โทรศัพท์`, `Phone`, `电话`], [`อีเมล (ไม่บังคับ)`, `Email (optional)`, `邮箱（选填）`],
  [`หมายเหตุถึงผู้ให้บริการ`, `Note to operator`, `给商家的备注`], [`จุดรับ (ถ้ามี)`, `Pickup place (optional)`, `接送地点（选填）`], [`ปักหมุดจุดรับ`, `Pin pickup point`, `标记接送点`],
  [`โค้ดส่วนลด`, `Promo code`, `优惠码`], [`ใช้โค้ด`, `Apply`, `使用`], [`วิธีชำระเงิน`, `Payment method`, `付款方式`], [`โอน / พร้อมเพย์ (ส่งสลิป)`, `Bank transfer / PromptPay (upload slip)`, `转账 / PromptPay（上传水单）`],
  [`จ่ายหน้างานกับผู้ให้บริการ`, `Pay the operator on the day`, `当天现场支付`], [`ยืนยันการจอง`, `Confirm booking`, `确认预订`], [`กำลังจอง...`, `Booking...`, `预订中...`],
  [`จองสำเร็จ`, `Booking received`, `预订成功`], [`รหัสการจอง`, `Booking ID`, `预订编号`], [`รหัส PIN`, `PIN`, `PIN 码`], [`เก็บรหัสและ PIN ไว้ใช้ตรวจสอบการจอง`, `Keep your ID and PIN to view the booking`, `请保存编号和 PIN 以便查询预订`],
  [`ดูการจอง`, `View booking`, `查看预订`], [`ตรวจสอบการจอง`, `Find my booking`, `查询预订`], [`ส่งสลิปการโอน`, `Upload payment slip`, `上传转账水单`], [`ส่งสลิปแล้ว รอผู้ให้บริการตรวจสอบ`, `Slip sent — waiting for the operator to verify`, `水单已提交，等待商家核实`],
  [`สแกนจ่ายผ่านพร้อมเพย์`, `Scan to pay with PromptPay`, `PromptPay 扫码支付`], [`ชื่อบัญชี`, `Account name`, `账户名`], [`ยกเลิกการจอง`, `Cancel booking`, `取消预订`],
  [`รอยืนยัน`, `Pending`, `待确认`], [`ยืนยันแล้ว`, `Confirmed`, `已确认`], [`เสร็จสิ้น`, `Completed`, `已完成`], [`ยกเลิกแล้ว`, `Cancelled`, `已取消`], [`ชำระแล้ว`, `Paid`, `已付款`], [`ยังไม่ชำระ`, `Unpaid`, `未付款`],
  [`ให้คะแนนทริปนี้`, `Rate this trip`, `为本次行程评分`], [`ส่งรีวิว`, `Submit review`, `提交评价`], [`ขอบคุณสำหรับรีวิว`, `Thanks for your review`, `感谢您的评价`],
  [`รหัสการจอง`, `Booking ID`, `预订编号`], [`ยังไม่มีการจอง`, `No bookings yet`, `暂无预订`],
  // SOS / ท้ายเว็บ
  [`ติดต่อความช่วยเหลือ`, `Emergency & help`, `紧急求助`], [`ขอความช่วยเหลือฉุกเฉิน`, `Request emergency help`, `紧急求助`], [`ช่วยเหลือ`, `Help`, `帮助`],
  [`สำหรับผู้ให้บริการ`, `For operators`, `商家入口`], [`ลงทะเบียนเป็นผู้ให้บริการ`, `Become an operator`, `成为服务商`], [`เงื่อนไขการใช้งาน`, `Terms of use`, `使用条款`], [`นโยบายความเป็นส่วนตัว`, `Privacy policy`, `隐私政策`],
  [`ศูนย์ช่วยเหลือ`, `Help center`, `帮助中心`],
];
const I18N_MAP = new Map(I18N_ROWS.map(r => [r[0], r]));
function T(s, ...a) {
  const r = I18N_MAP.get(s);
  let t = r ? (r[LANG === 'en' ? 1 : LANG === 'zh' ? 2 : 0] || s) : s;
  return t.replace(/\{(\d+)(?:\?([^:}]*):([^}]*))?\}/g, (_, i, one, many) => one === undefined ? (a[i] ?? '') : (+a[i] === 1 ? one : many));
}
function setLang(l) { if (!LANGS[l]) return; LANG = l; try { localStorage.setItem('tour_lang', l); } catch {} document.documentElement.lang = l; document.title = LANGS[l].title; render(); }
function langSwitcherHtml() {
  return `<div class="lang-sw" id="lang-sw"><button class="btn btn-ghost btn-sm" id="lang-b" aria-label="Language">${LANGS[LANG].flag} <span class="hide-m">${LANGS[LANG].name}</span> <i class="fa-solid fa-chevron-down small"></i></button>
    <div class="lang-menu" id="lang-m" hidden>${Object.entries(LANGS).map(([k, v]) => `<button data-lang="${k}" class="${k === LANG ? 'on' : ''}">${v.flag} ${v.name}</button>`).join('')}</div></div>`;
}
function bindLangSwitcher() {
  const b = $('#lang-b'), m = $('#lang-m'); if (!b) return;
  b.onclick = e => { e.stopPropagation(); m.hidden = !m.hidden; if (!m.hidden) setTimeout(() => document.addEventListener('click', () => (m.hidden = true), { once: true })); };
  $$('[data-lang]', m).forEach(x => x.onclick = () => setLang(x.dataset.lang));
}

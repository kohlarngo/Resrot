// ================= หลายภาษา: ไทย / English / 中文 =================
// ต้นฉบับทุกหน้าเขียนเป็นภาษาไทย — ตัวแปลจะแทนข้อความบนหน้าจอจากพจนานุกรมด้านล่างหลังเรนเดอร์ทุกครั้ง (หน้าลูกค้าเท่านั้น หลังบ้านยังเป็นภาษาไทย)
//  · {0} {1} ... = ตัวเลข/วันที่ในข้อความ (ตัวแปลดึงออกมาแล้วใส่คืนให้)   · {0?night:nights} = เลือกเอกพจน์/พหูพจน์ตามเลข {0}
//  · ข้อมูลที่เจ้าของรีสอร์ทกรอกเอง (ชื่อ คำอธิบาย รีวิว) ไม่ถูกแปล ยกเว้นคำที่ตรงกับพจนานุกรม (ประเภทที่พัก ชื่อหาด ห้องมาตรฐาน ฯลฯ)
const LANGS = {
  th: { flag: '🇹🇭', name: 'ไทย', title: 'kohlarngo — จองที่พักเกาะล้าน ราคาดีที่สุด' },
  en: { flag: '🇬🇧', name: 'English', title: 'kohlarngo — Book Koh Larn stays at the best price' },
  zh: { flag: '🇨🇳', name: '中文', title: 'kohlarngo — 预订格兰岛住宿，价格最优' },
};
let LANG = (() => {
  try {
    const q = new URLSearchParams(location.hash.split('?')[1] || '').get('lang'); // ลิงก์แชร์ระบุภาษาได้ เช่น #/hotel/xxx?lang=zh
    if (LANGS[q]) { localStorage.setItem('sd_lang', q); return q; }
    const s = localStorage.getItem('sd_lang');
    if (LANGS[s]) return s;
  } catch {}
  return 'th';
})();

// [ไทย, English, 中文]
const I18N_ROWS = [
  // ---------- ทั่วไป ----------
  [`ยืนยัน`, `Confirm`, `确认`], [`ยกเลิก`, `Cancel`, `取消`], [`ยืนยันการทำรายการ`, `Confirm action`, `确认操作`], [`ลบ`, `Remove`, `删除`],
  [`ค้นหา`, `Search`, `搜索`], [`เสร็จสิ้น`, `Done`, `完成`], [`ปิด`, `Close`, `关闭`], [`ทั้งหมด`, `All`, `全部`], [`เต็ม`, `Full`, `已满`],
  [`ห้อง`, `Room`, `房间`], [`ห้องพัก`, `Rooms`, `客房`], [`เปลี่ยน`, `Change`, `更改`], [`แชร์`, `Share`, `分享`], [`รีวิว`, `Reviews`, `点评`],
  // ---------- วันที่ ----------
  [`อา.`, `Su`, `日`], [`จ.`, `Mo`, `一`], [`อ.`, `Tu`, `二`], [`พ.`, `We`, `三`], [`พฤ.`, `Th`, `四`], [`ศ.`, `Fr`, `五`], [`ส.`, `Sa`, `六`],
  [`{0} คืน`, `{0} {0?night:nights}`, `{0} 晚`], [`{0} คืนรวม`, `{0} {0?night:nights} total`, `{0} 晚合计`],
  [`{0} ห้อง`, `{0} {0?room:rooms}`, `{0} 间`], [`{0} ที่พัก`, `{0} {0?property:properties}`, `{0} 家住宿`], [`{0} ปี`, `{0} yrs`, `{0} 岁`],
  // ---------- ส่วนหัว / เมนู ----------
  [`หน้าแรก`, `Home`, `首页`], [`ค้นหาที่พัก`, `Find stays`, `搜索住宿`], [`ดีลสุดคุ้ม`, `Top deals`, `超值优惠`], [`การจองของฉัน`, `My bookings`, `我的订单`],
  [`รายการโปรด`, `Favorites`, `收藏`], [`หลังบ้าน`, `Back office`, `管理后台`], [`ระบบหลังบ้าน`, `Back office`, `管理后台`], [`เข้าสู่ระบบ`, `Log in`, `登录`],
  [`สร้างบัญชี`, `Sign up`, `注册`], [`ข้อมูลส่วนตัว`, `My profile`, `个人资料`], [`ออกจากระบบ`, `Log out`, `退出登录`], [`สกุลเงิน`, `Currency`, `货币`], [`ภาษา`, `Language`, `语言`],
  [`ออกจากระบบแล้ว`, `Logged out`, `已退出登录`], [`ไม่พบหน้านี้`, `Page not found`, `页面不存在`], [`กำลังโหลดข้อมูล...`, `Loading...`, `加载中...`],
  [`ปิดปรับปรุงชั่วคราว`, `Temporarily closed for maintenance`, `系统维护中`], [`เชื่อมต่อฐานข้อมูลไม่สำเร็จ`, `Could not connect to the database`, `无法连接数据库`], [`ลองอีกครั้ง`, `Try again`, `重试`],
  // ---------- กล่องค้นหา ----------
  [`ระบุหาด ชื่อที่พัก หรือสิ่งที่ต้องการ เช่น สัตว์เลี้ยงเข้าพักได้ ติดทะเล เช่า จยย`, `Beach, property, or what you need — e.g. pets allowed, beachfront, motorbike rental`, `输入海滩、住宿名称或需求，如：可带宠物、海边、租摩托车`], [`เช็คอิน`, `Check-in`, `入住`], [`เช็คเอาท์`, `Check-out`, `退房`],
  [`ผู้เข้าพัก · ห้อง`, `Guests · Rooms`, `住客 · 房间`], [`เลือกวันที่`, `Select date`, `选择日期`],
  [`ผู้ใหญ่ {0}, เด็ก {1} · {2} ห้อง`, `{0} {0?adult:adults}, {1} {1?child:children} · {2} {2?room:rooms}`, `{0} 位成人，{1} 位儿童 · {2} 间房`],
  [`ผู้ใหญ่ {0}`, `{0} {0?adult:adults}`, `{0} 位成人`], [`เด็ก {0}`, `{0} {0?child:children}`, `{0} 位儿童`],
  [`ผู้ใหญ่ {0} · {1} ห้อง`,`{0} {0?adult:adults} · {1} {1?room:rooms}`, `{0} 位成人 · {1} 间房`],
  [`ชายหาดยอดนิยมบนเกาะล้าน`, `Popular beaches on Koh Larn`, `格兰岛热门海滩`], [`ไม่พบผลลัพธ์ — ลองคำค้นอื่น`, `No results — try another search`, `无结果 — 请换个关键词`],
  [`เกาะล้าน · ชลบุรี`, `Koh Larn · Chonburi`, `格兰岛 · 春武里`], [`เกาะล้าน จ.ชลบุรี`, `Koh Larn, Chonburi`, `春武里府格兰岛`], [`ย่าน`, `Area`, `区域`],
  [`เลือกวันเช็คอิน`, `Select check-in date`, `选择入住日期`], [`เลือกวันเช็คเอาท์`, `Select check-out date`, `选择退房日期`],
  [`วันหยุดสุดสัปดาห์ราคาอาจสูงขึ้น`, `Weekend prices may be higher`, `周末价格可能较高`], [`จองได้สูงสุด {0} คืนต่อครั้ง`, `Maximum {0} nights per booking`, `每次最多可订 {0} 晚`],
  [`ผู้ใหญ่`, `Adults`, `成人`], [`อายุ {0} ปีขึ้นไป`, `Ages {0}+`, `{0} 岁及以上`], [`เด็ก`, `Children`, `儿童`], [`อายุ {0}-{1} ปี`, `Ages {0}-{1}`, `{0}-{1} 岁`],
  [`อายุของเด็ก (ณ วันเช็คเอาท์)`, `Children's ages (at check-out)`, `儿童年龄（退房当日）`], [`ต่ำกว่า {0}`, `Under {0}`, `不满 {0}`],
  // ---------- ส่วนท้าย ----------
  [`ช่วยเหลือ`, `Help`, `帮助`], [`ศูนย์ช่วยเหลือ`, `Help center`, `帮助中心`], [`คำถามที่พบบ่อย`, `FAQ`, `常见问题`], [`นโยบายความเป็นส่วนตัว`, `Privacy policy`, `隐私政策`],
  [`ข้อกำหนดการใช้งาน`, `Terms of use`, `使用条款`], [`จุดหมายยอดนิยม`, `Popular destinations`, `热门目的地`], [`พาร์ทเนอร์`, `Partners`, `合作伙伴`],
  [`ลงทะเบียนรีสอร์ทฟรี`, `List your resort for free`, `免费入驻度假村`], [`ระบบเจ้าของรีสอร์ท`, `Resort owner portal`, `度假村业主系统`], [`ร่วมเป็นพันธมิตร`, `Become a partner`, `成为合作伙伴`],
  [`© {0} kohlarngo — ระบบจองที่พักเกาะล้าน · ราคาทั้งหมดเป็นสกุลเงินบาท (THB)`, `© {0} kohlarngo — Koh Larn booking platform · All prices are in Thai baht (THB)`, `© {0} kohlarngo — 格兰岛住宿预订平台 · 所有价格均以泰铢 (THB) 计`],
  // ---------- เข้าสู่ระบบ ----------
  [`ดำเนินการต่อด้วย Google`, `Continue with Google`, `使用 Google 继续`], [`ดำเนินการต่อด้วย Facebook`, `Continue with Facebook`, `使用 Facebook 继续`], [`หรือใช้อีเมล`, `or use email`, `或使用邮箱`],
  [`ต้องเปิดเว็บผ่านโดเมนจริง (https) จึงจะเข้าสู่ระบบด้วย Google / Facebook ได้`, `Open the site on its real https domain to log in with Google / Facebook`, `需通过正式 https 域名访问网站，才能使用 Google / Facebook 登录`],
  [`สร้างบัญชีใหม่`, `Create a new account`, `创建新账号`], [`เข้าสู่ระบบเพื่อจัดการการจองและรับส่วนลดพิเศษสำหรับสมาชิก`, `Log in to manage your bookings and get member-only discounts`, `登录以管理订单并享受会员专属优惠`],
  [`สมัครฟรี รับส่วนลดสมาชิกทันที`, `Sign up free and get an instant member discount`, `免费注册，立即享受会员折扣`], [`ชื่อ-นามสกุล`, `Full name`, `姓名`], [`อีเมล`, `Email`, `电子邮箱`], [`รหัสผ่าน`, `Password`, `密码`],
  [`ยังไม่มีบัญชี?`, `No account yet?`, `还没有账号？`], [`มีบัญชีแล้ว?`, `Already have an account?`, `已有账号？`], [`กรุณากรอกชื่อ`, `Please enter your name`, `请输入姓名`],
  [`รูปแบบอีเมลไม่ถูกต้อง`, `Invalid email format`, `邮箱格式不正确`], [`รหัสผ่านต้องมีอย่างน้อย {0} ตัวอักษร`, `Password must be at least {0} characters`, `密码至少 {0} 个字符`],
  [`อีเมลหรือรหัสผ่านไม่ถูกต้อง`, `Incorrect email or password`, `邮箱或密码不正确`], [`อีเมลนี้ถูกใช้งานแล้ว`, `This email is already in use`, `该邮箱已被注册`],
  [`กรุณายืนยันอีเมลจากลิงก์ที่ส่งไป แล้วเข้าสู่ระบบอีกครั้ง`, `Please confirm your email via the link we sent, then log in again`, `请先通过发送的链接验证邮箱，然后重新登录`],
  [`บัญชีนี้ถูกระงับการใช้งาน — โปรดติดต่อเจ้าของกิจการ`, `This account has been suspended — please contact the operator`, `该账号已被停用 — 请联系运营方`],
  // ---------- หน้าแรก ----------
  [`ค้นหาที่พักราคาดีที่สุด`, `Find the best-priced stays`, `搜索最优价住宿`],
  [`ที่พัก รีสอร์ท และพูลวิลล่ากว่า {0} แห่งทั่วเกาะล้าน พร้อมราคาพิเศษเฉพาะสมาชิก`, `Over {0} hotels, resorts and pool villas across Koh Larn, with member-only prices`, `格兰岛全岛 {0} 多家酒店、度假村和泳池别墅，会员享专属价格`],
  [`โปรโมชั่นที่คุณไม่ควรพลาด`, `Promotions you shouldn't miss`, `不容错过的优惠`], [`ลดสูงสุด {0}%`, `Up to {0}% off`, `最高优惠 {0}%`], [`ทะเลใสเกาะล้านเรียกหา`, `Crystal-clear Koh Larn is calling`, `格兰岛碧海在召唤`],
  [`รีสอร์ทริมหาดแสม ราคาพิเศษ`, `Beachfront resorts at Samae Beach, special prices`, `萨梅海滩海边度假村，特价优惠`], [`สมาชิกใหม่`, `New members`, `新会员`], [`ลดเพิ่ม {0}%`, `Extra {0}% off`, `再减 {0}%`],
  [`ใช้โค้ด`, `Use code`, `使用优惠码`], [`(คลิกเพื่อคัดลอก)`, `(click to copy)`, `（点击复制）`], [`ดีลพูลวิลล่า`, `Pool villa deal`, `泳池别墅优惠`], [`ลดทันที ฿{0}`, `Instant ฿{0} off`, `立减 ฿{0}`],
  [`เมื่อจองครบ ฿{0}`, `when you book ฿{0}+`, `订单满 ฿{0} 可用`], [`ที่พักที่คุณดูล่าสุด`, `Recently viewed`, `最近浏览`], [`จุดหมายปลายทางยอดนิยมในเกาะล้าน`, `Popular destinations on Koh Larn`, `格兰岛热门目的地`],
  [`ดีลสุดคุ้มวันนี้`, `Today's best deals`, `今日超值优惠`], [`ดูทั้งหมด`, `See all`, `查看全部`], [`ที่พักแนะนำตามชายหาด`, `Recommended stays by beach`, `按海滩推荐住宿`], [`ยังไม่มีที่พักในบริเวณนี้`, `No properties in this area yet`, `该区域暂无住宿`],
  [`ทำไมต้องจองกับ kohlarngo`, `Why book with kohlarngo`, `为什么选择 kohlarngo 预订`], [`จองตรงกับที่พักเกาะล้าน`, `Book direct with Koh Larn stays`, `直接预订格兰岛住宿`], [`ราคาตรงจากเจ้าของที่พัก ไม่ผ่านคนกลาง`, `Prices straight from the owners, no middlemen`, `房东直接定价，无中间商`],
  [`ยกเลิกฟรี`, `Free cancellation`, `免费取消`], [`ที่พักหลายแห่งยกเลิกได้ฟรีก่อนเข้าพัก`, `Many properties allow free cancellation before check-in`, `许多住宿在入住前可免费取消`],
  [`ชำระเงินปลอดภัย`, `Secure payment`, `安全支付`], [`สแกนจ่ายพร้อมเพย์ได้ทุกธนาคาร หรือชำระที่ที่พัก`, `Pay by PromptPay QR from any bank, or pay at the property`, `支持任意银行扫码支付 (PromptPay)，或到店支付`],
  [`บริการ {0} ชม.`, `{0}-hour support`, `{0} 小时服务`], [`ทีมงานพร้อมช่วยเหลือคุณตลอดเวลา`, `Our team is here to help any time`, `团队随时为您提供帮助`],
  [`บันทึกในรายการโปรด`, `Save to favorites`, `加入收藏`], [`บันทึกในรายการโปรดแล้ว`, `Saved to favorites`, `已加入收藏`], [`ลบออกจากรายการโปรดแล้ว`, `Removed from favorites`, `已取消收藏`],
  // ---------- การ์ด / คะแนน ----------
  [`ต่อคืน`, `per night`, `每晚`], [`ที่พักใหม่`, `New`, `新上线`], [`ยังไม่มีรีวิว`, `No reviews yet`, `暂无点评`], [`{0} รีวิว`, `{0} {0?review:reviews}`, `{0} 条点评`],
  [`ยอดเยี่ยม`, `Exceptional`, `极好`], [`ดีเยี่ยม`, `Excellent`, `非常好`], [`ดีมาก`, `Very good`, `很好`], [`ดี`, `Good`, `好`], [`พอใช้`, `Fair`, `一般`],
  // ---------- ผลการค้นหา ----------
  [`ที่พักทั้งหมด`, `All properties`, `全部住宿`], [`ตัวกรอง`, `Filters`, `筛选`], [`ล้างทั้งหมด`, `Clear all`, `清除全部`], [`ล้างตัวกรอง`, `Clear filters`, `清除筛选`],
  [`แนะนำ`, `Recommended`, `推荐`], [`ราคาต่ำสุด`, `Lowest price`, `价格最低`], [`คะแนนรีวิว`, `Review score`, `点评评分`], [`ใกล้ท่าเรือ`, `Near the pier`, `靠近码头`], [`ระดับดาว`, `Star rating`, `星级`], [`ดีลร้อนแรง`, `Hot deals`, `热门优惠`],
  [`ดูบนแผนที่`, `View on map`, `地图查看`], [`งบประมาณต่อคืน`, `Budget per night`, `每晚预算`], [`ต่ำสุด`, `Min`, `最低`], [`สูงสุด`, `Max`, `最高`], [`ตัวเลือกยอดนิยม`, `Popular choices`, `热门选项`],
  [`ชำระเงินที่ที่พัก`, `Pay at property`, `到店支付`], [`รวมอาหารเช้า`, `Breakfast included`, `含早餐`], [`ยอดเยี่ยม {0}+`, `Exceptional {0}+`, `极好 {0}+`], [`ดีเยี่ยม {0}+`, `Excellent {0}+`, `非常好 {0}+`],
  [`ดีมาก {0}+`, `Very good {0}+`, `很好 {0}+`], [`ดี {0}+`, `Good {0}+`, `好 {0}+`], [`ประเภทที่พัก`, `Property type`, `住宿类型`], [`สิ่งอำนวยความสะดวก`, `Facilities`, `设施`], [`ย่าน / พื้นที่`, `Area / neighborhood`, `区域`],
  [`ทุกจุดหมาย`, `All destinations`, `所有目的地`], [`พบที่พัก {0} แห่ง`, `{0} {0?property:properties} found`, `找到 {0} 家住宿`], [`พบที่พัก {0} แห่ง (ว่าง {1})`, `{0} {0?property:properties} found ({1} available)`, `找到 {0} 家住宿（{1} 家有空房）`],
  [`แผนที่`, `Map`, `地图`], [`รายการ`, `List`, `列表`], [`ไม่พบที่พักที่ตรงกับเงื่อนไข`, `No properties match your filters`, `没有符合条件的住宿`], [`ลองปรับตัวกรองหรือค้นหาจุดหมายอื่น`, `Try adjusting the filters or searching elsewhere`, `请调整筛选条件或更换目的地`],
  [`ไม่สามารถโหลดแผนที่ได้ (ต้องเชื่อมต่ออินเทอร์เน็ต)`, `Unable to load the map (internet connection required)`, `无法加载地图（需要网络连接）`], [`ดูรายละเอียด →`, `View details →`, `查看详情 →`],
  [`แสดงเพิ่มเติม ({0})`, `Show more ({0})`, `显示更多（{0}）`], [`ห่างจากท่าเรือหน้าบ้าน {0} กม.`, `{0} km from Na Ban pier`, `距那班码头 {0} 公里`], [`ไม่ต้องชำระล่วงหน้า`, `No prepayment needed`, `无需预付`],
  [`ติดชายหาด`, `Beachfront`, `海滨`], [`เหลือเพียง {0} ห้องในราคานี้!`, `Only {0} {0?room:rooms} left at this price!`, `此价格仅剩 {0} 间！`], [`ดีลพิเศษ`, `Special deal`, `特惠`],
  [`ต่อห้องต่อคืน`, `per room per night`, `每间每晚`], [`{0} คืน, {1} ห้อง:`, `{0} {0?night:nights}, {1} {1?room:rooms}:`, `{0} 晚，{1} 间：`],
  [`ห้องเต็มในวันที่เลือก`, `Sold out on your dates`, `所选日期已订满`], [`ลองเปลี่ยนวันเข้าพัก`, `Try different dates`, `请更换入住日期`],
  [`รายการโปรดของฉัน`, `My favorites`, `我的收藏`], [`ยังไม่มีที่พักในรายการโปรด`, `No favorites yet`, `暂无收藏`], [`กดรูปหัวใจที่ที่พักเพื่อบันทึกไว้ดูภายหลัง`, `Tap the heart on a property to save it for later`, `点击住宿上的爱心即可收藏`],
  // ---------- หน้าที่พัก ----------
  [`ไม่พบที่พักนี้`, `Property not found`, `未找到该住宿`], [`กลับไปค้นหา`, `Back to search`, `返回搜索`], [`ดูรูปทั้งหมด ({0})`, `View all photos ({0})`, `查看全部照片（{0}）`], [`ภาพรวม`, `Overview`, `概览`], [`ที่ตั้ง`, `Location`, `位置`], [`นโยบาย`, `Policies`, `政策`],
  [`ดูแผนที่`, `View map`, `查看地图`], [`ติดตามรีสอร์ท:`, `Follow the resort:`, `关注度假村：`], [`เลือกห้องพัก`, `Choose a room`, `选择房型`], [`คัดลอกลิงก์รีสอร์ทแล้ว`, `Resort link copied`, `已复制度假村链接`],
  [`รีวิวจากผู้เข้าพักจริง`, `Reviews from real guests`, `真实住客点评`], [`ยังไม่มีรีวิว ผู้เข้าพักจะรีวิวได้หลังเช็คเอาท์`, `No reviews yet. Guests can review after check-out`, `暂无点评，住客退房后可点评`],
  [`จาก {0} รีวิว`, `from {0} {0?review:reviews}`, `共 {0} 条点评`], [`ความสะอาด`, `Cleanliness`, `清洁度`], [`ทำเลที่ตั้ง`, `Location`, `地理位置`], [`การบริการ`, `Service`, `服务`], [`ความคุ้มค่า`, `Value for money`, `性价比`],
  [`ดูรีวิวเพิ่มเติม`, `See more reviews`, `查看更多点评`], [`เข้าพัก {0}`, `Stayed {0}`, `入住于 {0}`], [`นโยบายที่พัก`, `Property policies`, `住宿政策`], [`ตั้งแต่ {0} น.`, `From {0}`, `{0} 起`], [`ก่อน {0} น.`, `Before {0}`, `{0} 前`],
  [`เด็กและเตียงเสริม`, `Children & extra beds`, `儿童和加床`], [`เด็กอายุต่ำกว่า {0} ปีพักฟรีเมื่อใช้เตียงที่มีอยู่ · เตียงเสริม ฿{1}/คืน`, `Children under {0} stay free using existing beds · Extra bed ฿{1}/night`, `{0} 岁以下儿童使用现有床铺免费入住 · 加床 ฿{1}/晚`],
  [`สัตว์เลี้ยง`, `Pets`, `宠物`], [`อนุญาต (อาจมีค่าธรรมเนียมเพิ่มเติม)`, `Allowed (extra charges may apply)`, `允许（可能收取额外费用）`], [`ไม่อนุญาต`, `Not allowed`, `不允许`], [`การยกเลิก`, `Cancellation`, `取消政策`],
  [`ขึ้นอยู่กับประเภทห้องที่เลือก — ดูรายละเอียดในแต่ละข้อเสนอ`, `Depends on the room type chosen — see each offer for details`, `视所选房型而定 — 详见各报价`], [`การชำระเงิน`, `Payment`, `支付方式`],
  [`พร้อมเพย์ (สแกน QR) โอนผ่านธนาคาร หรือชำระที่ที่พัก (บางห้อง)`, `PromptPay (QR scan), bank transfer, or pay at the property (some rooms)`, `PromptPay 扫码、银行转账，或到店支付（部分房型）`],
  [`ราคาเริ่มต้น`, `Starting from`, `起价`], [`/คืน`, `/night`, `/晚`], [`จุดเด่น`, `Highlights`, `亮点`], [`เช็คอิน {0}`, `Check-in {0}`, `入住 {0}`], [`เช็คเอาท์ {0}`, `Check-out {0}`, `退房 {0}`],
  [`ทำเลดี`, `Great location`, `位置优越`], [`คุ้มค่าเงิน`, `Great value`, `物超所值`], [`Wi-Fi ฟรี`, `Free Wi-Fi`, `免费 Wi-Fi`],
  // ---------- ห้องพัก ----------
  [`เหลือเพียง {0} ห้อง!`, `Only {0} {0?room:rooms} left!`, `仅剩 {0} 间！`], [`{0} ตร.ม.`, `{0} m²`, `{0} 平方米`], [`พักได้สูงสุด {0} ท่าน`, `Sleeps up to {0}`, `最多入住 {0} 人`], [`เครื่องปรับอากาศ`, `Air conditioning`, `空调`],
  [`สิ่งที่รวมในราคา`, `What's included`, `价格包含`], [`ผู้เข้าพัก`, `Guests`, `住客`], [`ราคาต่อคืน`, `Price per night`, `每晚价格`], [`จำนวนห้อง`, `Rooms`, `房间数`], [`ห้องประเภทนี้เต็มในวันที่เลือก`, `This room type is sold out on your dates`, `该房型所选日期已订满`],
  [`ไม่รวมอาหารเช้า`, `Breakfast not included`, `不含早餐`], [`ก่อน {0}`, `before {0}`, `{0} 前`], [`ไม่สามารถคืนเงินได้`, `Non-refundable`, `不可退款`], [`ชำระเงินล่วงหน้า`, `Pay in advance`, `需提前支付`], [`ต้องจองหลายห้อง`, `Multiple rooms required`, `需订多间房`],
  [`ไม่รวมภาษีและค่าธรรมเนียม`, `Excludes taxes and fees`, `不含税费`], [`จองเลย`, `Book now`, `立即预订`],
  [`ห้องสแตนดาร์ด`, `Standard Room`, `标准房`], [`ห้องซูพีเรียร์ ดับเบิล`, `Superior Double Room`, `高级大床房`], [`ห้องดีลักซ์ ทวิน`, `Deluxe Twin Room`, `豪华双床房`], [`ห้องดีลักซ์ วิวทะเล`, `Deluxe Sea View Room`, `豪华海景房`],
  [`ห้องแฟมิลี่`, `Family Room`, `家庭房`], [`จูเนียร์สวีท`, `Junior Suite`, `小型套房`], [`พูลวิลล่า {0} ห้องนอน`, `{0}-Bedroom Pool Villa`, `{0} 卧室泳池别墅`], [`เตียงในห้องรวม {0} เตียง`, `Bed in {0}-bed dormitory`, `{0} 人间宿舍床位`],
  [`{0} เตียงควีนไซซ์`, `{0} queen bed`, `{0} 张大床 (Queen)`], [`{0} เตียงคิงไซซ์`, `{0} king bed`, `{0} 张特大床 (King)`], [`{0} เตียงเดี่ยว`, `{0} single {0?bed:beds}`, `{0} 张单人床`], [`{0} เตียงสองชั้น`, `{0} bunk bed`, `{0} 张双层床`],
  [`{0} เตียงคิงไซซ์ + {1} เตียงเดี่ยว`, `{0} king bed + {1} single {1?bed:beds}`, `{0} 张特大床 + {1} 张单人床`], [`วิวสวน`, `Garden view`, `花园景观`], [`วิวภูเขา`, `Mountain view`, `山景`], [`วิวทะเล`, `Sea view`, `海景`], [`วิวสระว่ายน้ำ`, `Pool view`, `泳池景观`],
  [`วิวพาโนรามา`, `Panoramic view`, `全景视野`], [`สระว่ายน้ำส่วนตัว`, `Private pool`, `私人泳池`],
  [`โรงแรม`, `Hotel`, `酒店`], [`รีสอร์ท`, `Resort`, `度假村`], [`วิลล่า`, `Villa`, `别墅`], [`บังกะโล`, `Bungalow`, `小木屋`], [`เกสต์เฮาส์`, `Guesthouse`, `民宿`], [`โฮสเทล`, `Hostel`, `青旅`], [`แกลมปิ้ง`, `Glamping`, `豪华露营`],
  // ---------- สิ่งอำนวยความสะดวก ----------
  [`สระว่ายน้ำ`, `Swimming pool`, `游泳池`], [`ที่จอดรถฟรี`, `Free parking`, `免费停车`], [`อาหารเช้า`, `Breakfast`, `早餐`], [`ฟิตเนส`, `Fitness center`, `健身房`], [`สปา`, `Spa`, `水疗`], [`ห้องอาหาร`, `Restaurant`, `餐厅`], [`บาร์`, `Bar`, `酒吧`],
  [`รถรับส่งท่าเรือ`, `Pier shuttle`, `码头接送`], [`คลับสำหรับเด็ก`, `Kids club`, `儿童俱乐部`], [`แถมมอเตอร์ไซค์ฟรี`, `Free motorbike included`, `赠送摩托车`], [`สัตว์เลี้ยงเข้าพักได้`, `Pet friendly`, `可携带宠物`], [`แผนกต้อนรับ {0} ชม.`, `{0}-hour front desk`, `{0} 小时前台`],
  [`บริการซักรีด`, `Laundry service`, `洗衣服务`], [`ห้องปลอดบุหรี่`, `Non-smoking rooms`, `无烟房`], [`ดำน้ำตื้น / เช่าอุปกรณ์`, `Snorkeling / gear rental`, `浮潜 / 设备租赁`], [`เตาบาร์บีคิว`, `BBQ grill`, `烧烤炉`],
  [`จักรยาน / มอเตอร์ไซค์เช่า`, `Bike / scooter rental`, `自行车 / 摩托车租赁`], [`สมาร์ททีวี`, `Smart TV`, `智能电视`], [`ครัวส่วนตัว`, `Private kitchen`, `私人厨房`], [`รถรับส่งรอบเกาะ`, `Island shuttle`, `环岛接送`], [`คาเฟ่ / กาแฟ`, `Café / coffee`, `咖啡厅`],
  [`ตู้เซฟในห้อง`, `In-room safe`, `房内保险箱`], [`ไดร์เป่าผม`, `Hair dryer`, `吹风机`], [`คาราโอเกะ`, `Karaoke`, `卡拉 OK`], [`ที่ชาร์จรถ EV`, `EV charging`, `电动车充电`], [`จุดชมพระอาทิตย์ตก`, `Sunset viewpoint`, `日落观景点`],
  // ---------- ชายหาด ----------
  [`หน้าบ้าน`, `Na Ban`, `那班村`], [`หาดตาแหวน`, `Tawaen Beach`, `塔瓦恩海滩`], [`หาดแสม`, `Samae Beach`, `萨梅海滩`], [`หาดเทียน`, `Tien Beach`, `天海滩`], [`หาดนวล`, `Nual Beach`, `暖海滩`], [`หาดตายาย`, `Ta Yai Beach`, `达央海滩`], [`หาดสังวาลย์`, `Sangwan Beach`, `桑万海滩`],
  [`ที่พักหน้าบ้าน`, `Stays in Na Ban`, `那班村住宿`], [`ที่พักหาดตาแหวน`, `Stays at Tawaen Beach`, `塔瓦恩海滩住宿`], [`ที่พักหาดแสม`, `Stays at Samae Beach`, `萨梅海滩住宿`], [`ที่พักหาดเทียน`, `Stays at Tien Beach`, `天海滩住宿`], [`ที่พักหาดนวล`, `Stays at Nual Beach`, `暖海滩住宿`],
  // ---------- การจอง ----------
  [`ข้อมูลการจองไม่ถูกต้อง`, `Invalid booking details`, `订单信息无效`], [`กลับหน้าแรก`, `Back to home`, `返回首页`], [`ขออภัย ห้องว่างไม่เพียงพอแล้ว`, `Sorry, not enough rooms available`, `抱歉，空房不足`], [`เลือกห้องอื่น`, `Choose another room`, `选择其他房型`],
  [`ไทย`, `Thailand`, `泰国`], [`ญี่ปุ่น`, `Japan`, `日本`], [`จีน`, `China`, `中国`], [`สหรัฐอเมริกา`, `United States`, `美国`], [`สหราชอาณาจักร`, `United Kingdom`, `英国`], [`อื่นๆ`, `Other`, `其他`],
  [`กรอกข้อมูลผู้เข้าพัก`, `Guest details`, `填写住客信息`], [`ชำระเงิน`, `Payment`, `支付`], [`ยืนยันการจอง`, `Confirm booking`, `确认预订`], [`ตั้งแต่ {0}`, `from {0}`, `{0} 起`],
  [`ราคาปกติ ({0} ห้อง x {1} คืน)`, `Regular price ({0} {0?room:rooms} x {1} {1?night:nights})`, `原价（{0} 间 x {1} 晚）`], [`ส่วนลดที่พัก`, `Property discount`, `住宿折扣`], [`ราคาห้องพัก`, `Room price`, `房费`], [`ส่วนลดสมาชิก {0}%`, `Member discount {0}%`, `会员折扣 {0}%`],
  [`ส่วนลดสมาชิก`, `Member discount`, `会员折扣`], [`ภาษีและค่าธรรมเนียม ({0}%)`, `Taxes and fees ({0}%)`, `税费（{0}%）`], [`ภาษีและค่าธรรมเนียม`, `Taxes and fees`, `税费`], [`ราคารวมทั้งหมด`, `Total price`, `总价`],
  [`เพื่อรับส่วนลดสมาชิกเพิ่ม {0}%`, `for an extra {0}% member discount`, `即可再享 {0}% 会员折扣`], [`ใส่โค้ดส่วนลด`, `Enter promo code`, `输入优惠码`], [`ใช้ส่วนลด`, `Apply`, `使用`], [`ใช้โค้ดสำเร็จ ลด ฿{0}`, `Code applied — ฿{0} off`, `优惠码已使用，减 ฿{0}`],
  [`เราสำรองราคานี้ไว้ให้คุณ`, `We're holding this price for you for`, `我们为您保留此价格`], [`นาที`, `minutes`, `分钟`], [`หมดเวลาการจอง กรุณาเลือกห้องใหม่อีกครั้ง`, `Booking time expired — please choose a room again`, `预订超时，请重新选择房型`],
  [`มีบัญชีแล้ว?`, `Already have an account?`, `已有账号？`], [`เข้าสู่ระบบเพื่อจองเร็วขึ้นและรับส่วนลด {0}%`, `Log in to book faster and get {0}% off`, `登录后预订更快，还可享 {0}% 折扣`], [`ข้อมูลผู้เข้าพัก`, `Guest information`, `住客信息`],
  [`ชื่อ`, `First name`, `名`], [`นามสกุล`, `Last name`, `姓`], [`เบอร์โทรศัพท์`, `Phone number`, `手机号码`], [`กรุณากรอกข้อมูล`, `Please fill this in`, `请填写`], [`กรุณากรอกอีเมลที่ถูกต้อง`, `Please enter a valid email`, `请输入有效的邮箱`],
  [`กรุณากรอกเบอร์โทร {0}-{1} หลัก`, `Please enter a {0}-{1} digit phone number`, `请输入 {0}-{1} 位手机号码`], [`ประเทศของคุณ`, `Country of residence`, `居住国家`], [`เราจะส่งใบยืนยันการจองไปที่อีเมลนี้`, `We'll send your booking confirmation to this email`, `订单确认函将发送至此邮箱`],
  [`คำขอพิเศษ`, `Special requests`, `特殊要求`], [`(ไม่บังคับ)`, `(optional)`, `（选填）`], [`คำขอพิเศษขึ้นอยู่กับความพร้อมของที่พัก`, `Special requests are subject to availability`, `特殊要求视住宿情况而定`],
  [`ชั้นสูง`, `High floor`, `高楼层`], [`เตียงใหญ่`, `Large bed`, `大床`], [`เช็คอินก่อนเวลา`, `Early check-in`, `提前入住`], [`เช็คเอาท์ล่าช้า`, `Late check-out`, `延迟退房`], [`ห้องติดกัน`, `Adjoining rooms`, `相邻房间`],
  [`เวลาที่คาดว่าจะมาถึง`, `Estimated arrival time`, `预计到达时间`], [`ไม่ระบุ`, `Not specified`, `未指定`], [`ข้อความถึงที่พัก`, `Message to the property`, `给住宿的留言`], [`ถัดไป: ชำระเงิน`, `Next: Payment`, `下一步：支付`],
  [`กรุณากรอกข้อมูลให้ครบถ้วน`, `Please complete all required fields`, `请填写完整信息`], [`เลือกวิธีชำระเงิน`, `Choose a payment method`, `选择支付方式`], [`ไม่ต้องชำระตอนนี้`, `No payment needed now`, `暂无需支付`],
  [`พร้อมเพย์ (PromptPay QR)`, `PromptPay (QR code)`, `PromptPay 扫码支付`], [`สแกนจ่ายได้ทุกธนาคาร`, `Works with any Thai bank`, `支持任意泰国银行`], [`โอนผ่านธนาคาร / Mobile Banking`, `Bank transfer / Mobile banking`, `银行转账 / 手机银行`],
  [`ที่พักนี้ยังไม่เปิดรับชำระเงินออนไลน์สำหรับห้องนี้ — กรุณาติดต่อ`, `This property doesn't accept online payment for this room yet — please contact`, `该住宿暂不支持此房型的在线支付 — 请联系`],
  [`ชำระเงินตรงถึงเจ้าของรีสอร์ท`, `Pay directly to the resort owner`, `直接向度假村业主付款`], [`การจองจะสมบูรณ์เมื่อเจ้าของรีสอร์ทยืนยัน`, `Your booking is complete once the resort owner confirms`, `业主确认后订单才算完成`],
  [`การกด "ยืนยันการจอง" ถือว่าคุณยอมรับ`, `By clicking "Confirm booking" you accept the`, `点击“确认预订”即表示您接受`],
  [`ข้อกำหนดและเงื่อนไข`, `terms and conditions`, `条款与条件`], [`ย้อนกลับ`, `Back`, `返回`], [`ยอดชำระ`, `Amount due`, `应付金额`], [`กำลังดำเนินการ...`, `Processing...`, `处理中...`],
  [`ขออภัย ห้องเพิ่งถูกจองไป กรุณาเลือกห้องอื่น`, `Sorry, that room was just booked — please choose another`, `抱歉，该房间刚刚被订走，请选择其他房型`],
  [`กด "ยืนยันการจอง" แล้วระบบจะแสดง`, `Click "Confirm booking" and the system will show the`, `点击“确认预订”后，系统将显示`], [`QR พร้อมเพย์ของเจ้าของรีสอร์ทพร้อมยอดเงิน`, `resort owner's PromptPay QR with the amount`, `业主的 PromptPay 二维码及应付金额`],
  [`สแกนจ่ายผ่านแอปธนาคาร แล้ว`, `Scan and pay in your banking app, then`, `用银行 App 扫码支付，然后`], [`แนบสลิป`, `attach the slip`, `上传转账凭证`], [`— เจ้าของรีสอร์ทจะตรวจสอบและยืนยันการจอง`, `— the resort owner will verify and confirm your booking`, `— 业主将核实并确认订单`],
  [`เลขบัญชีของเจ้าของรีสอร์ท`, `resort owner's bank account number`, `业主的银行账号`], [`โอนแล้วแนบสลิป — เจ้าของรีสอร์ทจะตรวจสอบและยืนยันการจอง`, `Transfer, then attach the slip — the resort owner will verify and confirm your booking`, `转账后上传凭证 — 业主将核实并确认订单`],
  [`ชำระเงินที่ที่พักในวันเข้าพัก ไม่มีการเรียกเก็บเงินในตอนนี้ — เจ้าของรีสอร์ทจะยืนยันการจองให้`, `Pay at the property on arrival. You won't be charged now — the resort owner will confirm your booking`, `入住当日到店支付，现在不会扣款 — 业主将为您确认订单`],
  // ---------- ใบยืนยัน ----------
  [`ไม่พบการจองนี้`, `Booking not found`, `未找到该订单`], [`ส่งคำขอจองแล้ว — รอเจ้าของรีสอร์ทยืนยัน`, `Booking request sent — awaiting the resort owner's confirmation`, `预订请求已发送 — 等待业主确认`],
  [`ชำระเงินและแนบสลิปด้านล่าง เจ้าของรีสอร์ทจะตรวจสอบและยืนยันการจอง`, `Pay and attach your slip below — the resort owner will verify and confirm your booking`, `请在下方完成支付并上传凭证，业主将核实并确认订单`],
  [`เจ้าของรีสอร์ทจะตรวจสอบห้องว่างและยืนยันการจองโดยเร็ว`, `The resort owner will check availability and confirm your booking shortly`, `业主将尽快核实房态并确认订单`], [`หมายเลขการจอง`, `Booking number`, `订单号`],
  [`PIN: {0} — ใช้ค้นหาการจองได้ที่ "การจองของฉัน"`, `PIN: {0} — use it to find your booking under "My bookings"`, `PIN：{0} — 可在“我的订单”中用于查询订单`], [`เจ้าของรีสอร์ทปฏิเสธการจองนี้`, `The resort owner declined this booking`, `业主已拒绝此订单`],
  [`หากโอนเงินไปแล้ว กรุณาติดต่อเจ้าของรีสอร์ทเพื่อขอรับเงินคืน`, `If you have already paid, please contact the resort owner for a refund`, `如已付款，请联系业主申请退款`], [`รอเจ้าของรีสอร์ทยืนยันการจอง — ชำระเงินที่ที่พักในวันเข้าพัก`, `Awaiting the resort owner's confirmation — pay at the property on arrival`, `等待业主确认 — 入住当日到店支付`],
  [`ใบยืนยันการจอง (Voucher)`, `Booking voucher`, `订单确认函 (Voucher)`], [`หมายเลขการจอง:`, `Booking number:`, `订单号：`], [`จองเมื่อ: {0} {1}`, `Booked on: {0} {1}`, `预订时间：{0} {1}`], [`ดำเนินการโดย`, `Handled by`, `经办方`],
  [`ผู้เข้าพักหลัก`, `Primary guest`, `主要住客`], [`สิทธิประโยชน์`, `Benefits`, `优惠权益`], [`ยกเลิกฟรีก่อน {0}`, `Free cancellation before {0}`, `{0} 前可免费取消`], [`ชำระแล้ว`, `Paid`, `已支付`], [`ส่งสลิปแล้ว รอตรวจสอบ`, `Slip sent, awaiting verification`, `已上传凭证，待核实`], [`ยังไม่ได้ชำระ`, `Not paid yet`, `尚未支付`],
  [`การคืนเงิน`, `Refund`, `退款`], [`(เจ้าของรีสอร์ทเป็นผู้คืนเงิน)`, `(refunded by the resort owner)`, `（由业主退款）`], [`ไม่มีการคืนเงิน`, `No refund`, `不予退款`], [`รวมทั้งหมด`, `Total`, `合计`],
  [`พิมพ์ / บันทึก PDF`, `Print / Save as PDF`, `打印 / 保存为 PDF`], [`ยกเลิกการจอง`, `Cancel booking`, `取消订单`], [`การจองทั้งหมดของฉัน`, `All my bookings`, `查看全部订单`],
  [`ยืนยันแล้ว`, `Confirmed`, `已确认`], [`รอยืนยัน`, `Pending`, `待确认`], [`ยกเลิกแล้ว`, `Cancelled`, `已取消`], [`เข้าพักแล้ว`, `Completed`, `已入住`],
  [`บัตรเครดิต/เดบิต`, `Credit / debit card`, `信用卡 / 借记卡`], [`พร้อมเพย์`, `PromptPay`, `PromptPay`], [`โอนผ่านธนาคาร`, `Bank transfer`, `银行转账`], [`ชำระที่ที่พัก`, `Pay at property`, `到店支付`],
  [`ชำระเงินด้วยพร้อมเพย์`, `Pay with PromptPay`, `使用 PromptPay 支付`], [`ยอดที่ต้องชำระ`, `Amount to pay`, `应付金额`], [`ชื่อบัญชี`, `Account name`, `账户名`], [`อ้างอิง`, `Reference`, `参考号`],
  [`เปิดแอปธนาคาร เลือก "สแกน QR"`, `Open your banking app and choose "Scan QR"`, `打开银行 App，选择“扫码”`], [`สแกน QR นี้ (ยอดเงินถูกใส่ไว้ให้แล้ว) แล้วโอน`, `Scan this QR (the amount is pre-filled) and transfer`, `扫描此二维码（金额已填好）并转账`], [`แนบสลิปด้านล่าง`, `Attach the slip below`, `在下方上传凭证`],
  [`บันทึกรูป QR`, `Save QR image`, `保存二维码图片`], [`ชำระเงินด้วยการโอน`, `Pay by bank transfer`, `银行转账支付`], [`ระบุรหัสอ้างอิง`, `Include reference code`, `请在转账备注中填写参考码`], [`ในบันทึกการโอน แล้วแนบสลิปด้านล่าง`, `in the transfer note, then attach the slip below`, `然后在下方上传凭证`],
  [`ส่งสลิปแล้ว`, `Slip sent`, `已上传凭证`], [`เมื่อ {0} {1}`, `on {0} {1}`, `于 {0} {1}`],
  [`คุณจะได้รับเงินคืนเต็มจำนวน`, `You will receive a full refund`, `您将获得全额退款`], [`คุณจะได้รับเงินคืนเต็มจำนวน ฿{0}`, `You will receive a full refund of ฿{0}`, `您将获得全额退款 ฿{0}`],
  [`การจองนี้ไม่สามารถคืนเงินได้`, `This booking is non-refundable`, `此订单不可退款`], [`การจองนี้ไม่สามารถคืนเงินได้ (฿{0})`, `This booking is non-refundable (฿{0})`, `此订单不可退款（฿{0}）`],
  [`02-000-0000 (24 ชม.)`, `02-000-0000 (24 hrs)`, `02-000-0000（24 小时）`], [`{0}-{1}-{2} ({3} ชม.)`, `{0}-{1}-{2} ({3} hrs)`, `{0}-{1}-{2}（{3} 小时）`],
  [`(แม่นยำ ±{0} ม.)`, `(accuracy ±{0} m)`, `（精度 ±{0} 米）`], [`— เจ้าของรีสอร์ทกำลังตรวจสอบยอดและจะยืนยันการจอง`, `— the resort owner is verifying the amount and will confirm your booking`, `— 业主正在核对金额并将确认订单`],
  [`ส่งผิดรูป? แนบใหม่ได้ด้านล่าง`, `Sent the wrong image? Upload again below`, `传错图片？可在下方重新上传`], [`แนบสลิปใหม่`, `Attach a new slip`, `重新上传凭证`], [`แนบสลิปโอนเงิน`, `Attach transfer slip`, `上传转账凭证`],
  [`รูปภาพ JPG / PNG — สลิปจะถูกส่งให้เจ้าของรีสอร์ทและผู้ดูแลระบบเท่านั้น`, `JPG / PNG image — the slip is visible only to the resort owner and platform admins`, `JPG / PNG 图片 — 凭证仅业主和平台管理员可见`],
  [`กำลังส่งสลิป...`, `Sending slip...`, `正在上传凭证...`], [`ส่งสลิปแล้ว — เจ้าของรีสอร์ทจะตรวจสอบและยืนยันการจอง`, `Slip sent — the resort owner will verify and confirm your booking`, `凭证已上传 — 业主将核实并确认订单`], [`ยกเลิกการจองเรียบร้อยแล้ว`, `Booking cancelled`, `订单已取消`],
  [`ยืนยันยกเลิก`, `Yes, cancel`, `确认取消`], [`ยกเลิกการจอง`, `Cancel booking`, `取消订单`],
  // ---------- การจองของฉัน / รีวิว / โปรไฟล์ ----------
  [`ค้นหาการจอง`, `Find a booking`, `查询订单`], [`เข้าสู่ระบบเพื่อดูการจองทั้งหมด หรือค้นหาด้วยหมายเลขการจองและ PIN`, `Log in to see all your bookings, or search with your booking number and PIN`, `登录查看全部订单，或使用订单号和 PIN 查询`],
  [`ไม่พบการจอง หรือ PIN ไม่ถูกต้อง`, `Booking not found or incorrect PIN`, `未找到订单或 PIN 不正确`], [`กำลังจะมาถึง`, `Upcoming`, `即将入住`], [`ไม่มีรายการ`, `Nothing here`, `暂无记录`], [`ดูรายละเอียด`, `View details`, `查看详情`], [`เขียนรีวิว`, `Write a review`, `写点评`], [`จองอีกครั้ง`, `Book again`, `再次预订`],
  [`รีวิวการเข้าพัก`, `Review your stay`, `点评本次入住`], [`คะแนน ({0}-{1})`, `Score ({0}-{1})`, `评分 ({0}-{1})`], [`หัวข้อ`, `Title`, `标题`], [`สรุปการเข้าพักของคุณ`, `Summarize your stay`, `概括您的入住体验`], [`รายละเอียด`, `Details`, `详细内容`], [`เล่าประสบการณ์ของคุณ`, `Tell us about your experience`, `分享您的体验`],
  [`ประเภทการเดินทาง`, `Trip type`, `出行类型`], [`คู่รัก`, `Couple`, `情侣`], [`ครอบครัว`, `Family`, `家庭`], [`เดินทางคนเดียว`, `Solo traveler`, `独自旅行`], [`กลุ่มเพื่อน`, `Group of friends`, `朋友结伴`], [`ธุรกิจ`, `Business`, `商务`], [`ส่งรีวิว`, `Submit review`, `提交点评`],
  [`กรุณากรอกหัวข้อและรายละเอียด`, `Please enter a title and details`, `请填写标题和详细内容`], [`ขอบคุณสำหรับรีวิว!`, `Thanks for your review!`, `感谢您的点评！`],
  [`กรุณาเข้าสู่ระบบ`, `Please log in`, `请先登录`], [`เบอร์โทร`, `Phone`, `电话`], [`รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)`, `New password (leave blank to keep current)`, `新密码（不修改请留空）`], [`บันทึก`, `Save`, `保存`], [`บันทึกข้อมูลแล้ว`, `Saved`, `已保存`],
  // ---------- ศูนย์ช่วยเหลือ ----------
  [`จะยกเลิกการจองได้อย่างไร?`, `How do I cancel a booking?`, `如何取消订单？`],
  [`ไปที่ "การจองของฉัน" เลือกการจองที่ต้องการ แล้วกด "ยกเลิกการจอง" หากห้องเป็นแบบยกเลิกฟรีและยังไม่ถึงวันก่อนเช็คอิน คุณจะได้รับเงินคืนเต็มจำนวน`, `Go to "My bookings", pick the booking and click "Cancel booking". If the room has free cancellation and check-in is still more than a day away, you'll get a full refund.`, `进入“我的订单”，选择订单并点击“取消订单”。如果房型支持免费取消且尚未到入住前一日，您将获得全额退款。`],
  [`ราคาที่แสดงรวมภาษีหรือไม่?`, `Do the prices include tax?`, `显示的价格含税吗？`],
  [`ราคาที่แสดงเป็นราคาสุทธิ ไม่มีค่าธรรมเนียมหรือภาษีเพิ่ม ราคารวมทั้งหมดจะแสดงในขั้นตอนการจอง`, `Prices shown are final — no extra taxes or service fees. The full total is shown during booking.`, `显示价格为最终价格，无额外税费或服务费，总价将在预订步骤中显示。`],
  [`ใครเป็นผู้ยืนยันการจองและรับเงิน?`, `Who confirms bookings and receives payment?`, `谁负责确认订单并收款？`],
  [`ที่พักแต่ละแห่งดำเนินการโดยเจ้าของรีสอร์ทเอง — คุณโอนเงินตรงถึงเจ้าของรีสอร์ท แนบสลิป แล้วเจ้าของรีสอร์ทจะตรวจสอบและยืนยันการจอง หากมีปัญหาติดต่อทีมงาน kohlarngo ได้ตลอด`, `Each property is run by its own resort owner — you transfer money directly to the owner, attach the slip, and the owner verifies and confirms your booking. If anything goes wrong, the kohlarngo team is always available.`, `每家住宿由度假村业主自行运营 — 您直接向业主转账并上传凭证，业主核实后确认订单。如有问题，kohlarngo 团队随时为您服务。`],
  [`ชำระเงินด้วยวิธีใดได้บ้าง?`, `Which payment methods are accepted?`, `支持哪些支付方式？`],
  [`พร้อมเพย์ (สแกน QR จากแอปธนาคารใดก็ได้) โอนผ่านธนาคาร และชำระที่ที่พัก (เฉพาะห้องที่ระบุ) — ยังไม่รับบัตรเครดิต`, `PromptPay (scan the QR from any banking app), bank transfer, and pay at the property (selected rooms only). Credit cards are not accepted yet.`, `PromptPay（可用任意银行 App 扫码）、银行转账，以及到店支付（仅限指定房型）。暂不支持信用卡。`],
  [`ค้นหาการจองโดยไม่มีบัญชีได้ไหม?`, `Can I look up a booking without an account?`, `没有账号可以查询订单吗？`], [`ได้ ใช้หมายเลขการจองและ PIN ที่ได้รับในหน้า "การจองของฉัน"`, `Yes — use the booking number and PIN you received on the "My bookings" page.`, `可以，在“我的订单”页面使用订单号和您收到的 PIN 即可查询。`],
  [`ติดต่อเรา`, `Contact us`, `联系我们`],
  // ---------- SOS ----------
  [`ติดต่อความช่วยเหลือ`, `Emergency contacts`, `紧急联系`], [`แจ้งเหตุพร้อมปักหมุดพิกัด`, `Report an incident with GPS pin`, `带定位报警`], [`ตำรวจ`, `Police`, `警察`], [`ตำรวจท่องเที่ยว`, `Tourist police`, `旅游警察`],
  [`โรงพยาบาล / รถพยาบาล`, `Hospital / Ambulance`, `医院 / 救护车`], [`กู้ภัยทางทะเล`, `Marine rescue`, `海上救援`], [`สภ.เมืองพัทยา`, `Pattaya City Police Station`, `芭提雅市警察局`], [`ตำรวจท่องเที่ยวพัทยา`, `Pattaya Tourist Police`, `芭提雅旅游警察`],
  [`ศูนย์แพทย์ชุมชนบ้านเกาะล้าน`, `Koh Larn Community Medical Center`, `格兰岛社区医疗中心`], [`ตำรวจน้ำพัทยา`, `Pattaya Marine Police`, `芭提雅水上警察`],
  [`ขอความช่วยเหลือฉุกเฉิน`, `Request emergency help`, `紧急求助`], [`เกาะล้าน · เลือกหน่วยงาน แล้วกดโทรได้ที่ขั้นที่ {0} ด้านล่าง`, `Koh Larn · choose an agency, then call from step {0} below`, `格兰岛 · 选择机构后，可在下方第 {0} 步拨打电话`],
  [`ชาวต่างชาติ? โทร {0} ตำรวจท่องเที่ยว`, `Visiting from abroad? Call {0} Tourist Police`, `外国游客？请拨打 {0} 旅游警察`],
  [`เจ้าหน้าที่พูดได้หลายภาษา (เช่น อังกฤษ จีน) และช่วยประสานงานกับหน่วยงานอื่นให้`, `Multilingual officers (e.g. English, Chinese) who can also coordinate with other agencies for you`, `工作人员会多种语言（如英语、中文），并可协助您联系其他部门`],
  [`กรณีเจ็บป่วยรุนแรงหรืออันตรายถึงชีวิต โทร {0} หรือ {1} ทันที`, `For serious illness or life-threatening danger, call {0} or {1} immediately`, `如遇重病或危及生命的情况，请立即拨打 {0} 或 {1}`],
  [`โทร {0} ตำรวจท่องเที่ยว`, `Call {0} Tourist Police`, `拨打 {0} 旅游警察`],
  [`เกิดเหตุอะไร?`, `What happened?`, `发生了什么？`], [`อุบัติเหตุ / บาดเจ็บ`, `Accident / injury`, `事故 / 受伤`], [`เจ็บป่วยฉุกเฉิน`, `Medical emergency`, `突发疾病`], [`จมน้ำ / เหตุในทะเล`, `Drowning / sea incident`, `溺水 / 海上事故`],
  [`เรือเสีย / เรือล่ม`, `Boat breakdown / capsized`, `船只故障 / 翻覆`], [`ทะเลาะวิวาท / ถูกทำร้าย`, `Fight / assault`, `斗殴 / 遭袭击`], [`ทรัพย์สินหาย / ถูกขโมย`, `Lost / stolen belongings`, `财物丢失 / 被盗`], [`หลงทาง / พลัดหลง`, `Lost / separated`, `迷路 / 走失`],
  [`ถูกโกง / ถูกเอาเปรียบ`, `Scammed / overcharged`, `被骗 / 被宰`], [`เหตุอื่นๆ`, `Other`, `其他`], [`ปักหมุดตำแหน่งที่เกิดเหตุ`, `Pin the incident location`, `标记事发位置`], [`ใช้ตำแหน่งปัจจุบันของฉัน`, `Use my current location`, `使用我的当前位置`],
  [`อัปเดตตำแหน่งอีกครั้ง`, `Update location`, `更新位置`], [`แตะบนแผนที่ หรือลากหมุดเพื่อเลือกตำแหน่ง`, `Tap the map or drag the pin to choose a location`, `点击地图或拖动图钉选择位置`], [`กำลังหาตำแหน่ง...`, `Locating...`, `定位中...`],
  [`ข้อมูลผู้แจ้ง`, `Your details`, `报警人信息`], [`(ไม่บังคับ แต่ช่วยให้เจ้าหน้าที่ติดต่อกลับได้)`, `(optional, but helps officers call you back)`, `（选填，便于工作人员回电）`], [`ชื่อผู้แจ้ง`, `Your name`, `报警人姓名`], [`เบอร์โทรติดต่อกลับ`, `Callback phone number`, `回电号码`],
  [`จำนวนผู้ประสบเหตุ`, `Number of people involved`, `受困人数`], [`มากกว่า {0}`, `More than {0}`, `超过 {0} 人`], [`จุดสังเกต`, `Landmark`, `地标`], [`เช่น หน้าร้าน..., ปลายหาดแสม`, `e.g. in front of a shop..., end of Samae Beach`, `例如：某店门口…、萨梅海滩尽头`],
  [`รายละเอียดเหตุการณ์`, `Incident details`, `事件详情`], [`เล่าสั้นๆ ว่าเกิดอะไรขึ้น`, `Briefly describe what happened`, `简要描述发生了什么`], [`ส่งคำขอความช่วยเหลือ`, `Send the help request`, `发送求助请求`], [`ส่งถึง:`, `Send to:`, `发送至：`],
  [`โทร {0}`, `Call {0}`, `拨打 {0}`], [`ส่ง SMS พร้อมพิกัด`, `Send SMS with location`, `发送带定位的短信`], [`แชร์ข้อความ + พิกัด (LINE ฯลฯ)`, `Share message + location (LINE, etc.)`, `分享信息和定位（LINE 等）`], [`คัดลอกข้อความแจ้งเหตุ`, `Copy incident message`, `复制报警信息`],
  [`ระบบจะเปิดแอปโทรศัพท์ / ข้อความของเครื่องคุณ — โปรดอ่านพิกัดหรือส่งข้อความที่เตรียมไว้ให้เจ้าหน้าที่`, `This opens your phone / messaging app — please read out the coordinates or send the prepared message to the officer`, `将打开您手机的电话 / 短信应用 — 请向工作人员告知坐标或发送已准备好的信息`],
  [`กำลังเปิดแอปโทรศัพท์...`, `Opening phone app...`, `正在打开电话应用...`], [`คัดลอกข้อความแล้ว — วางในแชทเพื่อส่งได้เลย`, `Message copied — paste it into a chat to send`, `已复制信息 — 粘贴到聊天中即可发送`], [`คัดลอกข้อความแจ้งเหตุแล้ว`, `Incident message copied`, `已复制报警信息`],
  [`อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง`, `This device doesn't support location services`, `此设备不支持定位`], [`กรุณาอนุญาตการเข้าถึงตำแหน่งในเบราว์เซอร์ หรือปักหมุดบนแผนที่เอง`, `Please allow location access in your browser, or place the pin on the map yourself`, `请在浏览器中允许定位，或自行在地图上标记`],
  [`หาตำแหน่งไม่สำเร็จ — ปักหมุดบนแผนที่เองได้`, `Couldn't get your location — place the pin on the map yourself`, `定位失败 — 请自行在地图上标记`], [`เปิดใน Google Maps`, `Open in Google Maps`, `在 Google 地图中打开`],
  [`แม่นยำ ±{0} ม.`, `accuracy ±{0} m`, `精度 ±{0} 米`], [`โหลดแผนที่ไม่ได้ (ไม่มีอินเทอร์เน็ต) — กด "ใช้ตำแหน่งปัจจุบันของฉัน" แทน`, `Map unavailable (no internet) — tap "Use my current location" instead`, `无法加载地图（无网络）— 请点击“使用我的当前位置”`],
  // ---------- ข้อความระบบ ----------
  [`มีข้อมูลอัปเดตใหม่ — เปลี่ยนหน้าหรือรีเฟรชเพื่อดู`, `New data available — change page or refresh to see it`, `有新数据 — 切换页面或刷新查看`],
];

// ข้อความที่มีชื่อ/โค้ดปนอยู่ — จับด้วย regex
const I18N_RX = [
  [/^ยินดีต้อนรับ (.+)$/, m => [`Welcome, ${m[1]}`, `欢迎，${m[1]}`]],
  [/^คัดลอกโค้ด (.+) แล้ว$/, m => [`Code ${m[1]} copied`, `已复制优惠码 ${m[1]}`]],
  [/^โค้ด ([A-Z0-9_-]+)$/, m => [`Code ${m[1]}`, `优惠码 ${m[1]}`]],
  [/^เข้าสู่ระบบด้วยบัญชีโซเชียลไม่สำเร็จ: (.+)$/, m => [`Social login failed: ${m[1]}`, `社交账号登录失败：${m[1]}`]],
  [/^ส่งสลิปไม่สำเร็จ: (.+)$/, m => [`Could not send the slip: ${m[1]}`, `凭证上传失败：${m[1]}`]],
  [/^บันทึกไม่สำเร็จ \((.+)\): (.+)$/, m => [`Could not save (${m[1]}): ${m[2]}`, `保存失败（${m[1]}）：${m[2]}`]],
];

const EN_DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], ZH_DOW = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const EN_MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const EN_MON_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const TH_DOW_ABBR = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const TH_MON_ABBR = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const TH_MON_FULL_ = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

const I18N_DICT = new Map(I18N_ROWS.map(r => [r[0], r]));
const rxEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// ตัวเลข / วันที่ (ปี พ.ศ.) / เดือน+ปี ในข้อความ → โทเคน {n} แล้วใส่คืนในรูปแบบของภาษาที่เลือก
const I18N_TOK = new RegExp(
  `(?:(?:(?<dw>${TH_DOW_ABBR.map(rxEsc).join('|')})\\s)?(?<dd>\\d{1,2})\\s(?<dm>${TH_MON_ABBR.map(rxEsc).join('|')})\\s(?<dy>\\d{4}))` +
  `|(?:(?<fm>${TH_MON_FULL_.join('|')})\\s(?<fy>\\d{4}))|(?<n>\\d+(?:[.,:]\\d+)*)`, 'g');
const THAI = /[ก-ฺเ-๿]/; // ตัวอักษรไทย (ไม่รวมสัญลักษณ์ ฿)
const I18N_SEP = /(\s*[·—]\s*|,\s+|\s+[–/]\s+|\s+x\s+|:\s+|\s\+\s)/;

function i18nDate(g) {
  const ce = +g.dy - 543, m = TH_MON_ABBR.indexOf(g.dm), w = g.dw ? TH_DOW_ABBR.indexOf(g.dw) : -1;
  if (LANG === 'zh') return `${ce}年${m + 1}月${+g.dd}日${w >= 0 ? ' ' + ZH_DOW[w] : ''}`;
  return `${w >= 0 ? EN_DOW[w] + ' ' : ''}${+g.dd} ${EN_MON[m]} ${ce}`;
}
function i18nFill(tpl, vals) {
  return tpl.replace(/\{(\d+)\?([^:}]*):([^}]*)\}/g, (_, i, one, many) => (String(vals[+i]).replace(/[^\d.]/g, '') === '1' ? one : many)).replace(/\{(\d+)\}/g, (_, i) => vals[+i] ?? '');
}
// แปลชิ้นข้อความที่มีโทเคน {n} (เลขอ้างอิงในชุด vals ของทั้งข้อความ) — คืน null ถ้าไม่มีในพจนานุกรม
function i18nPiece(p, vals) {
  const idx = [], key = p.replace(/\{(\d+)\}/g, (_, i) => `{${idx.push(+i) - 1}}`);
  const row = I18N_DICT.get(key.trim());
  const t = row && row[LANG === 'en' ? 1 : 2];
  if (!t) return null;
  return key.match(/^\s*/)[0] + i18nFill(t, idx.map(i => vals[i])) + key.match(/\s*$/)[0];
}
function tr(text) {
  if (LANG === 'th' || !THAI.test(text)) return text;
  const lead = text.match(/^\s*/)[0], tail = text.match(/\s*$/)[0], core = text.trim();
  if (!core) return text;
  for (const [rx, fn] of I18N_RX) { const m = core.match(rx); const r = m && fn(m); const t = r && r[LANG === 'en' ? 0 : 1]; if (t) return lead + t + tail; }
  const vals = [];
  const key = core.replace(I18N_TOK, (...a) => {
    const g = a[a.length - 1];
    vals.push(g.dd ? i18nDate(g) : g.fm ? (LANG === 'zh' ? `${+g.fy - 543}年${TH_MON_FULL_.indexOf(g.fm) + 1}月` : `${EN_MON_FULL[TH_MON_FULL_.indexOf(g.fm)]} ${+g.fy - 543}`) : g.n);
    return `{${vals.length - 1}}`;
  });
  if (!THAI.test(key)) return lead + key.replace(/\{(\d+)\}/g, (_, i) => vals[+i] ?? '') + tail; // มีแต่วันที่/ตัวเลข
  let out = i18nPiece(key, vals);
  if (out == null) {
    const parts = key.split(I18N_SEP);
    if (parts.length > 1) out = parts.map((p, i) => i % 2 || !THAI.test(p) ? p : (i18nPiece(p, vals) ?? p)).join('');
  }
  if (out == null) return text;
  return lead + out.replace(/\{(\d+)\}/g, (_, i) => vals[+i] ?? '') + tail;
}

// ---------- แทนข้อความบน DOM ----------
const I18N_SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE', 'NOSCRIPT']); // PRE = ข้อความแจ้งเหตุที่ส่งให้เจ้าหน้าที่ไทย คงเป็นภาษาไทย
const I18N_ATTRS = ['placeholder', 'title', 'alt', 'aria-label'];
const i18nSeen = new WeakMap();
const i18nOn = () => LANG !== 'th' && !PORTAL;
function i18nText(n) {
  const v = n.nodeValue;
  if (!THAI.test(v) || i18nSeen.get(n) === v || n.parentElement?.closest('[data-notr]')) return;
  const o = tr(v);
  if (o !== v) n.nodeValue = o;
  i18nSeen.set(n, n.nodeValue);
}
function i18nAttr(el, a) { const v = el.getAttribute(a); if (v && THAI.test(v)) { const o = tr(v); if (o !== v) el.setAttribute(a, o); } }
function i18nWalk(n) {
  if (n.nodeType === 3) return i18nText(n);
  if (n.nodeType !== 1 || n.hasAttribute('data-notr')) return;
  if (n.tagName === 'OPTION' && !n.hasAttribute('value')) n.setAttribute('value', n.textContent); // ค่าที่ส่งกลับต้องเป็นภาษาไทยเดิม
  I18N_ATTRS.forEach(a => n.hasAttribute(a) && i18nAttr(n, a));
  if (!I18N_SKIP.has(n.tagName)) n.childNodes.forEach(i18nWalk);
}
new MutationObserver(ms => {
  if (!i18nOn()) return;
  for (const m of ms) {
    if (m.type === 'childList') m.addedNodes.forEach(i18nWalk);
    else if (m.type === 'characterData') i18nText(m.target);
    else if (m.type === 'attributes' && !m.target.closest?.('[data-notr]')) i18nAttr(m.target, m.attributeName);
  }
}).observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'title'] });

function applyLangMeta() {
  document.documentElement.lang = LANG;
  if (!PORTAL) document.title = LANGS[LANG].title;
}
function setLang(l) {
  if (!LANGS[l] || l === LANG) return;
  LANG = l;
  try { localStorage.setItem('sd_lang', l); } catch {}
  applyLangMeta();
  if (typeof CACHE !== 'undefined' && CACHE.loaded) render(); // เรนเดอร์ใหม่จากต้นฉบับภาษาไทย แล้วตัวแปลจะแทนข้อความให้
}
function langSwitcherHtml() {
  const c = LANGS[LANG];
  return `<div class="lang-sw" data-notr><button class="btn btn-ghost btn-sm" id="lang-btn" title="Language / ภาษา / 语言">${c.flag} <span class="hide-m">${c.name}</span> <i class="fa-solid fa-chevron-down small"></i></button></div>`;
}
function bindLangSwitcher() {
  const btn = $('#lang-btn');
  if (!btn) return;
  btn.onclick = e => {
    e.stopPropagation();
    const old = $('.lang-menu');
    if (old) return old.remove();
    const menu = document.createElement('div');
    menu.className = 'lang-menu';
    menu.setAttribute('data-notr', '');
    menu.innerHTML = Object.entries(LANGS).map(([k, c]) => `<button data-l="${k}" class="${k === LANG ? 'active' : ''}"><span>${c.flag}</span> ${c.name}${k === LANG ? ' <i class="fa-solid fa-check"></i>' : ''}</button>`).join('');
    btn.parentElement.appendChild(menu);
    $$('[data-l]', menu).forEach(b => b.onclick = () => { menu.remove(); setLang(b.dataset.l); });
    setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }));
  };
}
applyLangMeta();

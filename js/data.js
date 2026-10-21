// ข้อมูลตั้งต้น (seed) — ถูกคัดลอกลง localStorage ครั้งแรกที่เปิดเว็บ แล้วแก้ไขได้จากหน้า Admin
const IMG = {
  pool1: 'photo-1566073771259-6a8506099945',
  pool2: 'photo-1520250497591-112f2f40a3f4',
  pool3: 'photo-1540541338287-41700207dee6',
  pool4: 'photo-1571896349842-33c89424de2d',
  villa1: 'photo-1584132967334-10e028bd69f7',
  beach1: 'photo-1544550581-5f7ceaf7f992',
  beach2: 'photo-1610641818989-c2051b5e2cfd',
  ext1: 'photo-1542314831-068cd1dbfeeb',
  ext2: 'photo-1551882547-ff40c63fe5fa',
  ext3: 'photo-1564501049412-61c2a3083791',
  ext4: 'photo-1445019980597-93fa8acb246c',
  room1: 'photo-1582719478250-c89cae4dc85b',
  room2: 'photo-1611892440504-42a792e24d32',
  room3: 'photo-1590490360182-c33d57733427',
  room4: 'photo-1631049307264-da0ec9d70304',
  room5: 'photo-1618773928121-c32242e63f39',
  room6: 'photo-1596394516093-501ba68a0ba6',
  room7: 'photo-1578683010236-d716f9a3f461',
  lobby: 'photo-1566665797739-1674de7a421a',
  food: 'photo-1414235077428-338989a2e8c0',
  spa: 'photo-1544161515-4ab6ce6db874',
};
const imgUrl = (id, w = 800) => id.startsWith('http') || id.startsWith('data:') ? id : `https://images.unsplash.com/${id}?w=${w}&q=70&auto=format&fit=crop`;

// จุดหมายบนเกาะล้าน (ชายหาด/ย่าน) — ใช้ฟิลด์ city ของที่พักเป็นชื่อหาด
const DESTINATIONS = [
  { name: 'หน้าบ้าน', en: 'Na Ban', img: 'photo-1552465011-b4e21bf6e79a', lat: 12.92246, lng: 100.79016 },
  { name: 'หาดตาแหวน', en: 'Tawaen Beach', img: 'photo-1519046904884-53103b34b206', lat: 12.92538, lng: 100.77975 },
  { name: 'หาดแสม', en: 'Samae Beach', img: 'photo-1537956965359-7573183d1f57', lat: 12.91210, lng: 100.76978 },
  { name: 'หาดเทียน', en: 'Tien Beach', img: 'photo-1586861635167-e5223aadc9fe', lat: 12.91913, lng: 100.76997 },
  { name: 'หาดนวล', en: 'Nual Beach', img: 'photo-1507525428034-b723cf961d3e', lat: 12.90051, lng: 100.77601 },
  { name: 'หาดตายาย', en: 'Ta Yai Beach', img: 'photo-1589394815804-964ed0be2eb5', lat: 12.93617, lng: 100.78838 },
  { name: 'หาดสังวาลย์', en: 'Sangwan Beach', img: 'photo-1610641818989-c2051b5e2cfd', lat: 12.92655, lng: 100.77275 },
];

// คำค้นแบบธรรมชาติ: พิมพ์สิ่งที่ต้องการได้เลย เช่น "สัตว์เลี้ยงเข้าพักได้ ติดทะเล เช่า จยย" → แปลงเป็นสิ่งอำนวยความสะดวกที่ที่พักต้องมี
// [คำที่แสดงในช่องค้นหา, ...คำพ้องความหมาย (ตัวพิมพ์เล็ก)] · คีย์ตรงกับ AMENITIES · ค่าเป็น array = มีอย่างใดอย่างหนึ่งก็ผ่าน
const AMEN_WORDS = [
  [['pets'], 'สัตว์เลี้ยง', 'น้องหมา', 'น้องแมว', 'พาหมา', 'พาแมว', 'หมา', 'แมว', 'เลี้ยงสัตว์', 'pets', 'pet', 'dogs', 'dog', 'cats', 'cat'],
  [['beach'], 'ติดทะเล', 'ติดชายหาด', 'ริมทะเล', 'ริมหาด', 'ติดหาด', 'หน้าหาด', 'วิวทะเล', 'beachfront', 'seaside', 'oceanfront'],
  [['freebike'], 'แถมมอเตอร์ไซค์', 'แถมรถ'], // พิมพ์ "แถม จยย" / "จยย ฟรี" ก็ถูกจับเป็นกลุ่มนี้ (ดู parseSearch)
  [['bike', 'freebike'], 'เช่ามอเตอร์ไซค์', 'มอเตอร์ไซค์', 'มอเตอร์ไซด์', 'มอเตอร์ไซต์', 'มอไซค์', 'มอไซด์', 'มอไซ', 'จยย', 'จักรยาน', 'เช่ารถ', 'motorbike', 'motorcycle', 'scooter', 'bicycle', 'bike'],
  [['pool'], 'สระว่ายน้ำ', 'สระน้ำ', 'สระ', 'พูล', 'swimming', 'pool'],
  [['wifi'], 'ไวไฟ', 'อินเทอร์เน็ต', 'อินเตอร์เน็ต', 'wi-fi', 'wifi'],
  [['parking'], 'ที่จอดรถ', 'จอดรถ', 'parking'],
  [['breakfast'], 'อาหารเช้า', 'breakfast'],
  [['spa'], 'นวดแผนไทย', 'สปา', 'นวด', 'spa'],
  [['gym'], 'ฟิตเนส', 'ยิม', 'gym', 'fitness'],
  [['restaurant'], 'ห้องอาหาร', 'ร้านอาหาร', 'restaurant'],
  [['bar'], 'บาร์', 'bar'],
  [['airport', 'shuttle'], 'รถรับส่ง', 'รับส่งท่าเรือ', 'รับส่ง', 'shuttle'],
  [['kids'], 'เด็กเล็ก', 'เด็ก', 'kids'],
  [['ac'], 'เครื่องปรับอากาศ', 'แอร์', 'air con'],
  [['snorkel'], 'ดำน้ำตื้น', 'ดำน้ำ', 'snorkel', 'diving'],
  [['bbq'], 'บาร์บีคิว', 'ปิ้งย่าง', 'bbq'],
  [['kitchen'], 'ครัวส่วนตัว', 'ครัว', 'kitchen'],
  [['coffee'], 'คาเฟ่', 'กาแฟ', 'cafe', 'coffee'],
  [['karaoke'], 'คาราโอเกะ', 'karaoke'],
  [['ev'], 'ชาร์จรถ', 'ที่ชาร์จ', 'ev charger'],
  [['sunset'], 'พระอาทิตย์ตก', 'ชมพระอาทิตย์', 'sunset'],
  [['tv'], 'ทีวี', 'smart tv'],
  [['nosmoke'], 'ปลอดบุหรี่', 'ห้ามสูบบุหรี่', 'non-smoking'],
  [['safe'], 'ตู้เซฟ', 'safe'],
  [['laundry'], 'ซักรีด', 'ซักผ้า', 'laundry'],
];
// คำเชื่อม/คำขยายที่ไม่ใช่เงื่อนไข (ตัดทิ้งก่อนจับคู่ชื่อที่พัก)
const SEARCH_STOP = ['เข้าพักได้', 'เข้าพัก', 'อนุญาต', 'ให้เช่า', 'ที่พัก', 'อยากได้', 'อยาก', 'แถวๆ', 'แถวนี้', 'แถว', 'แถน', 'ใกล้ๆ', 'ใกล้', 'ต้องการ', 'ขอ', 'ที่มี', 'มี', 'ได้', 'เช่า', 'และ', 'กับ', 'ฟรี', 'ที่'];
const AMEN_SYN = AMEN_WORDS.flatMap((g, gi) => g.slice(1).map(w => [w, gi])).sort((a, b) => b[0].length - a[0].length);
const _parsed = {};
function parseSearch(q) {
  const key = String(q || '');
  if (_parsed[key]) return _parsed[key];
  let t = key.toLowerCase().trim();
  const groups = [];
  // "แถม จยย" / "จยย ฟรี" = ที่พักที่แถมมอเตอร์ไซค์ให้ฟรี (ต่างจาก "จยย" เฉยๆ ที่หมายถึงมีมอเตอร์ไซค์ให้เช่าหรือแถมก็ได้)
  t = t.replace(/แถน/g, 'แถม');
  const FREE = /แถม|ฟรี|free|complimentary/g, BIKE = /จยย|มอเตอร์ไซ[คดต]?์?|มอไซ[คดต]?|จักรยาน|motorbike|motorcycle|scooter|bike/g;
  if (new RegExp(FREE.source).test(t) && new RegExp(BIKE.source).test(t)) {
    groups.push(AMEN_WORDS.findIndex(g => g[0][0] === 'freebike'));
    t = t.replace(BIKE, ' ').replace(FREE, ' ');
  }
  for (const [w, gi] of AMEN_SYN) {
    const re = /^[a-z][a-z\- ]*$/.test(w) ? new RegExp(`(^|[^a-z])${w}(?![a-z])`) : null; // คำอังกฤษต้องเป็นคำเต็ม (กัน cat ใน location)
    if (re ? !re.test(t) : !t.includes(w)) continue;
    if (!groups.includes(gi)) groups.push(gi);
    t = re ? t.replace(new RegExp(re.source, 'g'), '$1 ') : t.split(w).join(' ');
  }
  let dest = null;
  for (const d of [...DESTINATIONS].sort((a, b) => b.name.length - a.name.length)) {
    const n = d.name.toLowerCase(), e = d.en.toLowerCase();
    if (t.includes(n)) { dest = d; t = t.split(n).join(' '); break; }
    if (t.includes(e)) { dest = d; t = t.split(e).join(' '); break; }
  }
  if (groups.length || dest) for (const w of SEARCH_STOP) t = t.split(w).join(' ');
  const tokens = t.split(/\s+/).filter(Boolean);
  return (_parsed[key] = { groups, dest, tokens, labels: groups.map(gi => AMENITIES[AMEN_WORDS[gi][0][0]][1]) });
}

const AMENITIES = {
  wifi: ['fa-wifi', 'Wi-Fi ฟรี'],
  pool: ['fa-person-swimming', 'สระว่ายน้ำ'],
  parking: ['fa-square-parking', 'ที่จอดรถฟรี'],
  breakfast: ['fa-mug-saucer', 'อาหารเช้า'],
  gym: ['fa-dumbbell', 'ฟิตเนส'],
  spa: ['fa-spa', 'สปา'],
  restaurant: ['fa-utensils', 'ห้องอาหาร'],
  bar: ['fa-martini-glass', 'บาร์'],
  airport: ['fa-ferry', 'รถรับส่งท่าเรือ'],
  beach: ['fa-umbrella-beach', 'ติดชายหาด'],
  kids: ['fa-children', 'คลับสำหรับเด็ก'],
  pets: ['fa-paw', 'สัตว์เลี้ยงเข้าพักได้'],
  ac: ['fa-snowflake', 'เครื่องปรับอากาศ'],
  frontdesk: ['fa-bell-concierge', 'แผนกต้อนรับ 24 ชม.'],
  laundry: ['fa-shirt', 'บริการซักรีด'],
  nosmoke: ['fa-ban-smoking', 'ห้องปลอดบุหรี่'],
  snorkel: ['fa-person-snorkeling', 'ดำน้ำตื้น / เช่าอุปกรณ์'],
  bbq: ['fa-fire', 'เตาบาร์บีคิว'],
  bike: ['fa-bicycle', 'จักรยาน / มอเตอร์ไซค์เช่า'],
  freebike: ['fa-motorcycle', 'แถมมอเตอร์ไซค์ฟรี'],
  tv: ['fa-tv', 'สมาร์ททีวี'],
  kitchen: ['fa-kitchen-set', 'ครัวส่วนตัว'],
  shuttle: ['fa-van-shuttle', 'รถรับส่งรอบเกาะ'],
  coffee: ['fa-mug-hot', 'คาเฟ่ / กาแฟ'],
  safe: ['fa-vault', 'ตู้เซฟในห้อง'],
  hairdryer: ['fa-wind', 'ไดร์เป่าผม'],
  karaoke: ['fa-microphone', 'คาราโอเกะ'],
  ev: ['fa-charging-station', 'ที่ชาร์จรถ EV'],
  sunset: ['fa-sun', 'จุดชมพระอาทิตย์ตก'],
};

// สิ่งอำนวยความสะดวกที่เจ้าของพิมพ์เพิ่มเอง เก็บเป็นคีย์ 'x:ชื่อ'
const amenInfo = a => AMENITIES[a] || (typeof a === 'string' && a.startsWith('x:') && a.length > 2 ? ['fa-circle-check', a.slice(2)] : null);
// กฎรีสอร์ทตัวอย่าง [ป้ายสั้น, ข้อความ] — เจ้าของกดเลือก/ยกเลิกในหน้า "ตกแต่งหน้ารีสอร์ท" แล้วแก้ข้อความเองได้ (ปรับเวลา/ค่าปรับให้ตรงกับที่พักของตน)
const HOUSE_RULE_SAMPLES = [
  ['เวลาเช็คอิน/เช็คเอาท์', 'เช็คอินตั้งแต่ 14.00 น. · เช็คเอาท์ก่อน 11.00 น. เกินเวลาคิดค่าปรับชั่วโมงละ 200 บาท'],
  ['จำนวนผู้เข้าพัก', 'เข้าพักได้ไม่เกินจำนวนคนที่ระบุในประเภทห้อง'],
  ['งดเสียงดัง', 'งดใช้เสียงดังตั้งแต่ 23.00–06.00 น.'],
  ['พฤติกรรม', 'ห้ามทะเลาะวิวาท แสดงพฤติกรรมไม่เหมาะสม หรือเมาสุราจนก่อความเดือดร้อนผู้อื่น'],
  ['บุหรี่', 'ห้ามสูบบุหรี่/บุหรี่ไฟฟ้าในห้องพัก สูบได้เฉพาะจุดที่จัดไว้ภายนอกอาคาร ฝ่าฝืนปรับ 2,000–5,000 บาท (ค่าทำความสะอาดและกำจัดกลิ่น)'],
  ['อาหารกลิ่นแรง', 'ห้ามนำทุเรียนสดหรืออาหาร/ผลไม้กลิ่นแรงเข้าห้องพักและอาคาร'],
  ['สัตว์เลี้ยง', 'ห้ามนำสัตว์เลี้ยงเข้าพัก (ยกเว้นห้องที่ระบุว่าเป็น Pet-Friendly)'],
  ['ของผิดกฎหมาย', 'ห้ามนำยาเสพติด อาวุธ วัตถุไวไฟ วัตถุระเบิด หรือสิ่งผิดกฎหมายเข้าพื้นที่'],
  ['ทำอาหารในห้อง', 'ห้ามประกอบอาหารในห้องพัก (ยกเว้นห้องที่มีครัวจัดไว้ให้)'],
  ['การพนัน', 'ห้ามเล่นการพนันทุกชนิดในพื้นที่ของรีสอร์ท'],
  ['ย้ายเฟอร์นิเจอร์', 'ห้ามย้ายเฟอร์นิเจอร์หลักออกจากตำแหน่งเดิมโดยไม่ได้รับอนุญาต'],
  ['ทรัพย์สินเสียหาย', 'ทรัพย์สินชำรุด/สูญหาย หรือผ้าเปื้อนที่ซักไม่ออก ผู้เข้าพักรับผิดชอบตามราคาประเมินของรีสอร์ท'],
  ['กุญแจ/คีย์การ์ดหาย', 'กุญแจ/คีย์การ์ดหาย มีค่าทำใหม่ 200–2,500 บาท'],
  ['ของมีค่า', 'รีสอร์ทไม่รับผิดชอบของมีค่าที่สูญหายในห้อง ควรเก็บในตู้เซฟหรือนำติดตัว'],
];
const DEFAULT_HOUSE_RULES = HOUSE_RULE_SAMPLES.map(r => r[1]).join('\n');
const ROOM_ICONS = { standard: 'fa-bed', superior: 'fa-bed', twin: 'fa-bed', deluxe: 'fa-water', family: 'fa-people-roof', suite: 'fa-crown', villa: 'fa-house-chimney-window', dorm: 'fa-users' };
const ROOM_TEMPLATES = {
  standard: { name: 'ห้องสแตนดาร์ด', size: 24, bed: '1 เตียงควีนไซซ์', maxGuests: 2, img: IMG.room6, view: 'วิวสวน', mult: 1 },
  superior: { name: 'ห้องซูพีเรียร์ ดับเบิล', size: 30, bed: '1 เตียงคิงไซซ์', maxGuests: 2, img: IMG.room2, view: 'วิวสวน', mult: 1.25 },
  twin: { name: 'ห้องดีลักซ์ ทวิน', size: 32, bed: '2 เตียงเดี่ยว', maxGuests: 2, img: IMG.room7, view: 'วิวภูเขา', mult: 1.35 },
  deluxe: { name: 'ห้องดีลักซ์ วิวทะเล', size: 38, bed: '1 เตียงคิงไซซ์', maxGuests: 3, img: IMG.room1, view: 'วิวทะเล', mult: 1.6 },
  family: { name: 'ห้องแฟมิลี่', size: 48, bed: '1 เตียงคิงไซซ์ + 2 เตียงเดี่ยว', maxGuests: 4, img: IMG.room4, view: 'วิวสระว่ายน้ำ', mult: 1.9 },
  suite: { name: 'จูเนียร์สวีท', size: 60, bed: '1 เตียงคิงไซซ์', maxGuests: 3, img: IMG.room5, view: 'วิวพาโนรามา', mult: 2.4 },
  villa: { name: 'พูลวิลล่า 1 ห้องนอน', size: 110, bed: '1 เตียงคิงไซซ์', maxGuests: 3, img: IMG.villa1, view: 'สระว่ายน้ำส่วนตัว', mult: 3.5 },
  dorm: { name: 'เตียงในห้องรวม 6 เตียง', size: 20, bed: '1 เตียงสองชั้น', maxGuests: 1, img: IMG.room3, view: '-', mult: 0.35 },
};

// [id, ชื่อ, ประเภท, ดาว, หาด/ย่าน (city), ทำเล (area), lat, lng, คะแนน, จำนวนรีวิว, ราคาฐาน, ส่วนลด%, รูป[], สิ่งอำนวยความสะดวก[], ห้อง[], ระยะจากท่าเรือหน้าบ้าน(กม.)]
const RAW_HOTELS = [
  ['h1', 'ตาแหวน บีช รีสอร์ท', 'รีสอร์ท', 4, 'หาดตาแหวน', 'ริมหาดตาแหวน', 12.92498, 100.78035, 8.7, 1820, 2200, 30, [IMG.pool1, IMG.beach2, IMG.room1, IMG.food], ['wifi', 'pool', 'beach', 'restaurant', 'bar', 'airport', 'ac', 'frontdesk'], ['superior', 'deluxe', 'family'], 1.5],
  ['h2', 'ตาแหวน ซีวิว โฮเทล', 'โรงแรม', 3, 'หาดตาแหวน', 'เนินเขาหาดตาแหวน', 12.92418, 100.78095, 8.2, 960, 1300, 20, [IMG.ext3, IMG.room2, IMG.room6, IMG.pool3], ['wifi', 'pool', 'restaurant', 'ac', 'frontdesk'], ['standard', 'twin', 'deluxe'], 1.4],
  ['h3', 'ตาแหวน บังกะโล', 'บังกะโล', 2, 'หาดตาแหวน', 'ท้ายหาดตาแหวน', 12.92568, 100.78015, 7.9, 640, 700, 15, [IMG.room3, IMG.room7, IMG.beach1], ['wifi', 'beach', 'ac', 'pets'], ['standard', 'family'], 1.6],
  ['h4', 'หน้าบ้าน เกาะล้าน โฮเทล', 'โรงแรม', 3, 'หน้าบ้าน', 'ใกล้ท่าเรือหน้าบ้าน', 12.92276, 100.78936, 8.4, 2210, 1100, 18, [IMG.ext4, IMG.room6, IMG.room7, IMG.lobby], ['wifi', 'restaurant', 'frontdesk', 'ac', 'laundry', 'parking'], ['standard', 'twin', 'family'], 0.2],
  ['h5', 'หน้าบ้าน เกสต์เฮาส์', 'เกสต์เฮาส์', 2, 'หน้าบ้าน', 'ตลาดหน้าบ้าน', 12.92346, 100.78896, 8.0, 870, 600, 10, [IMG.room3, IMG.room6, IMG.ext4], ['wifi', 'ac', 'laundry', 'frontdesk'], ['dorm', 'standard'], 0.2],
  ['h6', 'ไอส์แลนด์ ฮาร์เบอร์ รีสอร์ท', 'รีสอร์ท', 4, 'หน้าบ้าน', 'ริมทะเลหน้าบ้าน', 12.92146, 100.78956, 8.6, 1340, 1900, 25, [IMG.pool3, IMG.ext2, IMG.room2, IMG.room4, IMG.food], ['wifi', 'pool', 'restaurant', 'bar', 'gym', 'airport', 'ac', 'kids'], ['superior', 'deluxe', 'family', 'suite'], 0.2],
  ['h7', 'แสม คลิฟ พูลวิลล่า', 'วิลล่า', 5, 'หาดแสม', 'เนินเขาหาดแสม', 12.91270, 100.77138, 9.4, 520, 6500, 25, [IMG.villa1, IMG.pool4, IMG.room5, IMG.spa], ['wifi', 'pool', 'beach', 'spa', 'airport', 'ac', 'kids', 'pets'], ['villa'], 3.2],
  ['h8', 'แสม ซันเซ็ต รีสอร์ท', 'รีสอร์ท', 4, 'หาดแสม', 'ริมหาดแสม', 12.91180, 100.77038, 9.0, 1560, 2600, 32, [IMG.pool2, IMG.beach1, IMG.room1, IMG.food, IMG.spa], ['wifi', 'pool', 'beach', 'spa', 'restaurant', 'bar', 'airport', 'ac'], ['superior', 'deluxe', 'family', 'villa'], 3.4],
  ['h9', 'แสม บีช บังกะโล', 'บังกะโล', 3, 'หาดแสม', 'ใกล้ลานจอดหาดแสม', 12.91250, 100.77078, 8.3, 710, 1200, 20, [IMG.room7, IMG.beach2, IMG.room6], ['wifi', 'beach', 'restaurant', 'ac', 'parking'], ['standard', 'twin', 'family'], 3.3],
  ['h10', 'เทียน ซีเคร็ท ไฮด์อเวย์', 'รีสอร์ท', 5, 'หาดเทียน', 'หาดเทียน (หาดลับ)', 12.91933, 100.77057, 9.5, 430, 5200, 22, [IMG.beach2, IMG.villa1, IMG.pool4, IMG.room5, IMG.spa], ['wifi', 'pool', 'beach', 'spa', 'restaurant', 'airport', 'ac'], ['deluxe', 'suite', 'villa'], 3.0],
  ['h11', 'เทียน แคมป์ แกลมปิ้ง', 'แกลมปิ้ง', 3, 'หาดเทียน', 'เนินเขาหาดเทียน', 12.91853, 100.77137, 8.6, 390, 1600, 15, [IMG.villa1, IMG.room3, IMG.food], ['wifi', 'beach', 'restaurant', 'pets', 'breakfast'], ['standard', 'family'], 2.9],
  ['h12', 'นวล ลากูน รีสอร์ท', 'รีสอร์ท', 4, 'หาดนวล', 'ริมหาดนวล', 12.90111, 100.77621, 8.8, 980, 2400, 28, [IMG.pool1, IMG.beach1, IMG.room2, IMG.food], ['wifi', 'pool', 'beach', 'restaurant', 'bar', 'kids', 'airport', 'ac'], ['superior', 'deluxe', 'family'], 3.9],
  ['h13', 'มังกี้ เบย์ โฮมสเตย์', 'เกสต์เฮาส์', 2, 'หาดนวล', 'หาดลิง (หาดนวล)', 12.90131, 100.77541, 8.1, 300, 750, 12, [IMG.room6, IMG.room3, IMG.beach2], ['wifi', 'beach', 'ac', 'pets'], ['standard', 'family'], 4.0],
  ['h14', 'ตายาย ซีบรีซ วิลล่า', 'วิลล่า', 4, 'หาดตายาย', 'ริมหาดตายาย', 12.93557, 100.78838, 9.1, 610, 3800, 20, [IMG.villa1, IMG.pool2, IMG.room1, IMG.beach1], ['wifi', 'pool', 'beach', 'parking', 'ac', 'kids', 'pets'], ['family', 'villa'], 2.1],
  ['h15', 'ตายาย ฮิลล์ไซด์ รีสอร์ท', 'รีสอร์ท', 3, 'หาดตายาย', 'เนินเขาหาดตายาย', 12.93477, 100.78798, 8.4, 820, 1400, 22, [IMG.pool3, IMG.room7, IMG.room4, IMG.food], ['wifi', 'pool', 'restaurant', 'parking', 'ac', 'airport'], ['standard', 'superior', 'family'], 1.9],
  ['h16', 'สังวาลย์ บูทีค รีสอร์ท', 'รีสอร์ท', 4, 'หาดสังวาลย์', 'ริมหาดสังวาลย์', 12.92635, 100.77335, 8.9, 740, 2300, 30, [IMG.pool4, IMG.ext1, IMG.room5, IMG.spa], ['wifi', 'pool', 'beach', 'spa', 'restaurant', 'bar', 'ac'], ['superior', 'deluxe', 'suite'], 2.6],
  ['h17', 'เกาะล้าน วิวพอยต์ ลอดจ์', 'โรงแรม', 3, 'หาดสังวาลย์', 'ใกล้จุดชมวิว', 12.92555, 100.77435, 8.5, 510, 1500, 18, [IMG.ext3, IMG.room2, IMG.room6], ['wifi', 'restaurant', 'parking', 'ac', 'frontdesk'], ['standard', 'twin'], 2.4],
];

const REVIEW_POOL = [
  ['สมชาย', 'TH', 'คู่รัก', 9.6, 'ประทับใจมาก!', 'ห้องสะอาด กว้างขวาง พนักงานบริการดีเยี่ยม อาหารเช้าหลากหลาย จะกลับมาพักอีกแน่นอน'],
  ['Emily', 'GB', 'ครอบครัว', 9.2, 'Perfect family stay', 'Great location, the kids loved the pool. Staff were very friendly and helpful.'],
  ['วรรณา', 'TH', 'เดินทางคนเดียว', 8.4, 'คุ้มค่ากับราคา', 'ทำเลดี ใกล้ร้านอาหารและร้านสะดวกซื้อ เตียงนอนสบาย แต่ช่วงเสาร์อาทิตย์คนเยอะนิดหน่อย'],
  ['Kenji', 'JP', 'ธุรกิจ', 8.8, 'Very good', 'Fast Wi-Fi, comfortable desk, good breakfast. Check-in was quick.'],
  ['ณัฐพล', 'TH', 'กลุ่มเพื่อน', 9.0, 'บรรยากาศดีสุดๆ', 'สระว่ายน้ำสวย วิวดีมาก ถ่ายรูปสวยทุกมุม ราคาโปรโมชั่นคุ้มสุดๆ'],
  ['Anna', 'DE', 'คู่รัก', 7.6, 'Nice but could be better', 'Room was nice but bathroom needs renovation. Location is excellent though.'],
  ['ปิยะดา', 'TH', 'ครอบครัว', 9.4, 'เหมาะกับครอบครัวมาก', 'มีโซนเด็กเล่น ห้องแฟมิลี่กว้าง พนักงานใส่ใจเด็กๆ ดีมาก'],
  ['Li Wei', 'CN', 'กลุ่มเพื่อน', 8.6, 'Good value', 'Clean rooms and good service. Breakfast could have more options.'],
  ['ธนากร', 'TH', 'ธุรกิจ', 8.0, 'ดีตามมาตรฐาน', 'ห้องพักโอเค มีรถรับส่งจากท่าเรือ สะดวกมาก'],
  ['Sarah', 'US', 'เดินทางคนเดียว', 9.8, 'Absolutely amazing!', 'Best stay on Koh Larn. Crystal clear water, a must-visit!'],
];

const DEFAULT_COUPONS = [
  { code: 'WELCOME10', type: 'percent', value: 10, min: 0, desc: 'ลด 10% สำหรับการจองครั้งแรก', active: true },
  { code: 'SUMMER500', type: 'fixed', value: 500, min: 3000, desc: 'ลด ฿500 เมื่อจองขั้นต่ำ ฿3,000', active: true },
  { code: 'STAYLONG', type: 'percent', value: 15, min: 8000, desc: 'ลด 15% เมื่อจองขั้นต่ำ ฿8,000', active: true },
];

function hashNum(str) { let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }

function buildSeedHotels() {
  return RAW_HOTELS.map(r => {
    const [id, name, type, stars, city, area, lat, lng, rating, reviews, base, disc, images, amen, roomKeys, dist] = r;
    const h = hashNum(id);
    const rooms = roomKeys.map((k, i) => {
      const t = ROOM_TEMPLATES[k];
      const price = Math.round(base * t.mult / 10) * 10;
      return {
        id: `${id}-r${i + 1}`, name: t.name, size: t.size, bed: t.bed, maxGuests: t.maxGuests, view: t.view,
        img: t.img, total: 3 + ((h >> i) % 8), price,
        discount: Math.max(0, disc - (i * 3) + ((h >> (i + 2)) % 6)),
        breakfast: amen.includes('breakfast') || (h >> i) % 2 === 0,
        freeCancel: (h >> (i + 1)) % 3 !== 0,
        payAtHotel: (h >> (i + 3)) % 2 === 0,
      };
    });
    return {
      id, name, type, stars, city, area, lat, lng, rating, reviews, images, amenities: amen, rooms, distance: dist,
      address: `${area}, ${city}, เกาะล้าน จ.ชลบุรี`,
      description: `${name} ตั้งอยู่ในทำเลยอดเยี่ยม${area} เกาะล้าน ให้บริการห้องพักที่ตกแต่งอย่างทันสมัยพร้อมสิ่งอำนวยความสะดวกครบครัน เหมาะสำหรับทั้งการพักผ่อนและการมาเที่ยวทะเลกับเพื่อนและครอบครัว ผู้เข้าพักสามารถเพลิดเพลินกับ${amen.includes('pool') ? 'สระว่ายน้ำกลางแจ้ง ' : ''}${amen.includes('spa') ? 'สปาและนวดแผนไทย ' : ''}${amen.includes('restaurant') ? 'ห้องอาหารที่เสิร์ฟทั้งอาหารไทยและนานาชาติ ' : ''}และบริการที่เป็นมิตรจากทีมงานมืออาชีพตลอด 24 ชั่วโมง`,
      checkIn: '14:00', checkOut: '12:00',
      highlights: [
        dist < 1.5 ? 'ทำเลดีเยี่ยม — ใกล้ท่าเรือหน้าบ้าน' : `ห่างจากท่าเรือหน้าบ้าน ${dist} กม.`,
        rating >= 9 ? 'ได้รับคะแนนความสะอาดสูงมาก' : 'คุ้มค่าเงิน',
        amen.includes('beach') ? 'ติดชายหาด' : amen.includes('pool') ? 'สระว่ายน้ำวิวสวย' : 'Wi-Fi ความเร็วสูงฟรี',
      ],
      active: true,
    };
  });
}

// ช่องรูปของทั้งเว็บที่นักพัฒนาเปลี่ยนได้ (หน้า dev → "รูปทั้งเว็บ") — ถ้าไม่ได้ตั้ง ใช้รูปตั้งต้น (def)
// ค่าที่ตั้งเก็บใน sd_kv คีย์ 'images' เป็น { key: URL } · อ่านด้วย siteImgId(key, def) ใน store.js
const SITE_IMAGE_SLOTS = [
  { key: 'logo', group: 'แบรนด์', label: 'โลโก้เต็ม — หัวเว็บและหน้าล็อกอินหลังบ้าน', def: 'assets/logo-800.jpg', max: 1200, ratio: '3 / 2' },
  { key: 'icon', group: 'แบรนด์', label: 'ไอคอนสี่เหลี่ยม — แท็บเบราว์เซอร์และแถบข้างหลังบ้าน', def: 'assets/icon-192.png', max: 512, ratio: '1 / 1' },
  { key: 'hero', group: 'หน้าแรก', label: 'พื้นหลังแบนเนอร์ค้นหา', def: IMG.pool2, max: 1800, ratio: '21 / 9', multi: true },
  { key: 'promo1', group: 'หน้าแรก', label: 'โปรโมชั่น 1 — ทะเลใสเกาะล้าน (หาดแสม)', def: IMG.beach1, max: 900, ratio: '16 / 10', multi: true },
  { key: 'promo2', group: 'หน้าแรก', label: 'โปรโมชั่น 2 — สมาชิกใหม่ ลดเพิ่ม 10%', def: IMG.pool2, max: 900, ratio: '16 / 10', multi: true },
  { key: 'promo3', group: 'หน้าแรก', label: 'โปรโมชั่น 3 — ดีลพูลวิลล่า', def: IMG.villa1, max: 900, ratio: '16 / 10', multi: true },
  ...DESTINATIONS.slice(0, 6).map((d, i) => ({ key: 'dest' + i, group: 'ชายหาด / จุดหมาย', label: d.name, def: d.img, max: 800, ratio: '4 / 3' })),
  { key: 'mapbg', group: 'อื่นๆ', label: 'พื้นหลังปุ่ม "ดูบนแผนที่" (หน้าค้นหา)', def: 'photo-1524661135-423995f22d0b', max: 700, ratio: '5 / 2' },
];

// สร้างบัญชีสาธิต + Ticket ตัวอย่าง 60 รายการ กระจาย 30 วัน
//   node seed-demo.js          ล้างข้อมูลสาธิตเดิม (ถ้ามี) แล้วสร้างใหม่
//   node seed-demo.js --clean  ลบข้อมูลสาธิตทั้งหมดอย่างเดียว
// ข้อมูลสาธิตทั้งหมดผูกกับอีเมล @nexus.test จึงไม่ยุ่งกับข้อมูลจริงของคุณ
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('./db');

const PASSWORD = '12345678';
const DOMAIN = '@nexus.test';
const USERS = [
  ['ผู้ดูแลระบบ (Demo)', 'admin', 'admin'],
  ['สมชาย ช่างเทคนิค', 'tech1', 'technician'], ['วิภา ซัพพอร์ต', 'tech2', 'technician'], ['ธนากร เน็ตเวิร์ก', 'tech3', 'technician'],
  ['สุดา การเงิน', 'user1', 'user'], ['ประเสริฐ บัญชี', 'user2', 'user'], ['นภา ฝ่ายขาย', 'user3', 'user'], ['กิตติ ทรัพยากรบุคคล', 'user4', 'user']
];
const TEMPLATES = [
  ['hardware', 'คีย์บอร์ดบางปุ่มกดไม่ติด', 'ตัวอักษร A และ S กดแล้วไม่ทำงาน'], ['hardware', 'จอคอมพิวเตอร์ไม่แสดงภาพ', 'เปิดเครื่องแล้วไฟติด แต่หน้าจอดำ'],
  ['hardware', 'เมาส์เลื่อนสะดุด', 'เคอร์เซอร์กระตุกบ่อย เปลี่ยนแผ่นรองแล้วก็ยังเป็น'], ['hardware', 'คอมพิวเตอร์เปิดไม่ติด', 'กดปุ่มเปิดเครื่องแล้วไม่มีไฟขึ้นเลย'],
  ['hardware', 'เครื่องพิมพ์พิมพ์ไม่ออก', 'สั่งพิมพ์แล้วงานค้างอยู่ในคิว'], ['hardware', 'แบตเตอรี่โน้ตบุ๊กเสื่อม', 'ชาร์จเต็มแต่ใช้ได้ไม่ถึงชั่วโมง'],
  ['software', 'ติดตั้งโปรแกรม Office ไม่ได้', 'ขึ้น error ระหว่างติดตั้ง'], ['software', 'โปรแกรมบัญชีเปิดแล้วค้าง', 'เปิดแล้วค้างที่หน้าโหลด ต้องปิดด้วย Task Manager'],
  ['software', 'ขอติดตั้ง Adobe Acrobat', 'ต้องใช้แก้ไขไฟล์ PDF สัญญา'], ['software', 'Windows อัปเดตแล้วเข้าระบบไม่ได้', 'หลังอัปเดตหน้าจอค้างที่โลโก้'],
  ['software', 'ไฟล์ Excel เปิดไม่ขึ้น', 'ขึ้นว่าไฟล์เสียหาย มีข้อมูลสำคัญอยู่'], ['software', 'ขอสิทธิ์เข้าระบบ ERP', 'ย้ายแผนกใหม่ ต้องใช้โมดูลคลังสินค้า'],
  ['network', 'เชื่อมต่อ Wi-Fi ไม่ได้', 'ขึ้นว่าเชื่อมต่อแล้วแต่ไม่มีอินเทอร์เน็ต'], ['network', 'อินเทอร์เน็ตช้ามากช่วงบ่าย', 'โหลดเว็บช้า ประชุมออนไลน์กระตุก'],
  ['network', 'เข้าโฟลเดอร์แชร์ไม่ได้', 'ขึ้นว่าไม่มีสิทธิ์เข้าถึงเครือข่าย'], ['network', 'VPN เชื่อมต่อไม่สำเร็จ', 'ทำงานที่บ้านแล้วต่อ VPN ไม่ได้'],
  ['account', 'ลืมรหัสผ่านอีเมลองค์กร', 'ต้องการรีเซ็ตรหัสผ่านด่วน'], ['account', 'บัญชีถูกล็อกหลังใส่รหัสผิด', 'เข้าระบบไม่ได้ตั้งแต่เช้า'],
  ['account', 'ขอเปิดบัญชีพนักงานใหม่', 'พนักงานเริ่มงานสัปดาห์หน้า ต้องใช้อีเมลและระบบภายใน']
];
const NOTE_PROG = ['กำลังตรวจสอบอาการเบื้องต้น', 'กำลังเข้าตรวจที่เครื่อง', 'กำลังติดตั้งและทดสอบ', 'รอเปลี่ยนอุปกรณ์'];
const NOTE_DONE = ['เปลี่ยนอุปกรณ์และทดสอบเรียบร้อย', 'แก้ไขการตั้งค่าแล้ว ใช้งานได้ปกติ', 'ติดตั้งใหม่เรียบร้อย', 'รีเซ็ตและตรวจสอบแล้ว ปกติ'];
const REVIEW = { 5: ['แก้ไขเร็วมาก ขอบคุณครับ', 'บริการดีเยี่ยม อธิบายเข้าใจง่าย', 'ช่างสุภาพ แก้ปัญหาได้ตรงจุด'], 4: ['ดีครับ แก้ไขได้เรียบร้อย', 'รวดเร็วพอสมควร'], 3: ['ใช้เวลานานไปหน่อย แต่แก้ได้'], 2: ['ต้องตามงานหลายครั้ง'] };
const C_USER = ['ช่วยดูให้หน่อยได้ไหมครับ ตอนนี้ใช้งานไม่ได้เลย', 'อาการยังเหมือนเดิมค่ะ', 'ขอบคุณมากครับ ใช้งานได้แล้ว'];
const C_TECH = ['รับเรื่องแล้วครับ จะเข้าไปตรวจสอบภายในวันนี้', 'ลองรีสตาร์ตเครื่องแล้วแจ้งผลอีกครั้งนะครับ', 'ดำเนินการเรียบร้อยแล้ว ลองใช้งานดูครับ'];

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const R = rng(2026);
const pick = (a) => a[Math.floor(R() * a.length)];
const weighted = (pairs) => { let x = R() * pairs.reduce((s, p) => s + p[1], 0); for (const [v, w] of pairs) { if ((x -= w) < 0) return v; } return pairs[0][0]; };

async function q(conn, sql, params = []) {
  try { return await conn.query(sql, params); } catch (e) { if (e.code === 'ER_NO_SUCH_TABLE') return [[]]; throw e; }
}

async function wipe(conn) {
  const [users] = await q(conn, 'SELECT id FROM users WHERE email LIKE ?', ['%' + DOMAIN]);
  const ids = users.map((u) => u.id);
  if (!ids.length) return;
  const [t] = await q(conn, 'SELECT id FROM tickets WHERE user_id IN (?)', [ids]);
  const tids = t.map((x) => x.id);
  if (tids.length) for (const tb of ['reviews', 'ticket_history', 'ticket_comments', 'ticket_attachments']) await q(conn, `DELETE FROM ${tb} WHERE ticket_id IN (?)`, [tids]);
  await q(conn, 'DELETE FROM reviews WHERE technician_id IN (?) OR user_id IN (?)', [ids, ids]);
  await q(conn, 'DELETE FROM ticket_history WHERE changed_by IN (?)', [ids]);
  await q(conn, 'DELETE FROM ticket_comments WHERE user_id IN (?)', [ids]);
  await q(conn, 'DELETE FROM notifications WHERE user_id IN (?)', [ids]);
  if (tids.length) await q(conn, 'DELETE FROM tickets WHERE id IN (?)', [tids]);
  await q(conn, 'UPDATE tickets SET technician_id = NULL WHERE technician_id IN (?)', [ids]);
  await q(conn, 'DELETE FROM users WHERE id IN (?)', [ids]);
}

async function seed(conn) {
  const U = {};
  for (const [name, local, role] of USERS) {
    const [r] = await conn.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [name, local + DOMAIN, await bcrypt.hash(PASSWORD, 10), role]);
    U[local] = { id: r.insertId, name, role };
  }
  const admin = U.admin, techs = [U.tech1, U.tech2, U.tech3], owners = [U.user1, U.user2, U.user3, U.user4];
  let [cats] = await conn.query('SELECT id, name FROM categories');
  if (!cats.length) {
    for (const n of ['Hardware', 'Software', 'Network', 'Account']) { const [r] = await conn.query('INSERT INTO categories (name, description) VALUES (?, ?)', [n, n]); cats.push({ id: r.insertId, name: n }); }
  }
  const catFor = (kw) => (cats.find((c) => String(c.name).toLowerCase().includes(kw)) || pick(cats)).id;
  const [col] = await q(conn, "SHOW COLUMNS FROM reviews LIKE 'created_at'");
  const reviewHasDate = col.length > 0;
  const now = Date.now(), M = 60000;
  const made = [];
  let counts = { tickets: 0, history: 0, reviews: 0, comments: 0 };

  for (let i = 0; i < 60; i++) {
    const created = Math.min(now - Math.floor(30 * Math.pow(R(), 1.5)) * 864e5 - R() * 864e5, now - (5 + R() * 60) * M);
    const ageH = (now - created) / 36e5;
    const pri = weighted([['low', 25], ['medium', 45], ['high', 22], ['urgent', 8]]);
    const rank = ageH < 6 ? weighted([[0, 60], [1, 25], [2, 15]])
      : ageH < 48 ? weighted([[0, 15], [1, 25], [2, 35], [3, 25]])
      : weighted([[3, 85], [2, 10], [1, 5]]);
    const status = ['open', 'assigned', 'in_progress', 'resolved'][rank];
    const tpl = pick(TEMPLATES), owner = pick(owners), tech = pick(techs);
    const assignedAt = rank >= 1 ? Math.min(created + (pri === 'urgent' ? 10 + R() * 20 : 20 + R() * 100) * M, now - 2 * M) : null;
    const progAt = rank >= 2 ? Math.min(assignedAt + (20 + R() * 160) * M, now - M) : null;
    const doneAt = rank >= 3 ? Math.min(progAt + (60 + R() * (pri === 'urgent' ? 180 : 1700)) * M, now - M) : null;
    const updated = doneAt || progAt || assignedAt || created;
    const [tr] = await conn.query(
      'INSERT INTO tickets (title, description, priority, status, user_id, category_id, technician_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [tpl[1], tpl[2], pri, status, owner.id, catFor(tpl[0]), rank >= 1 ? tech.id : null, new Date(created), new Date(updated)]);
    const id = tr.insertId; counts.tickets++;
    made.push({ id, created, rank, owner, tech, title: tpl[1], doneAt });
    const hist = async (by, from, to, note, at) => { await conn.query('INSERT INTO ticket_history (ticket_id, changed_by, old_status, new_status, note, created_at) VALUES (?, ?, ?, ?, ?, ?)', [id, by.id, from, to, note, new Date(at)]); counts.history++; };
    if (rank >= 1) await hist(admin, 'open', 'assigned', `มอบหมายงานให้ ${tech.name}`, assignedAt);
    if (rank >= 2) await hist(tech, 'assigned', 'in_progress', pick(NOTE_PROG), progAt);
    if (rank >= 3) {
      await hist(tech, 'in_progress', 'resolved', pick(NOTE_DONE), doneAt);
      if (R() < 0.75) {
        const rating = pick([5, 5, 5, 4, 4, 4, 3, 2]), at = Math.min(doneAt + (60 + R() * 2000) * M, now - M);
        const cols = reviewHasDate ? ', created_at' : '', ph = reviewHasDate ? ', ?' : '';
        await conn.query(`INSERT INTO reviews (ticket_id, user_id, technician_id, rating, comment${cols}) VALUES (?, ?, ?, ?, ?${ph})`,
          [id, owner.id, tech.id, rating, pick(REVIEW[rating]), ...(reviewHasDate ? [new Date(at)] : [])]);
        counts.reviews++;
      }
    }
    if (rank >= 1 && R() < 0.5) {
      const end = doneAt || now, span = end - created;
      const msgs = [[owner, C_USER[0], created + 0.1 * span], [tech, pick(C_TECH.slice(0, 2)), created + 0.4 * span]];
      if (rank >= 3) msgs.push([owner, C_USER[2], Math.min(end + 30 * M, now - M)]);
      for (const [u, body, at] of msgs) { await q(conn, 'INSERT INTO ticket_comments (ticket_id, user_id, body, created_at) VALUES (?, ?, ?, ?)', [id, u.id, body, new Date(at)]); counts.comments++; }
    }
  }
  // การแจ้งเตือนตัวอย่าง
  const recent = [...made].sort((a, b) => b.created - a.created);
  const note = (u, t, msg, read, at) => q(conn, 'INSERT INTO notifications (user_id, ticket_id, message, is_read, created_at) VALUES (?, ?, ?, ?, ?)', [u.id, t.id, msg, read, new Date(at)]);
  for (const [i, t] of recent.slice(0, 8).entries()) await note(admin, t, `มี Ticket ใหม่ #${t.id}: ${t.title}`, i >= 3 ? 1 : 0, t.created);
  for (const [i, t] of made.filter((x) => x.rank >= 1 && x.rank < 3).slice(-3).entries()) await note(t.tech, t, `คุณได้รับมอบหมาย Ticket #${t.id}`, i > 0 ? 1 : 0, t.created + 30 * M);
  for (const t of made.filter((x) => x.rank === 3).slice(-4)) await note(t.owner, t, `Ticket #${t.id} เปลี่ยนสถานะเป็น แก้ไขแล้ว`, 0, t.doneAt);
  return counts;
}

async function main() {
  const cleanOnly = process.argv.includes('--clean');
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await wipe(conn);
    const c = cleanOnly ? null : await seed(conn);
    await conn.commit();
    if (cleanOnly) return console.log('ลบข้อมูลสาธิตเรียบร้อย');
    console.log(`สร้างข้อมูลสาธิตสำเร็จ: ${c.tickets} Ticket, ${c.history} ประวัติ, ${c.reviews} รีวิว, ${c.comments} ความคิดเห็น\n`);
    console.log('บัญชีสาธิต (รหัสผ่านทุกบัญชี: ' + PASSWORD + ')');
    for (const [name, local, role] of USERS) console.log(`  ${(local + DOMAIN).padEnd(20)} ${role.padEnd(11)} ${name}`);
  } catch (e) {
    await conn.rollback();
    console.error('สร้างข้อมูลสาธิตไม่สำเร็จ (ยกเลิกทั้งหมดแล้ว):', e.message);
    process.exitCode = 1;
  } finally {
    conn.release();
    await pool.end();
  }
}
main();

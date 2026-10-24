const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

module.exports = function registerExtraRoutes(app, pool, verifyToken, verifyAdmin) {
  const dir = path.join(__dirname, 'uploads'); // ไม่เปิดเป็น static: ดาวน์โหลดผ่าน API ที่ตรวจสิทธิ์เท่านั้น
  fs.mkdirSync(dir, { recursive: true });

  const TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
  const upload = multer({
    storage: multer.diskStorage({
      destination: dir,
      filename: (req, file, cb) => cb(null, crypto.randomBytes(16).toString('hex') + (TYPES[file.mimetype] || ''))
    }),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => (TYPES[file.mimetype] ? cb(null, true) : cb(new Error('INVALID_TYPE')))
  });

  // กันสแปม: จำกัดจำนวนครั้งต่อนาที/ชั่วโมงต่อ IP
  const limit = (n, ms) => rateLimit({ windowMs: ms, limit: n, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { success: false, message: 'ทำรายการบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่' } });

  const fail = (res, code, message) => res.status(code).json({ success: false, message });
  const done = (res, data = {}, code = 200) => res.status(code).json({ success: true, ...data });

  // ตรวจสิทธิ์เข้าถึง Ticket: admin / เจ้าของ / ช่างที่รับผิดชอบ
  async function getTicket(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) { fail(res, 400, 'รหัส Ticket ไม่ถูกต้อง'); return null; }
    const [rows] = await pool.execute('SELECT id, title, user_id, technician_id FROM tickets WHERE id = ?', [id]);
    if (!rows.length) { fail(res, 404, 'ไม่พบ Ticket นี้'); return null; }
    const t = rows[0], u = req.user;
    const ok = u.role === 'admin' || Number(t.user_id) === Number(u.id) ||
      (u.role === 'technician' && Number(t.technician_id) === Number(u.id));
    if (!ok) { fail(res, 403, 'คุณไม่มีสิทธิ์เข้าถึง Ticket นี้'); return null; }
    return t;
  }

  async function notify(userIds, ticketId, message, exceptId) {
    const ids = [...new Set(userIds.filter(Boolean).map(Number))].filter((i) => i !== Number(exceptId));
    for (const uid of ids) {
      await pool.execute('INSERT INTO notifications (user_id, ticket_id, message) VALUES (?, ?, ?)', [uid, ticketId, message.slice(0, 250)]);
    }
  }

  const strongPassword = (p) => typeof p === 'string' && p.length >= 8 && p.length <= 100;

  // ---------- ความคิดเห็น ----------
  app.get('/api/tickets/:id/comments', verifyToken, async (req, res) => {
    try {
      const t = await getTicket(req, res); if (!t) return;
      const [comments] = await pool.execute(
        `SELECT c.id, c.user_id, u.name AS user_name, u.role, c.body, c.created_at
         FROM ticket_comments c JOIN users u ON c.user_id = u.id
         WHERE c.ticket_id = ? ORDER BY c.id ASC`, [t.id]);
      return done(res, { comments });
    } catch (e) { console.error('Get comments error:', e.message); return fail(res, 500, 'ไม่สามารถดึงความคิดเห็นได้'); }
  });

  app.post('/api/tickets/:id/comments', verifyToken, limit(30, 60 * 1000), async (req, res) => {
    try {
      const t = await getTicket(req, res); if (!t) return;
      const body = typeof req.body.body === 'string' ? req.body.body.trim() : '';
      if (!body || body.length > 2000) return fail(res, 400, 'ความคิดเห็นต้องมี 1–2000 ตัวอักษร');
      const [r] = await pool.execute('INSERT INTO ticket_comments (ticket_id, user_id, body) VALUES (?, ?, ?)', [t.id, req.user.id, body]);
      let admins = [];
      if (req.user.role === 'user') {
        [admins] = await pool.execute("SELECT id FROM users WHERE role = 'admin'");
      }
      await notify([t.user_id, t.technician_id, ...admins.map((a) => a.id)], t.id,
        `${req.user.name} คอมเมนต์ใน Ticket #${t.id}: ${body}`, req.user.id).catch((e) => console.error('Notify error:', e.message));
      return done(res, { id: r.insertId }, 201);
    } catch (e) { console.error('Add comment error:', e.message); return fail(res, 500, 'ไม่สามารถบันทึกความคิดเห็นได้'); }
  });

  // ---------- ไฟล์แนบ (รูปภาพ) ----------
  app.get('/api/tickets/:id/attachments', verifyToken, async (req, res) => {
    try {
      const t = await getTicket(req, res); if (!t) return;
      const [attachments] = await pool.execute(
        'SELECT id, original_name, mime, size, user_id, created_at FROM ticket_attachments WHERE ticket_id = ? ORDER BY id ASC', [t.id]);
      return done(res, { attachments });
    } catch (e) { console.error('Get attachments error:', e.message); return fail(res, 500, 'ไม่สามารถดึงไฟล์แนบได้'); }
  });

  app.post('/api/tickets/:id/attachments', verifyToken, limit(20, 60 * 60 * 1000), (req, res) => {
    upload.single('file')(req, res, async (err) => {
      const drop = () => { if (req.file) fs.unlink(req.file.path, () => {}); };
      try {
        if (err) {
          return fail(res, 400, err.code === 'LIMIT_FILE_SIZE' ? 'ไฟล์ต้องไม่เกิน 5 MB'
            : err.message === 'INVALID_TYPE' ? 'แนบได้เฉพาะรูป JPG, PNG, WEBP หรือ GIF' : 'อัปโหลดไฟล์ไม่สำเร็จ');
        }
        if (!req.file) return fail(res, 400, 'กรุณาเลือกไฟล์รูปภาพ');
        const t = await getTicket(req, res);
        if (!t) return drop();
        const [[{ n }]] = await pool.execute('SELECT COUNT(*) AS n FROM ticket_attachments WHERE ticket_id = ?', [t.id]);
        if (n >= 10) { drop(); return fail(res, 400, 'แนบรูปได้สูงสุด 10 รูปต่อ Ticket'); }
        const name = Buffer.from(req.file.originalname, 'latin1').toString('utf8').slice(0, 200);
        await pool.execute(
          'INSERT INTO ticket_attachments (ticket_id, user_id, original_name, stored_name, mime, size) VALUES (?, ?, ?, ?, ?, ?)',
          [t.id, req.user.id, name, req.file.filename, req.file.mimetype, req.file.size]);
        return done(res, { message: 'แนบรูปสำเร็จ' }, 201);
      } catch (e) { drop(); console.error('Upload error:', e.message); return fail(res, 500, 'ไม่สามารถบันทึกไฟล์ได้'); }
    });
  });

  app.get('/api/attachments/:id/file', verifyToken, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) return fail(res, 400, 'รหัสไฟล์ไม่ถูกต้อง');
      const [rows] = await pool.execute('SELECT ticket_id, stored_name, mime FROM ticket_attachments WHERE id = ?', [id]);
      if (!rows.length) return fail(res, 404, 'ไม่พบไฟล์');
      req.params.id = String(rows[0].ticket_id);
      const t = await getTicket(req, res); if (!t) return;
      res.set({ 'Content-Type': rows[0].mime, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, max-age=3600' });
      return res.sendFile(path.join(dir, path.basename(rows[0].stored_name)));
    } catch (e) { console.error('Send file error:', e.message); return fail(res, 500, 'ไม่สามารถเปิดไฟล์ได้'); }
  });

  // ---------- การแจ้งเตือน ----------
  app.get('/api/notifications', verifyToken, async (req, res) => {
    try {
      const [notifications] = await pool.execute(
        'SELECT id, ticket_id, message, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 30', [req.user.id]);
      const [[{ unread }]] = await pool.execute('SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = 0', [req.user.id]);
      return done(res, { unread, notifications });
    } catch (e) { console.error('Get notifications error:', e.message); return fail(res, 500, 'ไม่สามารถดึงการแจ้งเตือนได้'); }
  });

  app.post('/api/notifications/read-all', verifyToken, async (req, res) => {
    try {
      await pool.execute('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [req.user.id]);
      return done(res);
    } catch (e) { console.error('Read notifications error:', e.message); return fail(res, 500, 'ไม่สามารถอัปเดตการแจ้งเตือนได้'); }
  });

  // ---------- โปรไฟล์ ----------
  app.patch('/api/auth/profile', verifyToken, async (req, res) => {
    try {
      const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
      if (!name || name.length > 100) return fail(res, 400, 'ชื่อต้องมี 1–100 ตัวอักษร');
      await pool.execute('UPDATE users SET name = ? WHERE id = ?', [name, req.user.id]);
      const user = { id: req.user.id, name, email: req.user.email, role: req.user.role };
      res.cookie('token', jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' }), {
        httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 1000, path: '/'
      });
      return done(res, { message: 'บันทึกโปรไฟล์สำเร็จ', user });
    } catch (e) { console.error('Update profile error:', e.message); return fail(res, 500, 'ไม่สามารถบันทึกโปรไฟล์ได้'); }
  });

  app.patch('/api/auth/password', verifyToken, async (req, res) => {
    try {
      const { current_password, new_password } = req.body;
      if (typeof current_password !== 'string' || !strongPassword(new_password)) {
        return fail(res, 400, 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร');
      }
      const [rows] = await pool.execute('SELECT password FROM users WHERE id = ?', [req.user.id]);
      if (!rows.length || !(await bcrypt.compare(current_password, rows[0].password))) {
        return fail(res, 400, 'รหัสผ่านปัจจุบันไม่ถูกต้อง');
      }
      await pool.execute('UPDATE users SET password = ? WHERE id = ?', [await bcrypt.hash(new_password, 12), req.user.id]);
      return done(res, { message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
    } catch (e) { console.error('Change password error:', e.message); return fail(res, 500, 'ไม่สามารถเปลี่ยนรหัสผ่านได้'); }
  });

  // Admin รีเซ็ตรหัสผ่านให้ผู้ใช้ (แทนระบบลืมรหัสผ่านทางอีเมล)
  app.patch('/api/admin/users/:id/password', verifyToken, verifyAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) return fail(res, 400, 'รหัสผู้ใช้ไม่ถูกต้อง');
      if (!strongPassword(req.body.new_password)) return fail(res, 400, 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร');
      const [r] = await pool.execute('UPDATE users SET password = ? WHERE id = ?', [await bcrypt.hash(req.body.new_password, 12), id]);
      if (!r.affectedRows) return fail(res, 404, 'ไม่พบผู้ใช้');
      return done(res, { message: 'รีเซ็ตรหัสผ่านสำเร็จ' });
    } catch (e) { console.error('Reset password error:', e.message); return fail(res, 500, 'ไม่สามารถรีเซ็ตรหัสผ่านได้'); }
  });
};

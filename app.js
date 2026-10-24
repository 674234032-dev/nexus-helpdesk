
require('dotenv').config();

const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { testConnection, pool } = require('./db');
const registerTicketWorkRoutes = require('./ticket-work-routes');
const registerExtraRoutes = require('./extra-routes');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// หลังพร็อกซีของโฮสต์ (เช่น Render) ต้องเชื่อ X-Forwarded-* เพื่อให้ IP จริงและ cookie ทำงานถูกต้อง
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);
const PORT = process.env.PORT || 3000;

if (!process.env.JWT_SECRET) {
  console.error('ไม่พบ JWT_SECRET ในไฟล์ .env');
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
  console.warn('คำเตือน: JWT_SECRET สั้นกว่า 32 ตัวอักษร ควรใช้ค่าสุ่มที่ยาวและเดาไม่ได้');
}

// ========================================
// Security
// ========================================

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'script-src': ["'self'", "'unsafe-inline'"],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
        'img-src': ["'self'", 'data:', 'blob:'],
        'connect-src': ["'self'"],
        'upgrade-insecure-requests': null
      }
    }
  })
);

// จำกัดการเดารหัสผ่าน: ผิดได้ 10 ครั้งต่อ 15 นาที (ครั้งที่สำเร็จไม่นับ)
app.use(
  '/api/auth/login',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      success: false,
      message: 'พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอ 15 นาทีแล้วลองใหม่'
    }
  })
);

app.use(
  '/api/auth/register',
  rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      success: false,
      message: 'สมัครสมาชิกบ่อยเกินไป กรุณาลองใหม่ภายหลัง'
    }
  })
);

// ========================================
// Middleware
// ========================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ========================================
// Health Check
// ========================================

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'NEXUS IT Helpdesk API ทำงานปกติ'
  });
});

app.get('/api/db-health', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT DATABASE() AS database_name'
    );

    res.status(200).json({
      success: true,
      message: 'เชื่อมต่อฐานข้อมูลสำเร็จ',
      database: rows[0].database_name
    });
  } catch (error) {
    console.error('Database health error:', error.message);

    res.status(500).json({
      success: false,
      message: 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้'
    });
  }
});

// ========================================
// Register
// ========================================

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกชื่อ อีเมล และรหัสผ่านให้ครบ'
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'รูปแบบอีเมลไม่ถูกต้อง'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'
      });
    }

    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email.trim()]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'อีเมลนี้มีผู้ใช้งานแล้ว'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name.trim(), email.trim(), hashedPassword]
    );

    return res.status(201).json({
      success: true,
      message: 'สมัครสมาชิกสำเร็จ',
      user: {
        id: result.insertId,
        name: name.trim(),
        email: email.trim(),
        role: 'user'
      }
    });
  } catch (error) {
    console.error('Register error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสมัครสมาชิก'
    });
  }
});

// ========================================
// Login - HttpOnly Cookie
// ========================================

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกอีเมลและรหัสผ่าน'
      });
    }

    const [users] = await pool.execute(
      `SELECT id, name, email, password, role
       FROM users
       WHERE email = ?`,
      [email.trim()]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
      });
    }

    const user = users[0];

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 1000,
      path: '/'
    });

    return res.status(200).json({
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'
    });
  }
});

// ========================================
// Authentication Middleware
// ========================================

function verifyToken(req, res, next) {
  const authorization = req.headers.authorization;

  const token =
    req.cookies?.token ||
    (authorization && authorization.startsWith('Bearer ')
      ? authorization.slice(7)
      : null);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'กรุณาเข้าสู่ระบบก่อนใช้งาน'
    });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token ไม่ถูกต้องหรือหมดอายุแล้ว'
    });
  }
}

function verifyAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'เฉพาะ Admin เท่านั้นที่ใช้งานส่วนนี้ได้'
    });
  }

  next();
}

function verifyTechnician(req, res, next) {
  if (req.user.role !== 'technician') {
    return res.status(403).json({
      success: false,
      message: 'เฉพาะ Technician เท่านั้นที่ใช้งานส่วนนี้ได้'
    });
  }

  next();
}

// ========================================
// Logout
// ========================================

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });

  return res.status(200).json({
    success: true,
    message: 'ออกจากระบบสำเร็จ'
  });
});

// ========================================
// Ticket Work Routes
// ========================================

registerTicketWorkRoutes(
  app,
  pool,
  verifyToken,
  verifyAdmin,
  verifyTechnician
);

registerExtraRoutes(app, pool, verifyToken, verifyAdmin);

// ========================================
// Current User
// ========================================

app.get('/api/auth/me', verifyToken, (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user
  });
});

// ========================================
// Admin APIs
// ========================================

app.get(
  '/api/admin/test',
  verifyToken,
  verifyAdmin,
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'คุณมีสิทธิ์ Admin',
      user: req.user
    });
  }
);

// ดูรายชื่อผู้ใช้
app.get(
  '/api/admin/users',
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const [users] = await pool.execute(
        `SELECT id, name, email, role
         FROM users
         ORDER BY id ASC`
      );

      return res.status(200).json({
        success: true,
        message: 'ดึงรายชื่อผู้ใช้สำเร็จ',
        total: users.length,
        users
      });
    } catch (error) {
      console.error('Get users error:', error.message);

      return res.status(500).json({
        success: false,
        message: 'ไม่สามารถดึงรายชื่อผู้ใช้ได้'
      });
    }
  }
);

// เปลี่ยนบทบาทผู้ใช้
app.patch(
  '/api/admin/users/:id/role',
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const { role } = req.body;
      const allowedRoles = ['admin', 'technician', 'user'];

      if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'รหัสผู้ใช้ไม่ถูกต้อง'
        });
      }

      if (!allowedRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'บทบาทต้องเป็น admin, technician หรือ user'
        });
      }

      const [existingUsers] = await pool.execute(
        'SELECT id, name, email, role FROM users WHERE id = ?',
        [userId]
      );

      if (existingUsers.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบผู้ใช้ที่ต้องการแก้ไข'
        });
      }

      if (userId === Number(req.user.id) && role !== 'admin') {
        return res.status(400).json({
          success: false,
          message: 'ไม่สามารถลดสิทธิ์บัญชี Admin ที่กำลังใช้งานอยู่ได้'
        });
      }

      await pool.execute(
        'UPDATE users SET role = ? WHERE id = ?',
        [role, userId]
      );

      return res.status(200).json({
        success: true,
        message: 'เปลี่ยนบทบาทผู้ใช้สำเร็จ',
        user: {
          ...existingUsers[0],
          role
        }
      });
    } catch (error) {
      console.error('Update user role error:', error.message);

      return res.status(500).json({
        success: false,
        message: 'ไม่สามารถเปลี่ยนบทบาทผู้ใช้ได้'
      });
    }
  }
);

// Admin ดู Ticket ทั้งหมด
app.get(
  '/api/admin/tickets',
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const [tickets] = await pool.execute(
        `SELECT
           t.id,
           t.title,
           t.description,
           t.priority,
           t.status,
           t.user_id,
           requester.name AS requester_name,
           requester.email AS requester_email,
           t.category_id,
           c.name AS category_name,
           t.technician_id,
           technician.name AS technician_name,
           t.created_at,
           t.updated_at
         FROM tickets t
         INNER JOIN users requester ON t.user_id = requester.id
         INNER JOIN categories c ON t.category_id = c.id
         LEFT JOIN users technician ON t.technician_id = technician.id
         ORDER BY t.created_at DESC`
      );

      return res.status(200).json({
        success: true,
        message: 'ดึงรายการ Ticket ทั้งหมดสำเร็จ',
        total: tickets.length,
        tickets
      });
    } catch (error) {
      console.error('Admin get tickets error:', error.message);

      return res.status(500).json({
        success: false,
        message: 'ไม่สามารถดึงรายการ Ticket ได้'
      });
    }
  }
);

// ========================================
// Categories
// ========================================

// ดูหมวดหมู่
app.get('/api/categories', verifyToken, async (req, res) => {
  try {
    const [categories] = await pool.execute(
      `SELECT id, name, description
       FROM categories
       ORDER BY id ASC`
    );

    return res.status(200).json({
      success: true,
      total: categories.length,
      categories
    });
  } catch (error) {
    console.error('Get categories error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'ไม่สามารถดึงหมวดหมู่ปัญหาได้'
    });
  }
});

// Admin เพิ่มหมวดหมู่
app.post(
  '/api/admin/categories',
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const { name, description } = req.body;

      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'กรุณาระบุชื่อหมวดหมู่'
        });
      }

      if (
        description !== undefined &&
        description !== null &&
        typeof description !== 'string'
      ) {
        return res.status(400).json({
          success: false,
          message: 'รายละเอียดหมวดหมู่ต้องเป็นข้อความ'
        });
      }

      const categoryName = name.trim();
      const categoryDescription =
        typeof description === 'string' ? description.trim() : '';

      const [existing] = await pool.execute(
        'SELECT id FROM categories WHERE name = ?',
        [categoryName]
      );

      if (existing.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'มีชื่อหมวดหมู่นี้อยู่แล้ว'
        });
      }

      const [result] = await pool.execute(
        `INSERT INTO categories (name, description)
         VALUES (?, ?)`,
        [categoryName, categoryDescription]
      );

      return res.status(201).json({
        success: true,
        message: 'เพิ่มหมวดหมู่สำเร็จ',
        category: {
          id: result.insertId,
          name: categoryName,
          description: categoryDescription
        }
      });
    } catch (error) {
      console.error('Create category error:', error.message);

      return res.status(500).json({
        success: false,
        message: 'ไม่สามารถเพิ่มหมวดหมู่ได้'
      });
    }
  }
);

// Admin แก้ไขหมวดหมู่
app.patch(
  '/api/admin/categories/:id',
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const categoryId = Number(req.params.id);
      const { name, description } = req.body;

      if (!Number.isInteger(categoryId) || categoryId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'รหัสหมวดหมู่ไม่ถูกต้อง'
        });
      }

      if (
        typeof name !== 'string' ||
        !name.trim() ||
        typeof description !== 'string'
      ) {
        return res.status(400).json({
          success: false,
          message: 'กรุณาระบุชื่อและรายละเอียดหมวดหมู่'
        });
      }

      const [categories] = await pool.execute(
        'SELECT id FROM categories WHERE id = ?',
        [categoryId]
      );

      if (categories.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบหมวดหมู่ที่ต้องการแก้ไข'
        });
      }

      const categoryName = name.trim();
      const categoryDescription = description.trim();

      const [duplicates] = await pool.execute(
        'SELECT id FROM categories WHERE name = ? AND id <> ?',
        [categoryName, categoryId]
      );

      if (duplicates.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'มีชื่อหมวดหมู่นี้อยู่แล้ว'
        });
      }

      await pool.execute(
        `UPDATE categories
         SET name = ?, description = ?
         WHERE id = ?`,
        [categoryName, categoryDescription, categoryId]
      );

      return res.status(200).json({
        success: true,
        message: 'แก้ไขหมวดหมู่สำเร็จ',
        category: {
          id: categoryId,
          name: categoryName,
          description: categoryDescription
        }
      });
    } catch (error) {
      console.error('Update category error:', error.message);

      return res.status(500).json({
        success: false,
        message: 'ไม่สามารถแก้ไขหมวดหมู่ได้'
      });
    }
  }
);

// Admin ลบหมวดหมู่
app.delete(
  '/api/admin/categories/:id',
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const categoryId = Number(req.params.id);

      if (!Number.isInteger(categoryId) || categoryId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'รหัสหมวดหมู่ไม่ถูกต้อง'
        });
      }

      const [categories] = await pool.execute(
        'SELECT id, name FROM categories WHERE id = ?',
        [categoryId]
      );

      if (categories.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบหมวดหมู่ที่ต้องการลบ'
        });
      }

      const [tickets] = await pool.execute(
        `SELECT id
         FROM tickets
         WHERE category_id = ?
         LIMIT 1`,
        [categoryId]
      );

      if (tickets.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'ไม่สามารถลบหมวดหมู่ที่มี Ticket ใช้งานอยู่ได้'
        });
      }

      await pool.execute(
        'DELETE FROM categories WHERE id = ?',
        [categoryId]
      );

      return res.status(200).json({
        success: true,
        message: 'ลบหมวดหมู่สำเร็จ',
        category: categories[0]
      });
    } catch (error) {
      console.error('Delete category error:', error.message);

      return res.status(500).json({
        success: false,
        message: 'ไม่สามารถลบหมวดหมู่ได้'
      });
    }
  }
);

// ========================================
// Tickets
// ========================================

// สร้าง Ticket
app.post('/api/tickets', verifyToken, async (req, res) => {
  try {
    const { title, description, priority, category_id } = req.body;

    if (
      typeof title !== 'string' ||
      typeof description !== 'string' ||
      !title.trim() ||
      !description.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกหัวข้อและรายละเอียดปัญหา'
      });
    }

    const allowedPriorities = ['low', 'medium', 'high', 'urgent'];
    const selectedPriority = priority || 'medium';

    if (!allowedPriorities.includes(selectedPriority)) {
      return res.status(400).json({
        success: false,
        message: 'ระดับความสำคัญไม่ถูกต้อง'
      });
    }

    const categoryId = Number(category_id);

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาเลือกหมวดหมู่ปัญหา'
      });
    }

    const [categories] = await pool.execute(
      'SELECT id FROM categories WHERE id = ?',
      [categoryId]
    );

    if (categories.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบหมวดหมู่ที่เลือก'
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO tickets
       (title, description, priority, status, user_id, category_id)
       VALUES (?, ?, ?, 'open', ?, ?)`,
      [
        title.trim(),
        description.trim(),
        selectedPriority,
        req.user.id,
        categoryId
      ]
    );
    // แจ้งเตือน Admin ว่ามี Ticket ใหม่ (ไม่กระทบการสร้าง Ticket หากล้มเหลว)
    try {
      await pool.execute(
        "INSERT INTO notifications (user_id, ticket_id, message) SELECT id, ?, ? FROM users WHERE role = 'admin'",
        [result.insertId, `มี Ticket ใหม่ #${result.insertId}: ${title.trim()}`.slice(0, 250)]
      );
      const [admins] = await pool.execute("SELECT id FROM users WHERE role = 'admin'");
      app.locals.pushTo?.(admins.map((a) => a.id));
    } catch (notifyError) {
      console.error('Notify admins error:', notifyError.message);
    }

    return res.status(201).json({
      success: true,
      message: 'สร้าง Ticket สำเร็จ',
      ticket: {
        id: result.insertId,
        title: title.trim(),
        description: description.trim(),
        priority: selectedPriority,
        status: 'open',
        user_id: req.user.id,
        category_id: categoryId
      }
    });
  } catch (error) {
    console.error('Create ticket error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'ไม่สามารถสร้าง Ticket ได้'
    });
  }
});

// ========================================
// แก้ไข Ticket - ทั้ง 3 Role
// User: แก้ Ticket ของตัวเอง
// Technician: แก้ Ticket ที่ได้รับมอบหมาย
// Admin: แก้ Ticket ได้ทุกใบ
// ========================================

app.patch('/api/tickets/:id', verifyToken, async (req, res) => {
  try {
    const ticketId = Number(req.params.id);

    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'รหัส Ticket ไม่ถูกต้อง'
      });
    }

    const { title, description, priority, category_id } = req.body;

    if (
      typeof title !== 'string' ||
      typeof description !== 'string' ||
      !title.trim() ||
      !description.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกหัวข้อและรายละเอียดปัญหาให้ครบ'
      });
    }

    if (title.trim().length > 255) {
      return res.status(400).json({
        success: false,
        message: 'หัวข้อ Ticket ต้องไม่เกิน 255 ตัวอักษร'
      });
    }

    const allowedPriorities = ['low', 'medium', 'high', 'urgent'];

    if (!allowedPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: 'ระดับความสำคัญไม่ถูกต้อง'
      });
    }

    const categoryId = Number(category_id);

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาเลือกหมวดหมู่ปัญหา'
      });
    }

    // ตรวจสอบว่า Ticket มีอยู่จริงและอ่านสิทธิ์เจ้าของ/ผู้รับผิดชอบ
    const [tickets] = await pool.execute(
      `SELECT id, user_id, technician_id
       FROM tickets
       WHERE id = ?
       LIMIT 1`,
      [ticketId]
    );

    if (tickets.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบ Ticket ที่ต้องการแก้ไข'
      });
    }

    const ticket = tickets[0];
    const role = req.user.role;
    const userId = Number(req.user.id);

    // ตรวจสอบสิทธิ์ตาม Role
    const isOwner = Number(ticket.user_id) === userId;
    const isAssignedTechnician =
      Number(ticket.technician_id) === userId;

    if (
      role !== 'admin' &&
      !(role === 'user' && isOwner) &&
      !(role === 'technician' && isAssignedTechnician)
    ) {
      return res.status(403).json({
        success: false,
        message: 'คุณไม่มีสิทธิ์แก้ไข Ticket รายการนี้'
      });
    }

    // ตรวจสอบว่าหมวดหมู่ใหม่มีอยู่จริง
    const [categories] = await pool.execute(
      'SELECT id FROM categories WHERE id = ?',
      [categoryId]
    );

    if (categories.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบหมวดหมู่ที่เลือก'
      });
    }

    // อัปเดตเฉพาะข้อมูลรายละเอียด ไม่เปลี่ยนสถานะหรือผู้รับผิดชอบ
    await pool.execute(
      `UPDATE tickets
       SET title = ?,
           description = ?,
           priority = ?,
           category_id = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        title.trim(),
        description.trim(),
        priority,
        categoryId,
        ticketId
      ]
    );

    // ดึงข้อมูลล่าสุดกลับไปแสดงผล
    const [updatedTickets] = await pool.execute(
      `SELECT
         t.id,
         t.title,
         t.description,
         t.priority,
         t.status,
         t.user_id,
         t.category_id,
         c.name AS category_name,
         t.technician_id,
         technician.name AS technician_name,
         t.created_at,
         t.updated_at
       FROM tickets t
       INNER JOIN categories c ON t.category_id = c.id
       LEFT JOIN users technician ON t.technician_id = technician.id
       WHERE t.id = ?`,
      [ticketId]
    );

    return res.status(200).json({
      success: true,
      message: 'แก้ไข Ticket สำเร็จ',
      ticket: updatedTickets[0]
    });
  } catch (error) {
    console.error('Update ticket error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'ไม่สามารถแก้ไข Ticket ได้'
    });
  }
});

// ผู้ใช้ดู Ticket ของตัวเอง
app.get('/api/tickets/my', verifyToken, async (req, res) => {
  try {
    const [tickets] = await pool.execute(
      `SELECT
         t.id,
         t.title,
         t.description,
         t.priority,
         t.status,
         t.user_id,
         t.category_id,
         c.name AS category_name,
         t.technician_id,
         technician.name AS technician_name,
         t.created_at,
         t.updated_at
       FROM tickets t
       INNER JOIN categories c ON t.category_id = c.id
       LEFT JOIN users technician ON t.technician_id = technician.id
       WHERE t.user_id = ?
       ORDER BY t.created_at DESC`,
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      total: tickets.length,
      tickets
    });
  } catch (error) {
    console.error('Get my tickets error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'ไม่สามารถดึงรายการ Ticket ได้'
    });
  }
});

// Technician ดูเฉพาะ Ticket ที่ได้รับมอบหมาย
app.get(
  '/api/technician/tickets',
  verifyToken,
  verifyTechnician,
  async (req, res) => {
    try {
      const [tickets] = await pool.execute(
        `SELECT
           t.id,
           t.title,
           t.description,
           t.priority,
           t.status,
           t.user_id,
           requester.name AS requester_name,
           requester.email AS requester_email,
           t.category_id,
           c.name AS category_name,
           t.technician_id,
           technician.name AS technician_name,
           t.created_at,
           t.updated_at
         FROM tickets t
         INNER JOIN users requester ON t.user_id = requester.id
         INNER JOIN categories c ON t.category_id = c.id
         LEFT JOIN users technician ON t.technician_id = technician.id
         WHERE t.technician_id = ?
         ORDER BY t.created_at DESC`,
        [req.user.id]
      );

      return res.status(200).json({
        success: true,
        message: 'ดึงรายการ Ticket ที่ได้รับมอบหมายสำเร็จ',
        total: tickets.length,
        tickets
      });
    } catch (error) {
      console.error('Technician get tickets error:', error.message);

      return res.status(500).json({
        success: false,
        message: 'ไม่สามารถดึงรายการ Ticket ได้'
      });
    }
  }
);

// ========================================
// API Not Found
// ========================================

app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'ไม่พบ API ที่ร้องขอ'
  });
});

// ========================================
// Start Server
// ========================================

async function startServer() {
  try {
    await testConnection();

    app.listen(PORT, () => {
      console.log(
        `NEXUS IT Helpdesk running at http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error('ไม่สามารถเริ่มเซิร์ฟเวอร์ได้:', error.message);
    process.exit(1);
  }
}

startServer();

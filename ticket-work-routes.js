module.exports = function registerTicketWorkRoutes(
  app,
  pool,
  verifyToken,
  verifyAdmin,
  verifyTechnician
) {
  // Admin มอบหมาย Ticket ให้ Technician
  app.patch(
    '/api/admin/tickets/:id/assign',
    verifyToken,
    verifyAdmin,
    async (req, res) => {
      let connection;

      try {
        const ticketId = Number(req.params.id);
        const technicianId = Number(req.body.technician_id);

        if (
          !Number.isInteger(ticketId) ||
          ticketId <= 0 ||
          !Number.isInteger(technicianId) ||
          technicianId <= 0
        ) {
          return res.status(400).json({
            success: false,
            message: 'กรุณาระบุรหัส Ticket และ Technician ให้ถูกต้อง'
          });
        }

        const [technicians] = await pool.execute(
          'SELECT id, name FROM users WHERE id = ? AND role = ?',
          [technicianId, 'technician']
        );

        if (technicians.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'ไม่พบผู้ใช้ที่มีบทบาท Technician ตามรหัสนี้'
          });
        }

        const [tickets] = await pool.execute(
          'SELECT id, status, user_id FROM tickets WHERE id = ?',
          [ticketId]
        );

        if (tickets.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'ไม่พบ Ticket ที่ต้องการมอบหมาย'
          });
        }

        const oldStatus = tickets[0].status;
        const newStatus = 'assigned';

        connection = await pool.getConnection();
        await connection.beginTransaction();

        await connection.execute(
          `UPDATE tickets
           SET technician_id = ?, status = ?
           WHERE id = ?`,
          [technicianId, newStatus, ticketId]
        );

        await connection.execute(
          `INSERT INTO ticket_history
           (ticket_id, changed_by, old_status, new_status, note)
           VALUES (?, ?, ?, ?, ?)`,
          [
            ticketId,
            req.user.id,
            oldStatus,
            newStatus,
            `มอบหมายงานให้ Technician ID ${technicianId}`
          ]
        );

        await connection.commit();

        try {
          await pool.execute(
            'INSERT INTO notifications (user_id, ticket_id, message) VALUES (?, ?, ?), (?, ?, ?)',
            [
              technicianId, ticketId, `คุณได้รับมอบหมาย Ticket #${ticketId}`,
              tickets[0].user_id, ticketId, `Ticket #${ticketId} ของคุณมอบหมายให้ ${technicians[0].name} แล้ว`
            ]
          );
        } catch (notifyError) {
          console.error('Notify assign error:', notifyError.message);
        }

        return res.status(200).json({
          success: true,
          message: 'มอบหมายงานสำเร็จ',
          ticket: {
            id: ticketId,
            technician_id: technicianId,
            technician_name: technicians[0].name,
            old_status: oldStatus,
            status: newStatus
          }
        });
      } catch (error) {
        if (connection) await connection.rollback();

        console.error('Assign ticket error:', error.message);

        return res.status(500).json({
          success: false,
          message: 'ไม่สามารถมอบหมายงานได้'
        });
      } finally {
        if (connection) connection.release();
      }
    }
  );

  // Technician เปลี่ยนสถานะ Ticket ที่ได้รับมอบหมาย
  app.patch(
    '/api/technician/tickets/:id/status',
    verifyToken,
    verifyTechnician,
    async (req, res) => {
      let connection;

      try {
        const ticketId = Number(req.params.id);
        const { status, note } = req.body;

        if (!Number.isInteger(ticketId) || ticketId <= 0) {
          return res.status(400).json({
            success: false,
            message: 'รหัส Ticket ไม่ถูกต้อง'
          });
        }

        const allowedStatuses = [
          'assigned',
          'in_progress',
          'resolved'
        ];

        if (!allowedStatuses.includes(status)) {
          return res.status(400).json({
            success: false,
            message: 'สถานะต้องเป็น assigned, in_progress หรือ resolved'
          });
        }

        if (note !== undefined && typeof note !== 'string') {
          return res.status(400).json({
            success: false,
            message: 'หมายเหตุต้องเป็นข้อความ'
          });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [tickets] = await connection.execute(
          `SELECT id, status, user_id
           FROM tickets
           WHERE id = ? AND technician_id = ?
           FOR UPDATE`,
          [ticketId, req.user.id]
        );

        if (tickets.length === 0) {
          await connection.rollback();

          return res.status(404).json({
            success: false,
            message: 'ไม่พบ Ticket หรือ Ticket นี้ไม่ได้มอบหมายให้คุณ'
          });
        }

        const oldStatus = tickets[0].status;

        if (oldStatus === status) {
          await connection.rollback();

          return res.status(400).json({
            success: false,
            message: 'Ticket นี้มีสถานะดังกล่าวอยู่แล้ว'
          });
        }

        await connection.execute(
          `UPDATE tickets
           SET status = ?
           WHERE id = ? AND technician_id = ?`,
          [status, ticketId, req.user.id]
        );

        await connection.execute(
          `INSERT INTO ticket_history
           (ticket_id, changed_by, old_status, new_status, note)
           VALUES (?, ?, ?, ?, ?)`,
          [
            ticketId,
            req.user.id,
            oldStatus,
            status,
            typeof note === 'string' ? note.trim() : null
          ]
        );

        await connection.commit();

        try {
          const labels = { assigned: 'มอบหมายแล้ว', in_progress: 'กำลังดำเนินการ', resolved: 'แก้ไขแล้ว' };
          await pool.execute(
            'INSERT INTO notifications (user_id, ticket_id, message) VALUES (?, ?, ?)',
            [tickets[0].user_id, ticketId, `Ticket #${ticketId} เปลี่ยนสถานะเป็น ${labels[status]}`]
          );
        } catch (notifyError) {
          console.error('Notify status error:', notifyError.message);
        }

        return res.status(200).json({
          success: true,
          message: 'อัปเดตสถานะ Ticket สำเร็จ',
          ticket: {
            id: ticketId,
            old_status: oldStatus,
            status
          }
        });
      } catch (error) {
        if (connection) await connection.rollback();

        console.error('Update ticket status error:', error.message);

        return res.status(500).json({
          success: false,
          message: 'ไม่สามารถอัปเดตสถานะ Ticket ได้'
        });
      } finally {
        if (connection) connection.release();
      }
    }
  );

  // ดูประวัติ Ticket
  app.get(
    '/api/tickets/:id/history',
    verifyToken,
    async (req, res) => {
      try {
        const ticketId = Number(req.params.id);

        if (!Number.isInteger(ticketId) || ticketId <= 0) {
          return res.status(400).json({
            success: false,
            message: 'รหัส Ticket ไม่ถูกต้อง'
          });
        }

        const [tickets] = await pool.execute(
          `SELECT id, user_id, technician_id
           FROM tickets
           WHERE id = ?`,
          [ticketId]
        );

        if (tickets.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'ไม่พบ Ticket นี้'
          });
        }

        const ticket = tickets[0];

        const allowed =
          req.user.role === 'admin' ||
          Number(ticket.user_id) === Number(req.user.id) ||
          (
            req.user.role === 'technician' &&
            Number(ticket.technician_id) === Number(req.user.id)
          );

        if (!allowed) {
          return res.status(403).json({
            success: false,
            message: 'คุณไม่มีสิทธิ์ดูประวัติ Ticket นี้'
          });
        }

        const [history] = await pool.execute(
          `SELECT
             h.id,
             h.ticket_id,
             h.changed_by,
             u.name AS changed_by_name,
             h.old_status,
             h.new_status,
             h.note,
             h.created_at
           FROM ticket_history h
           LEFT JOIN users u ON h.changed_by = u.id
           WHERE h.ticket_id = ?
           ORDER BY h.created_at DESC, h.id DESC`,
          [ticketId]
        );

        return res.status(200).json({
          success: true,
          ticket_id: ticketId,
          total: history.length,
          history
        });
      } catch (error) {
        console.error('Get ticket history error:', error.message);

        return res.status(500).json({
          success: false,
          message: 'ไม่สามารถดึงประวัติ Ticket ได้'
        });
      }
    }
  );
  
  // ลูกค้าส่งรีวิวให้ Technician
  app.post(
    '/api/tickets/:id/review',
    verifyToken,
    async (req, res) => {
      try {
        const ticketId = Number(req.params.id);
        const rating = Number(req.body.rating);
        const comment = req.body.comment ?? '';

        if (!Number.isInteger(ticketId) || ticketId <= 0) {
          return res.status(400).json({
            success: false,
            message: 'รหัส Ticket ไม่ถูกต้อง'
          });
        }

        if (
          !Number.isInteger(rating) ||
          rating < 1 ||
          rating > 5
        ) {
          return res.status(400).json({
            success: false,
            message: 'คะแนนต้องอยู่ระหว่าง 1–5 ดาว'
          });
        }

        if (
          typeof comment !== 'string' ||
          comment.length > 2000
        ) {
          return res.status(400).json({
            success: false,
            message: 'ความคิดเห็นต้องเป็นข้อความและไม่เกิน 2000 ตัวอักษร'
          });
        }

        // ตรวจสอบว่า Ticket เป็นของผู้ใช้และมีช่างรับผิดชอบ
        const [tickets] = await pool.execute(
          `SELECT id, user_id, technician_id, status
           FROM tickets
           WHERE id = ?`,
          [ticketId]
        );

        if (tickets.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'ไม่พบ Ticket นี้'
          });
        }

        const ticket = tickets[0];

        if (Number(ticket.user_id) !== Number(req.user.id)) {
          return res.status(403).json({
            success: false,
            message: 'คุณไม่มีสิทธิ์รีวิว Ticket นี้'
          });
        }

        if (!ticket.technician_id) {
          return res.status(400).json({
            success: false,
            message: 'Ticket นี้ยังไม่มีช่างรับผิดชอบ'
          });
        }

        if (ticket.status !== 'resolved') {
          return res.status(400).json({
            success: false,
            message: 'รีวิวได้เมื่อช่างดำเนินการเสร็จแล้วเท่านั้น'
          });
        }

        // ตรวจสอบว่าเคยรีวิว Ticket นี้แล้วหรือไม่
        const [existingReviews] = await pool.execute(
          `SELECT id
           FROM reviews
           WHERE ticket_id = ?
           LIMIT 1`,
          [ticketId]
        );

        if (existingReviews.length > 0) {
          return res.status(409).json({
            success: false,
            message: 'Ticket นี้ได้รับการรีวิวแล้ว'
          });
        }

        // บันทึกรีวิว
        await pool.execute(
          `INSERT INTO reviews
           (ticket_id, user_id, technician_id, rating, comment)
           VALUES (?, ?, ?, ?, ?)`,
          [
            ticketId,
            req.user.id,
            ticket.technician_id,
            rating,
            comment.trim() || null
          ]
        );

        return res.status(201).json({
          success: true,
          message: 'ส่งรีวิวช่างสำเร็จ'
        });
      } catch (error) {
        // ป้องกันกรณีส่งรีวิวซ้ำพร้อมกัน
        if (error.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({
            success: false,
            message: 'Ticket นี้ได้รับการรีวิวแล้ว'
          });
        }

        console.error('Submit review error:', error.message);

        return res.status(500).json({
          success: false,
          message: 'ไม่สามารถบันทึกรีวิวได้'
        });
      }
    }
  );
  
  // ดึงคะแนนเฉลี่ยและจำนวนรีวิวของ Technician
  app.get(
    '/api/technicians/ratings',
    verifyToken,
    async (req, res) => {
      try {
        const [ratings] = await pool.execute(
          `SELECT
             u.id AS technician_id,
             u.name AS technician_name,
             ROUND(AVG(r.rating), 1) AS average_rating,
             COUNT(r.id) AS review_count
           FROM users u
           LEFT JOIN reviews r
             ON r.technician_id = u.id
           WHERE u.role = ?
           GROUP BY u.id, u.name
           ORDER BY u.name`,
          ['technician']
        );

        return res.status(200).json({
          success: true,
          ratings
        });
      } catch (error) {
        console.error('Get technician ratings error:', error.message);

        return res.status(500).json({
          success: false,
          message: 'ไม่สามารถดึงคะแนนช่างได้'
        });
      }
    }
  );
};

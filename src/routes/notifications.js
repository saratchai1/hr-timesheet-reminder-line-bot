// ============================================================================
// Routes — Notifications API
// ============================================================================

const express = require('express');
const router = express.Router();

const {
  sendReminderToEmployee,
  sendReminderToAll,
  getNotificationHistory,
} = require('../notification-service');

// ── POST /api/notifications/send/:employeeId ───────────────────────────────
// Send a timesheet reminder to a single employee.

router.post('/send/:employeeId', async (req, res) => {
  try {
    const employeeId = parseInt(req.params.employeeId);
    if (isNaN(employeeId)) {
      return res.status(400).json({ success: false, error: 'Invalid employee ID' });
    }

    const year = req.query.year ? parseInt(req.query.year) : undefined;
    const month = req.query.month ? parseInt(req.query.month) : undefined;

    const result = await sendReminderToEmployee(employeeId, year, month);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        data: { employee: result.employee },
      });
    }

    res.json({
      success: true,
      data: {
        message: `ส่งแจ้งเตือนไปยัง ${result.employee} เรียบร้อยแล้ว`,
        status: result.status,
        employee: result.employee,
        department: result.department,
      },
    });
  } catch (error) {
    console.error('[Notifications] Error sending to employee:', error.message);
    res.status(500).json({ success: false, error: 'ไม่สามารถส่งแจ้งเตือนได้' });
  }
});

// ── POST /api/notifications/send-all ────────────────────────────────────────
// Send reminders to ALL employees with incomplete timesheets.

router.post('/send-all', async (req, res) => {
  try {
    const summary = await sendReminderToAll();

    res.json({
      success: true,
      data: {
        message: `ส่งแจ้งเตือนทั้งหมดเสร็จสิ้น`,
        summary: {
          total: summary.total,
          sent: summary.sent,
          failed: summary.failed,
          noLineId: summary.noLineId,
        },
        details: summary.details,
      },
    });
  } catch (error) {
    console.error('[Notifications] Error sending to all:', error.message);
    res.status(500).json({ success: false, error: 'ไม่สามารถส่งแจ้งเตือนทั้งหมดได้' });
  }
});

// ── GET /api/notifications/logs ─────────────────────────────────────────────
// Get notification history (default limit: 50).

router.get('/logs', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const logs = await getNotificationHistory(limit);

    res.json({
      success: true,
      data: {
        total: logs.length,
        logs,
      },
    });
  } catch (error) {
    console.error('[Notifications] Error getting logs:', error.message);
    res.status(500).json({ success: false, error: 'ไม่สามารถดึงประวัติการแจ้งเตือนได้' });
  }
});

module.exports = router;

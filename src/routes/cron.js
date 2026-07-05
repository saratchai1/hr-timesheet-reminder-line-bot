// ============================================================================
// Routes — Cron Jobs via GitHub Actions
// ============================================================================

const express = require('express');
const router = express.Router();
const { sendReminderToAll } = require('../notification-service');

// ── POST /api/cron/notify-timesheet ─────────────────────────────────────────

router.post('/notify-timesheet', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const expectedSecret = process.env.CRON_SECRET;

    // Security check: require a secret token
    if (!expectedSecret) {
      console.warn('[CRON] CRON_SECRET ไม่ได้ถูกตั้งค่าใน .env ทำให้ Endpoint นี้อาจถูกเรียกโดยใครก็ได้');
    }

    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      console.warn('[CRON] การเรียกใช้งานถูกปฏิเสธ (Unauthorized)');
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Call the service to send reminders to everyone with incomplete timesheets
    const summary = await sendReminderToAll();

    res.json({
      success: true,
      message: 'รันระบบแจ้งเตือนสำเร็จ',
      data: summary,
    });
  } catch (error) {
    console.error('[CRON] เกิดข้อผิดพลาดในการรันแจ้งเตือน:', error.message);
    res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
});

module.exports = router;

// ============================================================================
// Routes — LINE Webhook Handler
// ============================================================================

const express = require('express');
const line = require('@line/bot-sdk');
const router = express.Router();

const {
  getEmployeeByLineUserId,
  updateEmployeeLineInfo,
  getTimesheetStatus,
} = require('../database');

const {
  sendWelcomeMessage,
  sendTextMessage,
  THAI_MONTHS,
  toBuddhistYear,
} = require('../line-client');

const DEMO_MODE = process.env.DEMO_MODE === 'true';

// ── LINE Middleware Configuration ───────────────────────────────────────────

const lineConfig = {
  channelSecret: process.env.LINE_CHANNEL_SECRET || 'demo-secret',
};

// In demo mode, skip LINE signature validation and parse body as JSON.
// In production, use the LINE middleware for signature verification.
if (DEMO_MODE) {
  router.use(express.json());
} else {
  router.use(line.middleware(lineConfig));
}

// ── POST /webhook ───────────────────────────────────────────────────────────
// Receive and handle LINE webhook events.

router.post('/', async (req, res) => {
  try {
    const events = req.body.events || [];

    if (events.length === 0) {
      // LINE sends a verification request with no events
      return res.status(200).json({ success: true, data: { message: 'Webhook verified' } });
    }

    console.log(`\x1b[33m[WEBHOOK]\x1b[0m 📩 ได้รับ ${events.length} event(s)`);

    // Process all events concurrently
    const results = await Promise.allSettled(
      events.map((event) => handleEvent(event))
    );

    // Log any errors
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`\x1b[31m[WEBHOOK]\x1b[0m ✘ Event ${index} ล้มเหลว:`, result.reason);
      }
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[WEBHOOK] Error processing webhook:', error.message);
    res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการประมวลผล Webhook' });
  }
});

// ── Event Handler ───────────────────────────────────────────────────────────

/**
 * Route a single LINE event to the appropriate handler.
 *
 * @param {object} event - LINE webhook event
 */
async function handleEvent(event) {
  const userId = event.source?.userId;

  switch (event.type) {
    case 'follow':
      return await handleFollowEvent(event, userId);

    case 'message':
      return await handleMessageEvent(event, userId);

    case 'unfollow':
      console.log(`\x1b[33m[WEBHOOK]\x1b[0m 👋 ผู้ใช้ยกเลิกการติดตาม: ${userId}`);
      return;

    default:
      console.log(`\x1b[33m[WEBHOOK]\x1b[0m ℹ️  Event ที่ไม่ได้จัดการ: ${event.type}`);
      return;
  }
}

// ── Follow Event (User Adds Bot as Friend) ──────────────────────────────────

/**
 * Handle the 'follow' event — when a user adds the bot as a friend.
 * Captures the user's LINE ID and sends a welcome message.
 */
async function handleFollowEvent(event, userId) {
  console.log(`\x1b[32m[WEBHOOK]\x1b[0m 🎉 ผู้ใช้ใหม่เพิ่มเพื่อน: ${userId}`);

  // Try to get the user's display name (in demo mode, use a placeholder)
  let displayName = 'ผู้ใช้';

  if (!DEMO_MODE) {
    try {
      const { messagingApi } = require('@line/bot-sdk');
      const api = new messagingApi.MessagingApiClient({
        channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
      });
      const profile = await api.getProfile(userId);
      displayName = profile.displayName || 'ผู้ใช้';
    } catch (err) {
      console.warn('[WEBHOOK] ไม่สามารถดึงโปรไฟล์ผู้ใช้:', err.message);
    }
  }

  // Check if this LINE user is already linked to an employee
  const employee = await getEmployeeByLineUserId(userId);
  if (employee) {
    displayName = `${employee.first_name} ${employee.last_name}`;
    console.log(`\x1b[32m[WEBHOOK]\x1b[0m   └─ พบพนักงาน: ${displayName} (${employee.employee_code})`);
  }

  // Send welcome message
  try {
    if (DEMO_MODE) {
      await sendWelcomeMessage(userId, displayName);
    } else {
      // In production, use replyToken for immediate response
      await sendWelcomeMessage(event.replyToken, displayName);
    }
  } catch (err) {
    console.error('[WEBHOOK] ไม่สามารถส่งข้อความต้อนรับ:', err.message);
  }
}

// ── Message Event ───────────────────────────────────────────────────────────

/**
 * Handle the 'message' event — when a user sends a text message.
 * Responds with help information or timesheet status.
 */
async function handleMessageEvent(event, userId) {
  // Only handle text messages
  if (event.message?.type !== 'text') return;

  const text = event.message.text.trim().toLowerCase();

  console.log(`\x1b[33m[WEBHOOK]\x1b[0m 💬 ข้อความจาก ${userId}: "${event.message.text}"`);

  // Look up employee by LINE user ID
  const employee = await getEmployeeByLineUserId(userId);

  // ── Command routing ──
  if (text === 'help' || text === 'ช่วยเหลือ' || text === 'คำสั่ง') {
    return await sendHelpMessage(userId);
  }

  if (text === 'สถานะ' || text === 'status' || text === 'timesheet') {
    return await sendStatusMessage(userId, employee);
  }

  // Default response
  return await sendTextMessage(
    userId,
    '🤖 สวัสดีค่ะ! พิมพ์ "ช่วยเหลือ" เพื่อดูคำสั่งทั้งหมด หรือ "สถานะ" เพื่อตรวจสอบ Timesheet ค่ะ'
  );
}

// ── Helper Response Functions ───────────────────────────────────────────────

/**
 * Send a help/command guide message.
 */
async function sendHelpMessage(userId) {
  const helpText = [
    '📋 คำสั่งที่ใช้ได้:',
    '',
    '💡 "สถานะ" หรือ "status"',
    '   → ตรวจสอบสถานะ Timesheet ของคุณ',
    '',
    '💡 "ช่วยเหลือ" หรือ "help"',
    '   → แสดงคำสั่งทั้งหมด',
    '',
    '📌 ระบบจะแจ้งเตือนอัตโนมัติ',
    '   ช่วงวันที่ 25-31 ของทุกเดือนค่ะ',
  ].join('\n');

  return await sendTextMessage(userId, helpText);
}

/**
 * Send the employee's current timesheet status.
 */
async function sendStatusMessage(userId, employee) {
  if (!employee) {
    return await sendTextMessage(
      userId,
      '⚠️ ไม่พบข้อมูลของคุณในระบบค่ะ\nกรุณาติดต่อฝ่าย HR เพื่อลงทะเบียน LINE ID ของคุณ'
    );
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const thaiMonth = THAI_MONTHS[month];
  const buddhistYear = toBuddhistYear(year);

  // Get this employee's timesheet status
  const allStatuses = await getTimesheetStatus(year, month);
  const myStatus = allStatuses.find((ts) => ts.employee_id === employee.id || ts.employee_id === employee.employee_id);

  let statusEmoji, statusText;

  if (!myStatus) {
    statusEmoji = '❓';
    statusText = 'ไม่มีข้อมูล';
  } else {
    switch (myStatus.status) {
      case 'completed':
        statusEmoji = '✅';
        statusText = `เสร็จสมบูรณ์ (${myStatus.days_filled}/${myStatus.total_days} วัน)`;
        break;
      case 'in_progress':
        statusEmoji = '🔄';
        statusText = `กำลังดำเนินการ (${myStatus.days_filled}/${myStatus.total_days} วัน)`;
        break;
      case 'not_started':
        statusEmoji = '❌';
        statusText = `ยังไม่เริ่มกรอก`;
        break;
      default:
        statusEmoji = '❓';
        statusText = 'ไม่ทราบสถานะ';
    }
  }

  const message = [
    `📊 สถานะ Timesheet`,
    `━━━━━━━━━━━━━━━━`,
    `👤 ${employee.first_name} ${employee.last_name}`,
    `🏢 แผนก: ${employee.department}`,
    `📅 เดือน: ${thaiMonth} ${buddhistYear}`,
    `${statusEmoji} สถานะ: ${statusText}`,
  ].join('\n');

  return await sendTextMessage(userId, message);
}

module.exports = router;

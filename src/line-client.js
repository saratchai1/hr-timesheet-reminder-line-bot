// ============================================================================
// LINE Messaging Client — Flex Message Builder & Sender
// ============================================================================

const line = require('@line/bot-sdk');

const DEMO_MODE = process.env.DEMO_MODE === 'true';
const TIMESHEET_URL = process.env.TIMESHEET_URL || 'https://your-company.com/timesheet';

// ── Client Initialization ───────────────────────────────────────────────────

let client = null;

/**
 * Get or create the LINE MessagingApiClient singleton.
 * In demo mode the client is still created but messages are logged instead of sent.
 */
function getClient() {
  if (!client) {
    client = new line.messagingApi.MessagingApiClient({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || 'demo-token',
    });
  }
  return client;
}

// ── Thai Month Names ────────────────────────────────────────────────────────

const THAI_MONTHS = [
  '', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

/**
 * Convert Buddhist Era year (พ.ศ.) — add 543 to CE year.
 */
function toBuddhistYear(ceYear) {
  return ceYear + 543;
}

// ── Flex Message Builders ───────────────────────────────────────────────────

/**
 * Build a beautiful Flex Message for the timesheet reminder.
 *
 * @param {string} employeeName - Full display name of the employee
 * @param {string} department   - Department name
 * @param {number} month        - Month number (1-12)
 * @param {number} year         - CE year
 * @param {string} timesheetUrl - URL to the timesheet form
 * @returns {object} LINE Flex Message object
 */
function buildTimesheetReminderFlex(employeeName, department, month, year, timesheetUrl) {
  const thaiMonth = THAI_MONTHS[month] || `เดือน ${month}`;
  const buddhistYear = toBuddhistYear(year);
  const url = timesheetUrl || TIMESHEET_URL;

  return {
    type: 'flex',
    altText: `⏰ แจ้งเตือน Timesheet เดือน${thaiMonth} ${buddhistYear}`,
    contents: {
      type: 'bubble',
      size: 'giga',
      // ── Header: Purple/Blue gradient with icon ──
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: '⏰',
                size: 'xxl',
                flex: 0,
              },
              {
                type: 'text',
                text: 'แจ้งเตือน Timesheet',
                color: '#FFFFFF',
                size: 'xl',
                weight: 'bold',
                flex: 1,
                margin: 'md',
                gravity: 'center',
              },
            ],
            alignItems: 'center',
          },
          {
            type: 'text',
            text: 'HR Timesheet Reminder Bot',
            color: '#FFFFFFAA',
            size: 'xs',
            margin: 'sm',
          },
        ],
        backgroundColor: '#6C5CE7',
        paddingAll: '20px',
      },
      // ── Body: Greeting, info box, message ──
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          // Greeting
          {
            type: 'text',
            text: `สวัสดีคุณ${employeeName} 👋`,
            weight: 'bold',
            size: 'lg',
            color: '#2d3436',
            margin: 'none',
          },
          // Separator
          {
            type: 'separator',
            margin: 'lg',
            color: '#E0E0E0',
          },
          // Info box
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              // Department row
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: '🏢 แผนก',
                    size: 'sm',
                    color: '#636e72',
                    flex: 3,
                  },
                  {
                    type: 'text',
                    text: department,
                    size: 'sm',
                    color: '#2d3436',
                    weight: 'bold',
                    flex: 5,
                    align: 'end',
                  },
                ],
              },
              // Month/Year row
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: '📅 เดือน/ปี',
                    size: 'sm',
                    color: '#636e72',
                    flex: 3,
                  },
                  {
                    type: 'text',
                    text: `${thaiMonth} ${buddhistYear}`,
                    size: 'sm',
                    color: '#2d3436',
                    weight: 'bold',
                    flex: 5,
                    align: 'end',
                  },
                ],
                margin: 'md',
              },
              // Status row
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: '📊 สถานะ',
                    size: 'sm',
                    color: '#636e72',
                    flex: 3,
                  },
                  {
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                      {
                        type: 'text',
                        text: '⚠️ ยังไม่เสร็จสมบูรณ์',
                        size: 'sm',
                        color: '#d63031',
                        weight: 'bold',
                        align: 'end',
                      },
                    ],
                    flex: 5,
                  },
                ],
                margin: 'md',
              },
            ],
            backgroundColor: '#F8F9FA',
            cornerRadius: '12px',
            paddingAll: '16px',
            margin: 'lg',
          },
          // Reminder message
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '📌 กรุณากรอก Timesheet ให้เรียบร้อยภายในสิ้นเดือนนี้ค่ะ',
                size: 'sm',
                color: '#0984e3',
                wrap: true,
                weight: 'bold',
              },
            ],
            backgroundColor: '#EBF5FB',
            cornerRadius: '8px',
            paddingAll: '12px',
            margin: 'lg',
          },
        ],
        paddingAll: '20px',
      },
      // ── Footer: Green action button ──
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: '📝 กรอก Timesheet เลย',
              uri: url,
            },
            style: 'primary',
            color: '#00b894',
            height: 'md',
          },
        ],
        paddingAll: '16px',
      },
      styles: {
        header: {
          separator: false,
        },
        footer: {
          separator: true,
        },
      },
    },
  };
}

/**
 * Build a welcome Flex Message for new LINE friends.
 */
function buildWelcomeFlex(displayName) {
  return {
    type: 'flex',
    altText: `ยินดีต้อนรับสู่ HR Timesheet Reminder Bot 🎉`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🎉 ยินดีต้อนรับ!',
            color: '#FFFFFF',
            size: 'xl',
            weight: 'bold',
          },
          {
            type: 'text',
            text: 'HR Timesheet Reminder Bot',
            color: '#FFFFFFAA',
            size: 'xs',
            margin: 'sm',
          },
        ],
        backgroundColor: '#6C5CE7',
        paddingAll: '20px',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: `สวัสดีคุณ${displayName || 'ผู้ใช้'} 👋`,
            weight: 'bold',
            size: 'lg',
            color: '#2d3436',
          },
          {
            type: 'separator',
            margin: 'lg',
          },
          {
            type: 'text',
            text: 'ระบบนี้จะช่วยเตือนคุณเรื่องการกรอก Timesheet ประจำเดือน เพื่อให้ไม่พลาดกำหนดส่ง',
            wrap: true,
            size: 'sm',
            color: '#636e72',
            margin: 'lg',
            lineSpacing: '6px',
          },
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '📌 ฟีเจอร์หลัก:',
                size: 'sm',
                weight: 'bold',
                color: '#2d3436',
              },
              {
                type: 'text',
                text: '• แจ้งเตือน Timesheet อัตโนมัติ',
                size: 'sm',
                color: '#636e72',
                margin: 'sm',
              },
              {
                type: 'text',
                text: '• ตรวจสอบสถานะการกรอกได้ทันที',
                size: 'sm',
                color: '#636e72',
                margin: 'sm',
              },
              {
                type: 'text',
                text: '• ลิงก์กรอก Timesheet สะดวกรวดเร็ว',
                size: 'sm',
                color: '#636e72',
                margin: 'sm',
              },
            ],
            backgroundColor: '#F8F9FA',
            cornerRadius: '12px',
            paddingAll: '16px',
            margin: 'lg',
          },
          {
            type: 'text',
            text: 'พิมพ์ "help" หรือ "ช่วยเหลือ" เพื่อดูคำสั่งทั้งหมดค่ะ 😊',
            wrap: true,
            size: 'xs',
            color: '#0984e3',
            margin: 'lg',
          },
        ],
        paddingAll: '20px',
      },
    },
  };
}

// ── Message Sending Functions ───────────────────────────────────────────────

/**
 * Send a timesheet reminder to a specific user via LINE.
 *
 * @param {string} userId       - LINE user ID
 * @param {string} employeeName - Employee display name
 * @param {string} department   - Department name
 * @param {number} month        - Month (1-12)
 * @param {number} year         - CE year
 */
async function sendTimesheetReminder(userId, employeeName, department, month, year) {
  const flexMessage = buildTimesheetReminderFlex(employeeName, department, month, year, TIMESHEET_URL);

  if (DEMO_MODE) {
    console.log('\x1b[35m[DEMO]\x1b[0m 📨 ส่งแจ้งเตือน Timesheet ไปยัง:', employeeName);
    console.log('\x1b[35m[DEMO]\x1b[0m   └─ userId:', userId);
    console.log('\x1b[35m[DEMO]\x1b[0m   └─ แผนก:', department);
    console.log('\x1b[35m[DEMO]\x1b[0m   └─ เดือน:', `${THAI_MONTHS[month]} ${toBuddhistYear(year)}`);
    return { success: true, demo: true };
  }

  const api = getClient();
  await api.pushMessage({
    to: userId,
    messages: [flexMessage],
  });
  return { success: true, demo: false };
}

/**
 * Send a plain text message to a LINE user.
 */
async function sendTextMessage(userId, text) {
  if (DEMO_MODE) {
    console.log('\x1b[35m[DEMO]\x1b[0m 💬 ส่งข้อความไปยัง userId:', userId);
    console.log('\x1b[35m[DEMO]\x1b[0m   └─ ข้อความ:', text);
    return { success: true, demo: true };
  }

  const api = getClient();
  await api.pushMessage({
    to: userId,
    messages: [{ type: 'text', text }],
  });
  return { success: true, demo: false };
}

/**
 * Send a welcome Flex Message when a user adds the bot as a friend.
 */
async function sendWelcomeMessage(userId, displayName) {
  const flexMessage = buildWelcomeFlex(displayName);

  if (DEMO_MODE) {
    console.log('\x1b[35m[DEMO]\x1b[0m 🎉 ส่งข้อความต้อนรับไปยัง:', displayName || userId);
    return { success: true, demo: true };
  }

  const api = getClient();
  await api.replyMessage({
    replyToken: userId, // Note: in real use, pass the replyToken instead
    messages: [flexMessage],
  });
  return { success: true, demo: false };
}

// ── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  getClient,
  buildTimesheetReminderFlex,
  buildWelcomeFlex,
  sendTimesheetReminder,
  sendTextMessage,
  sendWelcomeMessage,
  THAI_MONTHS,
  toBuddhistYear,
};

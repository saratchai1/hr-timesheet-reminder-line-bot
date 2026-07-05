// ============================================================================
// Notification Service — Orchestrates sending LINE reminders
// ============================================================================

const {
  getIncompleteTimesheets,
  getEmployeeById,
  addNotificationLog,
  getNotificationLogs,
} = require('./database');

const {
  sendTimesheetReminder,
  THAI_MONTHS,
} = require('./line-client');

/**
 * Get all employees who have not yet completed their timesheet for the given month.
 *
 * @param {number} year  - CE year
 * @param {number} month - Month (1-12)
 * @returns {Array} List of employees with incomplete timesheets
 */
async function getIncompleteEmployees(year, month) {
  return await getIncompleteTimesheets(year, month);
}

/**
 * Send a LINE timesheet reminder to a single employee.
 * Logs the result to the notification_logs table.
 *
 * @param {number} employeeId - Employee ID
 * @returns {object} Result with status information
 */
async function sendReminderToEmployee(employeeId, targetYear, targetMonth) {
  const employee = await getEmployeeById(employeeId);

  if (!employee) {
    return { success: false, error: 'ไม่พบข้อมูลพนักงาน' };
  }

  if (!employee.line_user_id) {
    await addNotificationLog(
      employeeId,
      'timesheet_reminder',
      `แจ้งเตือน Timesheet — ${employee.first_name} ${employee.last_name}`,
      'failed',
      'ไม่มี LINE User ID'
    );
    return {
      success: false,
      error: 'พนักงานไม่มี LINE User ID',
      employee: `${employee.first_name} ${employee.last_name}`,
    };
  }

  const now = new Date();
  const year = targetYear || now.getFullYear();
  const month = targetMonth || (now.getMonth() + 1);
  const employeeName = `${employee.first_name} ${employee.last_name}`;

  try {
    const result = await sendTimesheetReminder(
      employee.line_user_id,
      employeeName,
      employee.department,
      month,
      year
    );

    const status = result.demo ? 'demo' : 'sent';
    const thaiMonth = THAI_MONTHS[month] || `เดือน ${month}`;

    await addNotificationLog(
      employeeId,
      'timesheet_reminder',
      `แจ้งเตือน Timesheet เดือน${thaiMonth} — ${employeeName}`,
      status,
      null
    );

    return {
      success: true,
      status,
      employee: employeeName,
      department: employee.department,
    };
  } catch (error) {
    await addNotificationLog(
      employeeId,
      'timesheet_reminder',
      `แจ้งเตือน Timesheet — ${employeeName}`,
      'failed',
      error.message
    );

    return {
      success: false,
      error: error.message,
      employee: employeeName,
    };
  }
}

/**
 * Send timesheet reminders to ALL employees with incomplete timesheets.
 * Returns a summary of the operation.
 *
 * @returns {object} Summary: { total, sent, failed, noLineId, details }
 */
async function sendReminderToAll() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const incompleteEmployees = await getIncompleteTimesheets(year, month);

  const summary = {
    total: incompleteEmployees.length,
    sent: 0,
    failed: 0,
    noLineId: 0,
    details: [],
  };

  console.log(`\x1b[36m[NOTIFICATION]\x1b[0m 📨 เริ่มส่งแจ้งเตือน Timesheet จำนวน ${summary.total} คน`);

  for (const emp of incompleteEmployees) {
    const employeeName = `${emp.first_name} ${emp.last_name}`;

    if (!emp.line_user_id) {
      summary.noLineId++;
      summary.details.push({
        employee: employeeName,
        department: emp.department,
        status: 'no_line_id',
      });

      await addNotificationLog(
        emp.id || emp.employee_id, // in case it's id from db
        'timesheet_reminder',
        `แจ้งเตือน Timesheet — ${employeeName}`,
        'failed',
        'ไม่มี LINE User ID'
      );

      continue;
    }

    try {
      const result = await sendTimesheetReminder(
        emp.line_user_id,
        employeeName,
        emp.department,
        month,
        year
      );

      const status = result.demo ? 'demo' : 'sent';
      summary.sent++;
      summary.details.push({
        employee: employeeName,
        department: emp.department,
        status,
      });

      await addNotificationLog(
        emp.id || emp.employee_id,
        'timesheet_reminder',
        `แจ้งเตือน Timesheet — ${employeeName}`,
        status,
        null
      );
    } catch (error) {
      summary.failed++;
      summary.details.push({
        employee: employeeName,
        department: emp.department,
        status: 'failed',
        error: error.message,
      });

      await addNotificationLog(
        emp.id || emp.employee_id,
        'timesheet_reminder',
        `แจ้งเตือน Timesheet — ${employeeName}`,
        'failed',
        error.message
      );
    }
  }

  console.log(
    `\x1b[36m[NOTIFICATION]\x1b[0m ✅ เสร็จสิ้น: ส่งสำเร็จ ${summary.sent}, ล้มเหลว ${summary.failed}, ไม่มี LINE ${summary.noLineId}`
  );

  return summary;
}

/**
 * Get recent notification log history.
 *
 * @param {number} limit - Maximum number of logs to return (default 50)
 * @returns {Array} Notification log entries
 */
async function getNotificationHistory(limit = 50) {
  return await getNotificationLogs(limit);
}

// ── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  getIncompleteEmployees,
  sendReminderToEmployee,
  sendReminderToAll,
  getNotificationHistory,
};

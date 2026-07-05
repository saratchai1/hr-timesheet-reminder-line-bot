// ============================================================================
// Routes — Timesheet Status API
// ============================================================================

const express = require('express');
const router = express.Router();

const {
  getTimesheetStatus,
  getIncompleteTimesheets,
  updateTimesheetStatus,
  getEmployeeById,
} = require('../database');

// ── GET /api/timesheet/stats ────────────────────────────────────────────────
// Must be defined BEFORE /:employeeId to avoid "stats" matching as a param.

router.get('/stats', async (req, res) => {
  try {
    const now = new Date();
    const year = Number(req.query.year) || now.getFullYear();
    const month = Number(req.query.month) || now.getMonth() + 1;

    const allStatuses = await getTimesheetStatus(year, month);

    let completed = 0;
    let inProgress = 0;
    let notStarted = 0;

    for (const ts of allStatuses) {
      switch (ts.status) {
        case 'completed':
          completed++;
          break;
        case 'in_progress':
          inProgress++;
          break;
        case 'not_started':
          notStarted++;
          break;
      }
    }

    const total = allStatuses.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    res.json({
      success: true,
      data: {
        year,
        month,
        total,
        completed,
        inProgress,
        notStarted,
        completionRate: `${completionRate}%`,
      },
    });
  } catch (error) {
    console.error('[Timesheet] Error getting stats:', error.message);
    res.status(500).json({ success: false, error: 'ไม่สามารถดึงข้อมูลสถิติ Timesheet ได้' });
  }
});

// ── GET /api/timesheet/status ───────────────────────────────────────────────
// Get all timesheet statuses for a given month. Defaults to current month.

router.get('/status', async (req, res) => {
  try {
    const now = new Date();
    const year = Number(req.query.year) || now.getFullYear();
    const month = Number(req.query.month) || now.getMonth() + 1;

    const statuses = await getTimesheetStatus(year, month);

    res.json({
      success: true,
      data: {
        year,
        month,
        employees: statuses,
      },
    });
  } catch (error) {
    console.error('[Timesheet] Error getting statuses:', error.message);
    res.status(500).json({ success: false, error: 'ไม่สามารถดึงข้อมูลสถานะ Timesheet ได้' });
  }
});

// ── GET /api/timesheet/incomplete ───────────────────────────────────────────
// Get only employees with incomplete timesheets.

router.get('/incomplete', async (req, res) => {
  try {
    const now = new Date();
    const year = Number(req.query.year) || now.getFullYear();
    const month = Number(req.query.month) || now.getMonth() + 1;

    const incomplete = await getIncompleteTimesheets(year, month);

    res.json({
      success: true,
      data: {
        year,
        month,
        totalIncomplete: incomplete.length,
        employees: incomplete,
      },
    });
  } catch (error) {
    console.error('[Timesheet] Error getting incomplete:', error.message);
    res.status(500).json({ success: false, error: 'ไม่สามารถดึงข้อมูล Timesheet ที่ยังไม่สมบูรณ์ได้' });
  }
});

// ── PUT /api/timesheet/:employeeId ──────────────────────────────────────────
// Update timesheet status for a specific employee.
// Body: { status: 'not_started'|'in_progress'|'completed', daysFilled: number }

router.put('/:employeeId', async (req, res) => {
  try {
    const employeeId = Number(req.params.employeeId);
    const { status, daysFilled } = req.body;

    // Validate employee exists
    const employee = await getEmployeeById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลพนักงาน' });
    }

    // Validate status value
    const validStatuses = ['not_started', 'in_progress', 'completed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `สถานะไม่ถูกต้อง กรุณาระบุ: ${validStatuses.join(', ')}`,
      });
    }

    // Validate daysFilled
    if (daysFilled === undefined || daysFilled === null || daysFilled < 0) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุจำนวนวันที่กรอก (daysFilled) เป็นตัวเลขที่มากกว่าหรือเท่ากับ 0',
      });
    }

    const now = new Date();
    const year = Number(req.query.year) || now.getFullYear();
    const month = Number(req.query.month) || now.getMonth() + 1;

    await updateTimesheetStatus(employeeId, year, month, status, daysFilled);

    res.json({
      success: true,
      data: {
        employeeId,
        employee: `${employee.first_name} ${employee.last_name}`,
        year,
        month,
        status,
        daysFilled,
        message: 'อัพเดทสถานะ Timesheet เรียบร้อยแล้ว',
      },
    });
  } catch (error) {
    console.error('[Timesheet] Error updating status:', error.message);
    res.status(500).json({ success: false, error: 'ไม่สามารถอัพเดทสถานะ Timesheet ได้' });
  }
});

module.exports = router;

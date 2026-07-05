// ============================================================================
// Routes — Employees API
// ============================================================================

const express = require('express');
const router = express.Router();

const {
  getAllEmployees,
  getEmployeeById,
  getEmployeeByCode,
  addEmployee,
  updateEmployee,
  deleteEmployee,
} = require('../database');

// ── GET /api/employees/stats/summary ────────────────────────────────────────
// Must be defined BEFORE /:id to avoid "stats" matching as an ID parameter.

router.get('/stats/summary', async (req, res) => {
  try {
    const employees = await getAllEmployees();

    // Group by department
    const byDepartment = {};
    let withLine = 0;
    let withoutLine = 0;

    for (const emp of employees) {
      // Count LINE registrations
      if (emp.line_user_id) {
        withLine++;
      } else {
        withoutLine++;
      }

      // Count by department
      if (!byDepartment[emp.department]) {
        byDepartment[emp.department] = 0;
      }
      byDepartment[emp.department]++;
    }

    res.json({
      success: true,
      data: {
        total: employees.length,
        withLineId: withLine,
        withoutLineId: withoutLine,
        byDepartment,
      },
    });
  } catch (error) {
    console.error('[Employees] Error getting stats:', error.message);
    res.status(500).json({ success: false, error: 'ไม่สามารถดึงข้อมูลสถิติพนักงานได้' });
  }
});

// ── GET /api/employees ──────────────────────────────────────────────────────
// List all employees, optionally filtered by ?department=

router.get('/', async (req, res) => {
  try {
    const { department } = req.query;
    const employees = await getAllEmployees(department || null);

    res.json({
      success: true,
      data: employees,
    });
  } catch (error) {
    console.error('[Employees] Error listing employees:', error.message);
    res.status(500).json({ success: false, error: 'ไม่สามารถดึงข้อมูลพนักงานได้' });
  }
});

// ── GET /api/employees/:id ──────────────────────────────────────────────────

router.get('/:id', async (req, res) => {
  try {
    const employee = await getEmployeeById(Number(req.params.id));

    if (!employee) {
      return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลพนักงาน' });
    }

    res.json({ success: true, data: employee });
  } catch (error) {
    console.error('[Employees] Error getting employee:', error.message);
    res.status(500).json({ success: false, error: 'ไม่สามารถดึงข้อมูลพนักงานได้' });
  }
});

// ── POST /api/employees ─────────────────────────────────────────────────────
// Add a new employee. Required: employee_code, first_name, last_name, department, position

router.post('/', async (req, res) => {
  try {
    const { employee_code, first_name, last_name, department, position } = req.body;

    // Validate required fields
    if (!employee_code || !first_name || !last_name || !department || !position) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุข้อมูลที่จำเป็น: employee_code, first_name, last_name, department, position',
      });
    }

    // Check for duplicate employee code
    const existing = await getEmployeeByCode(employee_code);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: `รหัสพนักงาน "${employee_code}" มีอยู่ในระบบแล้ว`,
      });
    }

    const newEmployee = await addEmployee(req.body);

    res.status(201).json({ success: true, data: newEmployee });
  } catch (error) {
    console.error('[Employees] Error adding employee:', error.message);
    res.status(500).json({ success: false, error: 'ไม่สามารถเพิ่มพนักงานได้' });
  }
});

// ── PUT /api/employees/:id ──────────────────────────────────────────────────

router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const employee = await getEmployeeById(id);

    if (!employee) {
      return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลพนักงาน' });
    }

    const updated = await updateEmployee(id, req.body);

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[Employees] Error updating employee:', error.message);
    res.status(500).json({ success: false, error: 'ไม่สามารถอัพเดทข้อมูลพนักงานได้' });
  }
});

// ── DELETE /api/employees/:id ───────────────────────────────────────────────
// Soft delete — sets is_active = 0

router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const employee = await getEmployeeById(id);

    if (!employee) {
      return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลพนักงาน' });
    }

    await deleteEmployee(id);

    res.json({
      success: true,
      data: { message: `ลบพนักงาน ${employee.first_name} ${employee.last_name} เรียบร้อยแล้ว` },
    });
  } catch (error) {
    console.error('[Employees] Error deleting employee:', error.message);
    res.status(500).json({ success: false, error: 'ไม่สามารถลบพนักงานได้' });
  }
});

module.exports = router;

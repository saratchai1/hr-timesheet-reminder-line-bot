// ============================================================================
// Database Layer — Supabase PostgreSQL
// ============================================================================

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('\x1b[33m[WARNING]\x1b[0m SUPABASE_URL หรือ SUPABASE_ANON_KEY ไม่ได้ถูกตั้งค่าใน .env');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ── Initialization ──────────────────────────────────────────────────────────

/**
 * Initialize the database connection.
 * With Supabase, we just verify the client exists, schema is handled via SQL script.
 */
function initDatabase() {
  console.log('\x1b[32m✔\x1b[0m Supabase Database พร้อมใช้งาน');
}

// ── Employee CRUD ───────────────────────────────────────────────────────────

/**
 * Get all active employees, optionally filtered by department.
 */
async function getAllEmployees(department) {
  let query = supabase
    .from('employees')
    .select('*')
    .eq('is_active', 1)
    .order('employee_code');

  if (department) {
    query = query.eq('department', department);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * Get a single employee by ID.
 */
async function getEmployeeById(id) {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .eq('is_active', 1)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 is multiple/no rows
  return data;
}

/**
 * Get a single employee by employee code.
 */
async function getEmployeeByCode(code) {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('employee_code', code)
    .eq('is_active', 1)
    .single();
    
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Add a new employee.
 */
async function addEmployee(employeeData) {
  const { data, error } = await supabase
    .from('employees')
    .insert([{
      employee_code: employeeData.employee_code,
      first_name: employeeData.first_name,
      last_name: employeeData.last_name,
      department: employeeData.department,
      position: employeeData.position,
      email: employeeData.email || null,
      line_user_id: employeeData.line_user_id || null,
      line_display_name: employeeData.line_display_name || null
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update an existing employee by ID.
 */
async function updateEmployee(id, employeeData) {
  const updateData = {};
  const allowedFields = [
    'employee_code', 'first_name', 'last_name', 'department',
    'position', 'email', 'line_user_id', 'line_display_name', 'is_active'
  ];

  for (const field of allowedFields) {
    if (employeeData[field] !== undefined) {
      updateData[field] = employeeData[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return await getEmployeeById(id);
  }

  const { data, error } = await supabase
    .from('employees')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Soft-delete an employee (set is_active = 0).
 */
async function deleteEmployee(id) {
  const { error } = await supabase
    .from('employees')
    .update({ is_active: 0 })
    .eq('id', id);

  if (error) throw error;
  return true;
}

// ── Timesheet Status ────────────────────────────────────────────────────────

/**
 * Get all timesheet statuses for a given year/month, joined with employee data.
 */
async function getTimesheetStatus(year, month) {
  // Use inner join in Supabase
  const { data, error } = await supabase
    .from('timesheet_status')
    .select(`
      *,
      employees!inner (
        employee_code,
        first_name,
        last_name,
        department,
        position,
        line_user_id,
        is_active
      )
    `)
    .eq('year', year)
    .eq('month', month)
    .eq('employees.is_active', 1)
    .order('employee_code', { foreignTable: 'employees' });

  if (error) throw error;
  
  // Flatten the joined data to match the old SQLite structure
  return data.map(row => ({
    ...row,
    employee_code: row.employees.employee_code,
    first_name: row.employees.first_name,
    last_name: row.employees.last_name,
    department: row.employees.department,
    position: row.employees.position,
    line_user_id: row.employees.line_user_id,
    employees: undefined // remove nested object
  }));
}

/**
 * Get only employees with incomplete timesheets for the given month.
 */
async function getIncompleteTimesheets(year, month) {
  const { data, error } = await supabase
    .from('timesheet_status')
    .select(`
      *,
      employees!inner (
        employee_code,
        first_name,
        last_name,
        department,
        position,
        email,
        line_user_id,
        line_display_name,
        is_active
      )
    `)
    .eq('year', year)
    .eq('month', month)
    .neq('status', 'completed')
    .eq('employees.is_active', 1)
    .order('employee_code', { foreignTable: 'employees' });

  if (error) throw error;

  return data.map(row => ({
    ...row,
    employee_code: row.employees.employee_code,
    first_name: row.employees.first_name,
    last_name: row.employees.last_name,
    department: row.employees.department,
    position: row.employees.position,
    email: row.employees.email,
    line_user_id: row.employees.line_user_id,
    line_display_name: row.employees.line_display_name,
    employees: undefined
  }));
}

/**
 * Upsert timesheet status for an employee in a given year/month.
 */
async function updateTimesheetStatus(employeeId, year, month, status, daysFilled) {
  const { error } = await supabase
    .from('timesheet_status')
    .upsert({
      employee_id: employeeId,
      year: year,
      month: month,
      status: status,
      days_filled: daysFilled,
      total_days: 23
    }, {
      onConflict: 'employee_id, year, month'
    });

  if (error) throw error;
  return true;
}

// ── Notification Logs ───────────────────────────────────────────────────────

/**
 * Add a notification log entry.
 */
async function addNotificationLog(employeeId, messageType, messageContent, status, errorMessage) {
  const { error } = await supabase
    .from('notification_logs')
    .insert([{
      employee_id: employeeId,
      message_type: messageType,
      message_content: messageContent,
      status: status,
      error_message: errorMessage || null
    }]);

  if (error) console.error('[Database] Error adding notification log:', error.message);
  return !error;
}

/**
 * Get recent notification logs, joined with employee info.
 */
async function getNotificationLogs(limit = 50) {
  const { data, error } = await supabase
    .from('notification_logs')
    .select(`
      *,
      employees!inner (
        employee_code,
        first_name,
        last_name,
        department
      )
    `)
    .order('sent_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return data.map(row => ({
    ...row,
    employee_code: row.employees.employee_code,
    first_name: row.employees.first_name,
    last_name: row.employees.last_name,
    department: row.employees.department,
    employees: undefined
  }));
}

// ── LINE User Lookup ────────────────────────────────────────────────────────

/**
 * Find an employee by their LINE user ID.
 */
async function getEmployeeByLineUserId(lineUserId) {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('line_user_id', lineUserId)
    .eq('is_active', 1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Update an employee's LINE info (user ID and display name).
 */
async function updateEmployeeLineInfo(employeeId, lineUserId, displayName) {
  const { error } = await supabase
    .from('employees')
    .update({
      line_user_id: lineUserId,
      line_display_name: displayName
    })
    .eq('id', employeeId);

  if (error) throw error;
  return true;
}

// ── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  initDatabase,
  getAllEmployees,
  getEmployeeById,
  getEmployeeByCode,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  getTimesheetStatus,
  getIncompleteTimesheets,
  updateTimesheetStatus,
  addNotificationLog,
  getNotificationLogs,
  getEmployeeByLineUserId,
  updateEmployeeLineInfo,
};

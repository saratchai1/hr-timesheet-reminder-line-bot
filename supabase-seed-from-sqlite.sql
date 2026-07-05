-- ============================================================================
-- Seed data migrated from local SQLite database
-- Run this in Supabase SQL Editor after schema.sql.
-- Safe to run more than once: employees and timesheet_status use upserts.
-- ============================================================================

INSERT INTO employees (
  employee_code,
  first_name,
  last_name,
  department,
  position,
  email,
  line_user_id,
  line_display_name,
  is_active
) VALUES
  ('EMP001', 'สมชาย', 'วงศ์สกุล', 'IT', 'Senior Developer', 'somchai.w@company.com', 'U1a2b3c4d5e6f7g8h9i0j', 'สมชาย Dev', 1),
  ('EMP002', 'สมหญิง', 'รัตนพงษ์', 'HR', 'HR Manager', 'somying.r@company.com', 'U2b3c4d5e6f7g8h9i0j1k', 'สมหญิง HR', 1),
  ('EMP003', 'วิชัย', 'ศรีสวัสดิ์', 'Finance', 'Financial Analyst', 'wichai.s@company.com', 'U3c4d5e6f7g8h9i0j1k2l', 'วิชัย Finance', 1),
  ('EMP004', 'นภาพร', 'จันทร์ดี', 'Marketing', 'Marketing Specialist', 'napaporn.c@company.com', NULL, NULL, 1),
  ('EMP005', 'ประยุทธ์', 'แก้วมณี', 'IT', 'System Administrator', 'prayut.k@company.com', 'U5e6f7g8h9i0j1k2l3m4n', 'ประยุทธ์ IT', 1),
  ('EMP006', 'สุดา', 'ทองคำ', 'Operations', 'Operations Lead', 'suda.t@company.com', 'U6f7g8h9i0j1k2l3m4n5o', 'สุดา Ops', 1),
  ('EMP007', 'ธนกร', 'พิทักษ์ธรรม', 'Sales', 'Sales Executive', 'thanakorn.p@company.com', NULL, NULL, 1),
  ('EMP008', 'พิมพ์ใจ', 'อารีย์', 'HR', 'HR Coordinator', 'pimjai.a@company.com', 'U8h9i0j1k2l3m4n5o6p7q', 'พิมพ์ใจ HR', 1),
  ('EMP009', 'อนุชา', 'สุขสมบูรณ์', 'IT', 'Frontend Developer', 'anucha.s@company.com', 'U9i0j1k2l3m4n5o6p7q8r', 'อนุชา Dev', 1),
  ('EMP010', 'กัลยา', 'เจริญสุข', 'Finance', 'Accountant', 'kanlaya.c@company.com', NULL, NULL, 1),
  ('EMP011', 'ชัยวัฒน์', 'มั่นคง', 'Operations', 'Warehouse Supervisor', 'chaiwat.m@company.com', 'Ub1c2d3e4f5g6h7i8j9k0', 'ชัยวัฒน์ WH', 1),
  ('EMP012', 'รัตนา', 'วิไลลักษณ์', 'Marketing', 'Content Creator', 'rattana.w@company.com', 'Uc2d3e4f5g6h7i8j9k0l1', 'รัตนา MKT', 1),
  ('EMP013', 'ภูมิ', 'พัฒนกิจ', 'Sales', 'Sales Manager', 'phoom.p@company.com', 'Ud3e4f5g6h7i8j9k0l1m2', 'ภูมิ Sales', 1),
  ('EMP014', 'ดวงใจ', 'บุญเรือง', 'IT', 'QA Engineer', 'duangjai.b@company.com', NULL, NULL, 1),
  ('EMP015', 'เกียรติศักดิ์', 'ชัยชนะ', 'Finance', 'Finance Manager', 'kiattisak.c@company.com', 'Uf5g6h7i8j9k0l1m2n3o4', 'เกียรติศักดิ์ FIN', 1),
  ('01E3661', 'ดร.สรัสไชย', 'องค์ประเสริฐ', 'Management', 'Director', 'saratchai@company.com', 'Uab0426f0e1428367cc0d07d2ff06032f', NULL, 1)
ON CONFLICT (employee_code) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  department = EXCLUDED.department,
  position = EXCLUDED.position,
  email = EXCLUDED.email,
  line_user_id = EXCLUDED.line_user_id,
  line_display_name = EXCLUDED.line_display_name,
  is_active = EXCLUDED.is_active;

WITH source_status AS (
  SELECT * FROM (VALUES
    ('EMP001', 2026, 7, 'completed', 23, 23),
    ('EMP002', 2026, 7, 'completed', 23, 23),
    ('EMP003', 2026, 7, 'in_progress', 15, 23),
    ('EMP004', 2026, 7, 'not_started', 0, 23),
    ('EMP005', 2026, 7, 'in_progress', 20, 23),
    ('EMP006', 2026, 7, 'completed', 23, 23),
    ('EMP007', 2026, 7, 'not_started', 0, 23),
    ('EMP008', 2026, 7, 'in_progress', 10, 23),
    ('EMP009', 2026, 7, 'completed', 23, 23),
    ('EMP010', 2026, 7, 'not_started', 0, 23),
    ('EMP011', 2026, 7, 'in_progress', 18, 23),
    ('EMP012', 2026, 7, 'completed', 23, 23),
    ('EMP013', 2026, 7, 'in_progress', 5, 23),
    ('EMP014', 2026, 7, 'not_started', 0, 23),
    ('EMP015', 2026, 7, 'completed', 23, 23),
    ('01E3661', 2026, 7, 'not_started', 0, 23),
    ('01E3661', 2026, 6, 'not_started', 0, 23)
  ) AS rows(employee_code, year, month, status, days_filled, total_days)
)
INSERT INTO timesheet_status (
  employee_id,
  year,
  month,
  status,
  days_filled,
  total_days
)
SELECT
  employees.id,
  source_status.year,
  source_status.month,
  source_status.status,
  source_status.days_filled,
  source_status.total_days
FROM source_status
JOIN employees ON employees.employee_code = source_status.employee_code
ON CONFLICT (employee_id, year, month) DO UPDATE SET
  status = EXCLUDED.status,
  days_filled = EXCLUDED.days_filled,
  total_days = EXCLUDED.total_days,
  updated_at = NOW();

SELECT 'employees' AS table_name, COUNT(*) AS row_count FROM employees
UNION ALL
SELECT 'timesheet_status' AS table_name, COUNT(*) AS row_count FROM timesheet_status;

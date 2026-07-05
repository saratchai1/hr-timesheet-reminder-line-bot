-- ============================================================================
-- HR Timesheet Reminder Bot — Supabase PostgreSQL Schema
-- ============================================================================
-- ให้ Copy โค้ดทั้งหมดนี้ไปวางในเมนู SQL Editor ของโปรเจค Supabase แล้วกด Run
-- ============================================================================

-- 1. Create employees table
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    employee_code TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    department TEXT NOT NULL,
    position TEXT NOT NULL,
    email TEXT,
    line_user_id TEXT,
    line_display_name TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create timesheet_status table
CREATE TABLE timesheet_status (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('not_started', 'in_progress', 'completed')),
    days_filled INTEGER DEFAULT 0,
    total_days INTEGER NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, year, month)
);

-- 3. Create notification_logs table
CREATE TABLE notification_logs (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    message_type TEXT NOT NULL,
    message_content TEXT,
    status TEXT NOT NULL CHECK(status IN ('sent', 'failed', 'demo')),
    error_message TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create trigger to automatically update "updated_at" on employees
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_employees_updated_at
BEFORE UPDATE ON employees
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timesheet_status_updated_at
BEFORE UPDATE ON timesheet_status
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Seed Demo Data (ข้อมูลจำลอง 15 คน)
-- ============================================================================
INSERT INTO employees (employee_code, first_name, last_name, department, position, email, line_user_id, line_display_name) VALUES
('EMP001', 'สมชาย', 'วงศ์สกุล', 'IT', 'Senior Developer', 'somchai.w@company.com', 'U1a2b3c4d5e6f7g8h9i0j', 'สมชาย Dev'),
('EMP002', 'สมหญิง', 'รัตนพงษ์', 'HR', 'HR Manager', 'somying.r@company.com', 'U2b3c4d5e6f7g8h9i0j1k', 'สมหญิง HR'),
('EMP003', 'วิชัย', 'ศรีสวัสดิ์', 'Finance', 'Financial Analyst', 'wichai.s@company.com', 'U3c4d5e6f7g8h9i0j1k2l', 'วิชัย Finance'),
('EMP004', 'นภาพร', 'จันทร์ดี', 'Marketing', 'Marketing Specialist', 'napaporn.c@company.com', NULL, NULL),
('EMP005', 'ประยุทธ์', 'แก้วมณี', 'IT', 'System Administrator', 'prayut.k@company.com', 'U5e6f7g8h9i0j1k2l3m4n', 'ประยุทธ์ IT'),
('EMP006', 'สุดา', 'ทองคำ', 'Operations', 'Operations Lead', 'suda.t@company.com', 'U6f7g8h9i0j1k2l3m4n5o', 'สุดา Ops'),
('EMP007', 'ธนกร', 'พิทักษ์ธรรม', 'Sales', 'Sales Executive', 'thanakorn.p@company.com', NULL, NULL),
('EMP008', 'พิมพ์ใจ', 'อารีย์', 'HR', 'HR Coordinator', 'pimjai.a@company.com', 'U8h9i0j1k2l3m4n5o6p7q', 'พิมพ์ใจ HR'),
('EMP009', 'อนุชา', 'สุขสมบูรณ์', 'IT', 'Frontend Developer', 'anucha.s@company.com', 'U9i0j1k2l3m4n5o6p7q8r', 'อนุชา Dev'),
('EMP010', 'กัลยา', 'เจริญสุข', 'Finance', 'Accountant', 'kanlaya.c@company.com', NULL, NULL),
('EMP011', 'ชัยวัฒน์', 'มั่นคง', 'Operations', 'Warehouse Supervisor', 'chaiwat.m@company.com', 'Ub1c2d3e4f5g6h7i8j9k0', 'ชัยวัฒน์ WH'),
('EMP012', 'รัตนา', 'วิไลลักษณ์', 'Marketing', 'Content Creator', 'rattana.w@company.com', 'Uc2d3e4f5g6h7i8j9k0l1', 'รัตนา MKT'),
('EMP013', 'ภูมิ', 'พัฒนกิจ', 'Sales', 'Sales Manager', 'phoom.p@company.com', 'Ud3e4f5g6h7i8j9k0l1m2', 'ภูมิ Sales'),
('EMP014', 'ดวงใจ', 'บุญเรือง', 'IT', 'QA Engineer', 'duangjai.b@company.com', NULL, NULL),
('EMP015', 'เกียรติศักดิ์', 'ชัยชนะ', 'Finance', 'Finance Manager', 'kiattisak.c@company.com', 'Uf5g6h7i8j9k0l1m2n3o4', 'เกียรติศักดิ์ FIN');

-- Add Dr. Saratchai directly
INSERT INTO employees (employee_code, first_name, last_name, department, position, email, line_user_id) VALUES
('01E3661', 'ดร.สรัสไชย', 'องค์ประเสริฐ', 'Management', 'Director', 'saratchai@company.com', 'Uab0426f0e1428367cc0d07d2ff06032f');

-- Insert Timesheet statuses for current month and June
INSERT INTO timesheet_status (employee_id, year, month, status, days_filled, total_days) VALUES
(1, 2026, 7, 'completed', 23, 23),
(2, 2026, 7, 'completed', 23, 23),
(3, 2026, 7, 'in_progress', 15, 23),
(4, 2026, 7, 'not_started', 0, 23),
(5, 2026, 7, 'in_progress', 20, 23),
(6, 2026, 7, 'completed', 23, 23),
(7, 2026, 7, 'not_started', 0, 23),
(8, 2026, 7, 'in_progress', 10, 23),
(9, 2026, 7, 'completed', 23, 23),
(10, 2026, 7, 'not_started', 0, 23),
(11, 2026, 7, 'in_progress', 18, 23),
(12, 2026, 7, 'completed', 23, 23),
(13, 2026, 7, 'in_progress', 5, 23),
(14, 2026, 7, 'not_started', 0, 23),
(15, 2026, 7, 'completed', 23, 23),
(16, 2026, 6, 'not_started', 0, 22),
(16, 2026, 7, 'not_started', 0, 23);

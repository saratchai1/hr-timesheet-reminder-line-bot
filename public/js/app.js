/* ============================================================
   HR Timesheet Dashboard — Application Logic
   ============================================================ */

const App = (() => {
    // ─── State ───
    const state = {
        currentTab: 'dashboard',
        employees: [],
        filteredEmployees: [],
        timesheetData: [],
        filteredTimesheet: [],
        notificationLogs: [],
        filteredNotifLogs: [],
        stats: { total: 0, completed: 0, in_progress: 0, not_started: 0 },
        timesheetStats: { total: 0, completed: 0, in_progress: 0, not_started: 0 },
        filters: {
            department: '',
            search: '',
            timesheetStatus: 'all',
            notifStatus: ''
        },
        departments: []
    };

    // ─── Utility: debounce ───
    function debounce(fn, ms) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(null, args), ms);
        };
    }

    // ─── Utility: format date in Thai locale ───
    function formatDate(dateStr) {
        if (!dateStr) return '—';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateStr;
        }
    }

    // ─── Utility: format short date ───
    function formatShortDate(dateStr) {
        if (!dateStr) return '—';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString('th-TH', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        } catch {
            return dateStr;
        }
    }

    // ─── Utility: relative time ───
    function timeAgo(dateStr) {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            const now = new Date();
            const diff = Math.floor((now - d) / 1000);
            if (diff < 60) return 'เมื่อสักครู่';
            if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
            if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`;
            if (diff < 604800) return `${Math.floor(diff / 86400)} วันที่แล้ว`;
            return formatShortDate(dateStr);
        } catch {
            return '';
        }
    }

    // ─── Utility: status badge HTML ───
    function getStatusBadge(status) {
        const map = {
            completed: { label: 'เสร็จแล้ว', cls: 'badge-completed' },
            in_progress: { label: 'กำลังกรอก', cls: 'badge-in_progress' },
            not_started: { label: 'ยังไม่เริ่ม', cls: 'badge-not_started' },
            sent: { label: 'ส่งสำเร็จ', cls: 'badge-sent' },
            failed: { label: 'ส่งไม่สำเร็จ', cls: 'badge-failed' },
            demo: { label: 'ทดสอบ', cls: 'badge-demo' }
        };
        const info = map[status] || { label: status || '—', cls: '' };
        return `<span class="badge ${info.cls}"><span class="pulse-dot"></span>${info.label}</span>`;
    }

    // ─── Utility: LINE status badge ───
    function getLineStatusBadge(lineUserId) {
        if (lineUserId) {
            return `<span class="badge badge-connected"><i class="fa-brands fa-line"></i> เชื่อมต่อแล้ว</span>`;
        }
        return `<span class="badge badge-not-connected"><i class="fa-solid fa-link-slash"></i> ยังไม่เชื่อมต่อ</span>`;
    }

    // ─── API helper ───
    async function api(url, options = {}) {
        try {
            const res = await fetch(url, {
                headers: { 'Content-Type': 'application/json', ...options.headers },
                ...options
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || errData.message || `HTTP ${res.status}`);
            }
            return await res.json();
        } catch (err) {
            console.error(`API Error [${url}]:`, err);
            throw err;
        }
    }

    // ─── Toast Notifications ───
    function showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const icons = {
            success: 'fa-circle-check',
            error: 'fa-circle-exclamation',
            info: 'fa-circle-info',
            warning: 'fa-triangle-exclamation'
        };
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-icon"><i class="fa-solid ${icons[type] || icons.info}"></i></div>
            <div class="toast-message">${message}</div>
            <button class="toast-close" onclick="this.closest('.toast').remove()"><i class="fa-solid fa-xmark"></i></button>
        `;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('toast-out');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // ─── Modal ───
    function showModal(title, bodyHTML, footerHTML = '') {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalBody').innerHTML = bodyHTML;
        document.getElementById('modalFooter').innerHTML = footerHTML;
        document.getElementById('modalOverlay').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        document.getElementById('modalOverlay').classList.remove('active');
        document.body.style.overflow = '';
    }

    // ─── Tab Switching ───
    function switchTab(tab) {
        state.currentTab = tab;
        // Update nav
        document.querySelectorAll('.nav-item').forEach(el => {
            el.classList.toggle('active', el.dataset.tab === tab);
        });
        // Update content
        document.querySelectorAll('.tab-content').forEach(el => {
            el.classList.toggle('active', el.id === `tab-${tab}`);
        });
        // Update breadcrumb
        const labels = {
            dashboard: 'แดชบอร์ด',
            employees: 'พนักงาน',
            timesheet: 'Timesheet',
            notifications: 'แจ้งเตือน'
        };
        document.getElementById('breadcrumbCurrent').textContent = labels[tab] || tab;
        // Load data for tab
        switch (tab) {
            case 'dashboard': loadDashboard(); break;
            case 'employees': loadEmployees(); break;
            case 'timesheet': loadTimesheet(); break;
            case 'notifications': loadNotifications(); break;
        }
        // Close sidebar on mobile
        closeSidebar();
    }

    // ─── Sidebar Mobile ───
    function openSidebar() {
        document.getElementById('sidebar').classList.add('open');
        let overlay = document.getElementById('sidebarOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            overlay.id = 'sidebarOverlay';
            overlay.onclick = closeSidebar;
            document.body.appendChild(overlay);
        }
        overlay.classList.add('active');
    }

    function closeSidebar() {
        document.getElementById('sidebar').classList.remove('open');
        const overlay = document.getElementById('sidebarOverlay');
        if (overlay) overlay.classList.remove('active');
    }

    // ─── Header Clock ───
    function updateClock() {
        const now = new Date();
        const dateStr = now.toLocaleDateString('th-TH', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const timeStr = now.toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        document.getElementById('headerDatetime').textContent = `${dateStr} ${timeStr}`;
    }

    // ─── Populate month selector ───
    function populateMonthSelector() {
        const sel = document.getElementById('timesheetMonth');
        if (!sel) return;
        const now = new Date();
        sel.innerHTML = '';
        for (let i = 0; i < 6; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const label = d.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
            const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = label;
            sel.appendChild(opt);
        }
    }

    // ═══════════════════════════════════════════════
    //  DATA LOADING
    // ═══════════════════════════════════════════════

    async function loadDashboard() {
        try {
            // Load stats
            const [empStats, tsStats] = await Promise.allSettled([
                api('/api/employees/stats/summary'),
                api('/api/timesheet/stats')
            ]);

            if (empStats.status === 'fulfilled') {
                const data = empStats.value;
                state.stats.total = data.total || data.totalEmployees || 0;
            }

            if (tsStats.status === 'fulfilled') {
                const data = tsStats.value;
                state.timesheetStats = {
                    total: data.total || data.totalEmployees || state.stats.total || 0,
                    completed: data.completed || 0,
                    in_progress: data.in_progress || data.inProgress || 0,
                    not_started: data.not_started || data.notStarted || 0
                };
            }

            renderStatsCards();

            // Load recent notifications
            try {
                const logs = await api('/api/notifications/logs');
                state.notificationLogs = Array.isArray(logs) ? logs : (logs.logs || logs.data || []);
                renderRecentActivity();
            } catch {
                renderRecentActivity();
            }

            // Update notif badge
            updateNotifBadge();
        } catch (err) {
            console.error('loadDashboard error:', err);
            showToast('ไม่สามารถโหลดข้อมูลแดชบอร์ดได้', 'error');
        }
    }

    function renderStatsCards() {
        const ts = state.timesheetStats;
        const total = ts.total || state.stats.total || 0;
        const completed = ts.completed || 0;
        const notStarted = ts.not_started || 0;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

        document.getElementById('statTotal').textContent = total;
        document.getElementById('statCompleted').textContent = completed;
        document.getElementById('statNotStarted').textContent = notStarted;
        document.getElementById('statRate').textContent = `${rate}%`;

        // Update progress ring
        updateProgressRing(completed, ts.in_progress || 0, notStarted, total);
    }

    function updateProgressRing(completed, inProgress, notStarted, total) {
        const ring = document.getElementById('progressRing');
        const valueEl = document.getElementById('progressRingValue');
        if (!ring) return;

        if (total === 0) {
            ring.style.background = `conic-gradient(var(--bg-surface) 0deg 360deg)`;
            valueEl.textContent = '0%';
            document.getElementById('legendCompleted').textContent = '0';
            document.getElementById('legendInProgress').textContent = '0';
            document.getElementById('legendNotStarted').textContent = '0';
            return;
        }

        const pCompleted = (completed / total) * 360;
        const pInProgress = (inProgress / total) * 360;
        const pNotStarted = (notStarted / total) * 360;

        ring.style.background = `conic-gradient(
            var(--success) 0deg ${pCompleted}deg,
            var(--warning) ${pCompleted}deg ${pCompleted + pInProgress}deg,
            var(--danger) ${pCompleted + pInProgress}deg ${pCompleted + pInProgress + pNotStarted}deg,
            var(--bg-surface) ${pCompleted + pInProgress + pNotStarted}deg 360deg
        )`;

        const rate = Math.round((completed / total) * 100);
        valueEl.textContent = `${rate}%`;

        document.getElementById('legendCompleted').textContent = completed;
        document.getElementById('legendInProgress').textContent = inProgress;
        document.getElementById('legendNotStarted').textContent = notStarted;
    }

    function renderRecentActivity() {
        const list = document.getElementById('activityList');
        if (!list) return;

        const logs = state.notificationLogs.slice(0, 8);
        if (logs.length === 0) {
            list.innerHTML = `<div class="empty-state small"><i class="fa-solid fa-inbox"></i><p>ยังไม่มีกิจกรรม</p></div>`;
            return;
        }

        list.innerHTML = logs.map(log => {
            const statusClass = log.status === 'sent' ? 'icon-success' :
                                log.status === 'failed' ? 'icon-danger' :
                                log.status === 'demo' ? 'icon-info' : 'icon-warning';
            const icon = log.status === 'sent' ? 'fa-paper-plane' :
                         log.status === 'failed' ? 'fa-exclamation' :
                         log.status === 'demo' ? 'fa-flask' : 'fa-bell';
            const empName = log.employee_name || log.employeeName || 'พนักงาน';
            const statusText = log.status === 'sent' ? 'ส่งเตือนสำเร็จ' :
                               log.status === 'failed' ? 'ส่งเตือนไม่สำเร็จ' :
                               log.status === 'demo' ? 'ทดสอบส่ง' : 'แจ้งเตือน';
            return `
                <div class="activity-item">
                    <div class="activity-item-icon ${statusClass}"><i class="fa-solid ${icon}"></i></div>
                    <div class="activity-item-text">${statusText} — <strong>${empName}</strong></div>
                    <div class="activity-item-time">${timeAgo(log.sent_at || log.sentAt || log.created_at || log.createdAt)}</div>
                </div>
            `;
        }).join('');
    }

    function updateNotifBadge() {
        const badge = document.getElementById('notifBadge');
        const count = state.timesheetStats.not_started || 0;
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    }

    // ─── Employees ───
    async function loadEmployees() {
        const tbody = document.getElementById('employeeTableBody');
        tbody.innerHTML = `<tr><td colspan="6"><div class="loading-spinner"></div></td></tr>`;

        try {
            const data = await api('/api/employees');
            state.employees = Array.isArray(data) ? data : (data.employees || data.data || []);
            state.filteredEmployees = [...state.employees];

            // Extract unique departments
            const depts = new Set();
            state.employees.forEach(e => {
                if (e.department) depts.add(e.department);
            });
            state.departments = [...depts].sort();
            populateDepartmentFilter();

            renderEmployeeTable(state.filteredEmployees);
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state small"><i class="fa-solid fa-circle-exclamation"></i><p>ไม่สามารถโหลดข้อมูลพนักงานได้</p></div></td></tr>`;
            showToast('ไม่สามารถโหลดข้อมูลพนักงานได้', 'error');
        }
    }

    function populateDepartmentFilter() {
        const sel = document.getElementById('departmentFilter');
        if (!sel) return;
        const current = sel.value;
        sel.innerHTML = '<option value="">ทุกแผนก</option>';
        state.departments.forEach(dept => {
            const opt = document.createElement('option');
            opt.value = dept;
            opt.textContent = dept;
            sel.appendChild(opt);
        });
        sel.value = current;
    }

    function renderEmployeeTable(employees) {
        const tbody = document.getElementById('employeeTableBody');
        if (!employees || employees.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state small"><i class="fa-solid fa-users-slash"></i><p>ไม่พบข้อมูลพนักงาน</p></div></td></tr>`;
            return;
        }

        tbody.innerHTML = employees.map(emp => `
            <tr>
                <td><span style="font-family:var(--font-en);font-weight:600;color:var(--primary-light);">${emp.employee_code || emp.employeeCode || '—'}</span></td>
                <td>
                    <div class="td-name">${emp.first_name || emp.firstName || ''} ${emp.last_name || emp.lastName || ''}</div>
                    ${emp.email ? `<div class="td-sub">${emp.email}</div>` : ''}
                </td>
                <td>${emp.department || '—'}</td>
                <td>${emp.position || '—'}</td>
                <td>${getLineStatusBadge(emp.line_user_id || emp.lineUserId)}</td>
                <td>
                    <div class="td-actions">
                        <button class="btn btn-ghost btn-icon" onclick="App.editEmployee(${emp.id})" title="แก้ไข"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="btn btn-ghost btn-icon" onclick="App.deleteEmployee(${emp.id}, '${(emp.first_name || emp.firstName || '')} ${(emp.last_name || emp.lastName || '')}')" title="ลบ" style="color:var(--danger);"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function filterEmployees() {
        const search = (document.getElementById('employeeSearch')?.value || '').trim().toLowerCase();
        const dept = document.getElementById('departmentFilter')?.value || '';

        state.filters.search = search;
        state.filters.department = dept;

        state.filteredEmployees = state.employees.filter(emp => {
            const name = `${emp.first_name || emp.firstName || ''} ${emp.last_name || emp.lastName || ''} ${emp.employee_code || emp.employeeCode || ''}`.toLowerCase();
            const matchSearch = !search || name.includes(search);
            const matchDept = !dept || emp.department === dept;
            return matchSearch && matchDept;
        });

        renderEmployeeTable(state.filteredEmployees);
    }

    // ─── Add Employee ───
    function addEmployee() {
        const deptOptions = state.departments.map(d => `<option value="${d}">${d}</option>`).join('');

        const body = `
            <div class="form-row">
                <div class="form-group">
                    <label>รหัสพนักงาน</label>
                    <input type="text" id="formEmpCode" placeholder="เช่น EMP001">
                </div>
                <div class="form-group">
                    <label>อีเมล</label>
                    <input type="email" id="formEmpEmail" placeholder="email@company.com">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>ชื่อ</label>
                    <input type="text" id="formEmpFirstName" placeholder="ชื่อจริง">
                </div>
                <div class="form-group">
                    <label>นามสกุล</label>
                    <input type="text" id="formEmpLastName" placeholder="นามสกุล">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>แผนก</label>
                    <select id="formEmpDept">
                        <option value="">— เลือกแผนก —</option>
                        ${deptOptions}
                        <option value="__new__">+ เพิ่มแผนกใหม่</option>
                    </select>
                    <input type="text" id="formEmpDeptNew" placeholder="ชื่อแผนกใหม่" style="display:none;margin-top:8px;">
                </div>
                <div class="form-group">
                    <label>ตำแหน่ง</label>
                    <input type="text" id="formEmpPosition" placeholder="ตำแหน่ง">
                </div>
            </div>
            <div class="form-group">
                <label>LINE User ID (ถ้ามี)</label>
                <input type="text" id="formEmpLineId" placeholder="Uxxxxxxxxxxxxxxx">
            </div>
        `;

        const footer = `
            <button class="btn btn-ghost" onclick="App.closeModal()">ยกเลิก</button>
            <button class="btn btn-primary" onclick="App.submitAddEmployee()"><i class="fa-solid fa-plus"></i> เพิ่มพนักงาน</button>
        `;

        showModal('เพิ่มพนักงานใหม่', body, footer);

        // Handle new department toggle
        setTimeout(() => {
            const sel = document.getElementById('formEmpDept');
            const newInput = document.getElementById('formEmpDeptNew');
            if (sel && newInput) {
                sel.addEventListener('change', () => {
                    newInput.style.display = sel.value === '__new__' ? 'block' : 'none';
                });
            }
        }, 100);
    }

    async function submitAddEmployee() {
        const code = document.getElementById('formEmpCode')?.value?.trim();
        const firstName = document.getElementById('formEmpFirstName')?.value?.trim();
        const lastName = document.getElementById('formEmpLastName')?.value?.trim();
        let department = document.getElementById('formEmpDept')?.value;
        const position = document.getElementById('formEmpPosition')?.value?.trim();
        const email = document.getElementById('formEmpEmail')?.value?.trim();
        const lineUserId = document.getElementById('formEmpLineId')?.value?.trim();

        if (department === '__new__') {
            department = document.getElementById('formEmpDeptNew')?.value?.trim();
        }

        if (!firstName || !lastName) {
            showToast('กรุณากรอกชื่อและนามสกุล', 'warning');
            return;
        }

        try {
            await api('/api/employees', {
                method: 'POST',
                body: JSON.stringify({
                    employee_code: code,
                    first_name: firstName,
                    last_name: lastName,
                    department: department,
                    position: position,
                    email: email,
                    line_user_id: lineUserId || null
                })
            });
            closeModal();
            showToast(`เพิ่มพนักงาน ${firstName} ${lastName} สำเร็จ`, 'success');
            loadEmployees();
        } catch (err) {
            showToast(`เพิ่มพนักงานไม่สำเร็จ: ${err.message}`, 'error');
        }
    }

    // ─── Edit Employee ───
    function editEmployee(id) {
        const emp = state.employees.find(e => e.id === id);
        if (!emp) {
            showToast('ไม่พบข้อมูลพนักงาน', 'error');
            return;
        }

        const deptOptions = state.departments.map(d =>
            `<option value="${d}" ${d === emp.department ? 'selected' : ''}>${d}</option>`
        ).join('');

        const body = `
            <div class="form-row">
                <div class="form-group">
                    <label>รหัสพนักงาน</label>
                    <input type="text" id="formEditCode" value="${emp.employee_code || emp.employeeCode || ''}">
                </div>
                <div class="form-group">
                    <label>อีเมล</label>
                    <input type="email" id="formEditEmail" value="${emp.email || ''}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>ชื่อ</label>
                    <input type="text" id="formEditFirstName" value="${emp.first_name || emp.firstName || ''}">
                </div>
                <div class="form-group">
                    <label>นามสกุล</label>
                    <input type="text" id="formEditLastName" value="${emp.last_name || emp.lastName || ''}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>แผนก</label>
                    <select id="formEditDept">
                        <option value="">— เลือกแผนก —</option>
                        ${deptOptions}
                        <option value="__new__">+ เพิ่มแผนกใหม่</option>
                    </select>
                    <input type="text" id="formEditDeptNew" placeholder="ชื่อแผนกใหม่" style="display:none;margin-top:8px;">
                </div>
                <div class="form-group">
                    <label>ตำแหน่ง</label>
                    <input type="text" id="formEditPosition" value="${emp.position || ''}">
                </div>
            </div>
            <div class="form-group">
                <label>LINE User ID (ถ้ามี)</label>
                <input type="text" id="formEditLineId" value="${emp.line_user_id || emp.lineUserId || ''}">
            </div>
        `;

        const footer = `
            <button class="btn btn-ghost" onclick="App.closeModal()">ยกเลิก</button>
            <button class="btn btn-primary" onclick="App.submitEditEmployee(${id})"><i class="fa-solid fa-floppy-disk"></i> บันทึก</button>
        `;

        showModal('แก้ไขข้อมูลพนักงาน', body, footer);

        setTimeout(() => {
            const sel = document.getElementById('formEditDept');
            const newInput = document.getElementById('formEditDeptNew');
            if (sel && newInput) {
                sel.addEventListener('change', () => {
                    newInput.style.display = sel.value === '__new__' ? 'block' : 'none';
                });
            }
        }, 100);
    }

    async function submitEditEmployee(id) {
        const code = document.getElementById('formEditCode')?.value?.trim();
        const firstName = document.getElementById('formEditFirstName')?.value?.trim();
        const lastName = document.getElementById('formEditLastName')?.value?.trim();
        let department = document.getElementById('formEditDept')?.value;
        const position = document.getElementById('formEditPosition')?.value?.trim();
        const email = document.getElementById('formEditEmail')?.value?.trim();
        const lineUserId = document.getElementById('formEditLineId')?.value?.trim();

        if (department === '__new__') {
            department = document.getElementById('formEditDeptNew')?.value?.trim();
        }

        if (!firstName || !lastName) {
            showToast('กรุณากรอกชื่อและนามสกุล', 'warning');
            return;
        }

        try {
            await api(`/api/employees/${id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    employee_code: code,
                    first_name: firstName,
                    last_name: lastName,
                    department: department,
                    position: position,
                    email: email,
                    line_user_id: lineUserId || null
                })
            });
            closeModal();
            showToast(`แก้ไขข้อมูล ${firstName} ${lastName} สำเร็จ`, 'success');
            loadEmployees();
        } catch (err) {
            showToast(`แก้ไขข้อมูลไม่สำเร็จ: ${err.message}`, 'error');
        }
    }

    // ─── Delete Employee ───
    function deleteEmployee(id, name) {
        const body = `
            <div class="confirm-content">
                <div class="confirm-icon ci-danger"><i class="fa-solid fa-trash-can"></i></div>
                <h3>ยืนยันการลบพนักงาน</h3>
                <p class="confirm-text">คุณต้องการลบ <strong>${name}</strong> ออกจากระบบหรือไม่?</p>
                <p class="confirm-text" style="color:var(--danger);font-size:0.82rem;">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
            </div>
        `;
        const footer = `
            <button class="btn btn-ghost" onclick="App.closeModal()">ยกเลิก</button>
            <button class="btn btn-danger" onclick="App.confirmDeleteEmployee(${id})"><i class="fa-solid fa-trash-can"></i> ลบพนักงาน</button>
        `;
        showModal('ลบพนักงาน', body, footer);
    }

    async function confirmDeleteEmployee(id) {
        try {
            await api(`/api/employees/${id}`, { method: 'DELETE' });
            closeModal();
            showToast('ลบพนักงานสำเร็จ', 'success');
            loadEmployees();
        } catch (err) {
            showToast(`ลบพนักงานไม่สำเร็จ: ${err.message}`, 'error');
        }
    }

    // ─── Timesheet ───
    async function loadTimesheet() {
        const tbody = document.getElementById('timesheetTableBody');
        tbody.innerHTML = `<tr><td colspan="5"><div class="loading-spinner"></div></td></tr>`;

        try {
            const sel = document.getElementById('timesheetMonth');
            let query = '';
            if (sel && sel.value) {
                const [year, month] = sel.value.split('-');
                query = `?year=${year}&month=${month}`;
            }

            const response = await api(`/api/timesheet/status${query}`);
            state.timesheetData = response.data && response.data.employees ? response.data.employees : [];
            state.filteredTimesheet = [...state.timesheetData];

            // Apply current filter
            applyTimesheetFilter();

            // Render summary
            renderTimesheetSummary();
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state small"><i class="fa-solid fa-circle-exclamation"></i><p>ไม่สามารถโหลดข้อมูล Timesheet ได้</p></div></td></tr>`;
            showToast('ไม่สามารถโหลดข้อมูล Timesheet ได้', 'error');
        }
    }

    function filterTimesheet(status, btnEl) {
        state.filters.timesheetStatus = status;
        // Update active button
        document.querySelectorAll('.status-filters .filter-btn').forEach(b => b.classList.remove('active'));
        if (btnEl) btnEl.classList.add('active');
        applyTimesheetFilter();
    }

    function applyTimesheetFilter() {
        const status = state.filters.timesheetStatus;
        if (status === 'all') {
            state.filteredTimesheet = [...state.timesheetData];
        } else {
            state.filteredTimesheet = state.timesheetData.filter(t => t.status === status);
        }
        renderTimesheetTable(state.filteredTimesheet);
    }

    function renderTimesheetSummary() {
        const container = document.getElementById('timesheetSummary');
        if (!container) return;

        const completed = state.timesheetData.filter(t => t.status === 'completed').length;
        const inProgress = state.timesheetData.filter(t => t.status === 'in_progress').length;
        const notStarted = state.timesheetData.filter(t => t.status === 'not_started').length;

        container.innerHTML = `
            <div class="summary-item">
                <div class="summary-item-icon si-green"><i class="fa-solid fa-circle-check"></i></div>
                <div>
                    <div class="summary-item-value">${completed}</div>
                    <div class="summary-item-label">เสร็จแล้ว</div>
                </div>
            </div>
            <div class="summary-item">
                <div class="summary-item-icon si-yellow"><i class="fa-solid fa-spinner"></i></div>
                <div>
                    <div class="summary-item-value">${inProgress}</div>
                    <div class="summary-item-label">กำลังกรอก</div>
                </div>
            </div>
            <div class="summary-item">
                <div class="summary-item-icon si-red"><i class="fa-solid fa-circle-xmark"></i></div>
                <div>
                    <div class="summary-item-value">${notStarted}</div>
                    <div class="summary-item-label">ยังไม่เริ่ม</div>
                </div>
            </div>
        `;
    }

    function renderTimesheetTable(data) {
        const tbody = document.getElementById('timesheetTableBody');
        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state small"><i class="fa-solid fa-calendar-xmark"></i><p>ไม่พบข้อมูล Timesheet</p></div></td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(ts => {
            const empName = ts.employee_name || ts.employeeName ||
                            `${ts.first_name || ts.firstName || ''} ${ts.last_name || ts.lastName || ''}`.trim() || '—';
            const dept = ts.department || '—';
            const status = ts.status || 'not_started';
            const completedDate = ts.completed_at || ts.completedAt || ts.updated_at || ts.updatedAt || null;
            const empId = ts.employee_id || ts.employeeId || ts.id;

            return `
                <tr>
                    <td><div class="td-name">${empName}</div></td>
                    <td>${dept}</td>
                    <td>${getStatusBadge(status)}</td>
                    <td style="font-family:var(--font-en);font-size:0.85rem;color:var(--text-muted);">${status === 'completed' ? formatShortDate(completedDate) : '—'}</td>
                    <td>
                        <div class="td-actions">
                            <select class="status-select" onchange="App.updateTimesheetStatus(${empId}, this.value)" title="เปลี่ยนสถานะ">
                                <option value="not_started" ${status === 'not_started' ? 'selected' : ''}>ยังไม่เริ่ม</option>
                                <option value="in_progress" ${status === 'in_progress' ? 'selected' : ''}>กำลังกรอก</option>
                                <option value="completed" ${status === 'completed' ? 'selected' : ''}>เสร็จแล้ว</option>
                            </select>
                            ${status !== 'completed' ? `<button class="btn btn-success btn-sm" onclick="App.sendReminder(${empId})" title="ส่งเตือน LINE"><i class="fa-brands fa-line"></i></button>` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async function updateTimesheetStatus(employeeId, status) {
        try {
            await api(`/api/timesheet/${employeeId}`, {
                method: 'PUT',
                body: JSON.stringify({ status })
            });
            showToast('อัปเดตสถานะสำเร็จ', 'success');
            loadTimesheet();
            // Refresh dashboard stats in background
            loadDashboardStatsQuiet();
        } catch (err) {
            showToast(`อัปเดตสถานะไม่สำเร็จ: ${err.message}`, 'error');
            loadTimesheet();
        }
    }

    async function loadDashboardStatsQuiet() {
        try {
            const tsStats = await api('/api/timesheet/stats');
            state.timesheetStats = {
                total: tsStats.total || tsStats.totalEmployees || state.stats.total || 0,
                completed: tsStats.completed || 0,
                in_progress: tsStats.in_progress || tsStats.inProgress || 0,
                not_started: tsStats.not_started || tsStats.notStarted || 0
            };
            updateNotifBadge();
        } catch {
            // Silently fail
        }
    }

    // ─── Notifications ───
    async function loadNotifications() {
        const tbody = document.getElementById('notifTableBody');
        tbody.innerHTML = `<tr><td colspan="4"><div class="loading-spinner"></div></td></tr>`;

        try {
            const data = await api('/api/notifications/logs');
            state.notificationLogs = Array.isArray(data) ? data : (data.logs || data.data || []);
            state.filteredNotifLogs = [...state.notificationLogs];
            renderNotificationLogs(state.filteredNotifLogs);
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state small"><i class="fa-solid fa-circle-exclamation"></i><p>ไม่สามารถโหลดประวัติการแจ้งเตือนได้</p></div></td></tr>`;
            showToast('ไม่สามารถโหลดประวัติการแจ้งเตือนได้', 'error');
        }
    }

    function renderNotificationLogs(logs) {
        const tbody = document.getElementById('notifTableBody');
        if (!logs || logs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state small"><i class="fa-solid fa-bell-slash"></i><p>ยังไม่มีประวัติการแจ้งเตือน</p></div></td></tr>`;
            return;
        }

        tbody.innerHTML = logs.map(log => {
            const empName = log.employee_name || log.employeeName || '—';
            const type = log.type || log.notification_type || 'reminder';
            const status = log.status || 'sent';
            const sentAt = log.sent_at || log.sentAt || log.created_at || log.createdAt || '';

            return `
                <tr>
                    <td style="font-family:var(--font-en);font-size:0.85rem;color:var(--text-muted);">${formatDate(sentAt)}</td>
                    <td><div class="td-name">${empName}</div></td>
                    <td>${type === 'reminder' ? '<i class="fa-solid fa-bell" style="color:var(--warning);"></i> เตือน Timesheet' : type}</td>
                    <td>${getStatusBadge(status)}</td>
                </tr>
            `;
        }).join('');
    }

    function filterNotifications() {
        const status = document.getElementById('notifStatusFilter')?.value || '';
        state.filters.notifStatus = status;

        if (!status) {
            state.filteredNotifLogs = [...state.notificationLogs];
        } else {
            state.filteredNotifLogs = state.notificationLogs.filter(l => l.status === status);
        }
        renderNotificationLogs(state.filteredNotifLogs);
    }

    // ─── Send Reminders ───
    async function sendReminder(employeeId) {
        try {
            showToast('กำลังส่งเตือน...', 'info');
            const result = await api(`/api/notifications/send/${employeeId}`, { method: 'POST' });
            showToast(result.message || 'ส่งเตือนสำเร็จ', 'success');
            // Refresh notification logs if on that tab
            if (state.currentTab === 'notifications') loadNotifications();
            if (state.currentTab === 'dashboard') loadDashboard();
        } catch (err) {
            showToast(`ส่งเตือนไม่สำเร็จ: ${err.message}`, 'error');
        }
    }

    async function sendAllReminders() {
        // First get count of incomplete
        try {
            let incompleteCount = state.timesheetStats.not_started || 0;
            const inProg = state.timesheetStats.in_progress || 0;
            const totalToSend = incompleteCount + inProg;

            // Try fetching the actual incomplete list for a more accurate count
            try {
                const incomplete = await api('/api/timesheet/incomplete');
                const list = Array.isArray(incomplete) ? incomplete : (incomplete.timesheets || incomplete.data || []);
                if (list.length > 0) {
                    const body = `
                        <div class="confirm-content">
                            <div class="confirm-icon ci-success"><i class="fa-brands fa-line"></i></div>
                            <h3>ส่งเตือนทั้งหมด</h3>
                            <p class="confirm-text">จำนวนพนักงานที่จะได้รับการแจ้งเตือน</p>
                            <div class="confirm-count">${list.length} คน</div>
                            <p class="confirm-text">ระบบจะส่งข้อความเตือนผ่าน LINE Bot<br>ไปยังพนักงานที่ยังไม่ได้กรอก Timesheet</p>
                        </div>
                    `;
                    const footer = `
                        <button class="btn btn-ghost" onclick="App.closeModal()">ยกเลิก</button>
                        <button class="btn btn-success" onclick="App.confirmSendAll()"><i class="fa-solid fa-paper-plane"></i> ยืนยันส่งเตือน</button>
                    `;
                    showModal('ยืนยันส่งเตือน', body, footer);
                    return;
                }
            } catch {
                // Fallback: use stats
            }

            if (totalToSend === 0) {
                showToast('พนักงานทุกคนกรอก Timesheet แล้ว 🎉', 'success');
                return;
            }

            const body = `
                <div class="confirm-content">
                    <div class="confirm-icon ci-success"><i class="fa-brands fa-line"></i></div>
                    <h3>ส่งเตือนทั้งหมด</h3>
                    <p class="confirm-text">จำนวนพนักงานที่จะได้รับการแจ้งเตือน</p>
                    <div class="confirm-count">${totalToSend} คน</div>
                    <p class="confirm-text">ระบบจะส่งข้อความเตือนผ่าน LINE Bot</p>
                </div>
            `;
            const footer = `
                <button class="btn btn-ghost" onclick="App.closeModal()">ยกเลิก</button>
                <button class="btn btn-success" onclick="App.confirmSendAll()"><i class="fa-solid fa-paper-plane"></i> ยืนยันส่งเตือน</button>
            `;
            showModal('ยืนยันส่งเตือน', body, footer);
        } catch (err) {
            showToast('ไม่สามารถเตรียมข้อมูลได้', 'error');
        }
    }

    async function confirmSendAll() {
        closeModal();
        showToast('กำลังส่งเตือนทั้งหมด...', 'info');
        try {
            const result = await api('/api/notifications/send-all', { method: 'POST' });
            const sent = result.sent || result.successCount || result.total || 0;
            const failed = result.failed || result.failCount || 0;
            if (failed > 0) {
                showToast(`ส่งเตือนสำเร็จ ${sent} คน, ไม่สำเร็จ ${failed} คน`, 'warning');
            } else {
                showToast(result.message || `ส่งเตือนสำเร็จ ${sent} คน`, 'success');
            }
            // Refresh data
            if (state.currentTab === 'notifications') loadNotifications();
            if (state.currentTab === 'dashboard') loadDashboard();
        } catch (err) {
            showToast(`ส่งเตือนไม่สำเร็จ: ${err.message}`, 'error');
        }
    }

    // ═══════════════════════════════════════════════
    //  INITIALIZATION
    // ═══════════════════════════════════════════════

    async function init() {
        // Setup clock
        updateClock();
        setInterval(updateClock, 1000);

        // Populate month selector
        populateMonthSelector();

        // Setup navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                switchTab(item.dataset.tab);
            });
        });

        // Hamburger
        document.getElementById('hamburgerBtn')?.addEventListener('click', openSidebar);
        document.getElementById('sidebarClose')?.addEventListener('click', closeSidebar);

        // Notification bell -> go to notifications
        document.getElementById('headerNotificationBell')?.addEventListener('click', () => {
            switchTab('notifications');
        });

        // Debounced search
        const searchInput = document.getElementById('employeeSearch');
        if (searchInput) {
            searchInput.addEventListener('input', debounce(filterEmployees, 300));
        }

        // Close modal on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeModal();
        });

        // Load initial data
        await loadDashboard();
    }

    // Start the app
    document.addEventListener('DOMContentLoaded', init);

    // ─── Public API ───
    return {
        switchTab,
        addEmployee,
        editEmployee,
        deleteEmployee,
        submitAddEmployee,
        submitEditEmployee,
        confirmDeleteEmployee,
        sendReminder,
        sendAllReminders,
        confirmSendAll,
        updateTimesheetStatus,
        filterEmployees,
        filterTimesheet,
        filterNotifications,
        loadTimesheet,
        showToast,
        closeModal
    };
})();

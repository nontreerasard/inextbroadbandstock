document.addEventListener('DOMContentLoaded', () => {
    loadInitialData();
});

async function loadInitialData() {
    try {
        // โหลดข้อมูล stocks ก่อน
        await loadStockData(false);
        // จากนั้นค่อยเช็ค session
        await checkLoginStatus();
    } catch (error) {
        console.error('Error loading initial data:', error);
    }
}

async function checkLoginStatus() {
    try {
        const response = await fetch('/api/check-session');
        const data = await response.json();
        updateUIForLoginStatus(data.isLoggedIn, data.role);
    } catch (error) {
        console.error('Session check error:', error);
    }
}

function updateUIForLoginStatus(isLoggedIn, role) {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const historyBtn = document.getElementById('historyBtn');
    
    if (isLoggedIn) {
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'block';
        historyBtn.style.display = 'block'; // แสดงปุ่มประวัติเมื่อล็อกอิน
        loadStockData(role === 'admin');
    } else {
        loginBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
        historyBtn.style.display = 'none'; // ซ่อนปุ่มประวัติเมื่อไม่ได้ล็อกอิน
        loadStockData(false);
    }
}

function showLoginPopup() {
    const modal = document.getElementById('loginPopup');
    modal.style.display = 'flex';
}

function hideLoginPopup() {
    const modal = document.getElementById('loginPopup');
    modal.style.display = 'none';
}

async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        if (data.success) {
            alert('Login successful');
            // เก็บ role ไว้ใน localStorage เพื่อใช้ตรวจสอบสถานะ
            localStorage.setItem('userRole', data.role);
            updateUIForLoginStatus(true, data.role);
            hideLoginPopup();
        } else {
            alert('Login failed. Please check your credentials.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred during login.');
    }
}

async function logout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST'
        });
        if (response.ok) {
            updateUIForLoginStatus(false, null);
            localStorage.removeItem('userRole'); // ลบ role เมื่อออกจากระบบ
            // เพิ่มการย้ายกลับไปหน้าหลักถ้ากำลังดูประวัติอยู่
            if (document.getElementById('historyPage').style.display === 'block') {
                hideHistory();
            }
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
}

async function loadStockData(isAdmin = false) {
    try {
        const response = await fetch('/api/stocks');
        if (!response.ok) throw new Error('Failed to load stock data');
        
        const stocks = await response.json();
        updateStockTable(stocks, isAdmin);
    } catch (error) {
        console.error('Error:', error);
    }
}

function updateStockTable(stocks, isAdmin) {
    const tbody = document.querySelector('#stockTable tbody');
    tbody.innerHTML = '';
    
    stocks.forEach(stock => {
        const row = document.createElement('tr');
        const statusClass = stock.status === 'ว่าง' ? 'status-available' : 'status-borrowed';
        row.innerHTML = `
            <td>${stock.model}</td>
            <td>${stock.serialNumber}</td>
            <td>${isAdmin ? stock.borrowCode : ''}</td>
            <td>${isAdmin ? stock.borrower : ''}</td>
            <td>${isAdmin ? formatDate(stock.borrowDate, false) : ''}</td>
            <td>${isAdmin ? formatDate(stock.dueDate, false) : ''}</td>
            <td class="${statusClass}">${stock.status}</td>
            <td>
                ${stock.status === 'ว่าง' ? `<button class="action-btn borrow-btn" onclick="showBorrowPopup(${stock.id})">ยืม</button>` : ''}
                ${isAdmin ? `<button class="action-btn edit-btn" onclick="editItem(${stock.id})">แก้ไข</button>` : ''}
                ${stock.status === 'ถูกยืม' && isAdmin ? `<button class="action-btn return-btn" onclick="returnItem(${stock.id})">คืน</button>` : ''}
            </td>
        `;
        tbody.appendChild(row);
    });
}

function showBorrowPopup(id) {
    const modal = document.getElementById('borrowPopup');
    document.getElementById('itemId').value = id;
    
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 7);
    
    document.getElementById('borrowDate').value = today;
    document.getElementById('borrowDate').min = today;
    document.getElementById('dueDate').value = defaultDueDate.toISOString().split('T')[0];
    document.getElementById('dueDate').min = today;
    
    modal.style.display = 'flex';
}

function hideBorrowPopup() {
    document.getElementById('borrowPopup').style.display = 'none';
    document.getElementById('borrowForm').reset();
}

function validateBorrowForm() {
    const borrowCode = document.getElementById('borrowCode').value.trim();
    const borrower = document.getElementById('borrowerName').value.trim();
    const borrowDate = document.getElementById('borrowDate').value;
    const dueDate = document.getElementById('dueDate').value;

    if (!borrowCode || !borrower || !borrowDate || !dueDate) {
        alert('กรุณากรอกข้อมูลให้ครบถ้วน');
        return false;
    }

    // ตรวจสอบวันที่
    const today = new Date();
    const borrowDateObj = new Date(borrowDate);
    const dueDateObj = new Date(dueDate);

    if (dueDateObj <= borrowDateObj) {
        alert('วันครบกำหนดต้องมากกว่าวันที่ยืม');
        return false;
    }

    return true;
}

async function submitBorrow(event) {
    event.preventDefault();
    if (!validateBorrowForm()) return;
    
    const id = document.getElementById('itemId').value;
    const borrowCode = document.getElementById('borrowCode').value;
    const borrower = document.getElementById('borrowerName').value;
    const borrowDate = document.getElementById('borrowDate').value;
    const dueDate = document.getElementById('dueDate').value;

    try {
        const response = await fetch('/api/borrow', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                id: parseInt(id),
                borrowCode,
                borrower, 
                borrowDate,
                dueDate
            })
        });

        const data = await response.json();
        if (data.success) {
            alert(`ยืมสำเร็จ\nรหัสการยืม: ${borrowCode}\nกำหนดคืน: ${dueDate}`);
            hideBorrowPopup();
            // เช็ค role จาก localStorage
            const isAdmin = localStorage.getItem('userRole') === 'admin';
            await loadStockData(isAdmin);
        } else {
            alert('ไม่สามารถยืมได้: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('เกิดข้อผิดพลาดในการยืม');
    }
}

async function returnItem(id) {
    try {
        const response = await fetch('/api/return', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id })
        });

        const data = await response.json();
        if (data.success) {
            alert('คืนอุปกรณ์เรียบร้อย');
            // เช็ค role จาก localStorage
            const isAdmin = localStorage.getItem('userRole') === 'admin';
            await loadStockData(isAdmin);
        } else {
            alert('ไม่สามารถคืนอุปกรณ์ได้: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('เกิดข้อผิดพลาดในการคืนอุปกรณ์');
    }
}

// ปรับปรุงฟังก์ชันค้นหา
document.getElementById('searchInput').addEventListener('input', function(e) {
    const searchText = e.target.value.toLowerCase().trim();
    if (searchText === '') {
        // แสดงทุกรายการเมื่อไม่มีการค้นหา
        document.querySelectorAll('#stockTable tbody tr').forEach(row => {
            row.style.display = '';
        });
        return;
    }

    const rows = document.querySelectorAll('#stockTable tbody tr');
    rows.forEach(row => {
        // ค้นหาเฉพาะในคอลัมน์ที่ต้องการ (model, serialNumber, borrower)
        const searchableColumns = [0, 1, 3]; // indexes ของคอลัมน์ที่ต้องการค้นหา
        const text = searchableColumns
            .map(index => row.cells[index].textContent.toLowerCase())
            .join(' ');
        row.style.display = text.includes(searchText) ? '' : 'none';
    });
});

function showHistory() {
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('historyPage').style.display = 'block';
    loadHistoryData();
}

function hideHistory() {
    document.getElementById('mainContent').style.display = 'block';
    document.getElementById('historyPage').style.display = 'none';
}

async function loadHistoryData() {
    try {
        const response = await fetch('/api/history');
        const history = await response.json();
        
        const tbody = document.querySelector('#historyTable tbody');
        tbody.innerHTML = '';
        
        if (history.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        ยังไม่มีประวัติการยืม-คืน
                    </td>
                </tr>
            `;
            return;
        }

        history.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.model}</td>
                <td>${item.serialNumber}</td>
                <td>${item.borrowCode}</td>
                <td>${item.borrower}</td>
                <td>${formatDate(item.borrowDate, true)}</td>
                <td>${item.returnDate ? formatDate(item.returnDate, true) : '-'}</td>
                <td>${formatDate(item.dueDate, true)}</td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error:', error);
        alert('ไม่สามารถโหลดข้อมูลประวัติได้');
    }
}

// เพิ่มฟังก์ชันจัดรูปแบบวันที่
function formatDate(dateString, includeTime = true) {
    if (!dateString) return '-';
    
    // แปลงวันที่เป็นเวลาท้องถิ่นของไทย
    const date = new Date(dateString);
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Asia/Bangkok'
    };
    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
        options.hour12 = false;
    }
    return date.toLocaleString('th-TH', options);
}

function showEditPopup(id) {
    const modal = document.getElementById('editPopup');
    const rows = document.querySelectorAll('#stockTable tbody tr');
    let rowToEdit;
    rows.forEach(row => {
        const editButton = row.querySelector(`button[onclick="editItem(${id})"]`);
        if (editButton) {
            rowToEdit = row;
        }
    });

    if (rowToEdit) {
        document.getElementById('editItemId').value = id;
        document.getElementById('editModel').value = rowToEdit.cells[0].textContent;
        document.getElementById('editSerialNumber').value = rowToEdit.cells[1].textContent;
        // เพิ่มข้อมูลการยืม
        document.getElementById('editBorrowCode').value = rowToEdit.cells[2].textContent;
        document.getElementById('editBorrower').value = rowToEdit.cells[3].textContent;
        document.getElementById('editBorrowDate').value = rowToEdit.cells[4].textContent;
        document.getElementById('editDueDate').value = rowToEdit.cells[5].textContent;
        
        // แสดง/ซ่อนฟิลด์ตามสถานะการยืม
        const isLent = rowToEdit.cells[6].textContent === 'ถูกยืม';
        const borrowFields = document.querySelectorAll('.borrow-fields');
        borrowFields.forEach(field => {
            field.style.display = isLent ? 'block' : 'none';
        });

        modal.style.display = 'flex';
    }
}

function hideEditPopup() {
    document.getElementById('editPopup').style.display = 'none';
    document.getElementById('editForm').reset();
}

function editItem(id) {
    showEditPopup(id);
}

async function submitEdit(event) {
    event.preventDefault();
    
    const id = document.getElementById('editItemId').value;
    const model = document.getElementById('editModel').value.trim();
    const serialNumber = document.getElementById('editSerialNumber').value.trim();
    const borrowCode = document.getElementById('editBorrowCode').value.trim();
    const borrower = document.getElementById('editBorrower').value.trim();
    const borrowDate = document.getElementById('editBorrowDate').value;
    const dueDate = document.getElementById('editDueDate').value;

    try {
        const response = await fetch('/api/edit-stock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                id: parseInt(id),
                model,
                serialNumber,
                borrowCode,
                borrower,
                borrowDate,
                dueDate
            })
        });

        const data = await response.json();
        if (data.success) {
            alert('แก้ไขข้อมูลสำเร็จ');
            hideEditPopup();
            const isAdmin = localStorage.getItem('userRole') === 'admin';
            await loadStockData(isAdmin);
        } else {
            alert('ไม่สามารถแก้ไขข้อมูลได้: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('เกิดข้อผิดพลาดในการแก้ไขข้อมูล');
    }
}
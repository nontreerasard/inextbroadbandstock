const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const sequelize = require('./config/database');
const { User, Stock } = require('./models/models');
const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'inext-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));
app.use(express.static('public'));

// Sync database
sequelize.sync().then(() => {
    console.log('Database synced');
}).catch(err => {
    console.error('Error syncing database:', err);
});

// Routes
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ where: { username, password } });
    if (user) {
        req.session.user = user;
        res.json({ success: true, role: user.role });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Logout failed' });
        }
        res.json({ success: true });
    });
});

app.get('/api/stocks', async (req, res) => {
    try {
        const isAdmin = req.session.user?.role === 'admin';
        const stocks = await Stock.findAll();
        const stockData = stocks.map(stock => {
            // ข้อมูลพื้นฐานที่ทุกคนเห็น
            const baseData = {
                id: stock.id,
                model: stock.model,
                serialNumber: stock.serialNumber,
                status: stock.status
            };

            // เพิ่มข้อมูลสำหรับ admin
            if (isAdmin) {
                return {
                    ...baseData,
                    borrowCode: stock.borrowCode,
                    borrower: stock.borrower,
                    borrowDate: stock.borrowDate,
                    dueDate: stock.dueDate
                };
            }

            // ข้อมูลสำหรับผู้ใช้ทั่วไป
            return {
                ...baseData,
                borrowCode: '',
                borrower: '',
                borrowDate: '',
                dueDate: ''
            };
        });

        res.json(stockData);
    } catch (error) {
        console.error('Error in /api/stocks:', error);
        res.status(500).json({ 
            success: false, 
            message: 'เกิดข้อผิดพลาดในการโหลดข้อมูล' 
        });
    }
});

app.post('/api/borrow', async (req, res) => {
    const { id, borrower, borrowDate, dueDate } = req.body;
    const stock = await Stock.findOne({ where: { id, status: 'ว่าง' } });
    if (stock) {
        stock.borrower = borrower;
        stock.borrowDate = borrowDate;
        stock.dueDate = dueDate;
        stock.status = 'ถูกยืม';
        await stock.save();
        res.json({ success: true });
    } else {
        res.status(400).json({ success: false, message: 'Item not available for borrowing' });
    }
});

app.post('/api/return', async (req, res) => {
    const { id } = req.body;
    const stock = await Stock.findOne({ where: { id, status: 'ถูกยืม' } });
    if (stock) {
        stock.borrower = '';
        stock.borrowDate = '';
        stock.dueDate = '';
        stock.returnDate = new Date().toISOString().split('T')[0];
        stock.status = 'ว่าง';
        await stock.save();
        res.json({ success: true });
    } else {
        res.status(400).json({ success: false, message: 'Item not available for return' });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
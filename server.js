/**
 * 報名取消系統 - Express 伺服器
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== 中介軟體設定 ====================

// 信任 proxy（用於正確取得 client IP）
app.set('trust proxy', 1);

// JSON 解析
app.use(express.json());

// CORS 設定
const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
    : ['http://localhost:3000'];

app.use(cors({
    origin: (origin, callback) => {
        // 允許無 origin 的請求（如 curl、Postman）
        if (!origin) return callback(null, true);
        if (corsOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('CORS 不允許此來源'));
        }
    },
    credentials: true
}));

// Rate Limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 分鐘
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // 每個 IP 最多 100 次
    message: {
        success: false,
        error: '請求過於頻繁，請稍後再試'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', limiter);

// 靜態檔案服務
app.use(express.static('public'));

// ==================== 路由 ====================

app.use('/api', apiRoutes);

// 根路徑導向前端頁面
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: './public' });
});

// 404 處理
app.use((req, res) => {
    res.status(404).json({ success: false, error: '找不到該資源' });
});

// 錯誤處理
app.use((err, req, res, next) => {
    console.error('伺服器錯誤:', err);
    res.status(500).json({
        success: false,
        error: '伺服器內部錯誤'
    });
});

// ==================== 啟動伺服器 ====================

app.listen(PORT, () => {
    console.log(`✓ 報名取消系統已啟動`);
    console.log(`✓ 網址: http://localhost:${PORT}`);
    console.log(`✓ API: http://localhost:${PORT}/api`);
});

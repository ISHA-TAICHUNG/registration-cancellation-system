# 報名取消系統 MVP

透過 Google Sheets 管理課程報名的取消系統。

## 功能特色

- ✅ 身分證字號查詢報名課程
- ✅ 確認機制（輸入「我確定取消」）
- ✅ 取消操作記錄（IP、User Agent、時間）
- ✅ 深色主題 UI
- ✅ Rate Limiting 保護
- ✅ CORS 白名單

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

```bash
cp .env.example .env
```

編輯 `.env` 檔案，填入：

- `GOOGLE_SHEET_ID`：Google Sheets 試算表 ID
- `GOOGLE_CREDENTIALS`：Service Account JSON（壓成單行）

### 3. 設定 Google Sheets

參考 `GOOGLE_SHEETS_TEMPLATE.md` 建立試算表欄位。

### 4. 啟動伺服器

```bash
npm start
```

開啟瀏覽器訪問 http://localhost:3000

---

## API 文件

### POST /api/query

查詢報名資料。

**Request Body:**
```json
{
  "id_number": "A123456789"
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "row_index": 2,
      "course_code": "CS101",
      "course_name": "Python 入門課程",
      "course_date": "2024-01-15",
      "status": "registered"
    }
  ]
}
```

### POST /api/cancel

取消報名。

**Request Body:**
```json
{
  "id_number": "A123456789",
  "course_code": "CS101",
  "confirm_text": "我確定取消"
}
```

**Response:**
```json
{
  "success": true,
  "message": "報名已成功取消"
}
```

---

## 測試指令

### 查詢報名

```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"id_number": "A123456789"}'
```

### 取消報名

```bash
curl -X POST http://localhost:3000/api/cancel \
  -H "Content-Type: application/json" \
  -d '{"id_number": "A123456789", "course_code": "CS101", "confirm_text": "我確定取消"}'
```

### 測試身分證格式錯誤

```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"id_number": "invalid"}'
```

預期回應：
```json
{
  "success": false,
  "error": "身分證字號格式不正確"
}
```

### 測試確認文字錯誤

```bash
curl -X POST http://localhost:3000/api/cancel \
  -H "Content-Type: application/json" \
  -d '{"id_number": "A123456789", "course_code": "CS101", "confirm_text": "取消"}'
```

預期回應：
```json
{
  "success": false,
  "error": "確認文字不正確，請輸入「我確定取消」"
}
```

---

## 專案結構

```
取消報名/
├── server.js              # Express 主程式
├── package.json           # 專案依賴
├── .env.example           # 環境變數範本
├── routes/
│   └── api.js            # API 路由
├── services/
│   └── googleSheets.js   # Google Sheets 服務
├── utils/
│   └── validators.js     # 驗證工具
├── public/
│   └── index.html        # 前端頁面
├── GOOGLE_SHEETS_TEMPLATE.md
└── README.md
```

---

## 安全注意事項

1. **永不提交 `.env` 檔案**到版本控制
2. Service Account 只授予必要的試算表權限
3. 生產環境使用 HTTPS
4. 設定適當的 CORS 白名單

# Google Sheets 欄位範本

## 設定步驟

1. 在 Google Sheets 建立新的試算表
2. 複製試算表的 ID（網址中 `/d/` 和 `/edit` 之間的部分）
3. 建立以下兩個工作表：

---

## 工作表 1：`registrations`（報名資料）

| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| id_number | course_code | course_name | course_date | status | cancelled_at | cancelled_by_ip | cancelled_by_ua |
| A123456789 | CS101 | Python 入門課程 | 2024-01-15 | registered | | | |
| A123456789 | CS102 | JavaScript 進階課程 | 2024-02-20 | registered | | | |
| B234567890 | CS101 | Python 入門課程 | 2024-01-15 | registered | | | |

### 欄位說明

| 欄位 | 類型 | 說明 |
|------|------|------|
| `id_number` | 文字 | 報名者身分證字號（必填） |
| `course_code` | 文字 | 課程代碼（必填） |
| `course_name` | 文字 | 課程名稱 |
| `course_date` | 日期 | 課程日期（YYYY-MM-DD 格式） |
| `status` | 文字 | 狀態：`registered`（已報名）或 `cancelled`（已取消） |
| `cancelled_at` | 日期時間 | 取消時間（ISO 8601 格式，由系統填入） |
| `cancelled_by_ip` | 文字 | 取消操作者 IP（由系統填入） |
| `cancelled_by_ua` | 文字 | 取消操作者 User Agent（由系統填入） |

---

## 工作表 2：`audit`（審計記錄）

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| timestamp | action | id_number | course_code | ip | user_agent |

### 欄位說明

| 欄位 | 類型 | 說明 |
|------|------|------|
| `timestamp` | 日期時間 | 操作時間 |
| `action` | 文字 | 動作類型（`cancel`） |
| `id_number` | 文字 | 身分證字號 |
| `course_code` | 文字 | 課程代碼 |
| `ip` | 文字 | 操作者 IP |
| `user_agent` | 文字 | 操作者 User Agent |

---

## 工作表 3：`search_logs`（搜尋紀錄）

| A | B | C | D | E |
|---|---|---|---|---|
| 查詢時間 | 身分證字號（遮蔽） | 查詢結果數量 | IP | User-Agent |

### 欄位說明

| 欄位 | 類型 | 說明 |
|------|------|------|
| `查詢時間` | 日期時間 | 搜尋時間（台灣時間，由系統填入） |
| `身分證字號（遮蔽）` | 文字 | 遮蔽後的身分證（例：A12****89，由系統填入） |
| `查詢結果數量` | 數字 | 該身分證查到的報名筆數（由系統填入） |
| `IP` | 文字 | 查詢者 IP（由系統填入） |
| `User-Agent` | 文字 | 查詢者瀏覽器資訊（由系統填入） |

> **注意**：此工作表需手動建立。在 Google Sheets 新增一個名為 `search_logs` 的工作表，並在第一行填入標題：`查詢時間`、`身分證字號（遮蔽）`、`查詢結果數量`、`IP`、`User-Agent`。

---

## 權限設定

確保 Service Account 有試算表的「編輯者」權限：

1. 在試算表右上角點擊「共用」
2. 輸入 Service Account 的 email（格式：`xxx@xxx.iam.gserviceaccount.com`）
3. 選擇「編輯者」權限
4. 點擊「傳送」

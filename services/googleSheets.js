/**
 * Google Sheets 服務
 */
const { google } = require('googleapis');

// 工作表名稱
const REGISTRATIONS_SHEET = 'registrations';

/**
 * 取得台灣時間字串 (UTC+8)
 * @returns {string} 格式：YYYY-MM-DD HH:mm:ss
 */
function getTaiwanTime() {
    return new Date().toLocaleString('zh-TW', {
        timeZone: 'Asia/Taipei',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}

// 快取認證實例
let authClient = null;
let sheetsClient = null;

/**
 * 取得 Google Sheets API 認證
 */
async function getAuth() {
    if (authClient) {
        return authClient;
    }

    let credentials;

    // 優先使用環境變數中的 JSON 字串
    if (process.env.GOOGLE_CREDENTIALS) {
        try {
            credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
        } catch (e) {
            throw new Error('GOOGLE_CREDENTIALS 環境變數格式錯誤，需為有效的 JSON 字串');
        }
    }
    // 其次使用檔案路徑
    else if (process.env.GOOGLE_CREDENTIALS_PATH) {
        const fs = require('fs');
        const path = require('path');
        const credPath = path.resolve(process.env.GOOGLE_CREDENTIALS_PATH);
        if (!fs.existsSync(credPath)) {
            throw new Error(`找不到憑證檔案: ${credPath}`);
        }
        credentials = JSON.parse(fs.readFileSync(credPath, 'utf8'));
    }
    else {
        throw new Error('請設定 GOOGLE_CREDENTIALS 或 GOOGLE_CREDENTIALS_PATH 環境變數');
    }

    authClient = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    return authClient;
}

/**
 * 取得 Sheets API 客戶端
 */
async function getSheetsClient() {
    if (sheetsClient) {
        return sheetsClient;
    }

    const auth = await getAuth();
    sheetsClient = google.sheets({ version: 'v4', auth });
    return sheetsClient;
}

/**
 * 取得試算表 ID
 */
function getSpreadsheetId() {
    const id = process.env.GOOGLE_SHEET_ID;
    if (!id) {
        throw new Error('請設定 GOOGLE_SHEET_ID 環境變數');
    }
    return id;
}

/**
 * 根據身分證查詢課程報名資料
 * @param {string} idNumber - 身分證字號
 * @returns {Promise<Array>} 課程列表
 */
async function queryRegistrations(idNumber) {
    const sheets = await getSheetsClient();
    const spreadsheetId = getSpreadsheetId();

    // 讀取所有報名資料
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${REGISTRATIONS_SHEET}!A:H`,
    });

    const rows = response.data.values || [];
    console.log('讀取到的資料行數:', rows.length);

    if (rows.length === 0) {
        return [];
    }

    // 第一列為標題（加入 trim 處理）
    const headers = rows[0].map(h => (h || '').toString().trim());
    console.log('標題列:', headers);

    // 使用中文標題
    const idIndex = headers.indexOf('身分證字號');
    const nameIndex = headers.indexOf('姓名');
    const courseNameIndex = headers.indexOf('課程名稱');
    const courseDateIndex = headers.indexOf('開課日期');
    const statusIndex = headers.indexOf('狀態');

    console.log('欄位索引 - 身分證字號:', idIndex, '姓名:', nameIndex, '課程名稱:', courseNameIndex);

    if (idIndex === -1) {
        throw new Error('試算表缺少「身分證字號」欄位。目前標題: ' + headers.join(', '));
    }

    // 過濾出符合身分證的資料
    const results = [];
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rowIdNumber = (row[idIndex] || '').toString().trim();
        console.log(`第 ${i + 1} 列，id_number: "${rowIdNumber}"，比對: "${idNumber}"`);

        if (rowIdNumber === idNumber) {
            results.push({
                row_index: i + 1, // 1-indexed for Google Sheets
                name: (row[nameIndex] || '').toString().trim(),
                course_name: (row[courseNameIndex] || '').toString().trim(),
                course_date: (row[courseDateIndex] || '').toString().trim(),
                status: (row[statusIndex] || 'registered').toString().trim(),
            });
        }
    }

    console.log('找到的結果數:', results.length);
    return results;
}

/**
 * 取消報名
 * @param {string} idNumber - 身分證字號
 * @param {string} courseName - 課程名稱
 * @param {string} clientIp - 客戶端 IP
 * @param {string} userAgent - User Agent
 * @returns {Promise<boolean>} 是否成功
 */
async function cancelRegistration(idNumber, courseName, clientIp, userAgent) {
    const sheets = await getSheetsClient();
    const spreadsheetId = getSpreadsheetId();

    // 先查詢確認資料存在
    const registrations = await queryRegistrations(idNumber);
    const target = registrations.find(r => r.course_name === courseName);

    if (!target) {
        throw new Error('找不到該報名資料');
    }

    if (target.status === '已取消') {
        throw new Error('此課程報名已經取消');
    }

    const cancelledAt = getTaiwanTime();

    // 更新主工作表
    // 欄位順序：A=id_number, B=name, C=course_name, D=course_date, E=status, F=cancelled_at, G=cancelled_by_ip, H=cancelled_by_ua
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${REGISTRATIONS_SHEET}!E${target.row_index}:H${target.row_index}`,
        valueInputOption: 'USER_ENTERED',
        resource: {
            values: [['已取消', cancelledAt, clientIp, userAgent]]
        }
    });

    return true;
}

/**
 * 確認上課
 * @param {string} idNumber - 身分證字號
 * @param {string} courseName - 課程名稱
 * @param {string} clientIp - 客戶端 IP
 * @param {string} userAgent - User Agent
 * @returns {Promise<boolean>} 是否成功
 */
async function confirmRegistration(idNumber, courseName, clientIp, userAgent) {
    const sheets = await getSheetsClient();
    const spreadsheetId = getSpreadsheetId();

    // 先查詢確認資料存在
    const registrations = await queryRegistrations(idNumber);
    const target = registrations.find(r => r.course_name === courseName);

    if (!target) {
        throw new Error('找不到該報名資料');
    }

    if (target.status === '已確認') {
        throw new Error('此課程報名已經確認');
    }

    if (target.status === '已取消') {
        throw new Error('此課程報名已經取消，無法確認');
    }

    const confirmedAt = getTaiwanTime();

    // 更新主工作表
    // 欄位順序：A=id_number, B=name, C=course_name, D=course_date, E=status, F=confirmed_at/cancelled_at, G=ip, H=ua
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${REGISTRATIONS_SHEET}!E${target.row_index}:H${target.row_index}`,
        valueInputOption: 'USER_ENTERED',
        resource: {
            values: [['已確認', confirmedAt, clientIp, userAgent]]
        }
    });

    return true;
}

module.exports = {
    queryRegistrations,
    cancelRegistration,
    confirmRegistration
};

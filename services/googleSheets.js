/**
 * Google Sheets 服務
 */
const { google } = require('googleapis');
const { sendCancellationNotice } = require('./lineNotify');

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

/**
 * 遮蔽姓名中間字元
 * @param {string} name - 原始姓名
 * @returns {string} 遮蔽後的姓名（例：王＊明）
 */
function maskName(name) {
    if (!name || name.length < 2) return name;
    if (name.length === 2) {
        return name[0] + '＊';
    }
    // 3 字以上：保留首尾，中間全部遮蔽
    const first = name[0];
    const last = name[name.length - 1];
    const maskedMiddle = '＊'.repeat(name.length - 2);
    return first + maskedMiddle + last;
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
 * 根據身分證和生日查詢課程報名資料
 * @param {string} idNumber - 身分證字號
 * @param {string} birthday - 生日（民國年7碼，如 0810516）
 * @returns {Promise<Array>} 課程列表
 */
async function queryRegistrations(idNumber, birthday) {
    const sheets = await getSheetsClient();
    const spreadsheetId = getSpreadsheetId();

    // 讀取所有報名資料（A:J 欄位）
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${REGISTRATIONS_SHEET}!A:J`,
    });

    const rows = response.data.values || [];

    if (rows.length === 0) {
        return [];
    }

    // 第一列為標題（加入 trim 處理）
    const headers = rows[0].map(h => (h || '').toString().trim());

    // 使用中文標題（新欄位結構：A:身分證 B:姓名 C:生日 D:課程名稱 E:開課日期 F:狀態 G:時間 H:IP I:UA J:LINE ID）
    const idIndex = headers.indexOf('身分證字號');
    const nameIndex = headers.indexOf('姓名');
    const birthdayIndex = headers.indexOf('生日');
    const courseNameIndex = headers.indexOf('課程名稱');
    const courseDateIndex = headers.indexOf('開課日期');
    const statusIndex = headers.indexOf('狀態');

    if (idIndex === -1) {
        throw new Error('試算表缺少「身分證字號」欄位');
    }

    if (birthdayIndex === -1) {
        throw new Error('試算表缺少「生日」欄位');
    }

    // 過濾出符合身分證和生日的資料
    const results = [];
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rowIdNumber = (row[idIndex] || '').toString().trim();
        const rowBirthday = (row[birthdayIndex] || '').toString().trim();

        // 需要身分證和生日都符合
        if (rowIdNumber === idNumber && rowBirthday === birthday) {
            results.push({
                row_index: i + 1, // 1-indexed for Google Sheets
                name: (row[nameIndex] || '').toString().trim(),
                birthday: rowBirthday,
                course_name: (row[courseNameIndex] || '').toString().trim(),
                course_date: (row[courseDateIndex] || '').toString().trim(),
                status: (row[statusIndex] || 'registered').toString().trim(),
            });
        }
    }

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
    // 欄位順序：A=id_number, B=name, C=birthday, D=course_name, E=course_date, F=status, G=cancelled_at, H=cancelled_by_ip, I=cancelled_by_ua
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${REGISTRATIONS_SHEET}!F${target.row_index}:I${target.row_index}`,
        valueInputOption: 'USER_ENTERED',
        resource: {
            values: [['已取消', cancelledAt, clientIp, userAgent]]
        }
    });

    // 讀取承辦人 LINE ID (J 欄 = 第 10 欄)
    try {
        const lineIdResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${REGISTRATIONS_SHEET}!J${target.row_index}`,
        });

        const handlerLineId = lineIdResponse.data.values?.[0]?.[0];

        if (handlerLineId) {
            await sendCancellationNotice({
                id_number: idNumber,
                name: target.name,
                course_name: courseName,
                course_date: target.course_date
            }, handlerLineId);
        } else {
            console.log('該筆資料沒有承辦人 LINE ID，跳過通知');
        }
    } catch (lineError) {
        console.error('LINE 通知發送失敗:', lineError);
        // 不影響取消流程，只記錄錯誤
    }

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
    // 欄位順序：A=id_number, B=name, C=birthday, D=course_name, E=course_date, F=status, G=confirmed_at/cancelled_at, H=ip, I=ua
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${REGISTRATIONS_SHEET}!F${target.row_index}:I${target.row_index}`,
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
    confirmRegistration,
    maskName
};

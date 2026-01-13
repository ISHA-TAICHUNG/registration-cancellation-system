/**
 * LINE 通知服務
 */

const LINE_API_URL = 'https://api.line.me/v2/bot/message/push';

/**
 * 發送 LINE 訊息
 * @param {string} userId - LINE User ID
 * @param {string} message - 訊息內容
 * @returns {Promise<boolean>} 是否成功
 */
async function sendLineMessage(userId, message) {
    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

    if (!channelAccessToken) {
        console.warn('LINE_CHANNEL_ACCESS_TOKEN 未設定，跳過 LINE 通知');
        return false;
    }

    if (!userId) {
        console.warn('LINE User ID 為空，跳過 LINE 通知');
        return false;
    }

    try {
        const response = await fetch(LINE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${channelAccessToken}`
            },
            body: JSON.stringify({
                to: userId,
                messages: [{ type: 'text', text: message }]
            })
        });

        // 先檢查 HTTP 狀態
        if (response.ok) {
            console.log('LINE 通知發送成功');
            return true;
        }

        // 嘗試解析錯誤訊息
        try {
            const result = await response.json();
            console.error('LINE 通知發送失敗:', result);
        } catch {
            console.error('LINE 通知發送失敗，狀態碼:', response.status);
        }
        return false;
    } catch (error) {
        console.error('LINE 通知發送錯誤:', error);
        return false;
    }
}

/**
 * 發送取消通知
 * @param {object} registration - 報名資料
 * @param {string} handlerLineId - 承辦人 LINE ID
 */
async function sendCancellationNotice(registration, handlerLineId) {
    const message = `📢 報名取消通知

📚 課程名稱：${registration.course_name}
👤 姓名：${registration.name}
🆔 身分證字號：${registration.id_number}
📅 開課日期：${registration.course_date}
❌ 狀態：已取消
⏰ 取消時間：${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}`;

    return await sendLineMessage(handlerLineId, message);
}

module.exports = {
    sendLineMessage,
    sendCancellationNotice
};

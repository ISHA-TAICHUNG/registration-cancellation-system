const LINE_API_URL = 'https://api.line.me/v2/bot/message/push';

async function sendLineMessage(userId, message) {
    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!channelAccessToken || !userId) return false;
    try {
        const response = await fetch(LINE_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${channelAccessToken}` },
            body: JSON.stringify({ to: userId, messages: [{ type: 'text', text: message }] })
        });
        return response.ok;
    } catch (error) { console.error('LINE error:', error); return false; }
}

async function sendCancellationNotice(reg, lineId) {
    const msg = `📢 報名取消通知\n\n📚 課程：${reg.course_name}\n👤 姓名：${reg.name}\n🆔 身分證：${reg.id_number}\n📅 日期：${reg.course_date}\n❌ 已取消`;
    return await sendLineMessage(lineId, msg);
}

module.exports = { sendLineMessage, sendCancellationNotice };

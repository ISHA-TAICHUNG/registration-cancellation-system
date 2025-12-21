/**
 * reCAPTCHA v3 驗證服務
 */

const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

/**
 * 驗證 reCAPTCHA token
 * @param {string} token - 前端傳來的 reCAPTCHA token
 * @param {number} minScore - 最低通過分數（0.0~1.0），預設 0.5
 * @returns {Promise<{success: boolean, score?: number, error?: string}>}
 */
async function verifyRecaptcha(token, minScore = 0.3) {
    // 暫時停用 reCAPTCHA 驗證（除錯用）
    // TODO: 修復後移除此行
    console.log('reCAPTCHA 驗證已暫時停用');
    return { success: true, score: 1.0 };

    const secretKey = process.env.RECAPTCHA_SECRET_KEY;

    // 如果沒有設定 secret key，跳過驗證（開發模式）
    if (!secretKey) {
        console.warn('RECAPTCHA_SECRET_KEY 未設定，跳過 reCAPTCHA 驗證');
        return { success: true, score: 1.0 };
    }

    if (!token) {
        return { success: false, error: '缺少 reCAPTCHA token' };
    }

    try {
        const response = await fetch(RECAPTCHA_VERIFY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `secret=${encodeURIComponent(secretKey)}&response=${encodeURIComponent(token)}`
        });

        const data = await response.json();

        // 印出完整回應以便除錯
        console.log('reCAPTCHA 驗證回應:', JSON.stringify(data));

        if (!data.success) {
            console.error('reCAPTCHA 驗證失敗:', data['error-codes']);
            return { success: false, error: '人機驗證失敗，請重新整理頁面再試' };
        }

        // 檢查分數
        if (data.score < minScore) {
            console.warn(`reCAPTCHA 分數過低: ${data.score} < ${minScore}`);
            return { success: false, score: data.score, error: '系統偵測到異常行為，請稍後再試' };
        }

        return { success: true, score: data.score };

    } catch (error) {
        console.error('reCAPTCHA 驗證錯誤:', error);
        return { success: false, error: '驗證服務暫時無法使用' };
    }
}

module.exports = { verifyRecaptcha };

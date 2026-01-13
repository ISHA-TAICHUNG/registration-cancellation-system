/**
 * API 路由
 */
const express = require('express');
const router = express.Router();
const { validateIdNumber, formatIdNumber } = require('../utils/validators');
const { queryRegistrations, cancelRegistration, confirmRegistration } = require('../services/googleSheets');
const { verifyRecaptcha } = require('../services/recaptcha');

/**
 * POST /api/query
 * 根據身分證查詢課程報名資料
 */
router.post('/query', async (req, res) => {
    try {
        const { id_number, recaptcha_token } = req.body;

        // reCAPTCHA 驗證
        const recaptchaResult = await verifyRecaptcha(recaptcha_token);
        if (!recaptchaResult.success) {
            return res.status(403).json({
                success: false,
                error: recaptchaResult.error || '人機驗證失敗'
            });
        }

        if (!id_number) {
            return res.status(400).json({
                success: false,
                error: '請提供身分證字號'
            });
        }

        const formattedId = formatIdNumber(id_number);

        if (!validateIdNumber(formattedId)) {
            return res.status(400).json({
                success: false,
                error: '身分證字號格式不正確'
            });
        }

        const registrations = await queryRegistrations(formattedId);

        // 直接返回完整資料（不遮蔽姓名）
        const responseData = registrations.map(r => ({
            ...r,
            name_full: r.name  // 完整姓名供外部連結使用
        }));

        res.json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error('查詢錯誤:', error);
        res.status(500).json({
            success: false,
            error: error.message || '查詢時發生錯誤'
        });
    }
});

/**
 * POST /api/cancel
 * 取消課程報名
 */
router.post('/cancel', async (req, res) => {
    try {
        const { id_number, course_name, confirm_text } = req.body;

        // 驗證必要欄位
        if (!id_number || !course_name || !confirm_text) {
            return res.status(400).json({
                success: false,
                error: '請提供完整資料（身分證、課程名稱、確認文字）'
            });
        }

        // 驗證確認文字
        if (confirm_text !== '我確定取消') {
            return res.status(400).json({
                success: false,
                error: '確認文字不正確，請輸入「我確定取消」'
            });
        }

        const formattedId = formatIdNumber(id_number);

        if (!validateIdNumber(formattedId)) {
            return res.status(400).json({
                success: false,
                error: '身分證字號格式不正確'
            });
        }

        // 取得客戶端資訊
        const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';

        await cancelRegistration(formattedId, course_name, clientIp, userAgent);

        res.json({
            success: true,
            message: '報名已成功取消'
        });

    } catch (error) {
        console.error('取消錯誤:', error);
        res.status(500).json({
            success: false,
            error: error.message || '取消報名時發生錯誤'
        });
    }
});

/**
 * POST /api/confirm
 * 確認上課
 */
router.post('/confirm', async (req, res) => {
    try {
        const { id_number, course_name } = req.body;

        // 驗證必要欄位
        if (!id_number || !course_name) {
            return res.status(400).json({
                success: false,
                error: '請提供完整資料（身分證、課程名稱）'
            });
        }

        const formattedId = formatIdNumber(id_number);

        if (!validateIdNumber(formattedId)) {
            return res.status(400).json({
                success: false,
                error: '身分證字號格式不正確'
            });
        }

        // 取得客戶端資訊
        const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';

        await confirmRegistration(formattedId, course_name, clientIp, userAgent);

        res.json({
            success: true,
            message: '已成功確認上課'
        });

    } catch (error) {
        console.error('確認錯誤:', error);
        res.status(500).json({
            success: false,
            error: error.message || '確認上課時發生錯誤'
        });
    }
});

module.exports = router;

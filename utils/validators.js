/**
 * 身分證字號驗證工具
 */

/**
 * 驗證台灣身分證字號格式
 * @param {string} idNumber - 身分證字號
 * @returns {boolean} 是否為有效格式
 */
function validateIdNumber(idNumber) {
    if (!idNumber || typeof idNumber !== 'string') {
        return false;
    }

    // 基本格式檢查：1 個英文字母 + 9 個數字
    const pattern = /^[A-Z][12]\d{8}$/;
    return pattern.test(idNumber.toUpperCase());
}

/**
 * 格式化身分證字號（轉大寫）
 * @param {string} idNumber - 身分證字號
 * @returns {string} 格式化後的身分證字號
 */
function formatIdNumber(idNumber) {
    if (!idNumber || typeof idNumber !== 'string') {
        return '';
    }
    return idNumber.toUpperCase().trim();
}

module.exports = {
    validateIdNumber,
    formatIdNumber
};

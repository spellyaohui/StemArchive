/**
 * 体检日期获取服务
 * 统一从第三方只读数据库获取体检日期
 */

const thirdPartyExaminationService = require('./thirdPartyExaminationService');

class ExaminationDateService {
    constructor() {
        this.retryCount = parseInt(process.env.THIRD_DB_RETRY_COUNT || '3', 10);
        this.retryDelay = parseInt(process.env.THIRD_DB_RETRY_DELAY || '1000', 10);
        console.log('体检日期服务初始化完成 - 数据源: 第三方只读数据库');
    }

    /**
     * 根据体检ID获取体检日期
     * @param {string} studyId - 体检ID
     * @returns {Promise<string|null>} 体检日期，格式：YYYY-MM-DD HH:mm:ss，失败返回null
     */
    async getExaminationDate(studyId) {
        if (!studyId) {
            console.warn('体检日期获取服务：体检ID不能为空');
            return null;
        }

        for (let attempt = 1; attempt <= this.retryCount; attempt++) {
            try {
                const examinationDate = await thirdPartyExaminationService.getExaminationDate(studyId);
                if (examinationDate) {
                    console.log(`✅ 成功获取体检日期：${studyId} -> ${examinationDate}`);
                    return examinationDate;
                }

                console.warn(`⚠️ 体检ID ${studyId} 未找到对应的体检日期`);
                return null;
            } catch (error) {
                console.error(`❌ 第${attempt}次尝试获取体检日期失败：`, error.message);
                if (attempt < this.retryCount) {
                    await this.delay(this.retryDelay);
                }
            }
        }

        console.error(`💥 获取体检日期最终失败：${studyId}`);
        return null;
    }

    /**
     * 批量获取体检日期
     * @param {Array<string>} studyIds - 体检ID数组
     * @returns {Promise<Map>} 体检ID到日期的映射
     */
    async getBatchExaminationDates(studyIds) {
        if (!Array.isArray(studyIds) || studyIds.length === 0) {
            return new Map();
        }

        const results = new Map();
        const promises = studyIds.map(async (studyId) => {
            const date = await this.getExaminationDate(studyId);
            if (date) {
                results.set(studyId, date);
            }
        });

        await Promise.all(promises);
        return results;
    }

    getDateFieldNameByDepartment(departmentType) {
        const fieldMapping = {
            laboratory: 'CheckDate',
            general: 'AssessmentDate',
            imaging: 'ExamDate',
            instrument: 'TestDate'
        };

        return fieldMapping[departmentType] || 'CheckDate';
    }

    getDateDisplayNameByDepartment(departmentType) {
        const nameMapping = {
            laboratory: '检验日期',
            general: '评估日期',
            imaging: '检查日期',
            instrument: '测试日期'
        };

        return nameMapping[departmentType] || '体检日期';
    }

    isValidDateFormat(dateStr) {
        if (!dateStr || typeof dateStr !== 'string') {
            return false;
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
        if (!dateRegex.test(dateStr)) {
            return false;
        }

        const date = new Date(dateStr);
        return !isNaN(date.getTime());
    }

    formatDateForDatabase(dateStr) {
        if (!dateStr) {
            return null;
        }

        if (this.isValidDateFormat(dateStr)) {
            return dateStr;
        }

        try {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                const seconds = String(date.getSeconds()).padStart(2, '0');

                return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
            }
        } catch (error) {
            console.error('日期格式化失败:', error);
        }

        return null;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async healthCheck() {
        try {
            await thirdPartyExaminationService.getExaminationDate('TEST_HEALTH_CHECK');
            return {
                status: 'healthy',
                message: '第三方体检日期服务正常',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                message: `第三方体检日期服务异常：${error.message}`,
                timestamp: new Date().toISOString()
            };
        }
    }
}

const examinationDateService = new ExaminationDateService();

module.exports = examinationDateService;

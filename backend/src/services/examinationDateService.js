/**
 * 体检日期获取服务
 * 统一从第三方API获取体检日期
 * 支持所有科室的体检日期获取
 */

const axios = require('axios');

class ExaminationDateService {
    constructor() {
        // 优先使用完整URL配置，其次使用分离的IP端口配置
        if (process.env.EXAMINATION_API_BASE_URL) {
            this.apiBaseURL = process.env.EXAMINATION_API_BASE_URL;
        } else if (process.env.EXAMINATION_API_HOST && process.env.EXAMINATION_API_PORT) {
            const host = process.env.EXAMINATION_API_HOST;
            const port = process.env.EXAMINATION_API_PORT;
            this.apiBaseURL = `http://${host}:${port}/api`;
        } else {
            throw new Error('第三方体检API配置缺失：请设置EXAMINATION_API_BASE_URL或EXAMINATION_API_HOST和EXAMINATION_API_PORT环境变量');
        }

        this.timeout = parseInt(process.env.EXAMINATION_API_TIMEOUT) || 10000;
        this.retryCount = parseInt(process.env.EXAMINATION_API_RETRY_COUNT) || 3;
        this.retryDelay = parseInt(process.env.EXAMINATION_API_RETRY_DELAY) || 1000;

        console.log(`体检日期服务初始化完成 - API地址: ${this.apiBaseURL}, 超时: ${this.timeout}ms`);
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

        console.log(`正在获取体检ID ${studyId} 的体检日期...`);

        for (let attempt = 1; attempt <= this.retryCount; attempt++) {
            try {
                const response = await this.callThirdPartyAPI(studyId);

                if (response && response.code === 200) {
                    const examinationDate = response.data;

                    if (examinationDate) {
                        console.log(`✅ 成功获取体检日期：${studyId} -> ${examinationDate}`);
                        return examinationDate;
                    } else {
                        console.warn(`⚠️ 体检ID ${studyId} 未找到对应的体检日期`);
                        return null;
                    }
                } else {
                    throw new Error(`API返回异常状态码：${response ? response.code : 'unknown'}`);
                }
            } catch (error) {
                console.error(`❌ 第${attempt}次尝试获取体检日期失败：`, error.message);

                if (attempt < this.retryCount) {
                    console.log(`等待 ${this.retryDelay}ms 后重试...`);
                    await this.delay(this.retryDelay);
                }
            }
        }

        console.error(`💥 获取体检日期最终失败：${studyId}`);
        return null;
    }

    /**
     * 调用第三方API
     * @param {string} studyId - 体检ID
     * @returns {Promise<Object>} API响应结果
     */
    async callThirdPartyAPI(studyId) {
        const url = `${this.apiBaseURL}/get_tjrq`;
        const payload = { studyId };

        console.log(`调用第三方API：${url}，参数：${JSON.stringify(payload)}`);

        const response = await axios.post(url, payload, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'HealthManagementSystem/1.0'
            },
            timeout: this.timeout
        });

        return response.data;
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

        console.log(`批量获取 ${studyIds.length} 个体检ID的日期...`);

        const results = new Map();
        const promises = studyIds.map(async (studyId) => {
            const date = await this.getExaminationDate(studyId);
            if (date) {
                results.set(studyId, date);
            }
        });

        await Promise.all(promises);

        console.log(`批量获取完成，成功获取 ${results.size} 个体检日期`);
        return results;
    }

    /**
     * 根据科室类型获取对应的日期字段名称
     * @param {string} departmentType - 科室类型
     * @returns {string} 日期字段名称
     */
    getDateFieldNameByDepartment(departmentType) {
        const fieldMapping = {
            'laboratory': 'CheckDate',      // 检验科 - 检验日期
            'general': 'AssessmentDate',   // 常规科室 - 评估日期
            'imaging': 'ExamDate',         // 影像科室 - 检查日期
            'instrument': 'TestDate'       // 仪器室 - 测试日期
        };

        return fieldMapping[departmentType] || 'CheckDate';
    }

    /**
     * 根据科室类型格式化日期显示名称
     * @param {string} departmentType - 科室类型
     * @returns {string} 日期显示名称
     */
    getDateDisplayNameByDepartment(departmentType) {
        const nameMapping = {
            'laboratory': '检验日期',
            'general': '评估日期',
            'imaging': '检查日期',
            'instrument': '测试日期'
        };

        return nameMapping[departmentType] || '体检日期';
    }

    /**
     * 验证日期格式
     * @param {string} dateStr - 日期字符串
     * @returns {boolean} 是否为有效格式
     */
    isValidDateFormat(dateStr) {
        if (!dateStr || typeof dateStr !== 'string') {
            return false;
        }

        // 检查格式：YYYY-MM-DD HH:mm:ss
        const dateRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
        if (!dateRegex.test(dateStr)) {
            return false;
        }

        // 验证是否为有效日期
        const date = new Date(dateStr);
        return !isNaN(date.getTime());
    }

    /**
     * 格式化日期为数据库格式
     * @param {string} dateStr - 原始日期字符串
     * @returns {string} 格式化后的日期字符串
     */
    formatDateForDatabase(dateStr) {
        if (!dateStr) {
            return null;
        }

        // 如果已经是正确格式，直接返回
        if (this.isValidDateFormat(dateStr)) {
            return dateStr;
        }

        // 尝试解析并重新格式化
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

    /**
     * 延迟函数
     * @param {number} ms - 延迟毫秒数
     * @returns {Promise}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 健康检查服务状态
     * @returns {Promise<Object>} 服务状态信息
     */
    async healthCheck() {
        try {
            const testStudyId = 'TEST_HEALTH_CHECK';
            const response = await this.callThirdPartyAPI(testStudyId);

            return {
                status: 'healthy',
                apiURL: this.apiBaseURL,
                message: '第三方体检日期API服务正常',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                apiURL: this.apiBaseURL,
                message: `第三方体检日期API服务异常：${error.message}`,
                timestamp: new Date().toISOString()
            };
        }
    }
}

// 创建单例实例
const examinationDateService = new ExaminationDateService();

module.exports = examinationDateService;
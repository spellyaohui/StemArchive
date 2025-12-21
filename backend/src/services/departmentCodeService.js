/**
 * 科室编码获取服务
 * 从第三方API获取体检ID对应的科室编码列表
 * 支持科室编码验证和映射
 */

const axios = require('axios');

class DepartmentCodeService {
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

        console.log(`科室编码服务初始化完成 - API地址: ${this.apiBaseURL}, 超时: ${this.timeout}ms`);
    }

    /**
     * 根据体检ID获取科室编码列表
     * @param {string} studyId - 体检ID
     * @returns {Promise<Array<string>>} 科室编码数组，失败返回空数组
     */
    async getDepartmentCodes(studyId) {
        if (!studyId) {
            console.warn('科室编码获取服务：体检ID不能为空');
            return [];
        }

        console.log(`正在获取体检ID ${studyId} 的科室编码...`);

        for (let attempt = 1; attempt <= this.retryCount; attempt++) {
            try {
                const response = await this.callGetKsbmAPI(studyId);

                if (response && response.code === 200) {
                    const ksbmString = response.data;

                    if (ksbmString && typeof ksbmString === 'string') {
                        // 使用"+"分隔符解析科室编码
                        const codes = ksbmString.split('+').filter(code => code.trim() !== '');
                        console.log(`✅ 成功获取科室编码：${studyId} -> [${codes.join(', ')}]`);
                        return codes;
                    } else {
                        console.warn(`⚠️ 体检ID ${studyId} 未找到对应的科室编码`);
                        return [];
                    }
                } else {
                    throw new Error(`API返回异常状态码：${response ? response.code : 'unknown'}`);
                }
            } catch (error) {
                console.error(`❌ 第${attempt}次尝试获取科室编码失败：`, error.message);

                if (attempt < this.retryCount) {
                    console.log(`等待 ${this.retryDelay}ms 后重试...`);
                    await this.delay(this.retryDelay);
                }
            }
        }

        console.error(`💥 获取科室编码最终失败：${studyId}`);
        return [];
    }

    /**
     * 调用第三方API获取科室编码
     * @param {string} studyId - 体检ID
     * @returns {Promise<Object>} API响应结果
     */
    async callGetKsbmAPI(studyId) {
        const url = `${this.apiBaseURL}/get_ksbm`;
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
     * 根据身份证号获取体检ID列表
     * @param {string} identityCard - 身份证号
     * @returns {Promise<Array<string>>} 体检ID数组，失败返回空数组
     */
    async getExaminationIds(identityCard) {
        if (!identityCard) {
            console.warn('体检ID获取服务：身份证号不能为空');
            return [];
        }

        console.log(`正在获取身份证号 ${identityCard} 的体检ID列表...`);

        for (let attempt = 1; attempt <= this.retryCount; attempt++) {
            try {
                const url = `${this.apiBaseURL}/examination-ids/${identityCard}`;
                console.log(`调用第三方API：${url}`);

                const response = await axios.get(url, {
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'HealthManagementSystem/1.0'
                    },
                    timeout: this.timeout
                });

                if (response.data && response.data.code === 200) {
                    const examIds = response.data.data || [];
                    console.log(`✅ 成功获取体检ID列表：${identityCard} -> ${examIds.length} 条记录`);
                    return examIds;
                } else {
                    throw new Error(`API返回异常状态码：${response.data ? response.data.code : 'unknown'}`);
                }
            } catch (error) {
                console.error(`❌ 第${attempt}次尝试获取体检ID列表失败：`, error.message);

                if (attempt < this.retryCount) {
                    console.log(`等待 ${this.retryDelay}ms 后重试...`);
                    await this.delay(this.retryDelay);
                }
            }
        }

        console.error(`💥 获取体检ID列表最终失败：${identityCard}`);
        return [];
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
            await this.callGetKsbmAPI(testStudyId);

            return {
                status: 'healthy',
                apiURL: this.apiBaseURL,
                message: '第三方科室编码API服务正常',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                apiURL: this.apiBaseURL,
                message: `第三方科室编码API服务异常：${error.message}`,
                timestamp: new Date().toISOString()
            };
        }
    }
}

// 创建单例实例
const departmentCodeService = new DepartmentCodeService();

module.exports = departmentCodeService;

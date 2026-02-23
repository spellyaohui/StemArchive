/**
 * 科室编码获取服务
 * 直接从第三方只读数据库获取体检ID与科室编码
 */

const thirdPartyExaminationService = require('./thirdPartyExaminationService');

class DepartmentCodeService {
    constructor() {
        this.retryCount = parseInt(process.env.THIRD_DB_RETRY_COUNT || '3', 10);
        this.retryDelay = parseInt(process.env.THIRD_DB_RETRY_DELAY || '1000', 10);
        console.log('科室编码服务初始化完成 - 数据源: 第三方只读数据库');
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

        for (let attempt = 1; attempt <= this.retryCount; attempt++) {
            try {
                const codes = await thirdPartyExaminationService.getDepartmentCodes(studyId);
                console.log(`✅ 成功获取科室编码：${studyId} -> [${codes.join(', ')}]`);
                return codes;
            } catch (error) {
                console.error(`❌ 第${attempt}次尝试获取科室编码失败：`, error.message);
                if (attempt < this.retryCount) {
                    await this.delay(this.retryDelay);
                }
            }
        }

        console.error(`💥 获取科室编码最终失败：${studyId}`);
        return [];
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

        for (let attempt = 1; attempt <= this.retryCount; attempt++) {
            try {
                const examIds = await thirdPartyExaminationService.getExaminationIds(identityCard);
                console.log(`✅ 成功获取体检ID列表：${identityCard} -> ${examIds.length} 条记录`);
                return examIds;
            } catch (error) {
                console.error(`❌ 第${attempt}次尝试获取体检ID列表失败：`, error.message);
                if (attempt < this.retryCount) {
                    await this.delay(this.retryDelay);
                }
            }
        }

        console.error(`💥 获取体检ID列表最终失败：${identityCard}`);
        return [];
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async healthCheck() {
        try {
            // 使用格式正确但通常不存在数据的身份证号做只读健康检查
            await thirdPartyExaminationService.getExaminationIds('110101199001011234');
            return {
                status: 'healthy',
                message: '第三方只读数据库服务正常',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                message: `第三方只读数据库服务异常：${error.message}`,
                timestamp: new Date().toISOString()
            };
        }
    }
}

const departmentCodeService = new DepartmentCodeService();

module.exports = departmentCodeService;

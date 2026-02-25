/**
 * 体检数据自动导入服务
 * 定时检查JZCIS数据库，自动导入已审核完成的新体检数据
 * 
 * 判断依据：JLB表中 SHYS 字段不为空，表示该体检ID的数据已审核就绪
 * 去重依据：对比本系统已导入的体检ID，只处理新增的
 */

const { executeQuery, sql } = require('../../config/database');
const { executeThirdPartyReadQuery } = require('../../config/thirdPartyDatabase');
const examinationDataImportService = require('./examinationDataImportService');
const thirdPartyExaminationService = require('./thirdPartyExaminationService');
const logger = require('../utils/logger');

class AutoImportService {
    constructor() {
        this.isRunning = false;
        this.intervalId = null;
        this.lastRunTime = null;
        this.lastRunResult = null;
        this.runCount = 0;
    }

    /**
     * 启动自动导入定时任务
     */
    start() {
        const enabled = (process.env.AUTO_IMPORT_ENABLED || 'false').toLowerCase() === 'true';
        if (!enabled) {
            console.log('ℹ️ 自动导入服务已禁用（AUTO_IMPORT_ENABLED=false）');
            return;
        }

        const intervalMinutes = parseInt(process.env.AUTO_IMPORT_INTERVAL_MINUTES || '30', 10);
        const intervalMs = intervalMinutes * 60 * 1000;

        console.log(`🔄 自动导入服务已启动，执行间隔: ${intervalMinutes} 分钟`);

        // 启动后延迟30秒执行第一次，避免与服务器启动冲突
        setTimeout(() => {
            this.run();
        }, 30 * 1000);

        // 设置定时执行
        this.intervalId = setInterval(() => {
            this.run();
        }, intervalMs);
    }

    /**
     * 停止自动导入定时任务
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('🛑 自动导入服务已停止');
        }
    }

    /**
     * 执行一次自动导入
     */
    async run() {
        if (this.isRunning) {
            console.log('⚠️ 自动导入任务正在执行中，跳过本次');
            return { skipped: true, reason: '上一次任务仍在执行中' };
        }

        this.isRunning = true;
        this.lastRunTime = new Date();
        this.runCount++;
        const startTime = Date.now();

        const result = {
            runNumber: this.runCount,
            startTime: this.lastRunTime.toISOString(),
            customersChecked: 0,
            newExamIdsFound: 0,
            readyToImport: 0,
            importedSuccess: 0,
            importedFailed: 0,
            details: [],
            errors: []
        };

        try {
            console.log(`\n========================================`);
            console.log(`🔄 自动导入任务 #${this.runCount} 开始执行`);
            console.log(`========================================`);

            // 1. 获取系统中所有活跃检客
            const customers = await this.getAllActiveCustomers();
            result.customersChecked = customers.length;
            console.log(`📋 系统中共有 ${customers.length} 位活跃检客`);

            if (customers.length === 0) {
                result.message = '系统中没有活跃检客，无需处理';
                this.lastRunResult = result;
                this.isRunning = false;
                return result;
            }

            // 2. 逐个检客检查新增体检ID
            for (const customer of customers) {
                try {
                    const customerResult = await this.checkAndImportForCustomer(customer);
                    if (customerResult) {
                        result.newExamIdsFound += customerResult.newExamIds;
                        result.readyToImport += customerResult.readyCount;
                        result.importedSuccess += customerResult.successCount;
                        result.importedFailed += customerResult.failedCount;
                        if (customerResult.newExamIds > 0) {
                            result.details.push(customerResult);
                        }
                    }
                } catch (error) {
                    const errMsg = `检客 ${customer.Name}(${customer.IdentityCard}) 处理失败: ${error.message}`;
                    console.error(`❌ ${errMsg}`);
                    result.errors.push(errMsg);
                }
            }

            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            result.elapsedSeconds = parseFloat(elapsed);
            result.message = `自动导入完成: 检查 ${result.customersChecked} 位检客，` +
                `发现 ${result.newExamIdsFound} 个新体检ID，` +
                `${result.readyToImport} 个已就绪，` +
                `成功导入 ${result.importedSuccess} 个，` +
                `失败 ${result.importedFailed} 个，` +
                `耗时 ${elapsed}s`;

            console.log(`✅ ${result.message}`);
            console.log(`========================================\n`);

        } catch (error) {
            console.error('❌ 自动导入任务执行失败:', error);
            result.errors.push(`任务执行失败: ${error.message}`);
            result.message = `自动导入失败: ${error.message}`;

            if (logger && logger.error) {
                logger.error('自动导入任务执行失败', { error: error.message, stack: error.stack });
            }
        } finally {
            this.isRunning = false;
            this.lastRunResult = result;
        }

        return result;
    }

    /**
     * 获取系统中所有活跃检客
     * @returns {Promise<Array>} 检客列表（ID、身份证号、姓名）
     */
    async getAllActiveCustomers() {
        const result = await executeQuery(`
            SELECT ID, IdentityCard, Name
            FROM Customers
            WHERE Status = 'Active' AND IdentityCard IS NOT NULL AND IdentityCard != ''
            ORDER BY CreatedAt DESC
        `, []);
        return result || [];
    }

    /**
     * 获取某个检客在本系统中已导入的所有体检ID
     * @param {string} customerId - 客户ID
     * @returns {Promise<Set<string>>} 已导入的体检ID集合
     */
    async getImportedExamIds(customerId) {
        const importedIds = new Set();

        // 从 HealthAssessments 表获取（常规/影像/仪器科室数据）
        const haResult = await executeQuery(`
            SELECT DISTINCT MedicalExamID FROM HealthAssessments
            WHERE CustomerID = @customerId AND MedicalExamID IS NOT NULL
        `, [{ name: 'customerId', value: customerId, type: sql.UniqueIdentifier }]);

        if (haResult) {
            haResult.forEach(row => importedIds.add(row.MedicalExamID));
        }

        // 从 LaboratoryData 表获取（检验科数据）
        const labResult = await executeQuery(`
            SELECT DISTINCT ExamId FROM LaboratoryData
            WHERE CustomerID = @customerId AND ExamId IS NOT NULL
        `, [{ name: 'customerId', value: customerId, type: sql.UniqueIdentifier }]);

        if (labResult) {
            labResult.forEach(row => importedIds.add(row.ExamId));
        }

        return importedIds;
    }

    /**
     * 检查体检ID在JZCIS中是否已审核就绪（SHYS不为空）
     * @param {string} studyId - 体检ID
     * @returns {Promise<boolean>} 是否就绪
     */
    async isExamReady(studyId) {
        try {
            const result = await executeThirdPartyReadQuery(
                `SELECT SHYS FROM JLB WHERE StudyID = @studyId`,
                [{ name: 'studyId', value: studyId }]
            );

            if (!result || result.length === 0) {
                return false;
            }

            // SHYS 不为空且不为空字符串，表示已审核就绪
            const shys = result[0].SHYS;
            return shys !== null && shys !== undefined && String(shys).trim() !== '';
        } catch (error) {
            console.warn(`⚠️ 检查体检ID ${studyId} 就绪状态失败: ${error.message}`);
            return false;
        }
    }

    /**
     * 检查并导入单个检客的新增体检数据
     * @param {Object} customer - 检客信息 {ID, IdentityCard, Name}
     * @returns {Promise<Object|null>} 处理结果
     */
    async checkAndImportForCustomer(customer) {
        const { ID: customerId, IdentityCard: identityCard, Name: name } = customer;

        // 1. 从JZCIS获取该检客的所有体检ID
        let allExamIds;
        try {
            allExamIds = await thirdPartyExaminationService.getExaminationIds(identityCard);
        } catch (error) {
            // 身份证号格式不合法等情况，静默跳过
            return null;
        }

        if (!allExamIds || allExamIds.length === 0) {
            return null;
        }

        // 2. 获取本系统已导入的体检ID
        const importedIds = await this.getImportedExamIds(customerId);

        // 3. 找出新增的体检ID（JZCIS有但本系统没有的）
        const newExamIds = allExamIds.filter(id => !importedIds.has(id));

        if (newExamIds.length === 0) {
            return null;
        }

        console.log(`👤 ${name}(${identityCard}): 发现 ${newExamIds.length} 个新体检ID: [${newExamIds.join(', ')}]`);

        // 4. 逐个检查是否已审核就绪
        let readyCount = 0;
        let successCount = 0;
        let failedCount = 0;
        const importDetails = [];

        for (const examId of newExamIds) {
            const ready = await this.isExamReady(examId);

            if (!ready) {
                console.log(`  ⏳ 体检ID ${examId} 尚未审核就绪，跳过`);
                importDetails.push({ examId, status: 'not_ready' });
                continue;
            }

            readyCount++;
            console.log(`  ✅ 体检ID ${examId} 已就绪，开始导入...`);

            try {
                // 调用现有导入服务导入单个体检记录
                const systemDepartments = await examinationDataImportService.getSystemDepartments();
                const importResult = await examinationDataImportService.processExamination(
                    examId, customerId, systemDepartments
                );

                const processedCount = importResult.processed.length;
                successCount++;
                importDetails.push({
                    examId,
                    status: 'imported',
                    departments: processedCount,
                    detail: importResult
                });
                console.log(`  ✅ 体检ID ${examId} 导入成功，处理了 ${processedCount} 个科室`);
            } catch (error) {
                failedCount++;
                importDetails.push({ examId, status: 'failed', error: error.message });
                console.error(`  ❌ 体检ID ${examId} 导入失败: ${error.message}`);
            }
        }

        return {
            customerId,
            customerName: name,
            identityCard,
            newExamIds: newExamIds.length,
            readyCount,
            successCount,
            failedCount,
            importDetails
        };
    }

    /**
     * 获取服务状态
     * @returns {Object} 服务状态信息
     */
    getStatus() {
        const enabled = (process.env.AUTO_IMPORT_ENABLED || 'false').toLowerCase() === 'true';
        const intervalMinutes = parseInt(process.env.AUTO_IMPORT_INTERVAL_MINUTES || '30', 10);

        return {
            enabled,
            intervalMinutes,
            isRunning: this.isRunning,
            runCount: this.runCount,
            lastRunTime: this.lastRunTime ? this.lastRunTime.toISOString() : null,
            lastRunResult: this.lastRunResult,
            nextRunTime: this.lastRunTime && this.intervalId
                ? new Date(this.lastRunTime.getTime() + intervalMinutes * 60 * 1000).toISOString()
                : null
        };
    }
}

// 单例
const autoImportService = new AutoImportService();

module.exports = autoImportService;

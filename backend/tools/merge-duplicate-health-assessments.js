/**
 * 健康评估重复数据合并工具
 * 用于处理同一人同一天存在多个不同体检ID的健康评估记录
 */

require('dotenv').config();
const { executeQuery, sql } = require('../config/database');
const unifiedHealthAssessmentService = require('../src/services/unifiedHealthAssessmentService');

class DuplicateHealthAssessmentMerger {
    constructor() {
        this.mergedCount = 0;
        this.errorCount = 0;
        this.processedCustomers = new Set();
    }

    /**
     * 查找所有有重复记录的客户
     */
    async findCustomersWithDuplicates() {
        console.log('🔍 查找有重复健康评估记录的客户...');

        const query = `
            SELECT
                CustomerID,
                COUNT(*) as RecordCount
            FROM HealthAssessments
            GROUP BY CustomerID
            HAVING COUNT(*) > 1
            ORDER BY RecordCount DESC
        `;

        try {
            const result = await executeQuery(query);
            console.log(`📊 找到 ${result.length} 个客户有重复记录`);

            // 获取每个客户的日期列表
            const customersWithDates = [];
            for (const row of result) {
                const datesQuery = `
                    SELECT DISTINCT CAST(AssessmentDate AS VARCHAR) AS AssessmentDate
                    FROM HealthAssessments
                    WHERE CustomerID = @customerId
                    ORDER BY AssessmentDate
                `;

                const dateParams = [
                    { name: 'customerId', value: row.CustomerID, type: sql.UniqueIdentifier }
                ];

                const dates = await executeQuery(datesQuery, dateParams);
                const dateList = dates.map(d => d.AssessmentDate).join(', ');

                customersWithDates.push({
                    customerId: row.CustomerID,
                    recordCount: row.RecordCount,
                    dates: dateList
                });
            }

            return customersWithDates;
        } catch (error) {
            console.error('❌ 查找重复记录失败:', error);
            throw error;
        }
    }

    /**
     * 按日期查找重复记录
     */
    async findDuplicatesByCustomer(customerId) {
        const query = `
            SELECT
                AssessmentDate,
                COUNT(*) as DailyCount
            FROM HealthAssessments
            WHERE CustomerID = @customerId
            GROUP BY AssessmentDate
            HAVING COUNT(*) > 1
            ORDER BY AssessmentDate DESC
        `;

        const params = [
            { name: 'customerId', value: customerId, type: sql.UniqueIdentifier }
        ];

        const result = await executeQuery(query, params);

        // 为每个重复日期获取对应的体检ID列表
        const duplicatesWithIds = [];
        for (const row of result) {
            const idsQuery = `
                SELECT MedicalExamID
                FROM HealthAssessments
                WHERE CustomerID = @customerId AND AssessmentDate = @assessmentDate
                ORDER BY CreatedAt
            `;

            const idsParams = [
                { name: 'customerId', value: customerId, type: sql.UniqueIdentifier },
                { name: 'assessmentDate', value: row.AssessmentDate, type: sql.Date }
            ];

            const ids = await executeQuery(idsQuery, idsParams);
            const idList = ids.map(i => i.MedicalExamID).join(', ');

            duplicatesWithIds.push({
                AssessmentDate: row.AssessmentDate,
                DailyCount: row.DailyCount,
                MedicalExamIDs: idList
            });
        }

        return duplicatesWithIds;
    }

    /**
     * 获取客户信息
     */
    async getCustomerInfo(customerId) {
        const query = `
            SELECT ID, Name, IdentityCard FROM Customers WHERE ID = @customerId
        `;

        const params = [
            { name: 'customerId', value: customerId, type: sql.UniqueIdentifier }
        ];

        const result = await executeQuery(query, params);
        return result.length > 0 ? result[0] : null;
    }

    /**
     * 合并指定客户的所有重复记录
     */
    async mergeCustomerDuplicates(customerId) {
        try {
            const customerInfo = await this.getCustomerInfo(customerId);
            if (!customerInfo) {
                console.warn(`⚠️ 未找到客户信息: ${customerId}`);
                return false;
            }

            console.log(`\n🔄 处理客户: ${customerInfo.Name} (${customerInfo.IdentityCard})`);

            const duplicatesByDate = await this.findDuplicatesByCustomer(customerId);

            if (duplicatesByDate.length === 0) {
                console.log(`  📋 客户 ${customerInfo.Name} 没有重复记录`);
                return true;
            }

            console.log(`  🔍 发现 ${duplicatesByDate.length} 天的重复记录`);

            let customerMergedCount = 0;
            for (const duplicate of duplicatesByDate) {
                console.log(`    📅 日期: ${duplicate.AssessmentDate}, 记录数: ${duplicate.DailyCount}, 体检ID: ${duplicate.MedicalExamIDs}`);

                try {
                    const masterRecord = await unifiedHealthAssessmentService.mergeDuplicateAssessments(
                        customerId,
                        duplicate.AssessmentDate
                    );

                    if (masterRecord) {
                        customerMergedCount++;
                        console.log(`    ✅ 合并成功，主记录ID: ${masterRecord.ID}, 体检ID: ${masterRecord.MedicalExamID}`);
                    }
                } catch (error) {
                    console.error(`    ❌ 合并失败: ${error.message}`);
                    this.errorCount++;
                }
            }

            this.mergedCount += customerMergedCount;
            console.log(`  📊 客户 ${customerInfo.Name} 合并完成，共合并 ${customerMergedCount} 条记录`);

            return true;
        } catch (error) {
            console.error(`❌ 处理客户 ${customerId} 失败:`, error);
            this.errorCount++;
            return false;
        }
    }

    /**
     * 合并所有重复记录
     */
    async mergeAllDuplicates() {
        console.log('🚀 开始合并所有重复的健康评估记录...\n');

        try {
            // 查找所有有重复记录的客户
            const customersWithDuplicates = await this.findCustomersWithDuplicates();

            if (customersWithDuplicates.length === 0) {
                console.log('✅ 没有发现重复记录，数据库数据正常');
                return;
            }

            console.log(`📋 将处理 ${customersWithDuplicates.length} 个客户的重复记录:\n`);

            // 逐个处理客户的重复记录
            for (const customer of customersWithDuplicates) {
                await this.mergeCustomerDuplicates(customer.customerId);
                this.processedCustomers.add(customer.customerId);
            }

            // 输出统计结果
            console.log('\n' + '='.repeat(60));
            console.log('📊 合并完成统计:');
            console.log(`  ✅ 成功处理客户数: ${this.processedCustomers.size}`);
            console.log(`  🔄 合并记录数: ${this.mergedCount}`);
            console.log(`  ❌ 错误次数: ${this.errorCount}`);
            console.log('='.repeat(60));

        } catch (error) {
            console.error('❌ 合并过程中发生严重错误:', error);
            throw error;
        }
    }

    /**
     * 验证合并结果
     */
    async validateMergeResults() {
        console.log('\n🔍 验证合并结果...');

        try {
            // 检查是否还有重复记录
            const remainingDuplicates = await this.findCustomersWithDuplicates();

            if (remainingDuplicates.length === 0) {
                console.log('✅ 验证通过：没有发现重复记录');
            } else {
                console.log(`⚠️ 警告：仍有 ${remainingDuplicates.length} 个客户存在重复记录`);
                remainingDuplicates.forEach(customer => {
                    console.log(`  - 客户ID: ${customer.customerId}, 记录数: ${customer.recordCount}`);
                });
            }

            // 统计总记录数
            const totalRecordsQuery = `SELECT COUNT(*) as Total FROM HealthAssessments`;
            const totalResult = await executeQuery(totalRecordsQuery);
            console.log(`📊 当前健康评估总记录数: ${totalResult[0].Total}`);

        } catch (error) {
            console.error('❌ 验证失败:', error);
        }
    }

    /**
     * 重置统计信息
     */
    resetStats() {
        this.mergedCount = 0;
        this.errorCount = 0;
        this.processedCustomers.clear();
    }
}

/**
 * 主执行函数
 */
async function main() {
    const merger = new DuplicateHealthAssessmentMerger();

    try {
        console.log('🏥 健康评估重复数据合并工具');
        console.log('=' .repeat(60));

        // 执行合并
        await merger.mergeAllDuplicates();

        // 验证结果
        await merger.validateMergeResults();

        console.log('\n✅ 工具执行完成');

    } catch (error) {
        console.error('\n💥 工具执行失败:', error);
        process.exit(1);
    }
}

// 如果直接运行此脚本，则执行合并
if (require.main === module) {
    main();
}

module.exports = DuplicateHealthAssessmentMerger;
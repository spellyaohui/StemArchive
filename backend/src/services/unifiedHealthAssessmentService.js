/**
 * 统一健康评估服务
 * 解决同一人同一天体检只有一个ID的问题
 * 确保不同科室在同一天录入数据时使用统一的体检ID和日期
 */

const { executeQuery, sql } = require('../../config/database');
const examinationDateService = require('./examinationDateService');
const crypto = require('crypto');

class UnifiedHealthAssessmentService {
    /**
     * 获取或创建统一的健康评估记录
     * @param {string} customerId - 客户ID
     * @param {string} department - 科室名称
     * @param {string} medicalExamId - 体检ID（可选，会通过API获取）
     * @param {string} doctor - 医生姓名（可选）
     * @param {string} createdBy - 创建人
     * @returns {Promise<Object>} 统一的健康评估记录
     */
    async getOrCreateUnifiedAssessment(customerId, department, medicalExamId = null, doctor = null, createdBy = 'system') {
        try {
            console.log(`🔍 获取或创建统一健康评估记录: 客户ID=${customerId}, 科室=${department}, 体检ID=${medicalExamId}`);

            // 如果没有提供体检ID，尝试生成一个
            let finalMedicalExamId = medicalExamId;
            let assessmentDate = null;

            if (finalMedicalExamId) {
                // 使用提供的体检ID获取体检日期
                assessmentDate = await examinationDateService.getExaminationDate(finalMedicalExamId);
                if (assessmentDate) {
                    console.log(`✅ 获取到体检日期: ${finalMedicalExamId} -> ${assessmentDate}`);
                    // 提取日期部分（去掉时间）
                    assessmentDate = assessmentDate.split(' ')[0];
                } else {
                    console.warn(`⚠️ 无法获取体检日期，使用当前日期: ${finalMedicalExamId}`);
                    assessmentDate = new Date().toISOString().split('T')[0];
                }
            } else {
                // 生成新的体检ID并获取日期
                finalMedicalExamId = this.generateMedicalExamId();
                assessmentDate = new Date().toISOString().split('T')[0];
                console.log(`🆕 生成新体检ID: ${finalMedicalExamId}, 日期: ${assessmentDate}`);
            }

            // 检查是否已存在相同体检ID和科室的健康评估记录
            const existingRecord = await this.findExistingAssessment(customerId, assessmentDate, finalMedicalExamId, department);

            if (existingRecord) {
                console.log(`📋 找到现有健康评估记录: ID=${existingRecord.ID}, 体检ID=${existingRecord.MedicalExamID}`);

                // 如果现有记录的体检ID与传入的不同，需要更新体检ID
                if (existingRecord.MedicalExamID !== finalMedicalExamId) {
                    console.log(`🔄 更新体检ID: ${existingRecord.MedicalExamID} -> ${finalMedicalExamId}`);
                    await this.updateMedicalExamId(existingRecord.ID, finalMedicalExamId);
                    existingRecord.MedicalExamID = finalMedicalExamId;
                }

                return existingRecord;
            }

            // 创建新的健康评估记录
            console.log(`➕ 创建新的健康评估记录: 客户ID=${customerId}, 体检ID=${finalMedicalExamId}, 日期=${assessmentDate}`);
            const newRecord = await this.createNewAssessment(
                customerId,
                finalMedicalExamId,
                assessmentDate,
                department,
                doctor,
                createdBy
            );

            return newRecord;

        } catch (error) {
            console.error('❌ 获取或创建统一健康评估失败:', error);
            throw error;
        }
    }

    /**
     * 查找现有的健康评估记录
     * @param {string} customerId - 客户ID
     * @param {string} assessmentDate - 评估日期
     * @param {string} medicalExamId - 体检ID（可选）
     * @param {string} department - 科室（可选）
     * @returns {Promise<Object|null>} 现有记录或null
     */
    async findExistingAssessment(customerId, assessmentDate, medicalExamId = null, department = null) {
        // 按体检ID和科室查找（唯一约束：MedicalExamID + Department）
        // 每个科室的数据应该独立存储，不能复用其他科室的记录
        if (medicalExamId && department) {
            const query = `
                SELECT TOP 1 * FROM HealthAssessments
                WHERE MedicalExamID = @medicalExamId AND Department = @department
                ORDER BY CreatedAt DESC
            `;

            const params = [
                { name: 'medicalExamId', value: medicalExamId, type: sql.NVarChar(100) },
                { name: 'department', value: department, type: sql.NVarChar(100) }
            ];

            const result = await executeQuery(query, params);
            if (result.length > 0) {
                return result[0];
            }
            
            // 如果没找到匹配的体检ID+科室组合，返回null让调用方创建新记录
            // 不再按客户ID+日期查找，避免复用其他科室的记录
            return null;
        }

        // 只有在没有提供科室时，才按客户ID和日期查找（向后兼容）
        if (!department) {
            const query = `
                SELECT TOP 1 * FROM HealthAssessments
                WHERE CustomerID = @customerId AND AssessmentDate = @assessmentDate
                ORDER BY CreatedAt DESC
            `;

            const params = [
                { name: 'customerId', value: customerId, type: sql.UniqueIdentifier },
                { name: 'assessmentDate', value: assessmentDate, type: sql.Date }
            ];

            const result = await executeQuery(query, params);
            return result.length > 0 ? result[0] : null;
        }

        return null;
    }

    /**
     * 更新体检ID
     * @param {string} assessmentId - 健康评估记录ID
     * @param {string} newMedicalExamId - 新的体检ID
     */
    async updateMedicalExamId(assessmentId, newMedicalExamId) {
        const query = `
            UPDATE HealthAssessments
            SET MedicalExamID = @newMedicalExamId, UpdatedAt = GETDATE()
            WHERE ID = @assessmentId
        `;

        const params = [
            { name: 'assessmentId', value: assessmentId, type: sql.UniqueIdentifier },
            { name: 'newMedicalExamId', value: newMedicalExamId, type: sql.NVarChar(100) }
        ];

        await executeQuery(query, params);
    }

    /**
     * 创建新的健康评估记录
     * @param {string} customerId - 客户ID
     * @param {string} medicalExamId - 体检ID
     * @param {string} assessmentDate - 评估日期
     * @param {string} department - 科室
     * @param {string} doctor - 医生
     * @param {string} createdBy - 创建人
     * @returns {Promise<Object>} 新创建的记录
     */
    async createNewAssessment(customerId, medicalExamId, assessmentDate, department, doctor, createdBy) {
        // 使用 crypto 生成 UUID
        const newId = crypto.randomUUID();
        
        const insertQuery = `
            INSERT INTO HealthAssessments (
                ID, CustomerID, AssessmentDate, Department, Doctor,
                MedicalExamID, Status, CreatedBy, CreatedAt, UpdatedAt
            )
            VALUES (
                @newId, @customerId, @assessmentDate, @department, @doctor,
                @medicalExamId, 'Active', @createdBy, GETDATE(), GETDATE()
            )
        `;

        const insertParams = [
            { name: 'newId', value: newId, type: sql.UniqueIdentifier },
            { name: 'customerId', value: customerId, type: sql.UniqueIdentifier },
            { name: 'medicalExamId', value: medicalExamId, type: sql.NVarChar(100) },
            { name: 'assessmentDate', value: assessmentDate, type: sql.Date },
            { name: 'department', value: department, type: sql.NVarChar(100) },
            { name: 'doctor', value: doctor || null, type: sql.NVarChar(100) },
            { name: 'createdBy', value: createdBy, type: sql.NVarChar(100) }
        ];

        await executeQuery(insertQuery, insertParams);

        // 查询刚插入的记录
        const selectQuery = `SELECT * FROM HealthAssessments WHERE ID = @newId`;
        const selectParams = [{ name: 'newId', value: newId, type: sql.UniqueIdentifier }];
        
        const result = await executeQuery(selectQuery, selectParams);
        return result[0];
    }

    /**
     * 生成体检ID
     * 格式：YYMMDD + 4位随机数
     * @returns {string} 生成的体检ID
     */
    generateMedicalExamId() {
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');

        return `${year}${month}${day}${random}`;
    }

    /**
     * 根据体检ID获取所有相关的健康评估记录
     * @param {string} medicalExamId - 体检ID
     * @returns {Promise<Array>} 相关的健康评估记录
     */
    async getAssessmentsByMedicalExamId(medicalExamId) {
        const query = `
            SELECT
                ha.*,
                c.Name as CustomerName,
                c.IdentityCard
            FROM HealthAssessments ha
            INNER JOIN Customers c ON ha.CustomerID = c.ID
            WHERE ha.MedicalExamID = @medicalExamId
            ORDER BY ha.Department, ha.CreatedAt
        `;

        const params = [
            { name: 'medicalExamId', value: medicalExamId, type: sql.NVarChar(100) }
        ];

        return await executeQuery(query, params);
    }

    /**
     * 合并重复的健康评估记录
     * 当发现同一客户同一天有多个不同体检ID的记录时，合并它们
     * @param {string} customerId - 客户ID
     * @param {string} assessmentDate - 评估日期
     * @returns {Promise<Object>} 合并后的主记录
     */
    async mergeDuplicateAssessments(customerId, assessmentDate) {
        console.log(`🔄 开始合并重复记录: 客户ID=${customerId}, 日期=${assessmentDate}`);

        // 查找所有重复记录
        const query = `
            SELECT * FROM HealthAssessments
            WHERE CustomerID = @customerId AND AssessmentDate = @assessmentDate
            ORDER BY CreatedAt
        `;

        const params = [
            { name: 'customerId', value: customerId, type: sql.UniqueIdentifier },
            { name: 'assessmentDate', value: assessmentDate, type: sql.Date }
        ];

        const duplicateRecords = await executeQuery(query, params);

        if (duplicateRecords.length <= 1) {
            console.log('📋 没有发现重复记录');
            return duplicateRecords[0] || null;
        }

        console.log(`🔍 发现 ${duplicateRecords.length} 条重复记录，开始合并...`);

        // 选择最早创建的记录作为主记录
        const masterRecord = duplicateRecords[0];
        const duplicateIds = duplicateRecords.slice(1).map(record => record.ID);

        // 更新相关联的数据表，将引用指向主记录
        await this.updateRelatedRecords(duplicateIds, masterRecord.ID);

        // 删除重复记录
        await this.deleteDuplicateRecords(duplicateIds);

        console.log(`✅ 合并完成，主记录ID: ${masterRecord.ID}`);
        return masterRecord;
    }

    /**
     * 更新相关记录，将引用指向主记录
     * @param {Array} duplicateIds - 要删除的记录ID数组
     * @param {string} masterId - 主记录ID
     */
    async updateRelatedRecords(duplicateIds, masterId) {
        // 这里可以更新其他表中引用这些记录的外键
        // 根据实际业务需求实现
        console.log(`🔄 更新相关记录引用: ${duplicateIds.length} 条记录指向主记录 ${masterId}`);

        // 示例：如果有的话，更新LabHealthData等表中的引用
        // const updateQuery = `UPDATE LabHealthData SET HealthAssessmentID = @masterId WHERE HealthAssessmentID IN (SELECT value FROM STRING_SPLIT(@duplicateIds, ','))`;
        // await executeQuery(updateQuery, [
        //     { name: 'masterId', value: masterId, type: sql.UniqueIdentifier },
        //     { name: 'duplicateIds', value: duplicateIds.join(','), type: sql.NVarChar }
        // ]);
    }

    /**
     * 删除重复记录
     * @param {Array} duplicateIds - 要删除的记录ID数组
     */
    async deleteDuplicateRecords(duplicateIds) {
        if (duplicateIds.length === 0) return;

        const placeholders = duplicateIds.map((_, index) => `@id${index}`).join(',');
        const params = duplicateIds.map((id, index) => ({
            name: `id${index}`,
            value: id,
            type: sql.UniqueIdentifier
        }));

        const query = `DELETE FROM HealthAssessments WHERE ID IN (${placeholders})`;
        await executeQuery(query, params);

        console.log(`🗑️ 删除了 ${duplicateIds.length} 条重复记录`);
    }
}

// 创建单例实例
const unifiedHealthAssessmentService = new UnifiedHealthAssessmentService();

module.exports = unifiedHealthAssessmentService;
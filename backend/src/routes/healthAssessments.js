const express = require('express');
const router = express.Router();
const { executeQuery, sql } = require('../../config/database');
const { validationResult } = require('express-validator');
const { validateCustomerExists } = require('../middleware/customerValidation');
const unifiedHealthAssessmentService = require('../services/unifiedHealthAssessmentService');

class HealthAssessment {
    // 创建健康评估
    static async create(assessmentData) {
        const {
            customerId,
            assessmentDate,
            department,
            doctor,
            assessmentData: data,
            summary,
            medicalExamId,
            createdBy
        } = assessmentData;

        const query = `
            DECLARE @NewID uniqueidentifier;
            SET @NewID = NEWID();

            INSERT INTO HealthAssessments (
                ID, CustomerID, AssessmentDate, Department, Doctor,
                AssessmentData, Summary, MedicalExamID, CreatedBy
            )
            VALUES (
                @NewID, @customerId, @assessmentDate, @department, @doctor,
                @data, @summary, @medicalExamId, @createdBy
            );

            SELECT * FROM HealthAssessments WHERE ID = @NewID;
        `;

        const params = [
            { name: 'customerId', value: customerId, type: sql.UniqueIdentifier },
            { name: 'assessmentDate', value: assessmentDate, type: sql.Date },
            { name: 'department', value: department, type: sql.NVarChar },
            { name: 'doctor', value: doctor, type: sql.NVarChar },
            { name: 'data', value: JSON.stringify(data), type: sql.NVarChar },
            { name: 'summary', value: summary, type: sql.NVarChar },
            { name: 'medicalExamId', value: medicalExamId, type: sql.NVarChar },
            { name: 'createdBy', value: createdBy, type: sql.NVarChar }
        ];

        const result = await executeQuery(query, params);
        return result[0];
    }

    // 根据客户ID获取健康评估
    static async getByCustomerId(customerId, page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const query = `
            SELECT * FROM HealthAssessments
            WHERE CustomerID = @customerId
            ORDER BY AssessmentDate DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;

            SELECT COUNT(*) as Total FROM HealthAssessments WHERE CustomerID = @customerId;
        `;

        const params = [
            { name: 'customerId', value: customerId, type: sql.UniqueIdentifier },
            { name: 'offset', value: offset, type: sql.Int },
            { name: 'limit', value: limit, type: sql.Int }
        ];

        const result = await executeQuery(query, params);
        const assessments = result.slice(0, -1);
        const total = result[result.length - 1].Total;

        return {
            assessments,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    // 根据体检ID获取健康评估
    static async getByMedicalExamId(medicalExamId) {
        const query = `
            SELECT
                ha.*,
                c.Name as CustomerName,
                c.IdentityCard
            FROM HealthAssessments ha
            INNER JOIN Customers c ON ha.CustomerID = c.ID
            WHERE ha.MedicalExamID = @medicalExamId;
        `;

        const params = [
            { name: 'medicalExamId', value: medicalExamId, type: sql.NVarChar }
        ];

        const result = await executeQuery(query, params);
        return result.length > 0 ? result[0] : null;
    }

    // 根据科室获取健康评估
    static async getByDepartment(department, page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const query = `
            SELECT
                ha.*,
                c.Name as CustomerName,
                c.IdentityCard
            FROM HealthAssessments ha
            INNER JOIN Customers c ON ha.CustomerID = c.ID
            WHERE ha.Department = @department
            ORDER BY ha.AssessmentDate DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;

            SELECT COUNT(*) as Total FROM HealthAssessments WHERE Department = @department;
        `;

        const params = [
            { name: 'department', value: department, type: sql.NVarChar },
            { name: 'offset', value: offset, type: sql.Int },
            { name: 'limit', value: limit, type: sql.Int }
        ];

        const result = await executeQuery(query, params);
        const assessments = result.slice(0, -1);
        const total = result[result.length - 1].Total;

        return {
            assessments,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    // 更新健康评估
    static async update(id, updateData) {
        const {
            assessmentDate,
            department,
            doctor,
            assessmentData: data,
            summary
        } = updateData;

        const query = `
            UPDATE HealthAssessments SET
                AssessmentDate = @assessmentDate,
                Department = @department,
                Doctor = @doctor,
                AssessmentData = @data,
                Summary = @summary,
                UpdatedAt = GETDATE()
            WHERE ID = @id;

            SELECT * FROM HealthAssessments WHERE ID = @id;
        `;

        const params = [
            { name: 'id', value: id, type: sql.UniqueIdentifier },
            { name: 'assessmentDate', value: assessmentDate, type: sql.Date },
            { name: 'department', value: department, type: sql.NVarChar },
            { name: 'doctor', value: doctor, type: sql.NVarChar },
            { name: 'data', value: JSON.stringify(data), type: sql.NVarChar },
            { name: 'summary', value: summary, type: sql.NVarChar }
        ];

        const result = await executeQuery(query, params);
        return result[0];
    }

    // 删除健康评估
    static async delete(id) {
        const query = `
            DELETE FROM HealthAssessments WHERE ID = @id;
            SELECT @@ROWCOUNT as AffectedRows;
        `;

        const params = [{ name: 'id', value: id, type: sql.UniqueIdentifier }];
        const result = await executeQuery(query, params);
        return result[0].AffectedRows > 0;
    }
}

// 创建或获取统一健康评估
router.post('/',
    validateCustomerExists('HealthAssessment', 'customerId'),
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    status: 'Error',
                    message: '输入验证失败',
                    errors: errors.array()
                });
            }

            const { customerId, department, medicalExamId, doctor, assessmentData: data, summary } = req.body;

            // 使用统一服务获取或创建健康评估记录
            const assessment = await unifiedHealthAssessmentService.getOrCreateUnifiedAssessment(
                customerId,
                department,
                medicalExamId,
                doctor,
                req.user?.id || 'system'
            );

            // 如果提供了额外的评估数据，更新记录
            if (data || summary) {
                const updateQuery = `
                    UPDATE HealthAssessments
                    SET AssessmentData = ISNULL(AssessmentData, '{}') + COALESCE(@data, '{}'),
                        Summary = COALESCE(@summary, Summary),
                        UpdatedAt = GETDATE(),
                        UpdatedBy = @updatedBy
                    WHERE ID = @assessmentId;

                    SELECT * FROM HealthAssessments WHERE ID = @assessmentId;
                `;

                const params = [
                    { name: 'assessmentId', value: assessment.ID, type: sql.UniqueIdentifier },
                    { name: 'data', value: data ? JSON.stringify(data) : null, type: sql.NVarChar },
                    { name: 'summary', value: summary, type: sql.NVarChar },
                    { name: 'updatedBy', value: req.user?.id || 'system', type: sql.NVarChar }
                ];

                const updatedResult = await executeQuery(updateQuery, params);
                Object.assign(assessment, updatedResult[0]);
            }

            res.status(201).json({
                status: 'Success',
                message: medicalExamId ? '健康评估创建成功（使用现有体检ID）' : '健康评估创建成功（生成新体检ID）',
                data: {
                    ...assessment,
                    customerInfo: {
                        id: req.customer.ID,
                        name: req.customer.Name,
                        identityCard: req.customer.IdentityCard
                    },
                    isUnified: true,
                    unifiedDate: assessment.AssessmentDate
                }
            });
        } catch (error) {
            console.error('创建或获取统一健康评估失败:', error);
            res.status(500).json({
                status: 'Error',
                message: '创建健康评估失败: ' + error.message
            });
        }
    }
);

// 根据体检ID获取健康评估
router.get('/medical-exam/:medicalExamId', async (req, res) => {
    try {
        const { medicalExamId } = req.params;

        const assessment = await HealthAssessment.getByMedicalExamId(medicalExamId);

        if (!assessment) {
            return res.status(404).json({
                status: 'Error',
                message: '未找到对应的体检记录'
            });
        }

        res.json({
            status: 'Success',
            message: '获取体检记录成功',
            data: assessment
        });
    } catch (error) {
        console.error('获取体检记录失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取体检记录失败'
        });
    }
});

// 检查体检ID是否已存在（用于前端调阅功能）
router.get('/check-exam-id/:examId', async (req, res) => {
    try {
        const { examId } = req.params;
        const { departmentType } = req.query;

        console.log(`🔍 检查体检ID: ${examId}, 科室类型: ${departmentType}`);

        const query = `
            SELECT COUNT(*) as count, Department
            FROM HealthAssessments
            WHERE MedicalExamID = @examId
            ${departmentType ? 'AND Department = @departmentType' : ''}
            GROUP BY Department
        `;

        const params = [
            { name: 'examId', value: examId, type: sql.NVarChar }
        ];

        if (departmentType) {
            params.push({ name: 'departmentType', value: departmentType, type: sql.NVarChar });
        }

        const result = await executeQuery(query, params);

        if (result && result.length > 0) {
            const totalCount = result.reduce((sum, row) => sum + row.count, 0);
            const departments = result.map(row => row.Department);

            console.log(`✅ 找到体检ID ${examId} 的记录，总数: ${totalCount}, 科室: ${departments.join(', ')}`);

            res.json({
                status: 'Success',
                message: `找到 ${totalCount} 条相关记录`,
                data: {
                    exists: true,
                    count: totalCount,
                    departments: departments,
                    records: result
                }
            });
        } else {
            console.log(`❌ 未找到体检ID ${examId} 的记录`);
            res.status(404).json({
                status: 'Error',
                message: '未找到对应的体检记录',
                data: {
                    exists: false,
                    count: 0,
                    departments: []
                }
            });
        }

    } catch (error) {
        console.error('检查体检ID失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '检查体检ID失败'
        });
    }
});

// 根据客户ID获取健康评估
router.get('/customer/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const result = await HealthAssessment.getByCustomerId(
            customerId,
            parseInt(page),
            parseInt(limit)
        );

        res.json({
            status: 'Success',
            message: '获取健康评估成功',
            data: result.assessments,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('获取健康评估失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取健康评估失败'
        });
    }
});

// 根据科室获取健康评估
router.get('/department/:department', async (req, res) => {
    try {
        const { department } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const result = await HealthAssessment.getByDepartment(
            department,
            parseInt(page),
            parseInt(limit)
        );

        res.json({
            status: 'Success',
            message: '获取健康评估成功',
            data: result.assessments,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('获取健康评估失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取健康评估失败'
        });
    }
});

// 更新健康评估
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updatedAssessment = await HealthAssessment.update(id, req.body);

        if (!updatedAssessment) {
            return res.status(404).json({
                status: 'Error',
                message: '健康评估不存在'
            });
        }

        res.json({
            status: 'Success',
            message: '健康评估更新成功',
            data: updatedAssessment
        });
    } catch (error) {
        console.error('更新健康评估失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '更新健康评估失败'
        });
    }
});

// 删除健康评估
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await HealthAssessment.delete(id);

        if (!deleted) {
            return res.status(404).json({
                status: 'Error',
                message: '健康评估不存在'
            });
        }

        res.json({
            status: 'Success',
            message: '健康评估删除成功'
        });
    } catch (error) {
        console.error('删除健康评估失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '删除健康评估失败'
        });
    }
});

module.exports = router;
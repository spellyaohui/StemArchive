/**
 * 检客档案查找API
 * 支持通过身份证号快速查找检客档案
 */

const express = require('express');
const router = express.Router();
const { executeQuery, sql } = require('../../config/database');
const { validationResult } = require('express-validator');

/**
 * 根据身份证号查找检客档案
 * GET /api/customers/lookup/:identityCard
 */
router.get('/identity/:identityCard', async (req, res) => {
    try {
        const { identityCard } = req.params;

        if (!identityCard) {
            return res.status(400).json({
                status: 'Error',
                message: '身份证号不能为空'
            });
        }

        // 使用新的检客档案完整信息视图
        const query = `
            SELECT
                ccp.*,
                c.Phone,
                c.ContactPerson,
                c.ContactPersonPhone,
                c.Address,
                c.Remarks
            FROM dbo.CustomerCompleteProfile ccp
            INNER JOIN Customers c ON ccp.CustomerID = c.ID
            WHERE ccp.IdentityCard = @identityCard
        `;

        const params = [{ name: 'identityCard', value: identityCard, type: sql.NVarChar }];
        const result = await executeQuery(query, params);

        if (!result || result.length === 0) {
            return res.status(404).json({
                status: 'Error',
                message: '未找到对应的检客档案',
                code: 'CUSTOMER_NOT_FOUND',
                identityCard
            });
        }

        const customer = result[0];

        res.json({
            status: 'Success',
            message: '检客档案查找成功',
            data: {
                customerInfo: {
                    id: customer.CustomerID,
                    identityCard: customer.IdentityCard,
                    name: customer.Name,
                    gender: customer.Gender,
                    age: customer.Age,
                    height: customer.Height,
                    weight: customer.Weight,
                    bmi: customer.BMI,
                    phone: customer.Phone,
                    contactPerson: customer.ContactPerson,
                    contactPersonPhone: customer.ContactPersonPhone,
                    address: customer.Address,
                    remarks: customer.Remarks,
                    status: customer.CustomerStatus,
                    createdAt: customer.CustomerCreatedAt
                },
                statistics: {
                    healthAssessments: customer.HealthAssessmentCount,
                    stemCellTreatments: customer.StemCellCount,
                    reports: customer.ReportCount,
                    totalInfusions: customer.TotalInfusionCount,
                    lastAssessmentDate: customer.LastAssessmentDate,
                    lastRegistrationDate: customer.LastRegistrationDate,
                    lastReportDate: customer.LastReportDate
                },
                profileCompleteness: {
                    score: customer.ProfileCompletenessScore,
                    level: customer.ProfileCompletenessScore >= 100 ? '完整' :
                           customer.ProfileCompletenessScore >= 80 ? '良好' :
                           customer.ProfileCompletenessScore >= 60 ? '基础' : '不完整'
                }
            }
        });
    } catch (error) {
        console.error('查找检客档案失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '查找检客档案失败'
        });
    }
});

/**
 * 根据身份证号验证检客档案是否存在
 * GET /api/customers/validate/:identityCard
 */
router.get('/validate/:identityCard', async (req, res) => {
    try {
        const { identityCard } = req.params;
        const { operationType } = req.query; // 可选：HealthAssessment, StemCell, Report

        if (!identityCard) {
            return res.status(400).json({
                status: 'Error',
                message: '身份证号不能为空'
            });
        }

        // 使用存储过程验证
        const query = `
            DECLARE @Result TABLE (
                IsValid BIT,
                Message NVARCHAR(500),
                CustomerID UNIQUEIDENTIFIER,
                CustomerName NVARCHAR(100),
                CustomerStatus NVARCHAR(40)
            );

            INSERT INTO @Result
            EXEC dbo.ValidateCustomerForOperation @identityCard, @operationType;

            SELECT * FROM @Result;
        `;

        const params = [
            { name: 'identityCard', value: identityCard, type: sql.NVarChar },
            { name: 'operationType', value: operationType || 'General', type: sql.NVarChar }
        ];

        const result = await executeQuery(query, params);

        console.log('验证API - 存储过程执行结果:', result);

        if (!result || result.length === 0) {
            console.error('验证API - 存储过程未返回结果');
            return res.status(500).json({
                status: 'Error',
                message: '验证失败：存储过程未返回结果',
                debugInfo: {
                    identityCard,
                    operationType,
                    paramsCount: params.length
                }
            });
        }

        const validation = result[0];
        console.log('验证API - 验证结果:', validation);

        res.json({
            status: 'Success',
            message: '检客档案验证完成',
            data: {
                isValid: validation.IsValid,
                message: validation.Message,
                customerInfo: validation.IsValid ? {
                    id: validation.CustomerID,
                    name: validation.CustomerName,
                    status: validation.CustomerStatus
                } : null
            }
        });
    } catch (error) {
        console.error('验证检客档案失败:', error);
        console.error('错误详情:', {
            identityCard,
            operationType,
            errorMessage: error.message,
            errorStack: error.stack
        });
        res.status(500).json({
            status: 'Error',
            message: '验证检客档案失败',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * 检查身份证号是否已存在
 * GET /api/customers/check-duplicate/:identityCard
 */
router.get('/check-duplicate/:identityCard', async (req, res) => {
    try {
        const { identityCard } = req.params;

        if (!identityCard) {
            return res.status(400).json({
                status: 'Error',
                message: '身份证号不能为空'
            });
        }

        const query = `
            SELECT
                dbo.CheckCustomerExists(@identityCard) as Exists,
                (SELECT TOP 1 ID, Name FROM Customers WHERE IdentityCard = @identityCard) as CustomerInfo
        `;

        const params = [{ name: 'identityCard', value: identityCard, type: sql.NVarChar }];
        const result = await executeQuery(query, params);

        if (!result || result.length === 0) {
            return res.json({
                status: 'Success',
                message: '身份证号检查完成',
                data: {
                    exists: false,
                    customerInfo: null
                }
            });
        }

        const check = result[0];

        res.json({
            status: 'Success',
            message: '身份证号检查完成',
            data: {
                exists: check.Exists,
                customerInfo: check.Exists ? {
                    id: check.CustomerInfo.ID,
                    name: check.CustomerInfo.Name
                } : null
            }
        });
    } catch (error) {
        console.error('检查身份证号重复失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '检查身份证号重复失败'
        });
    }
});

/**
 * 根据身份证号获取检客完整统计信息
 * GET /api/customers/statistics/:identityCard
 */
router.get('/statistics/:identityCard', async (req, res) => {
    try {
        const { identityCard } = req.params;

        if (!identityCard) {
            return res.status(400).json({
                status: 'Error',
                message: '身份证号不能为空'
            });
        }

        // 获取检客基础信息
        const customerQuery = `
            SELECT ID, Name, Gender, CreatedAt FROM Customers
            WHERE IdentityCard = @identityCard
        `;

        const customerParams = [{ name: 'identityCard', value: identityCard, type: sql.NVarChar }];
        const customerResult = await executeQuery(customerQuery, customerParams);

        if (!customerResult || customerResult.length === 0) {
            return res.status(404).json({
                status: 'Error',
                message: '检客档案不存在'
            });
        }

        const customer = customerResult[0];

        // 获取详细统计信息
        const statsQuery = `
            SELECT
                -- 健康评估统计
                (SELECT COUNT(*) FROM HealthAssessments WHERE CustomerID = @customerId) as TotalHealthAssessments,
                (SELECT COUNT(DISTINCT Department) FROM HealthAssessments WHERE CustomerID = @customerId) as UniqueDepartments,

                -- 干细胞治疗统计
                (SELECT COUNT(*) FROM StemCellPatients WHERE CustomerID = @customerId) as TotalStemCellTreatments,
                (SELECT SUM(TotalInfusionCount) FROM StemCellPatients WHERE CustomerID = @customerId) as TotalInfusions,

                -- 报告统计
                (SELECT COUNT(*) FROM Reports WHERE CustomerID = @customerId) as TotalReports,

                -- 时间信息
                DATEDIFF(YEAR, @createdAt, GETDATE()) as YearsInSystem,

                -- 最近活动
                (SELECT MAX(AssessmentDate) FROM HealthAssessments WHERE CustomerID = @customerId) as LastAssessmentDate,
                (SELECT MAX(RegistrationDate) FROM StemCellPatients WHERE CustomerID = @customerId) as LastRegistrationDate,
                (SELECT MAX(ReportDate) FROM Reports WHERE CustomerID = @customerId) as LastReportDate
        `;

        const statsParams = [
            { name: 'customerId', value: customer.ID, type: sql.UniqueIdentifier },
            { name: 'createdAt', value: customer.CreatedAt, type: sql.DateTime }
        ];
        const statsResult = await executeQuery(statsQuery, statsParams);

        const stats = statsResult[0];

        res.json({
            status: 'Success',
            message: '检客统计信息获取成功',
            data: {
                customerInfo: {
                    id: customer.ID,
                    name: customer.Name,
                    gender: customer.Gender,
                    yearsInSystem: stats.YearsInSystem
                },
                statistics: {
                    healthData: {
                        totalAssessments: stats.TotalHealthAssessments,
                        uniqueDepartments: stats.UniqueDepartments,
                        lastAssessmentDate: stats.LastAssessmentDate
                    },
                    stemCell: {
                        totalTreatments: stats.TotalStemCellTreatments,
                        totalInfusions: stats.TotalInfusions || 0,
                        lastRegistrationDate: stats.LastRegistrationDate
                    },
                    reports: {
                        totalReports: stats.TotalReports,
                        lastReportDate: stats.LastReportDate
                    }
                }
            }
        });
    } catch (error) {
        console.error('获取检客统计信息失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取检客统计信息失败'
        });
    }
});

module.exports = router;
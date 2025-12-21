const express = require('express');
const router = express.Router();
const { executeQuery, sql } = require('../../config/database');
const { validateCustomerExists } = require('../middleware/customerValidation');
const examinationDateService = require('../services/examinationDateService');

// 获取报告列表
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 20, customerId, reportType } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE 1=1';
        let params = [];

        if (customerId) {
            whereClause += ' AND CustomerID = @customerId';
            params.push({ name: 'customerId', value: customerId, type: sql.UniqueIdentifier });
        }

        if (reportType) {
            whereClause += ' AND ReportType = @reportType';
            params.push({ name: 'reportType', value: reportType, type: sql.NVarChar });
        }

        const query = `
            SELECT
                r.*,
                c.Name as CustomerName,
                c.IdentityCard
            FROM Reports r
            INNER JOIN Customers c ON r.CustomerID = c.ID
            ${whereClause}
            ORDER BY r.ReportDate DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;

            SELECT COUNT(*) as Total FROM Reports r ${whereClause};
        `;

        params.push(
            { name: 'offset', value: offset, type: sql.Int },
            { name: 'limit', value: limit, type: sql.Int }
        );

        const result = await executeQuery(query, params);

        // 检查结果是否为空
        if (!result || result.length === 0) {
            return res.json({
                status: 'Success',
                message: '获取报告列表成功',
                data: [],
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: 0,
                    totalPages: 0
                }
            });
        }

        // 如果只有一个结果，说明没有报告数据，只有计数结果
        let reports, total;
        if (result.length === 1) {
            reports = [];
            total = result[0].Total || 0;
        } else {
            reports = result.slice(0, -1);
            total = result[result.length - 1].Total || 0;
        }

        res.json({
            status: 'Success',
            message: '获取报告列表成功',
            data: reports,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('获取报告列表失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取报告列表失败'
        });
    }
});

// 根据客户ID获取报告
router.get('/customer/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const query = `
            SELECT * FROM Reports
            WHERE CustomerID = @customerId
            ORDER BY ReportDate DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;

            SELECT COUNT(*) as Total FROM Reports WHERE CustomerID = @customerId;
        `;

        const params = [
            { name: 'customerId', value: customerId, type: sql.UniqueIdentifier },
            { name: 'offset', value: offset, type: sql.Int },
            { name: 'limit', value: limit, type: sql.Int }
        ];

        const result = await executeQuery(query, params);

        // 检查结果是否为空
        if (!result || result.length === 0) {
            return res.json({
                status: 'Success',
                message: '获取报告成功',
                data: [],
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: 0,
                    totalPages: 0
                }
            });
        }

        // 如果只有一个结果，说明没有报告数据，只有计数结果
        let reports, total;
        if (result.length === 1) {
            reports = [];
            total = result[0].Total || 0;
        } else {
            reports = result.slice(0, -1);
            total = result[result.length - 1].Total || 0;
        }

        res.json({
            status: 'Success',
            message: '获取报告成功',
            data: reports,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('获取报告失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取报告失败'
        });
    }
});

// 生成报告
router.post('/generate',
    validateCustomerExists('Report', 'customerId'),
    async (req, res) => {
        try {
            const {
                customerId,
                reportName,
                reportType,
                reportDate,
                dataRange,
                reportContent,
                summary
            } = req.body;

        // 模拟AI分析
        const aiAnalysis = await generateAIAnalysis(customerId, dataRange);

        const query = `
            INSERT INTO Reports (
                CustomerID, ReportName, ReportType, ReportDate,
                DataRange, ReportContent, Summary, AIAnalysis, CreatedBy
            )
            VALUES (
                @customerId, @reportName, @reportType, @reportDate,
                @dataRange, @reportContent, @summary, @aiAnalysis, @createdBy
            );

            SELECT SCOPE_IDENTITY() as ID, * FROM Reports WHERE ID = SCOPE_IDENTITY();
        `;

        const params = [
            { name: 'customerId', value: customerId, type: sql.UniqueIdentifier },
            { name: 'reportName', value: reportName, type: sql.NVarChar },
            { name: 'reportType', value: reportType, type: sql.NVarChar },
            { name: 'reportDate', value: reportDate, type: sql.Date },
            { name: 'dataRange', value: dataRange, type: sql.NVarChar },
            { name: 'reportContent', value: reportContent, type: sql.NVarChar },
            { name: 'summary', value: summary, type: sql.NVarChar },
            { name: 'aiAnalysis', value: aiAnalysis, type: sql.NVarChar },
            { name: 'createdBy', value: req.user?.id || 'system', type: sql.NVarChar }
        ];

        const result = await executeQuery(query, params);
        const report = result[0];

        res.status(201).json({
            status: 'Success',
            message: '报告生成成功',
            data: report
        });
    } catch (error) {
        console.error('生成报告失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '生成报告失败'
        });
    }
});

// 模拟AI分析
async function generateAIAnalysis(customerId, dataRange) {
    // 这里应该调用真实的AI服务
    // 现在返回模拟数据
    return `
# AI智能分析报告

## 健康状况评估
基于患者的健康数据对比分析，整体健康状况呈现**良好趋势**。

### 主要改善指标
1. **生化指标**: 关键指标有所改善
2. **免疫水平**: NK细胞活性提升
3. **炎症指标**: 炎症因子水平下降

### 治疗效果评价
- **治疗响应**: 良好 ✅
- **安全性**: 未见明显不良反应 ✅
- **生活质量**: 显著改善 ✅

### 建议事项
1. 继续当前治疗方案
2. 定期监测关键指标
3. 保持健康生活方式
4. 按时进行复查

*注: 此分析基于AI算法生成，仅供参考，具体诊疗请遵医嘱。*
    `.trim();
}

// 搜索体检报告 - 单次报告专用
router.get('/exams', async (req, res) => {
    try {
        const { customerId, startDate, endDate } = req.query;

        if (!customerId) {
            return res.status(400).json({
                status: 'Error',
                message: '缺少客户ID参数'
            });
        }

        let whereClause = `
            WHERE ha.CustomerID = @customerId
            AND ha.MedicalExamID IS NOT NULL
            AND ha.MedicalExamID != ''
        `;
        let params = [{ name: 'customerId', value: customerId, type: sql.UniqueIdentifier }];

        if (startDate) {
            whereClause += ' AND ha.AssessmentDate >= @startDate';
            params.push({ name: 'startDate', value: startDate, type: sql.Date });
        }

        if (endDate) {
            whereClause += ' AND ha.AssessmentDate <= @endDate';
            params.push({ name: 'endDate', value: endDate, type: sql.Date });
        }

        // 使用最简单直接的方法获取唯一的体检ID
        const allExamQuery = `
            SELECT DISTINCT
                MedicalExamID,
                CustomerName
            FROM (
                SELECT ha.MedicalExamID, c.Name as CustomerName
                FROM HealthAssessments ha
                INNER JOIN Customers c ON ha.CustomerID = c.ID
                WHERE ha.CustomerID = @customerId
                AND ha.AssessmentDate >= @startDate
                AND ha.AssessmentDate <= @endDate
                AND ha.MedicalExamID IS NOT NULL
                AND ha.MedicalExamID != ''

                UNION

                SELECT ld.ExamId as MedicalExamID, c.Name as CustomerName
                FROM LaboratoryData ld
                INNER JOIN Customers c ON ld.CustomerID = c.ID
                WHERE ld.CustomerID = @customerId
                AND ld.CheckDate >= @startDate
                AND ld.CheckDate <= @endDate
                AND ld.ExamId IS NOT NULL
                AND ld.ExamId != ''
            ) AS AllExams
        `;

        const allResults = await executeQuery(allExamQuery, params);

        // 为每个体检ID获取统一的体检日期和部门数量
        console.log('🔍 数据库查询结果:', allResults);
        const processedResult = await Promise.all(
            allResults.map(async (exam) => {
                try {
                    console.log(`📅 获取体检ID ${exam.MedicalExamID} 的统一日期...`);
                    // 使用统一的体检日期服务获取日期
                    const unifiedDate = await examinationDateService.getExaminationDate(exam.MedicalExamID);
                    console.log(`✅ 体检ID ${exam.MedicalExamID} 获取到日期: ${unifiedDate}`);

                    // 计算部门数量
                    const deptCountQuery = `
                        SELECT
                            (
                                SELECT COUNT(DISTINCT Department)
                                FROM HealthAssessments ha
                                WHERE ha.MedicalExamID = @medicalExamId
                            ) +
                            CASE
                                WHEN EXISTS (
                                    SELECT 1 FROM LaboratoryData ld
                                    WHERE ld.ExamId = @medicalExamId
                                ) THEN 1
                                ELSE 0
                            END as DepartmentCount
                    `;

                    const deptParams = [
                        { name: 'medicalExamId', value: exam.MedicalExamID, type: sql.NVarChar }
                    ];

                    const deptResult = await executeQuery(deptCountQuery, deptParams);
                    const departmentCount = deptResult[0]?.DepartmentCount || 0;

                    return {
                        ...exam,
                        ExamDate: unifiedDate || new Date().toISOString().split('T')[0], // 如果获取失败，使用当前日期
                        DepartmentCount: departmentCount
                    };
                } catch (error) {
                    console.error(`获取体检ID ${exam.MedicalExamID} 的统一日期失败:`, error);
                    // 如果获取统一日期失败，使用当前日期
                    return {
                        ...exam,
                        ExamDate: new Date().toISOString().split('T')[0],
                        DepartmentCount: 0
                    };
                }
            })
        );

        // 按日期排序
        processedResult.sort((a, b) => new Date(b.ExamDate) - new Date(a.ExamDate));

        res.json({
            status: 'Success',
            message: '搜索体检报告成功',
            data: processedResult
        });
    } catch (error) {
        console.error('搜索体检报告失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '搜索体检报告失败'
        });
    }
});


// 获取体检详情 - 单次报告专用
router.get('/exam-detail', async (req, res) => {
    try {
        const { customerId, examId } = req.query;

        if (!customerId || !examId) {
            return res.status(400).json({
                status: 'Error',
                message: '缺少客户ID或体检ID参数'
            });
        }

        // 获取HealthAssessments数据
        const haQuery = `
            SELECT
                ha.MedicalExamID,
                ha.Department,
                ha.AssessmentDate,
                ha.Doctor,
                ha.AssessmentData,
                ha.Summary,
                c.Name as CustomerName,
                c.IdentityCard
            FROM HealthAssessments ha
            INNER JOIN Customers c ON ha.CustomerID = c.ID
            WHERE ha.CustomerID = @customerId
            AND ha.MedicalExamID = @examId
            ORDER BY ha.Department
        `;

        // 获取LaboratoryData数据
        const labQuery = `
            SELECT
                ld.ExamId as MedicalExamID,
                '检验科' as Department,
                ld.CheckDate as AssessmentDate,
                ld.Doctor,
                null as AssessmentData,
                '检验科数据' as Summary,
                c.Name as CustomerName,
                c.IdentityCard
            FROM LaboratoryData ld
            INNER JOIN Customers c ON ld.CustomerID = c.ID
            WHERE ld.CustomerID = @customerId
            AND ld.ExamId = @examId
            GROUP BY ld.ExamId, ld.CheckDate, ld.Doctor, c.Name, c.IdentityCard
        `;

        const params = [
            { name: 'customerId', value: customerId, type: sql.UniqueIdentifier },
            { name: 'examId', value: examId, type: sql.NVarChar }
        ];

        // 执行两个查询
        const haResult = await executeQuery(haQuery, params);
        const labResult = await executeQuery(labQuery, params);

        // 获取检验科详细数据
        const labDetailQuery = `
            SELECT
                TestCategory,
                ItemName,
                ItemResult,
                ItemUnit,
                ReferenceValue,
                AbnormalFlag,
                Doctor
            FROM LaboratoryData
            WHERE CustomerID = @customerId
            AND ExamId = @examId
            ORDER BY TestCategory, ItemName
        `;

        const labDetailResult = await executeQuery(labDetailQuery, params);

        if (haResult.length === 0 && labResult.length === 0) {
            return res.status(404).json({
                status: 'Error',
                message: '未找到体检数据'
            });
        }

        // 组装科室数据
        const departments = [];

        // 添加HealthAssessments的科室数据
        haResult.forEach(row => {
            departments.push({
                department: row.Department,
                assessmentDate: row.AssessmentDate,
                doctor: row.Doctor,
                assessmentData: row.AssessmentData,
                summary: row.Summary
            });
        });

        // 添加检验科数据（如果有）
        if (labResult.length > 0) {
            // 按TestCategory分组检验数据
            const labDataByCategory = {};
            labDetailResult.forEach(item => {
                if (!labDataByCategory[item.TestCategory]) {
                    labDataByCategory[item.TestCategory] = {
                        category: item.TestCategory,
                        doctor: item.Doctor,
                        items: []
                    };
                }
                labDataByCategory[item.TestCategory].items.push({
                    itemName: item.ItemName,
                    itemResult: item.ItemResult,
                    itemUnit: item.ItemUnit,
                    referenceValue: item.ReferenceValue,
                    abnormalFlag: item.AbnormalFlag
                });
            });

            // 构建检验科的AssessmentData JSON
            const labAssessmentData = Object.values(labDataByCategory).map(category => ({
                itemName: category.category,
                itemResult: category.items.map(item =>
                    `${item.itemName}: ${item.itemResult}${item.itemUnit ? ' ' + item.itemUnit : ''} ${item.referenceValue ? '(参考值: ' + item.referenceValue + ')' : ''}${item.abnormalFlag ? ' [异常]' : ''}`
                ).join('\n'),
                departmentName: '检验科',
                departmentId: 'lab'
            }));

            departments.push({
                department: '检验科',
                assessmentDate: labResult[0].AssessmentDate,
                doctor: labResult[0].Doctor,
                assessmentData: JSON.stringify(labAssessmentData),
                summary: '检验科评估 - 包含血常规、肝功、肾功、血脂等检查项目'
            });
        }

        // 获取客户信息和体检日期
        const customerName = haResult.length > 0 ? haResult[0].CustomerName : labResult[0].CustomerName;
        const examDate = haResult.length > 0 ? haResult[0].AssessmentDate : labResult[0].AssessmentDate;

        // 组装返回数据
        const examData = {
            customerId: customerId,
            medicalExamId: examId,
            customerName: customerName,
            examDate: examDate,
            departments: departments
        };

        res.json({
            status: 'Success',
            message: '获取体检详情成功',
            data: examData
        });
    } catch (error) {
        console.error('获取体检详情失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取体检详情失败'
        });
    }
});

// 删除报告
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
            DELETE FROM Reports WHERE ID = @id;
            SELECT @@ROWCOUNT as AffectedRows;
        `;

        const params = [{ name: 'id', value: id, type: sql.UniqueIdentifier }];
        const result = await executeQuery(query, params);

        if (result[0].AffectedRows === 0) {
            return res.status(404).json({
                status: 'Error',
                message: '报告不存在'
            });
        }

        res.json({
            status: 'Success',
            message: '报告删除成功'
        });
    } catch (error) {
        console.error('删除报告失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '删除报告失败'
        });
    }
});

// 健康评估相关API接口
const HealthAssessmentReport = require('../models/HealthAssessmentReport');
const deepseekService = require('../services/deepseekService');
const pdfService = require('../services/pdfService');

// 检查是否已生成健康评估
router.get('/health-assessment/check', async (req, res) => {
    try {
        const { medicalExamId } = req.query;

        if (!medicalExamId) {
            return res.status(400).json({
                status: 'Error',
                message: '缺少体检ID参数'
            });
        }

        const existingReport = await HealthAssessmentReport.getByMedicalExamId(medicalExamId);

        res.json({
            status: 'Success',
            message: '检查完成',
            hasReport: !!existingReport,
            report: existingReport
        });
    } catch (error) {
        console.error('检查健康评估失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '检查健康评估失败'
        });
    }
});

// 生成健康评估
router.post('/health-assessment/generate',
    validateCustomerExists('HealthAssessment', 'customerId'),
    async (req, res) => {
        try {
            const { customerId, medicalExamId } = req.body;

            if (!customerId || !medicalExamId) {
                return res.status(400).json({
                    status: 'Error',
                    message: '缺少客户ID或体检ID'
                });
            }

            // 检查API配置
            if (!deepseekService.isConfigured()) {
                return res.status(500).json({
                    status: 'Error',
                    message: 'DeepSeek API未配置，请联系管理员'
                });
            }

            // 检查是否已存在健康评估
            const existingReport = await HealthAssessmentReport.getByMedicalExamId(medicalExamId);
            if (existingReport) {
                return res.json({
                    status: 'Success',
                    message: '健康评估已存在',
                    data: existingReport
                });
            }

            // 获取体检详情数据
            const examDetailResponse = await executeQuery(`
                SELECT
                    ha.MedicalExamID,
                    ha.Department,
                    ha.AssessmentDate,
                    ha.Doctor,
                    ha.AssessmentData,
                    ha.Summary,
                    c.Name as CustomerName,
                    c.IdentityCard
                FROM HealthAssessments ha
                INNER JOIN Customers c ON ha.CustomerID = c.ID
                WHERE ha.CustomerID = @customerId
                AND ha.MedicalExamID = @medicalExamId
                ORDER BY ha.Department
            `, [
                { name: 'customerId', value: customerId, type: sql.UniqueIdentifier },
                { name: 'medicalExamId', value: medicalExamId, type: sql.NVarChar }
            ]);

            // 获取检验科数据
            const labDataResponse = await executeQuery(`
                SELECT
                    TestCategory,
                    ItemName,
                    ItemResult,
                    ItemUnit,
                    ReferenceValue,
                    AbnormalFlag
                FROM LaboratoryData
                WHERE CustomerID = @customerId
                AND ExamId = @medicalExamId
                ORDER BY TestCategory, ItemName
            `, [
                { name: 'customerId', value: customerId, type: sql.UniqueIdentifier },
                { name: 'medicalExamId', value: medicalExamId, type: sql.NVarChar }
            ]);

            if (examDetailResponse.length === 0 && labDataResponse.length === 0) {
                return res.status(404).json({
                    status: 'Error',
                    message: '未找到体检数据'
                });
            }

            // 组装科室数据
            const departments = [];

            // 添加HealthAssessments数据
            examDetailResponse.forEach(row => {
                departments.push({
                    department: row.Department,
                    assessmentDate: row.AssessmentDate,
                    doctor: row.Doctor,
                    assessmentData: row.AssessmentData,
                    summary: row.Summary
                });
            });

            // 添加检验科数据
            if (labDataResponse.length > 0) {
                const labDataByCategory = {};
                labDataResponse.forEach(item => {
                    if (!labDataByCategory[item.TestCategory]) {
                        labDataByCategory[item.TestCategory] = {
                            category: item.TestCategory,
                            items: []
                        };
                    }
                    labDataByCategory[item.TestCategory].items.push({
                        itemName: item.ItemName,
                        itemResult: item.ItemResult,
                        itemUnit: item.ItemUnit,
                        referenceValue: item.ReferenceValue,
                        abnormalFlag: item.AbnormalFlag
                    });
                });

                const labAssessmentData = Object.values(labDataByCategory).map(category => ({
                    itemName: category.category,
                    itemResult: category.items.map(item =>
                        `${item.itemName}: ${item.itemResult}${item.itemUnit ? ' ' + item.itemUnit : ''} ${item.referenceValue ? '(参考值: ' + item.referenceValue + ')' : ''}${item.abnormalFlag ? ' [异常]' : ''}`
                    ).join('\n')
                }));

                departments.push({
                    department: '检验科',
                    assessmentDate: examDetailResponse.length > 0 ? examDetailResponse[0].AssessmentDate : new Date().toISOString().split('T')[0],
                    doctor: null,
                    assessmentData: JSON.stringify(labAssessmentData),
                    summary: '检验科评估 - 包含血常规、生化等检查项目'
                });
            }

            // 添加调试日志
            console.log('🔍 客户姓名调试信息:', {
                customerId,
                medicalExamId,
                examDetailResponseLength: examDetailResponse.length,
                examDetailResponse: examDetailResponse,
                labDataResponseLength: labDataResponse.length,
                departmentsLength: departments.length
            });

            // 改进客户姓名获取逻辑
            let customerName = '未知客户';

            // 优先从 HealthAssessments 数据获取客户姓名
            if (examDetailResponse.length > 0 && examDetailResponse[0].CustomerName) {
                customerName = examDetailResponse[0].CustomerName;
                console.log('✅ 从 HealthAssessments 获取客户姓名:', customerName);
            }
            // 如果没有 HealthAssessments 数据，尝试直接从数据库查询客户信息
            else {
                console.log('⚠️ HealthAssessments 无数据，尝试直接查询客户信息');
                try {
                    const customerQuery = await executeQuery(`
                        SELECT Name FROM Customers WHERE ID = @customerId
                    `, [
                        { name: 'customerId', value: customerId, type: sql.UniqueIdentifier }
                    ]);

                    if (customerQuery.length > 0 && customerQuery[0].Name) {
                        customerName = customerQuery[0].Name;
                        console.log('✅ 从 Customers 表获取客户姓名:', customerName);
                    }
                } catch (customerError) {
                    console.error('❌ 查询客户信息失败:', customerError);
                }
            }

            // 构建健康数据
            const healthData = {
                customerName: customerName,
                medicalExamId: medicalExamId,
                examDate: departments[0]?.assessmentDate || new Date().toISOString().split('T')[0],
                departments: departments
            };

            console.log('📋 构建的健康数据:', healthData);

            // 创建初始报告记录（状态为pending）
            const reportData = {
                customerId: customerId,
                medicalExamId: medicalExamId,
                reportName: `${healthData.customerName}-健康评估报告`,
                assessmentDate: healthData.examDate,
                originalData: JSON.stringify(healthData),
                generationStatus: 'processing',
                createdBy: req.user?.id || 'system'
            };

            const report = await HealthAssessmentReport.create(reportData);

            // 检查report对象是否有效
            if (!report || !report.ID) {
                throw new Error('创建健康评估报告记录失败，返回的报告对象无效');
            }

            // 异步调用DeepSeek API生成健康评估
            setImmediate(async () => {
                try {
                    const aiResult = await deepseekService.generateHealthAssessment(healthData);

                    if (aiResult.success) {
                        // 更新报告记录
                        await HealthAssessmentReport.update(report.ID, {
                            apiRequest: aiResult.apiRequest,
                            apiResponse: aiResult.apiResponse,
                            aiAnalysis: aiResult.aiAnalysis,
                            markdownContent: aiResult.markdownContent,
                            apiModel: aiResult.apiModel,
                            apiTokenCount: aiResult.apiTokenCount,
                            processingTime: aiResult.processingTime,
                            generationStatus: 'completed'
                        });
                    } else {
                        // 更新失败状态
                        await HealthAssessmentReport.update(report.ID, {
                            apiRequest: JSON.stringify({ error: aiResult.error }),
                            apiResponse: JSON.stringify({ error: aiResult.error }),
                            generationStatus: 'failed'
                        });
                    }
                } catch (error) {
                    console.error('异步生成健康评估失败:', error);
                    if (report && report.ID) {
                        try {
                            await HealthAssessmentReport.update(report.ID, {
                                apiRequest: JSON.stringify({ error: error.message }),
                                apiResponse: JSON.stringify({ error: error.message }),
                                generationStatus: 'failed'
                            });
                        } catch (updateError) {
                            console.error('更新报告状态也失败:', updateError);
                        }
                    } else {
                        console.error('无法更新报告状态：report对象或ID无效');
                    }
                }
            });

            res.json({
                status: 'Success',
                message: '健康评估生成已启动，请稍后查看结果',
                data: {
                    reportId: report.ID,
                    status: 'processing'
                }
            });

        } catch (error) {
            console.error('生成健康评估失败:', error);
            res.status(500).json({
                status: 'Error',
                message: '生成健康评估失败'
            });
        }
    });

// 获取健康评估报告
router.get('/health-assessment/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const report = await HealthAssessmentReport.getById(id);

        if (!report) {
            return res.status(404).json({
                status: 'Error',
                message: '健康评估报告不存在'
            });
        }

        res.json({
            status: 'Success',
            message: '获取健康评估报告成功',
            data: report
        });
    } catch (error) {
        console.error('获取健康评估报告失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取健康评估报告失败'
        });
    }
});

// 获取客户的健康评估报告列表
router.get('/health-assessment/customer/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const result = await HealthAssessmentReport.getByCustomerId(customerId, page, limit);

        res.json({
            status: 'Success',
            message: '获取健康评估报告列表成功',
            data: result.reports,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('获取健康评估报告列表失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取健康评估报告列表失败'
        });
    }
});

// 下载健康评估报告
router.get('/health-assessment/:id/download', async (req, res) => {
    try {
        const { id } = req.params;

        const report = await HealthAssessmentReport.getById(id);

        if (!report) {
            return res.status(404).json({
                status: 'Error',
                message: '健康评估报告不存在'
            });
        }

        if (report.GenerationStatus !== 'completed') {
            return res.status(400).json({
                status: 'Error',
                message: '健康评估报告尚未生成完成'
            });
        }

        if (!report.MarkdownContent) {
            return res.status(400).json({
                status: 'Error',
                message: '健康评估报告内容为空'
            });
        }

        // 设置下载响应头
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${report.ReportName}.md"`);

        res.send(report.MarkdownContent);
    } catch (error) {
        console.error('下载健康评估报告失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '下载健康评估报告失败'
        });
    }
});

// 删除健康评估报告
router.delete('/health-assessment/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const success = await HealthAssessmentReport.delete(id);

        if (!success) {
            return res.status(404).json({
                status: 'Error',
                message: '健康评估报告不存在'
            });
        }

        res.json({
            status: 'Success',
            message: '健康评估报告删除成功'
        });
    } catch (error) {
        console.error('删除健康评估报告失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '删除健康评估报告失败'
        });
    }
});

// 转换健康评估报告为PDF
router.post('/health-assessment/:id/convert-pdf', async (req, res) => {
    try {
        const { id } = req.params;

        const report = await HealthAssessmentReport.getById(id);

        if (!report) {
            return res.status(404).json({
                status: 'Error',
                message: '健康评估报告不存在'
            });
        }

        if (report.GenerationStatus !== 'completed') {
            return res.status(400).json({
                status: 'Error',
                message: '健康评估报告尚未生成完成'
            });
        }

        if (!report.AIAnalysis) {
            return res.status(400).json({
                status: 'Error',
                message: '健康评估报告内容为空'
            });
        }

        // 检查PDF转换服务是否可用
        const serviceAvailable = await pdfService.isServiceAvailable();
        if (!serviceAvailable) {
            return res.status(503).json({
                status: 'Error',
                message: 'PDF转换服务不可用，请稍后重试'
            });
        }

        // 调用PDF转换服务
        const pdfResult = await pdfService.convertMarkdownToPDF(report.AIAnalysis);

        if (pdfResult.success) {
            res.json({
                status: 'Success',
                message: 'PDF转换成功',
                data: {
                    pdfData: pdfResult.pdfData,
                    processingTime: pdfResult.processingTime,
                    fileName: `${report.ReportName}.pdf`
                }
            });
        } else {
            res.status(500).json({
                status: 'Error',
                message: pdfResult.error || 'PDF转换失败'
            });
        }

    } catch (error) {
        console.error('转换PDF失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '转换PDF失败'
        });
    }
});

// 对比报告相关API接口
const ComparisonReport = require('../models/ComparisonReport');

// 生成对比报告
router.post('/comparison/generate',
    validateCustomerExists('ComparisonReport', 'customerId'),
    async (req, res) => {
        try {
            const { customerId, medicalExamIds } = req.body;

            if (!customerId || !medicalExamIds || !Array.isArray(medicalExamIds) || medicalExamIds.length < 2) {
                return res.status(400).json({
                    status: 'Error',
                    message: '缺少客户ID或体检ID列表，至少需要选择2个体检记录'
                });
            }

            // 检查选择数量是否超过限制
            const maxSelections = parseInt(process.env.COMPARISON_REPORT_MAX_SELECTIONS || '3');
            if (medicalExamIds.length > maxSelections) {
                return res.status(400).json({
                    status: 'Error',
                    message: `最多只能选择${maxSelections}个体检记录进行对比`
                });
            }

            // 检查API配置
            if (!deepseekService.isConfigured()) {
                return res.status(500).json({
                    status: 'Error',
                    message: 'DeepSeek API未配置，请联系管理员'
                });
            }

            // 获取所有体检记录数据
            const exams = [];
            for (const examId of medicalExamIds) {
                const examDetailResponse = await executeQuery(`
                    SELECT
                        ha.MedicalExamID,
                        ha.Department,
                        ha.AssessmentDate,
                        ha.Doctor,
                        ha.AssessmentData,
                        ha.Summary,
                        c.Name as CustomerName
                    FROM HealthAssessments ha
                    INNER JOIN Customers c ON ha.CustomerID = c.ID
                    WHERE ha.CustomerID = @customerId
                    AND ha.MedicalExamID = @examId
                    ORDER BY ha.Department
                `, [
                    { name: 'customerId', value: customerId, type: sql.UniqueIdentifier },
                    { name: 'examId', value: examId, type: sql.NVarChar }
                ]);

                // 获取检验科数据
                const labDataResponse = await executeQuery(`
                    SELECT
                        TestCategory,
                        ItemName,
                        ItemResult,
                        ItemUnit,
                        ReferenceValue,
                        AbnormalFlag
                    FROM LaboratoryData
                    WHERE CustomerID = @customerId
                    AND ExamId = @examId
                    ORDER BY TestCategory, ItemName
                `, [
                    { name: 'customerId', value: customerId, type: sql.UniqueIdentifier },
                    { name: 'examId', value: examId, type: sql.NVarChar }
                ]);

                if (examDetailResponse.length === 0 && labDataResponse.length === 0) {
                    return res.status(404).json({
                        status: 'Error',
                        message: `未找到体检ID ${examId} 的数据`
                    });
                }

                // 组装科室数据
                const departments = [];

                // 添加HealthAssessments数据
                examDetailResponse.forEach(row => {
                    departments.push({
                        department: row.Department,
                        assessmentDate: row.AssessmentDate,
                        doctor: row.Doctor,
                        assessmentData: row.AssessmentData,
                        summary: row.Summary
                    });
                });

                // 添加检验科数据
                if (labDataResponse.length > 0) {
                    const labDataByCategory = {};
                    labDataResponse.forEach(item => {
                        if (!labDataByCategory[item.TestCategory]) {
                            labDataByCategory[item.TestCategory] = {
                                category: item.TestCategory,
                                items: []
                            };
                        }
                        labDataByCategory[item.TestCategory].items.push({
                            itemName: item.ItemName,
                            itemResult: item.ItemResult,
                            itemUnit: item.ItemUnit,
                            referenceValue: item.ReferenceValue,
                            abnormalFlag: item.AbnormalFlag
                        });
                    });

                    const labAssessmentData = Object.values(labDataByCategory).map(category => ({
                        itemName: category.category,
                        itemResult: category.items.map(item =>
                            `${item.itemName}: ${item.itemResult}${item.itemUnit ? ' ' + item.itemUnit : ''} ${item.referenceValue ? '(参考值: ' + item.referenceValue + ')' : ''}${item.abnormalFlag ? ' [异常]' : ''}`
                        ).join('\n')
                    }));

                    departments.push({
                        department: '检验科',
                        assessmentDate: examDetailResponse.length > 0 ? examDetailResponse[0].AssessmentDate : new Date().toISOString().split('T')[0],
                        doctor: null,
                        assessmentData: JSON.stringify(labAssessmentData),
                        summary: '检验科评估 - 包含血常规、生化等检查项目'
                    });
                }

                // 改进客户姓名获取逻辑 - 与健康评估报告保持一致
                let customerName = '未知客户';

                // 优先从 HealthAssessments 数据获取客户姓名
                if (examDetailResponse.length > 0 && examDetailResponse[0].CustomerName) {
                    customerName = examDetailResponse[0].CustomerName;
                    console.log('✅ 对比报告从 HealthAssessments 获取客户姓名:', customerName);
                }
                // 如果没有 HealthAssessments 数据，尝试直接从数据库查询客户信息
                else {
                    console.log('⚠️ 对比报告 HealthAssessments 无数据，尝试直接查询客户信息');
                    try {
                        const customerQuery = await executeQuery(`
                            SELECT Name FROM Customers WHERE ID = @customerId
                        `, [
                            { name: 'customerId', value: customerId, type: sql.UniqueIdentifier }
                        ]);

                        if (customerQuery.length > 0 && customerQuery[0].Name) {
                            customerName = customerQuery[0].Name;
                            console.log('✅ 对比报告从 Customers 表获取客户姓名:', customerName);
                        }
                    } catch (customerError) {
                        console.error('❌ 对比报告查询客户信息失败:', customerError);
                    }
                }

                exams.push({
                    medicalExamId: examId,
                    examDate: departments[0]?.assessmentDate || new Date().toISOString().split('T')[0],
                    customerName: customerName,
                    departments: departments
                });
            }

            // 按体检日期升序排序（最早的在前面）
            exams.sort((a, b) => {
                const dateA = new Date(a.examDate);
                const dateB = new Date(b.examDate);
                return dateA - dateB;
            });

            // 构建对比数据 - 使用真实的客户姓名
            const comparisonData = {
                customerName: exams[0]?.customerName || '未知客户',
                exams: exams
            };

            // 检查是否存在相同的体检ID组合的处理中或待处理报告
            const existingReport = await ComparisonReport.checkDuplicate(customerId, medicalExamIds);
            if (existingReport) {
                return res.status(409).json({
                    status: 'Error',
                    message: `已存在相同的对比报告正在处理中（报告ID: ${existingReport.ID}，状态: ${existingReport.Status}）`,
                    existingReportId: existingReport.ID,
                    existingStatus: existingReport.Status
                });
            }

            // 创建初始对比报告记录（状态为pending）
            const reportData = {
                customerId: customerId,
                customerName: comparisonData.customerName,
                medicalExamIds: medicalExamIds.join(','),
                comparisonData: comparisonData,
                status: 'pending',
                processingTime: 0
            };

            let report;
            try {
                report = await ComparisonReport.create(reportData);
            } catch (error) {
                // 处理数据库唯一约束冲突
                if (error.number === 2601 || error.number === 2627) {
                    return res.status(409).json({
                        status: 'Error',
                        message: '检测到重复的对比报告提交，请勿在短时间内重复提交相同的体检组合',
                        isDuplicate: true
                    });
                }
                throw error;
            }

            // 异步调用DeepSeek API生成对比分析
            setImmediate(async () => {
                try {
                    // 更新状态为processing
                    await ComparisonReport.update(report.ID, { status: 'processing' });

                    const aiResult = await deepseekService.generateHealthComparison(comparisonData);

                    if (aiResult.success) {
                        // 更新报告记录
                        await ComparisonReport.update(report.ID, {
                            aiAnalysis: aiResult.aiAnalysis,
                            markdownContent: aiResult.markdownContent,
                            apiModel: aiResult.apiModel,
                            apiTokenCount: aiResult.apiTokenCount,
                            processingTime: aiResult.processingTime,
                            status: 'completed'
                        });
                    } else {
                        // 更新失败状态
                        await ComparisonReport.update(report.ID, {
                            status: 'failed',
                            errorMessage: aiResult.error
                        });
                    }
                } catch (error) {
                    console.error('异步生成对比报告失败:', error);
                    await ComparisonReport.update(report.ID, {
                        status: 'failed',
                        errorMessage: error.message
                    });
                }
            });

            res.json({
                status: 'Success',
                message: '对比报告生成已启动，请稍后查看结果',
                data: {
                    reportId: report.ID,
                    status: 'processing',
                    medicalExamIds: medicalExamIds
                }
            });

        } catch (error) {
            console.error('生成对比报告失败:', error);
            res.status(500).json({
                status: 'Error',
                message: '生成对比报告失败'
            });
        }
    });

// 获取对比报告
router.get('/comparison/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const report = await ComparisonReport.getById(id);

        if (!report) {
            return res.status(404).json({
                status: 'Error',
                message: '对比报告不存在'
            });
        }

        res.json({
            status: 'Success',
            message: '获取对比报告成功',
            data: report
        });
    } catch (error) {
        console.error('获取对比报告失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取对比报告失败'
        });
    }
});

// 获取客户的对比报告列表
router.get('/comparison/customer/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;

        const reports = await ComparisonReport.getByCustomerId(customerId);

        res.json({
            status: 'Success',
            message: '获取对比报告列表成功',
            data: reports
        });
    } catch (error) {
        console.error('获取对比报告列表失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取对比报告列表失败'
        });
    }
});

// 下载对比报告
router.get('/comparison/:id/download', async (req, res) => {
    try {
        const { id } = req.params;

        const report = await ComparisonReport.getById(id);

        if (!report) {
            return res.status(404).json({
                status: 'Error',
                message: '对比报告不存在'
            });
        }

        if (report.Status !== 'completed') {
            return res.status(400).json({
                status: 'Error',
                message: '对比报告尚未生成完成'
            });
        }

        if (!report.MarkdownContent) {
            return res.status(400).json({
                status: 'Error',
                message: '对比报告内容为空'
            });
        }

        // 设置下载响应头
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${report.CustomerName}-健康对比分析报告.md"`);

        res.send(report.MarkdownContent);
    } catch (error) {
        console.error('下载对比报告失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '下载对比报告失败'
        });
    }
});

// 转换对比报告为PDF
router.post('/comparison/:id/convert-pdf', async (req, res) => {
    try {
        const { id } = req.params;

        const report = await ComparisonReport.getById(id);

        if (!report) {
            return res.status(404).json({
                status: 'Error',
                message: '对比报告不存在'
            });
        }

        if (report.Status !== 'completed') {
            return res.status(400).json({
                status: 'Error',
                message: '对比报告尚未生成完成'
            });
        }

        if (!report.AIAnalysis) {
            return res.status(400).json({
                status: 'Error',
                message: '对比报告内容为空'
            });
        }

        // 检查PDF转换服务是否可用
        const serviceAvailable = await pdfService.isServiceAvailable();
        if (!serviceAvailable) {
            return res.status(503).json({
                status: 'Error',
                message: 'PDF转换服务不可用，请稍后重试'
            });
        }

        // 调用PDF转换服务
        const pdfResult = await pdfService.convertMarkdownToPDF(report.AIAnalysis);

        if (pdfResult.success) {
            res.json({
                status: 'Success',
                message: 'PDF转换成功',
                data: {
                    pdfData: pdfResult.pdfData,
                    processingTime: pdfResult.processingTime,
                    fileName: `${report.CustomerName}-健康对比分析报告.pdf`
                }
            });
        } else {
            res.status(500).json({
                status: 'Error',
                message: pdfResult.error || 'PDF转换失败'
            });
        }

    } catch (error) {
        console.error('转换PDF失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '转换PDF失败'
        });
    }
});

// 删除对比报告
router.delete('/comparison/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const success = await ComparisonReport.delete(id);

        if (!success) {
            return res.status(404).json({
                status: 'Error',
                message: '对比报告不存在'
            });
        }

        res.json({
            status: 'Success',
            message: '对比报告删除成功'
        });
    } catch (error) {
        console.error('删除对比报告失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '删除对比报告失败'
        });
    }
});

module.exports = router;
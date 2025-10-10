/**
 * 分类健康数据 API 路由
 * 版本: 1.0.0
 * 日期: 2025-10-06
 * 支持检验科、常规科室、影像科室的分类健康数据管理
 */

const express = require('express');
const router = express.Router();
const { executeQuery, sql } = require('../config/database');
const examinationDateService = require('../src/services/examinationDateService');
const unifiedHealthAssessmentService = require('../src/services/unifiedHealthAssessmentService');

// =====================================================================================
// 检验科健康数据 API
// =====================================================================================

/**
 * 保存检验科健康数据（使用统一健康评估服务）
 * POST /api/health-data/lab
 */
router.post('/lab', async (req, res) => {
    try {
        const { customerId, medicalExamId, departmentId, testDate, doctor, testItems } = req.body;

        // 验证必填字段 (testDate现在变为可选，会自动获取)
        if (!customerId || !medicalExamId || !departmentId || !testItems || !Array.isArray(testItems)) {
            return res.status(400).json({
                status: 'Error',
                message: '缺少必填字段或检验项目格式不正确'
            });
        }

        // 使用统一健康评估服务获取或创建健康评估记录
        console.log(`🔍 检验科数据 - 获取统一健康评估记录: 客户ID=${customerId}, 体检ID=${medicalExamId}`);
        const healthAssessment = await unifiedHealthAssessmentService.getOrCreateUnifiedAssessment(
            customerId,
            '检验科',
            medicalExamId,
            doctor,
            'system'
        );

        // 自动获取体检日期（如果未提供）
        let finalTestDate = testDate;
        if (!finalTestDate) {
            console.log(`为检验科数据自动获取体检日期，体检ID: ${medicalExamId}`);
            finalTestDate = await examinationDateService.getExaminationDate(medicalExamId);

            if (finalTestDate) {
                console.log(`✅ 成功获取检验日期: ${medicalExamId} -> ${finalTestDate}`);
            } else {
                console.warn(`⚠️ 未能获取检验日期，使用当前日期: ${medicalExamId}`);
                finalTestDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
            }
        }

        const pool = req.app.locals.pool || { request: () => ({ query: executeQuery }) };
        const results = [];

        // 批量插入检验项目
        for (const item of testItems) {
            if (!item.testName || !item.testResult) {
                continue; // 跳过无效项目
            }

            const query = `
                INSERT INTO LabHealthData (
                    CustomerID, MedicalExamID, DepartmentID, TestDate, TestName, TestResult,
                    ReferenceValue, Unit, AbnormalStatus, Doctor, CreatedAt
                ) VALUES (
                    @customerId, @medicalExamId, @departmentId, @testDate, @testName, @testResult,
                    @referenceValue, @unit, @abnormalStatus, @doctor, GETDATE()
                );

                SELECT SCOPE_IDENTITY() as id, * FROM LabHealthData WHERE ID = SCOPE_IDENTITY();
            `;

            const params = [
                { name: 'customerId', value: customerId, type: sql.UniqueIdentifier },
                { name: 'medicalExamId', value: medicalExamId, type: sql.NVarChar(50) },
                { name: 'departmentId', value: departmentId, type: sql.Int },
                { name: 'testDate', value: finalTestDate, type: sql.Date },
                { name: 'testName', value: item.testName, type: sql.NVarChar(200) },
                { name: 'testResult', value: item.testResult, type: sql.NVarChar(500) },
                { name: 'referenceValue', value: item.referenceValue || null, type: sql.NVarChar(200) },
                { name: 'unit', value: item.unit || null, type: sql.NVarChar(50) },
                { name: 'abnormalStatus', value: item.abnormalStatus || 0, type: sql.Int },
                { name: 'doctor', value: doctor || null, type: sql.NVarChar(100) }
            ];

            const result = await executeQuery(query, params);
            if (result.length > 0) {
                results.push(result[0]);
            }
        }

        res.status(201).json({
            status: 'Success',
            message: `成功保存 ${results.length} 条检验数据${testDate ? '' : '（已自动获取体检日期）'} - 使用统一健康评估记录`,
            data: {
                items: results,
                medicalExamId: healthAssessment.MedicalExamID,
                testDate: finalTestDate,
                dateSource: testDate ? 'manual' : 'auto',
                itemCount: results.length,
                healthAssessment: {
                    id: healthAssessment.ID,
                    assessmentDate: healthAssessment.AssessmentDate,
                    department: healthAssessment.Department,
                    isUnified: true
                }
            }
        });
    } catch (error) {
        console.error('保存检验数据失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '保存检验数据失败'
        });
    }
});

/**
 * 获取检客的检验数据
 * GET /api/health-data/lab/:customerId
 */
router.get('/lab/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;
        const { startDate, endDate } = req.query;

        let query = `
            SELECT lhd.*, d.Name as DepartmentName, c.Name as CustomerName
            FROM LabHealthData lhd
            LEFT JOIN Departments d ON lhd.DepartmentID = d.id
            LEFT JOIN Customers c ON lhd.CustomerID = c.ID
            WHERE lhd.CustomerID = @customerId
        `;

        const params = [{ name: 'customerId', value: customerId, type: sql.UniqueIdentifier }];

        if (startDate) {
            query += ` AND lhd.TestDate >= @startDate`;
            params.push({ name: 'startDate', value: startDate, type: sql.Date });
        }

        if (endDate) {
            query += ` AND lhd.TestDate <= @endDate`;
            params.push({ name: 'endDate', value: endDate, type: sql.Date });
        }

        query += ` ORDER BY lhd.TestDate DESC, lhd.CreatedAt DESC`;

        const results = await executeQuery(query, params);

        res.json({
            status: 'Success',
            message: '获取检验数据成功',
            data: results
        });
    } catch (error) {
        console.error('获取检验数据失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取检验数据失败'
        });
    }
});

// =====================================================================================
// 常规科室健康数据 API
// =====================================================================================

/**
 * 保存常规科室健康数据
 * POST /api/health-data/general
 */
router.post('/general', async (req, res) => {
    try {
        const { customerId, medicalExamId, departmentId, assessmentDate, doctor, assessmentItems } = req.body;

        // 验证必填字段 (assessmentDate现在变为可选，会自动获取)
        if (!customerId || !medicalExamId || !departmentId || !assessmentItems || !Array.isArray(assessmentItems)) {
            return res.status(400).json({
                status: 'Error',
                message: '缺少必填字段或评估项目格式不正确'
            });
        }

        // 自动获取体检日期
        let finalAssessmentDate = assessmentDate;
        if (!finalAssessmentDate) {
            console.log(`为常规科室数据自动获取体检日期，体检ID: ${medicalExamId}`);
            finalAssessmentDate = await examinationDateService.getExaminationDate(medicalExamId);

            if (finalAssessmentDate) {
                console.log(`✅ 成功获取评估日期: ${medicalExamId} -> ${finalAssessmentDate}`);
            } else {
                console.warn(`⚠️ 未能获取评估日期，使用当前日期: ${medicalExamId}`);
                finalAssessmentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
            }
        }

        const results = [];

        // 批量插入评估项目
        for (const item of assessmentItems) {
            if (!item.itemName || !item.itemResult) {
                continue; // 跳过无效项目
            }

            const query = `
                INSERT INTO GeneralHealthData (
                    CustomerID, MedicalExamID, DepartmentID, AssessmentDate, ItemName, ItemResult,
                    Doctor, CreatedAt
                ) VALUES (
                    @customerId, @medicalExamId, @departmentId, @assessmentDate, @itemName, @itemResult,
                    @doctor, GETDATE()
                );

                SELECT SCOPE_IDENTITY() as id, * FROM GeneralHealthData WHERE ID = SCOPE_IDENTITY();
            `;

            const params = [
                { name: 'customerId', value: customerId, type: sql.UniqueIdentifier },
                { name: 'medicalExamId', value: medicalExamId, type: sql.NVarChar(50) },
                { name: 'departmentId', value: departmentId, type: sql.UniqueIdentifier },
                { name: 'assessmentDate', value: finalAssessmentDate, type: sql.Date },
                { name: 'itemName', value: item.itemName, type: sql.NVarChar(200) },
                { name: 'itemResult', value: item.itemResult, type: sql.NVarChar(1000) },
                { name: 'doctor', value: doctor || null, type: sql.NVarChar(100) }
            ];

            const result = await executeQuery(query, params);
            if (result.length > 0) {
                results.push(result[0]);
            }
        }

        res.status(201).json({
            status: 'Success',
            message: `成功保存 ${results.length} 条评估数据${assessmentDate ? '' : '（已自动获取体检日期）'}`,
            data: {
                items: results,
                medicalExamId,
                assessmentDate: finalAssessmentDate,
                dateSource: assessmentDate ? 'manual' : 'auto',
                itemCount: results.length
            }
        });
    } catch (error) {
        console.error('保存评估数据失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '保存评估数据失败'
        });
    }
});

/**
 * 获取检客的常规科室健康数据
 * GET /api/health-data/general/:customerId
 */
router.get('/general/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;
        const { startDate, endDate } = req.query;

        let query = `
            SELECT ghd.*, d.Name as DepartmentName, c.Name as CustomerName
            FROM GeneralHealthData ghd
            LEFT JOIN Departments d ON ghd.DepartmentID = d.id
            LEFT JOIN Customers c ON ghd.CustomerID = c.ID
            WHERE ghd.CustomerID = @customerId
        `;

        const params = [{ name: 'customerId', value: customerId, type: sql.UniqueIdentifier }];

        if (startDate) {
            query += ` AND ghd.AssessmentDate >= @startDate`;
            params.push({ name: 'startDate', value: startDate, type: sql.Date });
        }

        if (endDate) {
            query += ` AND ghd.AssessmentDate <= @endDate`;
            params.push({ name: 'endDate', value: endDate, type: sql.Date });
        }

        query += ` ORDER BY ghd.AssessmentDate DESC, ghd.CreatedAt DESC`;

        const results = await executeQuery(query, params);

        res.json({
            status: 'Success',
            message: '获取评估数据成功',
            data: results
        });
    } catch (error) {
        console.error('获取评估数据失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取评估数据失败'
        });
    }
});

// =====================================================================================
// 影像科室健康数据 API
// =====================================================================================

/**
 * 保存影像科室健康数据
 * POST /api/health-data/imaging
 */
router.post('/imaging', async (req, res) => {
    try {
        const { customerId, medicalExamId, departmentId, examDate, doctor, examDescription, examConclusion } = req.body;

        // 验证必填字段 (examDate现在变为可选，会自动获取)
        if (!customerId || !medicalExamId || !departmentId || !examDescription || !examConclusion) {
            return res.status(400).json({
                status: 'Error',
                message: '缺少必填字段'
            });
        }

        // 自动获取体检日期
        let finalExamDate = examDate;
        if (!finalExamDate) {
            console.log(`为影像科室数据自动获取体检日期，体检ID: ${medicalExamId}`);
            finalExamDate = await examinationDateService.getExaminationDate(medicalExamId);

            if (finalExamDate) {
                console.log(`✅ 成功获取检查日期: ${medicalExamId} -> ${finalExamDate}`);
            } else {
                console.warn(`⚠️ 未能获取检查日期，使用当前日期: ${medicalExamId}`);
                finalExamDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
            }
        }

        const query = `
            INSERT INTO ImagingHealthData (
                CustomerID, MedicalExamID, DepartmentID, ExamDate, ExamDescription, ExamConclusion,
                Doctor, CreatedAt
            ) VALUES (
                @customerId, @medicalExamId, @departmentId, @examDate, @examDescription, @examConclusion,
                @doctor, GETDATE()
            );

            SELECT SCOPE_IDENTITY() as id, * FROM ImagingHealthData WHERE ID = SCOPE_IDENTITY();
        `;

        const params = [
            { name: 'customerId', value: customerId, type: sql.UniqueIdentifier },
            { name: 'medicalExamId', value: medicalExamId, type: sql.NVarChar(50) },
            { name: 'departmentId', value: departmentId, type: sql.UniqueIdentifier },
            { name: 'examDate', value: finalExamDate, type: sql.Date },
            { name: 'examDescription', value: examDescription, type: sql.NVarChar(sql.MAX) },
            { name: 'examConclusion', value: examConclusion, type: sql.NVarChar(2000) },
            { name: 'doctor', value: doctor || null, type: sql.NVarChar(100) }
        ];

        const result = await executeQuery(query, params);

        res.status(201).json({
            status: 'Success',
            message: `影像数据保存成功${examDate ? '' : '（已自动获取体检日期）'}`,
            data: {
                item: result[0],
                medicalExamId,
                examDate: finalExamDate,
                dateSource: examDate ? 'manual' : 'auto'
            }
        });
    } catch (error) {
        console.error('保存影像数据失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '保存影像数据失败'
        });
    }
});

/**
 * 获取检客的影像科室健康数据
 * GET /api/health-data/imaging/:customerId
 */
router.get('/imaging/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;
        const { startDate, endDate } = req.query;

        let query = `
            SELECT ihd.*, d.Name as DepartmentName, c.Name as CustomerName
            FROM ImagingHealthData ihd
            LEFT JOIN Departments d ON ihd.DepartmentID = d.id
            LEFT JOIN Customers c ON ihd.CustomerID = c.ID
            WHERE ihd.CustomerID = @customerId
        `;

        const params = [{ name: 'customerId', value: customerId, type: sql.UniqueIdentifier }];

        if (startDate) {
            query += ` AND ihd.ExamDate >= @startDate`;
            params.push({ name: 'startDate', value: startDate, type: sql.Date });
        }

        if (endDate) {
            query += ` AND ihd.ExamDate <= @endDate`;
            params.push({ name: 'endDate', value: endDate, type: sql.Date });
        }

        query += ` ORDER BY ihd.ExamDate DESC, ihd.CreatedAt DESC`;

        const results = await executeQuery(query, params);

        res.json({
            status: 'Success',
            message: '获取影像数据成功',
            data: results
        });
    } catch (error) {
        console.error('获取影像数据失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取影像数据失败'
        });
    }
});

// =====================================================================================
// 综合健康数据查询 API
// =====================================================================================

/**
 * 获取检客的所有健康数据
 * GET /api/health-data/customer/:customerId
 */
router.get('/customer/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;
        const { type, startDate, endDate } = req.query;

        let results = {
            laboratory: [],
            general: [],
            imaging: [],
            instrument: []
        };

        // 根据类型筛选数据
        if (!type || type === 'laboratory') {
            const labQuery = `
                SELECT lhd.*, d.Name as DepartmentName, d.Type as DepartmentType
                FROM LabHealthData lhd
                LEFT JOIN Departments d ON lhd.DepartmentID = d.id
                WHERE lhd.CustomerID = @customerId
                ${startDate ? 'AND lhd.TestDate >= @startDate' : ''}
                ${endDate ? 'AND lhd.TestDate <= @endDate' : ''}
                ORDER BY lhd.TestDate DESC
            `;

            const labParams = [{ name: 'customerId', value: customerId, type: sql.UniqueIdentifier }];
            if (startDate) labParams.push({ name: 'startDate', value: startDate, type: sql.Date });
            if (endDate) labParams.push({ name: 'endDate', value: endDate, type: sql.Date });

            results.laboratory = await executeQuery(labQuery, labParams);
        }

        if (!type || type === 'general') {
            const generalQuery = `
                SELECT ghd.*, d.Name as DepartmentName, d.Type as DepartmentType
                FROM GeneralHealthData ghd
                LEFT JOIN Departments d ON ghd.DepartmentID = d.id
                WHERE ghd.CustomerID = @customerId
                ${startDate ? 'AND ghd.AssessmentDate >= @startDate' : ''}
                ${endDate ? 'AND ghd.AssessmentDate <= @endDate' : ''}
                ORDER BY ghd.AssessmentDate DESC
            `;

            const generalParams = [{ name: 'customerId', value: customerId, type: sql.UniqueIdentifier }];
            if (startDate) generalParams.push({ name: 'startDate', value: startDate, type: sql.Date });
            if (endDate) generalParams.push({ name: 'endDate', value: endDate, type: sql.Date });

            results.general = await executeQuery(generalQuery, generalParams);
        }

        if (!type || type === 'imaging') {
            const imagingQuery = `
                SELECT ihd.*, d.Name as DepartmentName, d.Type as DepartmentType
                FROM ImagingHealthData ihd
                LEFT JOIN Departments d ON ihd.DepartmentID = d.id
                WHERE ihd.CustomerID = @customerId
                ${startDate ? 'AND ihd.ExamDate >= @startDate' : ''}
                ${endDate ? 'AND ihd.ExamDate <= @endDate' : ''}
                ORDER BY ihd.ExamDate DESC
            `;

            const imagingParams = [{ name: 'customerId', value: customerId, type: sql.UniqueIdentifier }];
            if (startDate) imagingParams.push({ name: 'startDate', value: startDate, type: sql.Date });
            if (endDate) imagingParams.push({ name: 'endDate', value: endDate, type: sql.Date });

            results.imaging = await executeQuery(imagingQuery, imagingParams);
        }

        if (!type || type === 'instrument') {
            const instrumentQuery = `
                SELECT ihd.*, d.Name as DepartmentName, d.Type as DepartmentType
                FROM InstrumentHealthData ihd
                LEFT JOIN Departments d ON ihd.DepartmentID = d.id
                WHERE ihd.CustomerID = @customerId
                ${startDate ? 'AND ihd.TestDate >= @startDate' : ''}
                ${endDate ? 'AND ihd.TestDate <= @endDate' : ''}
                ORDER BY ihd.TestDate DESC
            `;

            const instrumentParams = [{ name: 'customerId', value: customerId, type: sql.UniqueIdentifier }];
            if (startDate) instrumentParams.push({ name: 'startDate', value: startDate, type: sql.Date });
            if (endDate) instrumentParams.push({ name: 'endDate', value: endDate, type: sql.Date });

            results.instrument = await executeQuery(instrumentQuery, instrumentParams);
        }

        res.json({
            status: 'Success',
            message: '获取健康数据成功',
            data: results
        });
    } catch (error) {
        console.error('获取健康数据失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取健康数据失败'
        });
    }
});

// =====================================================================================
// 仪器室健康数据 API
// =====================================================================================

/**
 * 保存仪器室健康数据
 * POST /api/health-data/instrument
 */
router.post('/instrument', async (req, res) => {
    try {
        const { customerId, medicalExamId, departmentId, testDate, doctor, testItems } = req.body;

        // 验证必填字段 (testDate现在变为可选，会自动获取)
        if (!customerId || !medicalExamId || !departmentId || !testItems || !Array.isArray(testItems)) {
            return res.status(400).json({
                status: 'Error',
                message: '缺少必填字段或测试项目格式不正确'
            });
        }

        // 自动获取体检日期
        let finalTestDate = testDate;
        if (!finalTestDate) {
            console.log(`为仪器室数据自动获取体检日期，体检ID: ${medicalExamId}`);
            finalTestDate = await examinationDateService.getExaminationDate(medicalExamId);

            if (finalTestDate) {
                console.log(`✅ 成功获取测试日期: ${medicalExamId} -> ${finalTestDate}`);
            } else {
                console.warn(`⚠️ 未能获取测试日期，使用当前日期: ${medicalExamId}`);
                finalTestDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
            }
        }

        const results = [];

        // 批量插入测试项目
        for (const item of testItems) {
            if (!item.testName || !item.testResult) {
                continue; // 跳过无效项目
            }

            const query = `
                INSERT INTO InstrumentHealthData (
                    CustomerID, MedicalExamID, DepartmentID, TestDate, TestName, TestResult,
                    ReferenceValue, Unit, AbnormalStatus, Doctor, CreatedAt
                ) VALUES (
                    @customerId, @medicalExamId, @departmentId, @testDate, @testName, @testResult,
                    @referenceValue, @unit, @abnormalStatus, @doctor, GETDATE()
                );

                SELECT SCOPE_IDENTITY() as id, * FROM InstrumentHealthData WHERE ID = SCOPE_IDENTITY();
            `;

            const params = [
                { name: 'customerId', value: customerId, type: sql.UniqueIdentifier },
                { name: 'medicalExamId', value: medicalExamId, type: sql.NVarChar(50) },
                { name: 'departmentId', value: departmentId, type: sql.UniqueIdentifier },
                { name: 'testDate', value: finalTestDate, type: sql.Date },
                { name: 'testName', value: item.testName, type: sql.NVarChar(200) },
                { name: 'testResult', value: item.testResult, type: sql.NVarChar(500) },
                { name: 'referenceValue', value: item.referenceValue || null, type: sql.NVarChar(200) },
                { name: 'unit', value: item.unit || null, type: sql.NVarChar(50) },
                { name: 'abnormalStatus', value: item.abnormalStatus || 0, type: sql.Int },
                { name: 'doctor', value: doctor || null, type: sql.NVarChar(100) }
            ];

            const result = await executeQuery(query, params);
            if (result.length > 0) {
                results.push(result[0]);
            }
        }

        res.status(201).json({
            status: 'Success',
            message: `成功保存 ${results.length} 条测试数据${testDate ? '' : '（已自动获取体检日期）'}`,
            data: {
                items: results,
                medicalExamId,
                testDate: finalTestDate,
                dateSource: testDate ? 'manual' : 'auto',
                itemCount: results.length
            }
        });
    } catch (error) {
        console.error('保存测试数据失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '保存测试数据失败'
        });
    }
});

/**
 * 获取检客的仪器室健康数据
 * GET /api/health-data/instrument/:customerId
 */
router.get('/instrument/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;
        const { startDate, endDate } = req.query;

        let query = `
            SELECT ihd.*, d.Name as DepartmentName, c.Name as CustomerName
            FROM InstrumentHealthData ihd
            LEFT JOIN Departments d ON ihd.DepartmentID = d.id
            LEFT JOIN Customers c ON ihd.CustomerID = c.ID
            WHERE ihd.CustomerID = @customerId
        `;

        const params = [{ name: 'customerId', value: customerId, type: sql.UniqueIdentifier }];

        if (startDate) {
            query += ` AND ihd.TestDate >= @startDate`;
            params.push({ name: 'startDate', value: startDate, type: sql.Date });
        }

        if (endDate) {
            query += ` AND ihd.TestDate <= @endDate`;
            params.push({ name: 'endDate', value: endDate, type: sql.Date });
        }

        query += ` ORDER BY ihd.TestDate DESC, ihd.CreatedAt DESC`;

        const results = await executeQuery(query, params);

        res.json({
            status: 'Success',
            message: '获取测试数据成功',
            data: results
        });
    } catch (error) {
        console.error('获取测试数据失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取测试数据失败'
        });
    }
});

// =====================================================================================
// 体检结果获取 API（预留接口）
// =====================================================================================

/**
 * 获取检客体检结果（预留接口）
 * GET /api/health-data/fetch-results/:customerId
 */
router.get('/fetch-results/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;

        // TODO: 实现从外部系统获取体检结果的逻辑
        // 这里可以调用第三方API、读取文件、连接其他数据库等

        // 模拟返回
        setTimeout(() => {
            res.json({
                status: 'Success',
                message: '体检结果获取成功（演示）',
                data: {
                    customerId,
                    fetchTime: new Date().toISOString(),
                    results: [
                        {
                            type: 'laboratory',
                            testName: '血常规',
                            testResult: '4.5',
                            referenceValue: '3.5-9.5',
                            unit: '10^9/L',
                            abnormalStatus: 0
                        }
                    ]
                }
            });
        }, 1000);

    } catch (error) {
        console.error('获取体检结果失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取体检结果失败'
        });
    }
});

module.exports = router;
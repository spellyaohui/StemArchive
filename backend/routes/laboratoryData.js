const express = require('express');
const router = express.Router();
const examinationDateService = require('../src/services/examinationDateService');

/**
 * 保存检验科数据
 * POST /api/laboratory-data
 */
router.post('/', async (req, res) => {
    try {
        const { customerId, examId, checkDate, laboratoryItems, doctor } = req.body;

        // 验证必需字段（checkDate现在变为可选，会自动获取）
        if (!customerId || !examId || !laboratoryItems || laboratoryItems.length === 0) {
            return res.status(400).json({
                status: 'Error',
                message: '缺少必需的字段'
            });
        }

        // 自动获取体检日期
        let finalCheckDate = checkDate;
        if (!finalCheckDate) {
            console.log(`为检验科数据自动获取体检日期，体检ID: ${examId}`);
            finalCheckDate = await examinationDateService.getExaminationDate(examId);

            if (finalCheckDate) {
                console.log(`✅ 成功获取检验日期: ${examId} -> ${finalCheckDate}`);
            } else {
                console.warn(`⚠️ 未能获取检验日期，使用当前日期: ${examId}`);
                finalCheckDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
            }
        }

        const pool = require('../config/database').pool;
        const sql = require('mssql');

        // 根据传入的customerId查询真实的CustomerID
        let realCustomerId = customerId;
        if (customerId && customerId.length !== 36) {
            // 如果传入的不是GUID格式，尝试根据IdentityCard查询
            const customerRequest = new sql.Request(pool);
            customerRequest.input('IdentityCard', sql.NVarChar, customerId);

            const customerQuery = `SELECT ID FROM Customers WHERE IdentityCard = @IdentityCard`;
            const customerResult = await customerRequest.query(customerQuery);

            if (customerResult.recordset.length > 0) {
                realCustomerId = customerResult.recordset[0].ID;
            } else {
                return res.status(400).json({
                    status: 'Error',
                    message: '未找到对应的检客信息'
                });
            }
        }

        // 检查体检ID是否已存在
        const checkRequest = new sql.Request(pool);
        checkRequest.input('ExamId', sql.NVarChar, examId);
        checkRequest.input('CustomerId', sql.UniqueIdentifier, realCustomerId);

        const checkQuery = `SELECT COUNT(*) as count FROM LaboratoryData
                           WHERE ExamId = @ExamId AND CustomerId = @CustomerId`;
        const checkResult = await checkRequest.query(checkQuery);

        if (checkResult.recordset[0].count > 0) {
            return res.status(400).json({
                status: 'Error',
                message: '该体检ID的数据已存在，请勿重复保存'
            });
        }

        // 插入检验数据
        let successCount = 0;
        for (const item of laboratoryItems) {
            const insertRequest = new sql.Request(pool);
            insertRequest.input('CustomerId', sql.UniqueIdentifier, realCustomerId);
            insertRequest.input('ExamId', sql.NVarChar, examId);
            insertRequest.input('CheckDate', sql.Date, finalCheckDate);
            insertRequest.input('TestCategory', sql.NVarChar, item.testCategory || '检验科数据');
            insertRequest.input('ItemName', sql.NVarChar, item.testName);
            insertRequest.input('ItemResult', sql.NVarChar, item.testResult);
            insertRequest.input('ItemUnit', sql.NVarChar, item.unit || '');
            insertRequest.input('ReferenceValue', sql.NVarChar, item.referenceValue || '');
            insertRequest.input('AbnormalFlag', sql.Int, parseInt(item.abnormalFlag) || 0);
            insertRequest.input('Doctor', sql.NVarChar, item.doctor || doctor || '');
            insertRequest.input('Department', sql.NVarChar, 'laboratory');
            insertRequest.input('Status', sql.NVarChar, 'active');
            insertRequest.input('CreatedAt', sql.DateTime, new Date());

            const insertQuery = `
                INSERT INTO LaboratoryData (
                    CustomerId, ExamId, CheckDate, TestCategory, ItemName,
                    ItemResult, ItemUnit, ReferenceValue, AbnormalFlag, Doctor,
                    Department, Status, CreatedAt
                ) VALUES (
                    @CustomerId, @ExamId, @CheckDate, @TestCategory, @ItemName,
                    @ItemResult, @ItemUnit, @ReferenceValue, @AbnormalFlag, @Doctor,
                    @Department, @Status, @CreatedAt
                )`;

            await insertRequest.query(insertQuery);
            successCount++;
        }

        res.status(200).json({
            status: 'Success',
            message: `成功保存 ${successCount} 项检验数据${checkDate ? '' : '（已自动获取体检日期）'}`,
            data: {
                customerId,
                examId,
                itemCount: successCount,
                checkDate: finalCheckDate,
                dateSource: checkDate ? 'manual' : 'auto'
            }
        });

    } catch (error) {
        console.error('保存检验数据失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '保存检验数据失败: ' + error.message
        });
    }
});

/**
 * 检查体检ID是否已存在
 * GET /api/laboratory-data/check-exam-id/:examId
 */
router.get('/check-exam-id/:examId', async (req, res) => {
    try {
        const { examId } = req.params;
        const sql = require('mssql');

        const pool = require('../config/database').pool;

        const request = new sql.Request(pool);
        request.input('ExamId', sql.NVarChar, examId);

        const query = `
            SELECT COUNT(*) as count
            FROM LaboratoryData
            WHERE ExamId = @ExamId AND Status = 'active'
        `;

        const result = await request.query(query);
        const exists = result.recordset[0].count > 0;

        res.status(200).json({
            status: 'Success',
            message: '检查体检ID完成',
            data: {
                exists,
                examId
            }
        });

    } catch (error) {
        console.error('检查体检ID失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '检查体检ID失败: ' + error.message
        });
    }
});

/**
 * 获取体检日期
 * GET /api/laboratory-data/get-exam-date/:examId
 */
router.get('/get-exam-date/:examId', async (req, res) => {
    try {
        const { examId } = req.params;

        if (!examId) {
            return res.status(400).json({
                status: 'Error',
                message: '体检ID不能为空'
            });
        }

        console.log(`获取检验科体检日期，体检ID: ${examId}`);
        const examDate = await examinationDateService.getExaminationDate(examId);

        if (examDate) {
            res.status(200).json({
                status: 'Success',
                message: '成功获取体检日期',
                data: {
                    examId,
                    examDate,
                    source: 'third_party_api'
                }
            });
        } else {
            res.status(200).json({
                status: 'Success',
                message: '未找到对应的体检日期',
                data: {
                    examId,
                    examDate: null,
                    source: 'not_found'
                }
            });
        }

    } catch (error) {
        console.error('获取体检日期失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取体检日期失败: ' + error.message
        });
    }
});

/**
 * 批量获取体检日期
 * POST /api/laboratory-data/batch-exam-dates
 */
router.post('/batch-exam-dates', async (req, res) => {
    try {
        const { examIds } = req.body;

        if (!Array.isArray(examIds) || examIds.length === 0) {
            return res.status(400).json({
                status: 'Error',
                message: '体检ID列表不能为空'
            });
        }

        console.log(`批量获取检验科体检日期，体检ID数量: ${examIds.length}`);
        const examDateMap = await examinationDateService.getBatchExaminationDates(examIds);

        const results = [];
        for (const [examId, examDate] of examDateMap) {
            results.push({
                examId,
                examDate,
                source: 'third_party_api'
            });
        }

        res.status(200).json({
            status: 'Success',
            message: `成功获取 ${results.length} 个体检日期`,
            data: {
                totalCount: examIds.length,
                successCount: results.length,
                results
            }
        });

    } catch (error) {
        console.error('批量获取体检日期失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '批量获取体检日期失败: ' + error.message
        });
    }
});

module.exports = router;
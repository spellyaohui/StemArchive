/**
 * 体检数据导入API路由
 * 提供体检数据自动获取和导入功能
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const examinationDataImportService = require('../services/examinationDataImportService');
const departmentCodeService = require('../services/departmentCodeService');

/**
 * 根据身份证号获取体检ID列表
 * GET /api/examination-import/exam-ids/:identityCard
 */
router.get('/exam-ids/:identityCard', authMiddleware, async (req, res) => {
    try {
        const { identityCard } = req.params;

        if (!identityCard) {
            return res.status(400).json({
                status: 'Error',
                message: '身份证号不能为空'
            });
        }

        const examIds = await departmentCodeService.getExaminationIds(identityCard);

        res.json({
            status: 'Success',
            message: '获取成功',
            data: examIds
        });

    } catch (error) {
        console.error('获取体检ID列表失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取体检ID列表失败: ' + error.message
        });
    }
});

/**
 * 根据体检ID获取科室编码列表
 * GET /api/examination-import/department-codes/:examId
 */
router.get('/department-codes/:examId', authMiddleware, async (req, res) => {
    try {
        const { examId } = req.params;

        if (!examId) {
            return res.status(400).json({
                status: 'Error',
                message: '体检ID不能为空'
            });
        }

        const departmentCodes = await departmentCodeService.getDepartmentCodes(examId);

        res.json({
            status: 'Success',
            message: '获取成功',
            data: departmentCodes
        });

    } catch (error) {
        console.error('获取科室编码失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取科室编码失败: ' + error.message
        });
    }
});

/**
 * 获取体检预览信息
 * GET /api/examination-import/preview/:examId
 */
router.get('/preview/:examId', authMiddleware, async (req, res) => {
    try {
        const { examId } = req.params;

        if (!examId) {
            return res.status(400).json({
                status: 'Error',
                message: '体检ID不能为空'
            });
        }

        const preview = await examinationDataImportService.getExaminationPreview(examId);

        res.json({
            status: 'Success',
            message: '获取成功',
            data: preview
        });

    } catch (error) {
        console.error('获取体检预览信息失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取体检预览信息失败: ' + error.message
        });
    }
});

/**
 * 批量获取体检预览信息
 * POST /api/examination-import/preview-batch
 */
router.post('/preview-batch', authMiddleware, async (req, res) => {
    try {
        const { examIds } = req.body;

        if (!examIds || !Array.isArray(examIds) || examIds.length === 0) {
            return res.status(400).json({
                status: 'Error',
                message: '体检ID列表不能为空'
            });
        }

        const previews = [];
        for (const examId of examIds) {
            const preview = await examinationDataImportService.getExaminationPreview(examId);
            previews.push(preview);
        }

        res.json({
            status: 'Success',
            message: '获取成功',
            data: previews
        });

    } catch (error) {
        console.error('批量获取体检预览信息失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '批量获取体检预览信息失败: ' + error.message
        });
    }
});

/**
 * 导入体检数据
 * POST /api/examination-import/import
 */
router.post('/import', authMiddleware, async (req, res) => {
    try {
        const { identityCard, customerId, selectedExamIds } = req.body;

        if (!identityCard) {
            return res.status(400).json({
                status: 'Error',
                message: '身份证号不能为空'
            });
        }

        if (!customerId) {
            return res.status(400).json({
                status: 'Error',
                message: '客户ID不能为空'
            });
        }

        console.log(`📋 开始导入体检数据 - 身份证号: ${identityCard}, 客户ID: ${customerId}`);

        const result = await examinationDataImportService.importAllExaminationData(
            identityCard, 
            customerId, 
            selectedExamIds
        );

        if (result.success) {
            res.json({
                status: 'Success',
                message: result.message,
                data: result
            });
        } else {
            res.status(400).json({
                status: 'Error',
                message: result.message,
                data: result
            });
        }

    } catch (error) {
        console.error('导入体检数据失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '导入体检数据失败: ' + error.message
        });
    }
});

/**
 * 导入单个体检记录
 * POST /api/examination-import/import-single
 */
router.post('/import-single', authMiddleware, async (req, res) => {
    try {
        const { examId, customerId } = req.body;

        if (!examId) {
            return res.status(400).json({
                status: 'Error',
                message: '体检ID不能为空'
            });
        }

        if (!customerId) {
            return res.status(400).json({
                status: 'Error',
                message: '客户ID不能为空'
            });
        }

        console.log(`📋 开始导入单个体检记录 - 体检ID: ${examId}, 客户ID: ${customerId}`);

        // 获取系统科室列表
        const systemDepartments = await examinationDataImportService.getSystemDepartments();

        // 处理单个体检记录
        const result = await examinationDataImportService.processExamination(examId, customerId, systemDepartments);

        const processedCount = result.processed.length;
        const skippedCount = result.skipped.length;
        const emptyCount = result.empty.length;
        const failedCount = result.failed.length;

        const message = `导入完成！成功导入 ${processedCount} 个科室数据，` +
            `跳过 ${skippedCount} 个未知科室，` +
            `${emptyCount} 个科室无数据，` +
            `${failedCount} 个科室导入失败`;

        res.json({
            status: 'Success',
            message,
            data: result
        });

    } catch (error) {
        console.error('导入单个体检记录失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '导入单个体检记录失败: ' + error.message
        });
    }
});

module.exports = router;

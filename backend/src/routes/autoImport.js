/**
 * 自动导入管理API路由
 * 提供自动导入状态查询、手动触发等功能
 */

const express = require('express');
const router = express.Router();
const autoImportService = require('../services/autoImportService');

/**
 * 获取自动导入服务状态
 * GET /api/auto-import/status
 */
router.get('/status', async (req, res) => {
    try {
        const status = autoImportService.getStatus();
        res.json({
            status: 'Success',
            message: '获取自动导入状态成功',
            data: status
        });
    } catch (error) {
        console.error('获取自动导入状态失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取自动导入状态失败: ' + error.message
        });
    }
});

/**
 * 手动触发一次自动导入
 * POST /api/auto-import/trigger
 */
router.post('/trigger', async (req, res) => {
    try {
        if (autoImportService.isRunning) {
            return res.status(409).json({
                status: 'Error',
                message: '自动导入任务正在执行中，请稍后再试'
            });
        }

        // 异步执行，不阻塞响应
        const resultPromise = autoImportService.run();

        res.json({
            status: 'Success',
            message: '自动导入任务已触发，正在后台执行',
            data: {
                runNumber: autoImportService.runCount + 1,
                startTime: new Date().toISOString()
            }
        });

        // 等待执行完成（日志会输出结果）
        await resultPromise;
    } catch (error) {
        console.error('触发自动导入失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '触发自动导入失败: ' + error.message
        });
    }
});

/**
 * 获取最近一次执行结果
 * GET /api/auto-import/last-result
 */
router.get('/last-result', async (req, res) => {
    try {
        const result = autoImportService.lastRunResult;
        if (!result) {
            return res.json({
                status: 'Success',
                message: '尚未执行过自动导入',
                data: null
            });
        }

        res.json({
            status: 'Success',
            message: '获取最近执行结果成功',
            data: result
        });
    } catch (error) {
        console.error('获取执行结果失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取执行结果失败: ' + error.message
        });
    }
});

module.exports = router;

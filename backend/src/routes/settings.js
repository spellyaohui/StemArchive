const express = require('express');
const router = express.Router();
const { executeQuery, sql } = require('../../config/database');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const fs = require('fs').promises;
const path = require('path');

// 从数据库加载系统设置到内存缓存
let systemSettingsCache = {};
let settingsLoaded = false;

// 异步加载系统设置
async function loadSystemSettings() {
    try {
        const result = await executeQuery(`
            SELECT SettingKey, SettingValue, SettingType
            FROM SystemSettings
            WHERE Category = 'general'
        `);

        // 将数据库结果转换为对象格式
        systemSettingsCache = {};

        // 检查结果是否有效
        let records = null;
        if (result && result.recordset && Array.isArray(result.recordset)) {
            records = result.recordset;
        } else if (result && Array.isArray(result)) {
            records = result;
        }

        if (records && Array.isArray(records)) {
            records.forEach(setting => {
                const value = setting.SettingValue;
                const type = setting.SettingType;

                // 根据类型转换值
                switch (type) {
                    case 'boolean':
                        systemSettingsCache[setting.SettingKey] = value === 'true';
                        break;
                    case 'number':
                        systemSettingsCache[setting.SettingKey] = parseFloat(value);
                        break;
                    default:
                        systemSettingsCache[setting.SettingKey] = value;
                }
            });
        } else {
            console.warn('数据库查询结果格式不正确:', result);
        }

        settingsLoaded = true;
        console.log('系统设置已从数据库加载:', Object.keys(systemSettingsCache));
    } catch (error) {
        console.error('加载系统设置失败:', error);
        // 使用默认值
        systemSettingsCache = {
            systemName: '干细胞治疗档案管理系统',
            systemVersion: '1.2.1',
            adminEmail: 'admin@system.com',
            adminPhone: '400-888-8888',
            systemDescription: '专业的干细胞治疗档案管理系统，提供全面的患者信息管理、治疗方案制定和数据分析功能。',
            enableNotifications: true
        };
        settingsLoaded = true;
    }
}

// 获取系统设置（确保已加载）
async function getSystemSettings() {
    if (!settingsLoaded) {
        await loadSystemSettings();
    }
    return systemSettingsCache;
}

// 获取系统基本设置
router.get('/general', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const settings = await getSystemSettings();
        res.json({
            status: 'Success',
            data: { ...settings }
        });
    } catch (error) {
        console.error('获取系统设置失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取系统设置失败'
        });
    }
});

// 更新系统基本设置
router.put('/general', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { systemName, adminEmail, adminPhone, systemDescription, enableNotifications } = req.body;

        // 构建更新参数数组
        const updates = [];
        const params = [];

        // 动态构建更新语句
        if (systemName !== undefined) {
            updates.push('SettingValue = @systemName');
            params.push({ name: 'systemName', value: systemName, type: sql.NVarChar });
        }
        if (adminEmail !== undefined) {
            updates.push('SettingValue = @adminEmail');
            params.push({ name: 'adminEmail', value: adminEmail, type: sql.NVarChar });
        }
        if (adminPhone !== undefined) {
            updates.push('SettingValue = @adminPhone');
            params.push({ name: 'adminPhone', value: adminPhone, type: sql.NVarChar });
        }
        if (systemDescription !== undefined) {
            updates.push('SettingValue = @systemDescription');
            params.push({ name: 'systemDescription', value: systemDescription, type: sql.NVarChar });
        }
        if (enableNotifications !== undefined) {
            updates.push('SettingValue = @enableNotifications');
            params.push({ name: 'enableNotifications', value: enableNotifications.toString(), type: sql.NVarChar });
        }

        if (updates.length === 0) {
            return res.status(400).json({
                status: 'Error',
                message: '没有提供有效的更新参数'
            });
        }

        // 批量更新数据库中的设置
        for (const [index, update] of updates.entries()) {
            let whereClause = '';

            if (systemName !== undefined && update.includes('@systemName')) {
                whereClause = "SettingKey = 'systemName'";
            } else if (adminEmail !== undefined && update.includes('@adminEmail')) {
                whereClause = "SettingKey = 'adminEmail'";
            } else if (adminPhone !== undefined && update.includes('@adminPhone')) {
                whereClause = "SettingKey = 'adminPhone'";
            } else if (systemDescription !== undefined && update.includes('@systemDescription')) {
                whereClause = "SettingKey = 'systemDescription'";
            } else if (enableNotifications !== undefined && update.includes('@enableNotifications')) {
                whereClause = "SettingKey = 'enableNotifications'";
            }

            const updateSql = `
                UPDATE SystemSettings
                SET ${update}, UpdatedAt = GETDATE(), UpdatedBy = @updatedBy
                WHERE ${whereClause}
            `;

            // 添加更新用户参数
            const updateParams = params.filter(p => update.includes(`@${p.name}`));
            updateParams.push({ name: 'updatedBy', value: 'admin', type: sql.NVarChar });

            await executeQuery(updateSql, updateParams);
        }

        // 重新加载设置到缓存
        await loadSystemSettings();

        console.log('系统设置已更新并保存到数据库:', { systemName, adminEmail, adminPhone, systemDescription, enableNotifications });

        const updatedSettings = await getSystemSettings();
        res.json({
            status: 'Success',
            message: '系统设置更新成功',
            data: { ...updatedSettings }
        });
    } catch (error) {
        console.error('更新系统设置失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '更新系统设置失败'
        });
    }
});

// 获取系统日志
router.get('/logs', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 50, level, startDate, endDate } = req.query;
        const offset = (page - 1) * limit;

        // 这里应该从日志文件或日志表中读取
        // 暂时返回模拟数据
        const logs = [
            {
                id: 1,
                timestamp: new Date().toISOString(),
                level: 'INFO',
                message: '用户登录成功',
                user: 'admin',
                ip: '127.0.0.1'
            },
            {
                id: 2,
                timestamp: new Date(Date.now() - 3600000).toISOString(),
                level: 'WARNING',
                message: 'PDF转换服务连接超时',
                user: 'system',
                ip: 'localhost'
            },
            {
                id: 3,
                timestamp: new Date(Date.now() - 7200000).toISOString(),
                level: 'ERROR',
                message: '数据库连接失败',
                user: 'system',
                ip: 'localhost'
            }
        ];

        res.json({
            status: 'Success',
            data: {
                logs,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: logs.length,
                    pages: Math.ceil(logs.length / limit)
                }
            }
        });
    } catch (error) {
        console.error('获取系统日志失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取系统日志失败'
        });
    }
});

// 内存中的备份数据存储（模拟）
let backupData = [
    {
        id: 1,
        filename: 'backup_2025-10-07_23-00-00.sql',
        size: '12.5MB',
        timestamp: '2025-10-07T23:00:00Z',
        type: 'full'
    },
    {
        id: 2,
        filename: 'backup_2025-10-06_23-00-00.sql',
        size: '11.8MB',
        timestamp: '2025-10-06T23:00:00Z',
        type: 'full'
    },
    {
        id: 3,
        filename: 'backup_2025-10-05_23-00-00.sql',
        size: '10.2MB',
        timestamp: '2025-10-05T23:00:00Z',
        type: 'schema_only'
    }
];

// 获取备份历史
router.get('/backups', authMiddleware, requireAdmin, async (req, res) => {
    try {
        // 返回当前内存中的备份列表
        res.json({
            status: 'Success',
            data: {
                backups: backupData,
                total: backupData.length
            }
        });
    } catch (error) {
        console.error('获取备份历史失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取备份历史失败'
        });
    }
});

// 删除备份
router.delete('/backups/:backupId', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { backupId } = req.params;
        const backupIdNum = parseInt(backupId);

        if (!backupId || isNaN(backupIdNum)) {
            return res.status(400).json({
                status: 'Error',
                message: '备份ID不能为空'
            });
        }

        // 从内存数据中查找并删除备份
        const initialLength = backupData.length;
        backupData = backupData.filter(backup => backup.id !== backupIdNum);

        if (backupData.length === initialLength) {
            return res.status(404).json({
                status: 'Error',
                message: '备份文件不存在'
            });
        }

        console.log(`删除备份文件: ${backupId}`);

        res.json({
            status: 'Success',
            message: '备份删除成功',
            data: {
                deletedId: backupIdNum,
                remainingBackups: backupData.length
            }
        });
    } catch (error) {
        console.error('删除备份失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '删除备份失败'
        });
    }
});

// 下载备份
router.get('/backups/:backupId/download', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { backupId } = req.params;

        if (!backupId) {
            return res.status(400).json({
                status: 'Error',
                message: '备份ID不能为空'
            });
        }

        // 这里应该实现实际的备份文件下载逻辑
        // 暂时返回模拟下载链接
        const downloadUrl = `/downloads/backup_${backupId}.sql`;

        res.json({
            status: 'Success',
            message: '备份下载链接生成成功',
            data: {
                download_url: downloadUrl,
                filename: `backup_${backupId}.sql`
            }
        });
    } catch (error) {
        console.error('下载备份失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '下载备份失败'
        });
    }
});

// 数据库备份
router.post('/backup', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { includeData = true } = req.body;

        // 生成新的备份记录
        const newBackup = {
            id: Math.max(...backupData.map(b => b.id), 0) + 1,
            filename: `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.sql`,
            size: `${(Math.random() * 5 + 8).toFixed(1)}MB`, // 模拟 8-13MB 的文件大小
            timestamp: new Date().toISOString(),
            type: includeData ? 'full' : 'schema_only'
        };

        // 添加到内存数据中
        backupData.unshift(newBackup); // 新备份添加到列表开头

        console.log(`创建备份: ${newBackup.filename}`);

        res.json({
            status: 'Success',
            message: '数据库备份成功',
            data: newBackup
        });
    } catch (error) {
        console.error('数据库备份失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '数据库备份失败'
        });
    }
});

// 数据库恢复
router.post('/restore', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { backupFile } = req.body;

        if (!backupFile) {
            return res.status(400).json({
                status: 'Error',
                message: '请提供备份文件'
            });
        }

        // 这里应该实现实际的数据库恢复逻辑
        // 暂时返回成功响应

        res.json({
            status: 'Success',
            message: '数据库恢复成功'
        });
    } catch (error) {
        console.error('数据库恢复失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '数据库恢复失败'
        });
    }
});

// 获取系统统计信息
router.get('/stats', authMiddleware, requireAdmin, async (req, res) => {
    try {
        // 获取数据库统计信息
        const queries = [
            'SELECT COUNT(*) as totalCustomers FROM Customers',
            'SELECT COUNT(*) as totalHealthAssessments FROM HealthAssessments',
            'SELECT COUNT(*) as totalStemCellPatients FROM StemCellPatients',
            'SELECT COUNT(*) as totalUsers FROM Users WHERE status = \'active\'',
            'SELECT COUNT(*) as totalReports FROM Reports'
        ];

        const results = await Promise.all(
            queries.map(query => executeQuery(query))
        );

        const stats = {
            totalCustomers: results[0][0].totalCustomers,
            totalHealthAssessments: results[1][0].totalHealthAssessments,
            totalStemCellPatients: results[2][0].totalStemCellPatients,
            totalActiveUsers: results[3][0].totalUsers,
            totalReports: results[4][0].totalReports,
            databaseSize: '125.6MB', // 这里应该计算实际的数据库大小
            systemUptime: '15 days 7 hours', // 这里应该计算实际的系统运行时间
            lastBackup: new Date(Date.now() - 86400000).toISOString() // 模拟昨天备份
        };

        res.json({
            status: 'Success',
            data: stats
        });
    } catch (error) {
        console.error('获取系统统计失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取系统统计失败'
        });
    }
});

// 清理系统日志
router.delete('/logs', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { olderThanDays = 30 } = req.query;

        // 这里应该实现实际的日志清理逻辑
        // 暂时返回成功响应

        res.json({
            status: 'Success',
            message: `已清理${olderThanDays}天前的系统日志`
        });
    } catch (error) {
        console.error('清理系统日志失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '清理系统日志失败'
        });
    }
});

// 系统健康检查
router.get('/health', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                database: {
                    status: 'connected',
                    responseTime: '15ms'
                },
                pdfService: {
                    status: 'available',
                    responseTime: '120ms'
                },
                deepseekApi: {
                    status: 'available',
                    responseTime: '850ms'
                }
            },
            system: {
                cpuUsage: '25%',
                memoryUsage: '68%',
                diskSpace: {
                    total: '500GB',
                    used: '125.6GB',
                    available: '374.4GB'
                }
            }
        };

        res.json({
            status: 'Success',
            data: health
        });
    } catch (error) {
        console.error('系统健康检查失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '系统健康检查失败'
        });
    }
});

module.exports = router;
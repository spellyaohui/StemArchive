/**
 * 简化的科室管理 API 路由
 * 用于测试和调试
 */

const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { ApiResponse } = require('../utils/apiResponse');
const auth = require('../middleware/auth');

/**
 * 创建新科室 - 简化版本
 * POST /api/departments/simple
 */
router.post('/simple', auth.authenticate, async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        const { code, name, type, description, sort_order, status } = req.body;

        console.log('收到科室创建请求:', { code, name, type, description, sort_order, status });

        // 验证必填字段
        if (!code || !name || !type) {
            return res.status(400).json(ApiResponse.error('科室编码、名称和类型为必填字段'));
        }

        // 使用简单的插入方法，让数据库处理所有字段
        const result = await pool.request()
            .input('name', sql.NVarChar(50), name)
            .input('code', sql.NVarChar(20), code)
            .input('type', sql.NVarChar(20), type)
            .input('description', sql.NVarChar(200), description || null)
            .input('sort_order', sql.Int, sort_order || 0)
            .input('status', sql.NVarChar(20), status || 'active')
            .query(`
                INSERT INTO Departments (Name, Code, Description, Type, Status, Sort_Order)
                VALUES (@name, @code, @description, @type, @status, @sort_order);

                SELECT SCOPE_IDENTITY() as NewID;
            `);

        console.log('科室插入成功，返回ID:', result.recordset[0].NewID);

        res.status(201).json(ApiResponse.success({
            message: '科室创建成功',
            data: {
                code: code,
                name: name,
                type: type
            }
        }, '科室创建成功'));

    } catch (error) {
        console.error('创建科室失败（简化版）:', error);

        // 提供更详细的错误信息
        if (error.number === 2627) {
            return res.status(400).json(ApiResponse.error('科室编码或名称已存在'));
        } else if (error.number === 206) {
            return res.status(500).json(ApiResponse.error('数据库字段类型不匹配'));
        } else {
            return res.status(500).json(ApiResponse.error('创建科室失败: ' + error.message));
        }
    }
});

module.exports = router;
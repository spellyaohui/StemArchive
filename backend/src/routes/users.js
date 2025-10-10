const express = require('express');
const router = express.Router();
const { executeQuery, sql } = require('../../config/database');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 获取用户列表（管理员权限）
router.get('/', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20, role, status } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE 1=1';
        let params = [];

        if (role) {
            whereClause += ' AND role = @role';
            params.push({ name: 'role', value: role, type: sql.NVarChar });
        }

        if (status) {
            whereClause += ' AND status = @status';
            params.push({ name: 'status', value: status, type: sql.NVarChar });
        }

        // 查询用户列表
        const usersQuery = `
            SELECT id, username, name, email, role, status, created_at, updated_at
            FROM Users
            ${whereClause}
            ORDER BY created_at DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
        `;

        params.push(
            { name: 'offset', value: offset, type: sql.Int },
            { name: 'limit', value: parseInt(limit), type: sql.Int }
        );

        const users = await executeQuery(usersQuery, params);

        // 查询总数
        const countQuery = `
            SELECT COUNT(*) as total
            FROM Users
            ${whereClause}
        `;

        const countParams = params.slice(0, -2); // 移除offset和limit参数
        const countResult = await executeQuery(countQuery, countParams);

        res.json({
            status: 'Success',
            data: {
                users,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: countResult[0].total,
                    pages: Math.ceil(countResult[0].total / limit)
                }
            }
        });
    } catch (error) {
        console.error('获取用户列表失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取用户列表失败'
        });
    }
});

// 创建用户（管理员权限）
router.post('/', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { username, password, name, email, role = 'user' } = req.body;

        // 验证必填字段
        if (!username || !password || !name) {
            return res.status(400).json({
                status: 'Error',
                message: '用户名、密码和真实姓名为必填项'
            });
        }

        // 验证角色
        if (!['admin', 'user'].includes(role)) {
            return res.status(400).json({
                status: 'Error',
                message: '无效的用户角色'
            });
        }

        // 检查用户名是否已存在
        const checkQuery = 'SELECT id FROM Users WHERE username = @username';
        const checkParams = [{ name: 'username', value: username, type: sql.NVarChar }];
        const existingUsers = await executeQuery(checkQuery, checkParams);

        if (existingUsers.length > 0) {
            return res.status(400).json({
                status: 'Error',
                message: '用户名已存在'
            });
        }

        // 加密密码
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 创建用户
        const createQuery = `
            INSERT INTO Users (username, password, name, email, role, status, created_at, updated_at)
            OUTPUT INSERTED.id, username, name, email, role, status, created_at, updated_at
            VALUES (@username, @password, @name, @email, @role, 'active', GETDATE(), GETDATE())
        `;

        const createParams = [
            { name: 'username', value: username, type: sql.NVarChar },
            { name: 'password', value: hashedPassword, type: sql.NVarChar },
            { name: 'name', value: name, type: sql.NVarChar },
            { name: 'email', value: email || null, type: sql.NVarChar },
            { name: 'role', value: role, type: sql.NVarChar }
        ];

        const result = await executeQuery(createQuery, createParams);

        res.status(201).json({
            status: 'Success',
            message: '用户创建成功',
            data: result[0]
        });
    } catch (error) {
        console.error('创建用户失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '创建用户失败'
        });
    }
});

// 更新用户（管理员权限）
router.put('/:id', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role, status } = req.body;

        // 检查用户是否存在
        const checkQuery = 'SELECT id FROM Users WHERE id = @id';
        const checkParams = [{ name: 'id', value: parseInt(id), type: sql.Int }];
        const existingUsers = await executeQuery(checkQuery, checkParams);

        if (existingUsers.length === 0) {
            return res.status(404).json({
                status: 'Error',
                message: '用户不存在'
            });
        }

        // 验证角色和状态
        if (role && !['admin', 'user'].includes(role)) {
            return res.status(400).json({
                status: 'Error',
                message: '无效的用户角色'
            });
        }

        if (status && !['active', 'inactive'].includes(status)) {
            return res.status(400).json({
                status: 'Error',
                message: '无效的用户状态'
            });
        }

        // 构建更新语句
        const updateFields = [];
        const updateParams = [];

        if (name !== undefined) {
            updateFields.push('name = @name');
            updateParams.push({ name: 'name', value: name, type: sql.NVarChar });
        }

        if (email !== undefined) {
            updateFields.push('email = @email');
            updateParams.push({ name: 'email', value: email || null, type: sql.NVarChar });
        }

        if (role !== undefined) {
            updateFields.push('role = @role');
            updateParams.push({ name: 'role', value: role, type: sql.NVarChar });
        }

        if (status !== undefined) {
            updateFields.push('status = @status');
            updateParams.push({ name: 'status', value: status, type: sql.NVarChar });
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                status: 'Error',
                message: '没有提供要更新的字段'
            });
        }

        updateFields.push('updated_at = GETDATE()');
        updateParams.push({ name: 'id', value: parseInt(id), type: sql.Int });

        const updateQuery = `
            UPDATE Users
            SET ${updateFields.join(', ')}
            OUTPUT INSERTED.id, username, name, email, role, status, created_at, updated_at
            WHERE id = @id
        `;

        const result = await executeQuery(updateQuery, updateParams);

        res.json({
            status: 'Success',
            message: '用户更新成功',
            data: result[0]
        });
    } catch (error) {
        console.error('更新用户失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '更新用户失败'
        });
    }
});

// 删除用户（管理员权限）
router.delete('/:id', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // 不能删除自己
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({
                status: 'Error',
                message: '不能删除自己的账户'
            });
        }

        // 检查用户是否存在
        const checkQuery = 'SELECT id FROM Users WHERE id = @id';
        const checkParams = [{ name: 'id', value: parseInt(id), type: sql.Int }];
        const existingUsers = await executeQuery(checkQuery, checkParams);

        if (existingUsers.length === 0) {
            return res.status(404).json({
                status: 'Error',
                message: '用户不存在'
            });
        }

        // 软删除：将状态设为inactive
        const deleteQuery = `
            UPDATE Users
            SET status = 'inactive', updated_at = GETDATE()
            WHERE id = @id
        `;

        await executeQuery(deleteQuery, checkParams);

        res.json({
            status: 'Success',
            message: '用户删除成功'
        });
    } catch (error) {
        console.error('删除用户失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '删除用户失败'
        });
    }
});

// 重置密码（管理员权限）
router.post('/:id/reset-password', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;

        if (!newPassword) {
            return res.status(400).json({
                status: 'Error',
                message: '新密码不能为空'
            });
        }

        // 检查用户是否存在
        const checkQuery = 'SELECT id FROM Users WHERE id = @id';
        const checkParams = [{ name: 'id', value: parseInt(id), type: sql.Int }];
        const existingUsers = await executeQuery(checkQuery, checkParams);

        if (existingUsers.length === 0) {
            return res.status(404).json({
                status: 'Error',
                message: '用户不存在'
            });
        }

        // 加密新密码
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // 更新密码
        const updateQuery = `
            UPDATE Users
            SET password = @password, updated_at = GETDATE()
            WHERE id = @id
        `;

        const updateParams = [
            { name: 'password', value: hashedPassword, type: sql.NVarChar },
            { name: 'id', value: parseInt(id), type: sql.Int }
        ];

        await executeQuery(updateQuery, updateParams);

        res.json({
            status: 'Success',
            message: '密码重置成功'
        });
    } catch (error) {
        console.error('重置密码失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '重置密码失败'
        });
    }
});

module.exports = router;
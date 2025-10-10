/**
 * 简化的科室管理 API 路由
 * 基于新的数据库表结构设计
 * 版本: 2.0.0
 * 日期: 2025-10-06
 */

const express = require('express');
const router = express.Router();
const { executeQuery, sql } = require('../config/database');

/**
 * 获取所有科室列表
 * GET /api/departments
 */
router.get('/', async (req, res) => {
    try {
        const { type, status, search, includeInactive } = req.query;

        let query = `
            SELECT
                DepartmentID as id,
                DepartmentCode as Code,
                DepartmentName as Name,
                DepartmentType as Type,
                Description,
                Notes,
                Status,
                SortOrder as Sort_Order,
                IsActive,
                CreatedAt,
                UpdatedAt,
                CreatedBy,
                UpdatedBy,
                Version
            FROM Departments
            WHERE Status != 'deleted'
        `;

        // 如果不包含非活跃记录，添加活跃条件
        if (!includeInactive || includeInactive !== 'true') {
            query += ` AND IsActive = 1`;
        }

        const params = [];
        let paramIndex = 1;

        // 添加过滤条件
        if (type) {
            query += ` AND DepartmentType = @param${paramIndex}`;
            params.push({ name: `param${paramIndex}`, type: sql.NVarChar(20), value: type });
            paramIndex++;
        }

        if (status) {
            query += ` AND Status = @param${paramIndex}`;
            params.push({ name: `param${paramIndex}`, type: sql.NVarChar(20), value: status });
            paramIndex++;
        }

        if (search) {
            query += ` AND (DepartmentName LIKE @param${paramIndex} OR DepartmentCode LIKE @param${paramIndex})`;
            params.push({ name: `param${paramIndex}`, type: sql.NVarChar(100), value: `%${search}%` });
            paramIndex++;
        }

        // 添加排序
        query += ` ORDER BY SortOrder ASC, DepartmentName ASC`;

        const result = await executeQuery(query, params);

        res.json({
            success: true,
            status: 'Success',
            message: '获取科室列表成功',
            data: result
        });

    } catch (error) {
        console.error('获取科室列表失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取科室列表失败'
        });
    }
});

/**
 * 根据ID获取单个科室
 * GET /api/departments/:id
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // 验证ID是否为有效数字
        if (!/^\d+$/.test(id)) {
            return res.status(400).json({
                status: 'Error',
                message: '无效的科室ID'
            });
        }

        const result = await executeQuery(`
            SELECT
                DepartmentID,
                DepartmentCode,
                DepartmentName,
                DepartmentType,
                Description,
                Notes,
                Status,
                SortOrder,
                IsActive,
                CreatedAt,
                UpdatedAt,
                CreatedBy,
                UpdatedBy,
                Version
            FROM Departments
            WHERE DepartmentID = @id
        `, [{ name: 'id', type: sql.Int, value: parseInt(id) }]);

        if (result.length === 0) {
            return res.status(404).json({
                status: 'Error',
                message: '科室不存在'
            });
        }

        res.json({
            status: 'Success',
            message: '获取科室详情成功',
            data: result[0]
        });

    } catch (error) {
        console.error('获取科室详情失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取科室详情失败'
        });
    }
});

/**
 * 创建新科室
 * POST /api/departments
 */
router.post('/', async (req, res) => {
    try {
        const {
            code,
            name,
            type,
            description,
            notes,
            sort_order,
            status,
            createdBy
        } = req.body;

        console.log('收到科室创建请求:', {
            code, name, type, description, notes, sort_order, status, createdBy
        });

        // 验证必填字段
        if (!code || !name || !type) {
            return res.status(400).json({
                status: 'Error',
                message: '科室编码、名称和类型为必填字段'
            });
        }

        // 验证科室类型
        const validTypes = ['laboratory', 'general', 'imaging', 'instrument'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                status: 'Error',
                message: '无效的科室类型'
            });
        }

        // 验证状态值
        const validStatuses = ['active', 'inactive'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({
                status: 'Error',
                message: '无效的状态值'
            });
        }

        // 检查编码是否已存在（只检查活跃记录）
        const existingCode = await executeQuery('SELECT DepartmentID FROM Departments WHERE DepartmentCode = @code AND IsActive = 1 AND Status != \'deleted\'',
            [{ name: 'code', type: sql.NVarChar(20), value: code }]);

        if (existingCode.length > 0) {
            return res.status(400).json({
                status: 'Error',
                message: '科室编码已存在'
            });
        }

        // 检查名称是否已存在（只检查活跃记录）
        const existingName = await executeQuery('SELECT DepartmentID FROM Departments WHERE DepartmentName = @name AND IsActive = 1 AND Status != \'deleted\'',
            [{ name: 'name', type: sql.NVarChar(100), value: name }]);

        if (existingName.length > 0) {
            return res.status(400).json({
                status: 'Error',
                message: '科室名称已存在'
            });
        }

        // 插入新科室
        const insertResult = await executeQuery(`
            INSERT INTO Departments (
                DepartmentCode, DepartmentName, DepartmentType,
                Description, Notes, Status, SortOrder,
                IsActive, CreatedBy
            )
            VALUES (
                @code, @name, @type,
                @description, @notes, @status, @sort_order,
                @isActive, @createdBy
            );

            SELECT SCOPE_IDENTITY() as NewDepartmentID;
        `, [
            { name: 'code', type: sql.NVarChar(20), value: code },
            { name: 'name', type: sql.NVarChar(100), value: name },
            { name: 'type', type: sql.NVarChar(20), value: type },
            { name: 'description', type: sql.NVarChar(500), value: description || null },
            { name: 'notes', type: sql.NVarChar(1000), value: notes || null },
            { name: 'sort_order', type: sql.Int, value: sort_order || 0 },
            { name: 'status', type: sql.NVarChar(20), value: status || 'active' },
            { name: 'isActive', type: sql.Bit, value: 1 },
            { name: 'createdBy', type: sql.NVarChar(100), value: createdBy || null }
        ]);

        const newDepartmentId = insertResult[0].NewDepartmentID;

        // 获取完整的科室信息
        const fullResult = await executeQuery(`
            SELECT
                DepartmentID as id,
                DepartmentCode as Code,
                DepartmentName as Name,
                DepartmentType as Type,
                Description,
                Notes,
                Status,
                SortOrder as Sort_Order,
                IsActive,
                CreatedAt,
                UpdatedAt,
                CreatedBy,
                UpdatedBy,
                Version
            FROM Departments
            WHERE DepartmentID = @departmentId
        `, [{ name: 'departmentId', type: sql.Int, value: newDepartmentId }]);

        console.log('科室创建成功:', fullResult[0]);

        res.status(201).json({
            success: true,
            status: 'Success',
            message: '科室创建成功',
            data: fullResult[0]
        });

    } catch (error) {
        console.error('创建科室失败:', error);

        // 提供更详细的错误信息
        if (error.number === 2627) {
            return res.status(400).json({
                status: 'Error',
                message: '科室编码或名称已存在'
            });
        } else {
            return res.status(500).json({
                status: 'Error',
                message: '创建科室失败: ' + error.message
            });
        }
    }
});

/**
 * 更新科室信息
 * PUT /api/departments/:id
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            departmentName,
            departmentType,
            description,
            notes,
            sortOrder,
            status,
            updatedBy
        } = req.body;

        // 验证ID是否为有效数字
        if (!/^\d+$/.test(id)) {
            return res.status(400).json({
                status: 'Error',
                message: '无效的科室ID'
            });
        }

        // 验证科室是否存在
        const existing = await executeQuery('SELECT DepartmentID FROM Departments WHERE DepartmentID = @id',
            [{ name: 'id', type: sql.Int, value: parseInt(id) }]);

        if (existing.length === 0) {
            return res.status(404).json({
                status: 'Error',
                message: '科室不存在'
            });
        }

        // 验证科室类型
        if (departmentType) {
            const validTypes = ['laboratory', 'general', 'imaging', 'instrument'];
            if (!validTypes.includes(departmentType)) {
                return res.status(400).json({
                    status: 'Error',
                    message: '无效的科室类型'
                });
            }
        }

        // 验证状态值
        if (status) {
            const validStatuses = ['active', 'inactive'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    status: 'Error',
                    message: '无效的状态值'
                });
            }
        }

        // 如果更新名称，检查名称是否已存在（排除自己和已删除记录）
        if (departmentName) {
            const existingName = await executeQuery(
                'SELECT DepartmentID FROM Departments WHERE DepartmentName = @departmentName AND DepartmentID != @id AND IsActive = 1 AND Status != \'deleted\'',
                [
                    { name: 'id', type: sql.Int, value: parseInt(id) },
                    { name: 'departmentName', type: sql.NVarChar(100), value: departmentName }
                ]);

            if (existingName.length > 0) {
                return res.status(400).json({
                    status: 'Error',
                    message: '科室名称已存在'
                });
            }
        }

        // 构建更新语句
        const updateFields = [];
        const updateParams = [];

        if (departmentName !== undefined) {
            updateFields.push('DepartmentName = @departmentName');
            updateParams.push({ name: 'departmentName', type: sql.NVarChar(100), value: departmentName });
        }
        if (departmentType !== undefined) {
            updateFields.push('DepartmentType = @departmentType');
            updateParams.push({ name: 'departmentType', type: sql.NVarChar(20), value: departmentType });
        }
        if (description !== undefined) {
            updateFields.push('Description = @description');
            updateParams.push({ name: 'description', type: sql.NVarChar(500), value: description });
        }
        if (notes !== undefined) {
            updateFields.push('Notes = @notes');
            updateParams.push({ name: 'notes', type: sql.NVarChar(1000), value: notes });
        }
        if (sortOrder !== undefined) {
            updateFields.push('SortOrder = @sortOrder');
            updateParams.push({ name: 'sortOrder', type: sql.Int, value: sortOrder });
        }
        if (status !== undefined) {
            updateFields.push('Status = @status');
            updateParams.push({ name: 'status', type: sql.NVarChar(20), value: status });
        }
        if (updatedBy !== undefined) {
            updateFields.push('UpdatedBy = @updatedBy');
            updateParams.push({ name: 'updatedBy', type: sql.NVarChar(100), value: updatedBy });
        }

        updateFields.push('Version = Version + 1');

        if (updateFields.length > 0) {
            updateParams.push({ name: 'id', type: sql.Int, value: parseInt(id) });

            const updateQuery = `
                UPDATE Departments
                SET ${updateFields.join(', ')}, UpdatedAt = GETDATE()
                WHERE DepartmentID = @id
            `;

            await executeQuery(updateQuery, updateParams);
        }

        // 获取更新后的科室信息
        const updatedDepartment = await executeQuery(`
            SELECT
                DepartmentID,
                DepartmentCode,
                DepartmentName,
                DepartmentType,
                Description,
                Notes,
                Status,
                SortOrder,
                IsActive,
                CreatedAt,
                UpdatedAt,
                CreatedBy,
                UpdatedBy,
                Version
            FROM Departments
            WHERE DepartmentID = @id
        `, [{ name: 'id', type: sql.Int, value: parseInt(id) }]);

        res.json({
            status: 'Success',
            message: '科室更新成功',
            data: updatedDepartment[0]
        });

    } catch (error) {
        console.error('更新科室失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '更新科室失败'
        });
    }
});

/**
 * 删除科室
 * DELETE /api/departments/:id
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // 验证ID是否为有效数字
        if (!/^\d+$/.test(id)) {
            return res.status(400).json({
                status: 'Error',
                message: '无效的科室ID'
            });
        }

        // 验证科室是否存在
        const existing = await executeQuery('SELECT DepartmentID FROM Departments WHERE DepartmentID = @id',
            [{ name: 'id', type: sql.Int, value: parseInt(id) }]);

        if (existing.length === 0) {
            return res.status(404).json({
                status: 'Error',
                message: '科室不存在'
            });
        }

        // 软删除科室（设置为非活跃状态而不是物理删除）
        await executeQuery(`
            UPDATE Departments
            SET IsActive = 0, Status = 'deleted', UpdatedAt = GETDATE(), Version = Version + 1
            WHERE DepartmentID = @id
        `, [{ name: 'id', type: sql.Int, value: parseInt(id) }]);

        res.json({
            success: true,
            status: 'Success',
            message: '科室删除成功'
        });

    } catch (error) {
        console.error('删除科室失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '删除科室失败'
        });
    }
});

module.exports = router;
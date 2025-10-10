/**
 * 全新的科室管理 API 路由
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
        const pool = req.app.locals.pool;
        const { type, status, search, page = 1, limit = 50 } = req.query;

        let query = `
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
            WHERE 1=1
        `;

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

        // 分页计算
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query += ` OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;
        params.push({ name: 'offset', type: sql.Int, value: offset });
        params.push({ name: 'limit', type: sql.Int, value: limit });

        const request = pool.request();
        params.forEach(param => {
            request.input(param.name, param.type, param.value);
        });

        const result = await request.query(query);

        // 获取总数用于分页
        const countRequest = pool.request();
        let countQuery = `SELECT COUNT(*) as total FROM Departments WHERE 1=1`;

        // 复制过滤条件但不包含分页
        const countParams = [];
        let countParamIndex = 1;

        if (type) {
            countQuery += ` AND DepartmentType = @param${countParamIndex}`;
            countParams.push({ name: `param${countParamIndex}`, type: sql.NVarChar(20), value: type });
            countParamIndex++;
        }

        if (status) {
            countQuery += ` AND Status = @param${countParamIndex}`;
            countParams.push({ name: `param${countParamIndex}`, type: sql.NVarChar(20), value: status });
            countParamIndex++;
        }

        if (search) {
            countQuery += ` AND (DepartmentName LIKE @param${countParamIndex} OR DepartmentCode LIKE @param${countParamIndex})`;
            countParams.push({ name: `param${countParamIndex}`, type: sql.NVarChar(100), value: `%${search}%` });
            countParamIndex++;
        }

        countParams.forEach(param => {
            countRequest.input(param.name, param.type, param.value);
        });

        const countResult = await countRequest.query(countQuery);
        const total = countResult.recordset[0].total;

        res.json(ApiResponse.success({
            data: result.recordset,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        }, '获取科室列表成功'));

    } catch (error) {
        console.error('获取科室列表失败:', error);
        res.status(500).json(ApiResponse.error('获取科室列表失败'));
    }
});

/**
 * 根据ID获取单个科室
 * GET /api/departments/:id
 */
router.get('/:id', auth.authenticate, async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        const { id } = req.params;

        // 验证ID是否为有效数字
        if (!/^\d+$/.test(id)) {
            return res.status(400).json(ApiResponse.error('无效的科室ID'));
        }

        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
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
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json(ApiResponse.error('科室不存在'));
        }

        res.json(ApiResponse.success(result.recordset[0], '获取科室详情成功'));

    } catch (error) {
        console.error('获取科室详情失败:', error);
        res.status(500).json(ApiResponse.error('获取科室详情失败'));
    }
});

/**
 * 创建新科室
 * POST /api/departments
 */
router.post('/', auth.authenticate, async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        const {
            departmentCode,
            departmentName,
            departmentType,
            description,
            notes,
            sortOrder,
            status,
            createdBy
        } = req.body;

        console.log('收到科室创建请求:', {
            departmentCode, departmentName, departmentType, description, notes, sortOrder, status, createdBy
        });

        // 验证必填字段
        if (!departmentCode || !departmentName || !departmentType) {
            return res.status(400).json(ApiResponse.error('科室编码、名称和类型为必填字段'));
        }

        // 验证科室类型
        const validTypes = ['laboratory', 'general', 'imaging'];
        if (!validTypes.includes(departmentType)) {
            return res.status(400).json(ApiResponse.error('无效的科室类型'));
        }

        // 验证状态值
        const validStatuses = ['active', 'inactive'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json(ApiResponse.error('无效的状态值'));
        }

        // 检查编码是否已存在
        const existingCode = await pool.request()
            .input('departmentCode', sql.NVarChar(20), departmentCode)
            .query('SELECT DepartmentID FROM Departments WHERE DepartmentCode = @departmentCode');

        if (existingCode.recordset.length > 0) {
            return res.status(400).json(ApiResponse.error('科室编码已存在'));
        }

        // 检查名称是否已存在
        const existingName = await pool.request()
            .input('departmentName', sql.NVarChar(100), departmentName)
            .query('SELECT DepartmentID FROM Departments WHERE DepartmentName = @departmentName');

        if (existingName.recordset.length > 0) {
            return res.status(400).json(ApiResponse.error('科室名称已存在'));
        }

        // 插入新科室
        const result = await pool.request()
            .input('departmentCode', sql.NVarChar(20), departmentCode)
            .input('departmentName', sql.NVarChar(100), departmentName)
            .input('departmentType', sql.NVarChar(20), departmentType)
            .input('description', sql.NVarChar(500), description || null)
            .input('notes', sql.NVarChar(1000), notes || null)
            .input('sortOrder', sql.Int, sortOrder || 0)
            .input('status', sql.NVarChar(20), status || 'active')
            .input('isActive', sql.Bit, 1)
            .input('createdBy', sql.NVarChar(100), createdBy || null)
            .query(`
                INSERT INTO Departments (
                    DepartmentCode, DepartmentName, DepartmentType,
                    Description, Notes, Status, SortOrder,
                    IsActive, CreatedBy
                )
                OUTPUT INSERTED.DepartmentID, INSERTED.DepartmentCode, INSERTED.DepartmentName
                VALUES (
                    @departmentCode, @departmentName, @departmentType,
                    @description, @notes, @status, @sortOrder,
                    @isActive, @createdBy
                );
            `);

        const newDepartment = result.recordset[0];

        console.log('科室创建成功:', newDepartment);

        // 获取完整的科室信息
        const fullResult = await pool.request()
            .input('departmentId', sql.Int, newDepartment.DepartmentID)
            .query(`
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
                WHERE DepartmentID = @departmentId
            `);

        res.status(201).json(ApiResponse.success(fullResult.recordset[0], '科室创建成功'));

    } catch (error) {
        console.error('创建科室失败:', error);

        // 提供更详细的错误信息
        if (error.number === 2627) {
            return res.status(400).json(ApiResponse.error('科室编码或名称已存在'));
        } else {
            return res.status(500).json(ApiResponse.error('创建科室失败: ' + error.message));
        }
    }
});

/**
 * 更新科室信息
 * PUT /api/departments/:id
 */
router.put('/:id', auth.authenticate, async (req, res) => {
    try {
        const pool = req.app.locals.pool;
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
            return res.status(400).json(ApiResponse.error('无效的科室ID'));
        }

        // 验证科室是否存在
        const existing = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT DepartmentID FROM Departments WHERE DepartmentID = @id');

        if (existing.recordset.length === 0) {
            return res.status(404). json(ApiResponse.error('科室不存在'));
        }

        // 验证科室类型
        if (departmentType) {
            const validTypes = ['laboratory', 'general', 'imaging'];
            if (!validTypes.includes(departmentType)) {
                return res.status(400).json(ApiResponse.error('无效的科室类型'));
            }
        }

        // 验证状态值
        if (status) {
            const validStatuses = ['active', 'inactive'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json(ApiResponse.error('无效的状态值'));
            }
        }

        // 如果更新名称，检查名称是否已存在（排除自己）
        if (departmentName) {
            const existingName = await pool.request()
                .input('id', sql.Int, id)
                .input('departmentName', sql.NVarChar(100), departmentName)
                .query('SELECT DepartmentID FROM Departments WHERE DepartmentName = @departmentName AND DepartmentID != @id');

            if (existingName.recordset.length > 0) {
                return res.status(400).json(ApiResponse.error('科室名称已存在'));
            }
        }

        // 构建更新语句
        const updateFields = [];
        const request = pool.request().input('id', sql.Int, id);

        if (departmentName !== undefined) {
            updateFields.push('DepartmentName = @departmentName');
            request.input('departmentName', sql.NVarChar(100), departmentName);
        }
        if (departmentType !== undefined) {
            updateFields.push('DepartmentType = @departmentType');
            request.input('departmentType', sql.NVarChar(20), departmentType);
        }
        if (description !== undefined) {
            updateFields.push('Description = @description');
            request.input('description', sql.NVarChar(500), description);
        }
        if (notes !== undefined) {
            updateFields.push('Notes = @notes');
            request.input('notes', sql.NVarChar(1000), notes);
        }
        if (sortOrder !== undefined) {
            updateFields.push('SortOrder = @sortOrder');
            request.input('sortOrder', sql.Int, sortOrder);
        }
        if (status !== undefined) {
            updateFields.push('Status = @status');
            request.input('status', sql.NVarChar(20), status);
        }
        if (updatedBy !== undefined) {
            updateFields.push('UpdatedBy = @updatedBy');
            request.input('updatedBy', sql.NVarChar(100), updatedBy);
        }
        updateFields.push('Version = Version + 1');

        if (updateFields.length > 0) {
            const updateQuery = `
                UPDATE Departments
                SET ${updateFields.join(', ')}
                WHERE DepartmentID = @id
            `;

            await request.query(updateQuery);
        }

        // 获取更新后的科室信息
        const updatedDepartment = await pool.request()
            .input('id', sql.Int, id)
            .query(`
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
            `);

        res.json(ApiResponse.success(updatedDepartment.recordset[0], '科室更新成功'));

    } catch (error) {
        console.error('更新科室失败:', error);
        res.status(500).json(ApiResponse.error('更新科室失败'));
    }
});

/**
 * 更新科室状态
 * PUT /api/departments/:id/status
 */
router.put('/:id/status', auth.authenticate, async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        const { id } = req.params;
        const { status } = req.body;

        // 验证ID是否为有效数字
        if (!/^\d+$/.test(id)) {
            return res.status(400).json(ApiResponse.error('无效的科室ID'));
        }

        // 验证状态值
        const validStatuses = ['active', 'inactive'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json(ApiResponse.error('无效的状态值'));
        }

        // 验证科室是否存在
        const existing = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT DepartmentID FROM Departments WHERE DepartmentID = @id');

        if (existing.recordset.length === 0) {
            return res.status(404).json(ApiResponse.error('科室不存在'));
        }

        // 更新状态
        await pool.request()
            .input('id', sql.Int, id)
            .input('status', sql.NVarChar(20), status)
            .input('isActive', sql.Bit, status === 'active' ? 1 : 0)
            .query(`
                UPDATE Departments
                SET Status = @status, IsActive = @isActive, UpdatedAt = GETDATE(), Version = Version + 1
                WHERE DepartmentID = @id
            `);

        res.json(ApiResponse.success(null, '科室状态更新成功'));

    } catch (error) {
        console.error('更新科室状态失败:', error);
        res.status(500).json(ApiResponse.error('更新科室状态失败'));
    }
});

/**
 * 删除科室
 * DELETE /api/departments/:id
 */
router.delete('/:id', auth.authenticate, async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        const { id } = req.params;

        // 验证ID是否为有效数字
        if (!/^\d+$/.test(id)) {
            return res.status(400).json(ApiResponse.error('无效的科室ID'));
        }

        // 验证科室是否存在
        const existing = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT DepartmentID FROM Departments WHERE DepartmentID = @id');

        if (existing.recordset.length === 0) {
            return res.status(404).json(ApiResponse.error('科室不存在'));
        }

        // 软删除科室（设置为非活跃状态而不是物理删除）
        await pool.request()
            .input('id', sql.Int, id)
            .query(`
                UPDATE Departments
                SET IsActive = 0, Status = 'deleted', UpdatedAt = GETDATE(), Version = Version + 1
                WHERE DepartmentID = @id
            `);

        res.json(ApiResponse.success(null, '科室删除成功'));

    } catch (error) {
        console.error('删除科室失败:', error);
        res.status(500).json(ApiResponse.error('删除科室失败'));
    }
});

/**
 * 获取科室统计信息
 * GET /api/departments/statistics
 */
router.get('/statistics', auth.authenticate, async (req, res) => {
    try {
        const pool = req.locals.pool;

        const result = await pool.request().query(`
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN DepartmentType = 'laboratory' THEN 1 ELSE 0 END) as laboratory,
                SUM(CASE WHEN DepartmentType = 'general' THEN 1 ELSE 0 END) as general,
                SUM(CASE WHEN DepartmentType = 'imaging' THEN 1 ELSE 0 END) as imaging,
                SUM(CASE WHEN Status = 'active' THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN Status = 'inactive' THEN 1 ELSE 0 END) as inactive
            FROM Departments
            WHERE IsActive = 1
        `);

        const statistics = result.recordset[0];

        res.json(ApiResponse.success(statistics, '获取科室统计信息成功'));

    } catch (error) {
        console.error('获取科室统计信息失败:', error);
        res.status(500).json(ApiResponse.error('获取科室统计信息失败'));
    }
});

/**
 * 根据类型获取科室列表
 * GET /api/departments/type/:type
 */
router.get('/type/:type', auth.authenticate, async (req, res) => {
    try {
        const pool = req.locals.pool;
        const { type } = req.params;

        // 验证科室类型
        const validTypes = ['laboratory', 'general', 'imaging'];
        if (!validTypes.includes(type)) {
            return res.status(400).json(ApiResponse.error('无效的科室类型'));
        }

        const result = await pool.request()
            .input('type', sql.NVarChar(20), type)
            .input('status', sql.NVarChar(20), 'active')
            .query(`
                SELECT
                    DepartmentID,
                    DepartmentCode,
                    DepartmentName,
                    DepartmentType,
                    Description,
                    Status,
                    SortOrder,
                    CreatedAt,
                    UpdatedAt
                FROM Departments
                WHERE DepartmentType = @type AND Status = @status AND IsActive = 1
                ORDER BY SortOrder ASC, DepartmentName ASC
            `);

        res.json(ApiResponse.success(result.recordset, '获取科室列表成功'));

    } catch (error) {
        console.error('根据类型获取科室列表失败:', error);
        res.status(500).json(ApiResponse.error('根据类型获取科室列表失败'));
    }
});

module.exports = router;
/**
 * 科室管理 API 路由
 * 版本: 1.0.0
 * 日期: 2025-10-06
 */

const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { ApiResponse } = require('../utils/apiResponse');
const auth = require('../middleware/auth');

/**
 * 获取所有科室列表
 * GET /api/departments
 */
router.get('/', auth.authenticate, async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        const { type, status, search } = req.query;

        let query = `
            SELECT id, Name, Code, Description, Type, Status, Sort_Order, Created_At, Updated_At
            FROM Departments
            WHERE 1=1
        `;

        const params = [];
        let paramIndex = 1;

        if (type) {
            query += ` AND Type = @param${paramIndex}`;
            params.push({ name: `param${paramIndex}`, type: sql.NVarChar(20), value: type });
            paramIndex++;
        }

        if (status) {
            query += ` AND Status = @param${paramIndex}`;
            params.push({ name: `param${paramIndex}`, type: sql.NVarChar(20), value: status });
            paramIndex++;
        }

        if (search) {
            query += ` AND (Name LIKE @param${paramIndex} OR Code LIKE @param${paramIndex})`;
            params.push({ name: `param${paramIndex}`, type: sql.NVarChar(100), value: `%${search}%` });
            paramIndex++;
        }

        query += ` ORDER BY Sort_Order ASC, Name ASC`;

        const request = pool.request();
        params.forEach(param => {
            request.input(param.name, param.type, param.value);
        });

        const result = await request.query(query);

        res.json(ApiResponse.success(result.recordset));
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

        const result = await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query(`
                SELECT id, Name, Code, Description, Type, Status, Sort_Order, Created_At, Updated_At
                FROM Departments
                WHERE id = @id
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json(ApiResponse.error('科室不存在'));
        }

        res.json(ApiResponse.success(result.recordset[0]));
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
        const { code, name, type, description, sort_order, status } = req.body;

        // 验证必填字段
        if (!code || !name || !type) {
            return res.status(400).json(ApiResponse.error('科室编码、名称和类型为必填字段'));
        }

        // 验证科室类型
        const validTypes = ['laboratory', 'general', 'imaging'];
        if (!validTypes.includes(type)) {
            return res.status(400).json(ApiResponse.error('无效的科室类型'));
        }

        // 检查编码是否已存在
        const existingCode = await pool.request()
            .input('code', sql.NVarChar(20), code)
            .query('SELECT id FROM Departments WHERE Code = @code');

        if (existingCode.recordset.length > 0) {
            return res.status(400).json(ApiResponse.error('科室编码已存在'));
        }

        // 检查名称是否已存在
        const existingName = await pool.request()
            .input('name', sql.NVarChar(50), name)
            .query('SELECT id FROM Departments WHERE Name = @name');

        if (existingName.recordset.length > 0) {
            return res.status(400).json(ApiResponse.error('科室名称已存在'));
        }

        // 插入新科室（让数据库自动生成ID）
        await pool.request()
            .input('code', sql.NVarChar(20), code)
            .input('name', sql.NVarChar(50), name)
            .input('type', sql.NVarChar(20), type)
            .input('description', sql.NVarChar(200), description || null)
            .input('sort_order', sql.Int, sort_order || 0)
            .input('status', sql.NVarChar(20), status || 'active')
            .query(`
                INSERT INTO Departments (Name, Code, Description, Type, Status, Sort_Order)
                VALUES (@name, @code, @description, @type, @status, @sort_order);
            `);

        // 获取最新插入的科室ID
        const result = await pool.request()
            .input('code', sql.NVarChar(20), code)
            .query(`
                SELECT TOP 1 CAST(ID as varchar(100)) as id
                FROM Departments
                WHERE Code = @code;
            `);

        const newDepartmentId = result.recordset[0].id;
        console.log('新科室ID获取成功:', newDepartmentId);

        // 获取新创建的科室信息
        const newDepartment = await pool.request()
            .input('id', sql.UniqueIdentifier, newDepartmentId)
            .query(`
                SELECT ID, Name, Code, Description, Type, Status, Sort_Order, Created_At, Updated_At
                FROM Departments
                WHERE ID = @id
            `);
        console.log('科室详情查询完成，记录数:', newDepartment.recordset.length);

        res.status(201).json(ApiResponse.success(newDepartment.recordset[0], '科室创建成功'));
    } catch (error) {
        console.error('创建科室失败:', error);
        res.status(500).json(ApiResponse.error('创建科室失败'));
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
        const { name, type, description, sort_order, status } = req.body;

        // 验证科室是否存在
        const existing = await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query('SELECT id FROM Departments WHERE id = @id');

        if (existing.recordset.length === 0) {
            return res.status(404).json(ApiResponse.error('科室不存在'));
        }

        // 验证科室类型
        if (type) {
            const validTypes = ['laboratory', 'general', 'imaging'];
            if (!validTypes.includes(type)) {
                return res.status(400).json(ApiResponse.error('无效的科室类型'));
            }
        }

        // 如果更新名称，检查名称是否已存在（排除自己）
        if (name) {
            const existingName = await pool.request()
                .input('id', sql.UniqueIdentifier, id)
                .input('name', sql.NVarChar(100), name)
                .query('SELECT id FROM Departments WHERE Name = @name AND id != @id');

            if (existingName.recordset.length > 0) {
                return res.status(400).json(ApiResponse.error('科室名称已存在'));
            }
        }

        // 构建更新语句
        const updateFields = [];
        const request = pool.request().input('id', sql.UniqueIdentifier, id);

        if (name !== undefined) {
            updateFields.push('Name = @name');
            request.input('name', sql.NVarChar(100), name);
        }
        if (type !== undefined) {
            updateFields.push('Type = @type');
            request.input('type', sql.NVarChar(20), type);
        }
        if (description !== undefined) {
            updateFields.push('Description = @description');
            request.input('description', sql.NVarChar(500), description);
        }
        if (sort_order !== undefined) {
            updateFields.push('Sort_Order = @sort_order');
            request.input('sort_order', sql.Int, sort_order);
        }
        if (status !== undefined) {
            updateFields.push('Status = @status');
            request.input('status', sql.NVarChar(20), status);
        }

        if (updateFields.length > 0) {
            updateFields.push('Updated_At = GETDATE()');

            const updateQuery = `
                UPDATE Departments
                SET ${updateFields.join(', ')}
                WHERE id = @id
            `;

            await request.query(updateQuery);
        }

        // 获取更新后的科室信息
        const updatedDepartment = await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query(`
                SELECT id, Name, Code, Description, Type, Status, Sort_Order, Created_At, Updated_At
                FROM Departments
                WHERE id = @id
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

        // 验证状态值
        const validStatuses = ['active', 'inactive'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json(ApiResponse.error('无效的状态值'));
        }

        // 验证科室是否存在
        const existing = await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query('SELECT id FROM Departments WHERE id = @id');

        if (existing.recordset.length === 0) {
            return res.status(404).json(ApiResponse.error('科室不存在'));
        }

        // 更新状态
        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .input('status', sql.NVarChar(20), status)
            .query(`
                UPDATE Departments
                SET Status = @status, Updated_At = GETDATE()
                WHERE id = @id
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

        // 验证科室是否存在
        const existing = await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query('SELECT id FROM Departments WHERE id = @id');

        if (existing.recordset.length === 0) {
            return res.status(404).json(ApiResponse.error('科室不存在'));
        }

        // 检查是否有关联的健康数据
        const labDataCount = await pool.request()
            .input('departmentId', sql.UniqueIdentifier, id)
            .query('SELECT COUNT(*) as count FROM LabHealthData WHERE DepartmentID = @departmentId');

        const generalDataCount = await pool.request()
            .input('departmentId', sql.UniqueIdentifier, id)
            .query('SELECT COUNT(*) as count FROM GeneralHealthData WHERE DepartmentID = @departmentId');

        const imagingDataCount = await pool.request()
            .input('departmentId', sql.UniqueIdentifier, id)
            .query('SELECT COUNT(*) as count FROM ImagingHealthData WHERE DepartmentID = @departmentId');

        const totalDataCount = labDataCount.recordset[0].count +
                              generalDataCount.recordset[0].count +
                              imagingDataCount.recordset[0].count;

        if (totalDataCount > 0) {
            return res.status(400).json(ApiResponse.error(`该科室下有 ${totalDataCount} 条健康数据，无法删除`));
        }

        // 删除科室
        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query('DELETE FROM Departments WHERE id = @id');

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
        const pool = req.app.locals.pool;

        const result = await pool.request().query(`
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN Type = 'laboratory' THEN 1 ELSE 0 END) as laboratory,
                SUM(CASE WHEN Type = 'general' THEN 1 ELSE 0 END) as general,
                SUM(CASE WHEN Type = 'imaging' THEN 1 ELSE 0 END) as imaging,
                SUM(CASE WHEN Status = 'active' THEN 1 ELSE 0 END) as active
            FROM Departments
        `);

        const statistics = result.recordset[0];

        res.json(ApiResponse.success(statistics));
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
        const pool = req.app.locals.pool;
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
                SELECT id, Name, Code, Description, Type, Status, Sort_Order
                FROM Departments
                WHERE Type = @type AND Status = @status
                ORDER BY Sort_Order ASC, Name ASC
            `);

        res.json(ApiResponse.success(result.recordset));
    } catch (error) {
        console.error('根据类型获取科室列表失败:', error);
        res.status(500).json(ApiResponse.error('根据类型获取科室列表失败'));
    }
});

module.exports = router;
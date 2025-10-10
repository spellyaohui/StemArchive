const express = require('express');
const router = express.Router();
const { executeQuery, sql } = require('../../config/database');

// 获取所有科室
router.get('/', async (req, res) => {
    try {
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

        const departments = await executeQuery(query, params);

        res.json({
            status: 'Success',
            message: '获取科室列表成功',
            data: departments
        });
    } catch (error) {
        console.error('获取科室列表失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取科室列表失败'
        });
    }
});

// 创建科室
router.post('/', async (req, res) => {
    try {
        const { code, name, type, description, sort_order, status } = req.body;

        // 验证必填字段
        if (!code || !name || !type) {
            return res.status(400).json({
                status: 'Error',
                message: '科室编码、名称和类型为必填字段'
            });
        }

        // 验证科室类型
        const validTypes = ['laboratory', 'general', 'imaging'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                status: 'Error',
                message: '无效的科室类型'
            });
        }

        // 检查编码是否已存在
        const existingCodeQuery = 'SELECT id FROM Departments WHERE Code = @code';
        const existingCodeResult = await executeQuery(existingCodeQuery, [
            { name: 'code', value: code, type: sql.NVarChar(50) }
        ]);

        if (existingCodeResult.length > 0) {
            return res.status(400).json({
                status: 'Error',
                message: '科室编码已存在'
            });
        }

        // 检查名称是否已存在
        const existingNameQuery = 'SELECT id FROM Departments WHERE Name = @name';
        const existingNameResult = await executeQuery(existingNameQuery, [
            { name: 'name', value: name, type: sql.NVarChar(100) }
        ]);

        if (existingNameResult.length > 0) {
            return res.status(400).json({
                status: 'Error',
                message: '科室名称已存在'
            });
        }

        // 插入新科室
        const insertQuery = `
            INSERT INTO Departments (Name, Code, Description, Type, Status, Sort_Order)
            VALUES (@name, @code, @description, @type, @status, @sort_order);

            SELECT SCOPE_IDENTITY() as id;
        `;

        const insertParams = [
            { name: 'name', value: name, type: sql.NVarChar(100) },
            { name: 'code', value: code, type: sql.NVarChar(50) },
            { name: 'type', value: type, type: sql.NVarChar(20) },
            { name: 'description', value: description || null, type: sql.NVarChar(500) },
            { name: 'sort_order', value: sort_order || 0, type: sql.Int },
            { name: 'status', value: status || 'active', type: sql.NVarChar(20) }
        ];

        const insertResult = await executeQuery(insertQuery, insertParams);
        const newDepartmentId = insertResult[0].id;

        // 获取新创建的科室信息
        const selectQuery = `
            SELECT id, Name, Code, Description, Type, Status, Sort_Order, Created_At, Updated_At
            FROM Departments
            WHERE id = @id
        `;

        const newDepartment = await executeQuery(selectQuery, [
            { name: 'id', value: newDepartmentId, type: sql.Int }
        ]);

        res.status(201).json({
            status: 'Success',
            message: '科室创建成功',
            data: newDepartment[0]
        });
    } catch (error) {
        console.error('创建科室失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '创建科室失败'
        });
    }
});

// 更新科室
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, description, sort_order, status } = req.body;

        // 验证科室是否存在
        const existingQuery = 'SELECT id FROM Departments WHERE id = @id';
        const existingResult = await executeQuery(existingQuery, [
            { name: 'id', value: id, type: sql.Int }
        ]);

        if (existingResult.length === 0) {
            return res.status(404).json({
                status: 'Error',
                message: '科室不存在'
            });
        }

        // 验证科室类型
        if (type) {
            const validTypes = ['laboratory', 'general', 'imaging'];
            if (!validTypes.includes(type)) {
                return res.status(400).json({
                    status: 'Error',
                    message: '无效的科室类型'
                });
            }
        }

        // 如果更新名称，检查名称是否已存在（排除自己）
        if (name) {
            const existingNameQuery = 'SELECT id FROM Departments WHERE Name = @name AND id != @id';
            const existingNameResult = await executeQuery(existingNameQuery, [
                { name: 'id', value: id, type: sql.Int },
                { name: 'name', value: name, type: sql.NVarChar(100) }
            ]);

            if (existingNameResult.length > 0) {
                return res.status(400).json({
                    status: 'Error',
                    message: '科室名称已存在'
                });
            }
        }

        // 构建更新语句
        const updateFields = [];
        const params = [{ name: 'id', value: id, type: sql.Int }];

        if (name !== undefined) {
            updateFields.push('Name = @name');
            params.push({ name: 'name', value: name, type: sql.NVarChar(100) });
        }
        if (type !== undefined) {
            updateFields.push('Type = @type');
            params.push({ name: 'type', value: type, type: sql.NVarChar(20) });
        }
        if (description !== undefined) {
            updateFields.push('Description = @description');
            params.push({ name: 'description', value: description, type: sql.NVarChar(500) });
        }
        if (sort_order !== undefined) {
            updateFields.push('Sort_Order = @sort_order');
            params.push({ name: 'sort_order', value: sort_order, type: sql.Int });
        }
        if (status !== undefined) {
            updateFields.push('Status = @status');
            params.push({ name: 'status', value: status, type: sql.NVarChar(20) });
        }

        if (updateFields.length > 0) {
            updateFields.push('Updated_At = GETDATE()');

            const updateQuery = `
                UPDATE Departments
                SET ${updateFields.join(', ')}
                WHERE id = @id
            `;

            await executeQuery(updateQuery, params);
        }

        // 获取更新后的科室信息
        const selectQuery = `
            SELECT id, Name, Code, Description, Type, Status, Sort_Order, Created_At, Updated_At
            FROM Departments
            WHERE id = @id
        `;

        const updatedDepartment = await executeQuery(selectQuery, [
            { name: 'id', value: id, type: sql.Int }
        ]);

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

// 更新科室状态
router.put('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // 验证状态值
        const validStatuses = ['active', 'inactive'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                status: 'Error',
                message: '无效的状态值'
            });
        }

        // 验证科室是否存在
        const existingQuery = 'SELECT id FROM Departments WHERE id = @id';
        const existingResult = await executeQuery(existingQuery, [
            { name: 'id', value: id, type: sql.Int }
        ]);

        if (existingResult.length === 0) {
            return res.status(404).json({
                status: 'Error',
                message: '科室不存在'
            });
        }

        // 更新状态
        const updateQuery = `
            UPDATE Departments
            SET Status = @status, Updated_At = GETDATE()
            WHERE id = @id
        `;

        await executeQuery(updateQuery, [
            { name: 'id', value: id, type: sql.Int },
            { name: 'status', value: status, type: sql.NVarChar(20) }
        ]);

        res.json({
            status: 'Success',
            message: '科室状态更新成功',
            data: null
        });
    } catch (error) {
        console.error('更新科室状态失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '更新科室状态失败'
        });
    }
});

// 删除科室
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // 验证科室是否存在
        const existingQuery = 'SELECT id FROM Departments WHERE id = @id';
        const existingResult = await executeQuery(existingQuery, [
            { name: 'id', value: id, type: sql.Int }
        ]);

        if (existingResult.length === 0) {
            return res.status(404).json({
                status: 'Error',
                message: '科室不存在'
            });
        }

        // 检查是否有关联的健康数据
        const labDataQuery = 'SELECT COUNT(*) as count FROM LabHealthData WHERE DepartmentID = @departmentId';
        const labDataResult = await executeQuery(labDataQuery, [
            { name: 'departmentId', value: id, type: sql.Int }
        ]);

        const generalDataQuery = 'SELECT COUNT(*) as count FROM GeneralHealthData WHERE DepartmentID = @departmentId';
        const generalDataResult = await executeQuery(generalDataQuery, [
            { name: 'departmentId', value: id, type: sql.Int }
        ]);

        const imagingDataQuery = 'SELECT COUNT(*) as count FROM ImagingHealthData WHERE DepartmentID = @departmentId';
        const imagingDataResult = await executeQuery(imagingDataQuery, [
            { name: 'departmentId', value: id, type: sql.Int }
        ]);

        const totalDataCount = labDataResult[0].count +
                              generalDataResult[0].count +
                              imagingDataResult[0].count;

        if (totalDataCount > 0) {
            return res.status(400).json({
                status: 'Error',
                message: `该科室下有 ${totalDataCount} 条健康数据，无法删除`
            });
        }

        // 删除科室
        const deleteQuery = 'DELETE FROM Departments WHERE id = @id';
        await executeQuery(deleteQuery, [
            { name: 'id', value: id, type: sql.Int }
        ]);

        res.json({
            status: 'Success',
            message: '科室删除成功',
            data: null
        });
    } catch (error) {
        console.error('删除科室失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '删除科室失败'
        });
    }
});

// 根据类型获取科室列表
router.get('/type/:type', async (req, res) => {
    try {
        const { type } = req.params;

        // 验证科室类型
        const validTypes = ['laboratory', 'general', 'imaging'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                status: 'Error',
                message: '无效的科室类型'
            });
        }

        const query = `
            SELECT id, Name, Code, Description, Type, Status, Sort_Order
            FROM Departments
            WHERE Type = @type AND Status = @status
            ORDER BY Sort_Order ASC, Name ASC
        `;

        const departments = await executeQuery(query, [
            { name: 'type', value: type, type: sql.NVarChar(20) },
            { name: 'status', value: 'active', type: sql.NVarChar(20) }
        ]);

        res.json({
            status: 'Success',
            message: '根据类型获取科室列表成功',
            data: departments
        });
    } catch (error) {
        console.error('根据类型获取科室列表失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '根据类型获取科室列表失败'
        });
    }
});

module.exports = router;
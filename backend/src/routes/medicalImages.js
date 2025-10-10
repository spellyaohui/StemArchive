const express = require('express');
const router = express.Router();
const { executeQuery, sql } = require('../../config/database');

// 获取医学影像列表
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 20, customerId, imageType } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE 1=1';
        let params = [];

        if (customerId) {
            whereClause += ' AND CustomerID = @customerId';
            params.push({ name: 'customerId', value: customerId, type: sql.UniqueIdentifier });
        }

        if (imageType) {
            whereClause += ' AND ImageType = @imageType';
            params.push({ name: 'imageType', value: imageType, type: sql.NVarChar });
        }

        const query = `
            SELECT
                mi.*,
                c.Name as CustomerName,
                c.IdentityCard
            FROM MedicalImages mi
            INNER JOIN Customers c ON mi.CustomerID = c.ID
            ${whereClause}
            ORDER BY mi.ImageDate DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;

            SELECT COUNT(*) as Total FROM MedicalImages mi ${whereClause};
        `;

        params.push(
            { name: 'offset', value: offset, type: sql.Int },
            { name: 'limit', value: limit, type: sql.Int }
        );

        const result = await executeQuery(query, params);
        const images = result.slice(0, -1);
        const total = result[result.length - 1].Total;

        res.json({
            status: 'Success',
            message: '获取医学影像列表成功',
            data: images,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('获取医学影像列表失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取医学影像列表失败'
        });
    }
});

// 根据客户ID获取医学影像
router.get('/customer/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const query = `
            SELECT * FROM MedicalImages
            WHERE CustomerID = @customerId
            ORDER BY ImageDate DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;

            SELECT COUNT(*) as Total FROM MedicalImages WHERE CustomerID = @customerId;
        `;

        const params = [
            { name: 'customerId', value: customerId, type: sql.UniqueIdentifier },
            { name: 'offset', value: offset, type: sql.Int },
            { name: 'limit', value: limit, type: sql.Int }
        ];

        const result = await executeQuery(query, params);
        const images = result.slice(0, -1);
        const total = result[result.length - 1].Total;

        res.json({
            status: 'Success',
            message: '获取医学影像成功',
            data: images,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('获取医学影像失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取医学影像失败'
        });
    }
});

// 创建医学影像记录
router.post('/', async (req, res) => {
    try {
        const {
            customerId,
            imageDate,
            imageType,
            department,
            doctor,
            imageDescription,
            filePath,
            fileSize,
            fileType,
            diagnosis
        } = req.body;

        const query = `
            INSERT INTO MedicalImages (
                CustomerID, ImageDate, ImageType, Department, Doctor,
                ImageDescription, FilePath, FileSize, FileType, Diagnosis
            )
            VALUES (
                @customerId, @imageDate, @imageType, @department, @doctor,
                @imageDescription, @filePath, @fileSize, @fileType, @diagnosis
            );

            SELECT SCOPE_IDENTITY() as ID, * FROM MedicalImages WHERE ID = SCOPE_IDENTITY();
        `;

        const params = [
            { name: 'customerId', value: customerId, type: sql.UniqueIdentifier },
            { name: 'imageDate', value: imageDate, type: sql.Date },
            { name: 'imageType', value: imageType, type: sql.NVarChar },
            { name: 'department', value: department, type: sql.NVarChar },
            { name: 'doctor', value: doctor, type: sql.NVarChar },
            { name: 'imageDescription', value: imageDescription, type: sql.NVarChar },
            { name: 'filePath', value: filePath, type: sql.NVarChar },
            { name: 'fileSize', value: fileSize, type: sql.BigInt },
            { name: 'fileType', value: fileType, type: sql.NVarChar },
            { name: 'diagnosis', value: diagnosis, type: sql.NVarChar }
        ];

        const result = await executeQuery(query, params);
        const image = result[0];

        res.status(201).json({
            status: 'Success',
            message: '医学影像记录创建成功',
            data: image
        });
    } catch (error) {
        console.error('创建医学影像记录失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '创建医学影像记录失败'
        });
    }
});

// 删除医学影像
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
            DELETE FROM MedicalImages WHERE ID = @id;
            SELECT @@ROWCOUNT as AffectedRows;
        `;

        const params = [{ name: 'id', value: id, type: sql.UniqueIdentifier }];
        const result = await executeQuery(query, params);

        if (result[0].AffectedRows === 0) {
            return res.status(404).json({
                status: 'Error',
                message: '医学影像记录不存在'
            });
        }

        res.json({
            status: 'Success',
            message: '医学影像记录删除成功'
        });
    } catch (error) {
        console.error('删除医学影像记录失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '删除医学影像记录失败'
        });
    }
});

module.exports = router;
const { executeQuery, executeProcedure, sql } = require('../../config/database');

class MedicalImage {
    // 创建医学影像记录
    static async create(imageData) {
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
            diagnosis,
            createdBy
        } = imageData;

        const query = `
            INSERT INTO MedicalImages (
                CustomerID, ImageDate, ImageType, Department, Doctor,
                ImageDescription, FilePath, FileSize, FileType, Diagnosis, CreatedBy
            )
            VALUES (
                @customerId, @imageDate, @imageType, @department, @doctor,
                @imageDescription, @filePath, @fileSize, @fileType, @diagnosis, @createdBy
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
            { name: 'diagnosis', value: diagnosis, type: sql.NVarChar },
            { name: 'createdBy', value: createdBy, type: sql.NVarChar }
        ];

        const result = await executeQuery(query, params);
        return result[0];
    }

    // 根据客户ID获取医学影像
    static async getByCustomerId(customerId, page = 1, limit = 20) {
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

        return {
            images,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    // 更新医学影像
    static async update(id, updateData) {
        const {
            imageDate,
            imageType,
            department,
            doctor,
            imageDescription,
            filePath,
            fileSize,
            fileType,
            diagnosis
        } = updateData;

        const query = `
            UPDATE MedicalImages SET
                ImageDate = @imageDate,
                ImageType = @imageType,
                Department = @department,
                Doctor = @doctor,
                ImageDescription = @imageDescription,
                FilePath = @filePath,
                FileSize = @fileSize,
                FileType = @fileType,
                Diagnosis = @diagnosis,
                UpdatedAt = GETDATE()
            WHERE ID = @id;

            SELECT * FROM MedicalImages WHERE ID = @id;
        `;

        const params = [
            { name: 'id', value: id, type: sql.UniqueIdentifier },
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
        return result[0];
    }

    // 删除医学影像
    static async delete(id) {
        const query = `
            DELETE FROM MedicalImages WHERE ID = @id;
            SELECT @@ROWCOUNT as AffectedRows;
        `;

        const params = [{ name: 'id', value: id, type: sql.UniqueIdentifier }];
        const result = await executeQuery(query, params);
        return result[0].AffectedRows > 0;
    }
}

module.exports = MedicalImage;
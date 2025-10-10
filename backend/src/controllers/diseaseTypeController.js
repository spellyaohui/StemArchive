const { executeQuery } = require('../../config/database');
const { validationResult } = require('express-validator');

class DiseaseTypeController {
  // 获取所有疾病类型
  static async getAll(req, res) {
    try {
      const { page = 1, limit = 100, search = '', isActive } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      let whereClause = 'WHERE 1=1';
      const params = [];

      if (search) {
        whereClause += ' AND (dt.DiseaseName LIKE @search OR dt.Category LIKE @search OR dt.Keywords LIKE @search)';
        params.push({ name: 'search', value: `%${search}%` });
      }

      if (isActive !== undefined) {
        whereClause += ' AND dt.IsActive = @isActive';
        params.push({ name: 'isActive', value: isActive === 'true' });
      }

      // 获取疾病类型列表
      const query = `
        SELECT
          dt.ID,
          dt.DiseaseName,
          dt.Category,
          dt.Keywords,
          dt.Description,
          dt.RecommendedTreatment,
          dt.IsActive,
          dt.SortOrder,
          dt.CreatedAt,
          dt.UpdatedAt,
          COUNT(sc.ID) as patientCount
        FROM DiseaseTypes dt
        LEFT JOIN StemCellPatients scp ON dt.DiseaseName = scp.PrimaryDiagnosis
        LEFT JOIN InfusionSchedules sc ON scp.ID = sc.PatientID
        ${whereClause}
        GROUP BY
          dt.ID, dt.DiseaseName, dt.Category, dt.Keywords, dt.Description,
          dt.RecommendedTreatment, dt.IsActive, dt.SortOrder, dt.CreatedAt, dt.UpdatedAt
        ORDER BY dt.SortOrder, dt.DiseaseName
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `;

      params.push({ name: 'offset', value: offset });
      params.push({ name: 'limit', value: parseInt(limit) });

      const diseaseTypes = await executeQuery(query, params);

      // 获取总数
      const countQuery = `
        SELECT COUNT(DISTINCT dt.ID) as total
        FROM DiseaseTypes dt
        ${whereClause}
      `;

      const countResult = await executeQuery(countQuery, params.slice(0, -2));
      const total = countResult[0].total;

      res.json({
        status: 'Success',
        message: '获取疾病类型列表成功',
        data: diseaseTypes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('获取疾病类型列表失败:', error);
      res.status(500).json({
        status: 'Error',
        message: '获取疾病类型列表失败'
      });
    }
  }

  // 根据ID获取疾病类型
  static async getById(req, res) {
    try {
      const { id } = req.params;

      const query = `
        SELECT
          dt.ID,
          dt.DiseaseName,
          dt.Category,
          dt.Keywords,
          dt.Description,
          dt.RecommendedTreatment,
          dt.IsActive,
          dt.SortOrder,
          dt.CreatedAt,
          dt.UpdatedAt
        FROM DiseaseTypes dt
        WHERE dt.ID = @id
      `;

      const result = await executeQuery(query, [{ name: 'id', value: id }]);

      if (result.length === 0) {
        return res.status(404).json({
          status: 'Error',
          message: '疾病类型不存在'
        });
      }

      res.json({
        status: 'Success',
        message: '获取疾病类型成功',
        data: result[0]
      });
    } catch (error) {
      console.error('获取疾病类型失败:', error);
      res.status(500).json({
        status: 'Error',
        message: '获取疾病类型失败'
      });
    }
  }

  // 创建疾病类型
  static async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'Error',
          message: '输入验证失败',
          errors: errors.array()
        });
      }

      const { diseaseName, category, keywords, description, recommendedTreatment } = req.body;

      // 检查是否已存在相同名称的疾病类型
      const existingQuery = `
        SELECT ID FROM DiseaseTypes
        WHERE DiseaseName = @diseaseName
      `;
      const existing = await executeQuery(existingQuery, [{ name: 'diseaseName', value: diseaseName }]);

      if (existing.length > 0) {
        return res.status(400).json({
          status: 'Error',
          message: '疾病类型名称已存在'
        });
      }

      // 获取当前最大排序值
      const maxSortQuery = `SELECT ISNULL(MAX(SortOrder), 0) as maxSort FROM DiseaseTypes`;
      const maxSortResult = await executeQuery(maxSortQuery);
      const nextSortOrder = maxSortResult[0].maxSort + 1;

      const insertQuery = `
        DECLARE @NewID UNIQUEIDENTIFIER = NEWID();

        INSERT INTO DiseaseTypes (
          ID, DiseaseName, Category, Keywords, Description,
          RecommendedTreatment, IsActive, SortOrder, CreatedAt, UpdatedAt
        ) VALUES (
          @NewID, @diseaseName, @category, @keywords, @description,
          @recommendedTreatment, 1, @sortOrder, GETDATE(), GETDATE()
        )

        SELECT
          ID, DiseaseName, Category, Keywords, Description,
          RecommendedTreatment, IsActive, SortOrder, CreatedAt, UpdatedAt
        FROM DiseaseTypes
        WHERE ID = @NewID
      `;

      const params = [
        { name: 'diseaseName', value: diseaseName },
        { name: 'category', value: category || '其他' },
        { name: 'keywords', value: keywords || '' },
        { name: 'description', value: description || '' },
        { name: 'recommendedTreatment', value: recommendedTreatment || '' },
        { name: 'sortOrder', value: nextSortOrder }
      ];

      const result = await executeQuery(insertQuery, params);

      res.status(201).json({
        status: 'Success',
        message: '疾病类型创建成功',
        data: result[0]
      });
    } catch (error) {
      console.error('创建疾病类型失败:', error);
      res.status(500).json({
        status: 'Error',
        message: '创建疾病类型失败'
      });
    }
  }

  // 更新疾病类型
  static async update(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'Error',
          message: '输入验证失败',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const { diseaseName, category, keywords, description, recommendedTreatment, isActive, sortOrder } = req.body;

      // 检查是否存在
      const checkQuery = `SELECT ID FROM DiseaseTypes WHERE ID = @id`;
      const existing = await executeQuery(checkQuery, [{ name: 'id', value: id }]);

      if (existing.length === 0) {
        return res.status(404).json({
          status: 'Error',
          message: '疾病类型不存在'
        });
      }

      // 如果更改了名称，检查是否与其他记录冲突
      if (diseaseName) {
        const nameCheckQuery = `
          SELECT ID FROM DiseaseTypes
          WHERE DiseaseName = @diseaseName AND ID != @id
        `;
        const nameConflict = await executeQuery(nameCheckQuery, [
          { name: 'diseaseName', value: diseaseName },
          { name: 'id', value: id }
        ]);

        if (nameConflict.length > 0) {
          return res.status(400).json({
            status: 'Error',
            message: '疾病类型名称已存在'
          });
        }
      }

      const updateQuery = `
        UPDATE DiseaseTypes SET
          DiseaseName = ISNULL(@diseaseName, DiseaseName),
          Category = ISNULL(@category, Category),
          Keywords = ISNULL(@keywords, Keywords),
          Description = ISNULL(@description, Description),
          RecommendedTreatment = ISNULL(@recommendedTreatment, RecommendedTreatment),
          IsActive = ISNULL(@isActive, IsActive),
          SortOrder = CASE WHEN @sortOrder IS NOT NULL THEN @sortOrder ELSE SortOrder END,
          UpdatedAt = GETDATE()
        WHERE ID = @id

        SELECT
          ID, DiseaseName, Category, Keywords, Description,
          RecommendedTreatment, IsActive, SortOrder, CreatedAt, UpdatedAt
        FROM DiseaseTypes
        WHERE ID = @id
      `;

      const params = [
        { name: 'id', value: id },
        { name: 'diseaseName', value: diseaseName },
        { name: 'category', value: category },
        { name: 'keywords', value: keywords },
        { name: 'description', value: description },
        { name: 'recommendedTreatment', value: recommendedTreatment },
        { name: 'isActive', value: isActive },
        { name: 'sortOrder', value: sortOrder }
      ];

      const result = await executeQuery(updateQuery, params);

      res.json({
        status: 'Success',
        message: '疾病类型更新成功',
        data: result[0]
      });
    } catch (error) {
      console.error('更新疾病类型失败:', error);
      res.status(500).json({
        status: 'Error',
        message: '更新疾病类型失败'
      });
    }
  }

  // 删除疾病类型
  static async delete(req, res) {
    try {
      const { id } = req.params;

      // 检查是否存在
      const checkQuery = `SELECT ID, DiseaseName FROM DiseaseTypes WHERE ID = @id`;
      const existing = await executeQuery(checkQuery, [{ name: 'id', value: id }]);

      if (existing.length === 0) {
        return res.status(404).json({
          status: 'Error',
          message: '疾病类型不存在'
        });
      }

      // 检查是否有患者使用此疾病类型
      const patientCheckQuery = `
        SELECT COUNT(*) as patientCount
        FROM StemCellPatients
        WHERE PrimaryDiagnosis = @diseaseName
      `;
      const patientCheck = await executeQuery(patientCheckQuery, [
        { name: 'diseaseName', value: existing[0].DiseaseName }
      ]);

      if (patientCheck[0].patientCount > 0) {
        return res.status(400).json({
          status: 'Error',
          message: `无法删除，已有 ${patientCheck[0].patientCount} 个患者使用此疾病类型`
        });
      }

      // 删除疾病类型
      const deleteQuery = `DELETE FROM DiseaseTypes WHERE ID = @id`;
      await executeQuery(deleteQuery, [{ name: 'id', value: id }]);

      res.json({
        status: 'Success',
        message: '疾病类型删除成功'
      });
    } catch (error) {
      console.error('删除疾病类型失败:', error);
      res.status(500).json({
        status: 'Error',
        message: '删除疾病类型失败'
      });
    }
  }

  // 同步治疗类型到相关的输注排期
  static async syncTreatmentType(req, res) {
    try {
      const { id } = req.params;
      const { confirm = false } = req.body;

      // 获取疾病类型信息
      const diseaseTypeQuery = `
        SELECT DiseaseName, RecommendedTreatment
        FROM DiseaseTypes
        WHERE ID = @id AND RecommendedTreatment IS NOT NULL AND RecommendedTreatment != ''
      `;
      const diseaseTypeResult = await executeQuery(diseaseTypeQuery, [{ name: 'id', value: id }]);

      if (diseaseTypeResult.length === 0) {
        return res.status(404).json({
          status: 'Error',
          message: '疾病类型不存在或未设置推荐治疗方案'
        });
      }

      const diseaseName = diseaseTypeResult[0].DiseaseName;
      const recommendedTreatment = diseaseTypeResult[0].RecommendedTreatment;

      // 查找需要更新的输注排期
      const findSchedulesQuery = `
        SELECT
          inf.ID,
          inf.TreatmentType as CurrentTreatmentType,
          sp.PatientNumber,
          c.Name as CustomerName,
          sp.PrimaryDiagnosis
        FROM InfusionSchedules inf
        INNER JOIN StemCellPatients sp ON inf.PatientID = sp.ID
        INNER JOIN Customers c ON sp.CustomerID = c.ID
        WHERE sp.PrimaryDiagnosis LIKE '%' + @diseaseName + '%'
          AND inf.TreatmentType != @recommendedTreatment
          AND inf.Status IN ('Scheduled', '已安排', 'In Progress', '进行中')
      `;

      const schedulesToUpdate = await executeQuery(findSchedulesQuery, [
        { name: 'diseaseName', value: diseaseName },
        { name: 'recommendedTreatment', value: recommendedTreatment }
      ]);

      if (schedulesToUpdate.length === 0) {
        return res.json({
          status: 'Success',
          message: '没有需要同步的输注排期记录',
          data: {
            affectedCount: 0,
            schedules: []
          }
        });
      }

      // 如果只是查询影响范围，返回预览数据
      if (!confirm) {
        return res.json({
          status: 'Success',
          message: '找到需要同步的输注排期记录',
          data: {
            diseaseName,
            recommendedTreatment,
            affectedCount: schedulesToUpdate.length,
            schedules: schedulesToUpdate
          }
        });
      }

      // 执行同步更新
      const updateQuery = `
        UPDATE inf
        SET inf.TreatmentType = @recommendedTreatment,
            inf.UpdatedAt = GETDATE()
        FROM InfusionSchedules inf
        INNER JOIN StemCellPatients sp ON inf.PatientID = sp.ID
        WHERE sp.PrimaryDiagnosis LIKE '%' + @diseaseName + '%'
          AND inf.Status IN ('Scheduled', '已安排', 'In Progress', '进行中')
      `;

      await executeQuery(updateQuery, [
        { name: 'diseaseName', value: diseaseName },
        { name: 'recommendedTreatment', value: recommendedTreatment }
      ]);

      res.json({
        status: 'Success',
        message: `成功将 ${schedulesToUpdate.length} 条输注排期记录的治疗类型同步为 ${recommendedTreatment}`,
        data: {
          diseaseName,
          recommendedTreatment,
          affectedCount: schedulesToUpdate.length,
          updatedSchedules: schedulesToUpdate
        }
      });
    } catch (error) {
      console.error('同步治疗类型失败:', error);
      res.status(500).json({
        status: 'Error',
        message: '同步治疗类型失败'
      });
    }
  }

  // 获取疾病类型统计
  static async getStatistics(req, res) {
    try {
      const query = `
        SELECT
          dt.DiseaseName as name,
          COUNT(scp.ID) as patientCount,
          COUNT(sc.ID) as infusionCount
        FROM DiseaseTypes dt
        LEFT JOIN StemCellPatients scp ON dt.DiseaseName = scp.PrimaryDiagnosis
        LEFT JOIN InfusionSchedules sc ON scp.ID = sc.PatientID
        WHERE dt.IsActive = 1
        GROUP BY dt.DiseaseName
        ORDER BY patientCount DESC, infusionCount DESC
      `;

      const result = await executeQuery(query);

      // 格式化数据为前端需要的格式
      const formattedResult = result.map(item => ({
        name: item.name,
        count: item.patientCount || 0,
        infusionCount: item.infusionCount || 0
      }));

      res.json({
        status: 'Success',
        message: '获取疾病类型统计成功',
        data: formattedResult
      });
    } catch (error) {
      console.error('获取疾病类型统计失败:', error);
      res.status(500).json({
        status: 'Error',
        message: '获取疾病类型统计失败'
      });
    }
  }
}

module.exports = DiseaseTypeController;
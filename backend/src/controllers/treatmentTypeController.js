const { executeQuery } = require('../../config/database');
const { validationResult } = require('express-validator');

class TreatmentTypeController {
  // 获取所有治疗类型
  static async getAll(req, res) {
    try {
      const { page = 1, limit = 100, search = '' } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      let whereClause = 'WHERE 1=1';
      const params = [];

      if (search) {
        whereClause += ' AND (tp.TreatmentType LIKE @search OR tp.PlanName LIKE @search)';
        params.push({ name: 'search', value: `%${search}%` });
      }

      // 获取治疗类型列表
      const query = `
        SELECT DISTINCT
          tp.TreatmentType as name,
          tp.TreatmentType,
          COUNT(DISTINCT scp.ID) as patientCount,
          COUNT(DISTINCT sc.ID) as infusionCount
        FROM TreatmentPlans tp
        LEFT JOIN StemCellPatients scp ON tp.TreatmentType = scp.TreatmentPlan
        LEFT JOIN InfusionSchedules sc ON scp.ID = sc.PatientID AND sc.TreatmentType = tp.TreatmentType
        ${whereClause}
        GROUP BY tp.TreatmentType
        ORDER BY infusionCount DESC, patientCount DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `;

      params.push({ name: 'offset', value: offset });
      params.push({ name: 'limit', value: parseInt(limit) });

      const treatmentTypes = await executeQuery(query, params);

      // 获取总数
      const countQuery = `
        SELECT COUNT(DISTINCT tp.TreatmentType) as total
        FROM TreatmentPlans tp
        ${whereClause}
      `;

      const countResult = await executeQuery(countQuery, params.slice(0, -2));
      const total = countResult[0].total;

      res.json({
        status: 'Success',
        message: '获取治疗类型列表成功',
        data: treatmentTypes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('获取治疗类型列表失败:', error);
      res.status(500).json({
        status: 'Error',
        message: '获取治疗类型列表失败'
      });
    }
  }

  // 获取治疗类型统计
  static async getStatistics(req, res) {
    try {
      const { dateFrom, dateTo } = req.query;

      let dateFilter = '';
      const params = [];

      if (dateFrom) {
        dateFilter += ' AND sc.ScheduleDate >= @dateFrom';
        params.push({ name: 'dateFrom', value: dateFrom });
      }

      if (dateTo) {
        dateFilter += ' AND sc.ScheduleDate <= @dateTo';
        params.push({ name: 'dateTo', value: dateTo });
      }

      const query = `
        SELECT
          sc.TreatmentType as name,
          COUNT(*) as count,
          CAST(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() AS DECIMAL(10,2)) as percentage
        FROM InfusionSchedules sc
        WHERE sc.Status = 'Completed'
        ${dateFilter}
        GROUP BY sc.TreatmentType
        ORDER BY count DESC
      `;

      const result = await executeQuery(query, params);

      res.json({
        status: 'Success',
        message: '获取治疗类型统计成功',
        data: result
      });
    } catch (error) {
      console.error('获取治疗类型统计失败:', error);
      res.status(500).json({
        status: 'Error',
        message: '获取治疗类型统计失败'
      });
    }
  }

  // 创建治疗类型
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

      const { treatmentType, planName, diseaseType, description, keywords } = req.body;

      // 检查是否已存在相同名称的治疗类型
      const existingQuery = `
        SELECT TreatmentType FROM TreatmentPlans
        WHERE TreatmentType = @treatmentType
      `;
      const existing = await executeQuery(existingQuery, [{ name: 'treatmentType', value: treatmentType }]);

      if (existing.length > 0) {
        return res.status(400).json({
          status: 'Error',
          message: '治疗类型名称已存在'
        });
      }

      const insertQuery = `
        DECLARE @NewID UNIQUEIDENTIFIER = NEWID();

        INSERT INTO TreatmentPlans (
          ID, PlanName, DiseaseType, TreatmentType, Description,
          Keywords, IsActive, CreatedAt, UpdatedAt
        ) VALUES (
          @NewID, @planName, @diseaseType, @treatmentType, @description,
          @keywords, 1, GETDATE(), GETDATE()
        )

        SELECT
          ID, PlanName, DiseaseType, TreatmentType, Description,
          Keywords, IsActive, CreatedAt, UpdatedAt
        FROM TreatmentPlans
        WHERE TreatmentType = @treatmentType
      `;

      const params = [
        { name: 'treatmentType', value: treatmentType },
        { name: 'planName', value: planName || `${treatmentType}治疗方案` },
        { name: 'diseaseType', value: diseaseType || '通用' },
        { name: 'description', value: description || '' },
        { name: 'keywords', value: keywords || '' }
      ];

      const result = await executeQuery(insertQuery, params);

      res.status(201).json({
        status: 'Success',
        message: '治疗类型创建成功',
        data: result[0]
      });
    } catch (error) {
      console.error('创建治疗类型失败:', error);
      res.status(500).json({
        status: 'Error',
        message: '创建治疗类型失败'
      });
    }
  }

  // 更新治疗类型
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

      const { treatmentType } = req.params;
      const { newTreatmentType, planName, diseaseType, description, keywords, isActive } = req.body;

      // 检查是否存在
      const checkQuery = `SELECT * FROM TreatmentPlans WHERE TreatmentType = @treatmentType`;
      const existing = await executeQuery(checkQuery, [{ name: 'treatmentType', value: treatmentType }]);

      if (existing.length === 0) {
        return res.status(404).json({
          status: 'Error',
          message: '治疗类型不存在'
        });
      }

      // 如果更改了名称，检查是否与其他记录冲突
      if (newTreatmentType && newTreatmentType !== treatmentType) {
        const nameCheckQuery = `
          SELECT TreatmentType FROM TreatmentPlans
          WHERE TreatmentType = @newTreatmentType
        `;
        const nameConflict = await executeQuery(nameCheckQuery, [
          { name: 'newTreatmentType', value: newTreatmentType }
        ]);

        if (nameConflict.length > 0) {
          return res.status(400).json({
            status: 'Error',
            message: '治疗类型名称已存在'
          });
        }
      }

      const updateQuery = `
        UPDATE TreatmentPlans SET
          TreatmentType = ISNULL(@newTreatmentType, TreatmentType),
          PlanName = ISNULL(@planName, PlanName),
          DiseaseType = ISNULL(@diseaseType, DiseaseType),
          Description = ISNULL(@description, Description),
          Keywords = ISNULL(@keywords, Keywords),
          IsActive = ISNULL(@isActive, IsActive),
          UpdatedAt = GETDATE()
        WHERE TreatmentType = @treatmentType

        SELECT
          ID, PlanName, DiseaseType, TreatmentType, Description,
          Keywords, IsActive, CreatedAt, UpdatedAt
        FROM TreatmentPlans
        WHERE TreatmentType = ISNULL(@newTreatmentType, @treatmentType)
      `;

      const params = [
        { name: 'treatmentType', value: treatmentType },
        { name: 'newTreatmentType', value: newTreatmentType },
        { name: 'planName', value: planName },
        { name: 'diseaseType', value: diseaseType },
        { name: 'description', value: description },
        { name: 'keywords', value: keywords },
        { name: 'isActive', value: isActive }
      ];

      const result = await executeQuery(updateQuery, params);

      res.json({
        status: 'Success',
        message: '治疗类型更新成功',
        data: result
      });
    } catch (error) {
      console.error('更新治疗类型失败:', error);
      res.status(500).json({
        status: 'Error',
        message: '更新治疗类型失败'
      });
    }
  }

  // 删除治疗类型
  static async delete(req, res) {
    try {
      const { treatmentType } = req.params;

      // 检查是否存在
      const checkQuery = `SELECT * FROM TreatmentPlans WHERE TreatmentType = @treatmentType`;
      const existing = await executeQuery(checkQuery, [{ name: 'treatmentType', value: treatmentType }]);

      if (existing.length === 0) {
        return res.status(404).json({
          status: 'Error',
          message: '治疗类型不存在'
        });
      }

      // 检查是否有患者或输注记录使用此治疗类型
      const usageCheckQuery = `
        SELECT
          COUNT(DISTINCT scp.ID) as patientCount,
          COUNT(DISTINCT sc.ID) as infusionCount
        FROM TreatmentPlans tp
        LEFT JOIN StemCellPatients scp ON tp.TreatmentType = scp.TreatmentPlan
        LEFT JOIN InfusionSchedules sc ON tp.TreatmentType = sc.TreatmentType
        WHERE tp.TreatmentType = @treatmentType
      `;
      const usageCheck = await executeQuery(usageCheckQuery, [
        { name: 'treatmentType', value: treatmentType }
      ]);

      if (usageCheck[0].patientCount > 0 || usageCheck[0].infusionCount > 0) {
        return res.status(400).json({
          status: 'Error',
          message: `无法删除，已有 ${usageCheck[0].patientCount} 个患者和 ${usageCheck[0].infusionCount} 个输注记录使用此治疗类型`
        });
      }

      // 删除治疗类型
      const deleteQuery = `DELETE FROM TreatmentPlans WHERE TreatmentType = @treatmentType`;
      await executeQuery(deleteQuery, [{ name: 'treatmentType', value: treatmentType }]);

      res.json({
        status: 'Success',
        message: '治疗类型删除成功'
      });
    } catch (error) {
      console.error('删除治疗类型失败:', error);
      res.status(500).json({
        status: 'Error',
        message: '删除治疗类型失败'
      });
    }
  }
}

module.exports = TreatmentTypeController;
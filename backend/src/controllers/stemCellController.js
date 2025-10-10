const StemCellPatient = require('../models/StemCellPatient');
const InfusionSchedule = require('../models/InfusionSchedule');
const Customer = require('../models/Customer');
const { validationResult } = require('express-validator');

class StemCellController {
  // 创建干细胞患者档案
  static async createPatient(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'Error',
          message: '输入验证失败',
          errors: errors.array()
        });
      }

      const { customerId } = req.body;

      // 检查客户是否存在
      const customer = await Customer.findById(customerId);
      if (!customer) {
        return res.status(404).json({
          status: 'Error',
          message: '客户不存在'
        });
      }

      // 检查是否已有干细胞档案
      const existingPatient = await StemCellPatient.findByCustomerId(customerId);
      if (existingPatient) {
        return res.status(400).json({
          status: 'Error',
          message: '该客户已存在干细胞治疗档案'
        });
      }

      const patient = await StemCellPatient.create({
        ...req.body,
        createdBy: req.user?.id || 'system'
      });

      res.status(201).json({
        status: 'Success',
        message: '干细胞患者档案创建成功',
        data: patient
      });
    } catch (error) {
      console.error('创建干细胞患者档案失败:', error);
      res.status(500).json({
        status: 'Error',
        message: error.message || '创建干细胞患者档案失败'
      });
    }
  }

  // 获取所有患者档案
  static async getAllPatients(req, res) {
    try {
      const { page = 1, limit = 20, search = '', status } = req.query;
      const result = await StemCellPatient.findAll(
        parseInt(page),
        parseInt(limit),
        search,
        status || null
      );

      res.json({
        status: 'Success',
        message: '获取患者档案列表成功',
        data: result.patients,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('获取患者档案列表失败:', error);
      res.status(500).json({
        status: 'Error',
        message: '获取患者档案列表失败'
      });
    }
  }

  // 根据客户ID获取患者档案
  static async getPatientByCustomerId(req, res) {
    try {
      const { customerId } = req.params;
      const patient = await StemCellPatient.findByCustomerId(customerId);

      if (!patient) {
        return res.status(404).json({
          status: 'Error',
          message: '患者档案不存在'
        });
      }

      // 获取完整的患者信息
      const fullInfo = await StemCellPatient.getPatientFullInfo(patient.ID);
      const statistics = await StemCellPatient.getTreatmentStatistics(patient.ID);

      res.json({
        status: 'Success',
        message: '获取患者档案成功',
        data: {
          ...fullInfo,
          statistics
        }
      });
    } catch (error) {
      console.error('获取患者档案失败:', error);
      res.status(500).json({
        status: 'Error',
        message: '获取患者档案失败'
      });
    }
  }

  // 根据患者编号获取档案
  static async getPatientByNumber(req, res) {
    try {
      const { patientNumber } = req.params;
      const patient = await StemCellPatient.findByPatientNumber(patientNumber);

      if (!patient) {
        return res.status(404).json({
          status: 'Error',
          message: '患者档案不存在'
        });
      }

      res.json({
        status: 'Success',
        message: '获取患者档案成功',
        data: patient
      });
    } catch (error) {
      console.error('获取患者档案失败:', error);
      res.status(500).json({
        status: 'Error',
        message: '获取患者档案失败'
      });
    }
  }

  static async getPatientById(req, res) {
    try {
      const { id } = req.params;
      const patient = await StemCellPatient.findByPatientId(id);

      if (!patient) {
        return res.status(404).json({
          status: 'Error',
          message: '患者档案不存在'
        });
      }

      res.json({
        status: 'Success',
        message: '获取患者档案成功',
        data: patient
      });
    } catch (error) {
      console.error('获取患者档案失败:', error);
      res.status(500).json({
        status: 'Error',
        message: '获取患者档案失败'
      });
    }
  }

  // 更新患者档案
  static async updatePatient(req, res) {
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

      // 处理状态值的映射
      const updateData = { ...req.body };
      if (updateData.status) {
        // 将中文状态值映射到英文
        const statusMap = {
          '治疗中': 'Active',
          '进行中': 'In Progress',
          '已完成': 'Completed',
          '暂停': 'Suspended',
          '未激活': 'Inactive'
        };
        updateData.status = statusMap[updateData.status] || updateData.status;
      }

      const updatedPatient = await StemCellPatient.update(id, updateData);

      if (!updatedPatient) {
        return res.status(404).json({
          status: 'Error',
          message: '患者档案不存在'
        });
      }

      res.json({
        status: 'Success',
        message: '患者档案更新成功',
        data: updatedPatient
      });
    } catch (error) {
      console.error('更新患者档案失败:', error);
      res.status(500).json({
        status: 'Error',
        message: '更新患者档案失败'
      });
    }
  }

  // 创建输注排期
  static async createInfusionSchedule(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'Error',
          message: '输入验证失败',
          errors: errors.array()
        });
      }

      const { patientId } = req.body;

      // 检查患者是否存在
      const patient = await StemCellPatient.findByPatientId(patientId);
      if (!patient) {
        return res.status(404).json({
          status: 'Error',
          message: '患者档案不存在'
        });
      }

      const schedule = await InfusionSchedule.create({
        ...req.body,
        createdBy: req.user?.id || 'system'
      });

      res.status(201).json({
        status: 'Success',
        message: '输注排期创建成功',
        data: schedule
      });
    } catch (error) {
      console.error('创建输注排期失败:', error);
      res.status(500).json({
        status: 'Error',
        message: '创建输注排期失败'
      });
    }
  }

  // 获取输注排期列表
  static async getInfusionSchedules(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        dateFrom,
        dateTo,
        status,
        search
      } = req.query;

      const result = await InfusionSchedule.findAll(
        parseInt(page),
        parseInt(limit),
        dateFrom,
        dateTo,
        status,
        search
      );

      res.json({
        status: 'Success',
        message: '获取输注排期列表成功',
        data: result.schedules,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('获取输注排期列表失败:', error);
      res.status(500).json({
        status: 'Error',
        message: '获取输注排期列表失败'
      });
    }
  }

  // 获取患者输注排期
  static async getPatientInfusionSchedules(req, res) {
    try {
      const { patientId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const result = await InfusionSchedule.findByPatientId(
        patientId,
        parseInt(page),
        parseInt(limit)
      );

      res.json({
        status: 'Success',
        message: '获取患者输注排期成功',
        data: result.schedules,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('获取患者输注排期失败:', error);
      res.status(500).json({
        status: 'Error',
        message: '获取患者输注排期失败'
      });
    }
  }

  // 完成输注
  static async completeInfusion(req, res) {
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
      const schedule = await InfusionSchedule.completeInfusion(id, req.body);

      if (!schedule) {
        return res.status(404).json({
          status: 'Error',
          message: '输注排期不存在'
        });
      }

      res.json({
        status: 'Success',
        message: '输注完成成功',
        data: schedule
      });
    } catch (error) {
      console.error('完成输注失败:', error);
      res.status(500).json({
        status: 'Error',
        message: '完成输注失败'
      });
    }
  }

  // 重新安排排期
  static async rescheduleInfusion(req, res) {
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
      const { newDate, notes } = req.body;

      const schedule = await InfusionSchedule.reschedule(id, newDate, notes);

      if (!schedule) {
        return res.status(404).json({
          status: 'Error',
          message: '输注排期不存在'
        });
      }

      res.json({
        status: 'Success',
        message: '排期重新安排成功',
        data: schedule
      });
    } catch (error) {
      console.error('重新安排排期失败:', error);
      res.status(500).json({
        status: 'Error',
        message: '重新安排排期失败'
      });
    }
  }

  // 取消排期
  static async cancelInfusion(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const schedule = await InfusionSchedule.cancel(id, reason);

      if (!schedule) {
        return res.status(404).json({
          status: 'Error',
          message: '输注排期不存在'
        });
      }

      res.json({
        status: 'Success',
        message: '排期取消成功',
        data: schedule
      });
    } catch (error) {
      console.error('取消排期失败:', error);
      res.status(500).json({
        status: 'Error',
        message: '取消排期失败'
      });
    }
  }

  // 删除排期
  static async deleteInfusionSchedule(req, res) {
    try {
      const { id } = req.params;

      // 检查排期是否存在
      const schedule = await InfusionSchedule.findById(id);
      if (!schedule) {
        return res.status(404).json({
          status: 'Error',
          message: '排期记录不存在'
        });
      }

      // 检查排期状态 - 已完成的排期不能删除
      if (schedule.Status === 'Completed') {
        return res.status(400).json({
          status: 'Error',
          message: '已完成的排期不能删除，只能取消'
        });
      }

      // 删除排期
      const deleted = await InfusionSchedule.delete(id);

      if (deleted) {
        res.json({
          status: 'Success',
          message: '排期删除成功'
        });
      } else {
        res.status(500).json({
          status: 'Error',
          message: '删除排期失败'
        });
      }
    } catch (error) {
      console.error('删除排期失败:', error);
      res.status(500).json({
        status: 'Error',
        message: '删除排期失败'
      });
    }
  }

  // 获取今日排期
  static async getTodaySchedules(req, res) {
    try {
      const schedules = await InfusionSchedule.getTodaySchedules();

      res.json({
        status: 'Success',
        message: '获取今日排期成功',
        data: schedules
      });
    } catch (error) {
      console.error('获取今日排期失败:', error);
      res.status(500).json({
        status: 'Error',
        message: '获取今日排期失败'
      });
    }
  }

  // 获取即将到来的排期
  static async getUpcomingSchedules(req, res) {
    try {
      const { days = 7 } = req.query;
      const schedules = await InfusionSchedule.getUpcomingSchedules(parseInt(days));

      res.json({
        status: 'Success',
        message: '获取即将到来的排期成功',
        data: schedules
      });
    } catch (error) {
      console.error('获取即将到来的排期失败:', error);
      res.status(500).json({
        status: 'Error',
        message: '获取即将到来的排期失败'
      });
    }
  }

  // 获取治疗统计
  static async getTreatmentStatistics(req, res) {
    try {
      const {
        dateFrom,
        dateTo,
        year = new Date().getFullYear(),
        type = 'general' // general, monthly, treatmentType
      } = req.query;

      let statistics;

      switch (type) {
        case 'monthly':
          statistics = await InfusionSchedule.getMonthlyStatistics(parseInt(year));
          break;
        case 'treatmentType':
          statistics = await InfusionSchedule.getTreatmentTypeStatistics(dateFrom, dateTo);
          break;
        default:
          statistics = await InfusionSchedule.getStatistics(dateFrom, dateTo);
      }

      res.json({
        status: 'Success',
        message: '获取治疗统计成功',
        data: statistics
      });
    } catch (error) {
      console.error('获取治疗统计失败:', error);
      res.status(500).json({
        status: 'Error',
        message: '获取治疗统计失败'
      });
    }
  }

  // 根据病种查找患者
  static async getPatientsByDiseaseType(req, res) {
    try {
      const { diseaseType } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const result = await StemCellPatient.findByDiseaseType(
        diseaseType,
        parseInt(page),
        parseInt(limit)
      );

      res.json({
        status: 'Success',
        message: '根据病种查找患者成功',
        data: result.patients,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('根据病种查找患者失败:', error);
      res.status(500).json({
        status: 'Error',
        message: '根据病种查找患者失败'
      });
    }
  }

  // 删除干细胞患者档案
  static async deletePatient(req, res) {
    try {
      const { id } = req.params;

      // 检查患者是否存在
      const patient = await StemCellPatient.findByPatientId(id);
      if (!patient) {
        return res.status(404).json({
          status: 'Error',
          message: '患者档案不存在'
        });
      }

      // 检查是否有历史输注记录
      const allSchedulesQuery = `
        SELECT COUNT(*) as totalSchedules,
               COUNT(CASE WHEN Status = 'Scheduled' OR Status = '已安排' OR Status = 'In Progress' OR Status = '进行中' THEN 1 END) as activeSchedules
        FROM InfusionSchedules
        WHERE PatientID = @id
      `;

      const { executeQuery } = require('../../config/database');
      const scheduleResult = await executeQuery(allSchedulesQuery, [
        { name: 'id', value: id, type: require('mssql').UniqueIdentifier }
      ]);

      const totalSchedules = scheduleResult[0].totalSchedules;
      const activeSchedules = scheduleResult[0].activeSchedules;

      // 如果有活跃的排期，给出警告但仍允许删除
      let message = '干细胞患者档案删除成功';
      if (totalSchedules > 0) {
        if (activeSchedules > 0) {
          message = `警告：该患者有 ${activeSchedules} 个未完成的排期。患者档案及其所有 ${totalSchedules} 条输注记录（包括未完成排期）将被删除`;
        } else {
          message = `干细胞患者档案及其 ${totalSchedules} 条历史输注记录删除成功`;
        }
      }

      // 删除患者档案（会级联删除相关的输注排期）
      const deleted = await StemCellPatient.delete(id);

      if (deleted) {
        res.json({
          status: 'Success',
          message: message
        });
      } else {
        res.status(500).json({
          status: 'Error',
          message: '删除患者档案失败'
        });
      }
    } catch (error) {
      console.error('删除患者档案失败:', error);
      res.status(500).json({
        status: 'Error',
        message: '删除患者档案失败'
      });
    }
  }

  // 获取干细胞管理页面的统计数据
  static async getStemCellStatistics(req, res) {
    try {
      const { executeQuery } = require('../../config/database');

      // 获取治疗类型统计 - 基于实际的输注记录
      const treatmentStatsResult = await executeQuery(`
        SELECT
          isch.TreatmentType as name,
          COUNT(*) as count,
          CAST(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM InfusionSchedules) AS DECIMAL(5,1)) as percentage
        FROM InfusionSchedules isch
        GROUP BY isch.TreatmentType
        ORDER BY count DESC
      `);

      // 获取回输次数分布 - 基于实际的输注记录
      const infusionStatsResult = await executeQuery(`
        SELECT
          CASE
            WHEN completed_infusions = 0 THEN '未输注'
            WHEN completed_infusions BETWEEN 1 AND 3 THEN '1-3次'
            WHEN completed_infusions BETWEEN 4 AND 6 THEN '4-6次'
            WHEN completed_infusions BETWEEN 7 AND 10 THEN '7-10次'
            ELSE '10次以上'
          END as type,
          COUNT(*) as count
        FROM (
          SELECT
            sp.ID,
            COUNT(CASE WHEN isch.Status = 'Completed' THEN 1 END) as completed_infusions
          FROM StemCellPatients sp
          LEFT JOIN InfusionSchedules isch ON sp.ID = isch.PatientID
          GROUP BY sp.ID
        ) patient_stats
        GROUP BY
          CASE
            WHEN completed_infusions = 0 THEN '未输注'
            WHEN completed_infusions BETWEEN 1 AND 3 THEN '1-3次'
            WHEN completed_infusions BETWEEN 4 AND 6 THEN '4-6次'
            WHEN completed_infusions BETWEEN 7 AND 10 THEN '7-10次'
            ELSE '10次以上'
          END
        ORDER BY count DESC
      `);

      // 获取病种分布 - 基于患者档案
      const diseaseStatsResult = await executeQuery(`
        SELECT
          sp.PrimaryDiagnosis as name,
          COUNT(*) as count
        FROM StemCellPatients sp
        WHERE sp.PrimaryDiagnosis IS NOT NULL AND sp.PrimaryDiagnosis != ''
        GROUP BY sp.PrimaryDiagnosis
        ORDER BY count DESC
      `);

      // 获取患者列表 - 修正输注次数统计
      const patientsResult = await executeQuery(`
        SELECT
          sp.ID as id,
          sp.PatientNumber as patient_number,
          c.Name as name,
          sp.PrimaryDiagnosis as primary_diagnosis,
          sp.TreatmentPlan as treatment_plan,
          ISNULL(completed_count, 0) as infusion_count,
          scheduled_count as scheduled_count,
          sp.Status,
          FORMAT(isNext.ScheduleDate, 'yyyy-MM-dd') as next_schedule
        FROM StemCellPatients sp
        INNER JOIN Customers c ON sp.CustomerID = c.ID
        LEFT JOIN (
          SELECT
            PatientID,
            COUNT(CASE WHEN Status = 'Completed' THEN 1 END) as completed_count,
            COUNT(CASE WHEN Status = 'Scheduled' THEN 1 END) as scheduled_count
          FROM InfusionSchedules
          GROUP BY PatientID
        ) infusion_stats ON sp.ID = infusion_stats.PatientID
        LEFT JOIN (
          SELECT PatientID, ScheduleDate,
            ROW_NUMBER() OVER (PARTITION BY PatientID ORDER BY ScheduleDate ASC) as rn
          FROM InfusionSchedules
          WHERE Status = 'Scheduled' AND ScheduleDate >= CAST(GETDATE() AS DATE)
        ) isNext ON sp.ID = isNext.PatientID AND isNext.rn = 1
        WHERE sp.Status = 'Active'
        ORDER BY sp.CreatedAt DESC
      `);

      const statistics = {
        treatmentTypes: treatmentStatsResult,
        infusionCounts: infusionStatsResult,
        diseases: diseaseStatsResult,
        patients: patientsResult
      };

      res.json({
        status: 'Success',
        message: '获取干细胞统计数据成功',
        data: statistics
      });
    } catch (error) {
      console.error('获取干细胞统计数据失败:', error);
      res.status(500).json({
        status: 'Error',
        message: '获取干细胞统计数据失败'
      });
    }
  }
}


module.exports = StemCellController;
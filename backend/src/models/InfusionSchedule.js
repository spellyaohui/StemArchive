const { executeQuery, executeProcedure, sql } = require('../../config/database');

class InfusionSchedule {
  // 创建输注排期
  static async create(scheduleData) {
    const {
      patientId,
      scheduleDate,
      scheduleType,
      treatmentType,
      infusionCount,
      doctor,
      nurse,
      notes,
      createdBy
    } = scheduleData;

    const query = `
      DECLARE @NewID UNIQUEIDENTIFIER = NEWID();

      INSERT INTO InfusionSchedules (
        ID, PatientID, ScheduleDate, ScheduleType, TreatmentType,
        InfusionCount, Doctor, Nurse, Notes, Status, CreatedBy
      )
      VALUES (
        @NewID, @patientId, @scheduleDate, @scheduleType, @treatmentType,
        @infusionCount, @doctor, @nurse, @notes, 'Scheduled', @createdBy
      );

      SELECT * FROM InfusionSchedules WHERE ID = @NewID;
    `;

    const params = [
      { name: 'patientId', value: patientId, type: sql.UniqueIdentifier },
      { name: 'scheduleDate', value: scheduleDate, type: sql.Date },
      { name: 'scheduleType', value: scheduleType, type: sql.NVarChar },
      { name: 'treatmentType', value: treatmentType, type: sql.NVarChar },
      { name: 'infusionCount', value: infusionCount, type: sql.Int },
      { name: 'doctor', value: doctor, type: sql.NVarChar },
      { name: 'nurse', value: nurse, type: sql.NVarChar },
      { name: 'notes', value: notes, type: sql.NVarChar },
      { name: 'createdBy', value: createdBy, type: sql.NVarChar }
    ];

    try {
      const result = await executeQuery(query, params);
      return result[0];
    } catch (error) {
      console.error('创建输注排期失败:', error);
      throw error;
    }
  }

  // 获取排期详情
  static async findById(id) {
    const query = `
      SELECT
        inf.*,
        sp.PatientNumber,
        c.Name as CustomerName,
        c.Phone as CustomerPhone,
        c.ContactPerson,
        c.ContactPersonPhone
      FROM InfusionSchedules inf
      INNER JOIN StemCellPatients sp ON inf.PatientID = sp.ID
      INNER JOIN Customers c ON sp.CustomerID = c.ID
      WHERE inf.ID = @id;
    `;

    const params = [{ name: 'id', value: id, type: sql.UniqueIdentifier }];
    const result = await executeQuery(query, params);
    return result[0];
  }

  // 获取患者所有排期
  static async findByPatientId(patientId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const query = `
      SELECT
        inf.*,
        sp.PatientNumber,
        c.Name as CustomerName
      FROM InfusionSchedules inf
      INNER JOIN StemCellPatients sp ON inf.PatientID = sp.ID
      INNER JOIN Customers c ON sp.CustomerID = c.ID
      WHERE inf.PatientID = @patientId
      ORDER BY inf.ScheduleDate DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;

      SELECT COUNT(*) as Total FROM InfusionSchedules WHERE PatientID = @patientId;
    `;

    const params = [
      { name: 'patientId', value: patientId, type: sql.UniqueIdentifier },
      { name: 'offset', value: offset, type: sql.Int },
      { name: 'limit', value: limit, type: sql.Int }
    ];

    const result = await executeQuery(query, params);
    const patientSchedules = result.slice(0, -1);
    const total = result[result.length - 1].Total;

    return {
      schedules: patientSchedules,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // 获取所有排期
  static async findAll(page = 1, limit = 20, dateFrom = null, dateTo = null, status = null, search = '') {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    let params = [];

    if (dateFrom) {
      whereClause += ' AND inf.ScheduleDate >= @dateFrom';
      params.push({ name: 'dateFrom', value: dateFrom, type: sql.Date });
    }

    if (dateTo) {
      whereClause += ' AND inf.ScheduleDate <= @dateTo';
      params.push({ name: 'dateTo', value: dateTo, type: sql.Date });
    }

    if (status) {
      whereClause += ' AND inf.Status = @status';
      params.push({ name: 'status', value: status, type: sql.NVarChar });
    }

    if (search) {
      whereClause += ' AND (c.Name LIKE @search OR sp.PatientNumber LIKE @search2 OR inf.TreatmentType LIKE @search3)';
      params.push(
        { name: 'search', value: `%${search}%`, type: sql.NVarChar },
        { name: 'search2', value: `%${search}%`, type: sql.NVarChar },
        { name: 'search3', value: `%${search}%`, type: sql.NVarChar }
      );
    }

    const dataQuery = `
      SELECT
        inf.*,
        sp.PatientNumber,
        c.Name as CustomerName,
        c.Phone as CustomerPhone,
        c.ContactPerson,
        c.ContactPersonPhone
      FROM InfusionSchedules inf
      INNER JOIN StemCellPatients sp ON inf.PatientID = sp.ID
      INNER JOIN Customers c ON sp.CustomerID = c.ID
      ${whereClause}
      ORDER BY inf.ScheduleDate DESC, inf.CreatedAt DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
    `;

    const countQuery = `
      SELECT COUNT(*) as Total
      FROM InfusionSchedules inf
      INNER JOIN StemCellPatients sp ON inf.PatientID = sp.ID
      INNER JOIN Customers c ON sp.CustomerID = c.ID
      ${whereClause};
    `;

    // 数据查询参数
    const dataParams = [...params,
      { name: 'offset', value: offset, type: sql.Int },
      { name: 'limit', value: limit, type: sql.Int }
    ];

    try {
      // 分别执行两个查询
      const schedules = await executeQuery(dataQuery, dataParams);
      const countResult = await executeQuery(countQuery, params);
      const total = countResult[0] ? countResult[0].Total : 0;

      // 安全地处理结果集
      if (!schedules || schedules.length === 0) {
        return {
          schedules: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0
          }
        };
      }

      return {
        schedules: schedules,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('InfusionSchedule.findAll 查询失败:', error);
      throw error;
    }
  }

  // 获取当日排期
  static async getTodaySchedules() {
    console.log('Executing getTodaySchedules query...');

    const query = `
      SELECT
        inf.*,
        sp.PatientNumber,
        c.Name as CustomerName,
        c.Phone as CustomerPhone,
        c.ContactPerson,
        c.ContactPersonPhone
      FROM InfusionSchedules inf
      INNER JOIN StemCellPatients sp ON inf.PatientID = sp.ID
      INNER JOIN Customers c ON sp.CustomerID = c.ID
      WHERE inf.ScheduleDate = CAST(GETDATE() AS DATE)
        AND inf.Status IN ('已安排', 'Scheduled', 'In Progress', 'Completed')
      ORDER BY inf.ScheduleDate ASC, inf.CreatedAt ASC;
    `;

    try {
      const result = await executeQuery(query);
      console.log('Query result count:', result.length);
      return result;
    } catch (error) {
      console.error('Query execution error:', error);
      throw error;
    }
  }

  // 获取即将到来的排期（未来7天）
  static async getUpcomingSchedules(days = 7) {
    const query = `
      SELECT
        inf.*,
        sp.PatientNumber,
        c.Name as CustomerName,
        c.Phone as CustomerPhone,
        c.ContactPerson,
        c.ContactPersonPhone
      FROM InfusionSchedules inf
      INNER JOIN StemCellPatients sp ON inf.PatientID = sp.ID
      INNER JOIN Customers c ON sp.CustomerID = c.ID
      WHERE inf.ScheduleDate BETWEEN CAST(GETDATE() AS DATE) AND DATEADD(day, @days, CAST(GETDATE() AS DATE))
        AND inf.Status = 'Scheduled'
      ORDER BY inf.ScheduleDate ASC;
    `;

    const params = [{ name: 'days', value: days, type: sql.Int }];
    return await executeQuery(query, params);
  }

  // 更新排期状态
  static async updateStatus(id, status, additionalData = {}) {
    const { completedDate, doctor, nurse, notes } = additionalData;

    let setClause = 'Status = @status';
    let params = [
      { name: 'id', value: id, type: sql.UniqueIdentifier },
      { name: 'status', value: status, type: sql.NVarChar }
    ];

    if (completedDate) {
      setClause += ', CompletedDate = @completedDate';
      params.push({ name: 'completedDate', value: completedDate, type: sql.Date });
    }

    if (doctor) {
      setClause += ', Doctor = @doctor';
      params.push({ name: 'doctor', value: doctor, type: sql.NVarChar });
    }

    if (nurse) {
      setClause += ', Nurse = @nurse';
      params.push({ name: 'nurse', value: nurse, type: sql.NVarChar });
    }

    if (notes) {
      setClause += ', Notes = @notes';
      params.push({ name: 'notes', value: notes, type: sql.NVarChar });
    }

    setClause += ', UpdatedAt = GETDATE()';

    const query = `
      UPDATE InfusionSchedules SET
        ${setClause}
      WHERE ID = @id;

      SELECT * FROM InfusionSchedules WHERE ID = @id;
    `;

    const result = await executeQuery(query, params);
    return result[0];
  }

  // 完成输注
  static async completeInfusion(id, completionData) {
    const { doctor, nurse, notes } = completionData;

    const query = `
      UPDATE InfusionSchedules SET
        Status = 'Completed',
        CompletedDate = GETDATE(),
        Doctor = @doctor,
        Nurse = @nurse,
        Notes = @notes,
        UpdatedAt = GETDATE()
      WHERE ID = @id;

      -- 更新患者的总回输次数
      UPDATE StemCellPatients SET
        TotalInfusionCount = TotalInfusionCount + 1,
        UpdatedAt = GETDATE()
      WHERE ID = (SELECT PatientID FROM InfusionSchedules WHERE ID = @id);

      SELECT * FROM InfusionSchedules WHERE ID = @id;
    `;

    const params = [
      { name: 'id', value: id, type: sql.UniqueIdentifier },
      { name: 'doctor', value: doctor, type: sql.NVarChar },
      { name: 'nurse', value: nurse, type: sql.NVarChar },
      { name: 'notes', value: notes, type: sql.NVarChar }
    ];

    const result = await executeQuery(query, params);
    return result[0];
  }

  // 重新安排排期
  static async reschedule(id, newDate, notes) {
    const query = `
      UPDATE InfusionSchedules SET
        ScheduleDate = @newDate,
        Status = 'Rescheduled',
        Notes = ISNULL(@notes, '') + ' (原排期已重新安排)',
        UpdatedAt = GETDATE()
      WHERE ID = @id;

      SELECT * FROM InfusionSchedules WHERE ID = @id;
    `;

    const params = [
      { name: 'id', value: id, type: sql.UniqueIdentifier },
      { name: 'newDate', value: newDate, type: sql.Date },
      { name: 'notes', value: notes, type: sql.NVarChar }
    ];

    const result = await executeQuery(query, params);
    return result[0];
  }

  // 取消排期
  static async cancel(id, reason) {
    const query = `
      UPDATE InfusionSchedules SET
        Status = 'Cancelled',
        Notes = ISNULL(@reason, ''),
        UpdatedAt = GETDATE()
      WHERE ID = @id;

      SELECT * FROM InfusionSchedules WHERE ID = @id;
    `;

    const params = [
      { name: 'id', value: id, type: sql.UniqueIdentifier },
      { name: 'reason', value: reason, type: sql.NVarChar }
    ];

    const result = await executeQuery(query, params);
    return result[0];
  }

  // 获取排期统计
  static async getStatistics(dateFrom = null, dateTo = null) {
    let whereClause = 'WHERE 1=1';
    let params = [];

    if (dateFrom) {
      whereClause += ' AND ScheduleDate >= @dateFrom';
      params.push({ name: 'dateFrom', value: dateFrom, type: sql.Date });
    }

    if (dateTo) {
      whereClause += ' AND ScheduleDate <= @dateTo';
      params.push({ name: 'dateTo', value: dateTo, type: sql.Date });
    }

    const query = `
      SELECT
        COUNT(*) as TotalSchedules,
        COUNT(DISTINCT CASE WHEN Status = 'Completed' THEN ID END) as CompletedCount,
        COUNT(DISTINCT CASE WHEN Status = 'Scheduled' THEN ID END) as ScheduledCount,
        COUNT(DISTINCT CASE WHEN Status = 'Cancelled' THEN ID END) as CancelledCount,
        COUNT(DISTINCT PatientID) as UniquePatients,
        STRING_AGG(DISTINCT TreatmentType, ', ') as TreatmentTypes
      FROM InfusionSchedules
      ${whereClause};
    `;

    const result = await executeQuery(query, params);
    return result[0];
  }

  // 按月份获取排期统计
  static async getMonthlyStatistics(year = null) {
    const targetYear = year || new Date().getFullYear();

    const query = `
      SELECT
        YEAR(ScheduleDate) as Year,
        MONTH(ScheduleDate) as Month,
        COUNT(*) as TotalSchedules,
        COUNT(DISTINCT CASE WHEN Status = 'Completed' THEN ID END) as CompletedCount,
        COUNT(DISTINCT CASE WHEN Status = 'Scheduled' THEN ID END) as ScheduledCount,
        COUNT(DISTINCT PatientID) as UniquePatients
      FROM InfusionSchedules
      WHERE YEAR(ScheduleDate) = @year
      GROUP BY YEAR(ScheduleDate), MONTH(ScheduleDate)
      ORDER BY Year, Month;
    `;

    const params = [{ name: 'year', value: targetYear, type: sql.Int }];
    return await executeQuery(query, params);
  }

  // 按治疗类型统计
  static async getTreatmentTypeStatistics(dateFrom = null, dateTo = null) {
    let whereClause = 'WHERE 1=1';
    let params = [];

    if (dateFrom) {
      whereClause += ' AND ScheduleDate >= @dateFrom';
      params.push({ name: 'dateFrom', value: dateFrom, type: sql.Date });
    }

    if (dateTo) {
      whereClause += ' AND ScheduleDate <= @dateTo';
      params.push({ name: 'dateTo', value: dateTo, type: sql.Date });
    }

    const query = `
      SELECT
        TreatmentType,
        COUNT(*) as Count,
        COUNT(DISTINCT PatientID) as UniquePatients,
        COUNT(DISTINCT CASE WHEN Status = 'Completed' THEN ID END) as CompletedCount
      FROM InfusionSchedules
      ${whereClause}
      GROUP BY TreatmentType
      ORDER BY Count DESC;
    `;

    return await executeQuery(query, params);
  }

  // 获取患者的活跃排期（未完成的排期）
  static async getActiveSchedulesByPatient(patientId) {
    const query = `
      SELECT
        ID,
        PatientID,
        ScheduleDate,
        TreatmentType,
        Status,
        ScheduleType
      FROM InfusionSchedules
      WHERE PatientID = @patientId
        AND Status IN ('Scheduled', '已安排', 'In Progress', '进行中')
      ORDER BY ScheduleDate ASC;
    `;

    const params = [
      { name: 'patientId', value: patientId, type: sql.UniqueIdentifier }
    ];

    return await executeQuery(query, params);
  }

  // 删除排期
  static async delete(id) {
    const sql = require('mssql');
    const { getPool } = require('../../config/database');

    try {
      const pool = getPool();
      const request = pool.request();

      request.input('id', sql.UniqueIdentifier, id);

      const result = await request.query(`
        DELETE FROM InfusionSchedules
        WHERE ID = @id;
      `);

      // 检查是否有行被删除
      return result.rowsAffected && result.rowsAffected[0] > 0;
    } catch (error) {
      console.error('删除排期失败:', error);
      throw error;
    }
  }
}

module.exports = InfusionSchedule;
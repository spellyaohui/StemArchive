const { executeQuery, executeProcedure, sql } = require('../../config/database');

class StemCellPatient {
  // 创建干细胞患者档案
  static async create(patientData) {
    const {
      customerId,
      diseaseTypes,
      diseaseKeywords,
      primaryDiagnosis,
      treatmentPlan,
      treatmentCycleYears,
      initialFrequencyMonths,
      initialCount,
      followUpFrequencyMonths,
      createdBy
    } = patientData;

    // 生成患者编号
    const patientNumber = await this.generatePatientNumber();

    const query = `
      DECLARE @NewID UNIQUEIDENTIFIER = NEWID();

      INSERT INTO StemCellPatients (
        ID, CustomerID, PatientNumber, RegistrationDate, DiseaseTypes,
        DiseaseKeywords, PrimaryDiagnosis, TreatmentPlan,
        TreatmentCycleYears, InitialFrequencyMonths, InitialCount,
        FollowUpFrequencyMonths, CreatedBy
      )
      VALUES (
        @NewID, @customerId, @patientNumber, GETDATE(),
        @diseaseTypes, @diseaseKeywords, @primaryDiagnosis, @treatmentPlan,
        @treatmentCycleYears, @initialFrequencyMonths, @initialCount,
        @followUpFrequencyMonths, @createdBy
      );

      SELECT * FROM StemCellPatients WHERE PatientNumber = @patientNumber;
    `;

    const params = [
      { name: 'customerId', value: customerId, type: sql.UniqueIdentifier },
      { name: 'patientNumber', value: patientNumber, type: sql.NVarChar },
      { name: 'diseaseTypes', value: JSON.stringify(diseaseTypes), type: sql.NVarChar },
      { name: 'diseaseKeywords', value: diseaseKeywords, type: sql.NVarChar },
      { name: 'primaryDiagnosis', value: primaryDiagnosis, type: sql.NVarChar },
      { name: 'treatmentPlan', value: treatmentPlan, type: sql.NVarChar },
      { name: 'treatmentCycleYears', value: treatmentCycleYears, type: sql.Int },
      { name: 'initialFrequencyMonths', value: initialFrequencyMonths, type: sql.Int },
      { name: 'initialCount', value: initialCount, type: sql.Int },
      { name: 'followUpFrequencyMonths', value: followUpFrequencyMonths, type: sql.Int },
      { name: 'createdBy', value: createdBy, type: sql.NVarChar }
    ];

    const result = await executeQuery(query, params);
    return result[0];
  }

  // 生成患者编号
  static async generatePatientNumber() {
    const query = `
      DECLARE @NextNumber INT;
      SELECT @NextNumber = ISNULL(MAX(CAST(RIGHT(PatientNumber, 4) AS INT)), 0) + 1
      FROM StemCellPatients
      WHERE PatientNumber LIKE 'ST%' + CONVERT(NVARCHAR, YEAR(GETDATE())) + '%';

      SELECT 'ST' + CONVERT(NVARCHAR, YEAR(GETDATE())) + RIGHT('0000' + CONVERT(NVARCHAR, @NextNumber), 4) as PatientNumber;
    `;

    const result = await executeQuery(query);
    return result[0].PatientNumber;
  }

  // 根据客户ID获取患者档案
  static async findByCustomerId(customerId) {
    const query = 'SELECT * FROM StemCellPatients WHERE CustomerID = @customerId AND Status = @status';
    const params = [
      { name: 'customerId', value: customerId, type: sql.UniqueIdentifier },
      { name: 'status', value: 'Active', type: sql.NVarChar }
    ];
    const result = await executeQuery(query, params);
    return result[0];
  }

  // 根据患者编号获取患者档案
  static async findByPatientNumber(patientNumber) {
    const query = 'SELECT * FROM StemCellPatients WHERE PatientNumber = @patientNumber';
    const params = [{ name: 'patientNumber', value: patientNumber, type: sql.NVarChar }];
    const result = await executeQuery(query, params);
    return result[0];
  }

  // 获取所有患者档案
  static async findAll(page = 1, limit = 20, search = '', status = null) {
    const offset = (page - 1) * limit;
    let whereClause = '';
    let params = [];

    // 只有当status参数存在时才添加状态过滤
    if (status !== null && status !== undefined && status !== '') {
      whereClause = 'WHERE sp.Status = @status';
      params = [{ name: 'status', value: status, type: sql.NVarChar }];
    }

    if (search) {
      if (whereClause) {
        whereClause += ' AND (c.Name LIKE @searchName OR sp.PatientNumber LIKE @searchNumber OR sp.PrimaryDiagnosis LIKE @searchDiagnosis)';
      } else {
        whereClause = 'WHERE (c.Name LIKE @searchName OR sp.PatientNumber LIKE @searchNumber OR sp.PrimaryDiagnosis LIKE @searchDiagnosis)';
      }
      params.push(
        { name: 'searchName', value: `%${search}%`, type: sql.NVarChar },
        { name: 'searchNumber', value: `%${search}%`, type: sql.NVarChar },
        { name: 'searchDiagnosis', value: `%${search}%`, type: sql.NVarChar }
      );
    }

    const query = `
      SELECT
        sp.*,
        c.Name as CustomerName,
        c.Gender,
        c.Age,
        c.Phone,
        c.IdentityCard
      FROM StemCellPatients sp
      INNER JOIN Customers c ON sp.CustomerID = c.ID
      ${whereClause}
      ORDER BY sp.RegistrationDate DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;

      SELECT COUNT(*) as Total
      FROM StemCellPatients sp
      INNER JOIN Customers c ON sp.CustomerID = c.ID
      ${whereClause};
    `;

    params.push(
      { name: 'offset', value: offset, type: sql.Int },
      { name: 'limit', value: limit, type: sql.Int }
    );

    const result = await executeQuery(query, params);

    // 分离患者数据和总数统计
    let patients = [];
    let total = 0;

    if (result.length >= 2) {
      // 有两个结果集：患者数据和总数统计
      const totalRecord = result[result.length - 1];
      patients = result.slice(0, -1);
      total = totalRecord ? totalRecord.Total : 0;
    } else if (result.length === 1) {
      // 只有一个结果集：患者数据
      patients = result;
      total = patients.length;
    }

    return {
      patients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // 更新患者档案
  static async update(id, updateData) {
    const {
      diseaseTypes,
      diseaseKeywords,
      primaryDiagnosis,
      treatmentPlan,
      treatmentCycleYears,
      initialFrequencyMonths,
      initialCount,
      followUpFrequencyMonths,
      remarks,
      status,
      totalInfusionCount
    } = updateData;

    const query = `
      UPDATE StemCellPatients SET
        DiseaseTypes = @diseaseTypes,
        DiseaseKeywords = @diseaseKeywords,
        PrimaryDiagnosis = @primaryDiagnosis,
        TreatmentPlan = @treatmentPlan,
        TreatmentCycleYears = @treatmentCycleYears,
        InitialFrequencyMonths = @initialFrequencyMonths,
        InitialCount = @initialCount,
        FollowUpFrequencyMonths = @followUpFrequencyMonths,
        Remarks = @remarks,
        Status = ISNULL(@status, Status),
        TotalInfusionCount = ISNULL(@totalInfusionCount, TotalInfusionCount),
        UpdatedAt = GETDATE()
      WHERE ID = @id;

      SELECT * FROM StemCellPatients WHERE ID = @id;
    `;

    const params = [
      { name: 'id', value: id, type: sql.UniqueIdentifier },
      { name: 'diseaseTypes', value: JSON.stringify(diseaseTypes), type: sql.NVarChar },
      { name: 'diseaseKeywords', value: diseaseKeywords, type: sql.NVarChar },
      { name: 'primaryDiagnosis', value: primaryDiagnosis, type: sql.NVarChar },
      { name: 'treatmentPlan', value: treatmentPlan, type: sql.NVarChar },
      { name: 'treatmentCycleYears', value: treatmentCycleYears, type: sql.Int },
      { name: 'initialFrequencyMonths', value: initialFrequencyMonths, type: sql.Int },
      { name: 'initialCount', value: initialCount, type: sql.Int },
      { name: 'followUpFrequencyMonths', value: followUpFrequencyMonths, type: sql.Int },
      { name: 'remarks', value: remarks, type: sql.NVarChar },
      { name: 'status', value: status, type: sql.NVarChar },
      { name: 'totalInfusionCount', value: totalInfusionCount, type: sql.Int }
    ];

    const result = await executeQuery(query, params);
    return result[0];
  }

  // 增加回输次数
  static async incrementInfusionCount(id) {
    const query = `
      UPDATE StemCellPatients SET
        TotalInfusionCount = TotalInfusionCount + 1,
        UpdatedAt = GETDATE()
      WHERE ID = @id;

      SELECT TotalInfusionCount FROM StemCellPatients WHERE ID = @id;
    `;

    const params = [{ name: 'id', value: id, type: sql.UniqueIdentifier }];
    const result = await executeQuery(query, params);
    return result[0].TotalInfusionCount;
  }

  // 获取患者治疗统计
  static async getTreatmentStatistics(patientId) {
    const query = `
      SELECT
        p.ID as PatientID,
        p.PatientNumber,
        p.TotalInfusionCount,
        c.Name as CustomerName,
        COUNT(DISTINCT CASE WHEN inf.Status = 'Completed' THEN inf.ID END) as CompletedInfusions,
        COUNT(DISTINCT CASE WHEN inf.Status = 'Scheduled' THEN inf.ID END) as ScheduledInfusions,
        MAX(inf.ScheduleDate) as LastInfusionDate,
        MIN(CASE WHEN inf.Status = 'Scheduled' THEN inf.ScheduleDate END) as NextInfusionDate,
        STRING_AGG(DISTINCT inf.TreatmentType, ', ') as TreatmentTypes
      FROM StemCellPatients p
      INNER JOIN Customers c ON p.CustomerID = c.ID
      LEFT JOIN InfusionSchedules inf ON p.ID = inf.PatientID
      WHERE p.ID = @patientId
      GROUP BY p.ID, p.PatientNumber, p.TotalInfusionCount, c.Name;
    `;

    const params = [{ name: 'patientId', value: patientId, type: sql.UniqueIdentifier }];
    const result = await executeQuery(query, params);
    return result[0];
  }

  // 获取患者完整档案信息
  static async getPatientFullInfo(id) {
    const query = `
      SELECT
        sp.*,
        c.IdentityCard,
        c.Name as CustomerName,
        c.Gender,
        c.Age,
        c.Height,
        c.Weight,
        c.BMI,
        c.Phone,
        c.ContactPerson,
        c.ContactPersonPhone,
        c.Address,
        c.Remarks as CustomerRemarks
      FROM StemCellPatients sp
      INNER JOIN Customers c ON sp.CustomerID = c.ID
      WHERE sp.ID = @id AND sp.Status = 'Active';
    `;

    const params = [{ name: 'id', value: id, type: sql.UniqueIdentifier }];
    const result = await executeQuery(query, params);
    return result[0];
  }

  // 根据病种查找患者
  static async findByDiseaseType(diseaseType, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const query = `
      SELECT
        sp.*,
        c.Name as CustomerName,
        c.Gender,
        c.Age,
        c.Phone
      FROM StemCellPatients sp
      INNER JOIN Customers c ON sp.CustomerID = c.ID
      WHERE sp.Status = 'Active'
        AND (JSON_VALUE(sp.DiseaseTypes, '$') LIKE @diseaseType
             OR sp.DiseaseKeywords LIKE @diseaseType
             OR sp.PrimaryDiagnosis LIKE @diseaseType)
      ORDER BY sp.RegistrationDate DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;

      SELECT COUNT(*) as Total
      FROM StemCellPatients sp
      WHERE sp.Status = 'Active'
        AND (JSON_VALUE(sp.DiseaseTypes, '$') LIKE @diseaseType
             OR sp.DiseaseKeywords LIKE @diseaseType
             OR sp.PrimaryDiagnosis LIKE @diseaseType);
    `;

    const params = [
      { name: 'diseaseType', value: `%${diseaseType}%`, type: sql.NVarChar },
      { name: 'offset', value: offset, type: sql.Int },
      { name: 'limit', value: limit, type: sql.Int }
    ];

    const result = await executeQuery(query, params);
    const patients = result.slice(0, -1);
    const total = result[result.length - 1].Total;

    return {
      patients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // 删除干细胞患者档案
  static async delete(id) {
    const { getPool, sql } = require('../../config/database');

    try {
      const pool = await getPool();

      // 首先删除相关的输注排期记录
      const deleteSchedulesResult = await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .query(`
          DELETE FROM InfusionSchedules
          WHERE PatientID = @id
        `);

      // 然后删除患者档案
      const deletePatientResult = await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .query(`
          DELETE FROM StemCellPatients
          WHERE ID = @id
        `);

      return deletePatientResult.rowsAffected[0] > 0;
    } catch (error) {
      console.error('删除患者档案失败:', error);
      throw error;
    }
  }

  // 根据患者ID查找患者
  static async findByPatientId(id) {
    const query = `
      SELECT * FROM StemCellPatients
      WHERE ID = @id
    `;

    const params = [
      { name: 'id', value: id, type: sql.UniqueIdentifier }
    ];

    const result = await executeQuery(query, params);
    return result[0] || null;
  }
}

module.exports = StemCellPatient;
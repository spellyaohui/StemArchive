const { executeQuery, executeProcedure, sql } = require('../../config/database');

class Customer {
  // 创建客户
  static async create(customerData) {
    const {
      identityCard,
      name,
      gender,
      age,
      height,
      weight,
      phone,
      contactPerson,
      contactPersonPhone,
      address,
      remarks,
      createdBy
    } = customerData;

    const query = `
      INSERT INTO Customers (
        IdentityCard, Name, Gender, Age, Height, Weight, BMI,
        Phone, ContactPerson, ContactPersonPhone, Address, Remarks, CreatedBy
      )
      VALUES (
        @identityCard, @name, @gender, @age, @height, @weight,
        CASE WHEN @height > 0 AND @weight > 0 THEN @weight / POWER(@height/100, 2) ELSE NULL END,
        @phone, @contactPerson, @contactPersonPhone, @address, @remarks, @createdBy
      );

      SELECT SCOPE_IDENTITY() as ID, * FROM Customers WHERE IdentityCard = @identityCard;
    `;

    const params = [
      { name: 'identityCard', value: identityCard, type: sql.NVarChar },
      { name: 'name', value: name, type: sql.NVarChar },
      { name: 'gender', value: gender, type: sql.NVarChar },
      { name: 'age', value: age, type: sql.Int },
      { name: 'height', value: height, type: sql.Decimal },
      { name: 'weight', value: weight, type: sql.Decimal },
      { name: 'phone', value: phone, type: sql.NVarChar },
      { name: 'contactPerson', value: contactPerson, type: sql.NVarChar },
      { name: 'contactPersonPhone', value: contactPersonPhone, type: sql.NVarChar },
      { name: 'address', value: address, type: sql.NVarChar },
      { name: 'remarks', value: remarks, type: sql.NVarChar },
      { name: 'createdBy', value: createdBy, type: sql.NVarChar }
    ];

    try {
      const result = await executeQuery(query, params);
      return result[0];
    } catch (error) {
      if (error.number === 2627) { // 唯一约束违反
        throw new Error('身份证号已存在');
      }
      throw error;
    }
  }

  // 根据ID获取客户
  static async findById(id) {
    const query = 'SELECT * FROM Customers WHERE ID = @id';
    const params = [{ name: 'id', value: id, type: sql.UniqueIdentifier }];
    const result = await executeQuery(query, params);
    return result[0];
  }

  // 根据身份证号获取客户
  static async findByIdentityCard(identityCard) {
    const query = 'SELECT * FROM Customers WHERE IdentityCard = @identityCard';
    const params = [{ name: 'identityCard', value: identityCard, type: sql.NVarChar }];
    const result = await executeQuery(query, params);
    return result[0];
  }

  // 获取所有客户
  static async findAll(page = 1, limit = 20, search = '') {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE Status = @status';
    let params = [{ name: 'status', value: 'Active', type: sql.NVarChar }];

    if (search) {
      whereClause += ' AND (Name LIKE @searchName OR IdentityCard LIKE @searchIdentity OR Phone LIKE @searchPhone)';
      params.push(
        { name: 'searchName', value: `%${search}%`, type: sql.NVarChar },
        { name: 'searchIdentity', value: `%${search}%`, type: sql.NVarChar },
        { name: 'searchPhone', value: `%${search}%`, type: sql.NVarChar }
      );
      console.log('搜索参数:', { search, params });
    }

    const dataQuery = `
      SELECT * FROM Customers
      ${whereClause}
      ORDER BY CreatedAt DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
    `;

    const countQuery = `SELECT COUNT(*) as Total FROM Customers ${whereClause}`;

    const dataParams = [
      ...params,
      { name: 'offset', value: offset, type: sql.Int },
      { name: 'limit', value: limit, type: sql.Int }
    ];

    console.log('数据查询:', dataQuery);
    console.log('计数查询:', countQuery);
    console.log('所有参数:', dataParams);

    // 分别执行两个查询
    const customers = await executeQuery(dataQuery, dataParams);
    const countResult = await executeQuery(countQuery, params);

    console.log('客户数据长度:', customers.length);
    console.log('计数结果:', countResult);

    // 获取总数
    const total = countResult.length > 0 ? countResult[0].Total : 0;

    console.log('查询结果统计:', {
      customersCount: customers.length,
      totalRecords: total,
      page,
      limit
    });

    return {
      customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // 更新客户信息
  static async update(id, updateData) {
    const {
      name,
      gender,
      age,
      height,
      weight,
      phone,
      contactPerson,
      contactPersonPhone,
      address,
      remarks
    } = updateData;

    const query = `
      UPDATE Customers SET
        Name = @name,
        Gender = @gender,
        Age = @age,
        Height = @height,
        Weight = @weight,
        BMI = CASE WHEN @height > 0 AND @weight > 0 THEN @weight / POWER(@height/100, 2) ELSE NULL END,
        Phone = @phone,
        ContactPerson = @contactPerson,
        ContactPersonPhone = @contactPersonPhone,
        Address = @address,
        Remarks = @remarks,
        UpdatedAt = GETDATE()
      WHERE ID = @id;

      SELECT * FROM Customers WHERE ID = @id;
    `;

    const params = [
      { name: 'id', value: id, type: sql.UniqueIdentifier },
      { name: 'name', value: name, type: sql.NVarChar },
      { name: 'gender', value: gender, type: sql.NVarChar },
      { name: 'age', value: age, type: sql.Int },
      { name: 'height', value: height, type: sql.Decimal },
      { name: 'weight', value: weight, type: sql.Decimal },
      { name: 'phone', value: phone, type: sql.NVarChar },
      { name: 'contactPerson', value: contactPerson, type: sql.NVarChar },
      { name: 'contactPersonPhone', value: contactPersonPhone, type: sql.NVarChar },
      { name: 'address', value: address, type: sql.NVarChar },
      { name: 'remarks', value: remarks, type: sql.NVarChar }
    ];

    const result = await executeQuery(query, params);
    return result[0];
  }

  // 删除客户（级联删除所有相关数据）
  static async delete(id) {
    try {
      console.log('开始删除客户:', id);

      // 首先检查客户是否存在
      const customer = await this.findById(id);
      if (!customer) {
        console.log('客户不存在:', id);
        return false;
      }

      console.log('找到客户:', customer.Name);

      // 1. 先删除相关的子表记录（按依赖关系顺序删除）
      try {
        // 删除AI健康评估报告
        await executeQuery(`DELETE FROM HealthAssessmentReports WHERE CustomerID = @customerId`,
          [{ name: 'customerId', value: id, type: sql.UniqueIdentifier }]);
        console.log('✓ 删除AI健康评估报告完成');
      } catch (error) {
        console.log('⚠ 删除AI健康评估报告失败（可能表不存在）:', error.message);
      }

      try {
        // 删除AI对比分析报告
        await executeQuery(`DELETE FROM ComparisonReports WHERE CustomerID = @customerId`,
          [{ name: 'customerId', value: id, type: sql.UniqueIdentifier }]);
        console.log('✓ 删除AI对比分析报告完成');
      } catch (error) {
        console.log('⚠ 删除AI对比分析报告失败（可能表不存在）:', error.message);
      }

      try {
        // 删除输注计划（通过干细胞患者表关联）
        await executeQuery(`
          DELETE [IS]
          FROM InfusionSchedules [IS]
          INNER JOIN StemCellPatients SP ON [IS].PatientID = SP.ID
          WHERE SP.CustomerID = @customerId
        `, [{ name: 'customerId', value: id, type: sql.UniqueIdentifier }]);
        console.log('✓ 删除输注计划完成');
      } catch (error) {
        console.log('⚠ 删除输注计划失败（可能表不存在）:', error.message);
      }

      try {
        // 删除治疗效果记录
        await executeQuery(`DELETE FROM TreatmentEffectiveness WHERE CustomerID = @customerId`,
          [{ name: 'customerId', value: id, type: sql.UniqueIdentifier }]);
        console.log('✓ 删除治疗效果记录完成');
      } catch (error) {
        console.log('⚠ 删除治疗效果记录失败（可能表不存在）:', error.message);
      }

      try {
        // 删除治疗历史记录
        await executeQuery(`DELETE FROM TreatmentHistory WHERE CustomerID = @customerId`,
          [{ name: 'customerId', value: id, type: sql.UniqueIdentifier }]);
        console.log('✓ 删除治疗历史记录完成');
      } catch (error) {
        console.log('⚠ 删除治疗历史记录失败（可能表不存在）:', error.message);
      }

      try {
        // 删除通知记录
        await executeQuery(`DELETE FROM Notifications WHERE CustomerID = @customerId`,
          [{ name: 'customerId', value: id, type: sql.UniqueIdentifier }]);
        console.log('✓ 删除通知记录完成');
      } catch (error) {
        console.log('⚠ 删除通知记录失败（可能表不存在）:', error.message);
      }

      try {
        // 删除干细胞患者记录
        await executeQuery(`DELETE FROM StemCellPatients WHERE CustomerID = @customerId`,
          [{ name: 'customerId', value: id, type: sql.UniqueIdentifier }]);
        console.log('✓ 删除干细胞患者记录完成');
      } catch (error) {
        console.log('⚠ 删除干细胞患者记录失败（可能表不存在）:', error.message);
      }

      try {
        // 删除健康评估记录
        await executeQuery(`DELETE FROM HealthAssessments WHERE CustomerID = @customerId`,
          [{ name: 'customerId', value: id, type: sql.UniqueIdentifier }]);
        console.log('✓ 删除健康评估记录完成');
      } catch (error) {
        console.log('⚠ 删除健康评估记录失败（可能表不存在）:', error.message);
      }

      try {
        // 删除通用健康数据
        await executeQuery(`DELETE FROM GeneralHealthData WHERE CustomerID = @customerId`,
          [{ name: 'customerId', value: id, type: sql.UniqueIdentifier }]);
        console.log('✓ 删除通用健康数据完成');
      } catch (error) {
        console.log('⚠ 删除通用健康数据失败（可能表不存在）:', error.message);
      }

      try {
        // 删除实验室检验数据
        await executeQuery(`DELETE FROM LaboratoryData WHERE CustomerID = @customerId`,
          [{ name: 'customerId', value: id, type: sql.UniqueIdentifier }]);
        console.log('✓ 删除实验室检验数据完成');
      } catch (error) {
        console.log('⚠ 删除实验室检验数据失败（可能表不存在）:', error.message);
      }

      try {
        // 删除实验室健康数据
        await executeQuery(`DELETE FROM LabHealthData WHERE CustomerID = @customerId`,
          [{ name: 'customerId', value: id, type: sql.UniqueIdentifier }]);
        console.log('✓ 删除实验室健康数据完成');
      } catch (error) {
        console.log('⚠ 删除实验室健康数据失败（可能表不存在）:', error.message);
      }

      try {
        // 删除影像健康数据
        await executeQuery(`DELETE FROM ImagingHealthData WHERE CustomerID = @customerId`,
          [{ name: 'customerId', value: id, type: sql.UniqueIdentifier }]);
        console.log('✓ 删除影像健康数据完成');
      } catch (error) {
        console.log('⚠ 删除影像健康数据失败（可能表不存在）:', error.message);
      }

      try {
        // 删除报告记录
        await executeQuery(`DELETE FROM Reports WHERE CustomerID = @customerId`,
          [{ name: 'customerId', value: id, type: sql.UniqueIdentifier }]);
        console.log('✓ 删除报告记录完成');
      } catch (error) {
        console.log('⚠ 删除报告记录失败（可能表不存在）:', error.message);
      }

      try {
        // 删除医学影像记录
        await executeQuery(`DELETE FROM MedicalImages WHERE CustomerID = @customerId`,
          [{ name: 'customerId', value: id, type: sql.UniqueIdentifier }]);
        console.log('✓ 删除医学影像记录完成');
      } catch (error) {
        console.log('⚠ 删除医学影像记录失败（可能表不存在）:', error.message);
      }

      try {
        // 删除放射记录
        await executeQuery(`DELETE FROM RadiologyRecords WHERE CustomerID = @customerId`,
          [{ name: 'customerId', value: id, type: sql.UniqueIdentifier }]);
        console.log('✓ 删除放射记录完成');
      } catch (error) {
        console.log('⚠ 删除放射记录失败（可能表不存在）:', error.message);
      }

      // 2. 最后删除客户记录
      const result = await executeQuery(`DELETE FROM Customers WHERE ID = @customerId; SELECT @@ROWCOUNT as AffectedRows`,
        [{ name: 'customerId', value: id, type: sql.UniqueIdentifier }]);

      // 对于非SELECT查询，executeQuery返回完整result对象
      const affectedRows = result.recordset && result.recordset[0] ? result.recordset[0].AffectedRows : 0;
      console.log('✓ 删除客户记录完成，影响行数:', affectedRows);

      return affectedRows > 0;
    } catch (error) {
      console.error('删除客户时发生错误:', error);
      throw error;
    }
  }

  // 获取客户完整信息（包含干细胞治疗记录）
  static async getCustomerFullInfo(id) {
    const query = `
      SELECT
        c.*,
        sp.ID as StemCellPatientID,
        sp.PatientNumber,
        sp.RegistrationDate,
        sp.DiseaseTypes,
        sp.DiseaseKeywords,
        sp.PrimaryDiagnosis,
        sp.TreatmentPlan,
        sp.TreatmentCycleYears,
        sp.InitialFrequencyMonths,
        sp.InitialCount,
        sp.FollowUpFrequencyMonths,
        sp.TotalInfusionCount,
        sp.Remarks as StemCellRemarks,
        sp.Status as StemCellStatus
      FROM Customers c
      LEFT JOIN StemCellPatients sp ON c.ID = sp.CustomerID
      WHERE c.ID = @id AND c.Status = 'Active';
    `;

    const params = [{ name: 'id', value: id, type: sql.UniqueIdentifier }];
    const result = await executeQuery(query, params);
    return result[0];
  }

  // 获取客户回输历史
  static async getInfusionHistory(id) {
    const query = `
      SELECT
        inf.*,
        sp.PatientNumber,
        c.Name as CustomerName
      FROM InfusionSchedules inf
      INNER JOIN StemCellPatients sp ON inf.PatientID = sp.ID
      INNER JOIN Customers c ON sp.CustomerID = c.ID
      WHERE c.ID = @id AND inf.Status IN ('Completed', 'Scheduled')
      ORDER BY inf.ScheduleDate DESC;
    `;

    const params = [{ name: 'id', value: id, type: sql.UniqueIdentifier }];
    return await executeQuery(query, params);
  }

  // 获取客户健康评估记录
  static async getHealthAssessments(id) {
    const query = `
      SELECT * FROM HealthAssessments
      WHERE CustomerID = @id
      ORDER BY AssessmentDate DESC;
    `;

    const params = [{ name: 'id', value: id, type: sql.UniqueIdentifier }];
    return await executeQuery(query, params);
  }

  // 获取客户医学影像记录
  static async getMedicalImages(id) {
    const query = `
      SELECT * FROM MedicalImages
      WHERE CustomerID = @id
      ORDER BY ImageDate DESC;
    `;

    const params = [{ name: 'id', value: id, type: sql.UniqueIdentifier }];
    return await executeQuery(query, params);
  }

  // 获取今日新增体检检客
  static async getTodayHealthChecks() {
    const query = `EXEC sp_GetTodayNewHealthCheckCustomers`;
    const result = await executeQuery(query);
    // 对于存储过程，需要返回recordset
    return result.recordset || [];
  }
}

module.exports = Customer;
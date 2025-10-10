const { executeQuery, executeProcedure, sql } = require('../../config/database');

class HealthAssessment {
    // 创建健康评估
    static async create(assessmentData) {
        const {
            customerId,
            assessmentDate,
            department,
            doctor,
            assessmentData: data,
            summary,
            createdBy
        } = assessmentData;

        const query = `
            INSERT INTO HealthAssessments (
                CustomerID, AssessmentDate, Department, Doctor,
                AssessmentData, Summary, Status, CreatedBy
            )
            VALUES (
                @customerId, @assessmentDate, @department, @doctor,
                @data, @summary, 'Completed', @createdBy
            );

            SELECT SCOPE_IDENTITY() as ID, * FROM HealthAssessments WHERE ID = SCOPE_IDENTITY();
        `;

        const params = [
            { name: 'customerId', value: customerId, type: sql.UniqueIdentifier },
            { name: 'assessmentDate', value: assessmentDate, type: sql.Date },
            { name: 'department', value: department, type: sql.NVarChar },
            { name: 'doctor', value: doctor, type: sql.NVarChar },
            { name: 'data', value: JSON.stringify(data), type: sql.NVarChar },
            { name: 'summary', value: summary, type: sql.NVarChar },
            { name: 'createdBy', value: createdBy, type: sql.NVarChar }
        ];

        const result = await executeQuery(query, params);
        return result[0];
    }

    // 根据客户ID获取健康评估
    static async getByCustomerId(customerId, page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const query = `
            SELECT * FROM HealthAssessments
            WHERE CustomerID = @customerId
            ORDER BY AssessmentDate DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;

            SELECT COUNT(*) as Total FROM HealthAssessments WHERE CustomerID = @customerId;
        `;

        const params = [
            { name: 'customerId', value: customerId, type: sql.UniqueIdentifier },
            { name: 'offset', value: offset, type: sql.Int },
            { name: 'limit', value: limit, type: sql.Int }
        ];

        const result = await executeQuery(query, params);
        const assessments = result.slice(0, -1);
        const total = result[result.length - 1].Total;

        return {
            assessments,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    // 根据科室获取健康评估
    static async getByDepartment(department, page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const query = `
            SELECT
                ha.*,
                c.Name as CustomerName,
                c.IdentityCard
            FROM HealthAssessments ha
            INNER JOIN Customers c ON ha.CustomerID = c.ID
            WHERE ha.Department = @department
            ORDER BY ha.AssessmentDate DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;

            SELECT COUNT(*) as Total FROM HealthAssessments WHERE Department = @department;
        `;

        const params = [
            { name: 'department', value: department, type: sql.NVarChar },
            { name: 'offset', value: offset, type: sql.Int },
            { name: 'limit', value: limit, type: sql.Int }
        ];

        const result = await executeQuery(query, params);
        const assessments = result.slice(0, -1);
        const total = result[result.length - 1].Total;

        return {
            assessments,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    // 更新健康评估
    static async update(id, updateData) {
        const {
            assessmentDate,
            department,
            doctor,
            assessmentData: data,
            summary
        } = updateData;

        const query = `
            UPDATE HealthAssessments SET
                AssessmentDate = @assessmentDate,
                Department = @department,
                Doctor = @doctor,
                AssessmentData = @data,
                Summary = @summary,
                UpdatedAt = GETDATE()
            WHERE ID = @id;

            SELECT * FROM HealthAssessments WHERE ID = @id;
        `;

        const params = [
            { name: 'id', value: id, type: sql.UniqueIdentifier },
            { name: 'assessmentDate', value: assessmentDate, type: sql.Date },
            { name: 'department', value: department, type: sql.NVarChar },
            { name: 'doctor', value: doctor, type: sql.NVarChar },
            { name: 'data', value: JSON.stringify(data), type: sql.NVarChar },
            { name: 'summary', value: summary, type: sql.NVarChar }
        ];

        const result = await executeQuery(query, params);
        return result[0];
    }

    // 删除健康评估
    static async delete(id) {
        const query = `
            DELETE FROM HealthAssessments WHERE ID = @id;
            SELECT @@ROWCOUNT as AffectedRows;
        `;

        const params = [{ name: 'id', value: id, type: sql.UniqueIdentifier }];
        const result = await executeQuery(query, params);
        return result[0].AffectedRows > 0;
    }

    // 获取健康评估统计
    static async getStatistics(customerId = null, dateFrom = null, dateTo = null) {
        let whereClause = 'WHERE 1=1';
        let params = [];

        if (customerId) {
            whereClause += ' AND CustomerID = @customerId';
            params.push({ name: 'customerId', value: customerId, type: sql.UniqueIdentifier });
        }

        if (dateFrom) {
            whereClause += ' AND AssessmentDate >= @dateFrom';
            params.push({ name: 'dateFrom', value: dateFrom, type: sql.Date });
        }

        if (dateTo) {
            whereClause += ' AND AssessmentDate <= @dateTo';
            params.push({ name: 'dateTo', value: dateTo, type: sql.Date });
        }

        const query = `
            SELECT
                COUNT(*) as TotalAssessments,
                COUNT(DISTINCT CustomerID) as UniqueCustomers,
                COUNT(DISTINCT Department) as Departments,
                Department,
                COUNT(*) as CountByDepartment
            FROM HealthAssessments
            ${whereClause}
            GROUP BY Department
            ORDER BY CountByDepartment DESC;
        `;

        return await executeQuery(query, params);
    }
}

module.exports = HealthAssessment;
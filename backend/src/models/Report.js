const { executeQuery, executeProcedure, sql } = require('../../config/database');

class Report {
    // 创建报告
    static async create(reportData) {
        const {
            customerId,
            reportName,
            reportType,
            reportDate,
            dataRange,
            reportContent,
            summary,
            aiAnalysis,
            createdBy
        } = reportData;

        const query = `
            INSERT INTO Reports (
                CustomerID, ReportName, ReportType, ReportDate,
                DataRange, ReportContent, Summary, AIAnalysis, CreatedBy
            )
            VALUES (
                @customerId, @reportName, @reportType, @reportDate,
                @dataRange, @reportContent, @summary, @aiAnalysis, @createdBy
            );

            SELECT SCOPE_IDENTITY() as ID, * FROM Reports WHERE ID = SCOPE_IDENTITY();
        `;

        const params = [
            { name: 'customerId', value: customerId, type: sql.UniqueIdentifier },
            { name: 'reportName', value: reportName, type: sql.NVarChar },
            { name: 'reportType', value: reportType, type: sql.NVarChar },
            { name: 'reportDate', value: reportDate, type: sql.Date },
            { name: 'dataRange', value: dataRange, type: sql.NVarChar },
            { name: 'reportContent', value: reportContent, type: sql.NVarChar },
            { name: 'summary', value: summary, type: sql.NVarChar },
            { name: 'aiAnalysis', value: aiAnalysis, type: sql.NVarChar },
            { name: 'createdBy', value: createdBy, type: sql.NVarChar }
        ];

        const result = await executeQuery(query, params);
        return result[0];
    }

    // 获取所有报告
    static async getAll(page = 1, limit = 20, search = '', type = null) {
        const offset = (page - 1) * limit;
        let whereClause = '';
        let params = [];

        // 构建WHERE条件
        if (search || type) {
            whereClause = 'WHERE';
            const conditions = [];

            if (search) {
                conditions.push('(r.ReportName LIKE @searchName OR c.Name LIKE @searchCustomer)');
                params.push(
                    { name: 'searchName', value: `%${search}%`, type: sql.NVarChar },
                    { name: 'searchCustomer', value: `%${search}%`, type: sql.NVarChar }
                );
            }

            if (type) {
                conditions.push('r.ReportType = @type');
                params.push({ name: 'type', value: type, type: sql.NVarChar });
            }

            whereClause += ' ' + conditions.join(' AND ');
        }

        const query = `
            SELECT
                r.*,
                c.Name as CustomerName,
                c.IdentityCard,
                CASE
                    WHEN r.FilePath IS NOT NULL THEN
                        CAST((SELECT LEN(r.ReportContent) / 1024.0 AS DECIMAL(10,2)) AS NVARCHAR(50)) + ' KB'
                    ELSE 'N/A'
                END as FileSize
            FROM Reports r
            INNER JOIN Customers c ON r.CustomerID = c.ID
            ${whereClause}
            ORDER BY r.ReportDate DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;

            SELECT COUNT(*) as Total
            FROM Reports r
            INNER JOIN Customers c ON r.CustomerID = c.ID
            ${whereClause};
        `;

        params.push(
            { name: 'offset', value: offset, type: sql.Int },
            { name: 'limit', value: limit, type: sql.Int }
        );

        const result = await executeQuery(query, params);

        // 分离报告数据和总数统计
        let reports = [];
        let total = 0;

        if (result.length >= 2) {
            // 有两个结果集：报告数据和总数统计
            const totalRecord = result[result.length - 1];
            reports = result.slice(0, -1);
            total = totalRecord ? totalRecord.Total : 0;
        } else if (result.length === 1) {
            // 只有一个结果集：报告数据
            reports = result;
            total = reports.length;
        }

        return {
            reports,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    // 根据客户ID获取报告
    static async getByCustomerId(customerId, page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const query = `
            SELECT * FROM Reports
            WHERE CustomerID = @customerId
            ORDER BY ReportDate DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;

            SELECT COUNT(*) as Total FROM Reports WHERE CustomerID = @customerId;
        `;

        const params = [
            { name: 'customerId', value: customerId, type: sql.UniqueIdentifier },
            { name: 'offset', value: offset, type: sql.Int },
            { name: 'limit', value: limit, type: sql.Int }
        ];

        const result = await executeQuery(query, params);
        const reports = result.slice(0, -1);
        const total = result[result.length - 1].Total;

        return {
            reports,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    // 根据ID获取报告详情
    static async getById(id) {
        const query = `
            SELECT
                r.*,
                c.Name as CustomerName,
                c.IdentityCard,
                CASE
                    WHEN r.FilePath IS NOT NULL THEN
                        CAST((SELECT LEN(r.ReportContent) / 1024.0 AS DECIMAL(10,2)) AS NVARCHAR(50)) + ' KB'
                    ELSE 'N/A'
                END as FileSize
            FROM Reports r
            INNER JOIN Customers c ON r.CustomerID = c.ID
            WHERE r.ID = @id;
        `;

        const params = [{ name: 'id', value: id, type: sql.UniqueIdentifier }];
        const result = await executeQuery(query, params);
        return result[0];
    }

    // 更新报告
    static async update(id, updateData) {
        const {
            reportName,
            reportType,
            reportDate,
            dataRange,
            reportContent,
            summary,
            aiAnalysis
        } = updateData;

        const query = `
            UPDATE Reports SET
                ReportName = @reportName,
                ReportType = @reportType,
                ReportDate = @reportDate,
                DataRange = @dataRange,
                ReportContent = @reportContent,
                Summary = @summary,
                AIAnalysis = @aiAnalysis,
                UpdatedAt = GETDATE()
            WHERE ID = @id;

            SELECT * FROM Reports WHERE ID = @id;
        `;

        const params = [
            { name: 'id', value: id, type: sql.UniqueIdentifier },
            { name: 'reportName', value: reportName, type: sql.NVarChar },
            { name: 'reportType', value: reportType, type: sql.NVarChar },
            { name: 'reportDate', value: reportDate, type: sql.Date },
            { name: 'dataRange', value: dataRange, type: sql.NVarChar },
            { name: 'reportContent', value: reportContent, type: sql.NVarChar },
            { name: 'summary', value: summary, type: sql.NVarChar },
            { name: 'aiAnalysis', value: aiAnalysis, type: sql.NVarChar }
        ];

        const result = await executeQuery(query, params);
        return result[0];
    }

    // 删除报告
    static async delete(id) {
        const query = `
            DELETE FROM Reports WHERE ID = @id;
            SELECT @@ROWCOUNT as AffectedRows;
        `;

        const params = [{ name: 'id', value: id, type: sql.UniqueIdentifier }];
        const result = await executeQuery(query, params);
        return result[0].AffectedRows > 0;
    }
}

module.exports = Report;
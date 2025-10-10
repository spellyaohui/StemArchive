const { executeQuery, sql } = require('../../config/database');

class HealthAssessmentReport {
    // 检查是否已存在健康评估报告
    static async getByMedicalExamId(medicalExamId) {
        const query = `
            SELECT * FROM HealthAssessmentReports
            WHERE MedicalExamID = @medicalExamId
        `;

        const params = [
            { name: 'medicalExamId', value: medicalExamId, type: sql.NVarChar }
        ];

        const result = await executeQuery(query, params);
        return result[0] || null;
    }

    // 创建健康评估报告记录
    static async create(reportData) {
        const {
            customerId,
            medicalExamId,
            reportName,
            assessmentDate,
            originalData,
            apiRequest,
            apiResponse,
            aiAnalysis,
            markdownContent,
            apiModel,
            apiTokenCount,
            processingTime,
            generationStatus,
            createdBy
        } = reportData;

        const query = `
            INSERT INTO HealthAssessmentReports (
                CustomerID, MedicalExamID, ReportName, AssessmentDate,
                OriginalData, APIRequest, APIResponse, AIAnalysis,
                MarkdownContent, APIModel, APITokenCount, ProcessingTime,
                GenerationStatus, CreatedBy
            )
            OUTPUT INSERTED.*
            VALUES (
                @customerId, @medicalExamId, @reportName, @assessmentDate,
                @originalData, @apiRequest, @apiResponse, @aiAnalysis,
                @markdownContent, @apiModel, @apiTokenCount, @processingTime,
                @generationStatus, @createdBy
            );
        `;

        const params = [
            { name: 'customerId', value: customerId, type: sql.UniqueIdentifier },
            { name: 'medicalExamId', value: medicalExamId, type: sql.NVarChar },
            { name: 'reportName', value: reportName, type: sql.NVarChar },
            { name: 'assessmentDate', value: assessmentDate, type: sql.Date },
            { name: 'originalData', value: originalData, type: sql.NVarChar },
            { name: 'apiRequest', value: apiRequest, type: sql.NVarChar },
            { name: 'apiResponse', value: apiResponse, type: sql.NVarChar },
            { name: 'aiAnalysis', value: aiAnalysis, type: sql.NVarChar },
            { name: 'markdownContent', value: markdownContent, type: sql.NVarChar },
            { name: 'apiModel', value: apiModel, type: sql.NVarChar },
            { name: 'apiTokenCount', value: apiTokenCount, type: sql.Int },
            { name: 'processingTime', value: processingTime, type: sql.Int },
            { name: 'generationStatus', value: generationStatus, type: sql.NVarChar },
            { name: 'createdBy', value: createdBy, type: sql.NVarChar }
        ];

        const result = await executeQuery(query, params);
        console.log('HealthAssectionReport.create - 查询结果:', result);

        // 处理不同的返回格式
        let createdReport;
        if (result.recordset && result.recordset.length > 0) {
            createdReport = result.recordset[0];
        } else if (result.length > 0) {
            createdReport = result[0];
        } else {
            throw new Error('创建健康评估报告失败：数据库未返回结果');
        }

        console.log('HealthAssessmentReport.create - 创建的报告:', createdReport);
        return createdReport;
    }

    // 更新健康评估报告
    static async update(id, updateData) {
        const {
            apiRequest,
            apiResponse,
            aiAnalysis,
            markdownContent,
            apiModel,
            apiTokenCount,
            processingTime,
            generationStatus
        } = updateData;

        const query = `
            UPDATE HealthAssessmentReports SET
                APIRequest = @apiRequest,
                APIResponse = @apiResponse,
                AIAnalysis = @aiAnalysis,
                MarkdownContent = @markdownContent,
                APIModel = @apiModel,
                APITokenCount = @apiTokenCount,
                ProcessingTime = @processingTime,
                GenerationStatus = @generationStatus,
                UpdatedAt = GETDATE()
            WHERE ID = @id;

            SELECT * FROM HealthAssessmentReports WHERE ID = @id;
        `;

        const params = [
            { name: 'id', value: id, type: sql.UniqueIdentifier },
            { name: 'apiRequest', value: apiRequest, type: sql.NVarChar },
            { name: 'apiResponse', value: apiResponse, type: sql.NVarChar },
            { name: 'aiAnalysis', value: aiAnalysis, type: sql.NVarChar },
            { name: 'markdownContent', value: markdownContent, type: sql.NVarChar },
            { name: 'apiModel', value: apiModel, type: sql.NVarChar },
            { name: 'apiTokenCount', value: apiTokenCount, type: sql.Int },
            { name: 'processingTime', value: processingTime, type: sql.Int },
            { name: 'generationStatus', value: generationStatus, type: sql.NVarChar }
        ];

        const result = await executeQuery(query, params);
        return result[0];
    }

    // 根据客户ID获取健康评估报告列表
    static async getByCustomerId(customerId, page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const query = `
            SELECT
                har.*,
                c.Name as CustomerName,
                c.IdentityCard
            FROM HealthAssessmentReports har
            INNER JOIN Customers c ON har.CustomerID = c.ID
            WHERE har.CustomerID = @customerId
            ORDER BY har.AssessmentDate DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;

            SELECT COUNT(*) as Total
            FROM HealthAssessmentReports
            WHERE CustomerID = @customerId;
        `;

        const params = [
            { name: 'customerId', value: customerId, type: sql.UniqueIdentifier },
            { name: 'offset', value: offset, type: sql.Int },
            { name: 'limit', value: limit, type: sql.Int }
        ];

        const result = await executeQuery(query, params);

        // 分离数据和总数
        let reports = [];
        let total = 0;

        if (result.length >= 2) {
            reports = result.slice(0, -1);
            total = result[result.length - 1].Total || 0;
        } else if (result.length === 1) {
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

    // 根据ID获取健康评估报告详情
    static async getById(id) {
        const query = `
            SELECT
                har.*,
                c.Name as CustomerName,
                c.IdentityCard
            FROM HealthAssessmentReports har
            INNER JOIN Customers c ON har.CustomerID = c.ID
            WHERE har.ID = @id;
        `;

        const params = [
            { name: 'id', value: id, type: sql.UniqueIdentifier }
        ];

        const result = await executeQuery(query, params);
        return result[0] || null;
    }

    // 删除健康评估报告
    static async delete(id) {
        const query = `
            DELETE FROM HealthAssessmentReports WHERE ID = @id;
            SELECT @@ROWCOUNT as AffectedRows;
        `;

        const params = [
            { name: 'id', value: id, type: sql.UniqueIdentifier }
        ];

        const result = await executeQuery(query, params);
        return result[0].AffectedRows > 0;
    }
}

module.exports = HealthAssessmentReport;
const { executeQuery, sql } = require('../../config/database');

class ComparisonReport {
    /**
     * 创建对比报告
     * @param {Object} reportData - 报告数据
     * @returns {Promise<Object>} 创建结果
     */
    static async create(reportData) {
        try {
            const query = `
                INSERT INTO ComparisonReports (
                    CustomerID, CustomerName, MedicalExamIDs, ComparisonData,
                    AIAnalysis, MarkdownContent, Status, ProcessingTime,
                    APIModel, APITokenCount, ErrorMessage
                ) OUTPUT INSERTED.*
                VALUES (
                    @CustomerID, @CustomerName, @MedicalExamIDs, @ComparisonData,
                    @AIAnalysis, @MarkdownContent, @Status, @ProcessingTime,
                    @APIModel, @APITokenCount, @ErrorMessage
                )
            `;

            const params = [
                { name: 'CustomerID', value: reportData.customerId, type: sql.UniqueIdentifier },
                { name: 'CustomerName', value: reportData.customerName, type: sql.NVarChar(100) },
                { name: 'MedicalExamIDs', value: reportData.medicalExamIds, type: sql.NVarChar(500) },
                { name: 'ComparisonData', value: JSON.stringify(reportData.comparisonData || null), type: sql.NVarChar(sql.MAX) },
                { name: 'AIAnalysis', value: reportData.aiAnalysis || null, type: sql.NVarChar(sql.MAX) },
                { name: 'MarkdownContent', value: reportData.markdownContent || null, type: sql.NVarChar(sql.MAX) },
                { name: 'Status', value: reportData.status || 'pending', type: sql.NVarChar(20) },
                { name: 'ProcessingTime', value: reportData.processingTime || 0, type: sql.Int },
                { name: 'APIModel', value: reportData.apiModel || null, type: sql.NVarChar(50) },
                { name: 'APITokenCount', value: reportData.apiTokenCount || 0, type: sql.Int },
                { name: 'ErrorMessage', value: reportData.errorMessage || null, type: sql.NVarChar(500) }
            ];

            const result = await executeQuery(query, params);

            // 处理不同的返回格式
            let createdReport;
            if (result.recordset && result.recordset.length > 0) {
                createdReport = result.recordset[0];
            } else if (result.length > 0) {
                createdReport = result[0];
            } else {
                throw new Error('创建对比报告失败：数据库未返回结果');
            }

            return createdReport;
        } catch (error) {
            console.error('创建对比报告失败:', error);
            throw error;
        }
    }

    /**
     * 更新对比报告
     * @param {string} id - 报告ID
     * @param {Object} updateData - 更新数据
     * @returns {Promise<Object>} 更新结果
     */
    static async update(id, updateData) {
        try {
            const setClauses = [];
            const params = [{ name: 'ID', value: id, type: sql.UniqueIdentifier }];

            if (updateData.aiAnalysis !== undefined) {
                setClauses.push('AIAnalysis = @AIAnalysis');
                params.push({ name: 'AIAnalysis', value: updateData.aiAnalysis, type: sql.NVarChar(sql.MAX) });
            }
            if (updateData.markdownContent !== undefined) {
                setClauses.push('MarkdownContent = @MarkdownContent');
                params.push({ name: 'MarkdownContent', value: updateData.markdownContent, type: sql.NVarChar(sql.MAX) });
            }
            if (updateData.pdfData !== undefined) {
                setClauses.push('PDFData = @PDFData');
                params.push({ name: 'PDFData', value: updateData.pdfData, type: sql.NVarChar(sql.MAX) });
            }
            if (updateData.status !== undefined) {
                setClauses.push('Status = @Status');
                params.push({ name: 'Status', value: updateData.status, type: sql.NVarChar(20) });
            }
            if (updateData.errorMessage !== undefined) {
                setClauses.push('ErrorMessage = @ErrorMessage');
                params.push({ name: 'ErrorMessage', value: updateData.errorMessage, type: sql.NVarChar(500) });
            }
            if (updateData.processingTime !== undefined) {
                setClauses.push('ProcessingTime = @ProcessingTime');
                params.push({ name: 'ProcessingTime', value: updateData.processingTime, type: sql.Int });
            }
            if (updateData.apiModel !== undefined) {
                setClauses.push('APIModel = @APIModel');
                params.push({ name: 'APIModel', value: updateData.apiModel, type: sql.NVarChar(50) });
            }
            if (updateData.apiTokenCount !== undefined) {
                setClauses.push('APITokenCount = @APITokenCount');
                params.push({ name: 'APITokenCount', value: updateData.apiTokenCount, type: sql.Int });
            }

            setClauses.push('UpdatedAt = GETDATE()');

            const query = `
                UPDATE ComparisonReports
                SET ${setClauses.join(', ')}
                OUTPUT INSERTED.*
                WHERE ID = @ID
            `;

            const result = await executeQuery(query, params);

            // 处理不同的返回格式
            let updatedReport;
            if (result.recordset && result.recordset.length > 0) {
                updatedReport = result.recordset[0];
            } else if (result.length > 0) {
                updatedReport = result[0];
            } else {
                throw new Error('更新对比报告失败：数据库未返回结果');
            }

            return updatedReport;
        } catch (error) {
            console.error('更新对比报告失败:', error);
            throw error;
        }
    }

    /**
     * 根据ID获取对比报告
     * @param {string} id - 报告ID
     * @returns {Promise<Object>} 报告数据
     */
    static async getById(id) {
        try {
            const query = `
                SELECT
                    ID, CustomerID, CustomerName, MedicalExamIDs, ComparisonData,
                    AIAnalysis, MarkdownContent, PDFData, Status, ErrorMessage,
                    ProcessingTime, APIModel, APITokenCount, CreatedAt, UpdatedAt
                FROM ComparisonReports
                WHERE ID = @ID
            `;

            const params = [
                { name: 'ID', value: id, type: sql.UniqueIdentifier }
            ];

            const result = await executeQuery(query, params);
            return result[0] || null;
        } catch (error) {
            console.error('获取对比报告失败:', error);
            throw error;
        }
    }

    /**
     * 获取客户的所有对比报告
     * @param {string} customerId - 客户ID
     * @returns {Promise<Array>} 报告列表
     */
    static async getByCustomerId(customerId) {
        try {
            const query = `
                SELECT
                    ID, CustomerID, CustomerName, MedicalExamIDs, Status,
                    ProcessingTime, CreatedAt, UpdatedAt
                FROM ComparisonReports
                WHERE CustomerID = @CustomerID
                ORDER BY CreatedAt DESC
            `;

            const params = [
                { name: 'CustomerID', value: customerId, type: sql.UniqueIdentifier }
            ];

            const result = await executeQuery(query, params);
            return result;
        } catch (error) {
            console.error('获取客户对比报告列表失败:', error);
            throw error;
        }
    }

    /**
     * 删除对比报告
     * @param {string} id - 报告ID
     * @returns {Promise<boolean>} 删除结果
     */
    static async delete(id) {
        try {
            const { getPool } = require('../../config/database');
            const pool = await getPool();
            const request = pool.request();

            request.input('ID', sql.UniqueIdentifier, id);
            const result = await request.query('DELETE FROM ComparisonReports WHERE ID = @ID');

            // 检查删除是否成功
            return result.rowsAffected && result.rowsAffected[0] > 0;
        } catch (error) {
            console.error('删除对比报告失败:', error);
            throw error;
        }
    }

    /**
     * 获取所有对比报告（分页）
     * @param {number} page - 页码
     * @param {number} pageSize - 每页数量
     * @returns {Promise<Object>} 分页结果
     */
    async getAll(page = 1, pageSize = 20) {
        try {
            const offset = (page - 1) * pageSize;

            const countQuery = 'SELECT COUNT(*) as total FROM ComparisonReports';
            const countRequest = new sql.Request();
            const countResult = await countRequest.query(countQuery);
            const total = countResult.recordset[0].total;

            const query = `
                SELECT
                    ID, CustomerID, CustomerName, MedicalExamIDs, Status,
                    ProcessingTime, CreatedAt, UpdatedAt
                FROM ComparisonReports
                ORDER BY CreatedAt DESC
                OFFSET @Offset ROWS
                FETCH NEXT @PageSize ROWS ONLY
            `;

            const request = new sql.Request();
            request.input('Offset', sql.Int, offset);
            request.input('PageSize', sql.Int, pageSize);
            const result = await request.query(query);

            return {
                data: result.recordset,
                total,
                page,
                pageSize,
                totalPages: Math.ceil(total / pageSize)
            };
        } catch (error) {
            console.error('获取对比报告列表失败:', error);
            throw error;
        }
    }

    /**
     * 根据状态获取报告
     * @param {string} status - 状态
     * @returns {Promise<Array>} 报告列表
     */
    async getByStatus(status) {
        try {
            const query = `
                SELECT
                    ID, CustomerID, CustomerName, MedicalExamIDs, Status,
                    ProcessingTime, CreatedAt, UpdatedAt
                FROM ComparisonReports
                WHERE Status = @Status
                ORDER BY CreatedAt DESC
            `;

            const request = new sql.Request();
            request.input('Status', sql.NVarChar(20), status);
            const result = await request.query(query);
            return result.recordset;
        } catch (error) {
            console.error('根据状态获取对比报告失败:', error);
            throw error;
        }
    }

    /**
     * 获取处理中的报告
     * @returns {Promise<Array>} 处理中的报告列表
     */
    async getProcessingReports() {
        return this.getByStatus('processing');
    }

    /**
     * 检查是否存在相同的体检ID组合的对比报告
     * @param {string} customerId - 客户ID
     * @param {Array} medicalExamIds - 体检ID数组
     * @returns {Promise<Object|null>} 已存在的报告或null
     */
    static async checkDuplicate(customerId, medicalExamIds) {
        try {
            // 将体检ID数组排序并连接成字符串，用于比较
            const sortedIds = [...medicalExamIds].sort();
            const idsString = sortedIds.join(',');

            const query = `
                SELECT TOP 1 ID, Status, CreatedAt
                FROM ComparisonReports
                WHERE CustomerID = @CustomerID
                AND MedicalExamIDs = @MedicalExamIDs
                AND CreatedAt > DATEADD(minute, -5, GETDATE())
                ORDER BY CreatedAt DESC
            `;

            const params = [
                { name: 'CustomerID', value: customerId, type: sql.UniqueIdentifier },
                { name: 'MedicalExamIDs', value: idsString, type: sql.NVarChar(500) }
            ];

            const result = await executeQuery(query, params);
            return result.length > 0 ? result[0] : null;
        } catch (error) {
            console.error('检查对比报告重复失败:', error);
            throw error;
        }
    }

    /**
     * 获取失败的报告
     * @returns {Promise<Array>} 失败的报告列表
     */
    async getFailedReports() {
        return this.getByStatus('failed');
    }
}

module.exports = ComparisonReport;
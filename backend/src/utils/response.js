/**
 * 统一API响应格式工具类
 * 提供标准化的成功和错误响应格式
 */

class ApiResponse {
    /**
     * 成功响应
     * @param {*} data - 响应数据
     * @param {string} message - 响应消息
     * @param {Object} meta - 元数据信息
     * @returns {Object} 标准化的成功响应
     */
    static success(data = null, message = '操作成功', meta = {}) {
        return {
            status: 'Success',
            message,
            data,
            meta: {
                timestamp: new Date().toISOString(),
                requestId: this.generateRequestId(),
                ...meta
            }
        };
    }

    /**
     * 错误响应
     * @param {string} message - 错误消息
     * @param {string} code - 错误代码
     * @param {*} details - 错误详情
     * @param {Object} meta - 元数据信息
     * @returns {Object} 标准化的错误响应
     */
    static error(message = '操作失败', code = 'INTERNAL_ERROR', details = null, meta = {}) {
        return {
            status: 'Error',
            message,
            code,
            details,
            meta: {
                timestamp: new Date().toISOString(),
                requestId: this.generateRequestId(),
                ...meta
            }
        };
    }

    /**
     * 验证错误响应
     * @param {Array} errors - 验证错误列表
     * @param {string} message - 错误消息
     * @returns {Object} 标准化的验证错误响应
     */
    static validation(errors, message = '输入验证失败') {
        return this.error(message, 'VALIDATION_ERROR', {
            validationErrors: errors.map(error => ({
                field: error.param || error.field,
                message: error.msg,
                value: error.value,
                location: error.location
            }))
        });
    }

    /**
     * 未授权响应
     * @param {string} message - 错误消息
     * @returns {Object} 标准化的未授权响应
     */
    static unauthorized(message = '未授权访问') {
        return this.error(message, 'UNAUTHORIZED');
    }

    /**
     * 禁止访问响应
     * @param {string} message - 错误消息
     * @returns {Object} 标准化的禁止访问响应
     */
    static forbidden(message = '禁止访问') {
        return this.error(message, 'FORBIDDEN');
    }

    /**
     * 资源未找到响应
     * @param {string} message - 错误消息
     * @returns {Object} 标准化的资源未找到响应
     */
    static notFound(message = '资源未找到') {
        return this.error(message, 'NOT_FOUND');
    }

    /**
     * 重复资源响应
     * @param {string} message - 错误消息
     * @param {*} details - 重复资源详情
     * @returns {Object} 标准化的重复资源响应
     */
    static conflict(message = '资源已存在', details = null) {
        return this.error(message, 'CONFLICT', details);
    }

    /**
     * 请求过于频繁响应
     * @param {string} message - 错误消息
     * @param {Object} retryInfo - 重试信息
     * @returns {Object} 标准化的请求过于频繁响应
     */
    static tooManyRequests(message = '请求过于频繁', retryInfo = null) {
        return this.error(message, 'TOO_MANY_REQUESTS', retryInfo);
    }

    /**
     * 分页响应
     * @param {Array} data - 数据列表
     * @param {Object} pagination - 分页信息
     * @param {string} message - 响应消息
     * @returns {Object} 标准化的分页响应
     */
    static paginated(data, pagination, message = '获取数据成功') {
        return this.success(data, message, {
            pagination: {
                page: pagination.page,
                limit: pagination.limit,
                total: pagination.total,
                totalPages: pagination.totalPages,
                hasNext: pagination.page < pagination.totalPages,
                hasPrev: pagination.page > 1
            }
        });
    }

    /**
     * 创建成功响应
     * @param {*} data - 创建的数据
     * @param {string} resourceName - 资源名称
     * @returns {Object} 标准化的创建成功响应
     */
    static created(data, resourceName = '资源') {
        return this.success(data, `${resourceName}创建成功`, {
            action: 'created'
        });
    }

    /**
     * 更新成功响应
     * @param {*} data - 更新的数据
     * @param {string} resourceName - 资源名称
     * @returns {Object} 标准化的更新成功响应
     */
    static updated(data, resourceName = '资源') {
        return this.success(data, `${resourceName}更新成功`, {
            action: 'updated'
        });
    }

    /**
     * 删除成功响应
     * @param {string} resourceName - 资源名称
     * @returns {Object} 标准化的删除成功响应
     */
    static deleted(resourceName = '资源') {
        return this.success(null, `${resourceName}删除成功`, {
            action: 'deleted'
        });
    }

    /**
     * 生成请求ID
     * @returns {string} 唯一的请求ID
     */
    static generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 包装异步处理响应
     * @param {Promise} promise - 异步操作Promise
     * @param {string} successMessage - 成功消息
     * @param {string} errorMessage - 错误消息
     * @returns {Promise} 包装后的Promise
     */
    static async wrapAsync(promise, successMessage = '操作成功', errorMessage = '操作失败') {
        try {
            const result = await promise;
            return this.success(result, successMessage);
        } catch (error) {
            console.error('Async operation failed:', error);
            return this.error(errorMessage, 'ASYNC_ERROR', {
                originalError: error.message
            });
        }
    }

    /**
     * 批量操作响应
     * @param {Array} results - 批量操作结果
     * @param {string} operation - 操作类型
     * @returns {Object} 标准化的批量操作响应
     */
    static batch(results, operation = '批量操作') {
        const total = results.length;
        const successful = results.filter(r => r.success).length;
        const failed = total - successful;

        return this.success({
            total,
            successful,
            failed,
            results
        }, `${operation}完成`, {
            batch: {
                total,
                successful,
                failed,
                successRate: Math.round((successful / total) * 100)
            }
        });
    }

    /**
     * 文件上传响应
     * @param {Object} fileInfo - 文件信息
     * @param {string} message - 响应消息
     * @returns {Object} 标准化的文件上传响应
     */
    static fileUploaded(fileInfo, message = '文件上传成功') {
        return this.success(fileInfo, message, {
            file: {
                name: fileInfo.originalName,
                size: fileInfo.size,
                type: fileInfo.mimetype,
                url: fileInfo.url
            }
        });
    }

    /**
     * 搜索结果响应
     * @param {Array} results - 搜索结果
     * @param {Object} searchInfo - 搜索信息
     * @param {string} message - 响应消息
     * @returns {Object} 标准化的搜索结果响应
     */
    static searchResults(results, searchInfo, message = '搜索完成') {
        return this.success(results, message, {
            search: {
                query: searchInfo.query,
                total: searchInfo.total,
                took: searchInfo.took,
                filters: searchInfo.filters || {}
            }
        });
    }
}

module.exports = { ApiResponse };
/**
 * 统一错误处理中间件
 * 处理所有API错误并返回标准化的错误响应
 */

const { ApiResponse } = require('../utils/response');
const { logger } = require('../utils/logger');

/**
 * 错误处理中间件
 * @param {Error} err - 错误对象
 * @param {Request} req - Express请求对象
 * @param {Response} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 */
const errorHandler = (err, req, res, next) => {
    // 记录错误日志
    logger.error('API Error:', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id,
        requestId: req.requestId
    });

    // 开发环境返回详细错误信息
    if (process.env.NODE_ENV === 'development') {
        return res.status(500).json(
            ApiResponse.error(err.message, 'INTERNAL_ERROR', {
                stack: err.stack,
                details: err.details || null
            })
        );
    }

    // 验证错误
    if (err.name === 'ValidationError' || err.type === 'entity.parse.failed') {
        return res.status(400).json(
            ApiResponse.validation(err.errors || err.details)
        );
    }

    // JWT相关错误
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json(
            ApiResponse.error('认证令牌无效', 'AUTH_INVALID_TOKEN')
        );
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json(
            ApiResponse.error('认证令牌已过期', 'AUTH_TOKEN_EXPIRED')
        );
    }

    if (err.name === 'NotBeforeError') {
        return res.status(401).json(
            ApiResponse.error('认证令牌尚未生效', 'AUTH_TOKEN_NOT_BEFORE')
        );
    }

    // 权限错误
    if (err.name === 'ForbiddenError') {
        return res.status(403).json(
            ApiResponse.forbidden(err.message || '权限不足')
        );
    }

    // 资源未找到错误
    if (err.name === 'NotFoundError' || err.code === 'NOT_FOUND') {
        return res.status(404).json(
            ApiResponse.notFound(err.message || '资源未找到')
        );
    }

    // 重复资源错误
    if (err.code === '23505' || err.name === 'UniqueConstraintError') {
        return res.status(409).json(
            ApiResponse.conflict('数据已存在', {
                field: err.field,
                value: err.value
            })
        );
    }

    // 外键约束错误
    if (err.code === '23503' || err.name === 'ForeignKeyConstraintError') {
        return res.status(400).json(
            ApiResponse.error('关联数据不存在', 'FOREIGN_KEY_CONSTRAINT', {
                table: err.table,
                constraint: err.constraint
            })
        );
    }

    // 数据类型错误
    if (err.code === '22003' || err.name === 'DataTypeError') {
        return res.status(400).json(
            ApiResponse.error('数据类型不正确', 'DATA_TYPE_ERROR', {
                field: err.field,
                expectedType: err.expectedType,
                receivedValue: err.value
            })
        );
    }

    // 数据长度超限错误
    if (err.code === '22001' || err.name === 'DataTooLongError') {
        return res.status(400).json(
            ApiResponse.error('数据长度超限', 'DATA_TOO_LONG', {
                field: err.field,
                maxLength: err.maxLength,
                actualLength: err.actualLength
            })
        );
    }

    // 空值约束错误
    if (err.code === '23502' || err.name === 'NotNullViolationError') {
        return res.status(400).json(
            ApiResponse.error('必填字段不能为空', 'NOT_NULL_VIOLATION', {
                field: err.field
            })
        );
    }

    // 检查约束错误
    if (err.code === '23514' || err.name === 'CheckConstraintError') {
        return res.status(400).json(
            ApiResponse.error('数据不符合约束条件', 'CHECK_CONSTRAINT_VIOLATION', {
                constraint: err.constraint,
                field: err.field,
                value: err.value
            })
        );
    }

    // 连接错误
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        return res.status(503).json(
            ApiResponse.error('服务暂时不可用', 'SERVICE_UNAVAILABLE')
        );
    }

    // 超时错误
    if (err.code === 'ETIMEDOUT' || err.name === 'TimeoutError') {
        return res.status(408).json(
            ApiResponse.error('请求超时', 'REQUEST_TIMEOUT')
        );
    }

    // 请求体过大错误
    if (err.code === 'LIMIT_FILE_SIZE' || err.type === 'entity.too.large') {
        return res.status(413).json(
            ApiResponse.error('请求体过大', 'PAYLOAD_TOO_LARGE', {
                maxSize: err.limit,
                receivedSize: err.length
            })
        );
    }

    // 请求速率限制错误
    if (err.name === 'RateLimitError') {
        return res.status(429).json(
            ApiResponse.tooManyRequests('请求过于频繁，请稍后重试', {
                retryAfter: err.retryAfter || 60,
                limit: err.limit,
                windowMs: err.windowMs
            })
        );
    }

    // 业务逻辑错误
    if (err.name === 'BusinessError') {
        return res.status(400).json(
            ApiResponse.error(err.message, err.code || 'BUSINESS_ERROR', err.details)
        );
    }

    // 自定义应用错误
    if (err.name === 'AppError') {
        const statusCode = err.statusCode || 500;
        return res.status(statusCode).json(
            ApiResponse.error(err.message, err.code || 'APP_ERROR', err.details)
        );
    }

    // 默认服务器错误
    res.status(500).json(
        ApiResponse.error('服务器内部错误', 'INTERNAL_ERROR')
    );
};

/**
 * 404错误处理中间件
 * @param {Request} req - Express请求对象
 * @param {Response} res - Express响应对象
 */
const notFoundHandler = (req, res) => {
    logger.warn('404 Not Found:', {
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });

    res.status(404).json(
        ApiResponse.notFound(`请求的资源 ${req.method} ${req.url} 不存在`)
    );
};

/**
 * 异步错误包装器
 * 用于包装异步路由处理器，自动捕获Promise rejection
 * @param {Function} fn - 异步函数
 * @returns {Function} 包装后的函数
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * 全局未捕获异常处理
 */
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', {
        error: err.message,
        stack: err.stack
    });

    // 优雅关闭
    process.exit(1);
});

/**
 * 全局未处理的Promise rejection
 */
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection:', {
        reason: reason,
        promise: promise
    });
});

module.exports = {
    errorHandler,
    notFoundHandler,
    asyncHandler
};
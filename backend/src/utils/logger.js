/**
 * 统一日志记录工具
 * 提供结构化的日志记录功能
 */

const winston = require('winston');
const path = require('path');

/**
 * 日志级别定义
 */
const LOG_LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4
};

/**
 * 自定义日志格式
 */
const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.prettyPrint()
);

/**
 * 控制台日志格式
 */
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let log = `${timestamp} [${level}]: ${message}`;

        if (Object.keys(meta).length > 0) {
            log += ` ${JSON.stringify(meta)}`;
        }

        return log;
    })
);

/**
 * 创建日志记录器
 */
const createLogger = (serviceName) => {
    const logDir = path.join(__dirname, '../../logs');

    const transports = [
        // 控制台输出
        new winston.transports.Console({
            format: consoleFormat,
            level: process.env.NODE_ENV === 'development' ? 'debug' : 'info'
        })
    ];

    // 生产环境添加文件输出
    if (process.env.NODE_ENV === 'production') {
        transports.push(
            // 错误日志文件
            new winston.transports.File({
                filename: path.join(logDir, 'error.log'),
                level: 'error',
                format: logFormat,
                maxsize: 5242880, // 5MB
                maxFiles: 5
            }),
            // 组合日志文件
            new winston.transports.File({
                filename: path.join(logDir, 'combined.log'),
                format: logFormat,
                maxsize: 5242880, // 5MB
                maxFiles: 10
            }),
            // 访问日志文件
            new winston.transports.File({
                filename: path.join(logDir, 'access.log'),
                level: 'http',
                format: logFormat,
                maxsize: 10485760, // 10MB
                maxFiles: 20
            })
        );
    }

    return winston.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        levels: LOG_LEVELS,
        format: logFormat,
        defaultMeta: {
            service: serviceName,
            version: process.env.APP_VERSION || '1.0.0',
            environment: process.env.NODE_ENV || 'development'
        },
        transports,
        // 处理未捕获的异常
        exceptionHandlers: [
            new winston.transports.File({
                filename: path.join(logDir, 'exceptions.log'),
                format: logFormat
            })
        ],
        // 处理未处理的Promise rejection
        rejectionHandlers: [
            new winston.transports.File({
                filename: path.join(logDir, 'rejections.log'),
                format: logFormat
            })
        ]
    });
};

/**
 * 主应用日志记录器
 */
const logger = createLogger('app');

/**
 * HTTP请求日志记录器
 */
const httpLogger = createLogger('http');

/**
 * 数据库操作日志记录器
 */
const dbLogger = createLogger('database');

/**
 * 安全事件日志记录器
 */
const securityLogger = createLogger('security');

/**
 * 审计日志记录器
 */
const auditLogger = createLogger('audit');

/**
 * 性能监控日志记录器
 */
const performanceLogger = createLogger('performance');

/**
 * 业务逻辑日志记录器
 */
const businessLogger = createLogger('business');

/**
 * HTTP请求日志中间件
 */
const requestLogger = (req, res, next) => {
    const start = Date.now();

    // 记录请求开始
    httpLogger.http('Request started', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id,
        requestId: req.requestId
    });

    // 监听响应结束
    res.on('finish', () => {
        const duration = Date.now() - start;

        httpLogger.http('Request completed', {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            userId: req.user?.id,
            requestId: req.requestId,
            contentLength: res.get('Content-Length')
        });

        // 记录慢请求
        if (duration > 1000) {
            performanceLogger.warn('Slow request detected', {
                method: req.method,
                url: req.url,
                duration: `${duration}ms`,
                userId: req.user?.id
            });
        }
    });

    next();
};

/**
 * 数据库操作日志记录器
 */
const logDatabaseOperation = (operation, table, data, duration = null) => {
    dbLogger.debug('Database operation', {
        operation,
        table,
        data: typeof data === 'object' ? JSON.stringify(data) : data,
        duration: duration ? `${duration}ms` : null
    });
};

/**
 * 安全事件日志记录器
 */
const logSecurityEvent = (event, details = {}) => {
    securityLogger.warn('Security event', {
        event,
        ...details,
        timestamp: new Date().toISOString()
    });
};

/**
 * 审计日志记录器
 */
const logAuditEvent = (action, entityType, entityId, userId, changes = {}) => {
    auditLogger.info('Audit event', {
        action,
        entityType,
        entityId,
        userId,
        changes: JSON.stringify(changes),
        timestamp: new Date().toISOString()
    });
};

/**
 * 性能监控日志记录器
 */
const logPerformanceMetric = (metric, value, unit = 'ms', details = {}) => {
    performanceLogger.info('Performance metric', {
        metric,
        value,
        unit,
        ...details
    });
};

/**
 * 业务事件日志记录器
 */
const logBusinessEvent = (event, data = {}) => {
    businessLogger.info('Business event', {
        event,
        data: JSON.stringify(data),
        timestamp: new Date().toISOString()
    });
};

/**
 * 错误日志记录器（增强版）
 */
const logError = (error, context = {}) => {
    logger.error('Application error', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
        ...context,
        timestamp: new Date().toISOString()
    });
};

/**
 * 结构化信息日志记录器
 */
const logInfo = (message, data = {}) => {
    logger.info(message, {
        data: JSON.stringify(data),
        timestamp: new Date().toISOString()
    });
};

/**
 * 警告日志记录器
 */
const logWarning = (message, data = {}) => {
    logger.warn(message, {
        data: JSON.stringify(data),
        timestamp: new Date().toISOString()
    });
};

/**
 * 调试日志记录器
 */
const logDebug = (message, data = {}) => {
    logger.debug(message, {
        data: JSON.stringify(data),
        timestamp: new Date().toISOString()
    });
};

/**
 * 日志查询工具
 */
const logQuery = {
    /**
     * 查询错误日志
     * @param {Object} filters - 过滤条件
     * @param {number} limit - 限制数量
     * @returns {Array} 错误日志列表
     */
    async getErrors(filters = {}, limit = 100) {
        // 这里可以实现从日志文件或数据库查询错误日志
        // 返回最近的错误日志
        return [];
    },

    /**
     * 查询安全事件日志
     * @param {Object} filters - 过滤条件
     * @param {number} limit - 限制数量
     * @returns {Array} 安全事件日志列表
     */
    async getSecurityEvents(filters = {}, limit = 100) {
        // 这里可以实现查询安全事件日志
        return [];
    },

    /**
     * 查询性能日志
     * @param {Object} filters - 过滤条件
     * @param {number} limit - 限制数量
     * @returns {Array} 性能日志列表
     */
    async getPerformanceLogs(filters = {}, limit = 100) {
        // 这里可以实现查询性能日志
        return [];
    }
};

/**
 * 日志统计工具
 */
const logStats = {
    /**
     * 获取日志统计信息
     * @returns {Object} 日志统计信息
     */
    async getStats() {
        return {
            totalLogs: 0,
            errorCount: 0,
            warningCount: 0,
            infoCount: 0,
            debugCount: 0,
            last24Hours: 0,
            last7Days: 0,
            last30Days: 0
        };
    }
};

module.exports = {
    logger,
    httpLogger,
    dbLogger,
    securityLogger,
    auditLogger,
    performanceLogger,
    businessLogger,
    requestLogger,
    logDatabaseOperation,
    logSecurityEvent,
    logAuditEvent,
    logPerformanceMetric,
    logBusinessEvent,
    logError,
    logInfo,
    logWarning,
    logDebug,
    logQuery,
    logStats
};
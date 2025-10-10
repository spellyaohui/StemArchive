/**
 * API速率限制中间件
 * 防止API滥用和恶意请求
 */

const rateLimit = require('express-rate-limit');
const { ApiResponse } = require('../utils/response');
const { logger } = require('../utils/logger');

/**
 * 创建基础速率限制器
 * @param {Object} options - 配置选项
 * @returns {Function} 速率限制中间件
 */
const createRateLimiter = (options = {}) => {
    const defaultOptions = {
        windowMs: 15 * 60 * 1000, // 15分钟
        max: 100, // 最多100个请求
        message: '请求过于频繁，请稍后重试',
        standardHeaders: true, // 返回速率限制信息在 `RateLimit-*` headers
        legacyHeaders: false, // 禁用 `X-RateLimit-*` headers
        handler: (req, res) => {
            logger.warn('Rate limit exceeded:', {
                ip: req.ip,
                url: req.url,
                userAgent: req.get('User-Agent'),
                userId: req.user?.id
            });

            res.status(429).json(
                ApiResponse.tooManyRequests(options.message || '请求过于频繁，请稍后重试', {
                    retryAfter: Math.ceil(options.windowMs / 1000),
                    limit: options.max,
                    windowMs: options.windowMs
                })
            );
        }
    };

    return rateLimit({ ...defaultOptions, ...options });
};

/**
 * 通用API速率限制器
 */
const generalLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100, // 最多100个请求
    message: 'API请求过于频繁，请15分钟后再试'
});

/**
 * 认证API速率限制器（登录、注册等）
 */
const authLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 5, // 最多5次尝试
    message: '登录尝试过于频繁，请15分钟后再试'
});

/**
 * 文件上传速率限制器
 */
const uploadLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1小时
    max: 20, // 最多20个文件
    message: '文件上传过于频繁，请1小时后再试'
});

/**
 * 搜索API速率限制器
 */
const searchLimiter = createRateLimiter({
    windowMs: 1 * 60 * 1000, // 1分钟
    max: 30, // 最多30次搜索
    message: '搜索请求过于频繁，请1分钟后再试'
});

/**
 * 报告生成速率限制器
 */
const reportLimiter = createRateLimiter({
    windowMs: 10 * 60 * 1000, // 10分钟
    max: 10, // 最多10个报告
    message: '报告生成过于频繁，请10分钟后再试'
});

/**
 * 数据导出速率限制器
 */
const exportLimiter = createRateLimiter({
    windowMs: 30 * 60 * 1000, // 30分钟
    max: 5, // 最多5次导出
    message: '数据导出过于频繁，请30分钟后再试'
});

/**
 * 基于用户的速率限制器
 * @param {Object} options - 配置选项
 * @returns {Function} 用户速率限制中间件
 */
const createUserRateLimiter = (options = {}) => {
    const users = new Map(); // 存储用户的请求计数

    return (req, res, next) => {
        const userId = req.user?.id || req.ip;
        const now = Date.now();
        const windowMs = options.windowMs || 15 * 60 * 1000;
        const max = options.max || 100;

        if (!users.has(userId)) {
            users.set(userId, {
                count: 1,
                resetTime: now + windowMs
            });
            return next();
        }

        const userData = users.get(userId);

        if (now > userData.resetTime) {
            // 重置计数器
            userData.count = 1;
            userData.resetTime = now + windowMs;
            return next();
        }

        if (userData.count >= max) {
            const retryAfter = Math.ceil((userData.resetTime - now) / 1000);

            logger.warn('User rate limit exceeded:', {
                userId,
                ip: req.ip,
                url: req.url,
                count: userData.count,
                max,
                retryAfter
            });

            return res.status(429).json(
                ApiResponse.tooManyRequests(options.message || '请求过于频繁，请稍后重试', {
                    retryAfter,
                    limit: max,
                    windowMs
                })
            );
        }

        userData.count++;
        next();
    };
};

/**
 * 基于IP的严格速率限制器（用于保护敏感操作）
 */
const strictIPLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1小时
    max: 10, // 最多10个请求
    message: 'IP访问过于频繁，请1小时后再试'
});

/**
 * 创建动态速率限制器
 * 根据用户角色动态调整限制
 */
const createDynamicLimiter = () => {
    return (req, res, next) => {
        const user = req.user;
        let limiter;

        if (!user) {
            // 未认证用户 - 最严格限制
            limiter = createRateLimiter({
                windowMs: 15 * 60 * 1000,
                max: 20,
                message: '未认证用户访问受限'
            });
        } else if (user.role === 'admin') {
            // 管理员 - 最宽松限制
            limiter = createRateLimiter({
                windowMs: 15 * 60 * 1000,
                max: 1000,
                message: '管理员访问过于频繁'
            });
        } else if (user.role === 'manager') {
            // 经理 - 中等限制
            limiter = createRateLimiter({
                windowMs: 15 * 60 * 1000,
                max: 200,
                message: '经理访问过于频繁'
            });
        } else {
            // 普通用户 - 标准限制
            limiter = createRateLimiter({
                windowMs: 15 * 60 * 1000,
                max: 100,
                message: '用户访问过于频繁'
            });
        }

        limiter(req, res, next);
    };
};

/**
 * 清理过期的速率限制记录
 */
const cleanupRateLimits = setInterval(() => {
    // 这里可以添加清理逻辑，防止内存泄漏
    logger.debug('Rate limit cleanup completed');
}, 60 * 60 * 1000); // 每小时清理一次

module.exports = {
    createRateLimiter,
    generalLimiter,
    authLimiter,
    uploadLimiter,
    searchLimiter,
    reportLimiter,
    exportLimiter,
    strictIPLimiter,
    createUserRateLimiter,
    createDynamicLimiter
};
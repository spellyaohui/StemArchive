const { executeQuery, sql } = require('../../config/database');
const JwtUtils = require('../utils/jwt');

// JWT验证中间件
const authMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({
            status: 'Error',
            message: '未提供认证令牌'
        });
    }

    try {
        const decoded = JwtUtils.verifyToken(token);

        // 从数据库获取用户信息
        const query = `
            SELECT id, username, name, email, role, status
            FROM Users
            WHERE id = @userId AND status = 'active'
        `;

        const params = [{ name: 'userId', value: decoded.id, type: sql.Int }];
        const users = await executeQuery(query, params);

        if (users.length === 0) {
            return res.status(401).json({
                status: 'Error',
                message: '用户不存在或已被禁用'
            });
        }

        // 将用户信息添加到请求对象
        req.user = users[0];
        next();
    } catch (error) {
        res.status(401).json({
            status: 'Error',
            message: error.message || '无效的认证令牌'
        });
    }
};

// 角色验证中间件
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                status: 'Error',
                message: '用户未认证'
            });
        }

        const userRole = req.user.role;
        const allowedRoles = Array.isArray(roles) ? roles : [roles];

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                status: 'Error',
                message: '权限不足'
            });
        }

        next();
    };
};

// 管理员权限验证
const requireAdmin = requireRole(['admin']);

// 任何已认证用户权限验证
const requireAuth = requireRole(['admin', 'user']);

module.exports = {
    authMiddleware,
    requireRole,
    requireAdmin,
    requireAuth
};
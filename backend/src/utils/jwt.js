const jwt = require('jsonwebtoken');

// JWT配置
const JWT_CONFIG = {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    algorithm: 'HS256'
};

/**
 * JWT工具类
 */
class JwtUtils {
    /**
     * 生成访问令牌
     */
    static generateAccessToken(payload) {
        return jwt.sign(payload, JWT_CONFIG.secret, {
            expiresIn: JWT_CONFIG.expiresIn,
            algorithm: JWT_CONFIG.algorithm
        });
    }

    /**
     * 生成刷新令牌
     */
    static generateRefreshToken(payload) {
        return jwt.sign(payload, JWT_CONFIG.secret, {
            expiresIn: '7d',
            algorithm: JWT_CONFIG.algorithm
        });
    }

    /**
     * 验证令牌
     */
    static verifyToken(token) {
        try {
            return jwt.verify(token, JWT_CONFIG.secret, {
                algorithms: [JWT_CONFIG.algorithm]
            });
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new Error('令牌已过期');
            } else if (error.name === 'JsonWebTokenError') {
                throw new Error('无效的令牌');
            } else {
                throw new Error('令牌验证失败');
            }
        }
    }

    /**
     * 解码令牌（不验证）
     */
    static decodeToken(token) {
        try {
            return jwt.decode(token, { complete: true });
        } catch (error) {
            throw new Error('令牌解码失败');
        }
    }

    /**
     * 检查令牌是否即将过期
     */
    static isTokenExpiringSoon(token, thresholdMinutes = 30) {
        try {
            const decoded = jwt.decode(token);
            if (!decoded || !decoded.exp) {
                return true;
            }

            const expirationTime = decoded.exp * 1000; // 转换为毫秒
            const currentTime = Date.now();
            const thresholdTime = thresholdMinutes * 60 * 1000; // 转换为毫秒

            return (expirationTime - currentTime) <= thresholdTime;
        } catch (error) {
            return true;
        }
    }

    /**
     * 获取令牌剩余有效时间（秒）
     */
    static getTokenRemainingTime(token) {
        try {
            const decoded = jwt.decode(token);
            if (!decoded || !decoded.exp) {
                return 0;
            }

            const expirationTime = decoded.exp * 1000; // 转换为毫秒
            const currentTime = Date.now();
            const remainingTime = Math.max(0, expirationTime - currentTime);

            return Math.floor(remainingTime / 1000); // 返回秒数
        } catch (error) {
            return 0;
        }
    }
}

module.exports = JwtUtils;
const User = require('../models/User');
const JwtUtils = require('../utils/jwt');

/**
 * 认证服务类
 * 处理用户认证相关的业务逻辑
 */
class AuthService {
    /**
     * 用户登录
     */
    static async login(username, password, rememberMe = false) {
        try {
            // 查找用户
            const user = await User.findByUsername(username);
            if (!user) {
                return {
                    success: false,
                    message: '用户名或密码错误'
                };
            }

            // 简化版本，跳过账户锁定检查

            // 检查账户状态
            if (user.status !== 'active') {
                return {
                    success: false,
                    message: '账户已被禁用，请联系管理员'
                };
            }

            // 验证密码
            const isPasswordValid = await User.validatePassword(password, user.password);
            if (!isPasswordValid) {
                // 增加登录失败次数
                await User.incrementLoginAttempts(username);

                return {
                    success: false,
                    message: '用户名或密码错误'
                };
            }

            // 重置登录失败次数
            await User.resetLoginAttempts(username);

            // 更新最后登录时间
            await User.updateLastLogin(user.id);

            // 生成令牌
            const tokenPayload = {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role
            };

            const accessToken = JwtUtils.generateAccessToken(tokenPayload);
            const refreshToken = rememberMe ? JwtUtils.generateRefreshToken({ id: user.id }) : null;

            return {
                success: true,
                message: '登录成功',
                data: {
                    token: accessToken,
                    refreshToken: refreshToken,
                    user: {
                        id: user.id,
                        username: user.username,
                        name: user.name,
                        email: user.email,
                        role: user.role
                    }
                }
            };
        } catch (error) {
            console.error('登录服务错误:', error);
            return {
                success: false,
                message: '登录失败，请稍后重试'
            };
        }
    }

    /**
     * 验证令牌
     */
    static async verifyToken(token) {
        try {
            // 验证令牌有效性
            const decoded = JwtUtils.verifyToken(token);

            // 查找用户
            const user = await User.findById(decoded.id);
            if (!user || user.status !== 'active') {
                throw new Error('用户不存在或已被禁用');
            }

            return {
                success: true,
                message: '令牌有效',
                data: {
                    user: {
                        id: user.id,
                        username: user.username,
                        name: user.name,
                        email: user.email,
                        role: user.role
                    }
                }
            };
        } catch (error) {
            console.error('令牌验证失败:', error);
            return {
                success: false,
                message: error.message || '令牌验证失败'
            };
        }
    }

    /**
     * 刷新令牌
     */
    static async refreshToken(refreshToken) {
        try {
            // 验证刷新令牌
            const decoded = JwtUtils.verifyToken(refreshToken);

            // 查找用户
            const user = await User.findById(decoded.id);
            if (!user || user.status !== 'active') {
                throw new Error('用户不存在或已被禁用');
            }

            // 生成新的访问令牌
            const tokenPayload = {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role
            };

            const newAccessToken = JwtUtils.generateAccessToken(tokenPayload);

            return {
                success: true,
                message: '令牌刷新成功',
                data: {
                    token: newAccessToken
                }
            };
        } catch (error) {
            console.error('令牌刷新失败:', error);
            return {
                success: false,
                message: '令牌刷新失败'
            };
        }
    }

    /**
     * 用户登出
     */
    static async logout(token) {
        try {
            // 这里可以实现令牌黑名单机制
            // 目前只是简单返回成功
            return {
                success: true,
                message: '登出成功'
            };
        } catch (error) {
            console.error('登出失败:', error);
            return {
                success: false,
                message: '登出失败'
            };
        }
    }

    /**
     * 修改密码
     */
    static async changePassword(userId, oldPassword, newPassword) {
        try {
            // 查找用户
            const user = await User.findById(userId);
            if (!user) {
                return {
                    success: false,
                    message: '用户不存在'
                };
            }

            // 验证旧密码
            const isOldPasswordValid = await User.validatePassword(oldPassword, user.password);
            if (!isOldPasswordValid) {
                return {
                    success: false,
                    message: '原密码错误'
                };
            }

            // 更新密码
            await User.changePassword(userId, newPassword);

            return {
                success: true,
                message: '密码修改成功'
            };
        } catch (error) {
            console.error('修改密码失败:', error);
            return {
                success: false,
                message: '密码修改失败'
            };
        }
    }

    /**
     * 重置密码（管理员操作）
     */
    static async resetPassword(userId, newPassword, adminId) {
        try {
            // 查找用户
            const user = await User.findById(userId);
            if (!user) {
                return {
                    success: false,
                    message: '用户不存在'
                };
            }

            // 更新密码
            await User.changePassword(userId, newPassword);

            return {
                success: true,
                message: '密码重置成功'
            };
        } catch (error) {
            console.error('重置密码失败:', error);
            return {
                success: false,
                message: '密码重置失败'
            };
        }
    }

    /**
     * 获取用户信息
     */
    static async getUserInfo(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                return {
                    success: false,
                    message: '用户不存在'
                };
            }

            return {
                success: true,
                data: {
                    user: {
                        id: user.id,
                        username: user.username,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        createdAt: user.created_at
                    }
                }
            };
        } catch (error) {
            console.error('获取用户信息失败:', error);
            return {
                success: false,
                message: '获取用户信息失败'
            };
        }
    }

    /**
     * 更新用户信息
     */
    static async updateUserInfo(userId, updateData, updatedBy = null) {
        try {
            const updatedUser = await User.update(userId, updateData, updatedBy);
            if (!updatedUser) {
                return {
                    success: false,
                    message: '用户更新失败'
                };
            }

            return {
                success: true,
                message: '用户信息更新成功',
                data: {
                    user: {
                        id: updatedUser.id,
                        username: updatedUser.username,
                        name: updatedUser.name,
                        email: updatedUser.email,
                        role: updatedUser.role,
                        status: updatedUser.status
                    }
                }
            };
        } catch (error) {
            console.error('更新用户信息失败:', error);
            return {
                success: false,
                message: error.message || '更新用户信息失败'
            };
        }
    }

    /**
     * 检查用户权限
     */
    static checkPermission(userRole, requiredRole) {
        const roleHierarchy = {
            'admin': 3,
            'manager': 2,
            'user': 1
        };

        return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
    }

    /**
     * 初始化认证系统
     */
    static async initialize() {
        try {
            await User.initialize();
            console.log('✅ 认证系统初始化完成');
        } catch (error) {
            console.error('❌ 认证系统初始化失败:', error);
            throw error;
        }
    }
}

module.exports = AuthService;
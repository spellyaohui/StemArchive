const { executeQuery, executeProcedure } = require('../../config/database');
const bcrypt = require('bcryptjs');

/**
 * 用户模型
 * 处理用户相关的数据库操作
 */
class User {
    /**
     * 创建用户表
     */
    static async createTable() {
        // 简单的用户表结构，匹配现有数据库
        const createTableSQL = `
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
            BEGIN
                CREATE TABLE Users (
                    id INT PRIMARY KEY IDENTITY(1,1),
                    username NVARCHAR(50) UNIQUE NOT NULL,
                    password NVARCHAR(255) NOT NULL,
                    name NVARCHAR(100) NOT NULL,
                    email NVARCHAR(255),
                    role NVARCHAR(20) DEFAULT 'user',
                    status NVARCHAR(20) DEFAULT 'active',
                    created_at DATETIME DEFAULT GETDATE(),
                    updated_at DATETIME
                );

                PRINT '用户表 Users 创建成功';
            END
        `;

        try {
            await executeQuery(createTableSQL);
            console.log('✅ 用户表结构创建/验证成功');
            return true;
        } catch (error) {
            console.error('❌ 创建用户表失败:', error);
            throw error;
        }
    }

    /**
     * 初始化默认管理员用户
     */
    static async initDefaultUsers() {
        try {
            // 检查是否已存在管理员用户
            const existingAdmin = await this.findByUsername('admin');
            if (existingAdmin) {
                console.log('✅ 默认管理员用户已存在');
                return existingAdmin;
            }

            // 创建默认管理员
            const hashedPassword = await bcrypt.hash('admin123', 12);
            const insertSQL = `
                INSERT INTO Users (username, password, name, email, role, status)
                VALUES ('admin', @password, '系统管理员', 'admin@system.com', 'admin', 'active');

                SELECT SCOPE_IDENTITY() as id, username, name, email, role, status, created_at, updated_at
                FROM Users
                WHERE id = SCOPE_IDENTITY();
            `;

            const result = await executeQuery(insertSQL, [
                { name: 'password', value: hashedPassword }
            ]);

            if (result.length > 0) {
                console.log('✅ 默认管理员用户创建成功');
                return result[0];
            }
        } catch (error) {
            console.error('❌ 初始化默认用户失败:', error);
            throw error;
        }
    }

    /**
     * 根据用户名查找用户
     */
    static async findByUsername(username) {
        const query = `
            SELECT id, username, password, name, email, role, status, created_at, updated_at
            FROM Users
            WHERE username = @username AND status = 'active';
        `;

        try {
            const result = await executeQuery(query, [
                { name: 'username', value: username }
            ]);
            return result.length > 0 ? result[0] : null;
        } catch (error) {
            console.error('❌ 查找用户失败:', error);
            throw error;
        }
    }

    /**
     * 根据ID查找用户
     */
    static async findById(id) {
        const query = `
            SELECT id, username, name, email, role, status, created_at, updated_at
            FROM Users
            WHERE id = @id AND status = 'active';
        `;

        try {
            const result = await executeQuery(query, [
                { name: 'id', value: id }
            ]);
            return result.length > 0 ? result[0] : null;
        } catch (error) {
            console.error('❌ 查找用户失败:', error);
            throw error;
        }
    }

    /**
     * 创建新用户
     */
    static async create(userData, createdBy = null) {
        const { username, password, name, email, role = 'user' } = userData;

        // 检查用户名是否已存在
        const existingUser = await this.findByUsername(username);
        if (existingUser) {
            throw new Error('用户名已存在');
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 12);

        const insertSQL = `
            INSERT INTO Users (username, password, name, email, role)
            VALUES (@username, @password, @name, @email, @role);

            SELECT SCOPE_IDENTITY() as id, username, name, email, role, created_at, updated_at
            FROM Users
            WHERE id = SCOPE_IDENTITY();
        `;

        try {
            const result = await executeQuery(insertSQL, [
                { name: 'username', value: username },
                { name: 'password', value: hashedPassword },
                { name: 'name', value: name },
                { name: 'email', value: email || null },
                { name: 'role', value: role }
            ]);

            if (result.length > 0) {
                console.log(`✅ 用户 ${username} 创建成功`);
                return result[0];
            }
        } catch (error) {
            console.error('❌ 创建用户失败:', error);
            throw error;
        }
    }

    /**
     * 更新用户信息
     */
    static async update(id, userData, updatedBy = null) {
        const { name, email, role, status } = userData;

        const updateSQL = `
            UPDATE Users
            SET name = @name,
                email = @email,
                role = @role,
                status = @status
            WHERE id = @id;

            SELECT id, username, name, email, role, status, created_at, updated_at
            FROM Users WHERE id = @id;
        `;

        try {
            const result = await executeQuery(updateSQL, [
                { name: 'name', value: name },
                { name: 'email', value: email || null },
                { name: 'role', value: role },
                { name: 'status', value: status || 'active' },
                { name: 'id', value: id }
            ]);

            if (result.length > 0) {
                console.log(`✅ 用户 ${id} 更新成功`);
                return result[0];
            }
        } catch (error) {
            console.error('❌ 更新用户失败:', error);
            throw error;
        }
    }

    /**
     * 更新最后登录时间
     */
    static async updateLastLogin(id) {
        // 简化版本，使用 updated_at 字段记录登录时间
        const updateSQL = `
            UPDATE Users
            SET updated_at = GETDATE()
            WHERE id = @id;
        `;

        try {
            await executeQuery(updateSQL, [
                { name: 'id', value: id }
            ]);
            console.log(`✅ 用户 ${id} 登录时间更新成功`);
        } catch (error) {
            console.error('❌ 更新登录时间失败:', error);
            throw error;
        }
    }

    /**
     * 增加登录失败次数
     */
    static async incrementLoginAttempts(username) {
        // 简化版本，不做处理
        console.log(`用户 ${username} 登录失败`);
    }

    /**
     * 重置登录失败次数
     */
    static async resetLoginAttempts(username) {
        // 简化版本，不做处理
        console.log(`用户 ${username} 登录成功，重置失败次数`);
    }

    /**
     * 更改密码
     */
    static async changePassword(id, newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        const updateSQL = `
            UPDATE Users
            SET password = @password
            WHERE id = @id;
        `;

        try {
            await executeQuery(updateSQL, [
                { name: 'password', value: hashedPassword },
                { name: 'id', value: id }
            ]);
            console.log(`✅ 用户 ${id} 密码更改成功`);
        } catch (error) {
            console.error('❌ 更改密码失败:', error);
            throw error;
        }
    }

    /**
     * 获取所有用户
     */
    static async getAll(filters = {}) {
        let { page = 1, limit = 50, role, status, search } = filters;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (role) {
            whereClause += ' AND role = @role';
            params.push({ name: 'role', value: role });
        }

        if (status) {
            whereClause += ' AND status = @status';
            params.push({ name: 'status', value: status });
        }

        if (search) {
            whereClause += ' AND (username LIKE @search OR name LIKE @search OR email LIKE @search)';
            params.push({ name: 'search', value: `%${search}%` });
        }

        const query = `
            SELECT id, username, name, email, role, status, created_at, updated_at
            FROM Users
            ${whereClause}
            ORDER BY created_at DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;

            SELECT COUNT(*) as total FROM Users ${whereClause};
        `;

        params.push(
            { name: 'offset', value: offset },
            { name: 'limit', value: limit }
        );

        try {
            const result = await executeQuery(query, params);

            // 分离数据和总数
            const users = result.slice(0, -1);
            const total = result[result.length - 1]?.total || 0;

            return {
                users,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: parseInt(total),
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('❌ 获取用户列表失败:', error);
            throw error;
        }
    }

    /**
     * 删除用户（软删除）
     */
    static async delete(id, deletedBy = null) {
        const updateSQL = `
            UPDATE Users
            SET status = 'deleted'
            WHERE id = @id;
        `;

        try {
            await executeQuery(updateSQL, [
                { name: 'id', value: id }
            ]);
            console.log(`✅ 用户 ${id} 删除成功`);
        } catch (error) {
            console.error('❌ 删除用户失败:', error);
            throw error;
        }
    }

    /**
     * 验证密码
     */
    static async validatePassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }

    /**
     * 初始化数据库表和默认数据
     */
    static async initialize() {
        try {
            await this.createTable();
            await this.initDefaultUsers();
            console.log('✅ 用户表初始化完成');
        } catch (error) {
            console.error('❌ 用户表初始化失败:', error);
            throw error;
        }
    }
}

module.exports = User;
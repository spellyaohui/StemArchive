const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression'); // 添加 gzip 压缩
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { authMiddleware, requireAdmin } = require('./src/middleware/auth');
const { authLimiter, generalLimiter } = require('./src/middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const BACKUP_PORT = process.env.BACKUP_PORT || 8080;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const RATE_LIMIT_ENABLED = (process.env.RATE_LIMIT_ENABLED || (IS_PRODUCTION ? 'true' : 'false')).toLowerCase() === 'true';
const ENABLE_DEBUG_ROUTES = process.env.ENABLE_DEBUG_ROUTES === 'true';

// 服务器启动时间（用于健康检查）
const serverStartTime = new Date();

function validateSecurityConfig() {
    const jwtSecret = process.env.JWT_SECRET;
    const isProduction = process.env.NODE_ENV === 'production';

    if (!jwtSecret || jwtSecret.trim().length < 32) {
        throw new Error('JWT_SECRET未配置或长度不足（至少32位）');
    }

    if (isProduction && /change-in-production|your-secret-key/i.test(jwtSecret)) {
        throw new Error('生产环境禁止使用弱JWT_SECRET默认值');
    }
}

function isPublicApiPath(req) {
    const method = req.method.toUpperCase();
    const path = req.path;

    if (method === 'POST' && path === '/auth/login') {
        return true;
    }

    if (method === 'GET' && path === '/auth/verify') {
        return true;
    }

    return false;
}

// 初始化系统设置
async function initializeSystemSettings() {
    try {
        const { executeQuery } = require('./config/database');

        // 检查SystemSettings表是否存在
        const tableCheck = await executeQuery(`
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_NAME = 'SystemSettings'
        `);

        if (tableCheck[0] && tableCheck[0].count === 0) {
            console.log('SystemSettings表不存在，正在创建...');

            // 创建SystemSettings表
            await executeQuery(`
                CREATE TABLE SystemSettings (
                    ID INT IDENTITY(1,1) PRIMARY KEY,
                    SettingKey NVARCHAR(100) NOT NULL UNIQUE,
                    SettingValue NVARCHAR(1000) NOT NULL,
                    SettingType NVARCHAR(20) DEFAULT 'string',
                    Description NVARCHAR(500),
                    Category NVARCHAR(50) DEFAULT 'general',
                    IsReadonly BIT DEFAULT 0,
                    CreatedAt DATETIME DEFAULT GETDATE(),
                    UpdatedAt DATETIME DEFAULT GETDATE(),
                    CreatedBy NVARCHAR(100),
                    UpdatedBy NVARCHAR(100)
                )
            `);

            // 创建索引
            await executeQuery('CREATE INDEX IX_SystemSettings_SettingKey ON SystemSettings(SettingKey)');
            await executeQuery('CREATE INDEX IX_SystemSettings_Category ON SystemSettings(Category)');

            // 插入默认系统设置
            await executeQuery(`
                INSERT INTO SystemSettings (SettingKey, SettingValue, SettingType, Description, Category, CreatedBy, UpdatedBy)
                VALUES
                    ('systemName', '干细胞治疗档案管理系统', 'string', '系统名称', 'general', 'system', 'system'),
                    ('systemVersion', '1.2.1', 'string', '系统版本', 'general', 'system', 'system'),
                    ('adminEmail', 'admin@system.com', 'email', '管理员邮箱', 'general', 'system', 'system'),
                    ('adminPhone', '400-888-8888', 'string', '联系电话', 'general', 'system', 'system'),
                    ('systemDescription', '专业的干细胞治疗档案管理系统，提供全面的患者信息管理、治疗方案制定和数据分析功能。', 'text', '系统描述', 'general', 'system', 'system'),
                    ('enableNotifications', 'true', 'boolean', '启用系统通知', 'general', 'system', 'system')
            `);

            console.log('SystemSettings表创建完成，默认设置已插入');
        } else {
            console.log('SystemSettings表已存在');
        }
    } catch (error) {
        console.error('初始化系统设置失败:', error);
    }
}

// CORS 配置
const corsOptions = {
    origin: function (origin, callback) {
        // 允许无 origin 的请求（如同源请求、Postman 等）
        if (!origin) {
            return callback(null, true);
        }
        
        // 开发环境允许的来源
        const devOrigins = [
            'http://localhost:8080',
            'http://127.0.0.1:8080',
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost:5000',
            'http://127.0.0.1:5000'
        ];
        
        // 生产环境：只允许同源或配置的来源
        const allowedOrigins = process.env.ALLOWED_ORIGINS 
            ? process.env.ALLOWED_ORIGINS.split(',').map(item => item.trim()).filter(Boolean)
            : [];

        const finalAllowedOrigins = IS_PRODUCTION
            ? allowedOrigins
            : [...devOrigins, ...allowedOrigins];

        if (finalAllowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('不允许的跨域请求来源'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// 中间件
// gzip 压缩 - 必须在其他中间件之前，大幅减少传输大小
app.use(compression({
    level: 6, // 压缩级别 1-9，6 是性能和压缩率的平衡点
    threshold: 1024, // 只压缩大于 1KB 的响应
    filter: (req, res) => {
        // 压缩所有文本类型的响应
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    }
}));

app.use(helmet({
    contentSecurityPolicy: false, // 禁用 CSP 以允许内联脚本
    crossOriginEmbedderPolicy: false
}));
app.use(cors(corsOptions));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 上传文件访问（受鉴权保护）
app.use('/uploads', authMiddleware, express.static('uploads'));

// API 限流与全局鉴权（白名单放行）
if (RATE_LIMIT_ENABLED) {
    app.use('/api/auth/login', authLimiter);
    app.use('/api', generalLimiter);
    console.log('✅ API限流已启用（RATE_LIMIT_ENABLED=true）');
} else {
    console.log('ℹ️ API限流已禁用（RATE_LIMIT_ENABLED=false）');
}

app.use('/api', (req, res, next) => {
    if (isPublicApiPath(req)) {
        return next();
    }
    return authMiddleware(req, res, next);
});

// ==================== API 路由 ====================
// API 路由必须在静态文件服务之前注册，确保 API 优先级

app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/customers', require('./src/routes/customerLookup'));
app.use('/api/customers', require('./src/routes/customers'));
app.use('/api/users', require('./src/routes/users'));
app.use('/api/settings', require('./src/routes/settings'));
app.use('/api/health-assessments', require('./src/routes/healthAssessments'));
app.use('/api/health-data', require('./routes/health-data'));
app.use('/api/laboratory-data', require('./routes/laboratoryData'));
app.use('/api/departments', require('./routes/departments-simple-new'));
app.use('/api/medical-images', require('./src/routes/medicalImages'));
app.use('/api/stem-cell', require('./src/routes/stemCell'));
app.use('/api/reports', require('./src/routes/reports'));
app.use('/api/notifications', require('./src/routes/notifications'));
app.use('/api/statistics', require('./src/routes/statistics'));
app.use('/api/persons', require('./src/routes/persons'));
app.use('/api/disease-types', require('./src/routes/diseaseTypes'));
app.use('/api/treatment-types', require('./src/routes/treatmentTypes'));
app.use('/api/treatment-effectiveness', require('./src/routes/treatment-effectiveness'));
app.use('/api/treatment-history', require('./src/routes/treatment-history'));
app.use('/api/examination-import', require('./src/routes/examinationImport'));
app.use('/api/auto-import', require('./src/routes/autoImport'));
app.use('/api', require('./src/routes/thirdPartyExamination'));

// 测试输注排期查询
app.get('/api/test-schedules', requireAdmin, async (req, res) => {
  try {
    if (!ENABLE_DEBUG_ROUTES) {
      return res.status(404).json({
        status: 'Error',
        message: '资源不存在'
      });
    }

    const { executeQuery } = require('./config/database');

    const testQuery = `
      SELECT
        inf.*,
        sp.PatientNumber,
        c.Name as CustomerName,
        c.Phone as CustomerPhone,
        c.ContactPerson,
        c.ContactPersonPhone,
        DB_NAME() as DatabaseName,
        GETDATE() as ServerTime
      FROM InfusionSchedules inf
      INNER JOIN StemCellPatients sp ON inf.PatientID = sp.ID
      INNER JOIN Customers c ON sp.CustomerID = c.ID
      WHERE CAST(inf.ScheduleDate AS DATE) >= CAST(GETDATE() AS DATE)
        AND CAST(inf.ScheduleDate AS DATE) < DATEADD(DAY, 1, CAST(GETDATE() AS DATE))
        AND inf.Status IN ('Scheduled', 'In Progress', '已安排', '待安排')
      ORDER BY inf.ScheduleDate ASC;
    `;

    console.log('Executing test query...');
    const result = await executeQuery(testQuery);
    console.log('Test query result count:', result.length);

    res.json({
      status: 'Success',
      message: '测试查询成功',
      data: {
        count: result.length,
        schedules: result
      }
    });
  } catch (error) {
    console.error('测试查询失败:', error);
    res.status(500).json({
      status: 'Error',
      message: '测试查询失败: ' + error.message
    });
  }
});

// ==================== 健康检查端点 ====================
app.get('/health', async (req, res) => {
  // 计算运行时间
  const uptime = Math.floor((new Date() - serverStartTime) / 1000);
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = uptime % 60;
  const uptimeStr = `${hours}小时 ${minutes}分钟 ${seconds}秒`;

  // 检查数据库连接状态
  let dbStatus = 'unknown';
  try {
    const { executeQuery } = require('./config/database');
    await executeQuery('SELECT 1 as test');
    dbStatus = 'connected';
  } catch (error) {
    dbStatus = 'disconnected';
  }

  res.status(200).json({
    status: 'OK',
    message: '干细胞治疗档案管理系统运行正常',
    version: '1.2.1',
    uptime: uptimeStr,
    uptimeSeconds: uptime,
    database: dbStatus,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});


// ==================== 静态文件服务 ====================
// 静态文件服务在 API 路由之后，确保 API 优先级

const publicPath = path.join(__dirname, 'public');

// 检查 public 目录是否存在
if (fs.existsSync(publicPath)) {
    console.log('📁 静态文件目录已找到:', publicPath);
    
    // 静态文件服务
    app.use(express.static(publicPath, {
        index: false, // 禁用自动 index.html，我们手动处理
        maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0
    }));

    // 根路径重定向到登录页
    app.get('/', (req, res) => {
        res.redirect('/login.html');
    });
} else {
    console.log('⚠️ 静态文件目录不存在，请运行 npm run build 构建前端');
}

// ==================== 404 处理 ====================
// 区分 API 请求和页面请求，返回不同格式的错误

app.use((req, res, next) => {
    // 判断是否为 API 请求
    const isApiRequest = req.path.startsWith('/api/') || 
                         req.xhr || 
                         (req.headers.accept && req.headers.accept.includes('application/json'));

    if (isApiRequest) {
        // API 请求返回 JSON 格式错误
        res.status(404).json({
            status: 'Error',
            message: '请求的 API 资源不存在',
            path: req.path,
            code: 404
        });
    } else {
        // 页面请求返回 HTML 错误页面
        const errorPagePath = path.join(publicPath, '404.html');
        
        if (fs.existsSync(errorPagePath)) {
            res.status(404).sendFile(errorPagePath);
        } else {
            // 如果没有 404.html，返回简单的 HTML 错误页面
            res.status(404).send(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 - 页面未找到</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            text-align: center;
            padding: 2rem;
        }
        h1 {
            font-size: 6rem;
            margin: 0;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        p {
            font-size: 1.5rem;
            margin: 1rem 0 2rem;
        }
        a {
            display: inline-block;
            padding: 0.75rem 2rem;
            background: white;
            color: #667eea;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            transition: transform 0.2s;
        }
        a:hover {
            transform: scale(1.05);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>404</h1>
        <p>抱歉，您访问的页面不存在</p>
        <a href="/login.html">返回首页</a>
    </div>
</body>
</html>
            `);
        }
    }
});

// ==================== 错误处理中间件 ====================
app.use((err, req, res, next) => {
    console.error('服务器错误:', err.stack);
    
    const isApiRequest = req.path.startsWith('/api/') || 
                         req.xhr || 
                         (req.headers.accept && req.headers.accept.includes('application/json'));

    if (isApiRequest) {
        res.status(500).json({
            status: 'Error',
            message: process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message,
            code: 500
        });
    } else {
        res.status(500).send(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>500 - 服务器错误</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
        }
        .container {
            text-align: center;
            padding: 2rem;
        }
        h1 {
            font-size: 6rem;
            margin: 0;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        p {
            font-size: 1.5rem;
            margin: 1rem 0 2rem;
        }
        a {
            display: inline-block;
            padding: 0.75rem 2rem;
            background: white;
            color: #f5576c;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            transition: transform 0.2s;
        }
        a:hover {
            transform: scale(1.05);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>500</h1>
        <p>抱歉，服务器发生了错误</p>
        <a href="/login.html">返回首页</a>
    </div>
</body>
</html>
        `);
    }
});

// ==================== 启动服务器 ====================
function listenWithPromise(port, host) {
    return new Promise((resolve, reject) => {
        const server = app.listen(port, host, () => {
            resolve({ server, port });
        });

        server.once('error', (error) => {
            reject(error);
        });
    });
}

async function startServer() {
    try {
        // 启动前安全配置校验
        validateSecurityConfig();

        // 初始化系统设置
        await initializeSystemSettings();

        const primaryPort = Number(PORT);
        const backupPort = Number(BACKUP_PORT);
        let listenResult;

        try {
            listenResult = await listenWithPromise(primaryPort, HOST);
        } catch (error) {
            const canFallback =
                (error.code === 'EACCES' || error.code === 'EADDRINUSE') &&
                backupPort !== primaryPort;

            if (!canFallback) {
                throw error;
            }

            console.warn(`⚠️ 端口 ${primaryPort} 不可用(${error.code})，自动切换到端口 ${backupPort}`);
            listenResult = await listenWithPromise(backupPort, HOST);
        }

        const { server, port: activePort } = listenResult;

        console.log('========================================');
        console.log('  干细胞治疗档案管理系统');
        console.log('========================================');
        console.log(`🌍 监听地址: ${HOST}`);
        console.log(`🚀 服务器运行在端口 ${activePort}`);
        console.log(`📱 健康检查: http://127.0.0.1:${activePort}/health`);
        console.log(`🌐 前端页面: http://127.0.0.1:${activePort}/login.html`);
        console.log(`📡 API 接口: http://127.0.0.1:${activePort}/api/`);
        console.log(`⚙️ 系统设置已初始化并支持持久化存储`);
        console.log('========================================');

        // 启动自动导入服务
        const autoImportService = require('./src/services/autoImportService');
        autoImportService.start();

        return server;
    } catch (error) {
        console.error('服务器启动失败:', error);
        process.exit(1);
    }
}

// 启动服务器
startServer();

module.exports = app;

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

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

        if (tableCheck.recordset && tableCheck.recordset[0] && tableCheck.recordset[0].count === 0) {
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

// 中间件
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use('/uploads', express.static('uploads'));

// 路由
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

// 体检日期获取API - 统一接口
app.post('/api/get_tjrq', async (req, res) => {
  try {
    const { studyId } = req.body;

    if (!studyId) {
      return res.status(400).json({
        status: 'Error',
        message: 'studyId参数不能为空'
      });
    }

    // 使用体检日期服务获取日期
    const examinationDateService = require('./src/services/examinationDateService');
    const examinationDate = await examinationDateService.getExaminationDate(studyId);

    if (examinationDate) {
      res.json({
        code: 200,
        data: examinationDate,
        message: '成功获取体检日期'
      });
    } else {
      res.json({
        code: 404,
        data: null,
        message: '未找到对应的体检日期'
      });
    }
  } catch (error) {
    console.error('获取体检日期失败:', error);
    res.status(500).json({
      code: 500,
      data: null,
      message: '获取体检日期失败: ' + error.message
    });
  }
});

// 健康检查
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: '干细胞治疗档案管理系统运行正常',
    timestamp: new Date().toISOString()
  });
});

// 测试输注排期查询
app.get('/api/test-schedules', async (req, res) => {
  try {
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

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'Error',
    message: '请求的资源不存在'
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'Error',
    message: process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message
  });
});

// 启动服务器
async function startServer() {
    try {
        // 初始化系统设置
        await initializeSystemSettings();

        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 服务器运行在端口 ${PORT}`);
            console.log(`📱 健康检查: http://127.0.0.1:${PORT}/health`);
            console.log(`⚙️ 系统设置已初始化并支持持久化存储`);
        });

        return server;
    } catch (error) {
        console.error('服务器启动失败:', error);
        process.exit(1);
    }
}

// 启动服务器
startServer();

module.exports = app;
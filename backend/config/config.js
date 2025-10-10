const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  // 服务器配置
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development'
  },

  // 数据库配置
  database: {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERTIFICATE === 'true'
  },

  // JWT配置
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },

  // 文件上传配置
  upload: {
    directory: process.env.UPLOAD_DIR || 'uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  },

  // 前端URL
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:8080'
  },

  // 业务配置
  business: {
    // 治疗项目类型
    treatmentTypes: ['NK', 'MSC', '2MSC', '膝关节靶向注射'],

    // 回输次数
    infusionCountTypes: ['首次', '二次', '三次', '四次'],

    // 常见疾病分类
    diseaseCategories: [
      '糖尿病',
      '高血压',
      '冠心病',
      '脂代谢异常',
      '尿酸增高',
      '肾功不全',
      '关节病',
      '皮肤病',
      '其他'
    ],

    // 统计周期（月）
    statisticsPeriod: 12
  }
};
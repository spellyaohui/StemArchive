const sql = require('mssql');

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERTIFICATE === 'true',
    enableArithAbort: true,
    requestTimeout: 30000,
    connectionTimeout: 30000
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// 移除密码周围的引号（如果存在）
if (config.password && config.password.startsWith('"') && config.password.endsWith('"')) {
  config.password = config.password.slice(1, -1);
}

console.log('数据库配置:', {
  user: config.user,
  server: config.server,
  database: config.database,
  passwordLength: config.password ? config.password.length : 0,
  encrypt: config.options.encrypt
});

let pool;

// 连接数据库
const connectDB = async () => {
  try {
    if (pool) {
      return pool;
    }

    pool = await sql.connect(config);
    console.log('✅ 数据库连接成功');
    return pool;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    throw error;
  }
};

// 获取连接池
const getPool = () => {
  if (!pool) {
    throw new Error('数据库未连接，请先调用 connectDB()');
  }
  return pool;
};

// 执行查询
const executeQuery = async (query, params = []) => {
  try {
    const pool = await connectDB();
    const request = pool.request();

    // 添加参数
    params.forEach((param, index) => {
      if (param.name) {
        // 使用参数名
        if (param.type) {
          request.input(param.name, param.type, param.value);
        } else {
          request.input(param.name, param.value);
        }
      } else {
        // 使用默认参数名
        if (param.type) {
          request.input(`param${index}`, param.type, param.value);
        } else {
          request.input(`param${index}`, param.value);
        }
      }
    });

    const result = await request.query(query);

    const primaryRecordset = Array.isArray(result.recordset) ? result.recordset : [];
    const allRecordsets = Array.isArray(result.recordsets) && result.recordsets.length > 0
      ? result.recordsets
      : [primaryRecordset];

    // 向后兼容：
    // 1) 大量调用方直接把返回值当数组使用（result[0] / result.length）
    // 2) 也有调用方依赖 result.recordset / result.rowsAffected 元数据
    const mergedRows = allRecordsets.length > 1
      ? allRecordsets.flat()
      : primaryRecordset;

    return Object.assign(mergedRows, {
      recordset: primaryRecordset,
      recordsets: allRecordsets,
      rowsAffected: result.rowsAffected || [],
      output: result.output || {},
      returnValue: result.returnValue
    });
  } catch (error) {
    console.error('查询执行失败:', error);
    throw error;
  }
};

// 执行存储过程
const executeProcedure = async (procedureName, params = {}) => {
  try {
    const pool = await connectDB();
    const request = pool.request();

    // 添加参数
    Object.keys(params).forEach(key => {
      request.input(key, params[key]);
    });

    const result = await request.execute(procedureName);
    return result.recordset;
  } catch (error) {
    console.error('存储过程执行失败:', error);
    throw error;
  }
};

// 关闭连接
const closeConnection = async () => {
  try {
    if (pool) {
      await pool.close();
      pool = null;
      console.log('✅ 数据库连接已关闭');
    }
  } catch (error) {
    console.error('❌ 关闭数据库连接失败:', error);
    throw error;
  }
};

module.exports = {
  sql,
  connectDB,
  getPool,
  executeQuery,
  executeProcedure,
  closeConnection,
  config
};

const sql = require('mssql');

const thirdPartyConfig = {
  user: process.env.THIRD_DB_USER,
  password: process.env.THIRD_DB_PASSWORD,
  server: process.env.THIRD_DB_SERVER,
  database: process.env.THIRD_DB_DATABASE,
  options: {
    encrypt: process.env.THIRD_DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.THIRD_DB_TRUST_CERTIFICATE === 'true',
    enableArithAbort: true,
    requestTimeout: parseInt(process.env.THIRD_DB_REQUEST_TIMEOUT || '30000', 10),
    connectionTimeout: parseInt(process.env.THIRD_DB_CONNECTION_TIMEOUT || '30000', 10)
  },
  pool: {
    max: parseInt(process.env.THIRD_DB_POOL_MAX || '10', 10),
    min: 0,
    idleTimeoutMillis: 30000
  }
};

if (
  thirdPartyConfig.password &&
  thirdPartyConfig.password.startsWith('"') &&
  thirdPartyConfig.password.endsWith('"')
) {
  thirdPartyConfig.password = thirdPartyConfig.password.slice(1, -1);
}

let thirdPartyPool;

function normalizeQuery(query) {
  return query
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--.*$/gm, ' ')
    .trim();
}

function validateReadOnlyQuery(query) {
  if (!query || typeof query !== 'string') {
    throw new Error('第三方数据库查询语句不能为空');
  }

  const normalized = normalizeQuery(query);
  if (!normalized) {
    throw new Error('第三方数据库查询语句不能为空');
  }

  const strippedTrailingSemicolon = normalized.replace(/;+\s*$/, '').trim();
  if (strippedTrailingSemicolon.includes(';')) {
    throw new Error('第三方数据库只读查询不允许多语句执行');
  }

  if (!/^(select|with)\b/i.test(strippedTrailingSemicolon)) {
    throw new Error('第三方数据库只读查询仅允许 SELECT 语句');
  }

  const forbiddenDmlPattern = /\b(insert|update|delete|merge|truncate)\b/i;
  if (forbiddenDmlPattern.test(strippedTrailingSemicolon)) {
    throw new Error('第三方数据库禁止增删改等写操作（DML）');
  }

  const forbiddenDdlPattern = /\b(alter|drop|create|grant|revoke|deny)\b/i;
  if (forbiddenDdlPattern.test(strippedTrailingSemicolon)) {
    throw new Error('第三方数据库禁止结构或权限变更操作（DDL/DCL）');
  }

  const forbiddenExecPattern = /\b(exec|execute)\b/i;
  if (forbiddenExecPattern.test(strippedTrailingSemicolon)) {
    throw new Error('第三方数据库禁止执行存储过程或动态命令');
  }

  const forbiddenSelectIntoPattern = /\bselect\b[\s\S]*\binto\b/i;
  if (forbiddenSelectIntoPattern.test(strippedTrailingSemicolon)) {
    throw new Error('第三方数据库禁止 SELECT INTO 写入操作');
  }
}

async function assertThirdPartyReadOnly(pool) {
  const result = await pool.request().query(`
    SELECT
      DB_NAME() AS CurrentDatabase,
      CAST(DATABASEPROPERTYEX(DB_NAME(), 'Updateability') AS NVARCHAR(20)) AS Updateability
  `);

  const row = result.recordset && result.recordset[0] ? result.recordset[0] : {};
  const currentDatabase = row.CurrentDatabase || 'Unknown';
  const updateability = row.Updateability || 'Unknown';

  if (currentDatabase === 'JZCIS' && updateability !== 'READ_ONLY') {
    throw new Error(`第三方数据库 ${currentDatabase} 必须为只读模式，当前为 ${updateability}`);
  }

  const enforceReadOnly = (process.env.THIRD_DB_ENFORCE_READ_ONLY || 'true').toLowerCase() === 'true';
  if (enforceReadOnly && updateability !== 'READ_ONLY') {
    throw new Error(`第三方数据库必须为只读模式，当前数据库 ${currentDatabase} 为 ${updateability}`);
  }
}

async function connectThirdPartyDB() {
  if (thirdPartyPool) {
    return thirdPartyPool;
  }

  thirdPartyPool = await new sql.ConnectionPool(thirdPartyConfig).connect();
  await assertThirdPartyReadOnly(thirdPartyPool);
  console.log('✅ 第三方只读数据库连接成功');
  return thirdPartyPool;
}

async function executeThirdPartyReadQuery(query, params = []) {
  validateReadOnlyQuery(query);

  const pool = await connectThirdPartyDB();
  const request = pool.request();

  params.forEach((param, index) => {
    const name = param.name || `param${index}`;
    if (param.type) {
      request.input(name, param.type, param.value);
    } else {
      request.input(name, param.value);
    }
  });

  const result = await request.query(query);
  return result.recordset || [];
}


async function closeThirdPartyConnection() {
  if (thirdPartyPool) {
    await thirdPartyPool.close();
    thirdPartyPool = null;
    console.log('✅ 第三方只读数据库连接已关闭');
  }
}

module.exports = {
  sql,
  thirdPartyConfig,
  connectThirdPartyDB,
  executeThirdPartyReadQuery,
  closeThirdPartyConnection
};

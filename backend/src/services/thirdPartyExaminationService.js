const fs = require('fs');
const path = require('path');
const { executeThirdPartyReadQuery } = require('../../config/thirdPartyDatabase');

let instrumentConfig = { instrumentQueries: {} };
try {
  const configPath = path.join(__dirname, '../../config/instrument-config.json');
  instrumentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
  console.error('加载仪器室配置失败:', error.message);
}

function isValidTableName(tableName) {
  return /^[a-zA-Z0-9_]+$/.test(tableName);
}

function isValidIdentityCard(identityCard) {
  // 支持标准18位身份证号，末尾可能带B后缀（JZCIS系统格式）
  return /^\d{17}[\dXx]B?$/.test(identityCard);
}

async function getExaminationDate(studyId) {
  const result = await executeThirdPartyReadQuery(
    `
      SELECT CONVERT(varchar(19), JCXX.CYRQ, 120) AS 体检日期
      FROM JCXX
      WHERE ID = @studyId
    `,
    [{ name: 'studyId', value: studyId }]
  );

  return result.length > 0 ? result[0].体检日期 : null;
}

async function getExaminationIds(identityCard) {
  if (!isValidIdentityCard(identityCard)) {
    throw new Error('无效的身份证号码格式');
  }

  // 去掉末尾可能的B后缀，得到纯身份证号
  const bareId = identityCard.replace(/B$/i, '');
  const idWithB = bareId + 'B';

  const result = await executeThirdPartyReadQuery(
    `
      SELECT JCXX.ID, JCXX.CYRQ
      FROM JCXX
      WHERE (SFZH = @sfzh OR SFZH = @sfzhB)
        AND SFBJ = 1
        AND LEN(CAST(ISNULL(JCXX.YCXM, '') AS VARCHAR(8000))) > 0
      ORDER BY JCXX.CYRQ DESC
    `,
    [
      { name: 'sfzh', value: bareId },
      { name: 'sfzhB', value: idWithB }
    ]
  );

  return result.map((row) => row.ID);
}

async function getDepartmentCodes(studyId) {
  const result = await executeThirdPartyReadQuery(
    `
      SELECT STUFF((
          SELECT '+' + KSBM + 'B'
          FROM (
              SELECT DISTINCT s.KSBM
              FROM SFXM s
              WHERE s.SFXMDM IN (
                  SELECT DISTINCT s2.SFXMDM
                  FROM SFXM s2
                  WHERE CHARINDEX(
                      s2.SFXMDM,
                      (SELECT CAST(YCXM AS VARCHAR(8000)) FROM JCXX WHERE ID = @studyId)
                  ) > 0
              )
          ) AS temp
          ORDER BY KSBM
          FOR XML PATH('')
      ), 1, 1, '') AS KSBM_LIST
    `,
    [{ name: 'studyId', value: studyId }]
  );

  const codeString = result.length > 0 ? result[0].KSBM_LIST : null;
  if (!codeString || typeof codeString !== 'string') {
    return [];
  }

  return codeString.split('+').filter((code) => code && code.trim() !== '');
}

async function queryLaboratory(studyId) {
  const [data, tjrq] = await Promise.all([
    executeThirdPartyReadQuery(
      `
        SELECT SFXM.SFXMMC, JCMXX.XXMC, HYB.CheckDate, HYB.CheckTime,
               HYB.ItemResult, HYB.ItemUnit, HYB.Flag, HYB.DefValue, HYB.Doctor
        FROM HYB
        FULL JOIN SFXM ON SFXM.SFXMDM = HYB.SFXMDM
        FULL JOIN JCMXX ON JCMXX.XXDM = HYB.XXDM
        WHERE StudyID = @studyId
      `,
      [{ name: 'studyId', value: studyId }]
    ),
    getExaminationDate(studyId)
  ]);

  return {
    code: 200,
    message: '查询成功',
    data,
    tjrq
  };
}

async function ensureDepartmentCodeInWhitelist(studyId, ksbm) {
  const allowedCodes = await getDepartmentCodes(studyId);
  if (!allowedCodes.includes(ksbm)) {
    throw new Error(`科室编码 ${ksbm} 不在体检ID ${studyId} 的白名单中`);
  }
}

async function queryGeneral(studyId, ksbm) {
  if (!isValidTableName(ksbm)) {
    throw new Error('无效参数！ksbm 必须合法');
  }

  await ensureDepartmentCodeInWhitelist(studyId, ksbm);

  const [xxMapRows, doctorRows, tjrq] = await Promise.all([
    executeThirdPartyReadQuery(
      `
        SELECT DISTINCT n.XXDM, j.XXMC
        FROM ${ksbm} n
        INNER JOIN JCMXX j ON n.XXDM = j.XXDM
        WHERE n.StudyID = @studyId
      `,
      [{ name: 'studyId', value: studyId }]
    ),
    executeThirdPartyReadQuery(
      `
        SELECT TOP 1 Doctor AS 医生
        FROM ${ksbm}
        WHERE StudyID = @studyId
      `,
      [{ name: 'studyId', value: studyId }]
    ),
    getExaminationDate(studyId)
  ]);

  let data = [];
  if (xxMapRows.length > 0) {
    const selectCols = xxMapRows
      .map((row) => `MAX(CASE WHEN n.XXDM = '${String(row.XXDM).replace(/'/g, "''")}' THEN n.CValue END) AS [${String(row.XXMC).replace(/]/g, ']]')}]`)
      .join(', ');

    data = await executeThirdPartyReadQuery(
      `
        SELECT StudyID, ${selectCols}
        FROM ${ksbm} n
        WHERE n.StudyID = @studyId
        GROUP BY n.StudyID
      `,
      [{ name: 'studyId', value: studyId }]
    );
  }

  return {
    code: 200,
    message: '查询成功',
    data,
    医生: doctorRows.length > 0 ? doctorRows[0].医生 : null,
    tjrq
  };
}

async function queryImaging(studyId, ksbm = 'USB') {
  if (!isValidTableName(ksbm)) {
    throw new Error('无效参数！ksbm 必须合法');
  }

  await ensureDepartmentCodeInWhitelist(studyId, ksbm);

  const [rows, tjrq] = await Promise.all([
    executeThirdPartyReadQuery(
      `
        SELECT StudyID, MValue AS 检查结果, Doctor AS 医生, XXDM
        FROM ${ksbm}
        WHERE StudyID = @studyId
      `,
      [{ name: 'studyId', value: studyId }]
    ),
    getExaminationDate(studyId)
  ]);

  const data = rows.map((row) => {
    const mapped = {
      StudyID: row.StudyID,
      医生: row.医生
    };

    if (row.XXDM === '000003') {
      mapped.检查结论 = row.检查结果;
    } else if (row.XXDM === '000004') {
      mapped.检查描述 = row.检查结果;
    } else {
      mapped.检查结果 = row.检查结果;
      mapped.XXDM = row.XXDM;
    }

    return mapped;
  });

  return {
    code: 200,
    message: '查询成功',
    data,
    tjrq
  };
}

async function queryInstrument(studyId, ksbm) {
  const queryConfig = instrumentConfig.instrumentQueries[ksbm];
  if (!queryConfig) {
    throw new Error(`不支持的仪器室类型: ${ksbm}，支持的类型: ${Object.keys(instrumentConfig.instrumentQueries).join(', ')}`);
  }

  await ensureDepartmentCodeInWhitelist(studyId, ksbm);

  if (!isValidTableName(queryConfig.tableName) || !isValidTableName(queryConfig.resultField)) {
    throw new Error('仪器室配置不合法');
  }

  const [rows, tjrq] = await Promise.all([
    executeThirdPartyReadQuery(
      `
        SELECT ${queryConfig.resultField} AS 检查结果, Doctor AS 医生
        FROM ${queryConfig.tableName}
        WHERE StudyID = @studyId
          AND XXDM = @xxdm
      `,
      [
        { name: 'studyId', value: studyId },
        { name: 'xxdm', value: queryConfig.defaultXXDM }
      ]
    ),
    getExaminationDate(studyId)
  ]);

  const data = rows.map((row) => ({
    StudyID: studyId,
    检查结果: row.检查结果,
    医生: row.医生
  }));

  return {
    code: 200,
    message: '查询成功',
    data,
    tjrq
  };
}

module.exports = {
  isValidIdentityCard,
  isValidTableName,
  getExaminationIds,
  getDepartmentCodes,
  getExaminationDate,
  queryLaboratory,
  queryGeneral,
  queryImaging,
  queryInstrument,
  getSupportedInstrumentTypes() {
    return Object.keys(instrumentConfig.instrumentQueries || {});
  }
};

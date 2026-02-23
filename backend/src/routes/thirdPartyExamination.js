const express = require('express');
const thirdPartyExaminationService = require('../services/thirdPartyExaminationService');

const router = express.Router();

function success(res, payload) {
  return res.json(payload);
}

function badRequest(res, message) {
  return res.status(400).json({
    code: 400,
    message,
    data: null
  });
}

function tableNotFound(error) {
  return Boolean(
    error &&
    error.originalError &&
    error.originalError.info &&
    typeof error.originalError.info.message === 'string' &&
    error.originalError.info.message.includes('Invalid object name')
  );
}

function serverError(res, message = '内部服务器错误', extra = {}) {
  return res.status(500).json({
    code: 500,
    message,
    data: null,
    ...extra
  });
}

router.get('/examination-ids/:sfzh', async (req, res) => {
  try {
    const { sfzh } = req.params;

    if (!thirdPartyExaminationService.isValidIdentityCard(sfzh)) {
      return badRequest(res, '无效的身份证号码格式');
    }

    const data = await thirdPartyExaminationService.getExaminationIds(sfzh);
    return success(res, {
      code: 200,
      message: '查询成功',
      data
    });
  } catch (error) {
    console.error('获取体检号失败:', error);
    return serverError(res);
  }
});

router.post('/get_ksbm', async (req, res) => {
  try {
    const { studyId } = req.body;

    if (!studyId) {
      return badRequest(res, '无效参数！studyId 不能为空');
    }

    const codes = await thirdPartyExaminationService.getDepartmentCodes(studyId);
    const data = codes.length > 0 ? codes.join('+') : null;

    return success(res, {
      code: 200,
      message: '查询成功',
      data
    });
  } catch (error) {
    console.error('获取科室编码失败:', error);
    return serverError(res, '查询失败');
  }
});

router.post('/get_tjrq', async (req, res) => {
  try {
    const { studyId } = req.body;

    if (!studyId) {
      return badRequest(res, '无效参数！studyId 不能为空');
    }

    const data = await thirdPartyExaminationService.getExaminationDate(studyId);
    return success(res, {
      code: 200,
      message: '查询成功',
      data
    });
  } catch (error) {
    console.error('获取体检日期失败:', error);
    return serverError(res, '查询失败');
  }
});

router.post('/query_laboratory', async (req, res) => {
  try {
    const { studyId } = req.body;

    if (!studyId) {
      return badRequest(res, '无效参数！studyId 不能为空');
    }

    const result = await thirdPartyExaminationService.queryLaboratory(studyId);
    return success(res, result);
  } catch (error) {
    console.error('查询检验科失败:', error);
    return serverError(res, '内部服务器错误', { tjrq: null });
  }
});

router.post('/query_cgks', async (req, res) => {
  try {
    const { studyId, ksbm } = req.body;

    if (!studyId || !ksbm) {
      return badRequest(res, '无效参数！studyId 和 ksbm 不能为空');
    }

    if (!thirdPartyExaminationService.isValidTableName(ksbm)) {
      return badRequest(res, '无效参数！ksbm 必须合法');
    }

    const result = await thirdPartyExaminationService.queryGeneral(studyId, ksbm);
    return success(res, result);
  } catch (error) {
    if (tableNotFound(error)) {
      return badRequest(res, `表 ${req.body.ksbm} 无效或不存在`);
    }

    if (error.message && error.message.includes('白名单')) {
      return badRequest(res, error.message);
    }

    console.error('查询常规科室失败:', error);
    return serverError(res, '内部服务器错误', { 医生: null, tjrq: null });
  }
});

router.post('/query_yxk', async (req, res) => {
  try {
    const { studyId, ksbm = 'USB' } = req.body;

    if (!studyId) {
      return badRequest(res, '无效参数！studyId 不能为空');
    }

    if (!thirdPartyExaminationService.isValidTableName(ksbm)) {
      return badRequest(res, '无效参数！ksbm 必须合法');
    }

    const result = await thirdPartyExaminationService.queryImaging(studyId, ksbm);
    return success(res, result);
  } catch (error) {
    if (tableNotFound(error)) {
      return badRequest(res, `表 ${req.body.ksbm} 无效或不存在`);
    }

    if (error.message && error.message.includes('白名单')) {
      return badRequest(res, error.message);
    }

    console.error('查询影像科失败:', error);
    return serverError(res, '内部服务器错误', { tjrq: null });
  }
});

router.post('/query_instrument', async (req, res) => {
  try {
    const { studyId, ksbm } = req.body;

    if (!studyId || !ksbm) {
      return badRequest(res, '无效参数！studyId 和 ksbm 不能为空');
    }

    const result = await thirdPartyExaminationService.queryInstrument(studyId, ksbm);
    return success(res, result);
  } catch (error) {
    if (tableNotFound(error)) {
      return badRequest(res, `表 ${req.body.ksbm} 无效或不存在`);
    }

    if (error.message && error.message.includes('不支持的仪器室类型')) {
      const supported = thirdPartyExaminationService.getSupportedInstrumentTypes();
      return badRequest(res, `${error.message}`.includes('支持的类型')
        ? error.message
        : `不支持的仪器室类型: ${req.body.ksbm}，支持的类型: ${supported.join(', ')}`);
    }

    if (error.message && error.message.includes('白名单')) {
      return badRequest(res, error.message);
    }

    console.error('查询仪器室失败:', error);
    return serverError(res, '内部服务器错误', { tjrq: null });
  }
});

module.exports = router;

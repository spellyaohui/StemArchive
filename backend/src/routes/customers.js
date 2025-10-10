const express = require('express');
const router = express.Router();
const CustomerController = require('../controllers/customerController');
const { body, param, query, validationResult } = require('express-validator');
const { validateIdentityCard, checkDuplicateIdentityCard } = require('../middleware/customerValidation');

// 验证中间件
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'Error',
      message: '输入验证失败',
      errors: errors.array()
    });
  }
  next();
};

// 创建客户
router.post('/',
  validateIdentityCard,
  checkDuplicateIdentityCard,
  [
    body('identityCard')
      .isLength({ min: 15, max: 18 })
      .withMessage('身份证号长度应为15-18位'),
    body('name')
      .notEmpty()
      .withMessage('姓名不能为空')
      .isLength({ max: 50 })
      .withMessage('姓名长度不能超过50个字符'),
    body('gender')
      .isIn(['男', '女', '其他'])
      .withMessage('性别必须为男、女或其他'),
    body('age')
      .optional()
      .isInt({ min: 0, max: 150 })
      .withMessage('年龄必须在0-150之间'),
    body('height')
      .optional()
      .isFloat({ min: 50, max: 250 })
      .withMessage('身高必须在50-250cm之间'),
    body('weight')
      .optional()
      .isFloat({ min: 20, max: 300 })
      .withMessage('体重必须在20-300kg之间'),
    body('phone')
      .optional()
      .matches(/^[0-9]{11}$/)
      .withMessage('请输入11位手机号'),
    body('contactPersonPhone')
      .optional()
      .matches(/^[0-9]{11}$/)
      .withMessage('请输入11位联系人手机号')
  ],
  validateRequest,
  CustomerController.create
);

// 获取客户列表
router.get('/',
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('页码必须为正整数'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('每页数量必须在1-100之间')
  ],
  validateRequest,
  CustomerController.getAll
);

// 搜索客户
router.get('/search',
  [
    query('query')
      .notEmpty()
      .withMessage('搜索关键词不能为空')
      .isLength({ min: 1, max: 100 })
      .withMessage('搜索关键词长度必须在1-100之间'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('页码必须为正整数'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('每页数量必须在1-100之间')
  ],
  validateRequest,
  CustomerController.search
);

// 获取客户统计信息
router.get('/statistics',
  CustomerController.getStatistics
);

// 获取可创建干细胞档案的客户列表
router.get('/available-for-stem-cell',
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('页码必须为正整数'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('每页数量必须在1-100之间')
  ],
  validateRequest,
  CustomerController.getAvailableForStemCell
);

// 根据身份证号获取客户
router.get('/identity/:identityCard',
  [
    param('identityCard')
      .isLength({ min: 15, max: 18 })
      .withMessage('身份证号长度应为15-18位')
  ],
  validateRequest,
  CustomerController.getByIdentityCard
);

// 获取今日新增体检检客（必须放在 /:id 路由之前）
router.get('/today-health-checks',
  CustomerController.getTodayHealthChecks
);

// 根据ID获取客户详情
router.get('/:id',
  [
    param('id')
      .isUUID()
      .withMessage('客户ID格式不正确')
  ],
  validateRequest,
  CustomerController.getById
);

// 获取客户完整信息（包含干细胞治疗记录）
router.get('/:id/full-info',
  [
    param('id')
      .isUUID()
      .withMessage('客户ID格式不正确')
  ],
  validateRequest,
  CustomerController.getFullInfo
);

// 更新客户信息
router.put('/:id',
  [
    param('id')
      .isUUID()
      .withMessage('客户ID格式不正确'),
    body('name')
      .optional()
      .notEmpty()
      .withMessage('姓名不能为空')
      .isLength({ max: 50 })
      .withMessage('姓名长度不能超过50个字符'),
    body('gender')
      .optional()
      .isIn(['男', '女', '其他'])
      .withMessage('性别必须为男、女或其他'),
    body('age')
      .optional()
      .isInt({ min: 0, max: 150 })
      .withMessage('年龄必须在0-150之间'),
    body('height')
      .optional()
      .isFloat({ min: 50, max: 250 })
      .withMessage('身高必须在50-250cm之间'),
    body('weight')
      .optional()
      .isFloat({ min: 20, max: 300 })
      .withMessage('体重必须在20-300kg之间'),
    body('phone')
      .optional()
      .matches(/^[0-9]{11}$/)
      .withMessage('请输入11位手机号'),
    body('contactPersonPhone')
      .optional()
      .matches(/^[0-9]{11}$/)
      .withMessage('请输入11位联系人手机号')
  ],
  validateRequest,
  CustomerController.update
);

// 删除客户（软删除）
router.delete('/:id',
  [
    param('id')
      .isUUID()
      .withMessage('客户ID格式不正确')
  ],
  validateRequest,
  CustomerController.delete
);

// 更新客户最后体检日期
router.patch('/last-health-check/:identityCard',
  [
    param('identityCard')
      .notEmpty()
      .withMessage('身份证号不能空'),
    body('checkDate')
      .isISO8601()
      .withMessage('体检日期格式不正确')
      .toDate()
  ],
  validateRequest,
  CustomerController.updateLastHealthCheckDate
);

module.exports = router;
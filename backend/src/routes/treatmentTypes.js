const express = require('express');
const router = express.Router();
const TreatmentTypeController = require('../controllers/treatmentTypeController');
const { body, param, query, validationResult } = require('express-validator');

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

// 获取所有治疗类型
router.get('/',
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('页码必须为正整数'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('每页数量必须在1-100之间'),
    query('search')
      .optional()
      .isLength({ max: 100 })
      .withMessage('搜索关键词长度不能超过100个字符')
  ],
  validateRequest,
  TreatmentTypeController.getAll
);

// 获取治疗类型统计
router.get('/statistics',
  [
    query('dateFrom')
      .optional()
      .isISO8601()
      .withMessage('开始日期格式不正确'),
    query('dateTo')
      .optional()
      .isISO8601()
      .withMessage('结束日期格式不正确')
  ],
  validateRequest,
  TreatmentTypeController.getStatistics
);

// 创建治疗类型
router.post('/',
  [
    body('treatmentType')
      .notEmpty()
      .withMessage('治疗类型名称不能为空')
      .isLength({ max: 100 })
      .withMessage('治疗类型名称长度不能超过100个字符'),
    body('planName')
      .optional()
      .isLength({ max: 200 })
      .withMessage('方案名称长度不能超过200个字符'),
    body('diseaseType')
      .optional()
      .isLength({ max: 200 })
      .withMessage('疾病类型长度不能超过200个字符'),
    body('description')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('描述长度不能超过2000个字符'),
    body('keywords')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('关键词长度不能超过1000个字符')
  ],
  validateRequest,
  TreatmentTypeController.create
);

// 更新治疗类型
router.put('/:treatmentType',
  [
    param('treatmentType')
      .notEmpty()
      .withMessage('治疗类型不能为空'),
    body('newTreatmentType')
      .optional()
      .isLength({ max: 100 })
      .withMessage('新治疗类型名称长度不能超过100个字符'),
    body('planName')
      .optional()
      .isLength({ max: 200 })
      .withMessage('方案名称长度不能超过200个字符'),
    body('diseaseType')
      .optional()
      .isLength({ max: 200 })
      .withMessage('疾病类型长度不能超过200个字符'),
    body('description')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('描述长度不能超过2000个字符'),
    body('keywords')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('关键词长度不能超过1000个字符'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('状态值必须为布尔值')
  ],
  validateRequest,
  TreatmentTypeController.update
);

// 删除治疗类型
router.delete('/:treatmentType',
  [
    param('treatmentType')
      .notEmpty()
      .withMessage('治疗类型不能为空')
  ],
  validateRequest,
  TreatmentTypeController.delete
);

module.exports = router;
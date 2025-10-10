const express = require('express');
const router = express.Router();
const DiseaseTypeController = require('../controllers/diseaseTypeController');
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

// 获取所有疾病类型
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
      .withMessage('搜索关键词长度不能超过100个字符'),
    query('isActive')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('状态值必须为true或false')
  ],
  validateRequest,
  DiseaseTypeController.getAll
);

// 获取疾病类型统计
router.get('/statistics',
  DiseaseTypeController.getStatistics
);

// 根据ID获取疾病类型
router.get('/:id',
  [
    param('id')
      .isUUID()
      .withMessage('ID格式不正确')
  ],
  validateRequest,
  DiseaseTypeController.getById
);

// 创建疾病类型
router.post('/',
  [
    body('diseaseName')
      .notEmpty()
      .withMessage('疾病类型名称不能为空')
      .isLength({ max: 200 })
      .withMessage('疾病类型名称长度不能超过200个字符'),
    body('category')
      .optional()
      .isLength({ max: 100 })
      .withMessage('分类长度不能超过100个字符'),
    body('keywords')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('关键词长度不能超过1000个字符'),
    body('description')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('描述长度不能超过2000个字符'),
    body('recommendedTreatment')
      .optional()
      .isLength({ max: 200 })
      .withMessage('推荐治疗长度不能超过200个字符')
  ],
  validateRequest,
  DiseaseTypeController.create
);

// 更新疾病类型
router.put('/:id',
  [
    param('id')
      .isUUID()
      .withMessage('ID格式不正确'),
    body('diseaseName')
      .optional()
      .isLength({ max: 200 })
      .withMessage('疾病类型名称长度不能超过200个字符'),
    body('category')
      .optional()
      .isLength({ max: 100 })
      .withMessage('分类长度不能超过100个字符'),
    body('keywords')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('关键词长度不能超过1000个字符'),
    body('description')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('描述长度不能超过2000个字符'),
    body('recommendedTreatment')
      .optional()
      .isLength({ max: 200 })
      .withMessage('推荐治疗长度不能超过200个字符'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('状态值必须为布尔值'),
    body('sortOrder')
      .optional()
      .isInt({ min: 1 })
      .withMessage('排序值必须为正整数')
  ],
  validateRequest,
  DiseaseTypeController.update
);

// 同步治疗类型到相关的输注排期
router.post('/:id/sync-treatment-type',
  [
    param('id')
      .isUUID()
      .withMessage('ID格式不正确'),
    body('confirm')
      .optional()
      .isBoolean()
      .withMessage('确认参数必须为布尔值')
  ],
  validateRequest,
  DiseaseTypeController.syncTreatmentType
);

// 删除疾病类型
router.delete('/:id',
  [
    param('id')
      .isUUID()
      .withMessage('ID格式不正确')
  ],
  validateRequest,
  DiseaseTypeController.delete
);

module.exports = router;
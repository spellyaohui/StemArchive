const express = require('express');
const router = express.Router();
const StemCellController = require('../controllers/stemCellController');
const { body, param, query, validationResult } = require('express-validator');
const { validateCustomerExists } = require('../middleware/customerValidation');

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

// 创建干细胞患者档案
router.post('/patients',
  validateCustomerExists('StemCell', 'customerId'),
  [
    body('customerId')
      .isUUID()
      .withMessage('客户ID格式不正确'),
    body('diseaseTypes')
      .optional()
      .isArray()
      .withMessage('疾病类型必须是数组格式'),
    body('primaryDiagnosis')
      .optional()
      .isLength({ max: 500 })
      .withMessage('主要诊断长度不能超过500个字符'),
    body('treatmentPlan')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('治疗方案长度不能超过1000个字符'),
    body('treatmentCycleYears')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('治疗周期必须在1-10年之间'),
    body('initialFrequencyMonths')
      .optional()
      .isInt({ min: 1, max: 12 })
      .withMessage('初始频率必须在1-12个月之间'),
    body('initialCount')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('初始次数必须在1-10次之间'),
    body('followUpFrequencyMonths')
      .optional()
      .isInt({ min: 1, max: 24 })
      .withMessage('后续频率必须在1-24个月之间')
  ],
  validateRequest,
  StemCellController.createPatient
);

// 获取所有患者档案
router.get('/patients',
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('页码必须为正整数'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('每页数量必须在1-100之间'),
    query('status')
      .optional()
      .isIn(['Active', 'Completed', 'Suspended', '进行中', 'Inactive'])
      .withMessage('状态必须为Active、Completed、Suspended、进行中或Inactive')
  ],
  validateRequest,
  StemCellController.getAllPatients
);

// 根据客户ID获取患者档案
router.get('/patients/customer/:customerId',
  [
    param('customerId')
      .isUUID()
      .withMessage('客户ID格式不正确')
  ],
  validateRequest,
  StemCellController.getPatientByCustomerId
);

// 根据患者编号获取档案
router.get('/patients/number/:patientNumber',
  [
    param('patientNumber')
      .notEmpty()
      .withMessage('患者编号不能为空')
      .isLength({ min: 5, max: 20 })
      .withMessage('患者编号长度必须在5-20个字符之间')
  ],
  validateRequest,
  StemCellController.getPatientByNumber
);

// 根据ID获取患者档案
router.get('/patients/:id',
  [
    param('id')
      .isUUID()
      .withMessage('患者ID格式不正确')
  ],
  validateRequest,
  StemCellController.getPatientById
);

// 更新患者档案
router.put('/patients/:id',
  [
    param('id')
      .isUUID()
      .withMessage('患者ID格式不正确'),
    body('diseaseTypes')
      .optional()
      .isArray({ min: 1 })
      .withMessage('疾病类型不能为空'),
    body('primaryDiagnosis')
      .optional()
      .isLength({ max: 500 })
      .withMessage('主要诊断长度不能超过500个字符'),
    body('treatmentPlan')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('治疗方案长度不能超过1000个字符'),
    body('treatmentCycleYears')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('治疗周期必须在1-10年之间'),
    body('initialFrequencyMonths')
      .optional()
      .isInt({ min: 1, max: 12 })
      .withMessage('初始频率必须在1-12个月之间'),
    body('initialCount')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('初始次数必须在1-10次之间'),
    body('followUpFrequencyMonths')
      .optional()
      .isInt({ min: 1, max: 24 })
      .withMessage('后续频率必须在1-24个月之间')
  ],
  validateRequest,
  StemCellController.updatePatient
);

// 根据病种查找患者
router.get('/patients/disease/:diseaseType',
  [
    param('diseaseType')
      .notEmpty()
      .withMessage('病种类型不能为空'),
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
  StemCellController.getPatientsByDiseaseType
);

// 删除干细胞患者档案
router.delete('/patients/:id',
  [
    param('id')
      .isUUID()
      .withMessage('患者ID格式不正确')
  ],
  validateRequest,
  StemCellController.deletePatient
);

// 创建输注排期
router.post('/schedules',
  [
    body('patientId')
      .isUUID()
      .withMessage('患者ID格式不正确'),
    body('scheduleDate')
      .isISO8601()
      .withMessage('排期日期格式不正确')
      .custom(value => {
        const date = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date < today) {
          throw new Error('排期日期不能早于今天');
        }
        return true;
      }),
    body('scheduleType')
      .isIn(['首次', '再次'])
      .withMessage('排期类型必须为首次或再次'),
    body('treatmentType')
      .isIn(['NK', 'MSC', '2MSC', '膝关节靶向注射'])
      .withMessage('治疗类型必须为NK、MSC、2MSC或膝关节靶向注射'),
    body('infusionCount')
      .isInt({ min: 1, max: 20 })
      .withMessage('回输次数必须在1-20之间'),
    body('doctor')
      .optional()
      .isLength({ max: 50 })
      .withMessage('医生姓名长度不能超过50个字符'),
    body('nurse')
      .optional()
      .isLength({ max: 50 })
      .withMessage('护士姓名长度不能超过50个字符'),
    body('notes')
      .optional()
      .isLength({ max: 500 })
      .withMessage('备注长度不能超过500个字符')
  ],
  validateRequest,
  StemCellController.createInfusionSchedule
);

// 获取输注排期列表
router.get('/schedules',
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('页码必须为正整数'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('每页数量必须在1-100之间'),
    query('dateFrom')
      .optional()
      .isISO8601()
      .withMessage('开始日期格式不正确'),
    query('dateTo')
      .optional()
      .isISO8601()
      .withMessage('结束日期格式不正确'),
    query('status')
      .optional()
      .isIn(['Scheduled', 'Completed', 'Cancelled', 'Rescheduled', 'In Progress'])
      .withMessage('状态值不正确')
  ],
  validateRequest,
  StemCellController.getInfusionSchedules
);

// 获取患者输注排期
router.get('/schedules/patient/:patientId',
  [
    param('patientId')
      .isUUID()
      .withMessage('患者ID格式不正确'),
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
  StemCellController.getPatientInfusionSchedules
);

// 获取今日排期
router.get('/schedules/today',
  StemCellController.getTodaySchedules
);

// 获取即将到来的排期
router.get('/schedules/upcoming',
  [
    query('days')
      .optional()
      .isInt({ min: 1, max: 30 })
      .withMessage('天数必须在1-30之间')
  ],
  validateRequest,
  StemCellController.getUpcomingSchedules
);

// 完成输注
router.put('/schedules/:id/complete',
  [
    param('id')
      .isUUID()
      .withMessage('排期ID格式不正确'),
    body('doctor')
      .optional()
      .isLength({ max: 50 })
      .withMessage('医生姓名长度不能超过50个字符'),
    body('nurse')
      .optional()
      .isLength({ max: 50 })
      .withMessage('护士姓名长度不能超过50个字符'),
    body('notes')
      .optional()
      .isLength({ max: 500 })
      .withMessage('备注长度不能超过500个字符')
  ],
  validateRequest,
  StemCellController.completeInfusion
);

// 重新安排排期
router.put('/schedules/:id/reschedule',
  [
    param('id')
      .isUUID()
      .withMessage('排期ID格式不正确'),
    body('newDate')
      .isISO8601()
      .withMessage('新日期格式不正确')
      .custom(value => {
        const date = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date < today) {
          throw new Error('新排期日期不能早于今天');
        }
        return true;
      }),
    body('notes')
      .optional()
      .isLength({ max: 500 })
      .withMessage('备注长度不能超过500个字符')
  ],
  validateRequest,
  StemCellController.rescheduleInfusion
);

// 取消排期
router.put('/schedules/:id/cancel',
  [
    param('id')
      .isUUID()
      .withMessage('排期ID格式不正确'),
    body('reason')
      .optional()
      .isLength({ max: 500 })
      .withMessage('取消原因长度不能超过500个字符')
  ],
  validateRequest,
  StemCellController.cancelInfusion
);

// 删除排期
router.delete('/schedules/:id',
  [
    param('id')
      .isUUID()
      .withMessage('排期ID格式不正确')
  ],
  validateRequest,
  StemCellController.deleteInfusionSchedule
);

// 获取治疗统计
router.get('/statistics',
  [
    query('dateFrom')
      .optional()
      .isISO8601()
      .withMessage('开始日期格式不正确'),
    query('dateTo')
      .optional()
      .isISO8601()
      .withMessage('结束日期格式不正确'),
    query('year')
      .optional()
      .isInt({ min: 2020, max: 2030 })
      .withMessage('年份必须在2020-2030之间'),
    query('type')
      .optional()
      .isIn(['general', 'monthly', 'treatmentType'])
      .withMessage('统计类型必须为general、monthly或treatmentType')
  ],
  validateRequest,
  StemCellController.getTreatmentStatistics
);

// 获取干细胞管理页面统计数据
router.get('/dashboard/statistics',
  StemCellController.getStemCellStatistics
);

module.exports = router;
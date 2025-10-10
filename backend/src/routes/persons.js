const express = require('express');
const router = express.Router();
const PersonController = require('../controllers/personController');
const PersonService = require('../services/personService');
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

// 获取所有人员档案列表（根路由）
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
    PersonController.getAllPersons
);

// 获取人员完整档案（根据身份证号）
router.get('/profile/:identityCard',
    [
        param('identityCard')
            .isLength({ min: 15, max: 18 })
            .withMessage('身份证号长度应为15-18位')
            .matches(/^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/)
            .withMessage('身份证号格式不正确')
    ],
    validateRequest,
    PersonController.getPersonFullProfile
);

// 获取人员档案摘要（根据身份证号）
router.get('/summary/:identityCard',
    [
        param('identityCard')
            .isLength({ min: 15, max: 18 })
            .withMessage('身份证号长度应为15-18位')
            .matches(/^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/)
            .withMessage('身份证号格式不正确')
    ],
    validateRequest,
    PersonController.getPersonSummary
);

// 创建或更新人员信息
router.post('/profile',
    [
        body('identityCard')
            .isLength({ min: 15, max: 18 })
            .withMessage('身份证号长度应为15-18位')
            .matches(/^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/)
            .withMessage('身份证号格式不正确'),
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
            .matches(/^1[3-9]\d{9}$/)
            .withMessage('手机号格式不正确'),
        body('contactPersonPhone')
            .optional()
            .matches(/^1[3-9]\d{9}$/)
            .withMessage('联系人手机号格式不正确')
    ],
    validateRequest,
    PersonController.createOrUpdatePerson
);

// 搜索人员（根据身份证号）
router.get('/search',
    [
        query('identityCard')
            .notEmpty()
            .withMessage('搜索关键词不能为空')
            .isLength({ min: 4, max: 18 })
            .withMessage('搜索关键词长度必须在4-18之间'),
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
    PersonController.searchPersons
);

// 获取人员档案列表
router.get('/list',
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
    PersonController.getPersonProfiles
);

// 删除人员档案
router.delete('/profile/:identityCard',
    [
        param('identityCard')
            .isLength({ min: 15, max: 18 })
            .withMessage('身份证号长度应为15-18位')
            .matches(/^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/)
            .withMessage('身份证号格式不正确')
    ],
    validateRequest,
    PersonController.deletePersonProfile
);

// 批量导入人员数据
router.post('/batch-import',
    [
        body('persons')
            .isArray({ min: 1 })
            .withMessage('请提供人员数据数组'),
        body('persons.*.identityCard')
            .isLength({ min: 15, max: 18 })
            .withMessage('身份证号长度应为15-18位')
            .matches(/^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/)
            .withMessage('身份证号格式不正确'),
        body('persons.*.name')
            .notEmpty()
            .withMessage('姓名不能为空')
            .isLength({ max: 50 })
            .withMessage('姓名长度不能超过50个字符'),
        body('persons.*.gender')
            .isIn(['男', '女', '其他'])
            .withMessage('性别必须为男、女或其他')
    ],
    validateRequest,
    PersonController.batchImportPersons
);

// 获取人员档案统计
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
    PersonController.getPersonStatistics
);

// 验证身份证号是否存在
router.post('/validate-identity',
    [
        body('identityCard')
            .isLength({ min: 15, max: 18 })
            .withMessage('身份证号长度应为15-18位')
            .matches(/^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/)
            .withMessage('身份证号格式不正确')
    ],
    validateRequest,
    PersonController.validateIdentityCard
);

// 获取人员相关的健康记录
router.get('/health-records/:identityCard',
    [
        param('identityCard')
            .isLength({ min: 15, max: 18 })
            .withMessage('身份证号长度应为15-18位'),
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('页码必须为正整数'),
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('每页数量必须在1-100之间'),
        query('type')
            .optional()
            .isIn(['assessment', 'image', 'all'])
            .withMessage('记录类型必须为assessment、image或all')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { identityCard } = req.params;
            const { page = 1, limit = 20, type = 'all' } = req.query;

            const result = await PersonService.getPersonFullProfile(identityCard);

            if (!result.success) {
                return res.status(404).json({
                    status: 'Error',
                    message: result.message
                });
            }

            let healthRecords = {};

            if (type === 'all' || type === 'assessment') {
                healthRecords.assessments = result.data.healthRecords;
            }

            if (type === 'all' || type === 'image') {
                healthRecords.images = result.data.medicalRecords;
            }

            res.json({
                status: 'Success',
                message: '获取健康记录成功',
                data: healthRecords
            });
        } catch (error) {
            console.error('获取健康记录失败:', error);
            res.status(500).json({
                status: 'Error',
                message: '获取健康记录失败'
            });
        }
    }
);

// 获取人员相关的治疗记录
router.get('/treatment-records/:identityCard',
    [
        param('identityCard')
            .isLength({ min: 15, max: 18 })
            .withMessage('身份证号长度应为15-18位'),
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
    async (req, res) => {
        try {
            const { identityCard } = req.params;
            const { page = 1, limit = 20 } = req.query;

            const result = await PersonService.getPersonFullProfile(identityCard);

            if (!result.success) {
                return res.status(404).json({
                    status: 'Error',
                    message: result.message
                });
            }

            res.json({
                status: 'Success',
                message: '获取治疗记录成功',
                data: {
                    stemCellInfo: result.data.stemCellInfo,
                    treatmentHistory: result.data.treatmentHistory
                }
            });
        } catch (error) {
            console.error('获取治疗记录失败:', error);
            res.status(500).json({
                status: 'Error',
                message: '获取治疗记录失败'
            });
        }
    }
);

// 获取人员相关的报告记录
router.get('/reports/:identityCard',
    [
        param('identityCard')
            .isLength({ min: 15, max: 18 })
            .withMessage('身份证号长度应为15-18位'),
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
    async (req, res) => {
        try {
            const { identityCard } = req.params;
            const { page = 1, limit = 20 } = req.query;

            const result = await PersonService.getPersonFullProfile(identityCard);

            if (!result.success) {
                return res.status(404).json({
                    status: 'Error',
                    message: result.message
                });
            }

            res.json({
                status: 'Success',
                message: '获取报告记录成功',
                data: result.data.reports
            });
        } catch (error) {
            console.error('获取报告记录失败:', error);
            res.status(500).json({
                status: 'Error',
                message: '获取报告记录失败'
            });
        }
    }
);

module.exports = router;
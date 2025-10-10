const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const AuthService = require('../services/authService');

// 初始化认证系统（确保数据库表和默认用户存在）
AuthService.initialize().catch(console.error);

// 登录
router.post('/login',
    [
        body('username')
            .notEmpty()
            .withMessage('用户名不能为空')
            .isLength({ min: 3, max: 50 })
            .withMessage('用户名长度应在3-50个字符之间'),
        body('password')
            .notEmpty()
            .withMessage('密码不能为空')
            .isLength({ min: 6 })
            .withMessage('密码长度至少6个字符'),
        body('rememberMe')
            .optional()
            .isBoolean()
            .withMessage('记住我选项必须是布尔值')
    ],
    async (req, res) => {
        try {
            const { username, password, rememberMe = false } = req.body;

            // 验证输入
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    status: 'Error',
                    message: '输入验证失败',
                    errors: errors.array()
                });
            }

            // 调用认证服务
            const result = await AuthService.login(username, password, rememberMe);

            if (result.success) {
                res.json({
                    status: 'Success',
                    message: result.message,
                    data: result.data
                });
            } else {
                res.status(401).json({
                    status: 'Error',
                    message: result.message
                });
            }
        } catch (error) {
            console.error('登录失败:', error);
            res.status(500).json({
                status: 'Error',
                message: '登录失败，请稍后重试'
            });
        }
    }
);

// 验证token
router.get('/verify', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({
            status: 'Error',
            message: '未提供认证令牌'
        });
    }

    try {
        const result = await AuthService.verifyToken(token);

        if (result.success) {
            res.json({
                status: 'Success',
                message: result.message,
                data: result.data
            });
        } else {
            res.status(401).json({
                status: 'Error',
                message: result.message
            });
        }
    } catch (error) {
        console.error('令牌验证失败:', error);
        res.status(401).json({
            status: 'Error',
            message: '令牌验证失败'
        });
    }
});

// 登出
router.post('/logout', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    try {
        const result = await AuthService.logout(token);

        res.json({
            status: 'Success',
            message: result.message
        });
    } catch (error) {
        console.error('登出失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '登出失败'
        });
    }
});

module.exports = router;
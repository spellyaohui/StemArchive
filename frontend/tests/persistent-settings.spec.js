const { test, expect } = require('@playwright/test');
const { buildURL, buildAPIURL } = require('./test-config.js');

test.describe('系统设置持久化存储测试', () => {
    test.beforeEach(async ({ page }) => {
        // 先登录
        await page.goto(buildURL('frontend', '/login.html'));
        await page.waitForTimeout(1000);

        await page.fill('input[name="username"]', 'admin');
        await page.fill('input[name="password"]', 'admin123');
        await page.click('button[type="submit"]');

        await page.waitForURL(buildURL('frontend', '/dashboard.html'));
        await page.waitForTimeout(1000);
    });

    test('系统名称持久化存储验证', async ({ page }) => {
        await page.goto(buildURL('frontend', '/settings.html'));
        await page.waitForTimeout(2000);

        // 记录初始状态
        const initialTitle = await page.title();
        console.log('初始页面标题:', initialTitle);

        // 切换到基本设置选项卡
        await page.click('button:has-text("基本设置")');
        await page.waitForTimeout(1000);

        // 获取当前系统名称
        const currentSystemName = await page.inputValue('#systemName');
        console.log('当前系统名称:', currentSystemName);

        // 设置新的系统名称，包含时间戳确保唯一性
        const newSystemName = `持久化测试系统 ${new Date().getTime()}`;
        await page.fill('#systemName', newSystemName);
        await page.click('button:has-text("保存设置")');
        await page.waitForTimeout(2000);

        // 验证前端是否更新
        const updatedTitle = await page.title();
        const updatedNavTitle = await page.locator('nav h1').textContent();

        console.log('更新后页面标题:', updatedTitle);
        console.log('更新后导航栏标题:', updatedNavTitle);

        expect(updatedTitle).toContain(newSystemName);
        expect(updatedNavTitle).toContain(newSystemName);

        // 通过API直接验证数据库中的值
        const apiResponse = await page.evaluate(async () => {
            try {
                const response = await fetch(buildAPIURL('backend', '/settings/general'), {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const text = await response.text();
                if (!text) {
                    throw new Error('Empty response');
                }
                return JSON.parse(text);
            } catch (error) {
                console.error('API调用失败:', error);
                return { status: 'Error', message: error.message };
            }
        });

        console.log('API响应:', apiResponse);
        expect(apiResponse.status).toBe('Success');
        expect(apiResponse.data.systemName).toBe(newSystemName);

        // 模拟重启服务器后验证（通过重新加载页面验证设置是否保持）
        await page.goto(buildURL('frontend', '/dashboard.html'));
        await page.waitForTimeout(1000);

        // 再次验证系统名称是否保持
        const persistedNavTitle = await page.locator('nav h1').textContent();
        console.log('重新加载后导航栏标题:', persistedNavTitle);
        expect(persistedNavTitle).toContain(newSystemName);

        // 重置为默认值
        await page.goto(buildURL('frontend', '/settings.html'));
        await page.waitForTimeout(2000);
        await page.click('button:has-text("基本设置")');
        await page.waitForTimeout(1000);

        await page.fill('#systemName', '干细胞治疗档案管理系统');
        await page.click('button:has-text("保存设置")');
        await page.waitForTimeout(1000);

        console.log('✅ 系统名称已重置为默认值');
    });

    test('多个设置项持久化测试', async ({ page }) => {
        await page.goto(buildURL('frontend', '/settings.html'));
        await page.waitForTimeout(2000);

        // 切换到基本设置选项卡
        await page.click('button:has-text("基本设置")');
        await page.waitForTimeout(1000);

        // 修改多个设置项
        const testData = {
            systemName: `多设置测试系统 ${new Date().getTime()}`,
            adminEmail: 'test@example.com',
            adminPhone: '123-456-7890',
            systemDescription: '这是一个测试描述，用于验证多个设置项的持久化存储功能。'
        };

        // 填写表单
        await page.fill('#systemName', testData.systemName);
        await page.fill('#adminEmail', testData.adminEmail);
        await page.fill('#adminPhone', testData.adminPhone);
        await page.fill('#systemDescription', testData.systemDescription);

        // 保存设置
        await page.click('button:has-text("保存设置")');
        await page.waitForTimeout(2000);

        // 通过API验证所有设置是否保存
        const apiResponse = await page.evaluate(async () => {
            try {
                const response = await fetch(buildAPIURL('backend', '/settings/general'), {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const text = await response.text();
                if (!text) {
                    throw new Error('Empty response');
                }
                return JSON.parse(text);
            } catch (error) {
                console.error('API调用失败:', error);
                return { status: 'Error', message: error.message };
            }
        });

        console.log('多设置API响应:', apiResponse);
        expect(apiResponse.status).toBe('Success');

        // 验证每个设置项
        expect(apiResponse.data.systemName).toBe(testData.systemName);
        expect(apiResponse.data.adminEmail).toBe(testData.adminEmail);
        expect(apiResponse.data.adminPhone).toBe(testData.adminPhone);
        expect(apiResponse.data.systemDescription).toBe(testData.systemDescription);

        // 刷新页面验证设置是否保持
        await page.reload();
        await page.waitForTimeout(2000);
        await page.click('button:has-text("基本设置")');
        await page.waitForTimeout(1000);

        // 验证表单中的值
        const persistedSystemName = await page.inputValue('#systemName');
        const persistedAdminEmail = await page.inputValue('#adminEmail');
        const persistedAdminPhone = await page.inputValue('#adminPhone');
        const persistedSystemDescription = await page.inputValue('#systemDescription');

        expect(persistedSystemName).toBe(testData.systemName);
        expect(persistedAdminEmail).toBe(testData.adminEmail);
        expect(persistedAdminPhone).toBe(testData.adminPhone);
        expect(persistedSystemDescription).toBe(testData.systemDescription);

        console.log('✅ 多个设置项持久化验证成功');
    });
});
const { test, expect } = require('@playwright/test');
const { buildURL, buildAPIURL } = require('./test-config.js');

test.describe('调试系统设置页面', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(buildURL('frontend', '/login.html'));
        await page.waitForTimeout(1000);

        // 使用正确的name属性选择器进行登录
        await page.fill('input[name="username"]', 'admin');
        await page.fill('input[name="password"]', 'admin123');
        await page.click('button[type="submit"]');

        // 等待登录成功并跳转到dashboard
        await page.waitForURL(buildURL('frontend', '/dashboard.html'));
        await page.waitForTimeout(1000);
    });

    test('基础DOM操作测试', async ({ page }) => {
        await page.goto(buildURL('frontend', '/debug-settings.html'));
        await page.waitForTimeout(1000);

        // 检查页面标题
        const initialTitle = await page.title();
        console.log('初始页面标题:', initialTitle);
        expect(initialTitle).toContain('调试系统设置');

        // 测试直接更新页面标题
        await page.click('button:has-text("测试直接更新标题")');
        await page.waitForTimeout(500);

        const updatedTitle = await page.title();
        console.log('更新后页面标题:', updatedTitle);
        expect(updatedTitle).toContain('测试页面标题');

        // 测试直接更新导航栏标题
        await page.click('button:has-text("测试直接更新导航栏")');
        await page.waitForTimeout(500);

        // 检查导航栏标题
        const navTitle = await page.locator('nav h1').textContent();
        console.log('导航栏标题:', navTitle);
        expect(navTitle).toContain('测试导航栏');
    });

    test('API调用测试', async ({ page }) => {
        await page.goto(buildURL('frontend', '/debug-settings.html'));
        await page.waitForTimeout(1000);

        // 测试获取系统设置
        await page.click('button:has-text("测试获取系统设置")');
        await page.waitForTimeout(1000);

        // 检查API结果显示
        const apiResult = await page.locator('#api-result').textContent();
        console.log('API响应内容:', apiResult);
        expect(apiResult).toContain('"status":"Success"');
        expect(apiResult).toContain('systemName');

        // 测试更新系统设置
        await page.click('button:has-text("测试更新系统设置")');
        await page.waitForTimeout(1000);

        // 检查更新后的API响应
        const updatedApiResult = await page.locator('#api-result').textContent();
        console.log('更新后API响应:', updatedApiResult);
        expect(updatedApiResult).toContain('"status":"Success"');
        expect(updatedApiResult).toContain('message":"系统设置更新成功"');
    });

    test('完整流程测试', async ({ page }) => {
        await page.goto(buildURL('frontend', '/debug-settings.html'));
        await page.waitForTimeout(1000);

        // 获取初始状态
        const initialLocalStorage = await page.evaluate(() => localStorage.getItem('systemName'));
        console.log('初始localStorage:', initialLocalStorage);

        // 执行完整更新流程
        await page.click('button:has-text("测试更新系统设置")');
        await page.waitForTimeout(2000);

        // 检查所有更新
        const finalTitle = await page.title();
        const finalNavTitle = await page.locator('nav h1').textContent();
        const finalLocalStorage = await page.evaluate(() => localStorage.getItem('systemName'));

        console.log('最终页面标题:', finalTitle);
        console.log('最终导航栏标题:', finalNavTitle);
        console.log('最终localStorage:', finalLocalStorage);

        // 验证一致性
        expect(finalTitle).toContain('调试系统设置 - Test System');
        expect(finalNavTitle).toContain('Test System');
        expect(finalLocalStorage).toContain('Test System');
    });

    test('Console日志检查', async ({ page }) => {
        await page.goto(buildURL('frontend', '/debug-settings.html'));
        await page.waitForTimeout(1000);

        // 监听Console日志
        const consoleLogs = [];
        page.on('console', msg => {
            consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
        });

        // 执行多个操作
        await page.click('button:has-text("测试直接更新标题")');
        await page.waitForTimeout(500);
        await page.click('button:has-text("测试直接更新导航栏")');
        await page.waitForTimeout(500);
        await page.click('button:has-text("测试更新系统设置")');
        await page.waitForTimeout(1000);

        // 检查Console日志
        console.log('Console日志:', consoleLogs);
        expect(consoleLogs.some(log => log.includes('页面标题更新为'))).toBeTruthy();
        expect(consoleLogs.some(log => log.includes('导航栏标题更新为'))).toBeTruthy();
        expect(consoleLogs.some(log => log.includes('新系统名称已应用'))).toBeTruthy();
    });

    test('原始settings页面对比测试', async ({ page }) => {
        // 先测试调试页面
        await page.goto(buildURL('frontend', '/debug-settings.html'));
        await page.waitForTimeout(1000);

        await page.click('button:has-text("测试更新系统设置")');
        await page.waitForTimeout(2000);

        const debugTitle = await page.title();
        const debugNavTitle = await page.locator('nav h1').textContent();

        console.log('调试页面 - 页面标题:', debugTitle);
        console.log('调试页面 - 导航栏标题:', debugNavTitle);

        // 然后测试原始settings页面
        await page.goto(buildURL('frontend', '/settings.html'));
        await page.waitForTimeout(2000);

        const settingsTitle = await page.title();
        const settingsNavTitle = await page.locator('nav h1').textContent();

        console.log('原始页面 - 页面标题:', settingsTitle);
        console.log('原始页面 - 导航栏标题:', settingsNavTitle);

        // 验证原始页面是否有更新问题
        console.log('原始页面是否有更新问题:',
            settingsTitle === debugTitle && settingsNavTitle === debugNavTitle);
    });
});
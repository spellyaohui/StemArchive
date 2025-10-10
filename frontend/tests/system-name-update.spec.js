const { test, expect } = require('@playwright/test');
const { buildURL, buildAPIURL } = require('./test-config.js');

test.describe('系统名称更新功能测试', () => {
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

    test('基本设置页面系统名称更新测试', async ({ page }) => {
        await page.goto(buildURL('frontend', '/settings.html'));
        await page.waitForTimeout(2000);

        // 记录初始状态
        const initialTitle = await page.title();
        const initialNavTitle = await page.locator('nav h1').textContent();
        console.log('初始页面标题:', initialTitle);
        console.log('初始导航栏标题:', initialNavTitle);

        // 切换到基本设置选项卡
        await page.click('button:has-text("基本设置")');
        await page.waitForTimeout(1000);

        // 清空系统名称输入框并输入新名称
        await page.fill('#systemName', '测试健康管理系统');

        // 监听Console日志
        const consoleLogs = [];
        page.on('console', msg => {
            consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
        });

        // 点击保存按钮
        await page.click('button:has-text("保存设置")');
        await page.waitForTimeout(2000);

        // 检查Console日志
        console.log('Console日志:', consoleLogs.filter(log => log.includes('系统名称')));

        // 检查页面标题是否更新
        const updatedTitle = await page.title();
        const updatedNavTitle = await page.locator('nav h1').textContent();

        console.log('更新后页面标题:', updatedTitle);
        console.log('更新后导航栏标题:', updatedNavTitle);

        // 验证更新是否生效
        expect(updatedTitle).toContain('测试健康管理系统');
        expect(updatedNavTitle).toContain('测试健康管理系统');

        // 检查localStorage是否更新
        const localStorageValue = await page.evaluate(() => localStorage.getItem('systemName'));
        console.log('localStorage中的系统名称:', localStorageValue);
        expect(localStorageValue).toContain('测试健康管理系统');
    });

    test('系统名称跨页面同步测试', async ({ page }) => {
        await page.goto(buildURL('frontend', '/settings.html'));
        await page.waitForTimeout(2000);

        // 在settings页面更新系统名称
        await page.click('button:has-text("基本设置")');
        await page.waitForTimeout(1000);

        await page.fill('#systemName', '跨页面测试系统');
        await page.click('button:has-text("保存设置")');
        await page.waitForTimeout(2000);

        // 跳转到其他页面检查是否同步更新
        await page.goto(buildURL('frontend', '/dashboard.html'));
        await page.waitForTimeout(1000);

        const dashboardTitle = await page.title();
        const dashboardNavTitle = await page.locator('nav h1').textContent();

        console.log('Dashboard页面标题:', dashboardTitle);
        console.log('Dashboard导航栏标题:', dashboardNavTitle);

        expect(dashboardNavTitle).toContain('跨页面测试系统');

        // 再跳转到客户页面检查
        await page.goto(buildURL('frontend', '/customers.html'));
        await page.waitForTimeout(1000);

        const customersNavTitle = await page.locator('nav h1').textContent();
        console.log('客户页面导航栏标题:', customersNavTitle);
        expect(customersNavTitle).toContain('跨页面测试系统');
    });

    test('测试页面系统名称更新验证', async ({ page }) => {
        // 使用我们创建的测试页面
        await page.goto(buildURL('frontend', '/test-settings-update.html'));
        await page.waitForTimeout(2000);

        // 记录初始状态
        const initialTitle = await page.title();
        const initialNavTitle = await page.locator('nav h1').textContent();
        console.log('测试页面 - 初始页面标题:', initialTitle);
        console.log('测试页面 - 初始导航栏标题:', initialNavTitle);

        // 点击测试settings页面更新按钮
        await page.click('button:has-text("1. 测试settings页面更新")');
        await page.waitForTimeout(3000);

        // 检查测试结果
        const testResult = await page.locator('#testResult').textContent();
        const currentStatus = await page.locator('#currentStatus').textContent();

        console.log('测试结果:', testResult);
        console.log('当前状态:', currentStatus);

        // 检查状态显示
        const pageTitle = await page.locator('#pageTitle').textContent();
        const navTitle = await page.locator('#navTitle').textContent();
        const localStorageName = await page.locator('#localStorageName').textContent();

        console.log('实时状态 - 页面标题:', pageTitle);
        console.log('实时状态 - 导航栏标题:', navTitle);
        console.log('实时状态 - localStorage:', localStorageName);

        // 验证更新是否成功
        expect(currentStatus).toContain('测试成功');
        expect(pageTitle).toContain('测试系统名称');
        expect(navTitle).toContain('测试系统名称');
    });

    test('简单调试页面DOM操作测试', async ({ page }) => {
        await page.goto(buildURL('frontend', '/debug-simple.html'));
        await page.waitForTimeout(1000);

        // 测试页面标题更新
        await page.click('button:has-text("1. 测试页面标题更新")');
        await page.waitForTimeout(500);

        let updatedTitle = await page.title();
        console.log('简单调试 - 页面标题更新后:', updatedTitle);
        expect(updatedTitle).toContain('测试标题');

        // 测试导航栏更新
        await page.click('button:has-text("2. 测试导航栏更新")');
        await page.waitForTimeout(500);

        let navTitle = await page.locator('#navTitle').textContent();
        console.log('简单调试 - 导航栏更新后:', navTitle);
        expect(navTitle).toContain('测试导航栏');

        // 测试API更新
        await page.click('button:has-text("3. 测试API更新")');
        await page.waitForTimeout(2000);

        // 检查最终状态
        const finalTitle = await page.title();
        const finalNavTitle = await page.locator('#navTitle').textContent();
        const finalLocalStorage = await page.evaluate(() => localStorage.getItem('systemName'));

        console.log('简单调试 - 最终页面标题:', finalTitle);
        console.log('简单调试 - 最终导航栏标题:', finalNavTitle);
        console.log('简单调试 - 最终localStorage:', finalLocalStorage);

        expect(finalTitle).toContain('API测试系统');
        expect(finalNavTitle).toContain('API测试系统');
        expect(finalLocalStorage).toContain('API测试系统');
    });

    test('系统名称重置功能测试', async ({ page }) => {
        await page.goto(buildURL('frontend', '/test-settings-update.html'));
        await page.waitForTimeout(2000);

        // 先修改为测试名称
        await page.click('button:has-text("1. 测试settings页面更新")');
        await page.waitForTimeout(3000);

        // 然后重置为默认
        await page.click('button:has-text("4. 重置为默认")');
        await page.waitForTimeout(2000);

        // 检查是否重置成功
        const navTitle = await page.locator('nav h1').textContent();
        const localStorageName = await page.evaluate(() => localStorage.getItem('systemName'));

        console.log('重置后导航栏标题:', navTitle);
        console.log('重置后localStorage:', localStorageName);

        expect(navTitle).toContain('干细胞治疗档案管理系统');
        expect(localStorageName).toContain('干细胞治疗档案管理系统');
    });
});
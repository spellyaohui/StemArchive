const { test, expect } = require('@playwright/test');
const { buildURL, buildAPIURL } = require('./test-config.js');

test.describe('简单调试页面测试', () => {
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

    test('基础功能测试', async ({ page }) => {
        await page.goto(buildURL('frontend', '/debug-simple.html'));
        await page.waitForTimeout(1000);

        // 检查页面标题
        const initialTitle = await page.title();
        console.log('初始页面标题:', initialTitle);
        expect(initialTitle).toContain('简单调试页面');

        // 检查导航栏标题
        const initialNavTitle = await page.locator('#navTitle').textContent();
        console.log('初始导航栏标题:', initialNavTitle);
        expect(initialNavTitle).toContain('默认系统名称');

        // 检查实时状态监控
        const pageTitle = await page.locator('#pageTitle').textContent();
        const navStatus = await page.locator('#navStatus').textContent();
        const localStorageStatus = await page.locator('#localStorageStatus').textContent();

        console.log('页面标题状态:', pageTitle);
        console.log('导航栏状态:', navStatus);
        console.log('localStorage状态:', localStorageStatus);
    });

    test('测试页面标题更新', async ({ page }) => {
        await page.goto(buildURL('frontend', '/debug-simple.html'));
        await page.waitForTimeout(1000);

        // 点击测试页面标题更新按钮
        await page.click('button:has-text("1. 测试页面标题更新")');
        await page.waitForTimeout(500);

        // 检查测试结果
        const testResult = await page.locator('#testResult').textContent();
        console.log('测试结果:', testResult);
        expect(testResult).toContain('页面标题已更新为');

        // 检查页面标题是否真的改变了
        const updatedTitle = await page.title();
        console.log('更新后的页面标题:', updatedTitle);
        expect(updatedTitle).toContain('测试标题');
    });

    test('测试导航栏更新', async ({ page }) => {
        await page.goto(buildURL('frontend', '/debug-simple.html'));
        await page.waitForTimeout(1000);

        // 点击测试导航栏更新按钮
        await page.click('button:has-text("2. 测试导航栏更新")');
        await page.waitForTimeout(500);

        // 检查测试结果
        const testResult = await page.locator('#testResult').textContent();
        console.log('测试结果:', testResult);
        expect(testResult).toContain('导航栏标题已更新为');

        // 检查导航栏标题是否真的改变了
        const updatedNavTitle = await page.locator('#navTitle').textContent();
        console.log('更新后的导航栏标题:', updatedNavTitle);
        expect(updatedNavTitle).toContain('测试导航栏');
    });

    test('测试API更新功能', async ({ page }) => {
        await page.goto(buildURL('frontend', '/debug-simple.html'));
        await page.waitForTimeout(1000);

        // 监听Console日志
        const consoleLogs = [];
        page.on('console', msg => {
            consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
        });

        // 点击测试API更新按钮
        await page.click('button:has-text("3. 测试API更新")');
        await page.waitForTimeout(2000);

        // 检查测试结果
        const testResult = await page.locator('#testResult').textContent();
        console.log('测试结果:', testResult);

        // 检查Console日志
        console.log('Console日志:', consoleLogs);

        // 检查页面状态
        const finalTitle = await page.title();
        const finalNavTitle = await page.locator('#navTitle').textContent();
        const finalLocalStorage = await page.evaluate(() => localStorage.getItem('systemName'));

        console.log('最终页面标题:', finalTitle);
        console.log('最终导航栏标题:', finalNavTitle);
        console.log('最终localStorage:', finalLocalStorage);
    });

    test('DOM元素检查', async ({ page }) => {
        await page.goto(buildURL('frontend', '/debug-simple.html'));
        await page.waitForTimeout(1000);

        // 点击检查DOM元素按钮
        await page.click('button:has-text("4. 检查DOM元素")');
        await page.waitForTimeout(500);

        // 检查测试结果
        const testResult = await page.locator('#testResult').textContent();
        console.log('DOM检查结果:', testResult);
        expect(testResult).toContain('DOM元素检查结果');
        expect(testResult).toContain('nav h1: ✅');
        expect(testResult).toContain('#navTitle: ✅');
    });

    test('实时状态监控', async ({ page }) => {
        await page.goto(buildURL('frontend', '/debug-simple.html'));
        await page.waitForTimeout(1000);

        // 等待几秒钟让状态监控更新
        await page.waitForTimeout(3000);

        // 检查实时状态
        const pageTitle = await page.locator('#pageTitle').textContent();
        const navStatus = await page.locator('#navStatus').textContent();
        const localStorageStatus = await page.locator('#localStorageStatus').textContent();
        const lastUpdate = await page.locator('#lastUpdate').textContent();

        console.log('实时状态 - 页面标题:', pageTitle);
        console.log('实时状态 - 导航栏:', navStatus);
        console.log('实时状态 - localStorage:', localStorageStatus);
        console.log('实时状态 - 最后更新:', lastUpdate);

        expect(pageTitle).toBeTruthy();
        expect(navStatus).toBeTruthy();
        expect(lastUpdate).toBeTruthy();
    });

    test('完整流程测试', async ({ page }) => {
        await page.goto(buildURL('frontend', '/debug-simple.html'));
        await page.waitForTimeout(1000);

        // 记录初始状态
        const initialTitle = await page.title();
        const initialNavTitle = await page.locator('#navTitle').textContent();
        const initialLocalStorage = await page.evaluate(() => localStorage.getItem('systemName'));

        console.log('=== 初始状态 ===');
        console.log('页面标题:', initialTitle);
        console.log('导航栏标题:', initialNavTitle);
        console.log('localStorage:', initialLocalStorage);

        // 依次执行所有测试
        await page.click('button:has-text("1. 测试页面标题更新")');
        await page.waitForTimeout(500);

        await page.click('button:has-text("2. 测试导航栏更新")');
        await page.waitForTimeout(500);

        await page.click('button:has-text("3. 测试API更新")');
        await page.waitForTimeout(2000);

        await page.click('button:has-text("4. 检查DOM元素")');
        await page.waitForTimeout(500);

        // 记录最终状态
        const finalTitle = await page.title();
        const finalNavTitle = await page.locator('#navTitle').textContent();
        const finalLocalStorage = await page.evaluate(() => localStorage.getItem('systemName'));

        console.log('=== 最终状态 ===');
        console.log('页面标题:', finalTitle);
        console.log('导航栏标题:', finalNavTitle);
        console.log('localStorage:', finalLocalStorage);

        // 验证状态变化
        expect(finalTitle).not.toBe(initialTitle);
        expect(finalNavTitle).not.toBe(initialNavTitle);
    });
});
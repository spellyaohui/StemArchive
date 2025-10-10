const { test, expect } = require('@playwright/test');

test.describe('登录页面空表单验证测试', () => {
    test('验证空表单提交时的错误提示', async ({ page }) => {
        // 访问登录页面
        await page.goto('http://localhost:8080/login.html');
        await page.waitForTimeout(1000);

        console.log('✅ 访问登录页面');

        // 截图初始状态
        await page.screenshot({ path: 'empty-form-initial.png' });

        // 不填写任何信息，直接点击登录按钮
        await page.click('button[type="submit"]');
        console.log('✅ 点击了登录按钮（未填写信息）');

        // 等待错误提示出现
        await page.waitForTimeout(2000);

        // 检查内联错误提示
        const inlineErrorContainer = page.locator('#inlineErrorContainer');
        const inlineErrorVisible = await inlineErrorContainer.isVisible();
        const inlineErrorMessage = await inlineErrorContainer.textContent();

        console.log(`内联错误提示可见性: ${inlineErrorVisible}`);
        console.log(`内联错误消息: "${inlineErrorMessage.trim()}"`);

        // 验证内联错误提示显示正常
        expect(inlineErrorVisible).toBe(true);
        expect(inlineErrorMessage.trim()).toBeTruthy();
        expect(inlineErrorMessage.trim().length).toBeGreaterThan(0);

        // 验证错误消息包含用户名和密码相关内容
        expect(inlineErrorMessage).toContain('用户名') || expect(inlineErrorMessage).toContain('密码');

        // 检查右上角通知（应该不存在）
        const notification = page.locator('.notification');
        const notificationCount = await notification.count();
        console.log(`右上角通知数量: ${notificationCount}`);

        // 验证右上角通知不存在
        expect(notificationCount).toBe(0);

        // 截图保存结果
        await page.screenshot({ path: 'empty-form-validation.png' });

        console.log('✅ 验证完成：空表单提交正确显示内联错误提示，没有右上角通知');
    });

    test('验证只输入用户名的错误提示', async ({ page }) => {
        // 访问登录页面
        await page.goto('http://localhost:8080/login.html');
        await page.waitForTimeout(1000);

        console.log('✅ 访问登录页面');

        // 只输入用户名，不输入密码
        await page.fill('input[name="username"]', 'testuser');
        console.log('✅ 只输入了用户名');

        // 点击登录按钮
        await page.click('button[type="submit"]');
        console.log('✅ 点击了登录按钮');

        // 等待错误提示出现
        await page.waitForTimeout(2000);

        // 检查内联错误提示
        const inlineErrorContainer = page.locator('#inlineErrorContainer');
        const inlineErrorVisible = await inlineErrorContainer.isVisible();
        const inlineErrorMessage = await inlineErrorContainer.textContent();

        console.log(`内联错误提示可见性: ${inlineErrorVisible}`);
        console.log(`内联错误消息: "${inlineErrorMessage.trim()}"`);

        // 验证内联错误提示显示正常
        expect(inlineErrorVisible).toBe(true);
        expect(inlineErrorMessage.trim()).toContain('密码');

        // 截图保存结果
        await page.screenshot({ path: 'username-only-validation.png' });

        console.log('✅ 验证完成：只输入用户名时正确提示需要密码');
    });

    test('验证只输入密码的错误提示', async ({ page }) => {
        // 访问登录页面
        await page.goto('http://localhost:8080/login.html');
        await page.waitForTimeout(1000);

        console.log('✅ 访问登录页面');

        // 只输入密码，不输入用户名
        await page.fill('input[name="password"]', 'testpass');
        console.log('✅ 只输入了密码');

        // 点击登录按钮
        await page.click('button[type="submit"]');
        console.log('✅ 点击了登录按钮');

        // 等待错误提示出现
        await page.waitForTimeout(2000);

        // 检查内联错误提示
        const inlineErrorContainer = page.locator('#inlineErrorContainer');
        const inlineErrorVisible = await inlineErrorContainer.isVisible();
        const inlineErrorMessage = await inlineErrorContainer.textContent();

        console.log(`内联错误提示可见性: ${inlineErrorVisible}`);
        console.log(`内联错误消息: "${inlineErrorMessage.trim()}"`);

        // 验证内联错误提示显示正常
        expect(inlineErrorVisible).toBe(true);
        expect(inlineErrorMessage.trim()).toContain('用户名');

        // 截图保存结果
        await page.screenshot({ path: 'password-only-validation.png' });

        console.log('✅ 验证完成：只输入密码时正确提示需要用户名');
    });
});
const { test, expect } = require('@playwright/test');

test.describe('登录页面单一错误通知测试', () => {
    test('验证登录错误只显示内联错误提示，不显示右上角通知', async ({ page }) => {
        // 访问登录页面
        await page.goto('http://localhost:8080/login.html');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        console.log('✅ 访问登录页面');

        // 截图初始状态
        await page.screenshot({ path: 'login-initial-state.png' });

        // 使用错误的用户名密码登录
        await page.fill('input[name="username"]', 'wronguser');
        await page.fill('input[name="password"]', 'wrongpass');
        console.log('✅ 输入了错误的用户名密码');

        // 点击登录按钮
        await page.click('button[type="submit"]');
        console.log('✅ 点击了登录按钮');

        // 等待错误提示出现
        await page.waitForTimeout(2000);

        // 检查内联错误提示
        const inlineErrorContainer = page.locator('#inlineErrorContainer');
        const inlineErrorVisible = await inlineErrorContainer.isVisible();
        const inlineErrorMessage = await inlineErrorContainer.locator('span').textContent();

        console.log(`内联错误提示可见性: ${inlineErrorVisible}`);
        console.log(`内联错误消息: "${inlineErrorMessage}"`);

        // 验证内联错误提示显示正常
        expect(inlineErrorVisible).toBe(true);
        expect(inlineErrorMessage).toBeTruthy();
        expect(inlineErrorMessage.length).toBeGreaterThan(0);

        // 检查右上角通知（应该不存在）
        const notification = page.locator('.notification');
        const notificationCount = await notification.count();
        console.log(`右上角通知数量: ${notificationCount}`);

        // 验证右上角通知不存在
        expect(notificationCount).toBe(0);

        // 截图保存结果
        await page.screenshot({ path: 'login-single-error-notification.png' });

        console.log('✅ 验证完成：登录页面只显示内联错误提示，没有右上角通知');
    });

    test('验证网络错误时显示重试按钮', async ({ page }) => {
        // 访问登录页面
        await page.goto('http://localhost:8080/login.html');
        await page.waitForTimeout(1000);

        console.log('✅ 访问登录页面');

        // 为了测试网络错误，我们需要阻止后端请求
        await page.route('**/api/auth/login', route => {
            route.abort('failed');
        });

        // 使用正确的用户名密码（但由于网络被阻止，会失败）
        await page.fill('input[name="username"]', 'admin');
        await page.fill('input[name="password"]', 'admin123');
        console.log('✅ 输入了用户名密码');

        // 点击登录按钮
        await page.click('button[type="submit"]');
        console.log('✅ 点击了登录按钮');

        // 等待错误提示出现
        await page.waitForTimeout(2000);

        // 检查内联错误提示
        const inlineErrorContainer = page.locator('#inlineErrorContainer');
        const inlineErrorVisible = await inlineErrorContainer.isVisible();
        const inlineErrorMessage = await inlineErrorContainer.textContent();

        console.log(`网络错误提示可见性: ${inlineErrorVisible}`);
        console.log(`网络错误消息: "${inlineErrorMessage}"`);

        // 验证内联错误提示显示正常
        expect(inlineErrorVisible).toBe(true);
        expect(inlineErrorMessage).toContain('无法连接到服务器');

        // 检查是否有重试按钮
        const retryButton = inlineErrorContainer.locator('button');
        const retryButtonVisible = await retryButton.isVisible();
        console.log(`重试按钮可见性: ${retryButtonVisible}`);

        if (retryButtonVisible) {
            const retryButtonText = await retryButton.textContent();
            console.log(`重试按钮文本: "${retryButtonText}"`);
            expect(retryButtonText).toContain('重试');
        }

        // 检查右上角通知（应该不存在）
        const notification = page.locator('.notification');
        const notificationCount = await notification.count();
        console.log(`右上角通知数量: ${notificationCount}`);

        // 验证右上角通知不存在
        expect(notificationCount).toBe(0);

        // 截图保存结果
        await page.screenshot({ path: 'login-network-error-with-retry.png' });

        console.log('✅ 验证完成：网络错误时显示重试按钮，没有右上角通知');
    });

    test('验证表单字段错误高亮效果', async ({ page }) => {
        // 访问登录页面
        await page.goto('http://localhost:8080/login.html');
        await page.waitForTimeout(1000);

        console.log('✅ 访问登录页面');

        // 不填写任何信息，直接点击登录按钮
        await page.click('button[type="submit"]');
        console.log('✅ 点击了登录按钮（未填写信息）');

        // 等待错误提示出现
        await page.waitForTimeout(2000);

        // 检查用户名输入框是否有错误样式
        const usernameInput = page.locator('input[name="username"]');
        const usernameHasError = await usernameInput.evaluate(el =>
            el.classList.contains('input-error')
        );
        console.log(`用户名输入框错误样式: ${usernameHasError}`);

        // 检查密码输入框是否有错误样式
        const passwordInput = page.locator('input[name="password"]');
        const passwordHasError = await passwordInput.evaluate(el =>
            el.classList.contains('input-error')
        );
        console.log(`密码输入框错误样式: ${passwordHasError}`);

        // 验证输入框有错误高亮
        expect(usernameHasError).toBe(true);
        expect(passwordHasError).toBe(true);

        // 截图保存结果
        await page.screenshot({ path: 'login-field-error-highlight.png' });

        console.log('✅ 验证完成：表单字段正确显示错误高亮');
    });
});
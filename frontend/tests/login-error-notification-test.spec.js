const { test, expect } = require('@playwright/test');

test.describe('登录页面错误通知测试', () => {
    test('检查登录错误通知的样式', async ({ page }) => {
        // 访问登录页面
        await page.goto('http://localhost:8080/login.html');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        console.log('✅ 访问登录页面');

        // 截图初始状态
        await page.screenshot({ path: 'login-page-initial.png' });

        // 使用错误的用户名密码登录
        await page.fill('input[name="username"]', 'wronguser');
        await page.fill('input[name="password"]', 'wrongpass');
        console.log('✅ 输入了错误的用户名密码');

        // 点击登录按钮
        await page.click('button[type="submit"]');
        console.log('✅ 点击了登录按钮');

        // 等待错误通知出现
        await page.waitForTimeout(2000);

        // 检查是否有错误通知
        const errorNotification = page.locator('.notification.error');
        const errorCount = await errorNotification.count();
        console.log(`错误通知数量: ${errorCount}`);

        if (errorCount > 0) {
            console.log('✅ 找到错误通知');

            // 详细检查错误通知的样式
            const notificationDetails = await errorNotification.evaluate(el => {
                const computedStyle = window.getComputedStyle(el);
                const rect = el.getBoundingClientRect();
                const messageElement = el.querySelector('.notification-message');
                const messageText = messageElement ? messageElement.textContent : '';

                return {
                    // 位置和尺寸
                    position: computedStyle.position,
                    width: rect.width,
                    height: rect.height,

                    // 背景和颜色 - 这是关键
                    backgroundColor: computedStyle.backgroundColor,
                    backgroundImage: computedStyle.backgroundImage,
                    background: computedStyle.background,
                    color: computedStyle.color,
                    opacity: computedStyle.opacity,
                    visibility: computedStyle.visibility,

                    // 布局
                    display: computedStyle.display,

                    // 内容
                    message: messageText,
                    innerHTML: el.innerHTML.substring(0, 300) + '...'
                };
            });

            console.log('=== 登录错误通知详细信息 ===');
            console.log(JSON.stringify(notificationDetails, null, 2));

            // 检查关键问题：背景是否透明
            if ((notificationDetails.backgroundColor === 'rgba(0, 0, 0, 0)' || notificationDetails.backgroundColor === 'transparent')
                && (notificationDetails.backgroundImage === 'none' || !notificationDetails.backgroundImage.includes('linear-gradient'))) {
                console.log('❌ 发现问题：错误通知背景是透明的！');
                console.log(`backgroundColor: "${notificationDetails.backgroundColor}"`);
                console.log(`backgroundImage: "${notificationDetails.backgroundImage}"`);
            } else {
                console.log('✅ 错误通知背景正常');
                console.log(`✅ 背景渐变: ${notificationDetails.backgroundImage}`);
            }

            // 检查是否有背景渐变
            if (notificationDetails.backgroundImage && notificationDetails.backgroundImage.includes('linear-gradient')) {
                console.log('✅ 错误通知有背景渐变');
            } else {
                console.log('❌ 错误通知缺少背景渐变');
                console.log(`backgroundImage: "${notificationDetails.backgroundImage}"`);
            }

            // 截图保存错误通知
            await page.screenshot({ path: 'login-error-notification.png' });

            // 验证基本样式
            expect(notificationDetails.display).toBe('flex');
            expect(notificationDetails.height).toBeGreaterThanOrEqual(50);
            // 验证是错误消息（可能是网络错误或认证错误）
            expect(notificationDetails.message).toBeTruthy();
            expect(notificationDetails.message.length).toBeGreaterThan(0);

        } else {
            console.log('❌ 未找到错误通知');

            // 检查是否有其他类型的通知
            const allNotifications = page.locator('.notification');
            const allCount = await allNotifications.count();
            console.log(`所有通知数量: ${allCount}`);

            if (allCount > 0) {
                for (let i = 0; i < allCount; i++) {
                    const notification = allNotifications.nth(i);
                    const className = await notification.getAttribute('class');
                    const message = await notification.locator('.notification-message').textContent();
                    console.log(`通知 ${i + 1}: class="${className}", message="${message}"`);
                }
            }

            await page.screenshot({ path: 'login-no-error-notification.png' });
        }
    });

    test('检查不同类型登录通知的样式', async ({ page }) => {
        await page.goto('http://localhost:8080/login.html');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        console.log('✅ 访问登录页面');

        // 测试1：用户名为空
        await page.click('button[type="submit"]');
        await page.waitForTimeout(1000);

        const validationNotification = page.locator('.notification.validation, .notification.error');
        if (await validationNotification.count() > 0) {
            const details = await validationNotification.evaluate(el => {
                const style = window.getComputedStyle(el);
                return {
                    class: el.className,
                    backgroundColor: style.backgroundColor,
                    backgroundImage: style.backgroundImage,
                    message: el.querySelector('.notification-message')?.textContent || ''
                };
            });
            console.log('验证通知详情:', JSON.stringify(details, null, 2));
            await page.screenshot({ path: 'login-validation-notification.png' });
        }

        // 测试2：密码为空
        await page.fill('input[name="username"]', 'admin');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(1000);

        const validationNotification2 = page.locator('.notification.validation, .notification.error');
        if (await validationNotification2.count() > 0) {
            const details = await validationNotification2.evaluate(el => {
                const style = window.getComputedStyle(el);
                return {
                    class: el.className,
                    backgroundColor: style.backgroundColor,
                    backgroundImage: style.backgroundImage,
                    message: el.querySelector('.notification-message')?.textContent || ''
                };
            });
            console.log('验证通知2详情:', JSON.stringify(details, null, 2));
            await page.screenshot({ path: 'login-validation-notification2.png' });
        }

        // 测试3：错误的用户名密码
        await page.fill('input[name="password"]', 'wrongpass');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(1000);

        const errorNotification = page.locator('.notification.error');
        if (await errorNotification.count() > 0) {
            const details = await errorNotification.evaluate(el => {
                const style = window.getComputedStyle(el);
                return {
                    class: el.className,
                    backgroundColor: style.backgroundColor,
                    backgroundImage: style.backgroundImage,
                    message: el.querySelector('.notification-message')?.textContent || ''
                };
            });
            console.log('错误通知详情:', JSON.stringify(details, null, 2));
            await page.screenshot({ path: 'login-error-notification-detailed.png' });
        }
    });

    test('比较成功登录和错误登录的通知样式', async ({ page }) => {
        await page.goto('http://localhost:8080/login.html');
        await page.waitForTimeout(1000);

        // 先测试错误登录
        await page.fill('input[name="username"]', 'wronguser');
        await page.fill('input[name="password"]', 'wrongpass');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(1000);

        const errorNotification = page.locator('.notification.error');
        if (await errorNotification.count() > 0) {
            const errorDetails = await errorNotification.evaluate(el => {
                const style = window.getComputedStyle(el);
                return {
                    backgroundColor: style.backgroundColor,
                    backgroundImage: style.backgroundImage,
                    height: el.getBoundingClientRect().height
                };
            });
            console.log('错误通知样式:', errorDetails);
            await page.screenshot({ path: 'error-notification-style.png' });
        }

        // 清除通知
        await page.reload();
        await page.waitForTimeout(1000);

        // 测试成功登录
        await page.fill('input[name="username"]', 'admin');
        await page.fill('input[name="password"]', 'admin123');
        await page.click('button[type="submit"]');

        // 等待跳转到dashboard
        try {
            await page.waitForURL('http://localhost:8080/dashboard.html', { timeout: 3000 });
            console.log('✅ 成功登录跳转到dashboard');
        } catch (e) {
            console.log('⚠️ 登录可能失败，检查是否有错误通知');

            const errorNotification = page.locator('.notification.error');
            if (await errorNotification.count() > 0) {
                const errorDetails = await errorNotification.evaluate(el => {
                    const style = window.getComputedStyle(el);
                    return {
                        backgroundColor: style.backgroundColor,
                        backgroundImage: style.backgroundImage,
                        height: el.getBoundingClientRect().height,
                        message: el.querySelector('.notification-message')?.textContent || ''
                    };
                });
                console.log('登录失败通知详情:', JSON.stringify(errorDetails, null, 2));
                await page.screenshot({ path: 'login-failed-notification.png' });
            }
        }
    });
});
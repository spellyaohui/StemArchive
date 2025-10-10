const { test, expect } = require('@playwright/test');

test.describe('简化正式项目测试', () => {
    test('检查页面导航和结构', async ({ page }) => {
        // 先登录
        await page.goto('http://localhost:8080/login.html');
        await page.waitForTimeout(1000);

        await page.fill('input[name="username"]', 'admin');
        await page.fill('input[name="password"]', 'admin123');
        await page.click('button[type="submit"]');

        await page.waitForURL('http://localhost:8080/dashboard.html');
        await page.waitForTimeout(1000);

        console.log('✅ 登录成功');

        // 检查导航菜单
        const navLinks = page.locator('nav a, .nav a');
        const linkCount = await navLinks.count();
        console.log(`导航链接数量: ${linkCount}`);

        for (let i = 0; i < linkCount; i++) {
            const linkText = await navLinks.nth(i).textContent();
            const href = await navLinks.nth(i).getAttribute('href');
            console.log(`导航链接 ${i + 1}: "${linkText}" -> ${href}`);
        }

        // 尝试点击健康数据相关链接
        const healthDataLink = page.locator('a:has-text("健康"), a:has-text("数据"), a[href*="health"], a[href*="data"]');
        if (await healthDataLink.count() > 0) {
            console.log('找到健康数据相关链接');
            await healthDataLink.first().click();
            await page.waitForTimeout(2000);

            const currentUrl = page.url();
            console.log(`当前URL: ${currentUrl}`);

            // 截图查看页面
            await page.screenshot({ path: 'health-data-page.png' });

            // 查找页面标题
            const pageTitle = await page.locator('h1, h2, .page-title, .title').first().textContent();
            console.log(`页面标题: "${pageTitle}"`);

            // 查找所有按钮
            const buttons = page.locator('button');
            const buttonCount = await buttons.count();
            console.log(`页面按钮数量: ${buttonCount}`);

            for (let i = 0; i < Math.min(buttonCount, 10); i++) {
                const buttonText = await buttons.nth(i).textContent();
                console.log(`按钮 ${i + 1}: "${buttonText}"`);
            }

            // 查找可能触发加载的操作
            const loadingTriggers = [
                'button:has-text("获取")',
                'button:has-text("查询")',
                'button:has-text("搜索")',
                'button:has-text("加载")',
                'button:has-text("刷新")',
                'select',
                'input[type="submit"]'
            ];

            for (const trigger of loadingTriggers) {
                const element = page.locator(trigger);
                if (await element.count() > 0) {
                    console.log(`找到可能触发加载的元素: ${trigger}`);

                    // 点击前截图
                    await page.screenshot({ path: `before-${trigger.replace(/[^a-zA-Z0-9]/g, '_')}.png` });

                    await element.first().click();
                    await page.waitForTimeout(2000);

                    // 检查是否有加载中通知
                    const loadingNotification = page.locator('.notification.loading');
                    if (await loadingNotification.count() > 0) {
                        console.log(`✅ 通过 ${trigger} 触发了加载中通知!`);

                        const notificationDetails = await loadingNotification.evaluate(el => {
                            const rect = el.getBoundingClientRect();
                            const style = window.getComputedStyle(el);
                            return {
                                height: rect.height,
                                backgroundImage: style.backgroundImage,
                                display: style.display,
                                visible: style.visibility !== 'hidden' && style.opacity !== '0'
                            };
                        });

                        console.log('加载中通知详情:', JSON.stringify(notificationDetails, null, 2));

                        // 截图保存加载中通知
                        await page.screenshot({ path: `loading-notification-${trigger.replace(/[^a-zA-Z0-9]/g, '_')}.png` });

                        // 检查高度是否合适
                        if (notificationDetails.height < 50) {
                            console.log(`⚠️ 加载中通知高度较小: ${notificationDetails.height}px`);
                        } else {
                            console.log(`✅ 加载中通知高度合适: ${notificationDetails.height}px`);
                        }

                        break; // 找到后就停止
                    } else {
                        console.log(`❌ ${trigger} 未触发加载中通知`);
                    }
                }
            }

        } else {
            console.log('❌ 未找到健康数据相关链接');

            // 截图查看当前页面
            await page.screenshot({ path: 'dashboard-current.png' });

            // 列出所有可用链接
            const allLinks = page.locator('a');
            const allLinkCount = await allLinks.count();
            console.log(`所有链接数量: ${allLinkCount}`);

            for (let i = 0; i < Math.min(allLinkCount, 15); i++) {
                const linkText = await allLinks.nth(i).textContent();
                const href = await allLinks.nth(i).getAttribute('href');
                console.log(`链接 ${i + 1}: "${linkText}" -> ${href}`);
            }
        }
    });

    test('直接访问健康数据页面', async ({ page }) => {
        // 先登录
        await page.goto('http://localhost:8080/login.html');
        await page.waitForTimeout(1000);

        await page.fill('input[name="username"]', 'admin');
        await page.fill('input[name="password"]', 'admin123');
        await page.click('button[type="submit"]');

        await page.waitForURL('http://localhost:8080/dashboard.html');
        await page.waitForTimeout(1000);

        // 直接访问健康数据页面
        await page.goto('http://localhost:8080/health-data.html');
        await page.waitForTimeout(2000);

        console.log('直接访问健康数据页面');
        await page.screenshot({ path: 'direct-health-data.png' });

        // 查找页面内容
        const pageContent = await page.content();
        console.log('页面内容长度:', pageContent.length);

        // 查找表单元素
        const forms = page.locator('form');
        const formCount = await forms.count();
        console.log(`表单数量: ${formCount}`);

        if (formCount > 0) {
            const firstForm = forms.first();
            const inputs = firstForm.locator('input, select, button');
            const inputCount = await inputs.count();
            console.log(`第一个表单中的元素数量: ${inputCount}`);

            for (let i = 0; i < inputCount; i++) {
                const element = inputs.nth(i);
                const tagName = await element.evaluate(el => el.tagName);
                const type = await element.getAttribute('type');
                const name = await element.getAttribute('name');
                const id = await element.getAttribute('id');
                console.log(`表单元素 ${i + 1}: <${tagName}> type="${type}" name="${name}" id="${id}"`);
            }

            // 尝试提交表单
            const submitButton = firstForm.locator('button[type="submit"], input[type="submit"]');
            if (await submitButton.count() > 0) {
                console.log('找到提交按钮，尝试点击');
                await submitButton.first().click();
                await page.waitForTimeout(3000);

                const loadingNotification = page.locator('.notification.loading');
                if (await loadingNotification.count() > 0) {
                    console.log('✅ 表单提交触发了加载中通知!');
                    await page.screenshot({ path: 'form-submission-loading.png' });
                } else {
                    console.log('❌ 表单提交未触发加载中通知');
                }
            }
        }
    });
});
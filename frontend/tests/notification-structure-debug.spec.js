const { test, expect } = require('@playwright/test');

test.describe('通知结构调试', () => {
    test('检查加载中通知的HTML结构', async ({ page }) => {
        await page.goto('http://localhost:8080/test-notification-system.html');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // 点击加载中按钮
        await page.click('button:has-text("加载中")');
        await page.waitForTimeout(500);

        const notification = page.locator('.notification.loading');
        await expect(notification).toBeVisible();

        // 检查HTML结构
        const htmlStructure = await notification.evaluate(el => {
            return {
                outerHTML: el.outerHTML,
                innerHTML: el.innerHTML,
                childElementCount: el.childElementCount,
                children: Array.from(el.children).map(child => ({
                    tagName: child.tagName,
                    className: child.className,
                    innerHTML: child.innerHTML.substring(0, 200) + '...',
                    rect: child.getBoundingClientRect()
                }))
            };
        });

        console.log('=== 加载中通知HTML结构 ===');
        console.log(JSON.stringify(htmlStructure, null, 2));

        // 检查是否有标题
        const hasTitle = await notification.locator('.notification-title').count();
        console.log(`标题元素数量: ${hasTitle}`);

        // 检查消息内容
        const messageElement = notification.locator('.notification-message');
        const messageText = await messageElement.textContent();
        console.log(`消息内容: "${messageText}"`);

        // 检查图标
        const iconElement = notification.locator('.notification-icon');
        const iconExists = await iconElement.count();
        console.log(`图标元素数量: ${iconExists}`);

        // 检查所有子元素的样式
        const childStyles = await notification.evaluate(el => {
            return Array.from(el.children).map((child, index) => {
                const style = window.getComputedStyle(child);
                const rect = child.getBoundingClientRect();
                return {
                    index,
                    tagName: child.tagName,
                    className: child.className,
                    display: style.display,
                    flexDirection: style.flexDirection,
                    alignItems: style.alignItems,
                    height: rect.height,
                    width: rect.width
                };
            });
        });

        console.log('=== 子元素样式 ===');
        console.log(JSON.stringify(childStyles, null, 2));

        // 截图
        await page.screenshot({ path: 'notification-structure-debug.png' });
    });

    test('比较加载中和成功通知的结构差异', async ({ page }) => {
        await page.goto('http://localhost:8080/test-notification-system.html');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // 清除现有通知
        await page.click('button:has-text("清除所有")');
        await page.waitForTimeout(300);

        // 创建成功通知
        await page.click('button:has-text("成功通知")');
        await page.waitForTimeout(500);

        const successNotification = page.locator('.notification.success');
        const successStructure = await successNotification.evaluate(el => ({
            innerHTML: el.innerHTML,
            height: el.getBoundingClientRect().height
        }));

        console.log('=== 成功通知结构 ===');
        console.log(JSON.stringify(successStructure, null, 2));

        // 清除并创建加载中通知
        await page.click('button:has-text("清除所有")');
        await page.waitForTimeout(300);

        await page.click('button:has-text("加载中")');
        await page.waitForTimeout(500);

        const loadingNotification = page.locator('.notification.loading');
        const loadingStructure = await loadingNotification.evaluate(el => ({
            innerHTML: el.innerHTML,
            height: el.getBoundingClientRect().height
        }));

        console.log('=== 加载中通知结构 ===');
        console.log(JSON.stringify(loadingStructure, null, 2));

        // 比较差异
        console.log(`高度差异 - 成功: ${successStructure.height}px, 加载中: ${loadingStructure.height}px`);

        // 截图对比
        await page.screenshot({ path: 'notification-comparison-success.png' });

        await page.click('button:has-text("清除所有")');
        await page.waitForTimeout(300);

        await page.click('button:has-text("加载中")');
        await page.waitForTimeout(500);

        await page.screenshot({ path: 'notification-comparison-loading.png' });
    });
});
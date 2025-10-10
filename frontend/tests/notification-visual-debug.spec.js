const { test, expect } = require('@playwright/test');

test.describe('通知系统视觉调试', () => {
    test('详细检查加载中通知的视觉效果', async ({ page }) => {
        await page.goto('http://localhost:8080/test-notification-system.html');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // 点击加载中按钮
        await page.click('button:has-text("加载中")');
        await page.waitForTimeout(500);

        const notification = page.locator('.notification.loading');
        await expect(notification).toBeVisible();

        // 详细检查所有视觉效果
        const visualDetails = await notification.evaluate(el => {
            const computedStyle = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();

            return {
                // 位置和尺寸
                position: computedStyle.position,
                top: computedStyle.top,
                right: computedStyle.right,
                width: rect.width,
                height: rect.height,
                maxWidth: rect.width,
                maxHeight: rect.height,

                // 背景和颜色
                backgroundColor: computedStyle.backgroundColor,
                backgroundImage: computedStyle.backgroundImage,
                backgroundSize: computedStyle.backgroundSize,
                color: computedStyle.color,
                opacity: computedStyle.opacity,

                // 布局
                display: computedStyle.display,
                flexDirection: computedStyle.flexDirection,
                alignItems: computedStyle.alignItems,
                gap: computedStyle.gap,

                // 溢出处理
                overflow: computedStyle.overflow,
                overflowX: computedStyle.overflowX,
                overflowY: computedStyle.overflowY,

                // 边框和阴影
                borderRadius: computedStyle.borderRadius,
                boxShadow: computedStyle.boxShadow,
                border: computedStyle.border,

                // 变换
                transform: computedStyle.transform,

                // Z-index
                zIndex: computedStyle.zIndex
            };
        });

        console.log('=== 加载中通知详细视觉效果 ===');
        console.log(JSON.stringify(visualDetails, null, 2));

        // 检查消息内容的样式
        const messageElement = notification.locator('.notification-message');
        const messageStyles = await messageElement.evaluate(el => {
            const computedStyle = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();

            return {
                // 文本样式
                fontSize: computedStyle.fontSize,
                lineHeight: computedStyle.lineHeight,
                color: computedStyle.color,

                // 布局
                display: computedStyle.display,
                width: rect.width,
                height: rect.height,

                // 溢出处理
                overflow: computedStyle.overflow,
                overflowX: computedStyle.overflowX,
                overflowY: computedStyle.overflowY,
                textOverflow: computedStyle.textOverflow,
                wordWrap: computedStyle.wordWrap,
                overflowWrap: computedStyle.overflowWrap,

                // 文本截断
                WebkitLineClamp: computedStyle.WebkitLineClamp,
                WebkitBoxOrient: computedStyle.WebkitBoxOrient,

                // 内容
                textContent: el.textContent,
                scrollHeight: el.scrollHeight,
                clientHeight: el.clientHeight
            };
        });

        console.log('=== 消息内容样式 ===');
        console.log(JSON.stringify(messageStyles, null, 2));

        // 检查通知容器的样式
        const container = page.locator('#notification-container');
        const containerStyles = await container.evaluate(el => {
            if (!el) return { exists: false };

            const computedStyle = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();

            return {
                exists: true,
                position: computedStyle.position,
                top: computedStyle.top,
                right: computedStyle.right,
                zIndex: computedStyle.zIndex,
                width: rect.width,
                height: rect.height,
                display: computedStyle.display,
                flexDirection: computedStyle.flexDirection,
                pointerEvents: computedStyle.pointerEvents
            };
        });

        console.log('=== 通知容器样式 ===');
        console.log(JSON.stringify(containerStyles, null, 2));

        // 截图查看实际情况
        await page.screenshot({
            path: 'notification-visual-debug.png',
            fullPage: false
        });

        // 验证关键样式
        expect(visualDetails.backgroundImage).toContain('linear-gradient');
        expect(visualDetails.display).toBe('flex');
        expect(visualDetails.overflow).toBe('hidden');
        expect(messageStyles.overflow).toBe('hidden');
        expect(messageStyles.textOverflow).toBe('ellipsis');
        expect(messageStyles.WebkitLineClamp).toBe('4');
    });

    test('比较不同通知类型的视觉效果', async ({ page }) => {
        await page.goto('http://localhost:8080/test-notification-system.html');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // 测试不同类型的通知
        const notificationTypes = [
            { button: '加载中', class: 'loading' },
            { button: '处理中', class: 'processing' },
            { button: '保存中', class: 'saving' },
            { button: '成功通知', class: 'success' },
            { button: '错误通知', class: 'error' }
        ];

        for (const type of notificationTypes) {
            // 清除现有通知
            await page.click('button:has-text("清除所有")');
            await page.waitForTimeout(300);

            // 创建新通知
            await page.click(`button:has-text("${type.button}")`);
            await page.waitForTimeout(500);

            const notification = page.locator(`.notification.${type.class}`);
            await expect(notification).toBeVisible();

            const styles = await notification.evaluate(el => {
                const computedStyle = window.getComputedStyle(el);
                return {
                    backgroundImage: computedStyle.backgroundImage,
                    backgroundColor: computedStyle.backgroundColor,
                    height: el.getBoundingClientRect().height
                };
            });

            console.log(`=== ${type.class} 通知样式 ===`);
            console.log(JSON.stringify(styles, null, 2));

            // 为每种类型截图
            await page.screenshot({
                path: `notification-${type.class}-debug.png`,
                fullPage: false
            });
        }
    });
});
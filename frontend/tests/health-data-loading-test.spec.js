const { test, expect } = require('@playwright/test');

test.describe('健康数据页面加载中通知测试', () => {
    test.beforeEach(async ({ page }) => {
        // 先登录
        await page.goto('http://localhost:8080/login.html');
        await page.waitForTimeout(1000);

        await page.fill('input[name="username"]', 'admin');
        await page.fill('input[name="password"]', 'admin123');
        await page.click('button[type="submit"]');

        await page.waitForURL('http://localhost:8080/dashboard.html');
        await page.waitForTimeout(1000);
    });

    test('测试健康数据页面的加载中通知', async ({ page }) => {
        // 导航到健康数据页面
        await page.goto('http://localhost:8080/health-data.html');
        await page.waitForTimeout(2000);

        console.log('✅ 成功访问健康数据页面');

        // 截图查看初始状态
        await page.screenshot({ path: 'health-data-initial.png' });

        // 查找科室选择器
        const departmentSelector = page.locator('select[name="department"], select#department, select');
        const departmentCount = await departmentSelector.count();
        console.log(`科室选择器数量: ${departmentCount}`);

        if (departmentCount > 0) {
            // 获取所有科室选项
            const options = await departmentSelector.first().locator('option').all();
            console.log(`科室选项数量: ${options.length}`);

            for (let i = 0; i < options.length; i++) {
                const optionText = await options[i].textContent();
                const optionValue = await options[i].getAttribute('value');
                console.log(`科室选项 ${i + 1}: "${optionText}" (value: "${optionValue}")`);
            }

            // 选择检验科（这应该会显示更多选项）
            await departmentSelector.first().selectOption({ label: '检验科' });
            await page.waitForTimeout(1000);

            console.log('✅ 选择了检验科');
            await page.screenshot({ path: 'health-data-laboratory-selected.png' });

            // 查找体检ID输入框
            const examIdInput = page.locator('input[name="examId"], input#examId, input[placeholder*="体检"], input[type="text"]');
            const inputCount = await examIdInput.count();
            console.log(`体检ID输入框数量: ${inputCount}`);

            if (inputCount > 0) {
                // 输入一个测试体检ID
                await examIdInput.first().fill('TEST001');
                console.log('✅ 输入了测试体检ID');

                await page.screenshot({ path: 'health-data-id-entered.png' });

                // 查找"获取健康数据"按钮
                const getDataButton = page.locator('button:has-text("获取"), button:has-text("查询"), button[onclick*="getHealthResults"]');
                const buttonCount = await getDataButton.count();
                console.log(`获取数据按钮数量: ${buttonCount}`);

                if (buttonCount > 0) {
                    console.log('✅ 找到获取数据按钮');

                    // 检查按钮是否可见和可点击
                    const isVisible = await getDataButton.first().isVisible();
                    const isEnabled = await getDataButton.first().isEnabled();
                    console.log(`按钮可见性: ${isVisible}, 可用性: ${isEnabled}`);

                    if (isVisible && isEnabled) {
                        // 点击按钮前截图
                        await page.screenshot({ path: 'before-get-data-click.png' });

                        // 点击获取数据按钮
                        await getDataButton.first().click();
                        console.log('✅ 点击了获取数据按钮');

                        // 等待加载中通知出现
                        await page.waitForTimeout(1000);

                        // 检查加载中通知
                        const loadingNotification = page.locator('.notification.loading');
                        const loadingCount = await loadingNotification.count();
                        console.log(`加载中通知数量: ${loadingCount}`);

                        if (loadingCount > 0) {
                            console.log('✅ 找到加载中通知!');

                            // 详细检查加载中通知
                            const notificationDetails = await loadingNotification.evaluate(el => {
                                const rect = el.getBoundingClientRect();
                                const style = window.getComputedStyle(el);
                                const messageElement = el.querySelector('.notification-message');
                                const messageText = messageElement ? messageElement.textContent : '';

                                return {
                                    height: rect.height,
                                    width: rect.width,
                                    backgroundImage: style.backgroundImage,
                                    backgroundColor: style.backgroundColor,
                                    display: style.display,
                                    opacity: style.opacity,
                                    visible: style.visibility !== 'hidden',
                                    message: messageText,
                                    innerHTML: el.innerHTML.substring(0, 300) + '...'
                                };
                            });

                            console.log('=== 加载中通知详细信息 ===');
                            console.log(JSON.stringify(notificationDetails, null, 2));

                            // 检查关键指标
                            expect(notificationDetails.backgroundImage).toContain('linear-gradient');
                            expect(notificationDetails.display).toBe('flex');
                            expect(notificationDetails.height).toBeGreaterThanOrEqual(50); // 至少50px高度
                            expect(notificationDetails.message).toContain('正在从');

                            // 截图保存加载中通知
                            await page.screenshot({ path: 'health-data-loading-notification.png' });

                            // 等待加载完成（成功或失败通知）
                            await page.waitForTimeout(5000);

                            // 检查是否有成功或失败通知
                            const successNotification = page.locator('.notification.success');
                            const errorNotification = page.locator('.notification.error');
                            const infoNotification = page.locator('.notification.info');

                            if (await successNotification.count() > 0) {
                                console.log('✅ 数据加载成功');
                                await page.screenshot({ path: 'health-data-success.png' });
                            } else if (await errorNotification.count() > 0) {
                                console.log('⚠️ 数据加载失败');
                                await page.screenshot({ path: 'health-data-error.png' });
                            } else if (await infoNotification.count() > 0) {
                                console.log('ℹ️ 收到信息通知');
                                await page.screenshot({ path: 'health-data-info.png' });
                            } else {
                                console.log('⚠️ 未收到后续通知');
                            }

                        } else {
                            console.log('❌ 未找到加载中通知');
                            await page.screenshot({ path: 'health-data-no-loading.png' });
                        }

                    } else {
                        console.log(`⚠️ 按钮不可见或不可用: 可见=${isVisible}, 可用=${isEnabled}`);
                        await page.screenshot({ path: 'health-data-button-disabled.png' });
                    }

                } else {
                    console.log('❌ 未找到获取数据按钮');
                    await page.screenshot({ path: 'health-data-no-button.png' });
                }

            } else {
                console.log('❌ 未找到体检ID输入框');
                await page.screenshot({ path: 'health-data-no-input.png' });
            }

        } else {
            console.log('❌ 未找到科室选择器');
            await page.screenshot({ path: 'health-data-no-selector.png' });
        }
    });

    test('测试不同科室的加载通知', async ({ page }) => {
        await page.goto('http://localhost:8080/health-data.html');
        await page.waitForTimeout(2000);

        const departmentSelector = page.locator('select');
        if (await departmentSelector.count() > 0) {
            // 测试不同科室
            const departments = ['检验科', '常规科室', '影像科室'];

            for (const dept of departments) {
                console.log(`\n=== 测试 ${dept} ===`);

                // 选择科室
                await departmentSelector.selectOption({ label: dept });
                await page.waitForTimeout(500);

                // 输入测试ID
                const examIdInput = page.locator('input[type="text"]').first();
                await examIdInput.fill(`TEST_${dept}`);
                await page.waitForTimeout(500);

                // 尝试获取数据
                const button = page.locator('button').first();
                const isVisible = await button.isVisible();

                if (isVisible) {
                    await button.click();
                    await page.waitForTimeout(1000);

                    const loadingNotification = page.locator('.notification.loading');
                    if (await loadingNotification.count() > 0) {
                        const message = await loadingNotification.locator('.notification-message').textContent();
                        console.log(`✅ ${dept} 加载通知: "${message}"`);

                        // 检查通知高度
                        const height = await loadingNotification.evaluate(el => el.getBoundingClientRect().height);
                        console.log(`📏 通知高度: ${height}px`);

                        if (height < 50) {
                            console.log(`⚠️ ${dept} 通知高度过小: ${height}px`);
                        } else {
                            console.log(`✅ ${dept} 通知高度正常: ${height}px`);
                        }

                        await page.screenshot({ path: `loading-${dept.replace(/[^a-zA-Z0-9]/g, '_')}.png` });
                    } else {
                        console.log(`❌ ${dept} 未显示加载通知`);
                    }

                    // 等待通知消失
                    await page.waitForTimeout(3000);
                } else {
                    console.log(`⚠️ ${dept} 按钮不可见`);
                }
            }
        }
    });
});
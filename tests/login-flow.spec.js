const { test, expect } = require('@playwright/test');

test.describe('完整登录流程测试', () => {
  test('测试完整的登录和token验证流程', async ({ page }) => {
    try {
      // 监听API请求
      const apiRequests = [];
      const apiResponses = [];

      page.on('request', request => {
        if (request.url().includes('/api/')) {
          apiRequests.push({
            url: request.url(),
            method: request.method(),
            headers: request.headers(),
            postData: request.postData()
          });
          console.log('🔵 API请求:', request.method(), request.url());
        }
      });

      page.on('response', response => {
        if (response.url().includes('/api/')) {
          apiResponses.push({
            url: response.url(),
            status: response.status(),
            statusText: response.statusText()
          });
          console.log('🟢 API响应:', response.status(), response.url());
        }
      });

      page.on('requestfailed', request => {
        if (request.url().includes('/api/')) {
          console.error('🔴 API请求失败:', request.url(), request.failure().errorText);
        }
      });

      // 1. 直接访问登录页面
      console.log('步骤1: 访问登录页面');
      await page.goto('http://127.0.0.1:8080/login.html');
      await page.waitForLoadState('networkidle');

      // 2. 填写登录信息（使用默认管理员账号）
      console.log('步骤2: 填写登录信息');
      await page.fill('input[name="username"]', 'admin');
      await page.fill('input[name="password"]', 'admin123');

      // 3. 点击登录按钮
      console.log('步骤3: 点击登录');
      await Promise.all([
        page.waitForResponse(response => response.url().includes('/api/auth/login')),
        page.click('button[type="submit"]')
      ]);

      // 等待登录完成
      await page.waitForTimeout(2000);

      console.log('API请求数量:', apiRequests.length);
      console.log('API响应数量:', apiResponses.length);

      // 4. 检查登录结果
      const currentUrl = page.url();
      console.log('当前页面URL:', currentUrl);

      if (currentUrl.includes('dashboard.html')) {
        console.log('✅ 登录成功，已跳转到仪表板');

        // 5. 检查localStorage中的token
        const token = await page.evaluate(() => {
          return localStorage.getItem('token');
        });
        const user = await page.evaluate(() => {
          return JSON.parse(localStorage.getItem('user') || '{}');
        });

        console.log('Token:', token ? '已保存' : '未保存');
        console.log('用户信息:', JSON.stringify(user, null, 2));

        // 6. 测试token验证 - 重新访问首页
        console.log('步骤6: 测试token验证');
        await page.goto('http://127.0.0.1:8080/');
        await page.waitForTimeout(3000);

        const finalUrl = page.url();
        console.log('重新访问首页后的URL:', finalUrl);

        if (finalUrl.includes('dashboard.html')) {
          console.log('✅ Token验证成功，保持登录状态');
        } else {
          console.log('❌ Token验证失败，跳转到了其他页面');
        }

      } else {
        console.log('❌ 登录失败或未正确跳转');

        // 检查是否有错误消息
        const errorElements = await page.locator('.error, .alert-danger, [class*="error"]').count();
        if (errorElements > 0) {
          const errorText = await page.locator('.error, .alert-danger, [class*="error"]').first().textContent();
          console.log('错误消息:', errorText);
        }
      }

      // 截图最终状态
      await page.screenshot({ path: 'test-results/login-flow-final.png' });

    } catch (error) {
      console.error('登录流程测试失败:', error);
      await page.screenshot({ path: 'test-results/login-flow-error.png' });
      throw error;
    }
  });

  test('测试检客管理页面访问', async ({ page }) => {
    try {
      console.log('开始测试检客管理页面...');

      // 先登录
      await page.goto('http://127.0.0.1:8080/login.html');
      await page.fill('input[name="username"]', 'admin');
      await page.fill('input[name="password"]', 'admin123');

      // 等待登录完成
      await Promise.all([
        page.waitForResponse(response => response.url().includes('/api/auth/login')),
        page.click('button[type="submit"]')
      ]);

      await page.waitForTimeout(2000);

      // 检查是否成功登录
      expect(page.url()).toContain('dashboard.html');

      // 访问检客管理页面
      console.log('访问检客管理页面...');
      await page.goto('http://127.0.0.1:8080/customers.html');
      await page.waitForLoadState('networkidle');

      // 检查页面是否正常加载
      const pageContent = await page.content();
      const hasCustomerTitle = pageContent.includes('检客管理');
      const hasAddButton = await page.locator('button:has-text("新增检客")').count();

      console.log('检客管理页面标题:', hasCustomerTitle);
      console.log('新增检客按钮数量:', hasAddButton);

      // 截图
      await page.screenshot({ path: 'test-results/customers-page.png' });

      // 尝试点击新增检客按钮
      if (hasAddButton > 0) {
        console.log('点击新增检客按钮...');
        await page.click('button:has-text("新增检客")');
        await page.waitForTimeout(2000);

        // 检查是否弹出模态框
        const modalExists = await page.locator('.fixed.inset-0, [role="dialog"], .modal').count();
        console.log('模态框数量:', modalExists);

        await page.screenshot({ path: 'test-results/customers-modal.png' });
      }

    } catch (error) {
      console.error('检客管理页面测试失败:', error);
      await page.screenshot({ path: 'test-results/customers-error.png' });
      throw error;
    }
  });
});
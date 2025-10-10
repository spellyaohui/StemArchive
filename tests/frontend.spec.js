const { test, expect } = require('@playwright/test');

test.describe('前端页面测试', () => {
  test('首页加载和路由测试', async ({ page }) => {
    try {
      console.log('开始测试首页...');

      // 访问首页
      await page.goto('http://127.0.0.1:8080');

      // 等待页面加载完成
      await page.waitForLoadState('networkidle');

      // 截图保存当前状态
      await page.screenshot({ path: 'test-results/homepage.png' });

      // 检查页面标题
      const title = await page.title();
      console.log('页面标题:', title);

      // 检查是否有错误信息
      const errorElements = await page.locator('.error, .alert-danger, [class*="error"]').count();
      if (errorElements > 0) {
        console.log('发现错误元素:', errorElements);
        const errorText = await page.locator('.error, .alert-danger, [class*="error"]').first().textContent();
        console.log('错误内容:', errorText);
      }

      // 检查页面内容
      const content = await page.content();
      console.log('页面URL:', page.url());

      // 检查是否包含干细胞系统相关内容
      const hasSystemTitle = await page.locator('text=干细胞治疗档案管理系统').count();
      console.log('系统标题元素数量:', hasSystemTitle);

      // 检查是否有跳转逻辑
      const hasLoadingText = await page.locator('text=系统正在启动').count();
      console.log('加载文本元素数量:', hasLoadingText);

      // 等待可能的跳转
      await page.waitForTimeout(3000);

      // 再次检查URL
      console.log('等待后的页面URL:', page.url());

      // 如果跳转到登录页面，检查登录页面
      if (page.url().includes('login.html')) {
        console.log('已跳转到登录页面');
        await page.screenshot({ path: 'test-results/login-page.png' });

        // 检查登录表单元素
        const usernameInput = await page.locator('input[name="username"], input[type="text"]').count();
        const passwordInput = await page.locator('input[name="password"], input[type="password"]').count();
        const loginButton = await page.locator('button[type="submit"], button:has-text("登录")').count();

        console.log('用户名输入框数量:', usernameInput);
        console.log('密码输入框数量:', passwordInput);
        console.log('登录按钮数量:', loginButton);
      }

      // 检查控制台错误
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          console.log('控制台错误:', msg.text());
        }
      });

      // 检查网络请求错误
      page.on('requestfailed', (request) => {
        console.log('请求失败:', request.url(), request.failure().errorText);
      });

      console.log('测试完成');

    } catch (error) {
      console.error('测试执行失败:', error);
      await page.screenshot({ path: 'test-results/error.png' });
      throw error;
    }
  });

  test('登录页面功能测试', async ({ page }) => {
    try {
      console.log('开始测试登录页面...');

      // 直接访问登录页面
      await page.goto('http://127.0.0.1:8080/login.html');
      await page.waitForLoadState('networkidle');

      // 截图
      await page.screenshot({ path: 'test-results/login-direct.png' });

      // 检查登录表单
      await expect(page.locator('input[name="username"]')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('input[name="password"]')).toBeVisible({ timeout: 5000 });

      console.log('登录页面表单元素正常');

      // 尝试输入测试数据
      await page.fill('input[name="username"]', 'test_user');
      await page.fill('input[name="password"]', 'test_password');

      console.log('表单输入完成');

      // 截图输入后的状态
      await page.screenshot({ path: 'test-results/login-filled.png' });

    } catch (error) {
      console.error('登录页面测试失败:', error);
      await page.screenshot({ path: 'test-results/login-error.png' });
      throw error;
    }
  });

  test('API连接测试', async ({ page }) => {
    try {
      console.log('开始测试API连接...');

      // 访问首页
      await page.goto('http://127.0.0.1:8080');

      // 监听网络请求
      const apiRequests = [];
      page.on('request', request => {
        if (request.url().includes('/api/')) {
          apiRequests.push({
            url: request.url(),
            method: request.method(),
            headers: request.headers()
          });
          console.log('API请求:', request.url(), request.method());
        }
      });

      // 监听响应
      const apiResponses = [];
      page.on('response', response => {
        if (response.url().includes('/api/')) {
          apiResponses.push({
            url: response.url(),
            status: response.status(),
            statusText: response.statusText()
          });
          console.log('API响应:', response.url(), response.status());
        }
      });

      // 等待页面加载和可能的API调用
      await page.waitForTimeout(5000);

      console.log('API请求数量:', apiRequests.length);
      console.log('API响应数量:', apiResponses.length);

      // 检查是否有API调用失败
      const failedResponses = apiResponses.filter(r => r.status >= 400);
      if (failedResponses.length > 0) {
        console.log('失败的API响应:', failedResponses);
      }

    } catch (error) {
      console.error('API连接测试失败:', error);
      throw error;
    }
  });
});
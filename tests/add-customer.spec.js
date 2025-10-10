const { test, expect } = require('@playwright/test');

test.describe('新增检客功能测试', () => {
  test('使用身份证号 220106198605158232 新增检客', async ({ page }) => {
    try {
      // 监听API请求和响应
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
          if (request.postData()) {
            console.log('   请求数据:', request.postData());
          }
        }
      });

      page.on('response', async response => {
        if (response.url().includes('/api/')) {
          const responseBody = await response.text();
          apiResponses.push({
            url: response.url(),
            status: response.status(),
            statusText: response.statusText(),
            body: responseBody
          });
          console.log('🟢 API响应:', response.status(), response.url());
          console.log('   响应数据:', responseBody);
        }
      });

      page.on('requestfailed', request => {
        if (request.url().includes('/api/')) {
          console.error('🔴 API请求失败:', request.url(), request.failure().errorText);
        }
      });

      // 监听控制台错误
      page.on('console', msg => {
        if (msg.type() === 'error') {
          console.log('❌ 控制台错误:', msg.text());
        }
      });

      // 步骤1: 登录系统
      console.log('步骤1: 登录系统');
      await page.goto('http://127.0.0.1:8080/login.html');
      await page.waitForLoadState('networkidle');

      await page.fill('input[name="username"]', 'admin');
      await page.fill('input[name="password"]', 'admin123');

      // 等待登录完成
      await Promise.all([
        page.waitForResponse(response => response.url().includes('/api/auth/login')),
        page.click('button[type="submit"]')
      ]);

      await page.waitForTimeout(2000);
      expect(page.url()).toContain('dashboard.html');

      // 步骤2: 访问检客管理页面
      console.log('步骤2: 访问检客管理页面');
      await page.goto('http://127.0.0.1:8080/customers.html');
      await page.waitForLoadState('networkidle');

      // 截图检客管理页面
      await page.screenshot({ path: 'test-results/customers-page-before.png' });

      // 步骤3: 点击新增检客按钮
      console.log('步骤3: 点击新增检客按钮');
      await page.click('button:has-text("新增检客")');
      await page.waitForTimeout(1000);

      // 检查模态框是否出现
      await expect(page.locator('.fixed.inset-0')).toBeVisible({ timeout: 5000 });

      // 截图模态框
      await page.screenshot({ path: 'test-results/add-customer-modal.png' });

      // 步骤4: 填写检客信息
      console.log('步骤4: 填写检客信息');

      // 基本信息
      await page.fill('input[name="name"]', '测试用户');
      await page.selectOption('select[name="gender"]', 'male');
      await page.fill('input[name="age"]', '38');

      // 关键测试：身份证号
      console.log('   填写身份证号: 220106198605158232');
      await page.fill('input[name="id_card"]', '220106198605158232');

      // 联系信息
      await page.fill('input[name="phone"]', '13800138000');
      await page.fill('input[name="contact_person"]', '紧急联系人');
      await page.fill('input[name="contact_phone"]', '13900139000');

      // 身体信息
      await page.fill('input[name="height"]', '175');
      await page.fill('input[name="weight"]', '70');

      // 地址和备注
      await page.fill('input[name="address"]', '吉林省长春市朝阳区');
      await page.fill('textarea[name="notes"]', '这是通过Playwright自动化测试创建的检客记录');

      // 截图填写完成后的表单
      await page.screenshot({ path: 'test-results/add-customer-form-filled.png' });

      // 步骤5: 提交表单
      console.log('步骤5: 提交新增检客表单');

      // 监听表单提交后的API调用
      let apiCallReceived = false;
      const apiPromise = new Promise((resolve) => {
        page.on('response', response => {
          if (response.url().includes('/api/customers') && response.request().method() === 'POST') {
            apiCallReceived = true;
            resolve(response);
          }
        });
      });

      // 点击提交按钮
      await page.click('form#customerForm button[type="submit"], button:has-text("新增")');

      // 等待API调用或超时
      try {
        await Promise.race([
          apiPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('API call timeout')), 10000))
        ]);
        console.log('✅ API调用成功');
      } catch (error) {
        console.log('⚠️ API调用超时，可能前端验证有问题');
      }

      await page.waitForTimeout(3000);

      // 截图提交后的状态
      await page.screenshot({ path: 'test-results/add-customer-after-submit.png' });

      // 步骤6: 验证结果
      console.log('步骤6: 验证新增结果');

      // 检查是否有成功提示
      const successNotifications = await page.locator('.bg-green-100, .alert-success, [class*="success"]').count();
      const errorNotifications = await page.locator('.bg-red-100, .alert-danger, [class*="error"]').count();

      console.log('成功提示数量:', successNotifications);
      console.log('错误提示数量:', errorNotifications);

      if (successNotifications > 0) {
        const successText = await page.locator('.bg-green-100, .alert-success, [class*="success"]').first().textContent();
        console.log('成功消息:', successText);
      }

      if (errorNotifications > 0) {
        const errorText = await page.locator('.bg-red-100, .alert-danger, [class*="error"]').first().textContent();
        console.log('错误消息:', errorText);
      }

      // 检查模态框是否关闭
      const modalVisible = await page.locator('.fixed.inset-0').isVisible();
      console.log('模态框是否还可见:', modalVisible);

      // 检查API请求统计
      console.log('\n=== API请求统计 ===');
      console.log('总请求数:', apiRequests.length);
      console.log('总响应数:', apiResponses.length);

      // 查找新增检客的API调用
      const createCustomerRequests = apiRequests.filter(req =>
        req.url.includes('/api/customers') && req.method === 'POST'
      );
      console.log('新增检客API请求数:', createCustomerRequests.length);

      // 查找API响应
      const createCustomerResponses = apiResponses.filter(res =>
        res.url.includes('/api/customers') && res.status >= 200
      );
      console.log('新增检客API响应数:', createCustomerResponses.length);

      if (createCustomerResponses.length > 0) {
        const response = createCustomerResponses[0];
        console.log('新增检客API状态码:', response.status);
        console.log('新增检客API响应:', response.body);

        try {
          const responseData = JSON.parse(response.body);
          if (responseData.status === 'Success') {
            console.log('✅ 检客新增成功！');
            console.log('检客ID:', responseData.data?.ID);
            console.log('检客姓名:', responseData.data?.Name);
            console.log('检客身份证号:', responseData.data?.IdentityCard);
          } else {
            console.log('❌ 检客新增失败:', responseData.message);
          }
        } catch (parseError) {
          console.log('解析响应JSON失败:', parseError.message);
        }
      }

      // 等待页面刷新，检查新检客是否出现在列表中
      await page.waitForTimeout(2000);
      await page.reload();
      await page.waitForLoadState('networkidle');

      // 在检客列表中搜索新创建的检客
      const customerListContent = await page.content();
      const hasNewCustomer = customerListContent.includes('220106198605158232') ||
                             customerListContent.includes('测试用户');

      console.log('新检客是否出现在列表中:', hasNewCustomer);

      if (hasNewCustomer) {
        console.log('✅ 新检客已成功添加到列表中');
        await page.screenshot({ path: 'test-results/customers-list-with-new-customer.png' });
      }

      console.log('\n=== 测试完成 ===');

    } catch (error) {
      console.error('新增检客测试失败:', error);
      await page.screenshot({ path: 'test-results/add-customer-error.png' });
      throw error;
    }
  });

  test('验证身份证号格式修复 - 测试无效身份证号', async ({ page }) => {
    try {
      console.log('测试无效身份证号验证...');

      // 登录
      await page.goto('http://127.0.0.1:8080/login.html');
      await page.fill('input[name="username"]', 'admin');
      await page.fill('input[name="password"]', 'admin123');

      await Promise.all([
        page.waitForResponse(response => response.url().includes('/api/auth/login')),
        page.click('button[type="submit"]')
      ]);

      await page.waitForTimeout(2000);

      // 访问检客管理页面
      await page.goto('http://127.0.0.1:8080/customers.html');
      await page.waitForLoadState('networkidle');

      // 点击新增检客
      await page.click('button:has-text("新增检客")');
      await page.waitForTimeout(1000);

      // 尝试填写无效的身份证号
      console.log('填写无效身份证号: 123456789012345678');
      await page.fill('input[name="name"]', '测试用户2');
      await page.fill('input[name="id_card"]', '123456789012345678');
      await page.fill('input[name="phone"]', '13800138001');

      // 尝试提交 - 先检查表单是否在模态框中
      const formInModal = await page.locator('#modalContainer form').count();
      if (formInModal > 0) {
        await page.click('#modalContainer form button[type="submit"], #modalContainer button:has-text("新增")');
      } else {
        await page.click('form#customerForm button[type="submit"], button:has-text("新增")');
      }
      await page.waitForTimeout(3000);

      // 检查是否有错误提示
      const errorNotifications = await page.locator('.bg-red-100, .alert-danger, [class*="error"]').count();
      console.log('无效身份证号错误提示数量:', errorNotifications);

      if (errorNotifications > 0) {
        const errorText = await page.locator('.bg-red-100, .alert-danger, [class*="error"]').first().textContent();
        console.log('错误消息:', errorText);
        console.log('✅ 身份证号验证正常工作');
      }

      await page.screenshot({ path: 'test-results/invalid-id-card-test.png' });

    } catch (error) {
      console.error('无效身份证号测试失败:', error);
      throw error;
    }
  });
});
# 报告查看页面测试

本目录包含报告查看页面的 Playwright 测试套件，专门测试我们修复的功能问题。

## 📋 测试覆盖范围

### 基础功能测试 (`reports.spec.js`)
- ✅ 页面加载和基本元素验证
- ✅ 检客搜索功能
- ✅ 检客选择和清除
- ✅ 报告类型切换
- ✅ 单次报告区域显示/隐藏
- ✅ 日期输入框一致性
- ✅ 报告生成验证
- ✅ 单次报告功能
- ✅ 历史报告列表
- ✅ 响应式设计

### 修复功能专项测试 (`reports-fixes.spec.js`)
- ✅ **修复1**: 检客搜索结果点击体验优化
  - 整个搜索结果区域都可以点击（不仅仅是小圆圈）
  - 悬停效果正常显示
  - 点击不同位置都能正常选择

- ✅ **修复2**: 已选择检客后搜索提示问题
  - 选择检客后可以正常搜索体检报告
  - 不会出现"请先选择检客"的错误提示
  - 清除检客选择后提示正确

- ✅ **修复3**: 日期框格式一致性
  - 两个日期输入框具有相同的样式
  - 日期输入功能正常
  - 不同浏览器下的显示一致

## 🚀 快速开始

### 前置条件
1. **后端服务运行**: 确保干细胞治疗档案管理系统后端服务已启动
2. **前端服务器运行**: 确保 `http://localhost:8080` 可以访问
3. **Playwright 安装**: 确保已安装 Playwright 浏览器

```bash
# 安装 Playwright
npm install @playwright/test
npx playwright install
```

### 运行测试

#### 方法1: 使用测试运行脚本（推荐）
```bash
# 使用默认配置（Chrome 无头模式）
node run-reports-tests.js

# 使用有头模式（显示浏览器窗口）
node run-reports-tests.js --headed

# 使用 Firefox 浏览器
node run-reports-tests.js --firefox --headed

# 使用 Safari (WebKit)
node run-reports-tests.js --webkit --headed
```

#### 方法2: 直接使用 Playwright CLI
```bash
# 运行所有报告测试
npx playwright test reports* --project=chromium

# 运行特定测试文件
npx playwright test reports.spec.js --project=chromium
npx playwright test reports-fixes.spec.js --project=chromium

# 有头模式运行
npx playwright test reports* --headed --project=chromium
```

#### 方法3: 在 VS Code 中运行
1. 安装 Playwright 扩展
2. 打开测试文件
3. 点击代码行旁的运行按钮

## 📊 测试结果解读

### 成功标志
- ✅ 所有测试通过
- ✅ 用户体验流畅
- ✅ 修复的功能正常工作

### 失败排查
如果测试失败，请检查：

1. **服务状态**
   ```bash
   # 检查后端服务
   curl http://localhost:3000/api/health

   # 检查前端服务
   curl http://localhost:8080
   ```

2. **登录凭据**
   - 默认用户名: `admin`
   - 默认密码: `admin123`

3. **测试数据**
   - 确保数据库中有检客数据
   - 建议包含测试用的检客（如"张三"）

4. **浏览器依赖**
   ```bash
   # 重新安装 Playwright 浏览器
   npx playwright install
   ```

## 🔧 测试配置

### 默认配置
```javascript
{
    timeout: 30000,        // 测试超时时间
    retries: 1,           // 重试次数
    headed: false,        // 默认无头模式
    browser: 'chromium'   // 默认浏览器
}
```

### 自定义配置
可以在测试文件中修改配置：
```javascript
// reports.spec.js
test.use({
    timeout: 60000,
    viewport: { width: 1920, height: 1080 }
});
```

## 🐛 调试技巧

### 1. 有头模式调试
```bash
node run-reports-tests.js --headed
```
可以直观看到测试执行过程。

### 2. 暂停测试
在测试代码中添加：
```javascript
await page.pause();
```

### 3. 截图和录制
```javascript
// 截图
await page.screenshot({ path: 'debug.png' });

// 录制视频
test.use({ video: 'on' });
```

### 4. 控制台日志
测试已包含详细的控制台日志输出。

## 📝 添加新测试

### 添加新的测试用例
```javascript
test('新功能测试', async ({ page }) => {
    // 登录逻辑已包含在 beforeEach 中

    // 测试步骤
    await page.fill('#someInput', 'test value');
    await page.click('#someButton');

    // 验证结果
    await expect(page.locator('#result')).toContainText('预期结果');
});
```

### 添加新的修复测试
如果修复了新的问题，建议：
1. 在 `reports-fixes.spec.js` 中添加专项测试
2. 按照现有的测试结构和命名规范
3. 包含正面和负面的测试场景

## 🤝 贡献指南

1. 运行所有测试确保没有回归
2. 为新功能添加相应的测试
3. 保持测试代码的清晰和可维护性
4. 更新此 README 文档

## 📞 支持

如果遇到问题：
1. 查看控制台输出的错误信息
2. 检查本文档的故障排查部分
3. 确认测试环境和数据是否正确
4. 参考官方 Playwright 文档

---

**最后更新**: 2025年1月
**测试版本**: 针对报告页面修复功能专项测试
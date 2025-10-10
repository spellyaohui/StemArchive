# CLAUDE.md

本文件为Claude Code (claude.ai/code)在此代码库中工作时提供指导。

## 系统概述

这是一个干细胞治疗档案管理系统，采用Node.js/Express后端和原生JavaScript前端。系统管理干细胞治疗的患者信息、健康数据、治疗计划和输液调度。

## 重要交流规则

**Claude 必须始终使用中文与用户交流** - 在所有回复、解释和沟通中使用中文，但代码示例、文件路径、命令行指令和技术术语保持原格式以确保工具调用正常工作。

## 开发命令

### 后端开发
```bash
# 启动后端服务器（开发模式）- 推荐使用热重载
cd backend
npm run dev          # 使用nodemon进行热重载（推荐开发时使用）
npm start            # 生产环境启动
node server.js       # 直接启动

# 运行测试
npm test             # 运行Jest测试

# 终止进程命令
taskkill /f /pid XXXX
```

**重要提示**: 开发时请使用 `npm run dev` 命令启动后端，因为该命令支持热重载功能，修改代码后无需手动重启服务器，大大提高开发效率。

### 前端开发
```bash
# 启动前端服务器
cd frontend
npx http-server -p 8080    # 简单静态服务器
# 或使用任何其他静态文件服务器
```

### Playwright测试

#### Playwright安装和配置
**重要**：Playwright浏览器需要单独安装，否则运行测试时会报错。

```bash
# 检查Playwright是否已安装
cd frontend
dir node_modules\.bin\playwright

# 如果未安装，请运行以下命令安装浏览器
npx playwright install chromium

# 或者安装所有支持的浏览器
npx playwright install
```

#### Playwright测试运行方法
```bash
# 进入测试目录
cd frontend/tests

# 运行所有测试（无头模式）
npx playwright test

# 运行特定测试文件
npx playwright test debug-simple.spec.js

# 运行测试并显示浏览器界面（便于调试）
npx playwright test debug-simple.spec.js --headed

# 按项目运行测试
npx playwright test --project=chromium           # Chrome浏览器
npx playwright test --project=firefox            # Firefox浏览器
npx playwright test --project=webkit             # Safari浏览器

# 运行特定测试的特定用例
npx playwright test debug-simple.spec.js --grep "DOM操作"

# 生成测试报告
npx playwright test --reporter=html
```

#### 测试文件位置和组织
```
frontend/tests/
├── debug-settings.spec.js          # 调试设置页面的测试
├── debug-simple.spec.js            # 简单DOM操作测试
├── system-name-update.spec.js     # 系统名称更新功能测试
├── persistent-settings.spec.js    # 持久化存储功能测试
└── test-results/                  # 测试结果和报告
```

#### 重要：Playwright测试登录机制
**系统登录要求**：所有Playwright测试必须先完成登录才能访问其他功能！

```javascript
// 标准登录流程
async function login(page) {
    await page.goto('http://localhost:8080/login.html');
    await page.waitForTimeout(1000);

    // 使用正确的name属性选择器
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // 等待登录成功并跳转到dashboard
    await page.waitForURL('http://localhost:8080/dashboard.html');
    await page.waitForTimeout(1000);
}
```

#### 重要：Playwright测试中的登录表单选择器
**特别注意**：登录表单中的输入框使用的是 `name` 属性而不是 `id` 属性！

```javascript
// ❌ 错误的选择器方式
await page.fill('#username', 'admin');     // 不会工作
await page.fill('#password', 'admin123');   // 不会工作

// ✅ 正确的选择器方式
await page.fill('input[name="username"]', 'admin');     // 正确
await page.fill('input[name="password"]', 'admin123');   // 正确

// 或者使用属性选择器
await page.fill('[name="username"]', 'admin');         // 正确
await page.fill('[name="password"]', 'admin123');       // 正确
```

#### 常用Playwright命令示例
```bash
# 运行系统名称更新相关测试
npx playwright test system-name-update.spec.js

# 运行持久化存储测试
npx playwright test persistent-settings.spec.js

# 运行调试页面测试
npx playwright test debug-simple.spec.js --headed

# 运行测试并显示实时输出
npx playwright test --reporter=list

# 并行运行测试（加快执行速度）
npx playwright test --workers=4
```

#### 测试调试技巧
```bash
# 使用--headed参数查看浏览器执行过程
npx playwright test debug-simple.spec.js --headed

# 使用调试模式逐步执行
npx playwright test debug-simple.spec.js --debug

# 生成详细报告便于分析
npx playwright test --reporter=html --reporter=line

# 只运行失败的测试
npx playwright test --grep "failed"
```

##### 常见问题解决
1. **浏览器未安装错误**：运行 `npx playwright install chromium`
2. **端口占用错误**：确保后端运行在5000端口，前端运行在8080端口
3. **登录失败错误**：检查登录表单选择器是否正确使用name属性
4. **测试超时错误**：适当增加 `page.waitForTimeout()` 时间
5. **Windows路径问题**：使用反斜杠 `\` 或双反斜杠 `\\` 处理文件路径
6. **进程终止**：使用 `taskkill /f /pid <进程ID>` 或 `taskkill /f /im node.exe` 终止进程
7. **权限问题**：以管理员身份运行PowerShell或CMD
8. **环境变量**：在Windows系统环境变量中设置，或在PowerShell中使用 `$env:` 语法

#### Windows特定问题排查
```bash
# 查看端口占用情况
netstat -ano | findstr :5000
netstat -ano | findstr :8080

# 终止Node.js进程
taskkill /f /im node.exe

# 查看Node.js版本
node --version
npm --version

# 清除npm缓存
npm cache clean --force

# 重新安装依赖
rmdir /s node_modules
del package-lock.json
npm install
```

#### CSS文件和字体管理
系统使用本地CSS文件和字体文件，避免依赖在线CDN：
- `css/tailwind.css` - 本地Tailwind CSS文件
- `css/fontawesome.min.css` - 本地FontAwesome CSS文件
- `webfonts/` - FontAwesome字体文件目录
- `css/main.css` - 自定义样式文件（包含状态颜色定义和页脚固定布局）

### CDN本地化规范 ⚠️ **重要**

#### 基本原则
为提高系统稳定性和减少外部依赖，**严禁使用任何在线CDN资源**。所有第三方库和框架必须使用本地版本。

#### 本地文件映射
```
CDN资源 → 本地文件映射：
├── JavaScript库
│   └── https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js → js/chart.js
├── CSS框架
│   ├── https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css → css/tailwind.css
│   └── https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css → css/fontawesome.min.css
└── 字体文件
    └── FontAwesome字体 → css/fontawesome/ 和 webfonts/ 目录
```

#### 禁用的CDN模式
```html
<!-- ❌ 禁止使用以下CDN引用 -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
```

#### 正确的本地引用模式
```html
<!-- ✅ 正确的本地文件引用 -->
<script src="js/chart.js"></script>
<link href="css/tailwind.css" rel="stylesheet">
<link href="css/fontawesome.min.css" rel="stylesheet">
```

#### 已本地化的文件清单
1. **Chart.js (图表库)**
   - 源文件: `node_modules/chart.js/dist/chart.umd.js`
   - 本地文件: `js/chart.js`
   - 使用页面: dashboard.html, statistics.html

2. **Tailwind CSS (CSS框架)**
   - 本地文件: `css/tailwind.css`
   - 使用页面: 所有核心HTML页面

3. **FontAwesome (图标库)**
   - CSS文件: `css/fontawesome.min.css`
   - 字体文件: `webfonts/` 目录
   - 使用页面: 所有核心HTML页面

#### 本地化安装流程
当需要添加新的第三方库时：

1. **通过npm安装**
```bash
cd frontend
npm install [package-name]
```

2. **复制到本地目录**
```bash
# JavaScript库
cp node_modules/[package]/dist/[file].js js/[filename].js

# CSS库
cp node_modules/[package]/dist/[file].css css/[filename].css
```

3. **更新HTML引用**
```html
<!-- 将CDN引用替换为本地引用 -->
<script src="js/[filename].js"></script>
<link href="css/[filename].css" rel="stylesheet">
```

#### 检查和维护
- **定期检查**: 使用grep命令搜索所有HTML文件中的CDN引用
- **自动化检测**: 在代码审查中检查是否有新的CDN引用被添加
- **版本管理**: 本地文件版本应与项目package.json中声明的版本保持一致

#### 常见问题和解决方案
1. **Chart未定义错误**: 确保使用本地 `js/chart.js` 而非CDN版本
2. **图标不显示**: 检查 `css/fontawesome.min.css` 和 `webfonts/` 目录是否存在
3. **样式丢失**: 确认使用本地 `css/tailwind.css` 而非CDN版本
4. **文件路径错误**: 使用相对路径，确保文件位置正确

#### 优势
- **系统稳定性**: 不受外部CDN服务可用性影响
- **加载速度**: 本地文件加载更快，无网络延迟
- **安全合规**: 避免外部资源的安全风险
- **离线支持**: 支持完全离线环境运行
- **版本锁定**: 避免CDN版本更新导致的兼容性问题

#### 页脚布局固定
- **实现方式**: 使用CSS Flexbox布局确保页脚固定在页面底部
- **适用页面**: 所有带`<main>`标签的页面（dashboard、customers、health-data等）
- **特殊处理**: 登录页面保持原有居中设计，版权信息显示在登录框内
- **响应式支持**: 在各种屏幕尺寸下页脚都能正确显示

当创建Playwright测试时，请确保：
1. 使用正确的登录表单选择器（name属性而非id属性）
2. 等待页面加载完成（使用waitForTimeout）
3. 验证CSS和字体文件正确加载

### 数据库部署
```bash
# 对于新部署，请按顺序执行脚本：
cd database
# 执行 01-database-init.sql（主要初始化）
# 执行 02-views-and-procedures.sql（视图和存储过程）
# 执行 03-indexes-and-constraints.sql（优化）
# 执行 04-initial-data.sql（种子数据）
# 执行 05-deployment-validation.sql（验证）

# Windows PowerShell 执行SQL脚本示例：
sqlcmd -S your_server -U sa -P your_password -d HealthRecordSystem -i 01-database-init.sql

# Windows CMD 执行SQL脚本示例：
sqlcmd -S your_server -U sa -P your_password -d HealthRecordSystem -i 01-database-init.sql
```

## 架构

### 核心业务逻辑：以客户为中心的系统
系统围绕客户档案管理作为核心入口点进行设计：
- **客户优先**：所有操作都需要先建立客户档案
- **身份基础**：所有数据都以身份证号为唯一标识符进行绑定
- **多记录**：系统支持每个客户有多个健康评估、干细胞治疗、报告
- **统计单位**：身份证号作为所有分析的基本统计单位

### 数据库层
- **数据库**: Microsoft SQL Server (HealthRecordSystem)
- **ORM**: 使用mssql包的原始SQL和参数化查询
- **认证**: 基于数据库的认证，使用bcrypt密码哈希和JWT令牌
- **关键表**:
  - `Customers` (核心表) - 以身份证为主要标识符的患者记录
  - `Users` - 基于角色的访问控制认证
  - `HealthAssessments` - 按科室的健康评估记录
  - `StemCellPatients` - 干细胞治疗记录
  - `TreatmentPlans` - 治疗计划定义
  - `InfusionSchedules` - 输液调度
  - `Departments` - 科室配置
  - `DiseaseTypes` - 疾病类型定义及关键词匹配

### 后端结构
- **服务器**: Express.js，配备helmet、cors、morgan中间件
- **认证**: 基于JWT，配合数据库用户管理
- **API路由**: RESTful设计，使用`/api/`前缀
- **响应格式**: 使用`ApiResponse`工具类的统一API响应
- **中间件**:
  - `auth.js` - JWT认证
  - `customerValidation.js` - 操作前的客户存在验证
  - `errorHandler.js` - 集中错误处理
  - `rateLimiter.js` - API速率限制
- **文件上传**: Multer处理，保存在`/uploads`目录
- **数据库配置**: 基于环境变量，使用mssql连接池

### 前端结构
- **技术**: 原生JavaScript (ES5)、HTML5、CSS3
- **组件架构**: 具有BaseComponent类的可重用组件系统
- **UI组件**:
  - `DataTable.js` - 功能丰富的数据表，支持分页、排序、过滤
  - `BaseComponent.js` - 所有UI组件的基类，具有生命周期管理
- **样式**: Tailwind CSS配合Font Awesome图标
- **页面**: 多页面应用程序（login.html、dashboard.html、customers.html等）
- **图表**: Chart.js用于数据可视化
- **认证**: 基于令牌，使用localStorage存储

### 关键集成点
- **认证流程**: 前端发送凭据到`/api/auth/login`，接收JWT令牌，存储在localStorage
- **API通信**: 使用Fetch API和Bearer令牌认证，统一错误处理
- **数据流**: 数据库 → 模型 → 服务 → 控制器 → 路由 → 前端
- **文件处理**: 医疗图像上传到`/uploads`，静态服务
- **客户验证**: 所有操作都需要通过中间件验证客户存在

## 数据库配置

系统使用环境变量进行数据库连接（参见`backend/.env.example`）：
```env
DB_USER=sa
DB_PASSWORD=your_password
DB_SERVER=your_server
DB_DATABASE=HealthRecordSystem
DB_ENCRYPT=true
DB_TRUST_CERTIFICATE=true
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
```

默认管理员凭据：admin/admin123（部署后立即更改）

## 数据库部署脚本

位于`database/`目录，用于完整系统初始化：
1. **01-database-init.sql** - 主数据库创建和核心表结构
2. **02-views-and-procedures.sql** - 业务视图和存储过程
3. **03-indexes-and-constraints.sql** - 性能优化和数据完整性
4. **04-initial-data.sql** - 种子数据（科室、疾病类型、用户）
5. **05-deployment-validation.sql** - 部署验证和健康检查

## 认证系统

基于数据库的认证系统：
- 使用bcrypt哈希密码（salt轮数：12）
- 7天过期时间的JWT令牌
- 基于角色的访问控制（admin、manager、user）
- 客户验证中间件确保操作前客户档案存在

## 通知系统（提示系统规范）

### 系统概述
项目使用统一的增强版提示系统，提供美观、用户友好的通知体验。支持多种通知类型、自定义样式、操作按钮和持久化选项。

### 核心文件
- **`frontend/js/utils.js`** - 提示系统核心实现
- **`frontend/css/main.css`** - 提示样式定义
- **`frontend/notification-test.html`** - 提示系统测试页面
- **`frontend/notification-demo.html`** - 功能演示页面

### 基础使用方式

#### 1. 旧版本兼容方式（完全支持）
```javascript
// 基础提示类型
showNotification('success', '操作成功完成，数据已保存');
showNotification('error', '操作失败：网络连接超时，请重试');
showNotification('warning', '注意：输入数据格式不正确');
showNotification('info', '提示：系统将在5分钟后进行维护');
```

#### 2. 新版本推荐方式
```javascript
// 便利函数
NotificationHelper.success('数据保存成功', '操作成功');
NotificationHelper.error('网络连接失败', '连接错误');
NotificationHelper.warning('输入数据格式不正确', '数据验证');
NotificationHelper.info('系统维护提醒', '系统通知');

// 专用类型
NotificationHelper.validationError('请填写必填字段');
NotificationHelper.networkError('网络连接失败', retryCallback);
NotificationHelper.databaseError('数据库连接失败');
NotificationHelper.permissionError('权限不足');

// 状态提示
NotificationHelper.loading('正在处理数据...');
NotificationHelper.saving('正在保存数据...');
NotificationHelper.searching('正在搜索...');

// 医疗相关
NotificationHelper.medical('检验数据已更新', '医疗信息');
NotificationHelper.appointment('预约已确认', '预约信息');
```

#### 3. 高级自定义方式
```javascript
showNotification('详细消息内容', 'info', 5000, {
    title: '自定义标题',
    actionText: '执行操作',
    actionCallback: () => { /* 操作逻辑 */ },
    persistent: false
});
```

### 支持的通知类型（30+种）

#### 基础类型
- `success` - 成功操作（绿色渐变）
- `error` - 错误信息（红色渐变）
- `warning` - 警告提醒（黄色渐变）
- `info` - 信息提示（蓝色渐变）

#### 业务类型
- `validation` - 数据验证失败（紫色）
- `network` - 网络连接错误（蓝色）
- `database` - 数据库错误（红色）
- `auth` - 认证相关（橙色）
- `permission` - 权限不足（灰色）

#### 状态类型
- `loading` - 加载中（带旋转图标）
- `saving` - 保存中（绿色）
- `searching` - 搜索中（蓝色）
- `processing` - 处理中（橙色）
- `complete` - 操作完成（绿色）

#### 医疗专用
- `medical` - 医疗信息（红色）
- `appointment` - 预约信息（绿色）

### 特性功能

#### 1. 自动关闭时间
- 成功/信息提示：3秒自动关闭
- 错误/警告提示：5秒自动关闭
- 网络错误：6秒自动关闭
- 数据库错误：8秒自动关闭
- 持久化通知：不自动关闭

#### 2. 操作按钮支持
```javascript
NotificationHelper.networkError('网络连接失败', () => {
    // 重试逻辑
    retryOperation();
});
```

#### 3. 标题和详细消息
```javascript
NotificationHelper.error(
    '详细描述：无法连接到服务器，请检查网络设置',
    '网络连接错误'
);
```

### 样式特性
- **渐变背景**：每种类型都有独特的渐变色彩
- **悬停效果**：鼠标悬停时轻微上移和阴影增强
- **动画效果**：右侧滑入动画，淡出效果
- **响应式设计**：支持不同屏幕尺寸
- **图标系统**：FontAwesome图标，支持旋转动画
- **模糊背景**：backdrop-filter模糊效果

### 错误处理最佳实践

#### 1. 网络相关错误
```javascript
} catch (error) {
    if (error.message.includes('fetch')) {
        NotificationHelper.networkError('网络连接失败，请检查网络设置', () => {
            retryOperation();
        });
    }
}
```

#### 2. 数据验证错误
```javascript
if (!inputValue) {
    NotificationHelper.validationError('请填写完整的输入信息');
    return;
}
```

#### 3. 权限错误
```javascript
if (response.status === 403) {
    NotificationHelper.permissionError('您没有权限执行此操作');
    return;
}
```

### 项目规范要求
1. **统一使用**：所有页面必须使用此提示系统，禁止使用alert()
2. **明确信息**：错误提示必须包含具体原因和解决建议
3. **用户友好**：使用通俗易懂的语言，避免技术术语
4. **操作指导**：提供明确的下一步操作指导
5. **状态反馈**：长时间操作必须显示状态提示（loading/saving）

### 页面集成要求
每个HTML页面必须包含：
```html
<script src="js/utils.js"></script>
```

### 测试和调试
- 使用 `notification-test.html` 测试兼容性
- 使用 `notification-demo.html` 查看所有通知类型
- 在浏览器控制台中使用 `NotificationHelper.success('test')` 快速测试

## Windows开发环境配置

### 环境变量设置（Windows）
```powershell
# PowerShell 设置环境变量
$env:DB_USER="sa"
$env:DB_PASSWORD="your_password"
$env:DB_SERVER="localhost"
$env:DB_DATABASE="HealthRecordSystem"
$env:DB_ENCRYPT="true"
$env:DB_TRUST_CERTIFICATE="true"
$env:JWT_SECRET="your-super-secret-jwt-key-change-in-production"
$env:JWT_EXPIRES_IN="7d"

# DeepSeek API 配置
$env:DEEPSEEK_API_KEY="your_api_key_here"
$env:DEEPSEEK_BASE_URL="https://api.deepseek.com"
$env:DEEPSEEK_MODEL="deepseek-chat"

# PDF转换服务配置
$env:PDF_CONVERT_URL="http://localhost:4000/convert"
$env:PDF_CONVERT_TIMEOUT="30000"
```

```cmd
# CMD 设置环境变量
set DB_USER=sa
set DB_PASSWORD=your_password
set DB_SERVER=localhost
set DB_DATABASE=HealthRecordSystem
set DB_ENCRYPT=true
set DB_TRUST_CERTIFICATE=true
set JWT_SECRET=your-super-secret-jwt-key-change-in-production
set JWT_EXPIRES_IN=7d

# DeepSeek API 配置
set DEEPSEEK_API_KEY=your_api_key_here
set DEEPSEEK_BASE_URL=https://api.deepseek.com
set DEEPSEEK_MODEL=deepseek-chat

# PDF转换服务配置
set PDF_CONVERT_URL=http://localhost:4000/convert
set PDF_CONVERT_TIMEOUT=30000
```

### Windows服务管理
```bash
# 启动SQL Server服务（如果需要）
net start MSSQLSERVER

# 查看运行中的服务
sc query MSSQLSERVER

# 停止SQL Server服务
net stop MSSQLSERVER
```

### Windows防火墙配置
```bash
# 为Node.js添加防火墙例外（PowerShell管理员权限）
New-NetFirewallRule -DisplayName "Node.js Server" -Direction Inbound -Port 5000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "HTTP Server" -Direction Inbound -Port 8080 -Protocol TCP -Action Allow

# 查看防火墙规则
Get-NetFirewallRule -DisplayName "Node.js*"
```

## 开发指南

### API调用规范
- **第三方API调用**：所有第三方API响应必须使用 `res.json()` 方法处理
- **响应格式**：统一使用ApiResponse工具类处理API响应格式

### 数据库调试规范
- **MSSQL MCP工具优先**：所有数据库调试、查询、结构检查相关任务，优先使用MSSQL MCP工具
- **可用工具**：
  - `mcp__LOCAL-JEWEI-MSSQL-Server__query_sql` - 执行SQL查询
  - `mcp__LOCAL-JEWEI-MSSQL-Server__get_table_structure` - 获取表结构
  - `mcp__LOCAL-JEWEI-MSSQL-Server__list_tables` - 列出数据库表

### Windows文件路径处理
```javascript
// 在Node.js中处理Windows路径
const path = require('path');

// 使用path.join()确保跨平台兼容性
const uploadPath = path.join(__dirname, '..', 'uploads');
const databasePath = path.join(__dirname, '..', 'database', '01-database-init.sql');

// Windows路径示例
const windowsPath = 'D:\\Trae\\前端\\健康管理系统\\backend\\uploads';
const forwardSlashPath = 'D:/Trae/前端/健康管理系统/backend/uploads';
```

### 测试规范
- **登录机制**：系统有完整的登录认证机制，所有Playwright测试必须先完成登录才能访问其他页面
- **测试流程**：编写测试时，第一个步骤应该是登录操作

## 重要注意事项

- **以客户为中心的架构**：所有操作都围绕客户档案管理作为主要入口点
- **身份证系统**：身份证号是整个系统的基本唯一标识符
- **中文语言**：所有UI文本、数据库架构和文档都使用中文
- **数据完整性**：所有数据库操作都使用参数化查询来防止SQL注入
- **基于科室的组织**：医疗数据按科室组织，支持动态配置
- **疾病匹配**：治疗计划支持通过关键词自动匹配疾病类型
- **文件结构**：前端和后端之间关注点分离的清晰项目结构
- **统一通知系统**：所有用户反馈必须使用增强的通知系统（不使用alert()）

## AI健康评估功能补充说明

### DeepSeek API集成
系统已集成DeepSeek AI API用于智能健康评估报告生成：

#### 核心服务文件
- **`backend/src/services/deepseekService.js`** - DeepSeek API集成核心服务
- **`backend/src/services/pdfService.js`** - PDF转换服务
- **`backend/src/models/HealthAssessmentReport.js`** - 健康评估报告数据模型
- **`backend/src/routes/reports.js`** - 健康评估API路由（7个新端点）

#### API配置要求
```env
# DeepSeek API配置
DEEPSEEK_API_KEY=your_api_key_here
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat

# PDF转换API配置
PDF_CONVERT_URL=http://localhost:4000/convert
PDF_CONVERT_TIMEOUT=30000

# 对比报告配置
COMPARISON_REPORT_MAX_SELECTIONS=3
```

#### 重要技术实现细节
- **异步处理机制**: 使用 `setImmediate` 实现非阻塞异步处理
- **状态轮询**: 前端通过定期检查获取生成进度
- **超时设置**: DeepSeek API调用超时设置为10分钟（600秒）
- **错误处理**: 完善的错误分类和用户友好提示
- **数据格式**: AI响应自动转换为Markdown格式存储
- **字段使用策略**: 区分AIAnalysis和MarkdownContent字段的不同用途
  - **AIAnalysis**: 存储AI原始分析结果，用于下载原始文档和PDF转换
  - **MarkdownContent**: 存储格式化报告，用于网页展示和传统下载

#### 健康评估API端点
- `GET /api/reports/health-assessment/check?medicalExamId=xxx` - 检查是否已生成
- `POST /api/reports/health-assessment/generate` - 生成AI健康评估
- `GET /api/reports/health-assessment/:id` - 获取报告详情
- `GET /api/reports/health-assessment/:id/download` - 下载Markdown报告
- `POST /api/reports/health-assessment/:id/convert-pdf` - 转换为PDF
- `GET /api/reports/health-assessment/customer/:customerId` - 获取客户报告列表

#### 对比分析报告API端点 🆕
- `POST /api/reports/comparison/generate` - 生成AI对比分析报告
- `GET /api/reports/comparison/:id` - 获取对比报告详情
- `GET /api/reports/comparison/:id/download` - 下载Markdown对比报告
- `POST /api/reports/comparison/:id/convert-pdf` - 转换为PDF
- `GET /api/reports/comparison/customer/:customerId` - 获取客户对比报告列表
- `DELETE /api/reports/comparison/:id` - 删除对比报告

#### 前端实现特点
- **动态按钮状态**: 根据评估状态显示"生成"或"查看"按钮
- **弹窗模式**: 使用模态框替代页面跳转提升用户体验
- **状态管理**: 完善的loading状态和通知管理
- **文件下载**: 支持Markdown和PDF两种格式下载
- **Base64处理**: PDF数据使用Base64编码传输和客户端下载
- **多选功能**: 对比报告支持2-3个体检ID多选（可配置）
- **历史报告隔离**: 历史报告只在对应选项卡下显示，避免混淆
- **智能API路由**: 根据报告类型自动调用对应的下载和转换API

#### 数据库表结构
- **`HealthAssessmentReports`** - 健康评估报告主表
  - 使用 `uniqueidentifier` 作为主键
  - 存储原始AI分析、Markdown内容、PDF数据
  - 完整的审计字段（创建时间、更新时间等）

- **`ComparisonReports`** - 对比分析报告主表 🆕
  - 使用 `uniqueidentifier` 作为主键
  - 存储多个体检ID组合、对比分析数据、Markdown内容、PDF数据
  - 包含重复检查机制（5分钟窗口内相同组合去重）
  - 完整的审计字段和性能监控字段
  - 支持医疗AI分析的存储和检索

#### PDF转换集成
- **灵活配置**: 支持两种配置方式（完整URL或分离IP端口）
- **外部API调用**: 通过可配置的PDF转换服务端点
- **数据源**: 使用 `AIAnalysis` 字段内容进行PDF转换
- **数据格式**: 接收AI分析文本，返回Base64编码PDF
- **错误处理**: 完善的网络错误和服务状态检查
- **用户体验**: 转换过程显示loading提示，完成后自动下载

#### 测试和调试
- **API连通性**: 可通过DeepSeek文档页面测试API Key有效性
- **PDF服务**: 需确保PDF转换服务在localhost:4000正常运行
- **数据库检查**: 使用MSSQL MCP工具查看 `HealthAssessmentReports` 表数据
- **前端调试**: 浏览器控制台查看API调用和状态轮询日志

#### PDF转换服务配置
```javascript
// PDF服务配置逻辑 (backend/src/services/pdfService.js)
if (process.env.PDF_CONVERT_URL) {
    this.pdfConvertUrl = process.env.PDF_CONVERT_URL;
} else {
    const host = process.env.PDF_HOST || 'localhost';
    const port = process.env.PDF_PORT || '4000';
    this.pdfConvertUrl = `http://${host}:${port}/convert`;
}
```

#### 字段使用策略对比

| 功能模块 | 数据源字段 | 内容特点 | 使用场景 |
|----------|------------|----------|----------|
| **网页报告展示** | `MarkdownContent` | 格式化完整报告 | 用户查看报告 |
| **传统下载功能** | `MarkdownContent` | 包含标题、免责声明 | 标准文档下载 |
| **下载原始文档** | `AIAnalysis` | 纯AI分析结果 | 获取原始分析 |
| **PDF转换功能** | `AIAnalysis` | 纯AI分析内容 | PDF文档生成 |

#### 常见问题排查
1. **生成失败**: 检查DeepSeek API Key配置和网络连接
2. **PDF转换失败**: 确认PDF转换服务运行状态和URL配置
3. **超时问题**: 可根据需要调整API超时设置
4. **数据格式**: 确保体检数据完整性，特别是科室评估数据
5. **PDF服务配置**: 参考PDF_SERVICE_CONFIG.md获取详细配置指南

#### 医疗专业性
- **提示词工程**: 系统使用专业医疗提示词确保输出质量
- **数据结构**: 支持多科室、多指标的综合健康分析
- **报告格式**: 遵循医疗报告标准结构，包含总体评估、指标分析、健康建议等
- **免责声明**: 自动添加AI生成提示和医疗建议免责条款

## AI对比分析功能 🆕

### 功能概述
AI对比分析功能支持用户选择多个体检ID进行智能对比分析，系统将整合所有选中的体检数据，通过DeepSeek AI生成专业的对比分析报告。该功能特别适合需要追踪健康状况变化趋势的场景。

### 核心特性

#### 1. 多选体检ID
- **选择范围**: 支持2-3个体检ID进行对比分析
- **可配置性**: 通过环境变量 `COMPARISON_REPORT_MAX_SELECTIONS` 配置最大选择数量
- **智能筛选**: 支持按日期范围筛选体检记录，便于选择相关对比数据

#### 2. 重复检查机制
- **时间窗口**: 5分钟内相同体检ID组合的重复报告会被自动拦截
- **数据库约束**: 使用 `UQ_ComparisonReports_TimeWindow_Duplicates` 唯一约束
- **成本控制**: 避免重复调用DeepSeek API，节省token消耗
- **用户友好**: 提示用户已有相同组合的报告正在生成或已完成

#### 3. 智能数据处理
- **数据整合**: 自动整合多个体检ID的所有科室数据
- **时间序列**: 按体检时间顺序进行对比分析
- **指标追踪**: 智能识别关键健康指标的变化趋势
- **专业分析**: 生成包含趋势分析、健康建议的专业医疗报告

### 技术架构

#### 后端实现
```javascript
// 核心服务文件
backend/src/services/deepseekService.js      // DeepSeek AI集成
backend/src/models/ComparisonReport.js        // 对比报告数据模型
backend/src/routes/reports.js                 // 对比报告API路由
```

#### 前端实现
```javascript
// 核心文件
frontend/js/reports.js                        // 对比报告前端逻辑
frontend/reports.html                         // 对比报告UI界面
```

### API设计

#### 生成对比报告
```javascript
POST /api/reports/comparison/generate
Content-Type: application/json

{
  "customerId": "客户ID",
  "customerName": "客户姓名",
  "medicalExamIds": ["体检ID1", "体检ID2", "体检ID3"],
  "dateRange": {
    "start": "2021-01-01",
    "end": "2025-12-31"
  }
}
```

#### 获取对比报告
```javascript
GET /api/reports/comparison/:id
Response: {
  "status": "Success",
  "data": {
    "ID": "报告ID",
    "CustomerName": "客户姓名",
    "MedicalExamIDs": "体检ID1,体检ID2,体检ID3",
    "MarkdownContent": "Markdown格式的对比报告",
    "AIAnalysis": "AI分析结果",
    "Status": "completed",
    "CreatedAt": "2025-10-07T10:30:00Z"
  }
}
```

### 数据库设计

#### ComparisonReports表结构
```sql
CREATE TABLE ComparisonReports (
    ID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    CustomerID UNIQUEIDENTIFIER NOT NULL,
    CustomerName NVARCHAR(100) NOT NULL,
    MedicalExamIDs NVARCHAR(500) NOT NULL,
    ComparisonData NVARCHAR(MAX),
    AIAnalysis NVARCHAR(MAX),
    MarkdownContent NVARCHAR(MAX),
    PDFData NVARCHAR(MAX),
    Status NVARCHAR(20) DEFAULT 'pending',
    ProcessingTime INT DEFAULT 0,
    APIModel NVARCHAR(50),
    APITokenCount INT DEFAULT 0,
    ErrorMessage NVARCHAR(500),
    TimeWindowKey AS (CONVERT(VARCHAR, CustomerID) + '_' +
                     CONVERT(VARCHAR, CreatedAt, 120) + '_' +
                     MedicalExamIDs),
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    CONSTRAINT UQ_ComparisonReports_TimeWindow_Duplicates
        UNIQUE (TimeWindowKey) WHERE CreatedAt > DATEADD(minute, -5, GETDATE())
);
```

### 前端交互流程

#### 1. 用户操作流程
1. **选择检客**: 搜索并选择目标客户
2. **切换选项卡**: 点击"对比报告"选项卡
3. **设置日期范围**: 选择体检记录的时间范围
4. **搜索体检记录**: 点击搜索按钮获取该客户的体检记录
5. **多选体检ID**: 从搜索结果中选择2-3个体检ID
6. **生成报告**: 点击"生成报告"按钮
7. **查看结果**: 在弹窗中查看生成的对比分析报告
8. **下载报告**: 支持Markdown和PDF格式下载

#### 2. 核心UI组件
- **多选列表**: 支持复选框的多选界面
- **选择限制**: 根据配置限制最大选择数量
- **视觉反馈**: 选中状态的实时视觉反馈
- **历史管理**: 历史报告的查看、下载、删除功能

### 错误处理和调试

#### 调试日志
系统在关键位置添加了详细的调试日志：
```javascript
console.log('loadReports - 当前选项卡:', activeTabName, '选择的客户:', this.selectedCustomer);
console.log('对比报告API响应:', comparisonResponse);
console.log('转换PDF - 调用对比报告API');
```

#### 常见问题排查
1. **重复报告生成**: 检查数据库约束和API调用逻辑
2. **选项卡状态错误**: 确认 `this.selectedReportType` 正确设置
3. **API路由错误**: 验证报告类型识别和API调用匹配
4. **多选功能异常**: 检查环境变量配置和前端逻辑

### 性能优化

#### 数据库优化
- **索引设计**: 在CustomerID、CreatedAt等字段上建立索引
- **约束优化**: 时间窗口约束避免全表扫描
- **查询优化**: 使用参数化查询和分页机制

#### API优化
- **异步处理**: 使用 `setImmediate` 避免阻塞
- **超时控制**: 设置合理的API调用超时时间
- **错误重试**: 实现智能重试机制

#### 前端优化
- **状态管理**: 避免重复的API调用
- **用户体验**: loading状态和进度提示
- **缓存策略**: 合理缓存已加载的报告数据

### 时间格式转换规范 ⚠️ **重要**

#### 数据库时间格式
- **存储格式**: SQL Server存储为 `DATETIME` 或 `DATE` 类型
- **返回格式**: API返回ISO 8601格式字符串，如 `"2025-10-08T10:30:00.000Z"`

#### 前端时间输入框格式
- **date类型输入框**: 需要 `YYYY-MM-DD` 格式
- **datetime-local类型输入框**: 需要 `YYYY-MM-DDTHH:MM` 格式

#### 必须进行时间格式转换的场景

**1. 编辑表单数据填充**
```javascript
// ❌ 错误做法：直接赋值ISO时间字符串
document.getElementById('assessmentDate').value = data.AssessmentDate || '';

// ✅ 正确做法：使用格式化函数
document.getElementById('assessmentDate').value = this.formatDateForInput(data.AssessmentDate);
```

**2. 日期格式化函数**
```javascript
// 用于 date input (YYYY-MM-DD)
formatDateForInput(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('日期格式化失败:', error);
    return '';
  }
}

// 用于 datetime-local input (YYYY-MM-DDTHH:MM)
formatDateTimeLocal(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (error) {
    console.error('日期格式化失败:', error);
    return '';
  }
}
```

#### 后端查询结果处理
- **SELECT查询**: `executeQuery` 返回 `result.recordset`
- **INSERT/UPDATE/DELETE查询**: `executeQuery` 返回完整 `result` 对象（包含 `rowsAffected`）

**数据库配置示例**:
```javascript
const executeQuery = async (query, params = []) => {
  // ... 参数处理
  const result = await request.query(query);

  // 对于SELECT查询，返回recordset
  // 对于INSERT/UPDATE/DELETE查询，返回完整result对象（包含rowsAffected）
  if (query.trim().toLowerCase().startsWith('select')) {
    return result.recordset;
  } else {
    return result;
  }
};
```

### 重要开发注意事项
- **环境变量**: 所有API密钥和服务URL必须通过环境变量配置
- **错误处理**: AI和PDF调用都包含完整的错误分类和用户友好提示
- **状态管理**: 前端需妥善管理异步操作状态，避免重复请求
- **数据安全**: 健康评估数据包含敏感信息，需遵循医疗数据保护规范
- **服务依赖**: PDF转换功能依赖外部服务，需做好服务可用性检查
- **重复控制**: 对比报告需要严格控制重复生成，避免不必要的API消耗
- **选项卡状态**: 确保前端选项卡状态与数据加载逻辑一致
- **⚠️ 时间格式转换**: **必须**使用格式化函数转换时间，避免显示错误或保存失败
- **多选限制**: 严格限制多选数量，通过前端和后端双重验证
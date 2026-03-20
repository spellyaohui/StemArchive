# 修复执行报告（2026-03-05）

## 已修复项

### 1. 数据库查询返回结构不一致（高）
- 文件: `backend/config/database.js`
- 为什么: 现有调用方同时存在 `result[0]` 和 `result.rowsAffected/recordset` 两种使用方式，原实现会导致部分接口解析失败或分页统计异常。
- 修复: `executeQuery` 统一返回“数组 + 元数据”结构（兼容 `recordset`、`recordsets`、`rowsAffected`），并支持多结果集合并。
- 如何验证:
  - 执行同时包含多条 `SELECT` 的接口，确认 `result.length` 正常。
  - 执行 `UPDATE/DELETE` 接口，确认 `rowsAffected` 可用。

### 2. 客户最后体检日期接口异常（高）
- 文件: `backend/src/controllers/customerController.js`
- 为什么: 错误的 `require` 相对路径会直接抛错；存储过程结果解析方式也不兼容。
- 修复: 修正 `require('../../config/database')`；更新为优先读取 `rowsAffected`，兼容不同返回结构。
- 如何验证:
  - 调用 `PATCH /api/customers/last-health-check/:identityCard`，应返回 `updated: true/false` 且无 500。

### 3. 身份证重复检查 SQL 无效（高）
- 文件: `backend/src/routes/customerLookup.js`
- 为什么: 原 SQL 将多列子查询作为标量列返回，SQL Server 会报错。
- 修复: 改为 `LEFT JOIN TOP 1` 返回 `CustomerID/CustomerName`，并显式布尔化 `exists`。
- 如何验证:
  - 调用 `GET /api/customers/check-duplicate/:identityCard`（存在与不存在各一次），确认都返回 200 且结构正确。

### 4. 调试接口暴露风险（中）
- 文件: `backend/server.js`, `backend/src/routes/statistics.js`
- 为什么: 调试接口可被普通用户访问并暴露数据结构。
- 修复: `requireAdmin` + 环境开关（`ENABLE_DEBUG_ROUTES` / `ENABLE_STATISTICS_TEST_ENDPOINT`）；默认关闭时返回 404。
- 如何验证:
  - 非管理员访问应返回 403/401。
  - 管理员访问且开关关闭时应返回 404。
  - 开关开启时接口可用。

### 5. 默认管理员弱口令（高）
- 文件: `backend/src/models/User.js`, `frontend/login.html`, `backend/public/login.html`
- 为什么: 硬编码 `admin123` 属于高风险弱口令；登录页明文展示同样有风险。
- 修复: 默认管理员初始化改为环境变量控制（`INIT_DEFAULT_ADMIN` + `DEFAULT_ADMIN_PASSWORD` >= 12）；移除登录页硬编码密码提示。
- 如何验证:
  - 未配置 `DEFAULT_ADMIN_PASSWORD` 且启用初始化时，启动应明确报错。
  - 配置后可创建管理员；登录页不再展示默认密码。

### 6. CORS/限流默认策略偏宽松（中）
- 文件: `backend/server.js`
- 为什么: CORS 在非生产可放开过多来源；限流默认关闭会放大暴力请求风险。
- 修复: CORS 改为白名单匹配；限流默认按环境生效（生产默认开启）。
- 如何验证:
  - 未在白名单的 `Origin` 访问应被拒绝。
  - 启动日志应反映限流开关状态。

### 7. 前端检客查询未走统一鉴权（高）
- 文件: `frontend/js/customerLookup.js`
- 为什么: 直接 `fetch` 未统一附带 token/错误处理，易出现 401 与行为不一致。
- 修复: 改为 `window.API.service.get(...)`，统一认证与错误处理；路径参数 URL 编码。
- 如何验证:
  - 登录态下可正常查询；登出态应统一触发认证失败处理。

### 8. 前端 XSS 风险（中）
- 文件: `frontend/js/utils.js`, `frontend/js/customerLookup.js`, `frontend/js/customers.js`, `frontend/js/dashboard.js`, `frontend/js/reports.js`
- 为什么: 多处将服务端文本直接拼接进 `innerHTML`。
- 修复: 新增 `Utils.escapeHtml`，并在关键渲染路径转义用户可控文本。
- 如何验证:
  - 构造包含 `<script>`/`onerror` 的姓名、诊断、报告标题，页面应仅显示文本不执行脚本。

### 9. 重复初始化导致重复请求（中）
- 文件: `frontend/js/customers.js`, `frontend/js/health-data.js`, `frontend/js/stem-cell.js`
- 为什么: 构造函数已 `init()`，`DOMContentLoaded` 又重复调用，导致重复 API 请求和事件绑定。
- 修复: 移除重复 `DOMContentLoaded -> init()` 调用。
- 如何验证:
  - 打开页面时同一接口只发起一次请求（浏览器 Network 面板）。

### 10. API 缓存参数与统计缺陷（中）
- 文件: `frontend/js/api-cache.js`
- 为什么: 缓存键与实际请求 URL 不一致（`params` 未拼到 URL），且命中率统计变量未初始化。
- 修复: 实现 `buildUrl`（排序参数、拼接查询串），缓存键基于完整 URL；初始化 `hitCount/missCount`。
- 如何验证:
  - 同 URL 不同参数应产生不同请求与缓存键。
  - 重复同参数请求应命中缓存，`getStats()` 的命中率有意义。

## 基础校验
- 已执行: `node --check`（覆盖本次修改的后端/前端 JS 文件）
- 结果: 通过（无语法错误）
- 未执行: 集成测试/端到端测试（当前仓库无可直接运行的完整测试链路）

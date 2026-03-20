# 干细胞档案管理系统代码审查报告（2026-03-05）

## 1. 审查范围与方法
- 范围：`backend/server.js`、`backend/config`、`backend/src`、`frontend/js`、关键页面模板。
- 维度：架构设计、性能、稳定性、可维护性。
- 方法：静态审查 + 关键脚本执行验证（`backend` 测试脚本、`frontend` lint 脚本）。

## 2. 总体结论
- 高风险：6 项
- 中风险：6 项
- 结论：当前系统的主要风险集中在“数据库访问层返回约定不一致”与“前端认证/渲染安全”。这些问题会直接影响分页正确性、接口稳定性、账号安全和前端安全性。

---

## 3. 详细问题（按风险等级）

### [高] 01. 数据访问层返回约定不一致，导致分页/新增返回值系统性错误
- 维度：架构设计、稳定性、可维护性
- 证据：
  - `backend/config/database.js:90`
  - `backend/config/database.js:91`
  - `backend/src/routes/reports.js:37`
  - `backend/src/routes/reports.js:68`
  - `backend/src/routes/reports.js:69`
  - `backend/src/routes/medicalImages.js:44`
  - `backend/src/routes/medicalImages.js:45`
  - `backend/src/routes/healthAssessments.js:72`
  - `backend/src/routes/healthAssessments.js:73`
  - `backend/src/routes/users.js:114`
  - `backend/src/routes/users.js:126`
  - `backend/src/routes/users.js:131`
  - `backend/src/models/User.js:66`
  - `backend/src/models/User.js:72`
  - `backend/src/models/Customer.js:51`
  - `backend/src/models/Customer.js:52`
- 为什么：
  - `executeQuery` 对 `SELECT` 只返回第一结果集，但大量调用方按“多结果集（数据+总数）”解析，并执行 `slice(0, -1)`，会丢最后一条数据且分页总数错误。
  - `INSERT/UPDATE ... OUTPUT` 或 `INSERT; SELECT` 场景中，调用方大量写成 `result[0]`，而非 `result.recordset[0]`，会返回 `undefined`。
- 可落地建议（不大改）：
  1. 在 `database.js` 增加轻量约定化方法：`executeSelect`、`executeMutation`、`executeMulti`（保持原 `executeQuery` 兼容）。
  2. 分页接口统一改为“两条 SQL 分开查”（已在部分模块使用，可复用模式），避免多结果集依赖。
  3. 所有 `OUTPUT INSERTED` 返回值统一取 `result.recordset?.[0]`。
- 如何验证：
  1. 对 `GET /api/reports?page=1&limit=20` 校验：`data.length` 与数据库页大小一致，不再少 1 条。
  2. 对 `POST /api/users` 校验：响应 `data.id` 必有值，不为 `undefined`。
  3. 对至少 3 个分页接口做抽样回归（`reports`、`medical-images`、`health-assessments`）。

### [高] 02. `updateLastHealthCheckDate` 接口存在路径与返回解析双重错误
- 维度：稳定性、可维护性
- 证据：
  - `backend/src/controllers/customerController.js:353`
  - `backend/src/controllers/customerController.js:368`
  - `backend/src/controllers/customerController.js:379`
- 为什么：
  - `require('../../../config/database')` 相对路径错误（从 `src/controllers` 到 `config` 应为 `../../config/database`）。
  - `EXEC` 场景返回是 `result.recordset`，但代码按 `result[0]` 解析，更新状态判断会失真。
- 可落地建议：
  1. 修正 `require` 路径为 `../../config/database`。
  2. 统一按 `result.recordset?.[0]`（或存储过程标准输出字段）读取更新结果。
- 如何验证：
  1. 调用 `PATCH /api/customers/last-health-check/:identityCard`，确认不再 500。
  2. 用有效与无效身份证号各测一次，确认 `updated` 布尔值与数据库一致。

### [高] 03. 前端 `customerLookup` 请求未带 `Authorization`，与后端全局鉴权冲突
- 维度：架构设计、稳定性
- 证据：
  - `frontend/js/customerLookup.js:26`
  - `frontend/js/customerLookup.js:54`
  - `frontend/js/customerLookup.js:79`
  - `frontend/js/customerLookup.js:104`
  - `backend/server.js:35`
  - `backend/server.js:43`
  - `backend/server.js:178`
- 为什么：
  - 后端除 `/auth/login`、`/auth/verify` 外均走全局鉴权；`customerLookup` 使用裸 `fetch`，未带 Bearer Token，容易稳定复现 401。
- 可落地建议：
  1. `customerLookup.js` 统一改为调用 `window.API.service.get(...)` 或 `fetchWithAuth(...)`。
  2. 禁止新模块直接裸 `fetch` 访问 `/api`（可通过代码评审约束，不引入新依赖）。
- 如何验证：
  1. 登录后执行“身份证查找/验证/统计”，浏览器网络面板确认请求头存在 `Authorization`。
  2. 页面功能应返回 200，不再随机出现 401。

### [高] 04. `check-duplicate` SQL 写法会触发语法/执行错误
- 维度：稳定性
- 证据：
  - `backend/src/routes/customerLookup.js:205`
- 为什么：
  - `(SELECT TOP 1 ID, Name ...) as CustomerInfo` 在标量子查询位置返回多列，SQL Server 不合法，接口可能直接 500。
- 可落地建议：
  1. 改成两个标量字段（`CustomerID`、`CustomerName`）或 `OUTER APPLY`。
  2. 保持响应结构兼容：`customerInfo: { id, name }`。
- 如何验证：
  1. 调用 `GET /api/customers/check-duplicate/:identityCard`，应稳定返回 `status=Success`。
  2. 用“存在/不存在”两种身份证号验证 `exists` 和 `customerInfo`。

### [高] 05. 默认管理员弱口令且自动初始化
- 维度：架构设计、稳定性（安全）
- 证据：
  - `backend/src/models/User.js:56`
  - `backend/src/models/User.js:359`
  - `backend/src/routes/auth.js:7`
- 为什么：
  - 默认 `admin/admin123` 是高风险弱口令；且服务启动自动初始化，若部署流程未覆盖，会留下可预测账号。
- 可落地建议：
  1. 增加环境变量开关：仅在 `INIT_DEFAULT_ADMIN=true` 时创建默认账号。
  2. 默认密码改为必填环境变量 `DEFAULT_ADMIN_PASSWORD`，并校验复杂度。
  3. 首次登录后强制改密（可用数据库字段实现，不需新依赖）。
- 如何验证：
  1. 未配置初始化变量时，系统不创建默认管理员。
  2. 配置后仅首次创建一次，且弱密码配置会被拒绝。

### [高] 06. 前端大量 `innerHTML` 直接拼接业务数据，存在 XSS 风险
- 维度：稳定性（安全）、可维护性
- 证据：
  - `frontend/js/customers.js:175`
  - `frontend/js/customers.js:182`
  - `frontend/js/customers.js:192`
  - `frontend/js/dashboard.js:133`
  - `frontend/js/dashboard.js:144`
  - `frontend/js/reports.js:109`
  - `frontend/js/reports.js:110`
- 为什么：
  - 姓名、身份证、科室描述等直接插入 HTML 模板，若数据中包含恶意标签/事件属性，会在浏览器执行脚本。
- 可落地建议：
  1. 新增本地 `escapeHtml()` 工具并统一包裹模板插值。
  2. 高风险区域（表格/弹窗）优先改为 `textContent` 赋值。
  3. 内联 `onclick="...${value}..."` 改为 `data-* + addEventListener`，避免属性注入。
- 如何验证：
  1. 录入名称为 `<img src=x onerror=alert(1)>`，页面应显示纯文本而非执行脚本。
  2. 对 `customers`、`dashboard`、`reports` 三页做回归渲染验证。

### [中] 07. 多页面模块重复初始化，导致重复请求/重复绑定事件
- 维度：性能、稳定性、可维护性
- 证据：
  - `frontend/js/customers.js:14`
  - `frontend/js/customers.js:1100`
  - `frontend/js/customers.js:1103`
  - `frontend/js/health-data.js:17`
  - `frontend/js/health-data.js:322`
  - `frontend/js/health-data.js:325`
  - `frontend/js/stem-cell.js:18`
  - `frontend/js/stem-cell.js:2415`
  - `frontend/js/stem-cell.js:2418`
- 为什么：
  - 构造函数内已 `init()`，但 `DOMContentLoaded` 再次执行 `init()`，会带来双倍接口调用、事件重复注册、状态竞争。
- 可落地建议：
  1. 统一初始化策略：只保留一种入口（推荐 `DOMContentLoaded` 后 `new + init`，构造函数不自动 init）。
  2. 给关键绑定函数增加 `isInitialized` 守卫。
- 如何验证：
  1. 刷新页面后，网络面板同一列表接口只触发 1 次。
  2. 按钮点击事件不再出现“一次点击触发两次”。

### [中] 08. CORS 与限流默认策略偏宽松，生产安全基线不足
- 维度：架构设计、稳定性（安全）
- 证据：
  - `backend/server.js:17`
  - `backend/server.js:116`
  - `backend/server.js:130`
  - `backend/server.js:132`
- 为什么：
  - 默认 `RATE_LIMIT_ENABLED=false`，容易被暴力请求拖垮。
  - 生产下仍默认允许 `devOrigins`（localhost），扩大攻击面。
- 可落地建议：
  1. 默认开启限流，开发环境显式关闭。
  2. 生产环境仅允许 `ALLOWED_ORIGINS`，不自动混入 `localhost`。
- 如何验证：
  1. 压测登录接口，触发 429 并返回 `retryAfter`。
  2. 用未授权 Origin 发起跨域请求，生产环境应被拒绝。

### [中] 09. 调试/测试接口暴露给普通登录用户，存在信息泄露面
- 维度：架构设计、稳定性（安全）
- 证据：
  - `backend/server.js:212`
  - `backend/server.js:224`
  - `backend/src/routes/statistics.js:708`
- 为什么：
  - `/api/test-schedules`、`/api/statistics/test` 暴露数据库状态、业务内部统计信息，不应对普通用户可见。
- 可落地建议：
  1. 这类接口加 `requireAdmin`。
  2. 生产环境通过开关直接关闭。
- 如何验证：
  1. 普通用户访问返回 403 或 404。
  2. 管理员可按策略访问（如仅非生产可用）。

### [中] 10. 系统设置路由存在大量“模拟实现”，可能误导运维
- 维度：可维护性、稳定性
- 证据：
  - `backend/src/routes/settings.js:189`
  - `backend/src/routes/settings.js:238`
  - `backend/src/routes/settings.js:339`
  - `backend/src/routes/settings.js:360`
  - `backend/src/routes/settings.js:393`
  - `backend/src/routes/settings.js:444`
- 为什么：
  - 备份/恢复/健康检查/日志看似可用但为内存或随机模拟，生产中会形成“假成功”。
- 可落地建议：
  1. 生产环境下对未实现能力返回 `501 Not Implemented`。
  2. 前端显式标识“模拟模式”并避免用于真实运维流程。
- 如何验证：
  1. 生产环境调用 `/api/settings/backup` 应返回 501（非伪成功）。
  2. 非生产环境保留演示能力且响应中带 `mock=true`。

### [中] 11. API 缓存模块参数未拼接到 URL，缓存统计字段未初始化
- 维度：性能、稳定性、可维护性
- 证据：
  - `frontend/js/api-cache.js:50`
  - `frontend/js/api-cache.js:80`
  - `frontend/js/api-cache.js:125`
  - `frontend/js/api-cache.js:164`
- 为什么：
  - `options.params` 仅参与 cache key，但 `fetch(url, options)` 没有真正带上查询串，分页/搜索可能拿到错误数据。
  - `hitCount/missCount` 未初始化，命中率计算不可用。
- 可落地建议：
  1. 在 `cachedFetch` 内把 `params` 组装进 URL 查询串。
  2. 初始化并维护 `hitCount/missCount` 计数器。
- 如何验证：
  1. 连续请求 `getCustomers(page=1)` 与 `getCustomers(page=2)`，响应数据应不同。
  2. `getStats().hitRate` 返回有效数字，不是 `NaN`。

### [中] 12. 质量门缺失：后端无测试，前端 lint 脚本不可执行
- 维度：可维护性、稳定性
- 证据：
  - `backend/package.json`（存在 `test` 脚本但仓库无测试用例）
  - `frontend/package.json`（ESLint v9）
  - 实际执行结果：`backend npm test` 无测试，`frontend npm run lint` 缺失 `eslint.config.*`
- 为什么：
  - 缺乏自动化质量门，回归问题难以及时发现。
- 可落地建议：
  1. 后端优先补 3 个烟雾测试：登录、分页、新增用户返回值。
  2. 前端补最小 `eslint.config.js`，先保证 lint 可运行，再逐步收敛规则。
- 如何验证：
  1. `backend npm test` 可通过且至少覆盖关键路径。
  2. `frontend npm run lint` 成功执行并输出可追踪告警/错误。

---

## 4. 建议落地优先级（两周内）
1. 先修高风险 01/02/03/04（会直接影响线上可用性）。
2. 并行修高风险 05/06（安全底线）。
3. 再处理中风险 07/08/09/11（稳定性和性能增益明显）。
4. 最后处理 10/12（治理与工程化收口）。

## 5. 本次执行记录
- 后端测试：`npm test -- --runInBand`（无测试用例，退出码 1）。
- 前端 lint：`npm run lint`（ESLint 9 缺少 `eslint.config.*`，当前不可用）。

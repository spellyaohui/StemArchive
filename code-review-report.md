# 干细胞档案管理系统系统性代码审查报告

> 审查日期：2026-03-04  
> 审查范围：`backend/`、`frontend/js/`、`backend/.env`  
> 审查维度：架构设计、性能、稳定性、可维护性  
> 约束遵循：不建议大规模重构；不引入不必要依赖

## 风险分级标准

- `高`：可直接导致功能故障、数据风险、认证绕过或线上不可用。
- `中`：短期可运行，但会在并发、数据增长或配置变更后显著放大风险。
- `低`：对正确性影响较小，但会持续拉高维护成本或埋下隐患。

## 发现总览

| 编号 | 问题 | 维度 | 风险 |
| --- | --- | --- | --- |
| 1 | 数据访问层返回约定与调用方不一致 | 架构/稳定性 | 高 |
| 2 | 通知发送接口存在确定性运行时错误 | 稳定性 | 高 |
| 3 | 认证基线偏弱（默认管理员/限流默认关/无账户锁定） | 稳定性/可维护性 | 高 |
| 4 | 调试接口与敏感日志暴露 | 稳定性/可维护性 | 高 |
| 5 | AI原始请求/响应入库导致数据与容量风险 | 架构/性能 | 中 |
| 6 | 对比与导入链路存在串行N+1查询 | 性能 | 中 |
| 7 | 异步重任务缺少队列与并发上限 | 稳定性/性能 | 中 |
| 8 | CORS/CSP策略组合存在安全与可用性双风险 | 架构/稳定性 | 中 |
| 9 | 报告模块超大文件与重复组装逻辑 | 可维护性 | 中 |
| 10 | 设置模块含模拟实现进入生产路径 | 可维护性/稳定性 | 中 |
| 11 | 前端上传超时控制无效 | 稳定性 | 低 |
| 12 | 缺少统一优雅停机与资源回收 | 稳定性 | 低 |

---

## 1. 数据访问层返回约定与调用方不一致（高）

**定位**

- `backend/config/database.js:90-94`
- `backend/src/routes/medicalImages.js:24-46`
- `backend/src/routes/medicalImages.js:177-186`
- `backend/src/routes/notifications.js:24-46`
- `backend/src/routes/notifications.js:144-157`
- `backend/src/models/HealthAssessment.js:46-64`

**问题点**

`executeQuery` 对 `SELECT` 仅返回 `recordset`（单结果集），但大量调用代码按“多语句返回拼接数组”解析（`slice(0, -1)`、`last.Total`），以及把非 `SELECT` 返回值当数组访问（`result[0].AffectedRows`）。

**为什么**

- 分页总数会读取失败或被误判。
- 删除/更新成功判断会出现 `undefined` 访问，触发500。
- 同类错误已在多个路由/模型重复，属于系统性契约问题。

**可落地建议（小改动优先）**

- 先新增 `executeQueryDetailed()`（返回 `recordset`、`recordsets`、`rowsAffected`），不替换原函数。
- 优先修复高频接口（`medicalImages`、`notifications`、`healthAssessments`）改为：
  - 分页：数据查询与总数查询分开执行。
  - 删除/更新：统一使用 `rowsAffected[0]` 判断。

**如何验证**

- 用同一条件请求分页接口，确认 `data.length <= limit` 且 `pagination.total` 与数据库 `COUNT(*)` 一致。
- 分别删除“存在ID/不存在ID”，返回应为 `200/404`，且无500。

---

## 2. 通知发送接口存在确定性运行时错误（高）

**定位**

- `backend/src/routes/notifications.js:105`
- `backend/src/routes/notifications.js:122`

**问题点**

路由中调用 `await this.sendNotification(notification)`，但 `sendNotification` 是同文件普通函数，不在 `this` 上。

**为什么**

该路径会直接抛错，通知发送功能不可用。

**可落地建议**

- 直接改为 `await sendNotification(notification)`。
- 顺便在发送失败时保留原始状态并返回明确错误码，避免前端误以为发送成功。

**如何验证**

- 调用 `POST /api/notifications/send`。
- 预期：返回201，且数据库中该通知状态从 `Pending` 变为 `Sent`（或失败时给出明确错误）。

---

## 3. 认证基线偏弱（高）

**定位**

- `backend/src/models/User.js:56-60`
- `backend/src/models/User.js:227-238`
- `backend/src/services/authService.js:23`
- `backend/server.js:17`
- `backend/server.js:170-176`
- `backend/.env:28`

**问题点**

- 默认管理员使用固定弱密码创建。
- 登录失败计数仅打印日志，无锁定逻辑。
- 全局限流开关默认关闭，且当前环境配置为关闭。

**为什么**

组合风险会显著放大暴力破解窗口，属于可被自动化利用的高风险入口。

**可落地建议**

- 默认管理员初始化改为“必须从环境变量读取初始化密码”，生产环境缺失则拒绝启动。
- 最小化实现登录保护：内存级失败计数 + 冷却时间（不改表结构也可落地）。
- 生产环境强制开启限流（启动时校验 `NODE_ENV=production` 且 `RATE_LIMIT_ENABLED=true`）。

**如何验证**

- 启动检查：生产配置缺少管理员初始化密码时应启动失败。
- 连续输错密码超过阈值，应返回429或明确锁定提示。
- 限流开启后，压测登录接口在阈值后触发限流响应。

---

## 4. 调试接口与敏感日志暴露（高）

**定位**

- `backend/server.js:212-254`
- `backend/src/routes/statistics.js:707-731`
- `backend/src/routes/examinationImport.js:162-173`
- `backend/src/routes/reports.js:868-875`
- `backend/src/routes/reports.js:913`

**问题点**

- 调试/测试接口在常规路由中直接暴露。
- 多处日志打印身份证号、体检详情、完整请求体。

**为什么**

医疗系统中敏感数据日志化和调试接口暴露会直接增加合规与数据泄露风险。

**可落地建议**

- 调试接口仅在开发环境注册（`NODE_ENV !== 'production'`）。
- 统一日志脱敏（身份证仅保留前6后4）。
- 默认关闭详细业务数据日志，通过 `LOG_LEVEL=debug` 显式启用。

**如何验证**

- 生产模式下请求调试接口应返回404。
- 查看日志样本，确认不再出现完整身份证/完整体检数据。

---

## 5. AI原始请求/响应入库导致数据与容量风险（中）

**定位**

- `backend/src/services/deepseekService.js:84-85`
- `backend/src/services/deepseekService.js:300-301`
- `backend/src/services/deepseekService.js:575-576`
- `backend/src/routes/reports.js:941-942`

**问题点**

AI请求/响应全文（含病历文本）被直接保存到业务表。

**为什么**

- 表膨胀快，拖慢查询与备份。
- 敏感数据复制面扩大，访问控制压力上升。

**可落地建议**

- 默认仅存摘要：`model`、`tokenCount`、`processingTime`、错误码。
- 原始请求/响应仅在调试开关下保留，且长度截断。

**如何验证**

- 生成新报告后检查记录字段长度明显下降。
- 同批量下数据库增长曲线下降，报告查询耗时不升高。

---

## 6. 对比与导入链路存在串行N+1查询（中）

**定位**

- `backend/src/routes/reports.js:1176-1213`
- `backend/src/services/autoImportService.js:105-122`
- `backend/src/services/autoImportService.js:261-294`
- `backend/src/services/personService.js:298-331`

**问题点**

多个热点流程在循环中串行访问数据库/第三方库，形成 N+1 查询。

**为什么**

数据量增长后接口耗时会近线性恶化，容易触发超时与队列堆积。

**可落地建议**

- 引入“有上限并发”执行（如每批3-5个），避免全串行。
- 能一次拿到的数据尽量合并查询（例如先批量取 exam 基础信息）。

**如何验证**

- 在相同数据量下记录 P95 响应时间，优化后应明显下降。
- 压测时数据库连接占用更平滑，无长尾超时。

---

## 7. 异步重任务缺少队列与并发上限（中）

**定位**

- `backend/src/routes/reports.js:934-974`
- `backend/src/routes/reports.js:1360-1391`
- `backend/src/routes/reports.js:1795-1843`

**问题点**

报告生成通过 `setImmediate` 直接后台执行，缺少任务队列、并发限制和重试策略。

**为什么**

高并发提交时会瞬时放大外部API调用与DB写入，导致失败率上升和资源争抢。

**可落地建议**

- 使用进程内轻量队列（无需新依赖也可实现）：
  - 限制并发数（如2）。
  - 明确任务状态流转（pending -> processing -> completed/failed）。
- 为失败任务增加有限重试和退避。

**如何验证**

- 并发提交20个任务，观察失败率与平均完成时长。
- 队列启用后，资源使用曲线更平稳，无批量失败尖峰。

---

## 8. CORS/CSP策略组合存在双风险（中）

**定位**

- `backend/server.js:126-136`
- `backend/server.js:157-160`
- `backend/.env:29`
- `frontend/js/api.js:62-63`

**问题点**

- CSP被关闭。
- `ALLOWED_ORIGINS=*` 与当前匹配逻辑不兼容，生产环境可能“全部拒绝”或被误配。
- 前端令牌放 `localStorage`，在XSS场景下风险更高。

**为什么**

既有安全暴露风险，也有生产跨域误配置导致前端全量不可用的风险。

**可落地建议**

- 启用最小可用CSP（先从 `script-src 'self'` 开始）。
- 启动时校验 `ALLOWED_ORIGINS` 合法性；对 `*` 明确策略（禁止或单独处理）。
- 渐进式把高敏会话从 `localStorage` 调整为 `sessionStorage`（不做大改造）。

**如何验证**

- 生产配置下用允许域名访问成功，非允许域名被拒绝。
- 响应头含 CSP 且前端关键页面功能正常。

---

## 9. 报告模块超大文件与重复逻辑（中）

**定位**

- `backend/src/routes/reports.js`（约2000+行）
- `backend/src/routes/reports.js:768-913`
- `backend/src/routes/reports.js:1176-1307`
- `backend/server.js:194-197`

**问题点**

- 单文件承载过多职责（查询、组装、AI流程、PDF转换）。
- 同类“体检数据组装”在多个路径重复实现。
- 路由目录同时使用 `backend/routes` 与 `backend/src/routes`，边界不清。

**为什么**

重复逻辑容易漂移，改一处漏一处，回归成本高。

**可落地建议**

- 先做“局部抽取”，不做大重构：抽出 `buildExamPayload(customerId, examId)` 复用。
- 新增路由时统一仅放 `src/routes`，旧目录文件标记弃用清单。

**如何验证**

- 同一体检ID在“单次报告/对比报告”输出结构一致。
- 新增字段时仅需改动一个组装函数即可覆盖两条链路。

---

## 10. 设置模块含模拟实现进入生产路径（中）

**定位**

- `backend/src/routes/settings.js:188-216`
- `backend/src/routes/settings.js:238-261`
- `backend/src/routes/settings.js:359-390`

**问题点**

日志、备份、恢复等管理接口当前返回模拟数据或内存数据，并非真实系统行为。

**为什么**

管理端会产生“已备份/已恢复”的错误心智，属于运维稳定性风险。

**可落地建议**

- 明确标记为实验接口并默认关闭生产暴露。
- 至少保证响应字段包含 `isMock: true`，避免误判。

**如何验证**

- 生产环境下接口默认不可用或显式返回“未启用”。
- 管理页面不再把模拟结果当成成功运维动作。

---

## 11. 前端上传超时控制无效（低）

**定位**

- `frontend/js/api.js:617-621`

**问题点**

`fetch` 不支持 `timeout` 选项，当前上传请求实际不会按预期超时。

**为什么**

弱网/大文件时可能长时间挂起，影响用户体验与重试策略。

**可落地建议**

- 与其它请求保持一致，改为 `AbortController + setTimeout`。

**如何验证**

- 人为降速后上传超过阈值应按预期中断并提示超时。

---

## 12. 缺少统一优雅停机与资源回收（低）

**定位**

- `backend/server.js:481-533`
- `backend/src/services/healthAssessmentPdfService.js:416-421`
- `backend/src/services/singleReportPdfService.js:1023-1028`

**问题点**

进程没有统一 `SIGTERM/SIGINT` 处理，数据库连接与 Puppeteer 浏览器实例未在停机流程集中回收。

**为什么**

容器滚动发布或重启时可能产生短时连接残留、任务中断不透明。

**可落地建议**

- 在 `server.js` 增加统一优雅停机：停止接收请求 -> 关闭DB连接 -> 关闭PDF浏览器 -> 超时强退。

**如何验证**

- 发送 `SIGTERM`，观察日志中资源回收完整执行且进程在预期时间内退出。

---

## 建议执行顺序（按收益/成本比）

1. 先修复 1、2、3、4（高风险且改动面可控）。
2. 再处理 6、7、9（性能与维护性瓶颈）。
3. 最后收敛 8、10、11、12（治理与长期稳定）。

## 结论

当前系统具备可运行基础，但存在若干“系统性契约问题 + 安全基线问题 + 重任务调度问题”。建议先做“高风险小步修复”，在不大规模重构和不新增依赖前提下，仍可显著提升稳定性与可维护性。

# 第三方体检 API 去中间层改造说明

## 1. 改造背景

原有架构中，主项目后端需要通过 `health-management-system` 的 HTTP API 获取第三方体检数据，链路较长、维护成本高，且存在中间层依赖。

本次改造的目标是：

1. 主项目后端直接查询第三方体检数据库，不再经过中间层 HTTP 服务。
2. 主项目数据库（`HealthRecordSystem`）与第三方数据库严格隔离。
3. 第三方数据库保持只读访问，禁止写入。
4. 保持现有接口契约，尽量减少前端与业务层改动。

---

## 2. 改造范围

### 2.1 后端新增

1. 第三方只读数据库连接模块
   - `backend/config/thirdPartyDatabase.js`

2. 第三方体检查询服务
   - `backend/src/services/thirdPartyExaminationService.js`

3. 兼容第三方原有接口路由
   - `backend/src/routes/thirdPartyExamination.js`

4. 仪器室查询配置
   - `backend/config/instrument-config.json`

### 2.2 后端改造

1. 路由注册调整
   - `backend/server.js`
   - 新增挂载：`/api` -> `thirdPartyExamination` 路由

2. 服务层替换（HTTP 调用 -> 内部服务调用）
   - `backend/src/services/departmentCodeService.js`
   - `backend/src/services/examinationDateService.js`
   - `backend/src/services/examinationDataImportService.js`

3. 环境配置调整
   - `backend/.env.example`
   - 新增 `THIRD_DB_*` 配置项

### 2.3 前端改造

1. 统一 API 门面走主后端
   - `frontend/js/api.js`

2. 健康数据页面移除第三方直连
   - `frontend/health-data.html`

3. 清理第三方 API 前端配置
   - `frontend/config.js`

---

## 3. 接口兼容说明

本次在主后端保留并兼容以下接口：

1. `GET /api/examination-ids/:sfzh`
2. `POST /api/get_ksbm`
3. `POST /api/get_tjrq`
4. `POST /api/query_laboratory`
5. `POST /api/query_cgks`
6. `POST /api/query_yxk`
7. `POST /api/query_instrument`

以上接口由主后端直接查询第三方数据库返回，保持原有调用方式和主要返回结构。

---

## 4. 安全与隔离设计

### 4.1 数据库隔离

- 主库连接继续使用：`backend/config/database.js`
- 第三方库连接独立使用：`backend/config/thirdPartyDatabase.js`
- 两套连接配置与连接池完全分离。

### 4.2 第三方只读保障（双层）

1. 权限层（部署要求）
   - 第三方数据库账号必须是只读账号，仅授予 `SELECT` 权限。

2. 代码层（已实现）
   - 查询语句仅允许 `SELECT/WITH` 开头。
   - 拒绝多语句执行。
   - 拒绝 `INSERT/UPDATE/DELETE/MERGE/ALTER/DROP/TRUNCATE/EXEC/CREATE/GRANT/REVOKE/DENY` 等关键字。

### 4.3 动态表名防护

- 对 `ksbm` 做合法性校验（仅字母数字下划线）。
- 对涉及动态表查询的科室接口增加白名单校验：
  - `ksbm` 必须在当前 `studyId` 的科室编码列表中。

---

## 5. 配置说明

后端 `.env` 需要补充以下配置（示例见 `backend/.env.example`）：

- `THIRD_DB_USER`
- `THIRD_DB_PASSWORD`
- `THIRD_DB_SERVER`
- `THIRD_DB_DATABASE`
- `THIRD_DB_ENCRYPT`
- `THIRD_DB_TRUST_CERTIFICATE`
- `THIRD_DB_REQUEST_TIMEOUT`
- `THIRD_DB_CONNECTION_TIMEOUT`
- `THIRD_DB_POOL_MAX`
- `THIRD_DB_RETRY_COUNT`
- `THIRD_DB_RETRY_DELAY`

说明：`EXAMINATION_API_*` 已标记为历史配置。

---

## 6. 业务影响

1. 体检导入链路保持不变，数据来源从“中间层 HTTP API”变更为“第三方库只读直查”。
2. 前端不再依赖 `EXAMINATION_API_CONFIG` 进行第三方 API 直连。
3. 部署时需要确保第三方数据库连接参数和只读账号权限配置正确。

---

## 7. 验证建议

建议按以下清单进行联调与回归：

1. 启动后端后逐一验证 7 个兼容接口。
2. 验证体检导入接口链路：
   - `GET /api/examination-import/exam-ids/:identityCard`
   - `GET /api/examination-import/department-codes/:examId`
   - `POST /api/examination-import/import`
3. 页面回归：健康数据页面查询/导入流程。
4. 只读校验：第三方库 `SELECT` 成功，写入语句失败。

---

## 8. 结论

本次改造完成后，第三方体检数据链路从“跨服务 HTTP 调用”收敛为“主后端直连第三方只读库”，减少了中间层依赖，提升了可维护性，并通过连接隔离与只读守卫强化了安全性。
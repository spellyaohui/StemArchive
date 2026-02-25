# 干细胞治疗档案管理系统 (StemArchive)

一个现代化的干细胞治疗档案管理系统，用于管理患者信息、健康数据、治疗方案和输注排期。

**项目地址**: [https://github.com/spellyaohui/StemArchive](https://github.com/spellyaohui/StemArchive)

## 系统功能

### 核心功能
- **检客档案管理**: 以身份证号为唯一标识，管理患者基本信息
- **健康数据录入**: 分科室管理体检评估数据，支持检验科、影像科、常规科室等
- **干细胞治疗管理**: 治疗方案制定、排期管理、治疗记录
- **报告查看**: 生成和查看对比报告、治疗总结等
- **统计分析**: 多维度数据统计和可视化展示

### AI智能功能 ⭐
- **AI健康评估**: 集成DeepSeek AI，基于体检数据生成专业健康评估报告
- **AI对比分析**: 支持多选体检ID进行智能对比分析，生成专业对比报告
- **智能报告生成**: 自动生成结构化报告并用于高质量PDF渲染
- **PDF版本下载**: 一键下载健康评估、对比分析、治疗总结的PDF版本报告
- **多格式输出**: 治疗总结支持原始文档下载，所有报告支持PDF版本下载

### 特色功能
- **动态科室配置**: 支持科室灵活配置和数据结构自定义
- **AI智能分析**: 基于历史数据生成智能分析报告
- **多端响应式**: 支持大屏显示和移动端操作
- **实时统计**: 仪表板实时显示关键业务指标
- **增强通知系统**: 统一的用户友好的通知体验，支持30+种通知类型

## 技术架构

### 后端技术栈
- **Node.js + Express.js**: 服务器框架
- **Microsoft SQL Server**: 数据库
- **JWT**: 身份认证
- **Multer**: 文件上传处理

### 前端技术栈
- **HTML5 + CSS3 + JavaScript (ES5)**: 基础技术
- **Tailwind CSS**: 样式框架
- **Font Awesome**: 图标库
- **原生JavaScript**: 无框架依赖，轻量高效

### 系统特点
- **前后端合并部署**: 单一端口服务，简化部署和运维
- **RESTful API**: 标准化接口设计
- **响应式设计**: 适配各种屏幕尺寸
- **模块化架构**: 代码结构清晰，易于维护

## 快速开始

### 环境要求
- Node.js 14.0+
- Microsoft SQL Server 2016+
- Windows/Linux/macOS

### 安装步骤

#### 1. 克隆项目
```bash
git clone https://github.com/spellyaohui/StemArchive.git
cd StemArchive
```

#### 2. 安装后端依赖
```bash
cd backend
npm install
```

#### 3. 配置数据库
1. 创建数据库 `HealthRecordSystem`
2. 执行 `backend/database/schema.sql` 创建表结构
3. 修改 `backend/.env` 文件配置数据库连接

```env
DB_USER=sa
DB_PASSWORD=your_password
DB_SERVER=your_server
DB_DATABASE=HealthRecordSystem
```

#### 4. 启动后端服务
```bash
npm run dev
```
后端服务将在 http://localhost:5000 启动

#### 5. 构建并启动统一服务（推荐）
```bash
# 构建前端（复制前端文件到 backend/public）
npm run build

# 启动统一服务器
npm start
```
统一服务将在 http://localhost:5000 启动（端口由 .env 中 PORT 配置），同时提供 API 和前端页面服务。

#### 5b. 开发模式（前后端分离）
如果需要前后端分离开发：
```bash
# 终端1：启动后端
cd backend
npm run dev

# 终端2：启动前端开发服务器
cd frontend
npm run dev
```
- 后端 API: http://localhost:5000/api
- 前端页面: http://127.0.0.1:5173

#### 6. 访问系统
- 统一部署模式: http://localhost:5000
- 开发模式: http://127.0.0.1:5173

## 项目结构

```
StemArchive/
├── backend/                 # 后端代码
│   ├── public/             # 前端静态文件（构建后生成）
│   │   ├── css/            # 样式文件
│   │   ├── js/             # JavaScript文件
│   │   ├── assets/         # 静态资源
│   │   ├── webfonts/       # 字体文件
│   │   └── *.html          # HTML页面
│   ├── src/
│   │   ├── models/         # 数据模型
│   │   ├── controllers/    # 控制器
│   │   ├── routes/         # 路由
│   │   ├── middleware/     # 中间件
│   │   ├── services/       # 业务服务
│   │   └── utils/          # 工具函数
│   ├── scripts/            # 构建脚本
│   │   └── build-frontend.js  # 前端构建脚本
│   ├── config/             # 配置文件
│   ├── database/           # 数据库脚本
│   └── tests/              # 测试文件
├── frontend/               # 前端源代码
│   ├── css/                # 样式文件
│   ├── js/                 # JavaScript文件
│   ├── assets/             # 静态资源
│   └── *.html              # HTML页面
├── database/               # 数据库初始化脚本
└── .kiro/                  # Kiro配置文件
```

## 数据库设计

### 第三方数据库操作限制（强制）

- 第三方数据库 **JZCIS** 仅允许只读访问。
- 对 JZCIS 明令禁止任何写操作：`INSERT`、`UPDATE`、`DELETE`、`MERGE`、`TRUNCATE`。
- 对 JZCIS 明令禁止结构与权限变更：`CREATE`、`ALTER`、`DROP`、`GRANT`、`REVOKE`、`DENY`。
- 禁止执行命令/存储过程：`EXEC` / `EXECUTE`。
- 数据库升级脚本（`database/*.sql`）不得在 JZCIS 上执行，只能在业务可写库执行。
- 后端第三方数据库访问层已实施只读校验（见 `backend/config/thirdPartyDatabase.js`）。

### 核心表结构
- `Customers` - 客户基本信息（以身份证号为主键）
- `HealthAssessments` - 体检评估记录
- `HealthAssessmentReports` - AI健康评估报告
- `ComparisonReports` - AI对比分析报告
- `Departments` - 科室配置（支持动态调整）
- `MedicalImages` - 影像数据记录
- `StemCellPatients` - 干细胞患者档案
- `TreatmentPlans` - 治疗方案定义
- `InfusionSchedules` - 输注排期
- `Notifications` - 通知记录
- `Reports` - 传统报告
- `DiseaseTypes` - 病种定义

## API接口

### 客户管理
- `GET /api/customers` - 获取客户列表
- `POST /api/customers` - 创建客户
- `GET /api/customers/:id` - 获取客户详情
- `PUT /api/customers/:id` - 更新客户信息
- `DELETE /api/customers/:id` - 删除客户

### 干细胞治疗
- `GET /api/stem-cell/patients` - 获取患者列表
- `POST /api/stem-cell/patients` - 创建患者档案
- `GET /api/stem-cell/schedules` - 获取输注排期
- `POST /api/stem-cell/schedules` - 创建输注排期
- `PUT /api/stem-cell/schedules/:id/complete` - 完成输注

### AI智能报告 ⭐

#### 健康评估报告
- `GET /api/reports/health-assessment/check?medicalExamId=xxx` - 检查健康评估是否已生成
- `POST /api/reports/health-assessment/generate` - 生成AI健康评估报告
- `GET /api/reports/health-assessment/:id` - 获取健康评估报告详情
- `POST /api/reports/health-assessment/:id/convert-pdf` - 下载PDF版本报告
- `GET /api/reports/health-assessment/customer/:customerId` - 获取客户的健康评估列表

#### 对比分析报告 🆕
- `POST /api/reports/comparison/generate` - 生成AI对比分析报告
- `GET /api/reports/comparison/:id` - 获取对比报告详情
- `POST /api/reports/comparison/:id/convert-pdf` - 下载PDF版本报告
- `GET /api/reports/comparison/customer/:customerId` - 获取客户的对比报告列表
- `DELETE /api/reports/comparison/:id` - 删除对比报告

### 统计分析
- `GET /api/statistics/dashboard` - 获取仪表板统计
- `GET /api/statistics/monthly` - 获取月度统计
- `GET /api/statistics/treatment-types` - 获取治疗类型统计

## 部署说明

### 开发环境
```bash
# 方式1：统一服务（推荐）
cd backend
npm run build    # 构建前端
npm run dev      # 启动开发服务器（带热重载）

# 方式2：前后端分离开发
# 终端1
cd backend && npm run dev
# 终端2
cd frontend && npm run dev
```

### 生产环境
```bash
cd backend
npm run build    # 构建前端
npm start        # 或使用 PM2: pm2 start server.js
```

### 常用命令
| 命令 | 说明 |
|------|------|
| `npm run build` | 构建前端（复制到 public 目录） |
| `npm run dev` | 开发模式启动（热重载） |
| `npm start` | 生产模式启动 |
| `npm run prod` | 构建并启动生产服务 |
| `npm test` | 运行测试 |

## 系统使用

### 基本流程
1. **检客管理**: 录入客户基本信息，以身份证号为唯一标识
2. **健康数据**: 分科室录入体检评估数据，支持检验科、影像科、常规科室等
3. **干细胞档案**: 创建患者档案，制定治疗方案
4. **输注排期**: 安排治疗排期，记录治疗过程
5. **报告查看**: 生成对比报告，查看治疗效果
6. **AI健康评估**: 生成AI驱动的专业健康评估报告 ⭐
7. **统计分析**: 查看各项业务指标的统计分析

### AI智能报告使用流程 ⭐

#### 健康评估报告
1. **选择检客**: 在报告查看页面选择已有检客
2. **选择报告类型**: 选择"健康评估"选项卡
3. **选择体检报告**: 从检客的体检记录中选择具体的体检ID
4. **生成AI评估**: 点击生成健康评估，系统将调用DeepSeek AI生成专业报告
5. **查看报告**: 在弹窗中查看AI生成的健康评估报告
6. **下载报告**: 下载PDF版本报告

#### 对比分析报告 🆕
1. **选择检客**: 在报告查看页面选择已有检客
2. **选择报告类型**: 选择"对比报告"选项卡
3. **选择日期范围**: 设置体检记录的日期范围进行筛选
4. **多选体检报告**: 从搜索结果中选择2-3个体检ID进行对比分析（支持配置）
5. **生成AI对比**: 点击生成对比报告，系统将调用DeepSeek AI进行智能对比分析
6. **查看报告**: 在弹窗中查看AI生成的对比分析报告
7. **下载报告**: 下载PDF版本报告
8. **历史管理**: 在历史报告中可以查看、下载或删除之前的对比报告

### 注意事项
- 身份证号为检客唯一标识，系统会自动校验格式
- 治疗方案支持病种关键词自动匹配
- 支持批量导入检客数据
- 所有操作都有详细的日志记录
- AI健康评估和对比分析需要配置DeepSeek API Key
- PDF由系统内置渲染引擎自动生成，无需额外部署第三方PDF转换服务
- 对比报告支持多选体检ID，最多可选择数量可通过环境变量配置（默认3个）
- 对比报告会自动进行重复检查，避免短时间内生成相同组合的重复报告

## 开发指南

### 代码规范
- 使用ESLint进行代码检查
- 遵循RESTful API设计原则
- 前端使用原生JavaScript，避免过度依赖框架
- 数据库操作使用参数化查询，防止SQL注入

### 测试
```bash
# 后端测试
cd backend
npm test

# 前端测试
cd frontend
# 可以使用浏览器开发者工具进行调试
```

### 贡献指南
1. Fork 项目：[https://github.com/spellyaohui/StemArchive/fork](https://github.com/spellyaohui/StemArchive/fork)
2. 创建功能分支：`git checkout -b feature/your-feature`
3. 提交代码：`git commit -am 'Add some feature'`
4. 推送分支：`git push origin feature/your-feature`
5. 创建 Pull Request

## 常见问题

### Q: 如何修改数据库连接配置？
A: 编辑 `backend/.env` 文件中的数据库配置信息。

### Q: 如何配置DeepSeek API？
A: 在 `backend/.env` 文件中设置 `DEEPSEEK_API_KEY`，获取API Key请访问 [DeepSeek平台](https://platform.deepseek.com/api_keys)。

### Q: 如何配置PDF转换服务？
A: 当前版本无需配置第三方PDF转换服务。系统使用内置 Puppeteer 渲染引擎，后端会自动完成 Markdown 到 PDF 的转换。

### Q: AI健康评估需要什么数据？
A: 需要完整的体检数据，包括各个科室的评估结果和医生总结。

### Q: 系统支持哪些浏览器？
A: 支持Chrome、Firefox、Safari、Edge等现代浏览器。

### Q: 如何备份数据？
A: 使用SQL Server Management Studio进行数据库备份。

### Q: 系统是否支持多用户？
A: 当前版本为单用户版本，多用户支持正在开发中。

### Q: AI评估报告生成失败怎么办？
A: 检查DeepSeek API配置和网络连接，并确认后端服务运行正常。

### Q: 对比报告最多可以选择几个体检ID？
A: 默认最多选择3个，可通过环境变量 `COMPARISON_REPORT_MAX_SELECTIONS` 进行配置。

### Q: 对比报告生成重复怎么办？
A: 系统会自动检查5分钟内相同体检ID组合的重复报告，避免重复生成。

### Q: 对比报告的历史记录在哪里查看？
A: 只有在"对比报告"选项卡下才会显示历史报告，其他选项卡的历史报告部分会隐藏。

### Q: 系统中的AIAnalysis和MarkdownContent字段有什么区别？
A:
- **AIAnalysis**: 存储AI的原始分析结果，用于追踪原始生成内容
- **MarkdownContent**: 存储格式化的完整报告，包含标题、元数据、免责声明等，用于报告展示和PDF渲染

### Q: 为什么下载的PDF内容与网页显示的不一样？
A: 当前版本PDF与网页展示都优先使用格式化的 `MarkdownContent` 字段，确保版式与专业提示一致。

## 更新日志

### v1.2.2 (2025-10-08) - 用户体验优化版本 ✨
- **页脚固定优化**: 修复所有页面页脚位置问题，现在页脚始终固定在页面最底端
- **Flexbox布局升级**: 采用现代CSS Flexbox布局，确保不同内容长度页面的一致性
- **兼容性提升**: 保持登录页面原有居中设计的同时，优化其他页面的页脚显示
- **响应式优化**: 页脚固定功能在各种屏幕尺寸下都能正常工作

### v1.2.1 (2025-10-07) - 功能优化版本 🔧
- **PDF功能优化（历史版本）**: 后续版本已统一切换为系统内置渲染，无需外部PDF转换接口配置
- **字段使用策略优化**: 明确区分AIAnalysis和MarkdownContent字段的使用场景
  - 网页展示和传统下载使用MarkdownContent（格式化报告）
  - 原始分析内容保留在AIAnalysis，便于追踪生成来源
- **版本演进说明**: 该版本中的外部PDF配置策略已在后续版本废弃

### v1.2.3 (2026-02-25) - PDF内置渲染统一版本 🏥
- **PDF内置化**: 健康评估、对比分析、治疗总结统一使用系统内置渲染引擎生成PDF
- **配置简化**: 移除外部PDF转换API相关环境变量配置
- **版式统一**: PDF生成优先使用 `MarkdownContent`，确保医疗提示与结构一致
- **对比报告升级**: 对比分析报告对齐专科中心风格，重点异常与风险分级在PDF中高可读展示

### v1.2.0 (2025-10-07) - AI智能对比分析版本 🆕
- **新增AI对比分析功能**: 支持多选体检ID进行智能对比分析，生成专业对比报告
- **多选功能**: 支持选择2-3个体检ID进行对比分析（可配置）
- **智能重复检查**: 自动防止短时间内生成相同组合的重复报告，节省API调用成本
- **历史报告管理**: 对比报告专属的历史记录管理，支持查看、下载和删除
- **选项卡隔离**: 历史报告只在对应选项卡下显示，避免混淆
- **API路由优化**: 根据报告类型智能调用对应的下载和PDF转换API
- **调试增强**: 添加详细的调试日志，便于问题排查和维护

### v1.1.0 (2025-10-07) - AI智能健康评估版本 ⭐
- **新增AI健康评估功能**: 集成DeepSeek AI，基于体检数据生成专业健康评估报告
- **PDF转换功能**: 支持将健康评估报告转换为PDF格式并下载
- **增强的用户体验**: 采用弹窗模式替代页面跳转，提供更流畅的操作体验
- **动态按钮状态**: 根据评估状态智能显示"生成"或"查看"按钮
- **完整的API集成**: 支持异步处理和状态轮询机制
- **多种报告格式**: 提供PDF版本报告下载
- **智能通知系统**: 完善的操作状态反馈和错误处理机制

### v1.0.0 (2025-10-03)
- 初始版本发布
- 实现基础检客管理功能
- 实现干细胞治疗管理功能
- 实现数据统计和可视化
- 支持响应式设计

## 技术支持

- **项目地址**: [https://github.com/spellyaohui/StemArchive](https://github.com/spellyaohui/StemArchive)
- **问题反馈**: [Issues](https://github.com/spellyaohui/StemArchive/issues)
- **功能建议**: [Discussions](https://github.com/spellyaohui/StemArchive/discussions)

如有问题或建议，请通过 GitHub Issues 联系开发团队。

## 许可证

本项目采用 MIT 许可证。

### 版权信息
版权所有 © 2025 干细胞治疗档案管理系统开发团队

### 许可证概要
本软件采用MIT许可证，允许您在遵守以下条件的情况下自由使用、修改、分发和商业使用本软件：

#### 您拥有的权利：
- ✅ **商业使用** - 可以将此软件用于商业目的
- ✅ **修改** - 可以修改源代码
- ✅ **分发** - 可以分发原始或修改版本
- ✅ **私人使用** - 可以私人使用此软件
- ✅ **再许可** - 可以发布再许可版本

#### 您的义务：
- 📋 **保留版权声明** - 在所有软件副本中必须包含原始的版权声明和许可证声明
- ⚠️ **免责声明** - 本软件按"原样"提供，不提供任何形式的保证
- 🔒 **承担使用风险** - 使用者需自行承担使用风险

### 特别说明
本系统为医疗健康领域的专业软件，在使用过程中请：
- 遵守相关医疗法规和数据保护法律
- 确保患者数据的隐私和安全
- 定期进行数据备份和安全检查
- 建议在部署前进行充分的测试

### 完整许可证
完整的许可证条款请参阅项目根目录中的 [LICENSE](LICENSE) 文件。
# 干细胞治疗档案管理系统

一个现代化的干细胞治疗档案管理系统，用于管理患者信息、健康数据、治疗方案和输注排期。

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
- **智能报告生成**: 支持Markdown格式的健康评估和对比报告生成
- **PDF转换功能**: 一键将健康评估和对比报告转换为PDF格式并下载
- **多格式输出**: 支持Markdown和PDF两种报告格式

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
- **前后端分离**: 独立部署，便于扩展
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
git clone <repository-url>
cd 健康管理系统
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
后端服务将在 http://localhost:3000 启动

#### 5. 启动前端服务
```bash
cd ../frontend
# 使用任意静态文件服务器，例如：
npx http-server -p 8080
```
前端将在 http://localhost:8080 启动

#### 6. 访问系统
打开浏览器访问 http://localhost:8080

## 项目结构

```
健康管理系统/
├── backend/                 # 后端代码
│   ├── src/
│   │   ├── models/         # 数据模型
│   │   ├── controllers/    # 控制器
│   │   ├── routes/         # 路由
│   │   ├── middleware/     # 中间件
│   │   ├── services/       # 业务服务
│   │   └── utils/          # 工具函数
│   ├── config/             # 配置文件
│   ├── database/           # 数据库脚本
│   └── tests/              # 测试文件
├── frontend/               # 前端代码
│   ├── css/                # 样式文件
│   ├── js/                 # JavaScript文件
│   ├── assets/             # 静态资源
│   └── index.html          # 主页面
└── 数据/                   # 示例数据
```

## 数据库设计

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
- `GET /api/reports/health-assessment/:id/download` - 下载Markdown格式报告
- `POST /api/reports/health-assessment/:id/convert-pdf` - 转换为PDF格式
- `GET /api/reports/health-assessment/customer/:customerId` - 获取客户的健康评估列表

#### 对比分析报告 🆕
- `POST /api/reports/comparison/generate` - 生成AI对比分析报告
- `GET /api/reports/comparison/:id` - 获取对比报告详情
- `GET /api/reports/comparison/:id/download` - 下载Markdown格式对比报告
- `POST /api/reports/comparison/:id/convert-pdf` - 转换为PDF格式
- `GET /api/reports/comparison/customer/:customerId` - 获取客户的对比报告列表
- `DELETE /api/reports/comparison/:id` - 删除对比报告

### 统计分析
- `GET /api/statistics/dashboard` - 获取仪表板统计
- `GET /api/statistics/monthly` - 获取月度统计
- `GET /api/statistics/treatment-types` - 获取治疗类型统计

## 部署说明

### 开发环境
- 后端: `npm run dev` (nodemon热重载)
- 前端: `npx http-server -p 8080`
- 数据库: 本地SQL Server

### 生产环境
- 后端: PM2进程管理
- 前端: Nginx静态文件服务
- 数据库: SQL Server生产配置

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
6. **下载报告**: 支持下载Markdown格式和PDF格式的报告

#### 对比分析报告 🆕
1. **选择检客**: 在报告查看页面选择已有检客
2. **选择报告类型**: 选择"对比报告"选项卡
3. **选择日期范围**: 设置体检记录的日期范围进行筛选
4. **多选体检报告**: 从搜索结果中选择2-3个体检ID进行对比分析（支持配置）
5. **生成AI对比**: 点击生成对比报告，系统将调用DeepSeek AI进行智能对比分析
6. **查看报告**: 在弹窗中查看AI生成的对比分析报告
7. **下载报告**: 支持下载Markdown格式和PDF格式的对比报告
8. **历史管理**: 在历史报告中可以查看、下载或删除之前的对比报告

### 注意事项
- 身份证号为检客唯一标识，系统会自动校验格式
- 治疗方案支持病种关键词自动匹配
- 支持批量导入检客数据
- 所有操作都有详细的日志记录
- AI健康评估和对比分析需要配置DeepSeek API Key
- PDF转换需要运行独立的PDF转换服务
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
1. Fork项目
2. 创建功能分支
3. 提交代码
4. 创建Pull Request

## 常见问题

### Q: 如何修改数据库连接配置？
A: 编辑 `backend/.env` 文件中的数据库配置信息。

### Q: 如何配置DeepSeek API？
A: 在 `backend/.env` 文件中设置 `DEEPSEEK_API_KEY`，获取API Key请访问 [DeepSeek平台](https://platform.deepseek.com/api_keys)。

### Q: 如何配置PDF转换服务？
A: 支持两种配置方式：
- **方式1**: 在 `backend/.env` 中设置 `PDF_CONVERT_URL=http://localhost:4000/convert`
- **方式2**: 分别设置 `PDF_HOST=localhost` 和 `PDF_PORT=4000`

详细配置请参考 `backend/PDF_SERVICE_CONFIG.md` 文档。

### Q: AI健康评估需要什么数据？
A: 需要完整的体检数据，包括各个科室的评估结果和医生总结。

### Q: 系统支持哪些浏览器？
A: 支持Chrome、Firefox、Safari、Edge等现代浏览器。

### Q: 如何备份数据？
A: 使用SQL Server Management Studio进行数据库备份。

### Q: 系统是否支持多用户？
A: 当前版本为单用户版本，多用户支持正在开发中。

### Q: AI评估报告生成失败怎么办？
A: 检查DeepSeek API配置和网络连接，确保PDF转换服务正常运行。

### Q: 对比报告最多可以选择几个体检ID？
A: 默认最多选择3个，可通过环境变量 `COMPARISON_REPORT_MAX_SELECTIONS` 进行配置。

### Q: 对比报告生成重复怎么办？
A: 系统会自动检查5分钟内相同体检ID组合的重复报告，避免重复生成。

### Q: 对比报告的历史记录在哪里查看？
A: 只有在"对比报告"选项卡下才会显示历史报告，其他选项卡的历史报告部分会隐藏。

### Q: 系统中的AIAnalysis和MarkdownContent字段有什么区别？
A:
- **AIAnalysis**: 存储AI的原始分析结果，用于"下载原始文档"和"转换PDF"功能
- **MarkdownContent**: 存储格式化的完整报告，包含标题、元数据、免责声明等，用于报告展示和传统下载

### Q: 为什么下载的PDF内容与网页显示的不一样？
A: 网页显示使用格式化的 `MarkdownContent` 字段，PDF转换使用纯AI分析的 `AIAnalysis` 字段，这是为了提供不同的使用场景。

## 更新日志

### v1.2.2 (2025-10-08) - 用户体验优化版本 ✨
- **页脚固定优化**: 修复所有页面页脚位置问题，现在页脚始终固定在页面最底端
- **Flexbox布局升级**: 采用现代CSS Flexbox布局，确保不同内容长度页面的一致性
- **兼容性提升**: 保持登录页面原有居中设计的同时，优化其他页面的页脚显示
- **响应式优化**: 页脚固定功能在各种屏幕尺寸下都能正常工作

### v1.2.1 (2025-10-07) - 功能优化版本 🔧
- **PDF转换服务配置优化**: 支持两种配置方式（完整URL或分离IP端口），提升部署灵活性
- **字段使用策略优化**: 明确区分AIAnalysis和MarkdownContent字段的使用场景
  - 网页展示和传统下载使用MarkdownContent（格式化报告）
  - 下载原始文档和PDF转换使用AIAnalysis（纯AI分析）
- **环境配置增强**: 添加详细的PDF服务配置指南和示例
- **向后兼容**: 保持现有配置的完全兼容性

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
- **多种报告格式**: 支持Markdown和PDF两种报告下载格式
- **智能通知系统**: 完善的操作状态反馈和错误处理机制

### v1.0.0 (2025-10-03)
- 初始版本发布
- 实现基础检客管理功能
- 实现干细胞治疗管理功能
- 实现数据统计和可视化
- 支持响应式设计

## 技术支持

如有问题或建议，请联系开发团队。

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
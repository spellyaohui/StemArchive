# Project Structure

```
├── backend/                      # Node.js/Express 后端（统一服务）
│   ├── public/                   # 前端静态文件（构建后生成）
│   │   ├── css/                 # 样式文件
│   │   ├── js/                  # JavaScript 文件
│   │   ├── assets/              # 静态资源
│   │   ├── webfonts/            # 字体文件
│   │   ├── 404.html             # 404 错误页面
│   │   └── *.html               # HTML 页面
│   ├── scripts/
│   │   └── build-frontend.js    # 前端构建脚本
│   ├── config/
│   │   ├── config.js            # App configuration
│   │   └── database.js          # MSSQL connection pool & query helpers
│   ├── src/
│   │   ├── controllers/         # Request handlers
│   │   ├── middleware/          # Auth, validation, error handling, rate limiting
│   │   ├── models/              # Data models (Customer, HealthAssessment, Report, etc.)
│   │   ├── routes/              # API route definitions
│   │   ├── services/            # Business logic (deepseekService, pdfService, etc.)
│   │   └── utils/               # Helpers (jwt, logger, response)
│   ├── routes/                   # Additional route files
│   ├── server.js                 # Express app entry point (API + 静态文件服务)
│   └── .env                      # Environment variables (not committed)
│
├── frontend/                     # 前端源代码（开发用）
│   ├── css/
│   │   ├── main.css             # Custom styles
│   │   ├── tailwind.css         # Local Tailwind CSS
│   │   ├── fontawesome.min.css  # Local Font Awesome
│   │   └── fontawesome/         # Font Awesome assets
│   ├── js/
│   │   ├── api.js               # API service layer (CustomerAPI, StemCellAPI, etc.)
│   │   ├── utils.js             # Utilities & NotificationHelper
│   │   ├── auth.js              # Authentication handling
│   │   ├── config.js            # Frontend configuration (自动检测环境)
│   │   ├── components/          # Reusable components (BaseComponent, DataTable)
│   │   └── [page].js            # Page-specific scripts
│   ├── webfonts/                 # Font Awesome font files
│   ├── tests/                    # Playwright E2E tests
│   └── *.html                    # Page files (login, dashboard, customers, etc.)
│
├── database/                     # SQL Server initialization scripts
│   ├── 01-database-init.sql     # Core tables
│   ├── 02-views-and-procedures.sql
│   ├── 03-indexes-and-constraints.sql
│   ├── 04-initial-data.sql      # Seed data
│   └── 05-deployment-validation.sql
│
└── .kiro/steering/               # AI assistant guidance files
```

## 部署架构

### 统一服务模式（生产环境）
```
┌─────────────────────────────────────────┐
│       Express.js 统一服务 (端口 3000)     │
│  ┌─────────────────────────────────────┐│
│  │  /api/*     → API 路由处理          ││
│  │  /health    → 健康检查              ││
│  │  /*         → 静态文件 (public/)    ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

### 开发模式（前后端分离）
```
┌─────────────────┐     ┌─────────────────┐
│   前端服务器     │     │   后端服务器     │
│   (端口 8080)   │────▶│   (端口 3000)   │
│   http-server   │     │   Express.js    │
└─────────────────┘     └─────────────────┘
```

## Key Architectural Patterns

### Backend
- **Data Flow**: Database → Model → Service → Controller → Route → Response
- **Database Access**: Use `executeQuery()` from `config/database.js` with parameterized queries
- **Response Format**: Use `ApiResponse` utility for consistent JSON responses
- **Authentication**: JWT middleware in `src/middleware/auth.js`

### Frontend
- **Page Structure**: Each HTML page has a corresponding JS file (e.g., `customers.html` → `customers.js`)
- **API Layer**: All API calls go through `js/api.js` service objects
- **Components**: Extend `BaseComponent` class for reusable UI components
- **Notifications**: Use `NotificationHelper` for all user feedback

### Database
- **Primary Key**: `Customers.ID` (GUID) with `IdentityCard` as unique business key
- **Core Tables**: Customers, HealthAssessments, StemCellPatients, TreatmentPlans, InfusionSchedules
- **AI Reports**: HealthAssessmentReports, ComparisonReports

## File Naming Conventions
- Backend routes: kebab-case (`health-data.js`)
- Frontend JS: camelCase (`healthData.js`) or kebab-case
- HTML pages: kebab-case (`health-data.html`)
- Database scripts: numbered prefix (`01-`, `02-`, etc.)

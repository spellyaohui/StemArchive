# Technology Stack

## Backend
- **Runtime**: Node.js 14.0+
- **Framework**: Express.js with helmet, cors, morgan middleware
- **Database**: Microsoft SQL Server 2016+ (mssql package)
- **Authentication**: JWT (jsonwebtoken) with bcryptjs password hashing
- **File Upload**: Multer
- **HTTP Client**: Axios (for external API calls)
- **Validation**: express-validator

## Frontend
- **Core**: Vanilla JavaScript (ES5), HTML5, CSS3
- **Styling**: Tailwind CSS (local file, no CDN)
- **Icons**: Font Awesome 6.4.0 (local files)
- **Charts**: Chart.js 4.x (local file)
- **Architecture**: Multi-page application (MPA), component-based with BaseComponent class

## External Integrations
- **AI**: DeepSeek API for health assessment generation
- **PDF**: External PDF conversion service (configurable endpoint)

## Development Tools
- **Backend Dev**: nodemon for hot reload
- **Testing**: Jest (backend), Playwright (frontend E2E)
- **Linting**: ESLint

## Common Commands

### Backend (统一服务)
```bash
cd backend
npm install          # 安装依赖
npm run build        # 构建前端（复制到 public 目录）
npm run dev          # 开发模式启动（热重载）
npm start            # 生产模式启动
npm run prod         # 构建并启动生产服务
npm test             # 运行 Jest 测试
```

### 开发模式（前后端分离）
```bash
# 终端1：后端
cd backend
npm run dev

# 终端2：前端（仅开发时需要）
cd frontend
npx http-server -p 8080
```

### 生产部署
```bash
cd backend
npm run build        # 构建前端
npm start            # 启动统一服务（端口 5000，可通过 .env 中 PORT 配置）
# 或使用 PM2
pm2 start server.js --name "stem-cell-system"
```

### Playwright Tests
```bash
cd frontend/tests
npx playwright install chromium    # Install browser (first time)
npx playwright test                # Run all tests
npx playwright test --headed       # Run with visible browser
```

### Database
```bash
# Execute SQL scripts in order:
# 01-database-init.sql → 02-views-and-procedures.sql → 03-indexes-and-constraints.sql → 04-initial-data.sql → 05-deployment-validation.sql
```

## Environment Variables
Key variables in `backend/.env`:
- `DB_USER`, `DB_PASSWORD`, `DB_SERVER`, `DB_DATABASE` - Database connection
- `JWT_SECRET`, `JWT_EXPIRES_IN` - Authentication
- `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL` - AI integration
- `PDF_CONVERT_URL` or `PDF_HOST`/`PDF_PORT` - PDF service

## Critical Rules
- **No CDN**: All third-party libraries must be local files (no external CDN references)
- **API Responses**: Use `ApiResponse` utility class for consistent response format
- **Parameterized Queries**: Always use parameterized queries to prevent SQL injection
- **Notifications**: Use `NotificationHelper` system, never use `alert()`

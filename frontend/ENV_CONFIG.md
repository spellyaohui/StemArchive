# 前端环境变量配置说明

## 概述

前端环境变量配置系统允许你通过修改 `.env` 文件来配置第三方API地址和其他前端设置，无需修改代码。

## 文件结构

```
frontend/
├── .env                    # 环境变量配置文件
├── env.js                  # 自动生成的环境变量JS文件（请勿手动修改）
├── scripts/
│   └── build-env.js        # 环境变量构建脚本
└── ENV_CONFIG.md           # 本说明文档
```

## 配置文件说明

### `.env` 文件

这是主要的配置文件，包含以下环境变量：

```bash
# 第三方体检API配置
EXAMINATION_API_BASE_URL=http://172.17.18.66:3001/api

# 开发环境配置
DEVELOPMENT_API_BASE_URL=http://localhost:5000/api
DEVELOPMENT_EXAMINATION_API_BASE_URL=http://172.17.18.66:3001/api

# 生产环境配置
PRODUCTION_API_BASE_URL=/api
PRODUCTION_EXAMINATION_API_BASE_URL=http://172.17.18.66:3001/api
```

### 环境变量说明

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `EXAMINATION_API_BASE_URL` | 第三方体检API的基础URL | `http://172.17.18.66:3001/api` |
| `DEVELOPMENT_API_BASE_URL` | 开发环境下的后端API地址 | `http://localhost:5000/api` |
| `DEVELOPMENT_EXAMINATION_API_BASE_URL` | 开发环境下的第三方API地址 | `http://172.17.18.66:3001/api` |
| `PRODUCTION_API_BASE_URL` | 生产环境下的后端API地址 | `/api` |
| `PRODUCTION_EXAMINATION_API_BASE_URL` | 生产环境下的第三方API地址 | `http://172.17.18.66:3001/api` |

## 使用方法

### 1. 修改配置

编辑 `frontend/.env` 文件，修改相应的环境变量值：

```bash
# 例如：修改第三方API地址
EXAMINATION_API_BASE_URL=http://新的IP地址:端口/api
```

### 2. 重新构建

修改配置后，需要重新构建前端：

```bash
# 方法1：单独构建前端环境变量
cd frontend
node scripts/build-env.js

# 方法2：完整构建前端（推荐）
cd backend
npm run build
```

### 3. 重启服务

重新构建后，重启后端服务：

```bash
cd backend
npm start
```

## 自动化构建

环境变量构建已集成到前端构建流程中：

1. 当运行 `npm run build` 时，会自动执行环境变量构建
2. 构建脚本会读取 `.env` 文件并生成 `env.js` 文件
3. `env.js` 文件会被复制到 `backend/public/` 目录

## 配置优先级

前端配置的加载优先级如下：

1. **预设配置**：`window.EXAMINATION_API_CONFIG.baseURL`（如果已设置）
2. **环境变量**：`window.ENV.EXAMINATION_API_BASE_URL`
3. **环境特定配置**：根据开发/生产环境选择对应配置
4. **默认配置**：硬编码的默认值

## 部署注意事项

### 开发环境

- 前端运行在端口 8080
- 后端运行在端口 5000
- 第三方API使用配置的地址

### 生产环境

- 前后端合并运行在同一端口
- 后端API使用相对路径 `/api`
- 第三方API使用配置的完整地址

### 宝塔部署

在宝塔面板部署时：

1. 修改 `frontend/.env` 文件中的IP地址
2. 运行 `npm run build` 重新构建
3. 在宝塔面板中重启Node.js应用

## 故障排除

### 问题：修改配置后不生效

**解决方案**：
1. 确认已修改 `frontend/.env` 文件
2. 运行 `npm run build` 重新构建
3. 重启后端服务

### 问题：第三方API连接失败

**解决方案**：
1. 检查 `.env` 文件中的IP地址和端口是否正确
2. 确认第三方API服务是否正常运行
3. 检查网络连接和防火墙设置

### 问题：环境变量构建失败

**解决方案**：
1. 检查 `frontend/.env` 文件格式是否正确
2. 确认 `frontend/scripts/build-env.js` 文件存在
3. 手动运行构建脚本进行调试

## 示例配置

### 本地开发配置

```bash
EXAMINATION_API_BASE_URL=http://localhost:3001/api
DEVELOPMENT_API_BASE_URL=http://localhost:5000/api
DEVELOPMENT_EXAMINATION_API_BASE_URL=http://localhost:3001/api
PRODUCTION_API_BASE_URL=/api
PRODUCTION_EXAMINATION_API_BASE_URL=http://localhost:3001/api
```

### 服务器部署配置

```bash
EXAMINATION_API_BASE_URL=http://172.17.18.66:3001/api
DEVELOPMENT_API_BASE_URL=http://localhost:5000/api
DEVELOPMENT_EXAMINATION_API_BASE_URL=http://172.17.18.66:3001/api
PRODUCTION_API_BASE_URL=/api
PRODUCTION_EXAMINATION_API_BASE_URL=http://172.17.18.66:3001/api
```

## 技术实现

### 构建流程

1. `build-env.js` 读取 `.env` 文件
2. 解析环境变量并生成 `env.js` 文件
3. `env.js` 文件定义 `window.ENV` 全局对象
4. `config.js` 文件使用 `window.ENV` 中的配置

### 代码集成

前端配置文件 `config.js` 中的相关代码：

```javascript
// 根据当前环境确定第三方体检API基础URL
function getExaminationAPIBaseURL() {
    // 优先使用预设的配置
    if (window.EXAMINATION_API_CONFIG && window.EXAMINATION_API_CONFIG.baseURL) {
        return window.EXAMINATION_API_CONFIG.baseURL;
    }

    // 使用环境变量配置
    if (window.ENV && window.ENV.EXAMINATION_API_BASE_URL) {
        return window.ENV.EXAMINATION_API_BASE_URL;
    }

    // 根据环境选择对应的API地址
    if (isDevelopment()) {
        return window.ENV?.DEVELOPMENT_EXAMINATION_API_BASE_URL || 'http://172.17.18.66:3001/api';
    } else {
        return window.ENV?.PRODUCTION_EXAMINATION_API_BASE_URL || 'http://172.17.18.66:3001/api';
    }
}
```
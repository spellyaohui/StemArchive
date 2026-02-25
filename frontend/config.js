/**
 * 前端配置文件
 * 用于动态配置API地址和其他前端设置
 * 
 * 支持两种部署模式：
 * 1. 开发模式：前端独立运行在本地非5000端口（如 5173），后端在 5000 端口
 * 2. 生产模式：前后端合并，使用同一端口（相对路径）
 */

// 获取当前域名和端口
const currentHost = window.location.hostname;
const currentPort = window.location.port;
const currentPath = window.location.pathname;
const currentProtocol = window.location.protocol;

// 检测是否在根目录部署
function isRootDeployment() {
    // 如果路径是根目录或者只有一层深度（如 /login.html），则认为是根目录部署
    return currentPath === '/' || currentPath.split('/').filter(Boolean).length <= 1;
}

// 获取当前环境的基础路径
function getBasePath() {
    if (isRootDeployment()) {
        return '';
    }
    // 开发环境frontend子目录或生产环境子目录
    const pathSegments = currentPath.split('/').filter(Boolean);
    return pathSegments.length > 0 ? '/' + pathSegments[0] : '';
}

// 检测是否为开发环境
function isDevelopment() {
    // 开发环境特征：
    // 1. 在本地 localhost/127.0.0.1 访问
    // 2. 端口不是后端统一服务端口 5000
    // 兼容 5173、8080 等前端独立开发端口
    const isLocalHost = currentHost === 'localhost' || currentHost === '127.0.0.1';
    return isLocalHost && currentPort !== '' && currentPort !== '5000';
}

// 根据当前环境确定API基础URL
function getAPIBaseURL() {
    // 开发环境：前端在本地非5000端口，API 在 5000 端口
    if (isDevelopment()) {
        return `${currentProtocol}//${currentHost}:5000/api`;
    }

    // 生产环境：前后端合并，使用相对路径
    // 这样无论部署在什么域名和端口，都能正确访问 API
    return '/api';
}


// 配置对象
const CONFIG = {
    // API配置
    api: {
        baseURL: getAPIBaseURL(),
        timeout: 10000,
        headers: {
            'Content-Type': 'application/json'
        }
    },


    // 应用配置
    app: {
        name: '干细胞治疗档案管理系统',
        version: '1.2.1',
        environment: isDevelopment() ? 'development' : 'production',
        basePath: getBasePath(),
        isRootDeployment: isRootDeployment(),
        isDevelopment: isDevelopment()
    },

    // 路径配置
    paths: {
        basePath: getBasePath(),
        isRootDeployment: isRootDeployment(),
        // 构建完整路径的辅助函数
        buildPath: function(path) {
            return getBasePath() + path;
        }
    }
};

// 导出配置
window.CONFIG = CONFIG;

// 为了兼容性，也导出API_CONFIG
window.API_CONFIG = CONFIG.api;


// 调试信息（仅开发环境）
if (isDevelopment()) {
    console.log('========================================');
    console.log('  前端配置信息（开发模式）');
    console.log('========================================');
    console.log('API 基础地址:', CONFIG.api.baseURL);
    console.log('运行环境:', CONFIG.app.environment);
    console.log('========================================');
}

// 配置说明
// ========================================
//
// 1. 主API配置：会根据当前环境自动调整
//    - 开发环境(本地非5000端口，如5173/8080)：http://localhost:5000/api
//    - 生产环境：/api（相对路径，自动适应任何域名和端口）
//
// 2. 使用方法：
//    - 主API：CONFIG.api.baseURL
//    - 或使用全局变量：window.API_CONFIG.baseURL
//
// 3. 部署说明：
//    - 开发时：前端运行 npx http-server -a 127.0.0.1 -p 5173，后端运行 npm run dev
//    - 生产时：运行 npm run build 构建前端，然后 npm start 启动统一服务器
//
// ========================================

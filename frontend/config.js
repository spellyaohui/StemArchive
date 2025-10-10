/**
 * 前端配置文件
 * 用于动态配置API地址和其他前端设置
 */

// 获取当前域名和端口
const currentHost = window.location.hostname;
const currentPort = window.location.port;
const currentPath = window.location.pathname;

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

// 根据当前环境确定API基础URL
function getAPIBaseURL() {
    // 开发环境：如果前端在8080端口，API在5000端口
    if (currentPort === '8080') {
        return `http://${currentHost}:5000/api`;
    }

    // 生产环境：使用同域名和端口
    return `http://${currentHost}/api`;
}

// 根据当前环境确定第三方体检API基础URL
function getExaminationAPIBaseURL() {
    // 开发环境：默认第三方API在3000端口
    if (currentPort === '8080') {
        return `http://${currentHost}:3000/api`;
    }

    // 生产环境：使用环境变量或配置文件中的URL
    // 这里可以通过全局配置或环境变量来设置
    if (window.EXAMINATION_API_CONFIG && window.EXAMINATION_API_CONFIG.baseURL) {
        return window.EXAMINATION_API_CONFIG.baseURL;
    }

    // 默认配置
    return `http://${currentHost}:3000/api`;
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

    // 第三方体检API配置
    examinationAPI: {
        baseURL: getExaminationAPIBaseURL(),
        timeout: 10000,
        headers: {
            'Content-Type': 'application/json'
        }
    },

    // 应用配置
    app: {
        name: '干细胞治疗档案管理系统',
        version: '1.0.0',
        environment: currentPort === '8080' ? 'development' : 'production',
        basePath: getBasePath(),
        isRootDeployment: isRootDeployment()
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

// 导出第三方体检API配置
window.EXAMINATION_API_CONFIG = CONFIG.examinationAPI;

// 配置说明
// 1. 主API配置：会根据当前环境自动调整
//    - 开发环境(8080端口)：http://localhost:5000/api
//    - 生产环境：http://域名/api
//
// 2. 第三方体检API配置：
//    - 开发环境：http://localhost:3000/api
//    - 生产环境：可通过 window.EXAMINATION_API_CONFIG.baseURL 自定义
//    - 支持通过全局变量覆盖：window.EXAMINATION_API_CONFIG = { baseURL: '自定义URL' }
//
// 3. 使用方法：
//    - 主API：CONFIG.api.baseURL
//    - 第三方API：CONFIG.examinationAPI.baseURL
//    - 或使用全局变量：window.API_CONFIG.baseURL, window.EXAMINATION_API_CONFIG.baseURL
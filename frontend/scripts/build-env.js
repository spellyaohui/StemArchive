/**
 * 前端环境变量构建脚本
 * 从 .env 文件读取环境变量并生成 env.js 文件
 */

const fs = require('fs');
const path = require('path');

// 读取 .env 文件
function loadEnvFile(envPath) {
    if (!fs.existsSync(envPath)) {
        console.warn(`环境变量文件不存在: ${envPath}`);
        return {};
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};

    envContent.split('\n').forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                envVars[key.trim()] = valueParts.join('=').trim();
            }
        }
    });

    return envVars;
}

// 生成 env.js 文件
function generateEnvJS(envVars, outputPath) {
    const envJSContent = `/**
 * 前端环境变量配置
 * 由构建脚本自动生成，请勿手动修改
 * 生成时间: ${new Date().toISOString()}
 */

// 环境变量配置对象
window.ENV = ${JSON.stringify(envVars, null, 4)};

// 导出环境变量（兼容性）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.ENV;
}`;

    fs.writeFileSync(outputPath, envJSContent, 'utf8');
    console.log(`✅ 环境变量文件已生成: ${outputPath}`);
}

// 主函数
function buildEnv() {
    const frontendDir = path.resolve(__dirname, '..');
    const envPath = path.join(frontendDir, '.env');
    const outputPath = path.join(frontendDir, 'env.js');

    console.log('========================================');
    console.log('  前端环境变量构建脚本');
    console.log('========================================');
    console.log(`读取环境变量: ${envPath}`);
    console.log(`输出文件: ${outputPath}`);
    console.log('========================================');

    // 读取环境变量
    const envVars = loadEnvFile(envPath);
    
    if (Object.keys(envVars).length === 0) {
        console.warn('⚠️ 未找到有效的环境变量，使用默认配置');
        // 使用默认配置
        envVars.EXAMINATION_API_BASE_URL = 'http://172.17.18.66:3001/api';
        envVars.DEVELOPMENT_API_BASE_URL = 'http://localhost:5000/api';
        envVars.DEVELOPMENT_EXAMINATION_API_BASE_URL = 'http://172.17.18.66:3001/api';
        envVars.PRODUCTION_API_BASE_URL = '/api';
        envVars.PRODUCTION_EXAMINATION_API_BASE_URL = 'http://172.17.18.66:3001/api';
    }

    // 生成 env.js
    generateEnvJS(envVars, outputPath);

    console.log('========================================');
    console.log(`✅ 构建完成！共处理 ${Object.keys(envVars).length} 个环境变量`);
    console.log('========================================');
}

// 如果直接运行此脚本
if (require.main === module) {
    buildEnv();
}

module.exports = { buildEnv };
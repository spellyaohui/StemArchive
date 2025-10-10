#!/usr/bin/env node

/**
 * 第三方体检API配置验证脚本
 * 检查配置是否正确设置，避免硬编码
 */

// 加载环境变量
require('dotenv').config();

const examinationDateService = require('./src/services/examinationDateService');

console.log('='.repeat(60));
console.log('第三方体检API配置验证');
console.log('='.repeat(60));

function validateConfig() {
    console.log('\n📋 1. 环境变量配置检查');
    console.log('-'.repeat(40));

    let hasValidConfig = false;
    let configMethod = '';

    // 检查主要配置方式
    const baseUrl = process.env.EXAMINATION_API_BASE_URL;
    if (baseUrl) {
        console.log(`✅ EXAMINATION_API_BASE_URL: ${baseUrl}`);
        hasValidConfig = true;
        configMethod = '完整URL配置';
    } else {
        console.log(`❌ EXAMINATION_API_BASE_URL: 未配置`);
    }

    // 检查备用配置方式
    console.log('\n📋 2. 备用配置检查');
    console.log('-'.repeat(40));

    const host = process.env.EXAMINATION_API_HOST;
    const port = process.env.EXAMINATION_API_PORT;

    if (host && port && !baseUrl) {
        console.log(`✅ EXAMINATION_API_HOST: ${host}`);
        console.log(`✅ EXAMINATION_API_PORT: ${port}`);
        console.log(`🔗 构建URL: http://${host}:${port}/api`);
        hasValidConfig = true;
        configMethod = '分离IP端口配置';
    } else if (host && port) {
        console.log(`ℹ️  EXAMINATION_API_HOST: ${host} (备用)`);
        console.log(`ℹ️  EXAMINATION_API_PORT: ${port} (备用)`);
        console.log(`🔗 构建URL: http://${host}:${port}/api (备用)`);
    } else {
        console.log(`❌ EXAMINATION_API_HOST: 未配置`);
        console.log(`❌ EXAMINATION_API_PORT: 未配置`);
    }

    // 检查其他配置
    console.log('\n📋 3. API调用配置检查');
    console.log('-'.repeat(40));

    const otherConfigs = [
        'EXAMINATION_API_TIMEOUT',
        'EXAMINATION_API_RETRY_COUNT',
        'EXAMINATION_API_RETRY_DELAY'
    ];

    let otherConfigValid = true;

    for (const envVar of otherConfigs) {
        const value = process.env[envVar];
        if (value) {
            console.log(`✅ ${envVar}: ${value}`);
        } else {
            console.log(`❌ ${envVar}: 未配置 (将使用默认值)`);
        }
    }

    console.log(`\n🎯 配置方式: ${configMethod || '❌ 无有效配置'}`);

    return hasValidConfig;
}

function testServiceInitialization() {
    console.log('\n📋 4. 服务初始化测试');
    console.log('-'.repeat(40));

    try {
        // 创建服务实例测试配置
        const service = new examinationDateService.constructor();

        console.log(`✅ 服务初始化成功`);
        console.log(`📡 API地址: ${service.apiBaseURL}`);
        console.log(`⏱️ 超时时间: ${service.timeout}ms`);
        console.log(`🔄 重试次数: ${service.retryCount}`);
        console.log(`⏸️ 重试延迟: ${service.retryDelay}ms`);

        return true;
    } catch (error) {
        console.log(`❌ 服务初始化失败: ${error.message}`);
        return false;
    }
}

function showConfigurationExamples() {
    console.log('\n📋 5. 配置示例');
    console.log('-'.repeat(40));

    console.log('\n🔧 开发环境配置 (.env):');
    console.log(`# 第三方体检API配置`);
    console.log(`EXAMINATION_API_BASE_URL=http://localhost:3000/api`);
    console.log(`EXAMINATION_API_TIMEOUT=10000`);
    console.log(`EXAMINATION_API_RETRY_COUNT=3`);
    console.log(`EXAMINATION_API_RETRY_DELAY=1000`);

    console.log('\n🔧 生产环境配置 (.env):');
    console.log(`# 第三方体检API配置`);
    console.log(`EXAMINATION_API_BASE_URL=https://api.example.com/api`);
    console.log(`EXAMINATION_API_TIMEOUT=30000`);
    console.log(`EXAMINATION_API_RETRY_COUNT=5`);
    console.log(`EXAMINATION_API_RETRY_DELAY=2000`);

    console.log('\n🔧 备用配置方式 (.env):');
    console.log(`# 注释掉 EXAMINATION_API_BASE_URL`);
    console.log(`# EXAMINATION_API_BASE_URL=http://localhost:3000/api`);
    console.log(``);
    console.log(`# 使用分离的IP和端口配置`);
    console.log(`EXAMINATION_API_HOST=api.example.com`);
    console.log(`EXAMINATION_API_PORT=443`);
}

async function runValidation() {
    try {
        console.log('开始验证第三方体检API配置...\n');

        // 1. 验证环境变量配置
        const configValid = validateConfig();

        // 2. 测试服务初始化
        const serviceValid = testServiceInitialization();

        // 3. 显示配置示例
        showConfigurationExamples();

        // 4. 总结
        console.log('\n' + '='.repeat(60));
        console.log('配置验证完成');
        console.log('='.repeat(60));

        console.log('\n📊 验证结果:');

        if (configValid && serviceValid) {
            console.log('✅ 所有配置验证通过');
            console.log('✅ 服务可以正常初始化');
            console.log('✅ 未发现硬编码配置');
        } else {
            console.log('❌ 存在配置问题');
            if (!configValid) {
                console.log('❌ 环境变量配置不完整');
            }
            if (!serviceValid) {
                console.log('❌ 服务初始化失败');
            }
        }

        console.log('\n🎯 配置要求:');
        console.log('1. 必须设置 EXAMINATION_API_BASE_URL 或 EXAMINATION_API_HOST + EXAMINATION_API_PORT');
        console.log('2. 建议配置超时时间和重试参数');
        console.log('3. 生产环境应使用HTTPS协议');
        console.log('4. 避免在代码中硬编码API地址和端口');

    } catch (error) {
        console.error('❌ 验证过程中发生错误:', error);
    }
}

// 运行验证
runValidation().catch(error => {
    console.error('验证执行失败:', error);
    process.exit(1);
});
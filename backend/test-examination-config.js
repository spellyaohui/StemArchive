#!/usr/bin/env node

/**
 * 第三方体检API配置测试脚本
 * 验证后端是否能正确读取和处理第三方API配置
 */

// 加载环境变量
require('dotenv').config();

const path = require('path');

console.log('='.repeat(60));
console.log('第三方体检API配置测试');
console.log('='.repeat(60));

// 1. 测试环境变量加载
console.log('\n1. 环境变量配置检查:');
console.log('-'.repeat(30));

const examinationConfig = {
    EXAMINATION_API_HOST: process.env.EXAMINATION_API_HOST,
    EXAMINATION_API_PORT: process.env.EXAMINATION_API_PORT,
    EXAMINATION_API_BASE_URL: process.env.EXAMINATION_API_BASE_URL
};

console.log('EXAMINATION_API_HOST:', examinationConfig.EXAMINATION_API_HOST || '❌ 未设置');
console.log('EXAMINATION_API_PORT:', examinationConfig.EXAMINATION_API_PORT || '❌ 未设置');
console.log('EXAMINATION_API_BASE_URL:', examinationConfig.EXAMINATION_API_BASE_URL || '❌ 未设置');

// 2. 验证配置完整性
console.log('\n2. 配置完整性验证:');
console.log('-'.repeat(30));

const hasAllConfig = examinationConfig.EXAMINATION_API_HOST &&
                     examinationConfig.EXAMINATION_API_PORT &&
                     examinationConfig.EXAMINATION_API_BASE_URL;

if (hasAllConfig) {
    console.log('✅ 所有必需的配置项都已设置');
} else {
    console.log('❌ 缺少必需的配置项');
}

// 3. 验证URL格式
console.log('\n3. URL格式验证:');
console.log('-'.repeat(30));

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

if (examinationConfig.EXAMINATION_API_BASE_URL) {
    const isValid = isValidUrl(examinationConfig.EXAMINATION_API_BASE_URL);
    console.log('EXAMINATION_API_BASE_URL 有效性:', isValid ? '✅ 有效URL' : '❌ 无效URL');
}

// 4. 构建配置对象（模拟后端使用）
console.log('\n4. 后端配置对象构建:');
console.log('-'.repeat(30));

const backendConfig = {
    examinationAPI: {
        host: examinationConfig.EXAMINATION_API_HOST || 'localhost',
        port: parseInt(examinationConfig.EXAMINATION_API_PORT) || 3000,
        baseURL: examinationConfig.EXAMINATION_API_BASE_URL || `http://localhost:3000/api`,
        timeout: parseInt(process.env.EXAMINATION_API_TIMEOUT) || 10000,
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'HealthManagementSystem/1.0'
        }
    }
};

console.log('构建的配置对象:');
console.log(JSON.stringify(backendConfig, null, 2));

// 5. 模拟配置使用场景
console.log('\n5. 配置使用场景测试:');
console.log('-'.repeat(30));

// 模拟API调用函数
function mockAPICall(config) {
    return {
        url: config.examinationAPI.baseURL + '/test',
        method: 'GET',
        headers: config.examinationAPI.headers,
        timeout: config.examinationAPI.timeout
    };
}

const mockRequest = mockAPICall(backendConfig);
console.log('模拟API请求配置:');
console.log(JSON.stringify(mockRequest, null, 2));

// 6. 环境适配测试
console.log('\n6. 环境适配测试:');
console.log('-'.repeat(30));

const currentEnv = process.env.NODE_ENV || 'development';
console.log('当前环境:', currentEnv);

let expectedConfig = {};
switch (currentEnv) {
    case 'development':
        expectedConfig = {
            host: 'localhost',
            port: 3000,
            baseURL: 'http://localhost:3000/api'
        };
        break;
    case 'production':
        expectedConfig = {
            host: process.env.EXAMINATION_API_HOST,
            port: parseInt(process.env.EXAMINATION_API_PORT),
            baseURL: process.env.EXAMINATION_API_BASE_URL
        };
        break;
    default:
        expectedConfig = {
            host: 'localhost',
            port: 3000,
            baseURL: 'http://localhost:3000/api'
        };
}

console.log('期望的配置:', JSON.stringify(expectedConfig, null, 2));

// 7. 配置验证总结
console.log('\n7. 配置验证总结:');
console.log('-'.repeat(30));

const issues = [];

if (!examinationConfig.EXAMINATION_API_HOST) {
    issues.push('缺少 EXAMINATION_API_HOST 配置');
}

if (!examinationConfig.EXAMINATION_API_PORT) {
    issues.push('缺少 EXAMINATION_API_PORT 配置');
}

if (!examinationConfig.EXAMINATION_API_BASE_URL) {
    issues.push('缺少 EXAMINATION_API_BASE_URL 配置');
}

if (examinationConfig.EXAMINATION_API_BASE_URL && !isValidUrl(examinationConfig.EXAMINATION_API_BASE_URL)) {
    issues.push('EXAMINATION_API_BASE_URL 格式无效');
}

if (issues.length === 0) {
    console.log('✅ 所有配置验证通过');
    console.log('✅ 第三方体检API配置可以正常使用');
} else {
    console.log('❌ 发现以下配置问题:');
    issues.forEach(issue => console.log(`   - ${issue}`));
}

console.log('\n' + '='.repeat(60));
console.log('测试完成');
console.log('='.repeat(60));
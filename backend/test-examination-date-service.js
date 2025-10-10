#!/usr/bin/env node

/**
 * 体检日期服务测试脚本
 * 验证第三方API日期获取功能
 */

// 加载环境变量
require('dotenv').config();

const examinationDateService = require('./src/services/examinationDateService');

console.log('='.repeat(60));
console.log('体检日期服务测试');
console.log('='.repeat(60));

async function runTests() {
    // 1. 测试单个体检ID获取
    console.log('\n1. 单个体检ID日期获取测试:');
    console.log('-'.repeat(30));

    const testStudyIds = ['2301110023', '2401110282', '9999999999'];

    for (const studyId of testStudyIds) {
        console.log(`\n测试体检ID: ${studyId}`);
        const date = await examinationDateService.getExaminationDate(studyId);
        if (date) {
            console.log(`✅ 成功获取日期: ${date}`);
            console.log(`   日期格式验证: ${examinationDateService.isValidDateFormat(date) ? '✅ 有效' : '❌ 无效'}`);
        } else {
            console.log(`❌ 未找到日期数据`);
        }
    }

    // 2. 测试批量获取
    console.log('\n\n2. 批量体检ID日期获取测试:');
    console.log('-'.repeat(30));

    const batchStudyIds = ['2301110023', '2401110282', '2301110023', '9999999999'];
    console.log(`批量获取 ${batchStudyIds.length} 个体检ID的日期...`);

    const batchResults = await examinationDateService.getBatchExaminationDates(batchStudyIds);
    console.log(`批量获取结果：`);
    for (const [studyId, date] of batchResults) {
        console.log(`  ${studyId} -> ${date}`);
    }

    // 3. 测试科室类型映射
    console.log('\n\n3. 科室类型日期字段映射测试:');
    console.log('-'.repeat(30));

    const departmentTypes = ['laboratory', 'general', 'imaging', 'instrument', 'unknown'];
    for (const type of departmentTypes) {
        const fieldName = examinationDateService.getDateFieldNameByDepartment(type);
        const displayName = examinationDateService.getDateDisplayNameByDepartment(type);
        console.log(`${type} -> 字段名: ${fieldName}, 显示名: ${displayName}`);
    }

    // 4. 测试日期格式化
    console.log('\n\n4. 日期格式化测试:');
    console.log('-'.repeat(30));

    const testDates = [
        '2023-01-11 07:50:35',
        '2023-1-11 7:50:35',
        '2023/01/11 07:50:35',
        'invalid-date',
        '',
        null
    ];

    for (const dateStr of testDates) {
        console.log(`原始日期: "${dateStr}"`);
        const formatted = examinationDateService.formatDateForDatabase(dateStr);
        console.log(`格式化后: "${formatted}"`);
        console.log(`有效性: ${examinationDateService.isValidDateFormat(formatted) ? '✅' : '❌'}`);
        console.log('');
    }

    // 5. 测试服务健康检查
    console.log('5. 服务健康检查测试:');
    console.log('-'.repeat(30));

    const healthStatus = await examinationDateService.healthCheck();
    console.log('服务状态:');
    console.log(JSON.stringify(healthStatus, null, 2));

    console.log('\n' + '='.repeat(60));
    console.log('测试完成');
    console.log('='.repeat(60));
}

// 运行测试
runTests().catch(error => {
    console.error('测试过程中发生错误:', error);
    process.exit(1);
});
// 调试体检数据导入
require('dotenv').config();

const axios = require('axios');
const examinationDataImportService = require('./src/services/examinationDataImportService');
const departmentCodeService = require('./src/services/departmentCodeService');

async function testDebug() {
    const baseURL = 'http://localhost:3000/api';
    const examId = '2001190095';
    const identityCard = '220104197810052018';
    const customerId = '7087591D-AF59-4556-B8BE-157AB81FDBB3';
    
    console.log('=== 调试体检ID: ' + examId + ' ===\n');
    
    // 1. 获取科室编码
    console.log('1. 获取科室编码...');
    const codes = await departmentCodeService.getDepartmentCodes(examId);
    console.log(`   科室编码: [${codes.join(', ')}]\n`);
    
    // 2. 获取体检日期
    console.log('2. 获取体检日期...');
    try {
        const dateResponse = await axios.post(`${baseURL}/get_tjrq`, { studyId: examId });
        console.log(`   体检日期: ${JSON.stringify(dateResponse.data)}\n`);
    } catch (e) {
        console.log(`   获取日期失败: ${e.message}\n`);
    }
    
    // 3. 逐个测试科室数据
    for (const code of codes) {
        console.log(`3. 测试科室 ${code} 的数据...`);
        
        // 查找科室类型
        const { executeQuery } = require('./config/database');
        const depts = await executeQuery(`
            SELECT DepartmentCode, DepartmentName, DepartmentType 
            FROM Departments WHERE DepartmentCode = @code AND IsActive = 1
        `, [{ name: 'code', value: code }]);
        
        if (depts.length === 0) {
            console.log(`   ⚠️ 科室 ${code} 在系统中不存在，跳过\n`);
            continue;
        }
        
        const dept = depts[0];
        console.log(`   科室: ${dept.DepartmentName} (${dept.DepartmentType})`);
        
        // 根据科室类型调用不同的API
        let apiUrl, payload = { studyId: examId };
        switch (dept.DepartmentType) {
            case 'laboratory':
                apiUrl = `${baseURL}/query_laboratory`;
                break;
            case 'general':
                apiUrl = `${baseURL}/query_cgks`;
                payload.ksbm = code;
                break;
            case 'imaging':
                apiUrl = `${baseURL}/query_yxk`;
                payload.ksbm = code;
                break;
            case 'instrument':
                apiUrl = `${baseURL}/query_instrument`;
                payload.ksbm = code;
                break;
        }
        
        try {
            const response = await axios.post(apiUrl, payload);
            console.log(`   API响应: code=${response.data.code}, 数据条数=${Array.isArray(response.data.data) ? response.data.data.length : 1}`);
            
            // 检查是否为空数据
            const isEmpty = examinationDataImportService.isEmptyData(response.data, dept.DepartmentType);
            console.log(`   是否为空数据: ${isEmpty}`);
            
            if (!isEmpty && response.data.data) {
                console.log(`   数据预览: ${JSON.stringify(response.data.data).substring(0, 200)}...`);
            }
        } catch (e) {
            console.log(`   API调用失败: ${e.message}`);
        }
        console.log('');
    }
    
    // 4. 尝试导入
    console.log('4. 尝试导入...');
    const result = await examinationDataImportService.importAllExaminationData(
        identityCard, 
        customerId, 
        [examId]
    );
    
    console.log('\n=== 导入结果 ===');
    console.log(JSON.stringify(result, null, 2));
    
    setTimeout(() => process.exit(0), 2000);
}

testDebug();

// 调试崔春的体检数据导入
require('dotenv').config();

const axios = require('axios');
const departmentCodeService = require('./src/services/departmentCodeService');

async function testCuiChun() {
    const baseURL = 'http://localhost:3000/api';
    const identityCard = '220104197909258622';
    const customerId = 'EA89A448-B17E-484C-B769-49EA6CEF85C4';
    
    console.log('=== 调试崔春的体检数据 ===\n');
    console.log(`身份证号: ${identityCard}`);
    console.log(`客户ID: ${customerId}\n`);
    
    // 1. 获取体检ID列表
    console.log('1. 获取体检ID列表...');
    const examIds = await departmentCodeService.getExaminationIds(identityCard);
    console.log(`   找到 ${examIds.length} 条体检记录:`);
    examIds.forEach((id, index) => {
        console.log(`   ${index + 1}. ${id}`);
    });
    console.log('');
    
    // 2. 查找21年的体检记录
    console.log('2. 查找21年的体检记录...');
    for (const examId of examIds) {
        try {
            const dateResponse = await axios.post(`${baseURL}/get_tjrq`, { studyId: examId });
            const examDate = dateResponse.data.data;
            console.log(`   体检ID: ${examId}, 日期: ${examDate}`);
            
            // 检查是否是21年的数据
            if (examDate && examDate.includes('2021')) {
                console.log(`   ✅ 这是21年的数据！`);
                
                // 获取科室编码
                const codes = await departmentCodeService.getDepartmentCodes(examId);
                console.log(`   科室编码: [${codes.join(', ')}]`);
            }
        } catch (e) {
            console.log(`   体检ID: ${examId}, 获取日期失败: ${e.message}`);
        }
    }
    
    // 3. 检查数据库中已有的数据
    console.log('\n3. 检查数据库中已有的数据...');
    const { executeQuery } = require('./config/database');
    
    // 检查LaboratoryData
    const labData = await executeQuery(`
        SELECT ExamId, COUNT(*) as count 
        FROM LaboratoryData 
        WHERE CustomerID = @customerId 
        GROUP BY ExamId
    `, [{ name: 'customerId', value: customerId }]);
    console.log('   LaboratoryData:');
    labData.forEach(row => {
        console.log(`     ExamId: ${row.ExamId}, 记录数: ${row.count}`);
    });
    
    // 检查HealthAssessments
    const healthData = await executeQuery(`
        SELECT MedicalExamID, Department, COUNT(*) as count 
        FROM HealthAssessments 
        WHERE CustomerID = @customerId 
        GROUP BY MedicalExamID, Department
    `, [{ name: 'customerId', value: customerId }]);
    console.log('   HealthAssessments:');
    healthData.forEach(row => {
        console.log(`     ExamId: ${row.MedicalExamID}, 科室: ${row.Department}, 记录数: ${row.count}`);
    });
    
    setTimeout(() => process.exit(0), 2000);
}

testCuiChun().catch(console.error);

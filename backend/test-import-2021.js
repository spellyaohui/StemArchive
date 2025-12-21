// 测试导入崔春21年的体检数据
require('dotenv').config();

const examinationDataImportService = require('./src/services/examinationDataImportService');

async function testImport2021() {
    const identityCard = '220104197909258622';
    const customerId = 'EA89A448-B17E-484C-B769-49EA6CEF85C4';
    const examId = '2101240110';  // 21年的体检ID
    
    console.log('=== 测试导入崔春21年的体检数据 ===\n');
    console.log(`身份证号: ${identityCard}`);
    console.log(`客户ID: ${customerId}`);
    console.log(`体检ID: ${examId}\n`);
    
    try {
        const result = await examinationDataImportService.importAllExaminationData(
            identityCard, 
            customerId, 
            [examId]  // 只导入21年的数据
        );
        
        console.log('\n=== 导入结果 ===');
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('导入失败:', error);
    }
    
    setTimeout(() => process.exit(0), 2000);
}

testImport2021().catch(console.error);

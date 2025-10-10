const deepseekService = require('./src/services/deepseekService');

async function testDeepSeekAPI() {
    console.log('🚀 开始测试DeepSeek API...');

    try {
        // 模拟健康数据
        const testHealthData = {
            customerName: '测试客户',
            medicalExamId: 'TEST001',
            examDate: '2025-10-07',
            departments: [
                {
                    department: '内科',
                    assessmentDate: '2025-10-07',
                    doctor: '张医生',
                    assessmentData: JSON.stringify([
                        { itemName: '血压', itemResult: '120/80 mmHg' },
                        { itemName: '心率', itemResult: '72次/分' }
                    ]),
                    summary: '内科检查正常'
                }
            ]
        };

        console.log('📊 发送测试数据到DeepSeek API...');
        console.log('客户:', testHealthData.customerName);
        console.log('体检ID:', testHealthData.medicalExamId);

        const result = await deepseekService.generateHealthAssessment(testHealthData);

        if (result.success) {
            console.log('\n✅ API调用成功！');
            console.log('🤖 AI模型:', result.apiModel);
            console.log('⏱️  处理时间:', result.processingTime, '秒');
            console.log('🔢 Token消耗:', result.apiTokenCount);
            console.log('\n📋 AI回复内容:');
            console.log('━'.repeat(50));
            console.log(result.aiAnalysis);
            console.log('━'.repeat(50));
        } else {
            console.log('\n❌ API调用失败！');
            console.log('错误信息:', result.error);
        }

    } catch (error) {
        console.error('\n💥 测试过程中发生错误:', error.message);
    }
}

// 运行测试
testDeepSeekAPI();
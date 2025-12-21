// 模拟前端API调用测试
require('dotenv').config();

const axios = require('axios');

async function testApiCall() {
    const baseURL = 'http://127.0.0.1:5000/api';
    const identityCard = '220104197909258622';  // 崔春的身份证号
    const customerId = 'EA89A448-B17E-484C-B769-49EA6CEF85C4';  // 崔春的客户ID
    const selectedExamIds = ['2101240110'];  // 21年的体检ID
    
    console.log('=== 模拟前端API调用测试 ===\n');
    
    // 首先需要登录获取token
    console.log('1. 登录获取token...');
    try {
        const loginResponse = await axios.post(`${baseURL}/auth/login`, {
            username: 'admin',
            password: 'admin123'
        });
        
        if (loginResponse.data.status !== 'Success') {
            console.log('登录失败:', loginResponse.data);
            return;
        }
        
        const token = loginResponse.data.data.token;
        console.log('   登录成功，获取到token\n');
        
        // 2. 调用导入API
        console.log('2. 调用导入API...');
        console.log('   请求参数:', {
            identityCard,
            customerId,
            selectedExamIds
        });
        
        const importResponse = await axios.post(`${baseURL}/examination-import/import`, {
            identityCard,
            customerId,
            selectedExamIds
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('\n=== 导入结果 ===');
        console.log(JSON.stringify(importResponse.data, null, 2));
        
    } catch (error) {
        console.error('API调用失败:', error.response ? error.response.data : error.message);
    }
    
    process.exit(0);
}

testApiCall();

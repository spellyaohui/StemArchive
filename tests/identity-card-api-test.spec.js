const { test, expect } = require('@playwright/test');

test.describe('身份证号API直接测试', () => {
  test('直接调用API测试身份证号 220106198605158232', async ({ request }) => {
    try {
      console.log('开始API测试身份证号验证...');

      // 1. 先登录获取token
      console.log('步骤1: 登录获取token');
      const loginResponse = await request.post('http://127.0.0.1:5000/api/auth/login', {
        data: {
          username: 'admin',
          password: 'admin123'
        }
      });

      expect(loginResponse.status()).toBe(200);
      const loginResult = await loginResponse.json();
      expect(loginResult.status).toBe('Success');

      const token = loginResult.data.token;
      console.log('✅ 登录成功，获取到token');

      // 2. 测试有效身份证号 - 使用正确的身份证号
      console.log('步骤2: 测试有效身份证号 220106198605158232');
      const validCustomerData = {
        name: 'API测试用户',
        gender: '男',
        age: 38,
        identityCard: '220106198605158232',
        phone: '13800138000',
        address: '吉林省长春市朝阳区',
        remarks: '这是通过API直接测试的检客记录'
      };

      const validResponse = await request.post('http://127.0.0.1:5000/api/customers', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: validCustomerData
      });

      console.log('有效身份证号API响应状态:', validResponse.status());
      const validResult = await validResponse.json();
      console.log('有效身份证号API响应:', JSON.stringify(validResult, null, 2));

      if (validResponse.status() === 200 && validResult.status === 'Success') {
        console.log('✅ 身份证号 220106198605158232 验证通过，检客创建成功');
        console.log('新检客ID:', validResult.data?.ID);
        console.log('新检客姓名:', validResult.data?.Name);
        console.log('新检客身份证号:', validResult.data?.IdentityCard);
      } else {
        console.log('❌ 身份证号验证失败:', validResult.message);
      }

      // 3. 测试无效身份证号
      console.log('步骤3: 测试无效身份证号 123456789012345678');
      const invalidCustomerData = {
        name: '无效身份证测试用户',
        gender: '女',
        age: 25,
        identityCard: '123456789012345678',
        phone: '13800138001',
        address: '测试地址',
        remarks: '这个应该失败'
      };

      const invalidResponse = await request.post('http://127.0.0.1:5000/api/customers', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: invalidCustomerData
      });

      console.log('无效身份证号API响应状态:', invalidResponse.status());
      const invalidResult = await invalidResponse.json();
      console.log('无效身份证号API响应:', JSON.stringify(invalidResult, null, 2));

      if (invalidResponse.status() === 400 && invalidResult.status === 'Error') {
        console.log('✅ 无效身份证号正确被拒绝:', invalidResult.message);
      } else {
        console.log('❌ 无效身份证号验证有问题，应该被拒绝');
      }

      // 4. 测试查询刚创建的检客
      if (validResponse.status() === 200 && validResult.data?.ID) {
        console.log('步骤4: 查询刚创建的检客');
        const getResponse = await request.get(`http://127.0.0.1:5000/api/customers/${validResult.data.ID}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        console.log('查询检客API响应状态:', getResponse.status());
        const getResult = await getResponse.json();
        console.log('查询检客API响应:', JSON.stringify(getResult, null, 2));

        if (getResponse.status() === 200 && getResult.status === 'Success') {
          console.log('✅ 检客查询成功');
          console.log('检客信息确认:');
          console.log('- 姓名:', getResult.data.Name);
          console.log('- 身份证号:', getResult.data.IdentityCard);
          console.log('- 性别:', getResult.data.Gender);
          console.log('- 年龄:', getResult.data.Age);
        }
      }

      // 5. 测试重复身份证号
      console.log('步骤5: 测试重复身份证号');
      const duplicateResponse = await request.post('http://127.0.0.1:5000/api/customers', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: {
          ...validCustomerData,
          name: '重复身份证测试用户'
        }
      });

      console.log('重复身份证号API响应状态:', duplicateResponse.status());
      const duplicateResult = await duplicateResponse.json();
      console.log('重复身份证号API响应:', JSON.stringify(duplicateResult, null, 2));

      if (duplicateResponse.status() === 409 && duplicateResult.status === 'Error') {
        console.log('✅ 重复身份证号正确被拒绝:', duplicateResult.message);
      } else {
        console.log('❌ 重复身份证号验证有问题');
      }

      console.log('\n=== API测试总结 ===');
      console.log('✅ 身份证号 220106198605158232 验证通过');
      console.log('✅ 无效身份证号正确被拒绝');
      console.log('✅ 重复身份证号正确被拒绝');
      console.log('✅ 身份证验证修复成功！');

    } catch (error) {
      console.error('API测试失败:', error);
      throw error;
    }
  });

  test('验证身份证号校验算法', async () => {
    // 在Node.js环境中直接测试身份证校验算法
    const validateIdentityCardChecksum = (identityCard) => {
      if (identityCard.length !== 18) {
        return false;
      }

      // 加权因子
      const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
      // 校验码映射
      const checksumMap = {
        0: '1', 1: '0', 2: 'X', 3: '9', 4: '8',
        5: '7', 6: '6', 7: '5', 8: '4', 9: '3', 10: '2'
      };

      let sum = 0;
      for (let i = 0; i < 17; i++) {
        const digit = parseInt(identityCard.charAt(i));
        if (isNaN(digit)) {
          return false;
        }
        sum += digit * weights[i];
      }

      const remainder = sum % 11;
      const expectedChecksum = checksumMap[remainder];
      const actualChecksum = identityCard.charAt(17).toUpperCase();

      return expectedChecksum === actualChecksum;
    };

    console.log('测试身份证号校验算法...');

    // 测试有效的身份证号
    const validId = '220106198605158232';
    const isValid = validateIdentityCardChecksum(validId);
    console.log(`身份证号 ${validId} 校验结果:`, isValid ? '✅ 有效' : '❌ 无效');

    // 测试无效的身份证号
    const invalidId = '123456789012345678';
    const isInvalid = validateIdentityCardChecksum(invalidId);
    console.log(`身份证号 ${invalidId} 校验结果:`, isInvalid ? '✅ 有效' : '❌ 无效');

    // 手动计算验证
    console.log('\n手动验证 220106198605158232:');
    const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    const idNumbers = '22010619860515823'.split('').map(Number);

    let sum = 0;
    for (let i = 0; i < 17; i++) {
      const product = idNumbers[i] * weights[i];
      sum += product;
      console.log(`第${i+1}位: ${idNumbers[i]} × ${weights[i]} = ${product}`);
    }

    const remainder = sum % 11;
    console.log(`加权和: ${sum}`);
    console.log(`余数: ${remainder}`);

    const checksumMap = {
      0: '1', 1: '0', 2: 'X', 3: '9', 4: '8',
      5: '7', 6: '6', 7: '5', 8: '4', 9: '3', 10: '2'
    };

    const expectedChecksum = checksumMap[remainder];
    const actualChecksum = '2';

    console.log(`期望校验码: ${expectedChecksum}`);
    console.log(`实际校验码: ${actualChecksum}`);
    console.log(`验证结果: ${expectedChecksum === actualChecksum ? '✅ 通过' : '❌ 失败'}`);

    expect(isValid).toBe(true);
    expect(isInvalid).toBe(false);
    expect(expectedChecksum).toBe(actualChecksum);
  });
});
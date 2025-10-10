/**
 * 检客档案验证中间件
 * 确保所有操作前都已建立检客档案
 */

const { executeQuery, sql } = require('../../config/database');

/**
 * 验证检客档案是否存在
 * @param {string} operationType - 操作类型：'HealthAssessment', 'StemCell', 'Report'
 * @param {string} idParam - 参数名称：'customerId' 或 'identityCard'
 */
const validateCustomerExists = (operationType, idParam = 'customerId') => {
    return async (req, res, next) => {
        try {
            const identifier = req.params[idParam] || req.body[idParam];

            if (!identifier) {
                return res.status(400).json({
                    status: 'Error',
                    message: `缺少${idParam === 'customerId' ? '客户ID' : '身份证号'}参数`
                });
            }

            // 根据参数类型确定查询方式
            let customerQuery;
            let params;

            if (idParam === 'identityCard') {
                customerQuery = 'SELECT ID, Name, Status FROM Customers WHERE IdentityCard = @identityCard';
                params = [{ name: 'identityCard', value: identifier, type: sql.NVarChar }];
            } else {
                customerQuery = 'SELECT ID, Name, IdentityCard, Status FROM Customers WHERE ID = @customerId';
                params = [{ name: 'customerId', value: identifier, type: sql.UniqueIdentifier }];
            }

            const customerResult = await executeQuery(customerQuery, params);

            if (!customerResult || customerResult.length === 0) {
                return res.status(404).json({
                    status: 'Error',
                    message: '检客档案不存在，请先建立检客档案',
                    code: 'CUSTOMER_NOT_FOUND',
                    operationType
                });
            }

            const customer = customerResult[0];

            // 检查检客档案状态
            if (customer.Status === 'Inactive') {
                return res.status(403).json({
                    status: 'Error',
                    message: '检客档案已停用，无法进行此操作',
                    code: 'CUSTOMER_INACTIVE',
                    customerInfo: {
                        id: customer.ID,
                        name: customer.Name,
                        identityCard: customer.IdentityCard
                    }
                });
            }

            // 将检客信息附加到请求对象
            req.customer = customer;

            // 如果使用身份证号查询，将customer ID也添加到请求中
            if (idParam === 'identityCard') {
                req.customerId = customer.ID;
            }

            console.log(`✓ 检客档案验证通过: ${customer.Name} (${customer.IdentityCard}) - 操作类型: ${operationType}`);
            next();
        } catch (error) {
            console.error('检客档案验证失败:', error);
            res.status(500).json({
                status: 'Error',
                message: '检客档案验证失败',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    };
};

/**
 * 验证身份证号格式
 */
const validateIdentityCard = (req, res, next) => {
    const { identityCard } = req.body;

    if (!identityCard) {
        return res.status(400).json({
            status: 'Error',
            message: '身份证号不能为空'
        });
    }

    // 简化的身份证号格式验证（与前端保持一致）
    // 支持15位和18位身份证号，使用宽松的验证规则
    const identityCardRegex15 = /^\d{15}$/;
    const identityCardRegex18 = /^\d{17}[\dXx]$/;

    if (!identityCardRegex15.test(identityCard) && !identityCardRegex18.test(identityCard)) {
        return res.status(400).json({
            status: 'Error',
            message: '请输入正确的15~18位身份证号'
        });
    }

    // 不再进行复杂的校验码验证，只要格式匹配就视为合法
    next();
};

/**
 * 验证18位身份证号的校验码
 * 使用ISO 7064:1983.MOD 11-2校验算法
 */
const validateIdentityCardChecksum = (identityCard) => {
    if (identityCard.length !== 18) {
        return false;
    }

    // 加权因子
    const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    // 校验码映射
    const checksumMap = {
        0: '1',
        1: '0',
        2: 'X',
        3: '9',
        4: '8',
        5: '7',
        6: '6',
        7: '5',
        8: '4',
        9: '3',
        10: '2'
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

/**
 * 检查身份证号是否已存在
 */
const checkDuplicateIdentityCard = async (req, res, next) => {
    try {
        const { identityCard } = req.body;
        const customerId = req.params.id; // 用于更新操作时排除当前记录

        let query = 'SELECT ID, Name FROM Customers WHERE IdentityCard = @identityCard';
        let params = [{ name: 'identityCard', value: identityCard, type: sql.NVarChar }];

        // 如果是更新操作，排除当前记录
        if (customerId) {
            query += ' AND ID != @customerId';
            params.push({ name: 'customerId', value: customerId, type: sql.UniqueIdentifier });
        }

        const result = await executeQuery(query, params);

        if (result && result.length > 0) {
            return res.status(409).json({
                status: 'Error',
                message: '身份证号已存在',
                code: 'DUPLICATE_IDENTITY_CARD',
                existingCustomer: {
                    id: result[0].ID,
                    name: result[0].Name
                }
            });
        }

        next();
    } catch (error) {
        console.error('检查身份证号重复失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '检查身份证号重复失败'
        });
    }
};

/**
 * 获取检客完整档案信息
 */
const getCustomerCompleteProfile = async (req, res, next) => {
    try {
        const { customerId } = req.params;

        const query = `
            SELECT * FROM dbo.CustomerCompleteProfile
            WHERE CustomerID = @customerId
        `;

        const params = [{ name: 'customerId', value: customerId, type: sql.UniqueIdentifier }];
        const result = await executeQuery(query, params);

        if (!result || result.length === 0) {
            return res.status(404).json({
                status: 'Error',
                message: '检客档案不存在'
            });
        }

        req.customerProfile = result[0];
        next();
    } catch (error) {
        console.error('获取检客完整档案失败:', error);
        res.status(500).json({
            status: 'Error',
            message: '获取检客完整档案失败'
        });
    }
};

module.exports = {
    validateCustomerExists,
    validateIdentityCard,
    checkDuplicateIdentityCard,
    getCustomerCompleteProfile
};
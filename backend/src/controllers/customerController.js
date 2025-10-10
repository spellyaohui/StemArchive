const Customer = require('../models/Customer');
const { validationResult } = require('express-validator');

class CustomerController {
  // 创建客户
  static async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'Error',
          message: '输入验证失败',
          errors: errors.array()
        });
      }

      const customer = await Customer.create({
        ...req.body,
        createdBy: req.user?.id || 'system'
      });

      res.status(201).json({
        status: 'Success',
        message: '客户创建成功',
        data: customer
      });
    } catch (error) {
      console.error('创建客户失败:', error);
      res.status(500).json({
        status: 'Error',
        message: error.message || '创建客户失败'
      });
    }
  }

  // 获取客户列表
  static async getAll(req, res) {
    try {
      const { page = 1, limit = 20, search = '' } = req.query;
      const result = await Customer.findAll(
        parseInt(page),
        parseInt(limit),
        search
      );

      res.json({
        status: 'Success',
        message: '获取客户列表成功',
        data: result.customers,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('获取客户列表失败:', error);
      res.status(500).json({
        status: 'Error',
        message: '获取客户列表失败'
      });
    }
  }

  // 根据ID获取客户详情
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const customer = await Customer.findById(id);

      if (!customer) {
        return res.status(404).json({
          status: 'Error',
          message: '客户不存在'
        });
      }

      res.json({
        status: 'Success',
        message: '获取客户详情成功',
        data: customer
      });
    } catch (error) {
      console.error('获取客户详情失败:', error);
      res.status(500).json({
        status: 'Error',
        message: '获取客户详情失败'
      });
    }
  }

  // 根据身份证号获取客户
  static async getByIdentityCard(req, res) {
    try {
      const { identityCard } = req.params;
      const customer = await Customer.findByIdentityCard(identityCard);

      if (!customer) {
        return res.status(404).json({
          status: 'Error',
          message: '客户不存在'
        });
      }

      res.json({
        status: 'Success',
        message: '获取客户信息成功',
        data: customer
      });
    } catch (error) {
      console.error('获取客户信息失败:', error);
      res.status(500).json({
        status: 'Error',
        message: '获取客户信息失败'
      });
    }
  }

  // 获取客户完整信息（包含干细胞治疗记录）
  static async getFullInfo(req, res) {
    try {
      const { id } = req.params;
      const customer = await Customer.getCustomerFullInfo(id);

      if (!customer) {
        return res.status(404).json({
          status: 'Error',
          message: '客户不存在'
        });
      }

      // 同时获取相关记录
      const [infusionHistory, healthAssessments, medicalImages] = await Promise.all([
        Customer.getInfusionHistory(id),
        Customer.getHealthAssessments(id),
        Customer.getMedicalImages(id)
      ]);

      res.json({
        status: 'Success',
        message: '获取客户完整信息成功',
        data: {
          ...customer,
          infusionHistory,
          healthAssessments,
          medicalImages
        }
      });
    } catch (error) {
      console.error('获取客户完整信息失败:', error);
      res.status(500).json({
        status: 'Error',
        message: '获取客户完整信息失败'
      });
    }
  }

  // 更新客户信息
  static async update(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'Error',
          message: '输入验证失败',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const updatedCustomer = await Customer.update(id, req.body);

      if (!updatedCustomer) {
        return res.status(404).json({
          status: 'Error',
          message: '客户不存在'
        });
      }

      res.json({
        status: 'Success',
        message: '客户信息更新成功',
        data: updatedCustomer
      });
    } catch (error) {
      console.error('更新客户信息失败:', error);
      res.status(500).json({
        status: 'Error',
        message: '更新客户信息失败'
      });
    }
  }

  // 删除客户（软删除）
  static async delete(req, res) {
    try {
      const { id } = req.params;
      const deleted = await Customer.delete(id);

      if (!deleted) {
        return res.status(404).json({
          status: 'Error',
          message: '客户不存在'
        });
      }

      res.json({
        status: 'Success',
        message: '客户删除成功'
      });
    } catch (error) {
      console.error('删除客户失败:', error);
      res.status(500).json({
        status: 'Error',
        message: '删除客户失败'
      });
    }
  }

  // 获取客户统计信息
  static async getStatistics(req, res) {
    try {
      // 这里可以添加统计逻辑
      const stats = {
        totalCustomers: 0,
        activeCustomers: 0,
        newCustomersThisMonth: 0,
        customersWithStemCell: 0
      };

      res.json({
        status: 'Success',
        message: '获取客户统计信息成功',
        data: stats
      });
    } catch (error) {
      console.error('获取客户统计信息失败:', error);
      res.status(500).json({
        status: 'Error',
        message: '获取客户统计信息失败'
      });
    }
  }

  // 搜索客户
  static async search(req, res) {
    try {
      const { query, page = 1, limit = 10 } = req.query;

      if (!query) {
        return res.status(400).json({
          status: 'Error',
          message: '搜索关键词不能为空'
        });
      }

      const result = await Customer.findAll(
        parseInt(page),
        parseInt(limit),
        query
      );

      res.json({
        status: 'Success',
        message: '搜索客户成功',
        data: result.customers,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('搜索客户失败:', error);
      res.status(500).json({
        status: 'Error',
        message: '搜索客户失败'
      });
    }
  }

  // 获取可创建干细胞档案的客户列表（没有干细胞档案的客户）
  static async getAvailableForStemCell(req, res) {
    try {
      const { page = 1, limit = 20, search = '' } = req.query;

      // 使用SQL查询获取没有干细胞档案的客户
      const { executeQuery } = require('../../config/database');

      // 构建查询条件
      let whereClause = 'WHERE 1=1';
      let queryParams = [];

      if (search && search.trim()) {
        whereClause += ' AND (c.Name LIKE @search OR c.IdentityCard LIKE @search)';
        queryParams.push({ name: 'search', value: `%${search.trim()}%`, type: require('mssql').VarChar });
      }

      // 排除已有干细胞档案的客户
      const query = `
        SELECT DISTINCT
          c.ID,
          c.Name,
          c.IdentityCard,
          c.Gender,
          c.Age,
          c.Phone,
          c.CreatedAt
        FROM Customers c
        LEFT JOIN StemCellPatients sp ON c.ID = sp.CustomerID
        ${whereClause}
        AND sp.ID IS NULL
        ORDER BY c.CreatedAt DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `;

      // 添加分页参数
      const offset = (parseInt(page) - 1) * parseInt(limit);
      queryParams.push(
        { name: 'offset', value: offset, type: require('mssql').Int },
        { name: 'limit', value: parseInt(limit), type: require('mssql').Int }
      );

      // 执行查询
      const customers = await executeQuery(query, queryParams);

      // 获取总数
      const countQuery = `
        SELECT COUNT(DISTINCT c.ID) as total
        FROM Customers c
        LEFT JOIN StemCellPatients sp ON c.ID = sp.CustomerID
        ${whereClause}
        AND sp.ID IS NULL
      `;

      const countParams = queryParams.filter(p => p.name !== 'offset' && p.name !== 'limit');
      const countResult = await executeQuery(countQuery, countParams);
      const total = countResult[0].total;

      res.json({
        status: 'Success',
        message: '获取可用客户列表成功',
        data: customers,
        pagination: {
          currentPage: parseInt(page),
          limit: parseInt(limit),
          total: total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('获取可用客户列表失败:', error);
      res.status(500).json({
        status: 'Error',
        message: '获取可用客户列表失败'
      });
    }
  }

  // 更新客户最后体检日期
  static async updateLastHealthCheckDate(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'Error',
          message: '输入验证失败',
          errors: errors.array()
        });
      }

      const { identityCard } = req.params;
      const { checkDate } = req.body;

      // 使用存储过程更新最后体检日期
      const { executeQuery } = require('../../../config/database');
      const query = `
        EXEC sp_UpdateCustomerLastHealthCheckDate @IdentityCard, @CheckDate
      `;

      const result = await executeQuery(query, [
        { name: 'IdentityCard', value: identityCard, type: require('mssql').VarChar },
        { name: 'CheckDate', value: checkDate, type: require('mssql').Date }
      ]);

      // 存储过程返回的是更新行数
      const updatedRows = result && result[0] ? result[0] : 0;

      res.json({
        status: 'Success',
        message: '最后体检日期更新成功',
        data: {
          identityCard,
          checkDate,
          updated: updatedRows > 0
        }
      });
    } catch (error) {
      console.error('更新最后体检日期失败:', error);
      res.status(500).json({
        status: 'Error',
        message: error.message || '更新最后体检日期失败'
      });
    }
  }

  // 获取今日新增体检检客
  static async getTodayHealthChecks(req, res) {
    try {
      // 使用存储过程获取今日新增体检检客
      const customers = await Customer.getTodayHealthChecks();

      res.json({
        status: 'Success',
        message: '获取今日新增体检检客成功',
        data: customers
      });
    } catch (error) {
      console.error('获取今日新增体检检客失败:', error);
      res.status(500).json({
        status: 'Error',
        message: error.message || '获取今日新增体检检客失败'
      });
    }
  }
}

module.exports = CustomerController;
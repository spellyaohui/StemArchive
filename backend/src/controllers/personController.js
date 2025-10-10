const PersonService = require('../services/personService');
const Customer = require('../models/Customer');
const { validationResult } = require('express-validator');

class PersonController {
    // 获取人员完整档案（根据身份证号）
    static async getPersonFullProfile(req, res) {
        try {
            const { identityCard } = req.params;

            if (!identityCard) {
                return res.status(400).json({
                    status: 'Error',
                    message: '身份证号不能为空'
                });
            }

            const result = await PersonService.getPersonFullProfile(identityCard);

            if (result.success) {
                res.json({
                    status: 'Success',
                    message: result.message,
                    data: result.data
                });
            } else {
                res.status(404).json({
                    status: 'Error',
                    message: result.message
                });
            }
        } catch (error) {
            console.error('获取人员完整档案失败:', error);
            res.status(500).json({
                status: 'Error',
                message: '获取人员完整档案失败'
            });
        }
    }

    // 创建或更新人员信息
    static async createOrUpdatePerson(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    status: 'Error',
                    message: '输入验证失败',
                    errors: errors.array()
                });
            }

            const result = await PersonService.createOrUpdateCustomer(req.body);

            if (result.success) {
                const statusCode = result.action === 'created' ? 201 : 200;
                res.status(statusCode).json({
                    status: 'Success',
                    message: result.message,
                    data: result.data,
                    action: result.action
                });
            } else {
                res.status(400).json({
                    status: 'Error',
                    message: result.message
                });
            }
        } catch (error) {
            console.error('创建或更新人员失败:', error);
            res.status(500).json({
                status: 'Error',
                message: '创建或更新人员失败'
            });
        }
    }

    // 搜索人员（根据身份证号）
    static async searchPersons(req, res) {
        try {
            const { identityCard, page = 1, limit = 10 } = req.query;

            if (!identityCard) {
                return res.status(400).json({
                    status: 'Error',
                    message: '搜索关键词不能为空'
                });
            }

            const result = await PersonService.searchPersonByIdentityCard(
                identityCard,
                parseInt(page),
                parseInt(limit)
            );

            if (result.success) {
                res.json({
                    status: 'Success',
                    message: result.message,
                    data: result.data,
                    pagination: result.pagination
                });
            } else {
                res.status(500).json({
                    status: 'Error',
                    message: result.message
                });
            }
        } catch (error) {
            console.error('搜索人员失败:', error);
            res.status(500).json({
                status: 'Error',
                message: '搜索人员失败'
            });
        }
    }

    // 获取人员档案列表
    static async getPersonProfiles(req, res) {
        try {
            const { page = 1, limit = 20, search = '' } = req.query;

            const result = await PersonService.getPersonProfileList(
                parseInt(page),
                parseInt(limit),
                search
            );

            if (result.success) {
                res.json({
                    status: 'Success',
                    message: result.message,
                    data: result.data,
                    pagination: result.pagination
                });
            } else {
                res.status(500).json({
                    status: 'Error',
                    message: result.message
                });
            }
        } catch (error) {
            console.error('获取人员档案列表失败:', error);
            res.status(500).json({
                status: 'Error',
                message: '获取人员档案列表失败'
            });
        }
    }

    // 删除人员档案
    static async deletePersonProfile(req, res) {
        try {
            const { identityCard } = req.params;

            if (!identityCard) {
                return res.status(400).json({
                    status: 'Error',
                    message: '身份证号不能为空'
                });
            }

            const result = await PersonService.deletePersonProfile(identityCard);

            if (result.success) {
                res.json({
                    status: 'Success',
                    message: result.message
                });
            } else {
                res.status(404).json({
                    status: 'Error',
                    message: result.message
                });
            }
        } catch (error) {
            console.error('删除人员档案失败:', error);
            res.status(500).json({
                status: 'Error',
                message: '删除人员档案失败'
            });
        }
    }

    // 批量导入人员数据
    static async batchImportPersons(req, res) {
        try {
            const { persons } = req.body;

            if (!persons || !Array.isArray(persons) || persons.length === 0) {
                return res.status(400).json({
                    status: 'Error',
                    message: '请提供有效的导入数据'
                });
            }

            const result = await PersonService.batchImportPersons(persons);

            if (result.success) {
                res.json({
                    status: 'Success',
                    message: result.message,
                    data: result.data
                });
            } else {
                res.status(500).json({
                    status: 'Error',
                    message: result.message
                });
            }
        } catch (error) {
            console.error('批量导入人员失败:', error);
            res.status(500).json({
                status: 'Error',
                message: '批量导入人员失败'
            });
        }
    }

    // 获取人员档案统计
    static async getPersonStatistics(req, res) {
        try {
            const { dateFrom, dateTo } = req.query;

            // 这里可以实现更复杂的统计逻辑
            const statistics = {
                totalPersons: 0,
                personsWithStemCell: 0,
                personsWithHealthRecords: 0,
                totalInfusions: 0,
                totalAssessments: 0,
                recentActivity: []
            };

            res.json({
                status: 'Success',
                message: '获取人员档案统计成功',
                data: statistics
            });
        } catch (error) {
            console.error('获取人员档案统计失败:', error);
            res.status(500).json({
                status: 'Error',
                message: '获取人员档案统计失败'
            });
        }
    }

    // 验证身份证号是否存在
    static async validateIdentityCard(req, res) {
        try {
            const { identityCard } = req.body;

            if (!identityCard) {
                return res.status(400).json({
                    status: 'Error',
                    message: '身份证号不能为空'
                });
            }

            const customer = await Customer.findByIdentityCard(identityCard);

            res.json({
                status: 'Success',
                message: '身份证号验证完成',
                data: {
                    exists: !!customer,
                    customerInfo: customer ? {
                        id: customer.ID,
                        name: customer.Name,
                        gender: customer.Gender,
                        age: customer.Age
                    } : null
                }
            });
        } catch (error) {
            console.error('验证身份证号失败:', error);
            res.status(500).json({
                status: 'Error',
                message: '验证身份证号失败'
            });
        }
    }

    // 获取人员档案摘要
    static async getPersonSummary(req, res) {
        try {
            const { identityCard } = req.params;

            if (!identityCard) {
                return res.status(400).json({
                    status: 'Error',
                    message: '身份证号不能为空'
                });
            }

            const result = await PersonService.getPersonFullProfile(identityCard);

            if (result.success) {
                // 只返回摘要信息，不返回详细数据
                const summary = {
                    basicInfo: result.data.basicInfo,
                    summary: result.data.summary,
                    hasStemCellRecord: !!result.data.stemCellInfo,
                    treatmentStatus: result.data.summary.treatmentStatus
                };

                res.json({
                    status: 'Success',
                    message: '获取人员档案摘要成功',
                    data: summary
                });
            } else {
                res.status(404).json({
                    status: 'Error',
                    message: result.message
                });
            }
        } catch (error) {
            console.error('获取人员档案摘要失败:', error);
            res.status(500).json({
                status: 'Error',
                message: '获取人员档案摘要失败'
            });
        }
    }

    // 获取所有人员档案列表
    static async getAllPersons(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;

            const result = await PersonService.getAllPersons(offset, limit);

            if (result.success) {
                res.json({
                    status: 'Success',
                    message: '获取人员档案列表成功',
                    data: result.data,
                    pagination: {
                        page: page,
                        limit: limit,
                        total: result.total,
                        totalPages: Math.ceil(result.total / limit)
                    }
                });
            } else {
                res.status(404).json({
                    status: 'Error',
                    message: result.message
                });
            }
        } catch (error) {
            console.error('获取人员档案列表失败:', error);
            res.status(500).json({
                status: 'Error',
                message: '获取人员档案列表失败'
            });
        }
    }
}

module.exports = PersonController;
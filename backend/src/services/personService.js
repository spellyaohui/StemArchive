const Customer = require('../models/Customer');
const StemCellPatient = require('../models/StemCellPatient');
const HealthAssessment = require('../models/HealthAssessment');
const MedicalImage = require('../models/MedicalImage');
const InfusionSchedule = require('../models/InfusionSchedule');
const Report = require('../models/Report');
const Notification = require('../models/Notification');

class PersonService {
    // 根据身份证号获取人员完整档案
    static async getPersonFullProfile(identityCard) {
        try {
            // 1. 获取客户基本信息
            const customer = await Customer.findByIdentityCard(identityCard);
            if (!customer) {
                return {
                    success: false,
                    message: '未找到该身份证号对应的客户信息',
                    data: null
                };
            }

            // 2. 并行获取所有相关数据
            const [
                stemCellPatient,
                healthAssessments,
                medicalImages,
                infusionHistory,
                reports,
                notifications
            ] = await Promise.all([
                this.getStemCellPatientInfo(customer.ID),
                this.getHealthAssessments(customer.ID),
                this.getMedicalImages(customer.ID),
                this.getInfusionHistory(customer.ID),
                this.getReports(customer.ID),
                this.getNotifications(customer.ID)
            ]);

            // 3. 构建完整档案
            const fullProfile = {
                // 基本信息
                basicInfo: {
                    id: customer.ID,
                    identityCard: customer.IdentityCard,
                    name: customer.Name,
                    gender: customer.Gender,
                    age: customer.Age,
                    height: customer.Height,
                    weight: customer.Weight,
                    bmi: customer.BMI,
                    phone: customer.Phone,
                    contactPerson: customer.ContactPerson,
                    contactPersonPhone: customer.ContactPersonPhone,
                    address: customer.Address,
                    remarks: customer.Remarks,
                    createdAt: customer.CreatedAt,
                    updatedAt: customer.UpdatedAt
                },

                // 干细胞治疗信息
                stemCellInfo: stemCellPatient,

                // 健康评估记录
                healthRecords: {
                    assessments: healthAssessments.assessments || [],
                    pagination: healthAssessments.pagination
                },

                // 医学影像记录
                medicalRecords: {
                    images: medicalImages.images || [],
                    pagination: medicalImages.pagination
                },

                // 输注历史
                treatmentHistory: {
                    infusions: infusionHistory.infusions || [],
                    pagination: infusionHistory.pagination,
                    statistics: infusionHistory.statistics
                },

                // 报告记录
                reports: {
                    reports: reports.reports || [],
                    pagination: reports.pagination
                },

                // 通知记录
                notifications: {
                    notifications: notifications.notifications || [],
                    pagination: notifications.pagination
                },

                // 统计摘要
                summary: {
                    totalAssessments: healthAssessments.pagination?.total || 0,
                    totalImages: medicalImages.pagination?.total || 0,
                    totalInfusions: infusionHistory.statistics?.totalInfusions || 0,
                    totalReports: reports.pagination?.total || 0,
                    nextInfusionDate: infusionHistory.statistics?.nextInfusionDate || null,
                    lastAssessmentDate: this.getLastDate(healthAssessments.assessments),
                    treatmentStatus: stemCellPatient?.status || '无治疗记录'
                }
            };

            return {
                success: true,
                message: '获取人员完整档案成功',
                data: fullProfile
            };

        } catch (error) {
            console.error('获取人员完整档案失败:', error);
            return {
                success: false,
                message: '获取人员完整档案失败: ' + error.message,
                data: null
            };
        }
    }

    // 获取干细胞患者信息
    static async getStemCellPatientInfo(customerId) {
        try {
            const patient = await StemCellPatient.findByCustomerId(customerId);
            if (!patient) {
                return null;
            }

            // 获取治疗统计
            const statistics = await StemCellPatient.getTreatmentStatistics(patient.ID);

            return {
                ...patient,
                statistics,
                diseaseTypes: patient.DiseaseTypes ? JSON.parse(patient.DiseaseTypes) : []
            };
        } catch (error) {
            console.error('获取干细胞患者信息失败:', error);
            return null;
        }
    }

    // 获取健康评估记录
    static async getHealthAssessments(customerId, page = 1, limit = 20) {
        try {
            const result = await HealthAssessment.getByCustomerId(customerId, page, limit);
            return {
                assessments: result.assessments,
                pagination: result.pagination
            };
        } catch (error) {
            console.error('获取健康评估记录失败:', error);
            return { assessments: [], pagination: { total: 0 } };
        }
    }

    // 获取医学影像记录
    static async getMedicalImages(customerId, page = 1, limit = 20) {
        try {
            const result = await MedicalImage.getByCustomerId(customerId, page, limit);
            return {
                images: result.images,
                pagination: result.pagination
            };
        } catch (error) {
            console.error('获取医学影像记录失败:', error);
            return { images: [], pagination: { total: 0 } };
        }
    }

    // 获取输注历史
    static async getInfusionHistory(customerId, page = 1, limit = 20) {
        try {
            const patient = await StemCellPatient.findByCustomerId(customerId);
            if (!patient) {
                return { infusions: [], pagination: { total: 0 }, statistics: null };
            }

            const result = await InfusionSchedule.findByPatientId(patient.ID, page, limit);
            const statistics = await StemCellPatient.getTreatmentStatistics(patient.ID);

            return {
                infusions: result.schedules,
                pagination: result.pagination,
                statistics: {
                    ...statistics,
                    totalInfusions: result.pagination?.total || 0,
                    nextInfusionDate: this.getNextInfusionDate(result.schedules)
                }
            };
        } catch (error) {
            console.error('获取输注历史失败:', error);
            return { infusions: [], pagination: { total: 0 }, statistics: null };
        }
    }

    // 获取报告记录
    static async getReports(customerId, page = 1, limit = 20) {
        try {
            const result = await Report.getByCustomerId(customerId, page, limit);
            return {
                reports: result.reports,
                pagination: result.pagination
            };
        } catch (error) {
            console.error('获取报告记录失败:', error);
            return { reports: [], pagination: { total: 0 } };
        }
    }

    // 获取通知记录
    static async getNotifications(customerId, page = 1, limit = 20) {
        try {
            const result = await Notification.getByCustomerId(customerId, page, limit);
            return {
                notifications: result.notifications,
                pagination: result.pagination
            };
        } catch (error) {
            console.error('获取通知记录失败:', error);
            return { notifications: [], pagination: { total: 0 } };
        }
    }

    // 创建或更新客户信息
    static async createOrUpdateCustomer(customerData) {
        try {
            const { identityCard } = customerData;

            // 检查是否已存在
            const existingCustomer = await Customer.findByIdentityCard(identityCard);

            if (existingCustomer) {
                // 更新现有客户
                const updatedCustomer = await Customer.update(existingCustomer.ID, customerData);
                return {
                    success: true,
                    message: '客户信息更新成功',
                    data: updatedCustomer,
                    action: 'updated'
                };
            } else {
                // 创建新客户
                const newCustomer = await Customer.create(customerData);
                return {
                    success: true,
                    message: '客户创建成功',
                    data: newCustomer,
                    action: 'created'
                };
            }
        } catch (error) {
            console.error('创建或更新客户失败:', error);
            return {
                success: false,
                message: '创建或更新客户失败: ' + error.message,
                data: null
            };
        }
    }

    // 根据身份证号搜索人员
    static async searchPersonByIdentityCard(identityCard, page = 1, limit = 10) {
        try {
            // 模糊搜索身份证号
            const customers = await Customer.search({
                query: identityCard,
                page,
                limit
            });

            return {
                success: true,
                message: '搜索完成',
                data: customers.data,
                pagination: customers.pagination
            };
        } catch (error) {
            console.error('搜索人员失败:', error);
            return {
                success: false,
                message: '搜索人员失败: ' + error.message,
                data: [],
                pagination: null
            };
        }
    }

    // 获取人员完整档案列表（分页）
    static async getPersonProfileList(page = 1, limit = 20, search = '') {
        try {
            // 获取客户列表
            const customers = await Customer.findAll(page, limit, search);

            // 为每个客户获取简要统计信息
            const customersWithStats = await Promise.all(
                customers.customers.map(async (customer) => {
                    const stats = await this.getPersonQuickStats(customer.ID);
                    return {
                        ...customer,
                        stats
                    };
                })
            );

            return {
                success: true,
                message: '获取人员档案列表成功',
                data: customersWithStats,
                pagination: customers.pagination
            };
        } catch (error) {
            console.error('获取人员档案列表失败:', error);
            return {
                success: false,
                message: '获取人员档案列表失败: ' + error.message,
                data: [],
                pagination: null
            };
        }
    }

    // 获取人员快速统计信息
    static async getPersonQuickStats(customerId) {
        try {
            const [stemCellPatient, healthAssessments] = await Promise.all([
                this.getStemCellPatientInfo(customerId),
                this.getHealthAssessments(customerId, 1, 1)
            ]);

            return {
                hasStemCellRecord: !!stemCellPatient,
                totalAssessments: healthAssessments.pagination?.total || 0,
                totalInfusions: stemCellPatient?.TotalInfusionCount || 0,
                treatmentStatus: stemCellPatient?.Status || '无治疗记录'
            };
        } catch (error) {
            console.error('获取人员快速统计失败:', error);
            return {
                hasStemCellRecord: false,
                totalAssessments: 0,
                totalInfusions: 0,
                treatmentStatus: '未知'
            };
        }
    }

    // 删除人员完整档案（软删除）
    static async deletePersonProfile(identityCard) {
        try {
            const customer = await Customer.findByIdentityCard(identityCard);
            if (!customer) {
                return {
                    success: false,
                    message: '未找到该身份证号对应的客户信息'
                };
            }

            // 软删除客户信息
            const deleted = await Customer.delete(customer.ID);

            if (deleted) {
                return {
                    success: true,
                    message: '人员档案删除成功'
                };
            } else {
                return {
                    success: false,
                    message: '人员档案删除失败'
                };
            }
        } catch (error) {
            console.error('删除人员档案失败:', error);
            return {
                success: false,
                message: '删除人员档案失败: ' + error.message
            };
        }
    }

    // 辅助方法：获取最后一次评估日期
    static getLastDate(assessments) {
        if (!assessments || assessments.length === 0) {
            return null;
        }
        return assessments[0].AssessmentDate; // 假设已按日期降序排列
    }

    // 辅助方法：获取下次输注日期
    static getNextInfusionDate(infusions) {
        if (!infusions || infusions.length === 0) {
            return null;
        }

        // 查找状态为Scheduled的输注
        const scheduledInfusion = infusions.find(infusion =>
            infusion.Status === 'Scheduled' &&
            new Date(infusion.ScheduleDate) > new Date()
        );

        return scheduledInfusion ? scheduledInfusion.ScheduleDate : null;
    }

    // 批量导入人员数据
    static async batchImportPersons(personsData) {
        try {
            const results = {
                success: 0,
                failed: 0,
                errors: []
            };

            for (const personData of personsData) {
                try {
                    const result = await this.createOrUpdateCustomer(personData);
                    if (result.success) {
                        results.success++;
                    } else {
                        results.failed++;
                        results.errors.push({
                            identityCard: personData.identityCard,
                            error: result.message
                        });
                    }
                } catch (error) {
                    results.failed++;
                    results.errors.push({
                        identityCard: personData.identityCard,
                        error: error.message
                    });
                }
            }

            return {
                success: true,
                message: `批量导入完成，成功: ${results.success}，失败: ${results.failed}`,
                data: results
            };
        } catch (error) {
            console.error('批量导入失败:', error);
            return {
                success: false,
                message: '批量导入失败: ' + error.message,
                data: null
            };
        }
    }

    // 获取所有人员档案列表
    static async getAllPersons(offset = 0, limit = 10) {
        try {
            const db = require('../../config/database');

            // 获取所有客户的基本信息和干细胞治疗信息
            const query = `
                SELECT
                    c.ID,
                    c.IdentityCard,
                    c.Name,
                    c.Gender,
                    c.Age,
                    c.Height,
                    c.Weight,
                    c.BMI,
                    c.Phone,
                    c.ContactPerson,
                    c.ContactPersonPhone,
                    c.Address,
                    c.Remarks,
                    c.Status,
                    c.CreatedAt,
                    c.UpdatedAt,
                    sp.ID as StemCellPatientID,
                    sp.PatientNumber,
                    sp.PrimaryDiagnosis,
                    sp.TreatmentPlan,
                    sp.DiseaseTypes,
                    sp.RegistrationDate,
                    sp.Status as TreatmentStatus
                FROM Customers c
                LEFT JOIN StemCellPatients sp ON c.ID = sp.CustomerID
                WHERE c.Status = 'Active'
                ORDER BY c.CreatedAt DESC
                OFFSET @offset ROWS
                FETCH NEXT @limit ROWS ONLY
            `;

            // 获取总数
            const countQuery = `
                SELECT COUNT(*) as total
                FROM Customers c
                WHERE c.Status = 'Active'
            `;

            const result = await db.executeQuery(query, [
                { name: 'offset', value: offset, type: require('mssql').Int },
                { name: 'limit', value: limit, type: require('mssql').Int }
            ]);

            const countResult = await db.executeQuery(countQuery);

            // 处理数据格式
            const persons = result.map(person => ({
                id: person.ID,
                identityCard: person.IdentityCard,
                name: person.Name,
                gender: person.Gender,
                age: person.Age,
                height: person.Height,
                weight: person.Weight,
                bmi: person.BMI,
                phone: person.Phone,
                contactPerson: person.ContactPerson,
                contactPersonPhone: person.ContactPersonPhone,
                address: person.Address,
                remarks: person.Remarks,
                status: person.Status,
                createdAt: person.CreatedAt,
                updatedAt: person.UpdatedAt,
                // 干细胞治疗信息
                stemCellInfo: person.StemCellPatientID ? {
                    id: person.StemCellPatientID,
                    patientNumber: person.PatientNumber,
                    primaryDiagnosis: person.PrimaryDiagnosis,
                    treatmentPlan: person.TreatmentPlan,
                    diseaseTypes: person.DiseaseTypes ? JSON.parse(person.DiseaseTypes) : [],
                    registrationDate: person.RegistrationDate,
                    treatmentStatus: person.TreatmentStatus
                } : null,
                // 汇总信息
                summary: {
                    hasStemCellRecord: !!person.StemCellPatientID,
                    treatmentStatus: person.TreatmentStatus || '无治疗记录',
                    primaryDiagnosis: person.PrimaryDiagnosis || '无诊断信息',
                    registrationDate: person.RegistrationDate
                }
            }));

            return {
                success: true,
                message: '获取人员档案列表成功',
                data: persons,
                total: countResult[0].total
            };
        } catch (error) {
            console.error('获取人员档案列表失败:', error);
            return {
                success: false,
                message: '获取人员档案列表失败: ' + error.message,
                data: null,
                total: 0
            };
        }
    }
}

module.exports = PersonService;
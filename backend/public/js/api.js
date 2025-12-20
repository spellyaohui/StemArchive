// API配置和请求处理
// 使用动态配置
const API_CONFIG = window.API_CONFIG || window.CONFIG?.api || {
  baseURL: 'http://127.0.0.1:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
};

// API请求类
class ApiService {
  constructor() {
    this.baseURL = API_CONFIG.baseURL;
    this.timeout = API_CONFIG.timeout;
    this.headers = API_CONFIG.headers;
  }

  // 通用请求方法
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;

    // 自动添加认证头
    const token = localStorage.getItem('token');
    const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

    const config = {
      headers: { ...this.headers, ...authHeaders, ...options.headers },
      timeout: this.timeout,
      ...options
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...config,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('请求超时，请检查网络连接');
      }
      throw error;
    }
  }

  // GET请求
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;

    return this.request(url, {
      method: 'GET'
    });
  }

  // POST请求
  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // PUT请求
  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // DELETE请求
  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE'
    });
  }

  // PATCH请求
  async patch(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }
}

// 创建API服务实例
const apiService = new ApiService();

// 带认证的请求函数
async function fetchWithAuth(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('未找到认证令牌，请重新登录');
  }

  const url = `${API_CONFIG.baseURL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    },
    ...options
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

    const response = await fetch(url, {
      ...config,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('请求超时，请检查网络连接');
    }
    throw error;
  }
}

// 客户相关API
const CustomerAPI = {
  // 获取客户列表
  async getAll(params = {}) {
    return apiService.get('/customers', params);
  },

  // 根据ID获取客户
  async getById(id) {
    return apiService.get(`/customers/${id}`);
  },

  // 根据身份证号获取客户
  async getByIdentityCard(identityCard) {
    return apiService.get(`/customers/identity/${identityCard}`);
  },

  // 获取客户完整信息
  async getFullInfo(id) {
    return apiService.get(`/customers/${id}/full-info`);
  },

  // 创建客户
  async create(data) {
    return apiService.post('/customers', data);
  },

  // 更新客户
  async update(id, data) {
    return apiService.put(`/customers/${id}`, data);
  },

  // 删除客户
  async delete(id) {
    return apiService.delete(`/customers/${id}`);
  },

  // 搜索客户
  async search(params) {
    return apiService.get('/customers/search', params);
  },

  // 获取客户统计
  async getStatistics() {
    return apiService.get('/customers/statistics');
  },
  // 更新客户最后体检日期
  async updateLastHealthCheckDate(identityCard, checkDate) {
    return apiService.patch(`/customers/last-health-check/${identityCard}`, {
      checkDate: checkDate
    });
  },
  // 获取今日新增体检检客
  async getTodayHealthChecks() {
    return apiService.get('/customers/today-health-checks');
  }
};

// 干细胞治疗相关API
const StemCellAPI = {
  // 患者档案相关
  patients: {
    // 获取所有患者档案
    async getAll(params = {}) {
      return apiService.get('/stem-cell/patients', params);
    },

    // 根据客户ID获取患者档案
    async getByCustomerId(customerId) {
      return apiService.get(`/stem-cell/patients/customer/${customerId}`);
    },

    // 根据患者编号获取档案
    async getByPatientNumber(patientNumber) {
      return apiService.get(`/stem-cell/patients/number/${patientNumber}`);
    },

    // 创建患者档案
    async create(data) {
      return apiService.post('/stem-cell/patients', data);
    },

    // 更新患者档案
    async update(id, data) {
      return apiService.put(`/stem-cell/patients/${id}`, data);
    },

    // 根据病种查找患者
    async getByDiseaseType(diseaseType, params = {}) {
      return apiService.get(`/stem-cell/patients/disease/${diseaseType}`, params);
    },

    // 根据ID获取患者档案
    async getById(id) {
      return apiService.get(`/stem-cell/patients/${id}`);
    }
  },

  // 输注排期相关
  schedules: {
    // 获取输注排期列表
    async getAll(params = {}) {
      return apiService.get('/stem-cell/schedules', params);
    },

    // 获取患者输注排期
    async getByPatientId(patientId, params = {}) {
      return apiService.get(`/stem-cell/schedules/patient/${patientId}`, params);
    },

    // 创建输注排期
    async create(data) {
      return apiService.post('/stem-cell/schedules', data);
    },

    // 完成输注
    async complete(id, data) {
      return apiService.put(`/stem-cell/schedules/${id}/complete`, data);
    },

    // 重新安排排期
    async reschedule(id, data) {
      return apiService.put(`/stem-cell/schedules/${id}/reschedule`, data);
    },

    // 取消排期
    async cancel(id, data) {
      return apiService.put(`/stem-cell/schedules/${id}/cancel`, data);
    },

    // 获取今日排期
    async getToday() {
      return apiService.get('/stem-cell/schedules/today');
    },

    // 获取即将到来的排期
    async getUpcoming(params = {}) {
      return apiService.get('/stem-cell/schedules/upcoming', params);
    }
  },

  // 统计相关
  statistics: {
    // 获取治疗统计
    async getTreatmentStats(params = {}) {
      return apiService.get('/stem-cell/statistics', params);
    }
  }
};

// 健康评估相关API
const HealthAssessmentAPI = {
  // 获取健康评估列表
  async getAll(params = {}) {
    return apiService.get('/health-assessments', params);
  },

  // 根据客户ID获取健康评估
  async getByCustomerId(customerId, params = {}) {
    return apiService.get(`/health-assessments/customer/${customerId}`, params);
  },

  // 创建健康评估
  async create(data) {
    return apiService.post('/health-assessments', data);
  },

  // 更新健康评估
  async update(id, data) {
    return apiService.put(`/health-assessments/${id}`, data);
  },

  // 删除健康评估
  async delete(id) {
    return apiService.delete(`/health-assessments/${id}`);
  }
};

// 常规科室相关API
const GeneralDepartmentAPI = {
  // 调用常规科室查询接口
  async queryGeneralDepartment(studyId, ksbm) {
    const response = await fetch(`${window.EXAMINATION_API_CONFIG.baseURL}/query_cgks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...window.EXAMINATION_API_CONFIG.headers
      },
      body: JSON.stringify({
        studyId: studyId,
        ksbm: ksbm
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  // 保存常规科室数据到后端
  async saveGeneralDepartmentData(data) {
    return fetchWithAuth('/health-assessments', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // 检查体检ID是否已存在
  async checkExamIdExists(examId, departmentType) {
    return apiService.get(`/health-assessments/check-exam-id/${examId}?departmentType=${departmentType}`);
  }
};

// 影像科室相关API
const ImagingDepartmentAPI = {
  // 调用影像科室查询接口
  async queryImagingDepartment(studyId, ksbm) {
    const response = await fetch(`${window.EXAMINATION_API_CONFIG.baseURL}/query_yxk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...window.EXAMINATION_API_CONFIG.headers
      },
      body: JSON.stringify({
        studyId: studyId,
        ksbm: ksbm
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  // 保存影像科室数据到后端
  async saveImagingDepartmentData(data) {
    return fetchWithAuth('/health-assessments', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // 检查体检ID是否已存在
  async checkExamIdExists(examId, departmentType) {
    return apiService.get(`/health-assessments/check-exam-id/${examId}?departmentType=${departmentType}`);
  }
};

// 仪器室相关API
const InstrumentRoomAPI = {
  // 调用仪器室查询接口
  async queryInstrumentRoom(studyId, ksbm) {
    const response = await fetch(`${window.EXAMINATION_API_CONFIG.baseURL}/query_instrument`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...window.EXAMINATION_API_CONFIG.headers
      },
      body: JSON.stringify({
        studyId: studyId,
        ksbm: ksbm
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  // 保存仪器室数据到后端
  async saveInstrumentRoomData(data) {
    return fetchWithAuth('/health-assessments', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // 检查体检ID是否已存在
  async checkExamIdExists(examId, departmentType) {
    return apiService.get(`/health-assessments/check-exam-id/${examId}?departmentType=${departmentType}`);
  }
};

// 医学影像相关API
const MedicalImageAPI = {
  // 获取医学影像列表
  async getAll(params = {}) {
    return apiService.get('/medical-images', params);
  },

  // 根据客户ID获取医学影像
  async getByCustomerId(customerId, params = {}) {
    return apiService.get(`/medical-images/customer/${customerId}`, params);
  },

  // 上传医学影像
  async upload(data) {
    return apiService.post('/medical-images/upload', data);
  },

  // 删除医学影像
  async delete(id) {
    return apiService.delete(`/medical-images/${id}`);
  }
};

// 科室相关API
const DepartmentAPI = {
  // 获取所有科室
  async getAll() {
    return apiService.get('/departments');
  },

  // 创建科室
  async create(data) {
    return apiService.post('/departments', data);
  },

  // 更新科室
  async update(id, data) {
    return apiService.put(`/departments/${id}`, data);
  },

  // 删除科室
  async delete(id) {
    return apiService.delete(`/departments/${id}`);
  }
};

// 报告相关API
const ReportAPI = {
  // 获取报告列表
  async getAll(params = {}) {
    return apiService.get('/reports', params);
  },

  // 根据客户ID获取报告
  async getByCustomerId(customerId, params = {}) {
    return apiService.get(`/reports/customer/${customerId}`, params);
  },

  // 生成报告
  async generate(data) {
    return apiService.post('/reports/generate', data);
  },

  // 下载报告
  async download(id) {
    return apiService.get(`/reports/${id}/download`);
  }
};

// 通知相关API
const NotificationAPI = {
  // 获取通知列表
  async getAll(params = {}) {
    return apiService.get('/notifications', params);
  },

  // 发送通知
  async send(data) {
    return apiService.post('/notifications/send', data);
  },

  // 标记为已读
  async markAsRead(id) {
    return apiService.put(`/notifications/${id}/read`);
  }
};

// 统计相关API
const StatisticsAPI = {
  // 获取仪表板统计
  async getDashboardStats() {
    return apiService.get('/statistics/dashboard');
  },

  // 获取月度统计
  async getMonthlyStats(params = {}) {
    return apiService.get('/statistics/monthly', params);
  },

  // 获取治疗类型统计
  async getTreatmentTypeStats(params = {}) {
    return apiService.get('/statistics/treatment-types', params);
  },

  // 获取病种统计
  async getDiseaseStats(params = {}) {
    return apiService.get('/statistics/diseases', params);
  }
};

// 人员管理相关API（基于身份证号的统一接口）
const PersonAPI = {
  // 获取人员完整档案（根据身份证号）
  async getFullProfile(identityCard) {
    return apiService.get(`/persons/profile/${identityCard}`);
  },

  // 获取人员档案摘要
  async getSummary(identityCard) {
    return apiService.get(`/persons/summary/${identityCard}`);
  },

  // 创建或更新人员信息
  async createOrUpdate(personData) {
    return apiService.post('/persons/profile', personData);
  },

  // 搜索人员（根据身份证号）
  async search(params) {
    return apiService.get('/persons/search', params);
  },

  // 获取人员档案列表
  async getList(params = {}) {
    return apiService.get('/persons', params);
  },

  // 删除人员档案
  async deleteProfile(identityCard) {
    return apiService.delete(`/persons/profile/${identityCard}`);
  },

  // 批量导入人员数据
  async batchImport(personsData) {
    return apiService.post('/persons/batch-import', { persons: personsData });
  },

  // 获取人员档案统计
  async getStatistics(params = {}) {
    return apiService.get('/persons/statistics', params);
  },

  // 验证身份证号是否存在
  async validateIdentityCard(identityCard) {
    return apiService.post('/persons/validate-identity', { identityCard });
  },

  // 获取健康记录
  async getHealthRecords(identityCard, params = {}) {
    return apiService.get(`/persons/health-records/${identityCard}`, params);
  },

  // 获取治疗记录
  async getTreatmentRecords(identityCard, params = {}) {
    return apiService.get(`/persons/treatment-records/${identityCard}`, params);
  },

  // 获取报告记录
  async getReports(identityCard, params = {}) {
    return apiService.get(`/persons/reports/${identityCard}`, params);
  }
};

// 文件上传相关API
const UploadAPI = {
  // 上传文件
  async uploadFile(file, type = 'general') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    return fetch(`${API_CONFIG.baseURL}/upload`, {
      method: 'POST',
      body: formData,
      timeout: 30000
    }).then(response => {
      if (!response.ok) {
        throw new Error(`上传失败: ${response.statusText}`);
      }
      return response.json();
    });
  }
};

// 治疗效果评估API
const TreatmentEffectivenessAPI = {
  // 获取治疗效果评估列表
  async getAll(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `/treatment-effectiveness?${queryString}` : '/treatment-effectiveness';
    return await apiService.get(url);
  },

  // 获取单个治疗效果评估详情
  async getById(id) {
    return await apiService.get(`/treatment-effectiveness/${id}`);
  },

  // 创建治疗效果评估
  async create(data) {
    return await apiService.post('/treatment-effectiveness', data);
  },

  // 更新治疗效果评估
  async update(id, data) {
    return await apiService.put(`/treatment-effectiveness/${id}`, data);
  },

  // 删除治疗效果评估
  async delete(id) {
    return await apiService.delete(`/treatment-effectiveness/${id}`);
  },

  // 获取治疗效果统计数据
  async getStatistics(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `/treatment-effectiveness/statistics/summary?${queryString}` : '/treatment-effectiveness/statistics/summary';
    return await apiService.get(url);
  }
};

// 导出API服务
window.API = {
  customer: CustomerAPI,
  stemCell: StemCellAPI,
  healthAssessment: HealthAssessmentAPI,
  generalDepartment: GeneralDepartmentAPI,
  imagingDepartment: ImagingDepartmentAPI,
  instrumentRoom: InstrumentRoomAPI,
  medicalImage: MedicalImageAPI,
  department: DepartmentAPI,
  report: ReportAPI,
  notification: NotificationAPI,
  statistics: StatisticsAPI,
  person: PersonAPI,
  upload: UploadAPI,
  treatmentEffectiveness: TreatmentEffectivenessAPI,
  service: apiService
};

// 为了向后兼容，同时导出小写的api对象
window.api = apiService;

// 导出fetchWithAuth函数到全局作用域
window.fetchWithAuth = fetchWithAuth;

// 错误处理
window.addEventListener('unhandledrejection', (event) => {
  console.error('未处理的Promise拒绝:', event.reason);
  NotificationHelper.error('系统错误', '发生未知错误，请刷新页面重试');
});

// 网络状态监听
window.addEventListener('online', () => {
  NotificationHelper.success('网络连接已恢复', '系统已重新连接到服务器');
});

window.addEventListener('offline', () => {
  NotificationHelper.warning('网络连接已断开', '请检查网络连接，系统将自动重连');
});
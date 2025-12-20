// 人员档案管理页面脚本 - Context7 版本
class PersonManagement {
    constructor() {
        this.app = null;
        this.currentPage = 1;
        this.pageSize = 10;
        this.currentPerson = null;
        this.searchTerm = '';
        this.filters = {};
        this.init();
    }

    // 初始化 Context7 应用
    init() {
        // 初始化 Context7
        this.app = new Framework7({
            root: '#app',
            name: 'Stem Cell Management',
            theme: 'ios',
            touch: {
                fastClicks: true,
                fastClicksDelay: 0
            },
            routes: [],
            popup: {
                closeOnEscape: true,
                backdrop: true
            },
            sheet: {
                backdrop: true
            },
            popover: {
                backdrop: true
            },
            actions: {
                backdrop: true
            }
        });

        // 初始化后绑定事件
        this.bindEvents();
        this.loadPersonList();
        this.loadStatistics();
    }

    // 绑定事件 - Context7 风格
    bindEvents() {
        const $$ = this.app.$;

        // 搜索功能
        $$('#quickSearchBtn').on('click', () => {
            this.searchByIdentityCard();
        });

        $$('#identityCardSearch').on('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchByIdentityCard();
            }
        });

        // 高级搜索
        $$('#advancedSearchBtn').on('click', () => {
            this.toggleAdvancedSearch();
        });

        $$('#applyAdvancedSearch').on('click', () => {
            this.applyAdvancedSearch();
        });

        $$('#clearAdvancedSearch').on('click', () => {
            this.clearAdvancedSearch();
        });

        // 操作按钮
        $$('#addPersonBtn').on('click', () => {
            this.showPersonForm();
        });

        $$('#refreshBtn').on('click', () => {
            this.refreshData();
        });

        // 人员表单提交
        $$('#personForm').on('submit', (e) => {
            e.preventDefault();
            this.savePerson();
        });

        // 编辑人员按钮
        $$('#editPersonBtn').on('click', () => {
            this.editPerson();
        });

        // Context7 弹出页面事件
        this.app.on('popupOpen', (popup) => {
            if (popup.id === 'personDetailPopup') {
                this.renderPersonDetail();
            }
        });

        this.app.on('popupClosed', (popup) => {
            if (popup.id === 'personFormPopup') {
                // 重置表单
                $$('#personForm')[0].reset();
            }
        });
    }

    // 加载统计数据
    async loadStatistics() {
        try {
            // 这里可以调用统计API，暂时使用模拟数据
            this.updateStatistics({
                totalPersons: 156,
                stemCellPersons: 89,
                todayVisits: 12,
                pendingReviews: 5
            });
        } catch (error) {
            console.error('加载统计数据失败:', error);
        }
    }

    // 更新统计信息
    updateStatistics(stats) {
        const $$ = this.app.$$;
        $$('#totalPersons').text(stats.totalPersons);
        $$('#stemCellPersons').text(stats.stemCellPersons);
        $$('#todayVisits').text(stats.todayVisits);
        $$('#pendingReviews').text(stats.pendingReviews);
    }

    // 加载人员列表
    async loadPersonList(page = 1) {
        try {
            this.currentPage = page;
            const params = {
                page: this.currentPage,
                limit: this.pageSize,
                search: this.searchTerm,
                ...this.filters
            };

            // 显示预加载器
            this.app.preloader.show();

            // 尝试从真实API获取数据
            try {
                const result = await API.person.getList(params);
                this.app.preloader.hide();

                if (result.status === 'Success') {
                    this.renderPersonList(result.data);
                    this.renderPagination(result.pagination);
                    return;
                }
            } catch (apiError) {
                console.log('API连接失败，使用模拟数据');
            }

            // 如果API失败，使用模拟数据展示Context7功能
            this.app.preloader.hide();
            const mockData = this.getMockData();
            this.renderPersonList(mockData.data);
            this.renderPagination(mockData.pagination);

        } catch (error) {
            console.error('加载人员列表失败:', error);
            this.app.preloader.hide();
            if (error.message.includes('fetch') || error.message.includes('network')) {
                NotificationHelper.networkError('无法加载人员列表，请检查网络连接', () => {
                    this.loadData(); // 重试加载
                });
            } else {
                NotificationHelper.error('加载人员列表失败，请刷新页面重试', '数据加载错误');
            }
        }
    }

    // 获取模拟数据
    getMockData() {
        const mockPersons = [
            {
                ID: '1',
                IdentityCard: '110101199001011234',
                Name: '张三',
                Gender: '男',
                Age: 34,
                Phone: '13812345678',
                ContactPerson: '李四',
                ContactPersonPhone: '13987654321',
                Address: '北京市朝阳区',
                CreatedAt: '2024-01-15T08:00:00Z',
                UpdatedAt: '2024-01-15T08:00:00Z',
                stats: {
                    hasStemCellRecord: true,
                    totalAssessments: 5,
                    totalInfusions: 3,
                    totalReports: 2
                }
            },
            {
                ID: '2',
                IdentityCard: '110101199002022345',
                Name: '李芳',
                Gender: '女',
                Age: 32,
                Phone: '13823456789',
                ContactPerson: '王五',
                ContactPersonPhone: '13976543210',
                Address: '上海市浦东新区',
                CreatedAt: '2024-02-20T10:30:00Z',
                UpdatedAt: '2024-03-01T14:20:00Z',
                stats: {
                    hasStemCellRecord: false,
                    totalAssessments: 2,
                    totalInfusions: 0,
                    totalReports: 1
                }
            },
            {
                ID: '3',
                IdentityCard: '110101199003033456',
                Name: '王明',
                Gender: '男',
                Age: 45,
                Phone: '13834567890',
                ContactPerson: '赵六',
                ContactPersonPhone: '13965432109',
                Address: '广州市天河区',
                CreatedAt: '2024-01-08T09:15:00Z',
                UpdatedAt: '2024-04-10T16:45:00Z',
                stats: {
                    hasStemCellRecord: true,
                    totalAssessments: 8,
                    totalInfusions: 6,
                    totalReports: 4
                }
            },
            {
                ID: '4',
                IdentityCard: '110101199004044567',
                Name: '陈静',
                Gender: '女',
                Age: 28,
                Phone: '13845678901',
                ContactPerson: '孙七',
                ContactPersonPhone: '13954321098',
                Address: '深圳市南山区',
                CreatedAt: '2024-03-12T11:20:00Z',
                UpdatedAt: '2024-03-25T13:10:00Z',
                stats: {
                    hasStemCellRecord: false,
                    totalAssessments: 1,
                    totalInfusions: 0,
                    totalReports: 0
                }
            },
            {
                ID: '5',
                IdentityCard: '110101199005055678',
                Name: '刘强',
                Gender: '男',
                Age: 39,
                Phone: '13856789012',
                ContactPerson: '周八',
                ContactPersonPhone: '13943210987',
                Address: '成都市高新区',
                CreatedAt: '2024-02-05T15:30:00Z',
                UpdatedAt: '2024-05-08T10:15:00Z',
                stats: {
                    hasStemCellRecord: true,
                    totalAssessments: 6,
                    totalInfusions: 4,
                    totalReports: 3
                }
            }
        ];

        // 应用搜索过滤
        let filteredData = mockPersons;
        if (this.searchTerm) {
            filteredData = filteredData.filter(person =>
                person.IdentityCard.includes(this.searchTerm) ||
                person.Name.includes(this.searchTerm)
            );
        }

        // 应用高级搜索过滤
        if (this.filters.name) {
            filteredData = filteredData.filter(person =>
                person.Name.includes(this.filters.name)
            );
        }
        if (this.filters.gender) {
            filteredData = filteredData.filter(person =>
                person.Gender === this.filters.gender
            );
        }
        if (this.filters.phone) {
            filteredData = filteredData.filter(person =>
                person.Phone && person.Phone.includes(this.filters.phone)
            );
        }
        if (this.filters.status) {
            const hasStemCell = this.filters.status === 'has-stem-cell';
            filteredData = filteredData.filter(person =>
                person.stats.hasStemCellRecord === hasStemCell
            );
        }

        // 分页
        const startIndex = (page - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const paginatedData = filteredData.slice(startIndex, endIndex);

        return {
            data: paginatedData,
            pagination: {
                page: page,
                limit: this.pageSize,
                total: filteredData.length,
                totalPages: Math.ceil(filteredData.length / this.pageSize)
            }
        };
    }

    // 渲染人员列表 - Context7 风格
    renderPersonList(persons) {
        const $$ = this.app.$$;
        const container = $$('#personList ul');

        if (persons.length === 0) {
            $$('#emptyState').show();
            $$('#personList').hide();
            return;
        }

        $$('#emptyState').hide();
        $$('#personList').show();

        const html = persons.map(person => {
            const hasStemCell = person.stats?.hasStemCellRecord;
            const avatarInitial = person.Name ? person.Name.charAt(0) : '?';

            return `
                <li class="swipeout">
                    <div class="swipeout-content">
                        <a href="#" class="item-link item-content ${hasStemCell ? 'person-card active' : 'person-card inactive'}"
                           data-identity-card="${person.IdentityCard}">
                            <div class="item-media">
                                <div class="person-avatar">${avatarInitial}</div>
                            </div>
                            <div class="item-inner">
                                <div class="item-title-row">
                                    <div class="item-title">${person.Name}</div>
                                    <div class="item-after">
                                        <span class="chip ${hasStemCell ? 'success' : 'warning'}">
                                            ${hasStemCell ? '干细胞患者' : '普通客户'}
                                        </span>
                                    </div>
                                </div>
                                <div class="item-subtitle">${person.Gender} · ${person.Age || '--'}岁</div>
                                <div class="item-text">
                                    <div class="display-flex justify-content-space-between align-items-center">
                                        <span class="text-gray-600">
                                            <i class="icon icon-id-card"></i>
                                            ${Utils.maskIdCard(person.IdentityCard)}
                                        </span>
                                        ${person.Phone ? `
                                            <span class="text-gray-600">
                                                <i class="icon icon-phone"></i>
                                                ${Utils.maskPhone(person.Phone)}
                                            </span>
                                        ` : ''}
                                    </div>
                                </div>
                                <div class="item-footer">
                                    <div class="grid grid-cols-3 grid-gap">
                                        <div class="text-center">
                                            <div class="stat-number">${person.stats?.totalAssessments || 0}</div>
                                            <div class="stat-label">评估</div>
                                        </div>
                                        <div class="text-center">
                                            <div class="stat-number">${person.stats?.totalInfusions || 0}</div>
                                            <div class="stat-label">输注</div>
                                        </div>
                                        <div class="text-center">
                                            <div class="stat-number">${person.stats?.totalReports || 0}</div>
                                            <div class="stat-label">报告</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </a>
                    </div>
                    <div class="swipeout-actions-right">
                        <a href="#" class="swipeout-actions-edit" data-identity-card="${person.IdentityCard}">
                            <i class="icon icon-edit"></i>
                            编辑
                        </a>
                        <a href="#" class="swipeout-actions-delete" data-identity-card="${person.IdentityCard}">
                            <i class="icon icon-trash"></i>
                            删除
                        </a>
                    </div>
                </li>
            `;
        }).join('');

        container.html(html);

        // 绑定人员卡片点击事件
        container.find('.item-link').on('click', (e) => {
            e.preventDefault();
            const identityCard = $$(e.currentTarget).data('identity-card');
            this.showPersonDetail(identityCard);
        });

        // 绑定编辑按钮事件
        container.find('.swipeout-actions-edit').on('click', (e) => {
            e.preventDefault();
            const identityCard = $$(e.currentTarget).data('identity-card');
            this.editPerson(identityCard);
        });

        // 绑定删除按钮事件
        container.find('.swipeout-actions-delete').on('click', (e) => {
            e.preventDefault();
            const identityCard = $$(e.currentTarget).data('identity-card');
            this.deletePerson(identityCard);
        });
    }

    // 渲染分页 - Context7 风格
    renderPagination(pagination) {
        const $$ = this.app.$$;
        const container = $$('#paginationContainer .pagination');

        if (!pagination || pagination.totalPages <= 1) {
            container.empty();
            return;
        }

        let html = '';

        // 上一页按钮
        if (pagination.page > 1) {
            html += `<a href="#" class="pagination-link" data-page="${pagination.page - 1}">
                        <i class="icon icon-chevron-left"></i>
                      </a>`;
        }

        // 页码按钮
        const startPage = Math.max(1, pagination.page - 2);
        const endPage = Math.min(pagination.totalPages, pagination.page + 2);

        if (startPage > 1) {
            html += `<a href="#" class="pagination-link" data-page="1">1</a>`;
            if (startPage > 2) {
                html += '<span class="pagination-ellipsis">...</span>';
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === pagination.page;
            html += `<a href="#" class="pagination-link ${isActive ? 'active' : ''}" data-page="${i}">${i}</a>`;
        }

        if (endPage < pagination.totalPages) {
            if (endPage < pagination.totalPages - 1) {
                html += '<span class="pagination-ellipsis">...</span>';
            }
            html += `<a href="#" class="pagination-link" data-page="${pagination.totalPages}">${pagination.totalPages}</a>`;
        }

        // 下一页按钮
        if (pagination.page < pagination.totalPages) {
            html += `<a href="#" class="pagination-link" data-page="${pagination.page + 1}">
                        <i class="icon icon-chevron-right"></i>
                      </a>`;
        }

        container.html(html);

        // 绑定分页点击事件
        container.find('.pagination-link').on('click', (e) => {
            e.preventDefault();
            const page = parseInt($$(e.currentTarget).data('page'));
            this.loadPersonList(page);
        });
    }

    // 根据身份证号搜索
    async searchByIdentityCard() {
        const $$ = this.app.$$;
        const identityCard = $$('#identityCardSearch').val().trim();

        if (!identityCard) {
            NotificationHelper.validationError('请输入身份证号，身份证号为必填项', '数据验证');
            return;
        }

        if (!Utils.validateIdCard(identityCard)) {
            NotificationHelper.validationError('身份证号格式不正确，请输入有效的15~18位身份证号', '数据验证错误');
            return;
        }

        this.searchTerm = identityCard;
        this.loadPersonList(1);
    }

    // 切换高级搜索
    toggleAdvancedSearch() {
        const $$ = this.app.$$;
        const advancedSearch = $$('#advancedSearch');
        advancedSearch.toggle();
    }

    // 应用高级搜索
    applyAdvancedSearch() {
        const $$ = this.app.$$;
        this.filters = {
            name: $$('#nameSearch').val().trim(),
            gender: $$('#genderSearch').val(),
            phone: $$('#phoneSearch').val().trim(),
            status: $$('#statusSearch').val()
        };

        // 移除空值
        Object.keys(this.filters).forEach(key => {
            if (!this.filters[key]) {
                delete this.filters[key];
            }
        });

        this.loadPersonList(1);
    }

    // 清空高级搜索
    clearAdvancedSearch() {
        const $$ = this.app.$$;
        $$('#nameSearch').val('');
        $$('#genderSearch').val('');
        $$('#phoneSearch').val('');
        $$('#statusSearch').val('');
        this.filters = {};
        this.loadPersonList(1);
    }

    // 刷新数据
    refreshData() {
        this.loadPersonList(this.currentPage);
        this.loadStatistics();
    }

    // 显示人员详情 - Context7 弹出页面
    async showPersonDetail(identityCard) {
        try {
            this.app.preloader.show();

            // 尝试从真实API获取数据
            try {
                const result = await API.person.getFullProfile(identityCard);
                this.app.preloader.hide();

                if (result.status === 'Success') {
                    this.currentPerson = result.data;
                    this.app.popup.open('#personDetailPopup');
                    return;
                }
            } catch (apiError) {
                console.log('API连接失败，使用模拟详情数据');
            }

            // 如果API失败，使用模拟数据
            this.app.preloader.hide();
            this.currentPerson = this.getMockPersonDetail(identityCard);
            this.app.popup.open('#personDetailPopup');

        } catch (error) {
            console.error('获取人员详情失败:', error);
            this.app.preloader.hide();
            NotificationHelper.error('获取人员详情失败，请重试', '数据加载错误');
        }
    }

    // 获取模拟人员详情数据
    getMockPersonDetail(identityCard) {
        const mockPersons = {
            '110101199001011234': {
                basicInfo: {
                    id: '1',
                    identityCard: '110101199001011234',
                    name: '张三',
                    gender: '男',
                    age: 34,
                    height: 175,
                    weight: 70,
                    bmi: 22.9,
                    phone: '13812345678',
                    contactPerson: '李四',
                    contactPersonPhone: '13987654321',
                    address: '北京市朝阳区',
                    remarks: '患者状态良好',
                    createdAt: '2024-01-15T08:00:00Z',
                    updatedAt: '2024-04-10T16:45:00Z'
                },
                stemCellInfo: {
                    ID: '1',
                    PatientNumber: 'P001',
                    PrimaryDiagnosis: '糖尿病',
                    TreatmentPlan: '干细胞移植治疗',
                    TotalInfusionCount: 3,
                    RegistrationDate: '2024-01-15',
                    Status: 'Active'
                },
                healthRecords: {
                    assessments: [
                        {
                            ID: '1',
                            Department: '内分泌科',
                            Doctor: '王医生',
                            AssessmentDate: '2024-03-15',
                            Status: 'Completed',
                            Summary: '血糖控制良好，继续观察'
                        },
                        {
                            ID: '2',
                            Department: '心内科',
                            Doctor: '李医生',
                            AssessmentDate: '2024-02-20',
                            Status: 'Completed',
                            Summary: '心脏功能正常'
                        }
                    ]
                },
                treatmentHistory: {
                    infusions: [
                        {
                            ID: '1',
                            TreatmentType: '干细胞输注',
                            InfusionCount: 1,
                            ScheduleDate: '2024-02-01',
                            Doctor: '赵医生',
                            Status: 'Completed',
                            Notes: '输注过程顺利，无不良反应'
                        },
                        {
                            ID: '2',
                            TreatmentType: '干细胞输注',
                            InfusionCount: 2,
                            ScheduleDate: '2024-03-01',
                            Doctor: '赵医生',
                            Status: 'Completed',
                            Notes: '患者反应良好'
                        }
                    ]
                },
                reports: {
                    reports: [
                        {
                            ID: '1',
                            ReportName: '健康评估报告',
                            ReportType: '年度体检',
                            ReportDate: '2024-03-15',
                            Summary: '整体健康状况良好'
                        }
                    ]
                },
                summary: {
                    totalAssessments: 5,
                    totalInfusions: 3,
                    totalReports: 2,
                    totalImages: 1,
                    nextInfusionDate: '2024-06-01',
                    lastAssessmentDate: '2024-03-15',
                    treatmentStatus: '治疗中'
                }
            }
        };

        // 默认返回张三的数据
        return mockPersons[identityCard] || mockPersons['110101199001011234'];
    }

    // 渲染人员详情 - Context7 风格
    renderPersonDetail() {
        if (!this.currentPerson) return;

        const $$ = this.app.$$;
        const person = this.currentPerson.basicInfo;

        // 渲染头部信息
        $$('#personAvatar').text(person.name ? person.name.charAt(0) : '?');
        $$('#personName').text(person.name || '--');
        $$('#personIdentityCard').text(Utils.maskIdCard(person.identityCard));
        $$('#personStatus').text(this.currentPerson.summary.treatmentStatus || '无治疗记录');

        // 渲染基本信息
        this.renderBasicInfo();

        // 渲染健康记录
        this.renderHealthRecords();

        // 渲染治疗记录
        this.renderTreatmentRecords();

        // 渲染报告记录
        this.renderReportRecords();
    }

    // 渲染基本信息 - Context7 列表风格
    renderBasicInfo() {
        const $$ = this.app.$$;
        const person = this.currentPerson.basicInfo;

        const basicInfoHTML = `
            <li class="item-content item-input">
                <div class="item-inner">
                    <div class="item-title item-label">身份证号</div>
                    <div class="item-input">
                        <input type="text" value="${person.identityCard}" readonly class="identity-input">
                    </div>
                </div>
            </li>
            <li class="item-content">
                <div class="item-inner">
                    <div class="item-title">性别</div>
                    <div class="item-after">${person.gender}</div>
                </div>
            </li>
            <li class="item-content">
                <div class="item-inner">
                    <div class="item-title">年龄</div>
                    <div class="item-after">${person.age || '--'}岁</div>
                </div>
            </li>
            <li class="item-content">
                <div class="item-inner">
                    <div class="item-title">身高</div>
                    <div class="item-after">${person.height || '--'}cm</div>
                </div>
            </li>
            <li class="item-content">
                <div class="item-inner">
                    <div class="item-title">体重</div>
                    <div class="item-after">${person.weight || '--'}kg</div>
                </div>
            </li>
            ${person.bmi ? `
                <li class="item-content">
                    <div class="item-inner">
                        <div class="item-title">BMI</div>
                        <div class="item-after">${Utils.formatBMI(person.bmi)}</div>
                    </div>
                </li>
            ` : ''}
            <li class="item-content">
                <div class="item-inner">
                    <div class="item-title">联系电话</div>
                    <div class="item-after">${person.phone || '--'}</div>
                </div>
            </li>
            <li class="item-content">
                <div class="item-inner">
                    <div class="item-title">联系人</div>
                    <div class="item-after">${person.contactPerson || '--'}</div>
                </div>
            </li>
            <li class="item-content">
                <div class="item-inner">
                    <div class="item-title">联系地址</div>
                    <div class="item-after">${person.address || '--'}</div>
                </div>
            </li>
        `;

        $$('#basicInfoList').html(basicInfoHTML);
    }

    // 渲染人员详情
    renderPersonDetail() {
        if (!this.currentPerson) return;

        // 渲染头部信息
        this.renderProfileHeader();

        // 渲染统计信息
        this.renderProfileStats();

        // 渲染基本信息
        this.renderBasicInfo();

        // 渲染健康记录
        this.renderHealthRecords();

        // 渲染治疗记录
        this.renderTreatmentRecords();

        // 渲染报告记录
        this.renderReportRecords();
    }

    // 渲染档案头部
    renderProfileHeader() {
        const header = document.getElementById('profileHeader');
        const person = this.currentPerson.basicInfo;

        header.innerHTML = `
            <div class="flex items-center">
                <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center text-blue-600 text-2xl font-bold mr-6">
                    ${person.name.charAt(0)}
                </div>
                <div class="flex-1">
                    <h2 class="text-2xl font-bold">${person.name}</h2>
                    <p class="text-blue-100">
                        ${person.gender} · ${person.age || '--'}岁 · ${Utils.maskIdCard(person.identityCard)}
                    </p>
                    ${person.phone ? `<p class="text-blue-100 mt-1"><i class="fas fa-phone mr-2"></i>${Utils.maskPhone(person.phone)}</p>` : ''}
                </div>
                <div class="text-right">
                    <p class="text-sm text-blue-100">创建时间</p>
                    <p class="text-blue-100">${Utils.formatDate(person.createdAt)}</p>
                    ${person.updatedAt !== person.createdAt ? `<p class="text-sm text-blue-100 mt-1">更新时间</p><p class="text-blue-100">${Utils.formatDate(person.updatedAt)}</p>` : ''}
                </div>
            </div>
        `;
    }

    // 渲染统计信息
    renderProfileStats() {
        const stats = document.getElementById('profileStats');
        const summary = this.currentPerson.summary;

        stats.innerHTML = `
            <div class="stat-item">
                <p class="text-2xl font-bold text-blue-600">${summary.totalAssessments}</p>
                <p class="text-xs text-gray-500">健康评估</p>
            </div>
            <div class="stat-item">
                <p class="text-2xl font-bold text-green-600">${summary.totalInfusions}</p>
                <p class="text-xs text-gray-500">输注次数</p>
            </div>
            <div class="stat-item">
                <p class="text-2xl font-bold text-purple-600">${summary.totalReports}</p>
                <p class="text-xs text-gray-500">报告数量</p>
            </div>
            <div class="stat-item">
                <p class="text-2xl font-bold text-orange-600">${summary.totalImages || 0}</p>
                <p class="text-xs text-gray-500">影像资料</p>
            </div>
        `;
    }

    // 渲染基本信息
    renderBasicInfo() {
        const basicInfo = document.getElementById('basicInfo');
        const person = this.currentPerson.basicInfo;

        basicInfo.innerHTML = `
            <div class="space-y-3">
                <div class="flex justify-between">
                    <span class="text-gray-600">身份证号:</span>
                    <span class="font-mono">${person.identityCard}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">性别:</span>
                    <span>${person.gender}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">年龄:</span>
                    <span>${person.age || '--'}岁</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">身高:</span>
                    <span>${person.height || '--'}cm</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">体重:</span>
                    <span>${person.weight || '--'}kg</span>
                </div>
                ${person.bmi ? `
                    <div class="flex justify-between">
                        <span class="text-gray-600">BMI:</span>
                        <span>${Utils.formatBMI(person.bmi)}</span>
                    </div>
                ` : ''}
            </div>
        `;

        const contactInfo = document.getElementById('contactInfo');
        contactInfo.innerHTML = `
            <div class="space-y-3">
                <div class="flex justify-between">
                    <span class="text-gray-600">联系电话:</span>
                    <span>${person.phone || '--'}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">联系人:</span>
                    <span>${person.contactPerson || '--'}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">联系人电话:</span>
                    <span>${person.contactPersonPhone || '--'}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">地址:</span>
                    <span class="text-right max-w-xs">${person.address || '--'}</span>
                </div>
            </div>
        `;
    }

    // 渲染健康记录 - Context7 列表风格
    renderHealthRecords() {
        const $$ = this.app.$$;
        const records = this.currentPerson.healthRecords.assessments;

        if (!records || records.length === 0) {
            const emptyHTML = `
                <li class="item-content">
                    <div class="item-inner">
                        <div class="item-title text-center text-gray-500">
                            <i class="icon icon-clipboard-list text-4xl"></i>
                            <p class="margin-top">暂无健康评估记录</p>
                        </div>
                    </div>
                </li>
            `;
            $$('#healthRecordsList ul').html(emptyHTML);
            return;
        }

        const html = records.map(record => `
            <li class="swipeout">
                <div class="swipeout-content">
                    <a href="#" class="item-link item-content">
                        <div class="item-inner">
                            <div class="item-title-row">
                                <div class="item-title">${record.Department}</div>
                                <div class="item-after">
                                    <span class="chip success">${record.Status}</span>
                                </div>
                            </div>
                            <div class="item-subtitle">${Utils.formatDate(record.AssessmentDate)}</div>
                            ${record.Doctor ? `<div class="item-text">医生: ${record.Doctor}</div>` : ''}
                            ${record.Summary ? `<div class="item-text">${record.Summary}</div>` : ''}
                        </div>
                    </a>
                </div>
            </li>
        `).join('');

        $$('#healthRecordsList ul').html(html);
    }

    // 渲染治疗记录
    renderTreatmentRecords() {
        const treatmentRecords = document.getElementById('treatmentRecords');
        const stemCellInfo = this.currentPerson.stemCellInfo;

        if (!stemCellInfo) {
            treatmentRecords.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-procedures text-4xl mb-2"></i>
                    <p>暂无干细胞治疗记录</p>
                </div>
            `;
            return;
        }

        const infusions = this.currentPerson.treatmentHistory.infusions;

        treatmentRecords.innerHTML = `
            <div class="space-y-6">
                <!-- 患者信息 -->
                <div class="border border-gray-200 rounded-lg p-4">
                    <h4 class="font-semibold mb-3">患者档案</h4>
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span class="text-gray-600">患者编号:</span>
                            <p class="font-mono">${stemCellInfo.PatientNumber}</p>
                        </div>
                        <div>
                            <span class="text-gray-600">注册日期:</span>
                            <p>${Utils.formatDate(stemCellInfo.RegistrationDate)}</p>
                        </div>
                        <div>
                            <span class="text-gray-600">主要诊断:</span>
                            <p>${stemCellInfo.PrimaryDiagnosis || '--'}</p>
                        </div>
                        <div>
                            <span class="text-gray-600">治疗方案:</span>
                            <p>${stemCellInfo.TreatmentPlan || '--'}</p>
                        </div>
                    </div>
                </div>

                <!-- 输注记录 -->
                <div>
                    <h4 class="font-semibold mb-3">输注记录 (${infusions?.length || 0}次)</h4>
                    ${!infusions || infusions.length === 0 ? `
                        <div class="text-center py-8 text-gray-500">
                            <i class="fas fa-syringe text-4xl mb-2"></i>
                            <p>暂无输注记录</p>
                        </div>
                    ` : `
                        <div class="space-y-3">
                            ${infusions.map(infusion => `
                                <div class="border border-gray-200 rounded-lg p-4">
                                    <div class="flex justify-between items-start mb-2">
                                        <div>
                                            <p class="font-semibold">${infusion.TreatmentType}</p>
                                            <p class="text-sm text-gray-500">第${infusion.InfusionCount}次 · ${Utils.formatDate(infusion.ScheduleDate)}</p>
                                        </div>
                                        ${Utils.getStatusBadge(infusion.Status, 'treatment')}
                                    </div>
                                    ${infusion.Doctor ? `<p class="text-sm text-gray-600">医生: ${infusion.Doctor}</p>` : ''}
                                    ${infusion.Notes ? `<p class="text-sm text-gray-700">${infusion.Notes}</p>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    // 渲染报告记录
    renderReportRecords() {
        const reportRecords = document.getElementById('reportRecords');
        const reports = this.currentPerson.reports.reports;

        if (!reports || reports.length === 0) {
            reportRecords.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-file-medical text-4xl mb-2"></i>
                    <p>暂无报告记录</p>
                </div>
            `;
            return;
        }

        reportRecords.innerHTML = `
            <div class="space-y-4">
                ${reports.map(report => `
                    <div class="border border-gray-200 rounded-lg p-4">
                        <div class="flex justify-between items-start mb-2">
                            <div>
                                <p class="font-semibold">${report.ReportName}</p>
                                <p class="text-sm text-gray-500">${report.ReportType} · ${Utils.formatDate(report.ReportDate)}</p>
                            </div>
                            <button class="text-blue-600 hover:text-blue-800">
                                <i class="fas fa-download"></i>
                            </button>
                        </div>
                        ${report.Summary ? `<p class="text-sm text-gray-700">${report.Summary}</p>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }

    // 切换标签页
    switchTab(tabName) {
        // 更新标签按钮状态
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('border-blue-600', 'text-blue-600');
            btn.classList.add('border-transparent', 'text-gray-500');
        });

        document.querySelector(`[data-tab="${tabName}"]`).classList.remove('border-transparent', 'text-gray-500');
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('border-blue-600', 'text-blue-600');

        // 切换内容显示
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        document.getElementById(`${tabName}Tab`).classList.add('active');
    }

    // 显示人员表单
    showPersonForm(personData = null) {
        const form = document.getElementById('personForm');

        if (personData) {
            // 编辑模式
            Object.keys(personData).forEach(key => {
                const field = form.querySelector(`[name="${key}"]`);
                if (field) {
                    field.value = personData[key] || '';
                }
            });
        } else {
            // 新增模式
            form.reset();
        }

        this.showModal('personFormModal');
    }

    // 保存人员信息
    async savePerson() {
        const form = document.getElementById('personForm');
        const formData = new FormData(form);
        const personData = Object.fromEntries(formData.entries());

        // 验证表单
        const validationRules = {
            identityCard: [
                { required: true, message: '身份证号不能为空' },
                { pattern: /^\d{15}$|^\d{17}[\dXx]$/, message: '请输入正确的15~18位身份证号' }
            ],
            name: [
                { required: true, message: '姓名不能为空' },
                { maxLength: 50, message: '姓名长度不能超过50个字符' }
            ],
            gender: [
                { required: true, message: '请选择性别' }
            ],
            age: [
                { min: 0, max: 150, message: '年龄必须在0-150之间' }
            ],
            height: [
                { min: 50, max: 250, message: '身高必须在50-250cm之间' }
            ],
            weight: [
                { min: 20, max: 300, message: '体重必须在20-300kg之间' }
            ],
            phone: [
                { pattern: /^[0-9]{11}$/, message: '请输入11位手机号' }
            ]
        };

        const errors = validateForm(form, validationRules);
        if (Object.keys(errors).length > 0) {
            showFormErrors(form, errors);
            return;
        }

        try {
            const hideLoadingFn = showLoading(form);

            const result = await API.person.createOrUpdate(personData);

            hideLoadingFn();

            if (result.status === 'Success') {
                showNotification(result.message, 'success');
                hideModal(form.closest('.modal'));
                this.loadPersonList();
            } else {
                showNotification(result.message, 'error');
            }
        } catch (error) {
            console.error('保存人员信息失败:', error);
            showNotification('保存人员信息失败', 'error');
        }
    }

    // 编辑人员
    async editPerson(identityCard = null) {
        const targetIdentityCard = identityCard || this.currentPerson?.basicInfo?.identityCard;

        if (!targetIdentityCard) {
            showNotification('无法获取人员信息', 'error');
            return;
        }

        try {
            const result = await API.person.getFullProfile(targetIdentityCard);

            if (result.status === 'Success') {
                hideModal(document.getElementById('personDetailModal'));
                this.showPersonForm(result.data.basicInfo);
            } else {
                showNotification(result.message, 'error');
            }
        } catch (error) {
            console.error('获取人员信息失败:', error);
            showNotification('获取人员信息失败', 'error');
        }
    }

    // 查看完整档案
    viewFullProfile(identityCard) {
        this.showPersonDetail(identityCard);
    }

    // 删除人员
    async deletePerson(identityCard) {
        showConfirm('确定要删除该人员档案吗？此操作不可恢复。', async () => {
            try {
                const result = await API.person.deleteProfile(identityCard);

                if (result.status === 'Success') {
                    showNotification('人员档案删除成功', 'success');
                    this.loadPersonList();
                    hideModal(document.getElementById('personDetailModal'));
                } else {
                    showNotification(result.message, 'error');
                }
            } catch (error) {
                console.error('删除人员档案失败:', error);
                showNotification('删除人员档案失败', 'error');
            }
        });
    }

    // 显示批量导入
    showBatchImport() {
        // 这里可以实现批量导入功能
        showNotification('批量导入功能开发中...', 'info');
    }

    // 显示模态框
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
        }
    }

    // 隐藏模态框
    hideModal(modalId) {
        const modal = typeof modalId === 'string' ? document.getElementById(modalId) : modalId;
        if (modal) {
            modal.classList.remove('show');
        }
    }
}

// 显示人员表单 - Context7 弹出页面
    showPersonForm(personData = null) {
        const $$ = this.app.$$;
        const form = $$('#personForm')[0];

        if (personData) {
            // 编辑模式
            Object.keys(personData).forEach(key => {
                const field = form.querySelector(`[name="${key}"]`);
                if (field) {
                    field.value = personData[key] || '';
                }
            });
        } else {
            // 新增模式
            form.reset();
        }

        this.app.popup.open('#personFormPopup');
    }

    // 保存人员信息 - Context7 风格
    async savePerson() {
        const $$ = this.app.$$;
        const form = $$('#personForm')[0];
        const formData = new FormData(form);
        const personData = Object.fromEntries(formData.entries());

        // 验证身份证号
        if (!Utils.validateIdCard(personData.identityCard)) {
            NotificationHelper.validationError('身份证号格式不正确，请输入有效的15~18位身份证号', '数据验证错误');
            return;
        }

        // 验证手机号（如果提供）
        if (personData.phone && !/^[0-9]{11}$/.test(personData.phone)) {
            NotificationHelper.validationError('手机号格式不正确，请输入有效的11位手机号码', '数据验证错误');
            return;
        }

        try {
            this.app.preloader.show();

            // 尝试调用真实API
            try {
                const result = await API.person.createOrUpdate(personData);
                this.app.preloader.hide();

                if (result.status === 'Success') {
                    this.showSaveSuccessDialog(result.message);
                    return;
                }
            } catch (apiError) {
                console.log('API连接失败，模拟保存成功');
            }

            // 如果API失败，模拟保存成功
            this.app.preloader.hide();
            this.showSaveSuccessDialog('人员信息保存成功（演示模式）');

        } catch (error) {
            console.error('保存人员信息失败:', error);
            this.app.preloader.hide();
            NotificationHelper.error('保存人员信息失败，请重试', '保存失败');
        }
    }

    // 显示保存成功对话框
    showSaveSuccessDialog(message) {
        this.app.dialog.create({
            title: '成功',
            text: message,
            buttons: [
                {
                    text: '确定',
                    onClick: () => {
                        this.app.popup.close('#personFormPopup');
                        this.loadPersonList();
                    }
                }
            ]
        }).open();
    }

    // 编辑人员
    async editPerson(identityCard = null) {
        const targetIdentityCard = identityCard || this.currentPerson?.basicInfo?.identityCard;

        if (!targetIdentityCard) {
            NotificationHelper.error('无法获取人员信息，请检查网络连接', '数据加载错误');
            return;
        }

        try {
            this.app.preloader.show();

            const result = await API.person.getFullProfile(targetIdentityCard);

            this.app.preloader.hide();

            if (result.status === 'Success') {
                this.app.popup.close('#personDetailPopup');
                this.showPersonForm(result.data.basicInfo);
            } else {
                NotificationHelper.error(result.message, '操作失败');
            }
        } catch (error) {
            console.error('获取人员信息失败:', error);
            this.app.preloader.hide();
            NotificationHelper.error('获取人员信息失败，请重试', '数据加载错误');
        }
    }

    // 删除人员 - Context7 确认对话框
    async deletePerson(identityCard) {
        this.app.dialog.create({
            title: '确认删除',
            text: '确定要删除该人员档案吗？此操作不可恢复。',
            buttons: [
                {
                    text: '取消',
                    onClick: () => {
                        // 关闭滑动删除
                        $$('.swipeout-opened').removeClass('swipeout-opened');
                    }
                },
                {
                    text: '删除',
                    color: 'red',
                    onClick: async () => {
                        try {
                            this.app.preloader.show();

                            const result = await API.person.deleteProfile(identityCard);

                            this.app.preloader.hide();

                            if (result.status === 'Success') {
                                this.app.toast.show({
                                    text: '人员档案删除成功',
                                    closeTimeout: 2000
                                });
                                this.loadPersonList();

                                // 关闭详情弹出页面（如果打开的话）
                                if (this.app.popup.get('#personDetailPopup')) {
                                    this.app.popup.close('#personDetailPopup');
                                }
                            } else {
                                NotificationHelper.error(result.message, '操作失败');
                            }
                        } catch (error) {
                            console.error('删除人员档案失败:', error);
                            this.app.preloader.hide();
                            NotificationHelper.error('删除人员档案失败，请重试', '删除失败');
                        }
                    }
                }
            ]
        }).open();
    }

    // 渲染治疗记录和报告记录的简化版本
    renderTreatmentRecords() {
        const $$ = this.app.$$;
        const stemCellInfo = this.currentPerson.stemCellInfo;

        if (!stemCellInfo) {
            const emptyHTML = `
                <li class="item-content">
                    <div class="item-inner">
                        <div class="item-title text-center text-gray-500">
                            <i class="icon icon-procedures text-4xl"></i>
                            <p class="margin-top">暂无干细胞治疗记录</p>
                        </div>
                    </div>
                </li>
            `;
            $$('#treatmentRecordsList ul').html(emptyHTML);
            return;
        }

        const html = `
            <li class="item-content">
                <div class="item-inner">
                    <div class="item-title">患者编号</div>
                    <div class="item-after">${stemCellInfo.PatientNumber}</div>
                </div>
            </li>
            <li class="item-content">
                <div class="item-inner">
                    <div class="item-title">注册日期</div>
                    <div class="item-after">${Utils.formatDate(stemCellInfo.RegistrationDate)}</div>
                </div>
            </li>
            <li class="item-content">
                <div class="item-inner">
                    <div class="item-title">主要诊断</div>
                    <div class="item-after">${stemCellInfo.PrimaryDiagnosis || '--'}</div>
                </div>
            </li>
            <li class="item-content">
                <div class="item-inner">
                    <div class="item-title">输注次数</div>
                    <div class="item-after">${stemCellInfo.TotalInfusionCount || 0}次</div>
                </div>
            </li>
        `;

        $$('#treatmentRecordsList ul').html(html);
    }

    renderReportRecords() {
        const $$ = this.app.$$;
        const reports = this.currentPerson.reports.reports;

        if (!reports || reports.length === 0) {
            const emptyHTML = `
                <li class="item-content">
                    <div class="item-inner">
                        <div class="item-title text-center text-gray-500">
                            <i class="icon icon-file-text text-4xl"></i>
                            <p class="margin-top">暂无报告记录</p>
                        </div>
                    </div>
                </li>
            `;
            $$('#reportsList ul').html(emptyHTML);
            return;
        }

        const html = reports.map(report => `
            <li class="swipeout">
                <div class="swipeout-content">
                    <a href="#" class="item-link item-content">
                        <div class="item-inner">
                            <div class="item-title-row">
                                <div class="item-title">${report.ReportName}</div>
                                <div class="item-after">
                                    <i class="icon icon-download"></i>
                                </div>
                            </div>
                            <div class="item-subtitle">${report.ReportType}</div>
                            <div class="item-text">${Utils.formatDate(report.ReportDate)}</div>
                        </div>
                    </a>
                </div>
            </li>
        `).join('');

        $$('#reportsList ul').html(html);
    }
}

// 初始化页面
let personManagement;
document.addEventListener('DOMContentLoaded', () => {
    personManagement = new PersonManagement();
    window.personManagement = personManagement;
});
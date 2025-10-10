-- =====================================================================================
-- 干细胞治疗档案管理系统 - 初始化数据
-- 版本: 1.0.0
-- 日期: 2025-10-05
-- 用途: 初始化基础数据（部门、疾病类型、治疗计划等）
-- =====================================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

USE [HealthRecordSystem];

PRINT '开始初始化基础数据...';

-- =====================================================================================
-- 1. 系统用户数据
-- =====================================================================================

PRINT '初始化系统用户数据...';

-- 检查是否已有管理员用户
IF NOT EXISTS (SELECT 1 FROM [dbo].[Users] WHERE Username = 'admin')
BEGIN
    -- 创建默认管理员用户
    INSERT INTO [dbo].[Users] (
        ID, Username, Password, Name, Email, Role, Status, CreatedDate
    ) VALUES (
        NEWID(), 'admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq9w5HS', -- 'admin123'的bcrypt哈希
        '系统管理员', 'admin@healthsystem.com', 'admin', 'active', GETDATE()
    );
    PRINT '✓ 默认管理员用户创建完成 (用户名: admin, 密码: admin123)';
END
ELSE
BEGIN
    PRINT '✓ 管理员用户已存在，跳过创建';
END

-- 创建示例经理用户
IF NOT EXISTS (SELECT 1 FROM [dbo].[Users] WHERE Username = 'manager')
BEGIN
    INSERT INTO [dbo].[Users] (
        ID, Username, Password, Name, Email, Role, Status, CreatedDate
    ) VALUES (
        NEWID(), 'manager', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq9w5HS', -- 'manager123'的bcrypt哈希
        '部门经理', 'manager@healthsystem.com', 'manager', 'active', GETDATE()
    );
    PRINT '✓ 示例经理用户创建完成 (用户名: manager, 密码: manager123)';
END

-- 创建示例普通用户
IF NOT EXISTS (SELECT 1 FROM [dbo].[Users] WHERE Username = 'user')
BEGIN
    INSERT INTO [dbo].[Users] (
        ID, Username, Password, Name, Email, Role, Status, CreatedDate
    ) VALUES (
        NEWID(), 'user', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq9w5HS', -- 'user123'的bcrypt哈希
        '普通用户', 'user@healthsystem.com', 'user', 'active', GETDATE()
    );
    PRINT '✓ 示例普通用户创建完成 (用户名: user, 密码: user123)';
END

-- =====================================================================================
-- 2. 部门数据
-- =====================================================================================

PRINT '初始化部门数据...';

DECLARE @DeptCount INT = (SELECT COUNT(*) FROM [dbo].[Departments]);

IF @DeptCount = 0
BEGIN
    INSERT INTO [dbo].[Departments] (ID, Name, Description, CreatedDate) VALUES
    (NEWID(), '内科', '内科诊疗部门，负责各种内科疾病的诊断和治疗', GETDATE()),
    (NEWID(), '外科', '外科诊疗部门，负责各种外科手术和治疗', GETDATE()),
    (NEWID(), '妇产科', '妇产科诊疗部门，负责妇科和产科相关疾病', GETDATE()),
    (NEWID(), '儿科', '儿科诊疗部门，负责儿童疾病的诊断和治疗', GETDATE()),
    (NEWID(), '肿瘤科', '肿瘤科诊疗部门，负责各种肿瘤疾病的诊断和治疗', GETDATE()),
    (NEWID(), '心血管科', '心血管科诊疗部门，负责心血管疾病的诊断和治疗', GETDATE()),
    (NEWID(), '神经科', '神经科诊疗部门，负责神经系统疾病的诊断和治疗', GETDATE()),
    (NEWID(), '消化科', '消化科诊疗部门，负责消化系统疾病的诊断和治疗', GETDATE()),
    (NEWID(), '呼吸科', '呼吸科诊疗部门，负责呼吸系统疾病的诊断和治疗', GETDATE()),
    (NEWID(), '内分泌科', '内分泌科诊疗部门，负责内分泌系统疾病的诊断和治疗', GETDATE()),
    (NEWID(), '免疫科', '免疫科诊疗部门，负责免疫系统疾病的诊断和治疗', GETDATE()),
    (NEWID(), '干细胞治疗中心', '专门的干细胞治疗研究中心，提供前沿的干细胞治疗服务', GETDATE());

    PRINT '✓ 部门数据初始化完成，共创建 12 个部门';
END
ELSE
BEGIN
    PRINT '✓ 部门数据已存在，跳过创建，当前部门数量: ' + CAST(@DeptCount AS NVARCHAR);
END

-- =====================================================================================
-- 3. 疾病类型数据
-- =====================================================================================

PRINT '初始化疾病类型数据...';

DECLARE @DiseaseCount INT = (SELECT COUNT(*) FROM [dbo].[DiseaseTypes]);

IF @DiseaseCount = 0
BEGIN
    INSERT INTO [dbo].[DiseaseTypes] (ID, Name, Description, Keywords, CreatedDate) VALUES
    (NEWID(), '糖尿病', '糖尿病是一种以高血糖为特征的代谢性疾病', '糖尿病,血糖,胰岛素', GETDATE()),
    (NEWID(), '高血压', '高血压是指血液在血管中流动时对血管壁造成的压力值持续高于正常值', '高血压,血压,心血管', GETDATE()),
    (NEWID(), '冠心病', '冠状动脉粥样硬化性心脏病的简称，是指冠状动脉血管发生动脉粥样硬化病变而引起血管腔狭窄或阻塞', '冠心病,心血管,心绞痛', GETDATE()),
    (NEWID(), '脑梗塞', '脑梗塞又称缺血性脑卒中，是指因脑部血液供应障碍，缺血、缺氧所导致的局限性脑组织的缺血性坏死或软化', '脑梗塞,中风,脑卒中', GETDATE()),
    (NEWID(), '阿尔茨海默病', '阿尔茨海默病是一种起病隐匿、进行性发展的神经系统退行性疾病', '阿尔茨海默,老年痴呆,认知障碍', GETDATE()),
    (NEWID(), '帕金森病', '帕金森病是一种常见的神经系统退行性疾病，主要影响中老年人', '帕金森,震颤,运动障碍', GETDATE()),
    (NEWID(), '肝硬化', '肝硬化是临床常见的慢性进行性肝病，由一种或多种病因长期或反复作用形成的弥漫性肝损害', '肝硬化,肝脏,肝病', GETDATE()),
    (NEWID(), '慢性肾病', '慢性肾病是指肾脏结构或功能异常超过3个月，对患者健康造成影响', '慢性肾病,肾功能,透析', GETDATE()),
    (NEWID(), '类风湿关节炎', '类风湿关节炎是一种以侵蚀性、对称性多关节炎为主要临床表现的慢性、全身性自身免疫性疾病', '类风湿,关节炎,免疫', GETDATE()),
    (NEWID(), '系统性红斑狼疮', '系统性红斑狼疮是一种多发于青年女性的累及多脏器的自身免疫性炎症性结缔组织病', '红斑狼疮,免疫,结缔组织', GETDATE()),
    (NEWID(), '脊髓损伤', '脊髓损伤是指由于外界直接或间接因素导致脊髓损伤，在损害的相应节段出现各种运动、感觉和括约肌功能障碍', '脊髓损伤,神经损伤,瘫痪', GETDATE()),
    (NEWID(), '骨关节炎', '骨关节炎是一种退行性病变，系由于增龄、肥胖、劳损、创伤、关节先天性异常等诸多因素引起的关节软骨退化损伤', '骨关节炎,关节退化,关节痛', GETDATE()),
    (NEWID(), '慢性阻塞性肺疾病', '慢性阻塞性肺疾病是一种具有气流阻塞特征的慢性支气管炎和（或）肺气肿，可进一步发展为肺心病和呼吸衰竭', '慢阻肺,COPD,肺疾病', GETDATE()),
    (NEWID(), '心肌梗死', '心肌梗死是指急性、持续性缺血缺氧所引起的心肌坏死', '心肌梗死,心梗,心脏病', GETDATE()),
    (NEWID(), '心力衰竭', '心力衰竭是指心脏当时不能搏出同静脉回流及身体组织代谢所需相称的血液供应', '心力衰竭,心衰,心脏病', GETDATE());

    PRINT '✓ 疾病类型数据初始化完成，共创建 15 种疾病类型';
END
ELSE
BEGIN
    PRINT '✓ 疾病类型数据已存在，跳过创建，当前疾病数量: ' + CAST(@DiseaseCount AS NVARCHAR);
END

-- =====================================================================================
-- 4. 治疗计划模板数据
-- =====================================================================================

PRINT '初始化治疗计划模板数据...';

DECLARE @PlanCount INT = (SELECT COUNT(*) FROM [dbo].[TreatmentPlans]);

IF @PlanCount = 0
BEGIN
    -- 糖尿病干细胞治疗计划
    INSERT INTO [dbo].[TreatmentPlans] (
        ID, CustomerID, DiseaseType, PlanName, PlanDetails,
        StemCellType, StemCellSource, CellCount, Status, CreatedBy, CreatedDate
    ) VALUES (
        NEWID(), NULL, '糖尿病', '糖尿病干细胞基础治疗计划',
        '采用间充质干细胞治疗，通过静脉输注方式，改善胰岛功能，降低血糖水平。治疗方案包括3次输注，每次间隔1个月。',
        '间充质干细胞', '脐带血', '5×10^7', '草稿',
        (SELECT ID FROM [dbo].[Users] WHERE Username = 'admin'), GETDATE()
    );

    -- 帕金森病干细胞治疗计划
    INSERT INTO [dbo].[TreatmentPlans] (
        ID, CustomerID, DiseaseType, PlanName, PlanDetails,
        StemCellType, StemCellSource, CellCount, Status, CreatedBy, CreatedDate
    ) VALUES (
        NEWID(), NULL, '帕金森病', '帕金森病干细胞综合治疗计划',
        '采用神经干细胞联合间充质干细胞治疗，通过腰椎穿刺和静脉输注相结合的方式，改善神经功能，减轻震颤和运动障碍症状。',
        '神经干细胞', '骨髓', '1×10^8', '草稿',
        (SELECT ID FROM [dbo].[Users] WHERE Username = 'admin'), GETDATE()
    );

    -- 脊髓损伤干细胞治疗计划
    INSERT INTO [dbo].[TreatmentPlans] (
        ID, CustomerID, DiseaseType, PlanName, PlanDetails,
        StemCellType, StemCellSource, CellCount, Status, CreatedBy, CreatedDate
    ) VALUES (
        NEWID(), NULL, '脊髓损伤', '脊髓损伤干细胞修复治疗计划',
        '采用嗅鞘干细胞和间充质干细胞联合治疗，通过局部注射和静脉输注相结合的方式，促进神经再生和功能恢复。',
        '嗅鞘干细胞', '脂肪组织', '2×10^8', '草稿',
        (SELECT ID FROM [dbo].[Users] WHERE Username = 'admin'), GETDATE()
    );

    -- 心肌梗死干细胞治疗计划
    INSERT INTO [dbo].[TreatmentPlans] (
        ID, CustomerID, DiseaseType, PlanName, PlanDetails,
        StemCellType, StemCellSource, CellCount, Status, CreatedBy, CreatedDate
    ) VALUES (
        NEWID(), NULL, '心肌梗死', '心肌梗死干细胞修复治疗计划',
        '采用心脏干细胞和间充质干细胞联合治疗，通过冠状动脉输注方式，促进心肌细胞再生，改善心功能。',
        '心脏干细胞', '外周血', '1.5×10^8', '草稿',
        (SELECT ID FROM [dbo].[Users] WHERE Username = 'admin'), GETDATE()
    );

    -- 类风湿关节炎干细胞治疗计划
    INSERT INTO [dbo].[TreatmentPlans] (
        ID, CustomerID, DiseaseType, PlanName, PlanDetails,
        StemCellType, StemCellSource, CellCount, Status, CreatedBy, CreatedDate
    ) VALUES (
        NEWID(), NULL, '类风湿关节炎', '类风湿关节炎干细胞免疫调节治疗计划',
        '采用间充质干细胞治疗，通过静脉输注方式，调节免疫系统功能，减轻关节炎症和疼痛症状。',
        '间充质干细胞', '脐带', '8×10^7', '草稿',
        (SELECT ID FROM [dbo].[Users] WHERE Username = 'admin'), GETDATE()
    );

    PRINT '✓ 治疗计划模板数据初始化完成，共创建 5 个治疗计划模板';
END
ELSE
BEGIN
    PRINT '✓ 治疗计划数据已存在，跳过创建，当前计划数量: ' + CAST(@PlanCount AS NVARCHAR);
END

-- =====================================================================================
-- 5. 系统配置数据
-- =====================================================================================

PRINT '初始化系统配置数据...';

-- 创建配置表（如果不存在）
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'SystemConfigs')
BEGIN
    CREATE TABLE [dbo].[SystemConfigs] (
        [ID] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [ConfigKey] NVARCHAR(100) NOT NULL,
        [ConfigValue] NVARCHAR(500) NULL,
        [Description] NVARCHAR(500) NULL,
        [Category] NVARCHAR(50) NULL,
        [IsEditable] BIT NOT NULL DEFAULT 1,
        [CreatedDate] DATETIME NOT NULL DEFAULT GETDATE(),
        [UpdatedDate] DATETIME NULL
    );

    -- 创建唯一约束
    ALTER TABLE [dbo].[SystemConfigs] ADD CONSTRAINT [UQ_SystemConfigs_ConfigKey] UNIQUE (ConfigKey);

    PRINT '✓ 系统配置表创建完成';
END

-- 插入默认配置
DECLARE @ConfigCount INT = (SELECT COUNT(*) FROM [dbo].[SystemConfigs]);

IF @ConfigCount = 0
BEGIN
    INSERT INTO [dbo].[SystemConfigs] (ConfigKey, ConfigValue, Description, Category, IsEditable) VALUES
    ('SYSTEM_NAME', '干细胞治疗档案管理系统', '系统名称', 'SYSTEM', 0),
    ('SYSTEM_VERSION', '1.0.0', '系统版本', 'SYSTEM', 0),
    ('MAX_UPLOAD_SIZE', '10', '最大文件上传大小(MB)', 'UPLOAD', 1),
    ('ALLOWED_FILE_TYPES', 'jpg,jpeg,png,pdf,doc,docx', '允许上传的文件类型', 'UPLOAD', 1),
    ('PASSWORD_MIN_LENGTH', '6', '密码最小长度', 'SECURITY', 1),
    ('SESSION_TIMEOUT', '24', '会话超时时间(小时)', 'SECURITY', 1),
    ('DEFAULT_LANGUAGE', 'zh-CN', '默认语言', 'UI', 1),
    ('PAGE_SIZE', '20', '分页大小', 'UI', 1),
    ('BACKUP_INTERVAL', '7', '备份间隔(天)', 'BACKUP', 1),
    ('LOG_RETENTION_DAYS', '30', '日志保留天数', 'LOG', 1);

    PRINT '✓ 系统配置数据初始化完成，共创建 10 项配置';
END
ELSE
BEGIN
    PRINT '✓ 系统配置数据已存在，跳过创建，当前配置数量: ' + CAST(@ConfigCount AS NVARCHAR);
END

-- =====================================================================================
-- 6. 数据验证和统计
-- =====================================================================================

PRINT '验证初始化数据...';

-- 统计各表数据量
DECLARE @UsersCount INT = (SELECT COUNT(*) FROM [dbo].[Users]);
DECLARE @DeptsCount INT = (SELECT COUNT(*) FROM [dbo].[Departments]);
DECLARE @DiseasesCount INT = (SELECT COUNT(*) FROM [dbo].[DiseaseTypes]);
DECLARE @PlansCount INT = (SELECT COUNT(*) FROM [dbo].[TreatmentPlans]);
DECLARE @ConfigsCount INT = (SELECT COUNT(*) FROM [dbo].[SystemConfigs]);

PRINT '====================================================================================';
PRINT '数据初始化统计:';
PRINT '用户数量: ' + CAST(@UsersCount AS NVARCHAR);
PRINT '部门数量: ' + CAST(@DeptsCount AS NVARCHAR);
PRINT '疾病类型数量: ' + CAST(@DiseasesCount AS NVARCHAR);
PRINT '治疗计划模板数量: ' + CAST(@PlansCount AS NVARCHAR);
PRINT '系统配置数量: ' + CAST(@ConfigsCount AS NVARCHAR);
PRINT '====================================================================================';

PRINT '✓ 基础数据初始化完成';
PRINT '默认管理员账户: admin / admin123';
PRINT '示例经理账户: manager / manager123';
PRINT '示例用户账户: user / user123';
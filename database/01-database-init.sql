-- =====================================================================================
-- 干细胞治疗档案管理系统 - 数据库初始化脚本
-- 版本: 1.0.0
-- 日期: 2025-10-05
-- 用途: 新部署项目的数据库初始化
-- 说明: 删除所有测试数据，重新创建数据库结构
-- =====================================================================================

-- =====================================================================================
-- 1. 环境设置和变量声明
-- =====================================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

-- 数据库配置
DECLARE @DatabaseName NVARCHAR(100) = 'HealthRecordSystem';
DECLARE @DefaultAdminUsername NVARCHAR(50) = 'admin';
DECLARE @DefaultAdminPassword NVARCHAR(100) = 'admin123';
DECLARE @DefaultAdminName NVARCHAR(100) = '系统管理员';

-- 版本控制
DECLARE @DBVersion NVARCHAR(20) = '1.0.0';
DECLARE @InitDate DATETIME = GETDATE();

PRINT '====================================================================================';
PRINT '干细胞治疗档案管理系统 - 数据库初始化开始';
PRINT '版本: ' + @DBVersion;
PRINT '开始时间: ' + CONVERT(NVARCHAR, @InitDate, 120);
PRINT '====================================================================================';

-- =====================================================================================
-- 2. 创建数据库（如果不存在）
-- =====================================================================================

IF NOT EXISTS (SELECT 1 FROM sys.databases WHERE name = @DatabaseName)
BEGIN
    PRINT '正在创建数据库: ' + @DatabaseName;
    CREATE DATABASE [HealthRecordSystem]
    COLLATE Chinese_PRC_CI_AS;

    -- 设置数据库选项
    ALTER DATABASE [HealthRecordSystem] SET RECOVERY FULL;
    ALTER DATABASE [HealthRecordSystem] SET AUTO_CLOSE OFF;
    ALTER DATABASE [HealthRecordSystem] SET AUTO_SHRINK OFF;

    PRINT '✓ 数据库创建完成';
END
ELSE
BEGIN
    PRINT '✓ 数据库已存在，跳过创建步骤';
END

USE [HealthRecordSystem];

-- =====================================================================================
-- 3. 删除所有测试表和历史数据（重新初始化）
-- =====================================================================================

PRINT '开始清理测试表和历史数据...';

-- 删除测试表
DECLARE @TablesToDrop TABLE = (
    'TestTable',
    'CustomersAudit',
    'DatabaseLogs',
    'SystemLogs'
);

DECLARE @TableName NVARCHAR(100);
DECLARE @DropSQL NVARCHAR(MAX);

DECLARE drop_cursor CURSOR FOR SELECT name FROM sys.tables WHERE name IN (SELECT value FROM OPENJSON('["' + STRING_AGG('"' + CAST(table_name AS NVARCHAR) + '"', ', '') + '"]', '$') AS table_name)
WHERE schema_name = 'dbo';

OPEN drop_cursor;
FETCH NEXT FROM drop_cursor INTO @TableName;

WHILE @@FETCH_STATUS = 0
BEGIN
    SET @DropSQL = 'DROP TABLE IF EXISTS [dbo].[' + @TableName + ']';
    EXEC sp_executesql @DropSQL;
    PRINT '✓ 已删除表: ' + @TableName;

    FETCH NEXT FROM drop_cursor INTO @TableName;
END

CLOSE drop_cursor;
DEALLOCATE drop_cursor;

-- 清理所有现有数据（保留表结构）
DECLARE @DataTables TABLE = (
    'Users',
    'Customers',
    'HealthAssessments',
    'StemCellPatients',
    'InfusionSchedules',
    'Reports',
    'MedicalImages',
    'Departments',
    'DiseaseTypes',
    'DiseaseTreatmentPlans',
    'TreatmentPlans',
    'TreatmentEffectiveness',
    'TreatmentTypeStats',
    'DiseaseStats',
    'InfusionCountStats',
    'RadiologyRecords',
    'Notifications'
);

DECLARE @data_cursor CURSOR FOR SELECT value FROM OPENJSON('["' + STRING_AGG('"' + CAST(table_name AS NVARCHAR) + '"', '', '') + '"]', '$') AS table_name FROM @DataTables;

OPEN data_cursor;
FETCH NEXT FROM data_cursor INTO @TableName;

WHILE @@FETCH_STATUS = 0
BEGIN
    SET @DropSQL = 'DELETE FROM [dbo].[' + @TableName + ']';
    EXEC sp_executesql @DropSQL;
    PRINT '✓ 已清空表数据: ' + @TableName + ' (' + CAST(SCOPE_IDENTITY() AS NVARCHAR) + ' 行)';

    FETCH NEXT FROM data_cursor INTO @TableName;
END

CLOSE data_cursor;
DEALLOCATE data_cursor;

-- 重置自增种子
EXEC sp_executesql 'DBCC CHECKIDENT (Users, RESEED, 1, RESEED)';
EXEC sp_executesql 'DBCC CHECKIDENT (Customers, RESEED, 1, RESEED)';
EXEC sp_executesql 'DBCC CHECKIDENT (HealthAssessments, RESEED, 1, RESEED)';
EXEC sp_executesql 'DBCC CHECKIDENT (StemCellPatients, RESEED, 1, RESEED)';
EXEC sp_executesql 'DBCC CHECKIDENT (InfusionSchedules, RESEED, 1, RESEED)';
EXEC sp_executesql 'DBCC CHECKIDENT (Reports, RESEED, 1, RESEED)';
EXEC sp_executesql 'DBCC CHECKIDENT (MedicalImages, RESEED, 1, RESEED)';
EXEC sp_executesql 'DBCC CHECKIDENT (Departments, RESEED, 1, RESEED)';
EXEC sp_executesql 'DBCC CHECKIDENT (DiseaseTypes, RESEED, 1, RESEED)';
EXEC sp_executesql 'DBCC CHECKIDENT (DiseaseTreatmentPlans, RESEED, 1, RESEED)';
EXEC sp_executesql 'DBCC CHECKIDENT (TreatmentPlans, RESEED, 1, RESEED)';
EXEC sp_executesql 'DBCC CHECKIDENT (TreatmentEffectiveness, RESEED, 1, RESEED)';
EXEC sp_executesql 'DBCC CHECKIDENT (TreatmentTypeStats, RESEED, 1, RESEED)';
EXEC sp_executesql 'DBCC CHECKIDENT (DiseaseStats, RESEED, 1, RESEED)';
EXEC sp_executesql 'DBCC CHECKIDENT (InfusionCountStats, RESEED, 1, RESEED)';
EXEC sp_executesql 'DBCC CHECKIDENT (RadiologyRecords, RESEED, 1, RESEED)';
EXEC sp_executesql 'DBCC CHECKIDENT (Notifications, RESEED, 1, RESEED)';

PRINT '✅ 数据清理完成';

-- =====================================================================================
-- 4. 创建核心表结构
-- =====================================================================================

PRINT '开始创建核心表结构...';

-- 4.1 用户表 (Users)
PRINT '创建用户表...';
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Users' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[Users] (
        [id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [username] NVARCHAR(100) NOT NULL,
        [password] NVARCHAR(255) NOT NULL,
        [name] NVARCHAR(200) NOT NULL,
        [email] NVARCHAR(255) NULL,
        [role] NVARCHAR(50) NOT NULL DEFAULT 'user',
        [status] NVARCHAR(20) NOT NULL DEFAULT 'active',
        [last_login_at] DATETIME2 NULL,
        [login_count] INT NOT NULL DEFAULT 0,
        [failed_login_attempts] INT NOT NULL DEFAULT 0,
        [locked_until] DATETIME2 NULL,
        [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [updated_at] DATETIME2 NULL
    );

    -- 创建唯一约束
    ALTER TABLE [dbo].[Users] ADD CONSTRAINT [UQ_Users_username] UNIQUE ([username]);

    -- 创建索引
    CREATE INDEX [IX_Users_email] ON [dbo].[Users] ([email]);
    CREATE INDEX [IX_Users_status] ON [dbo].[Users] ([status]);

    PRINT '✓ 用户表创建完成';
END

-- 4.2 部门表 (Departments)
PRINT '创建部门表...';
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Departments' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[Departments] (
        [id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [name] NVARCHAR(100) NOT NULL,
        [description] NVARCHAR(500) NULL,
        [status] NVARCHAR(20) NOT NULL DEFAULT 'active',
        [sort_order] INT NOT NULL DEFAULT 0,
        [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [updated_at] DATETIME2 NULL
    );

    -- 创建索引
    CREATE INDEX [IX_Departments_status] ON [dbo].[Departments] ([status]);
    CREATE UNIQUE INDEX [UQ_Departments_name] ON [dbo].[Departments] ([name]);

    PRINT '✓ 部门表创建完成';
END

-- 4.3 疾病类型表 (DiseaseTypes)
PRINT '创建疾病类型表...';
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'DiseaseTypes' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[DiseaseTypes] (
        [id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [name] NVARCHAR(100) NOT NULL,
        [code] NVARCHAR(50) NOT NULL,
        [description] NVARCHAR(500) NULL,
        [category] NVARCHAR(50) NULL,
        [status] NVARCHAR(20) NOT NULL DEFAULT 'active',
        [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [updated_at] DATETIME2 NULL
    );

    -- 创建索引
    CREATE INDEX [IX_DiseaseTypes_status] ON [dbo].[DiseaseTypes] ([status]);
    CREATE UNIQUE INDEX [UQ_DiseaseTypes_code] ON [dbo].[DiseaseTypes] ([code]);

    PRINT '✓ 疾病类型表创建完成';
END

-- 4.4 治疗方案表 (TreatmentPlans)
PRINT '创建治疗方案表...';
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'TreatmentPlans' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[TreatmentPlans] (
        [id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [name] NVARCHAR(200) NOT NULL,
        [description] NVARCHAR(1000) NULL,
        [duration_days] INT NULL,
        [cycle_count] INT NULL,
        [status] NVARCHAR(20) NOT NULL DEFAULT 'active',
        [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [updated_at] DATETIME2 NULL
    );

    -- 创建索引
    CREATE INDEX [IX_TreatmentPlans_status] ON [dbo].[TreatmentPlans] ([status]);

    PRINT '✓ 治疗方案表创建完成';
END

-- 4.5 客户信息表 (Customers)
PRINT '创建客户信息表...';
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Customers' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[Customers] (
        [ID] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [IdentityCard] NVARCHAR(18) NOT NULL,
        [Name] NVARCHAR(100) NOT NULL,
        [Gender] NVARCHAR(10) NOT NULL,
        [BirthDate] DATE NULL,
        [Age] INT NULL,
        [Height] DECIMAL(5,2) NULL,
        [Weight] DECIMAL(5,2) NULL,
        [Phone] NVARCHAR(40) NULL,
        [Email] NVARCHAR(100) NULL,
        [ContactPerson] NVARCHAR(100) NULL,
        [ContactPersonPhone] NVARCHAR(40) NULL,
        [Address] NVARCHAR(500) NULL,
        [BloodType] NVARCHAR(10) NULL,
        [EmergencyContact] NVARCHAR(100) NULL,
        [EmergencyContactPhone] NVARCHAR(40) NULL,
        [Remarks] NVARCHAR(2000) NULL,
        [Status] NVARCHAR(20) NOT NULL DEFAULT 'active',
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [UpdatedAt] DATETIME2 NULL,
        [CreatedBy] NVARCHAR(100) NULL
    );

    -- 创建唯一约束
    ALTER TABLE [dbo].[Customers] ADD CONSTRAINT [UQ_Customers_IdentityCard] UNIQUE ([IdentityCard]);

    -- 创建索引
    CREATE INDEX [IX_Customers_Name] ON [dbo].[Customers] ([Name]);
    CREATE INDEX [IX_Customers_Phone] ON [dbo].[Customers] ([Phone]);
    CREATE INDEX [IX_Customers_Status] ON [dbo].[Customers] ([Status]);
    CREATE INDEX [IX_Customers_BirthDate] ON [dbo].[Customers] ([BirthDate]);
    CREATE INDEX [IX_Customers_BloodType] ON [dbo].[Customers] ([BloodType]);
    CREATE INDEX [IX_Customers_CreatedAt] ON [dbo].[Customers] ([CreatedAt]);

    PRINT '✓ 客户信息表创建完成';
END

-- 4.6 健康评估表 (HealthAssessments)
PRINT '创建健康评估表...';
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'HealthAssessments' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[HealthAssessments] (
        [ID] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [CustomerID] UNIQUEIDENTIFIER NOT NULL,
        [AssessmentDate] DATE NOT NULL,
        [Department] NVARCHAR(100) NOT NULL,
        [Doctor] NVARCHAR(100) NULL,
        [AssessmentType] NVARCHAR(50) NOT NULL DEFAULT 'routine',
        [AssessmentData] NVARCHAR(MAX) NULL,
        [Summary] NVARCHAR(2000) NULL,
        [FollowUpRequired] BIT NOT NULL DEFAULT 0,
        [FollowUpDate] DATE NULL,
        [Severity] NVARCHAR(20) NULL,
        [Status] NVARCHAR(20) NOT NULL DEFAULT 'active',
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [UpdatedAt] DATETIME2 NULL,
        [CreatedBy] NVARCHAR(100) NULL
    );

    -- 创建外键约束
    ALTER TABLE [dbo].[HealthAssessments] ADD CONSTRAINT [FK_HealthAssessments_Customers] FOREIGN KEY ([CustomerID]) REFERENCES [dbo].[Customers] ([ID]) ON DELETE CASCADE;

    -- 创建索引
    CREATE INDEX [IX_HealthAssessments_CustomerID] ON [dbo].[HealthAssessments] ([CustomerID]);
    CREATE INDEX [IX_HealthAssessments_Date] ON [dbo].[HealthAssessments] ([AssessmentDate]);
    CREATE INDEX [IX_HealthAssessments_Department] ON [dbo].[HealthAssessments] ([Department]);

    PRINT '✓ 健康评估表创建完成';
END

-- 4.7 干细胞患者表 (StemCellPatients)
PRINT '创建干细胞患者表...';
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'StemCellPatients' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[StemCellPatients] (
        [ID] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [CustomerID] UNIQUEIDENTIFIER NOT NULL,
        [PatientNumber] NVARCHAR(50) NOT NULL,
        [RegistrationDate] DATE NOT NULL,
        [DiseaseTypes] NVARCHAR(500) NULL,
        [DiseaseKeywords] NVARCHAR(1000) NULL,
        [PrimaryDiagnosis] NVARCHAR(1000) NULL,
        [TreatmentPlanID] INT NULL,
        [TreatmentStage] NVARCHAR(50) NOT NULL DEFAULT 'initial',
        [TotalInfusionCount] INT NOT NULL DEFAULT 0,
        [ExpectedCompletionDate] DATE NULL,
        [ActualCompletionDate] DATE NULL,
        [Status] NVARCHAR(20) NOT NULL DEFAULT 'active',
        [Remarks] NVARCHAR(2000) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [UpdatedAt] DATETIME2 NULL,
        [CreatedBy] NVARCHAR(100) NULL
    );

    -- 创建外键约束
    ALTER TABLE [dbo].[StemCellPatients] ADD CONSTRAINT [FK_StemCellPatients_Customers] FOREIGN KEY ([CustomerID]) REFERENCES [dbo].[Customers] ([ID]) ON DELETE CASCADE;
    ALTER TABLE [dbo].[StemCellPatients] ADD CONSTRAINT [FK_StemCellPatients_TreatmentPlans] FOREIGN KEY ([TreatmentPlanID]) REFERENCES [dbo].[TreatmentPlans] ([id]);

    -- 创建唯一约束
    ALTER TABLE [dbo].[StemCellPatients] ADD CONSTRAINT [UQ_StemCellPatients_PatientNumber] UNIQUE ([PatientNumber]);

    -- 创建索引
    CREATE INDEX [IX_StemCellPatients_CustomerID] ON [dbo].[StemCellPatients] ([CustomerID]);
    CREATE INDEX [IX_StemCellPatients_PatientNumber] ON [dbo].[StemCellPatients] ([PatientNumber]);
    CREATE INDEX [IX_StemCellPatients_Status] ON [dbo].[StemCellPatients] ([Status]);
    CREATE INDEX [IX_StemCellPatients_RegistrationDate] ON [dbo].[StemCellPatients] ([RegistrationDate]);

    PRINT '✓ 干细胞患者表创建完成';
END

-- 4.8 输注排期表 (InfusionSchedules)
PRINT '创建输注排期表...';
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'InfusionSchedules' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[InfusionSchedules] (
        [ID] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [PatientID] UNIQUEIDENTIFIER NOT NULL,
        [ScheduleDate] DATE NOT NULL,
        [ScheduleType] NVARCHAR(20) NOT NULL DEFAULT 'routine',
        [TreatmentType] NVARCHAR(100) NOT NULL,
        [InfusionCount] INT NOT NULL DEFAULT 1,
        [Status] NVARCHAR(20) NOT NULL DEFAULT 'scheduled',
        [ActualStartTime] DATETIME2 NULL,
        [ActualEndTime] DATETIME2 NULL,
        [PreparationStartTime] DATETIME2 NULL,
        [PreparationEndTime] DATETIME2 NULL,
        [Doctor] NVARCHAR(100) NULL,
        [Nurse] NVARCHAR(100) NULL,
        [Notes] NVARCHAR(1000) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [UpdatedAt] DATETIME2 NULL,
        [CreatedBy] NVARCHAR(100) NULL
    );

    -- 创建外键约束
    ALTER TABLE [dbo].[InfusionSchedules] ADD CONSTRAINT [FK_InfusionSchedules_Patients] FOREIGN KEY ([PatientID]) REFERENCES [dbo].[StemCellPatients] ([ID]) ON DELETE CASCADE;

    -- 创建索引
    CREATE INDEX [IX_InfusionSchedules_PatientID] ON [dbo].[InfusionSchedules] ([PatientID]);
    CREATE INDEX [IX_InfusionSchedules_Date] ON [dbo].[InfusionSchedules] ([ScheduleDate]);
    CREATE INDEX [IX_InfusionSchedules_Status] ON [dbo].[InfusionSchedules] ([Status]);

    PRINT '✓ 输注排期表创建完成';
END

-- 4.9 报告表 (Reports)
PRINT '创建报告表...';
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Reports' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[Reports] (
        [ID] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [CustomerID] UNIQUEIDENTIFIER NOT NULL,
        [ReportName] NVARCHAR(400) NOT NULL,
        [ReportType] NVARCHAR(100) NOT NULL,
        [ReportDate] DATE NOT NULL,
        [DataRange] NVARCHAR(200) NULL,
        [ReportContent] NVARCHAR(MAX) NOT NULL,
        [Summary] NVARCHAR(2000) NULL,
        [AIAnalysis] NVARCHAR(MAX) NULL,
        [FilePath] NVARCHAR(1000) NULL,
        [Version] INT NOT NULL DEFAULT 1,
        [IsLatest] BIT NOT NULL DEFAULT 1,
        [PreviousVersionID] UNIQUEIDENTIFIER NULL,
        [ApprovedBy] NVARCHAR(100) NULL,
        [ApprovedAt] DATETIME2 NULL,
        [Category] NVARCHAR(50) NOT NULL DEFAULT 'general',
        [Priority] NVARCHAR(20) NOT NULL DEFAULT 'normal',
        [Tags] NVARCHAR(500) NULL,
        [Status] NVARCHAR(20) NOT NULL DEFAULT 'draft',
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [UpdatedAt] DATETIME2 NULL,
        [CreatedBy] NVARCHAR(100) NULL
    );

    -- 创建外键约束
    ALTER TABLE [dbo].[Reports] ADD CONSTRAINT [FK_Reports_Customers] FOREIGN KEY ([CustomerID]) REFERENCES [dbo].[Customers] ([ID]) ON DELETE CASCADE;

    -- 创建索引
    CREATE INDEX [IX_Reports_CustomerID] ON [dbo].[Reports] ([CustomerID]);
    CREATE INDEX [IX_Reports_Date] ON [dbo].[Reports] ([ReportDate]);
    CREATE INDEX [IX_Reports_Type] ON [dbo].[Reports] ([ReportType]);
    CREATE INDEX [IX_Reports_Latest] ON [dbo].[Reports] ([CustomerID], [ReportDate] DESC, [IsLatest]);

    PRINT '✓ 报告表创建完成';
END

-- 4.10 医学影像表 (MedicalImages)
PRINT '创建医学影像表...';
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'MedicalImages' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[MedicalImages] (
        [ID] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [CustomerID] UNIQUEIDENTIFIER NOT NULL,
        [ImageType] NVARCHAR(50) NOT NULL,
        [ImageName] NVARCHAR(255) NOT NULL,
        [Description] NVARCHAR(500) NULL,
        [FilePath] NVARCHAR(1000) NOT NULL,
        [FileSize] BIGINT NULL,
        [MimeType] NVARCHAR(100) NULL,
        [UploadDate] DATE NOT NULL,
        [Status] NVARCHAR(20) NOT NULL DEFAULT 'active',
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [UpdatedAt] DATETIME2 NULL,
        [CreatedBy] NVARCHAR(100) NULL
    );

    -- 创建外键约束
    ALTER TABLE [dbo].[MedicalImages] ADD CONSTRAINT [FK_MedicalImages_Customers] FOREIGN KEY ([CustomerID]) REFERENCES [dbo].[Customers] ([ID]) ON DELETE CASCADE;

    -- 创建索引
    CREATE INDEX [IX_MedicalImages_CustomerID] ON [dbo].[MedicalImages] ([CustomerID]);
    CREATE INDEX [IX_MedicalImages_Type] ON [dbo].[MedicalImages] ([ImageType]);
    CREATE INDEX [IX_MedicalImages_Date] ON [dbo].[MedicalImages] ([UploadDate]);

    PRINT '✓ 医学影像表创建完成';
END

-- 4.11 放射记录表 (RadiologyRecords)
PRINT '创建放射记录表...';
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'RadiologyRecords' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[RadiologyRecords] (
        [ID] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [CustomerID] UNIQUEIDENTIFIER NOT NULL,
        [RecordType] NVARCHAR(50) NOT NULL,
        [RecordDate] DATE NOT NULL,
        [ExamType] NVARCHAR(100) NULL,
        [Findings] NVARCHAR(2000) NULL,
        [Impression] NVARCHAR(2000) NULL,
        [Radiologist] NVARCHAR(100) NULL,
        [ReportFilePath] NVARCHAR(1000) NULL,
        [Status] NVARCHAR(20) NOT NULL DEFAULT 'pending',
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [UpdatedAt] DATETIME2 NULL,
        [CreatedBy] NVARCHAR(100) NULL
    );

    -- 创建外键约束
    ALTER TABLE [dbo].[RadiologyRecords] ADD CONSTRAINT [FK_RadiologyRecords_Customers] FOREIGN KEY ([CustomerID]) REFERENCES [dbo].[Customers] ([ID]) ON DELETE CASCADE;

    -- 创建索引
    CREATE INDEX [IX_RadiologyRecords_CustomerID] ON [dbo].[RadiologyRecords] ([CustomerID]);
    CREATE INDEX [IX_RadiologyRecords_Type] ON [dbo].[RadiologyRecords] ([RecordType]);
    CREATE INDEX [IX_RadiologyRecords_Date] ON [dbo].[RadiologyRecords] ([RecordDate]);

    PRINT '✓ 放射记录表创建完成';
END

-- 4.12 通知表 (Notifications)
PRINT '创建通知表...';
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Notifications' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[Notifications] (
        [ID] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [UserID] INT NULL,
        [Title] NVARCHAR(200) NOT NULL,
        [Message] NVARCHAR(1000) NOT NULL,
        [Type] NVARCHAR(50) NOT NULL DEFAULT 'info',
        [RelatedType] NVARCHAR(50) NULL,
        [RelatedID] NVARCHAR(50) NULL,
        [IsRead] BIT NOT NULL DEFAULT 0,
        [ReadAt] DATETIME2 NULL,
        [ExpiresAt] DATETIME2 NULL,
        [Priority] NVARCHAR(20) NOT NULL DEFAULT 'normal',
        [Status] NVARCHAR(20) NOT NULL DEFAULT 'active',
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [UpdatedAt] DATETIME2 NULL
    );

    -- 创建索引
    CREATE INDEX [IX_Notifications_UserID] ON [dbo].[Notifications] ([UserID]);
    CREATE INDEX [IX_Notifications_IsRead] ON [dbo].[Notifications] ([IsRead]);
    CREATE INDEX [IX_Notifications_Type] ON [dbo].[Notifications] ([Type]);
    CREATE INDEX [IX_Notifications_ExpiresAt] ON [dbo].[Notifications] ([ExpiresAt]);

    PRINT '✓ 通知表创建完成';
END

-- =====================================================================================
-- 5. 创建统计和分析表
-- =====================================================================================

-- 5.1 疾病统计表 (DiseaseStats)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'DiseaseStats' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[DiseaseStats] (
        [ID] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [DiseaseTypeID] INT NOT NULL,
        [Year] INT NOT NULL,
        [Month] INT NOT NULL,
        [PatientCount] INT NOT NULL DEFAULT 0,
        [TreatmentCount] INT NOT NULL DEFAULT 0,
        [SuccessRate] DECIMAL(5,2) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [UpdatedAt] DATETIME2 NULL
    );

    -- 创建外键约束
    ALTER TABLE [dbo].[DiseaseStats] ADD CONSTRAINT [FK_DiseaseStats_DiseaseTypes] FOREIGN KEY ([DiseaseTypeID]) REFERENCES [dbo].[DiseaseTypes] ([id]);

    -- 创建索引
    CREATE INDEX [IX_DiseaseStats_DiseaseType] ON [dbo].[DiseaseStats] ([DiseaseTypeID]);
    CREATE INDEX [IX_DiseaseStats_YearMonth] ON [dbo].[DiseaseStats] ([Year], [Month]);

    PRINT '✓ 疾病统计表创建完成';
END

-- 5.2 治疗效果统计表 (TreatmentEffectiveness)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'TreatmentEffectiveness' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[TreatmentEffectiveness] (
        [ID] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [TreatmentPlanID] INT NOT NULL,
        [PatientID] UNIQUEIDENTIFIER NOT NULL,
        [EffectivenessScore] DECIMAL(5,2) NOT NULL,
        [SideEffects] NVARCHAR(1000) NULL,
        [ImprovementAreas] NVARCHAR(1000) NULL,
        [FollowUpDate] DATE NULL,
        [Notes] NVARCHAR(2000) NULL,
        [Status] NVARCHAR(20) NOT NULL DEFAULT 'pending',
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [UpdatedAt] DATETIME2 NULL
    );

    -- 创建外键约束
    ALTER TABLE [dbo].[TreatmentEffectiveness] ADD CONSTRAINT [FK_TreatmentEffectiveness_TreatmentPlans] FOREIGN KEY ([TreatmentPlanID]) REFERENCES [dbo].[TreatmentPlans] ([id]);
    ALTER TABLE [dbo].[TreatmentEffectiveness] ADD CONSTRAINT [FK_TreatmentEffectiveness_Patients] FOREIGN KEY ([PatientID]) REFERENCES [dbo].[StemCellPatients] ([ID]);

    -- 创建索引
    CREATE INDEX [IX_TreatmentEffectiveness_PatientID] ON [dbo].[TreatmentEffectiveness] ([PatientID]);
    CREATE INDEX [IX_TreatmentEffectiveness_Score] ON [dbo].[TreatmentEffectiveness] ([EffectivenessScore]);

    PRINT '✓ 治疗效果统计表创建完成';
END

-- 5.3 治疗类型统计表 (TreatmentTypeStats)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'TreatmentTypeStats' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[TreatmentTypeStats] (
        [ID] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [TreatmentType] NVARCHAR(100) NOT NULL,
        [Year] INT NOT NULL,
        [Month] INT NOT NULL,
        [TreatmentCount] INT NOT NULL DEFAULT 0,
        [SuccessCount] INT NOT NULL DEFAULT 0,
        [AverageEffectiveness] DECIMAL(5,2) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [UpdatedAt] DATETIME2 NULL
    );

    -- 创建索引
    CREATE INDEX [IX_TreatmentTypeStats_Type] ON [dbo].[TreatmentTypeStats] ([TreatmentType]);
    CREATE INDEX [IX_TreatmentTypeStats_YearMonth] ON [dbo].[TreatmentTypeStats] ([Year], [Month]);

    PRINT '✓ 治疗类型统计表创建完成';
END

-- 5.4 输注次数统计表 (InfusionCountStats)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'InfusionCountStats' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[InfusionCountStats] (
        [ID] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [Year] INT NOT NULL,
        [Month] INT NOT NULL,
        [TotalInfusions] INT NOT NULL DEFAULT 0,
        [CompletedInfusions] INT NOT NULL DEFAULT 0,
        [CancelledInfusions] INT NOT NULL DEFAULT 0,
        [AverageDuration] DECIMAL(5,2) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [UpdatedAt] ON_UPDATE SYMMETRIC GETDATE()
    );

    -- 创建索引
    CREATE INDEX [IX_InfusionCountStats_YearMonth] ON [dbo].[InfusionCountStats] ([Year], [Month]);

    PRINT '✓ 输注次数统计表创建完成';
END

-- =====================================================================================
-- 6. 创建数据完整性和约束
-- =====================================================================================

PRINT '创建数据完整性约束...';

-- 为Customers表添加检查约束
ALTER TABLE [dbo].[Customers] ADD CONSTRAINT [CK_Customers_Age] CHECK ([Age] IS NULL OR ([Age] >= 0 AND [Age] <= 150));
ALTER TABLE [dbo].[Customers] ADD CONSTRAINT [CK_Customers_Height] CHECK ([Height] IS NULL OR ([Height] >= 50 AND [Height] <= 300));
ALTER TABLE [dbo].[Customers] ADD CONSTRAINT [CK_Customers_Weight] CHECK ([Weight] IS NULL OR ([Weight] >= 20 AND [Weight] <= 300));
ALTER TABLE [dbo].[Customers] ADD CONSTRAINT [CK_Customers_Phone] CHECK ([Phone] IS NULL OR ([Phone] LIKE '1[0-9]%' AND LEN([Phone]) >= 11));
ALTER TABLE [dbo].[Customers] ADD CONSTRAINT [CK_Customers_BloodType] CHECK ([BloodType] IS NULL OR ([BloodType] IN ('A', 'B', 'AB', 'O', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')));
ALTER TABLE [dbo].[Customers] ADD CONSTRAINT [CK_Customers_Gender] CHECK ([Gender] IN ('男', '女', '其他')));

-- 为健康评估表添加约束
ALTER TABLE [dbo].[HealthAssessments] ADD CONSTRAINT [CK_HealthAssessments_AssessmentType] CHECK ([AssessmentType] IN ('routine', 'initial', 'followup', 'emergency', 'preTreatment', 'postTreatment'));
ALTER TABLE [dbo].[HealthAssessments] ADD CONSTRAINT [CK_HealthAssessments_Date] CHECK ([AssessmentDate] <= GETDATE() OR [AssessmentDate] >= DATEADD(YEAR, -1, GETDATE()));

-- 为干细胞患者表添加约束
ALTER TABLE [dbo].[StemCellPatients] ADD CONSTRAINT [CK_StemCellPatients_RegistrationDate] CHECK ([RegistrationDate] <= GETDATE() OR [RegistrationDate] >= DATEADD(YEAR, -10, GETDATE()));
ALTER TABLE [dbo].[StemCellPatients] ADD CONSTRAINT [CK_StemCellPatients_TotalInfusionCount] CHECK ([TotalInfusionCount] >= 0);
ALTER TABLE [dbo].[StemCellPatients] ADD CONSTRAINT [CK_StemCellPatients_TreatmentStage] CHECK ([TreatmentStage] IN ('initial', 'progress', 'completed', 'suspended'));
ALTER TABLE [dbo].[StemCellPatients] ADD CONSTRAINT [CK_StemCellPatients_Status] CHECK ([Status] IN ('active', 'completed', 'suspended', 'inactive'));

-- 为输注排期表添加约束
ALTER TABLE [dbo].[InfusionSchedules] ADD CONSTRAINT [CK_InfusionSchedules_ScheduleDate] CHECK ([ScheduleDate] <= GETDATE() OR [ScheduleDate] >= DATEADD(MONTH, -6, GETDATE()));
ALTER TABLE [dbo].[InfusionSchedules] ADD CONSTRAINT [CK_InfusionSchedules_ScheduleType] CHECK ([ScheduleType] IN ('routine', 'followup', 'emergency'));
ALTER TABLE [dbo].[InfusionSchedules] ADD CONSTRAINT [CK_InfusionSchedules_TreatmentType] CHECK ([TreatmentType] IN ('NK', 'MSC', '2MSC', '膝关节靶向注射'));
ALTER TABLE [dbo].[InfusionSchedules] ADD CONSTRAINT [CK_InfusionSchedules_InfusionCount] CHECK ([InfusionCount] > 0 AND [InfusionCount] <= 20);
ALTER TABLE [dbo].[InfusionSchedules] ADD CONSTRAINT [CK_InfusionSchedules_Status] CHECK ([Status] IN ('scheduled', 'preparation', 'inProgress', 'completed', 'cancelled', 'rescheduled', 'noShow'));

-- 为报告表添加约束
ALTER TABLE [dbo].[Reports] ADD CONSTRAINT [CK_Reports_ReportType] CHECK ([ReportType] IN ('health', 'medical', 'laboratory', 'imaging', 'summary', 'ai', 'research'));
ALTER TABLE [dbo].[Reports] ADD CONSTRAINT [CK_Reports_ReportDate] CHECK ([ReportDate] <= GETDATE() OR [ReportDate] >= DATEADD(YEAR, -5, GETDATE()));
ALTER TABLE [dbo].[Reports] ADD CONSTRAINT [CK_Reports_Version] CHECK ([Version] > 0);
ALTER TABLE [dbo].[Reports] ADD CONSTRAINT [CK_Reports_Priority] CHECK ([Priority] IN ('low', 'normal', 'high', 'urgent'));

-- 为用户表添加约束
ALTER TABLE [dbo].[Users] ADD CONSTRAINT [CK_Users_Role] CHECK ([Role] IN ('admin', 'manager', 'user', 'guest'));
ALTER TABLE [dbo].[Users] ADD CONSTRAINT [CK_Users_Status] CHECK ([Status] IN ('active', 'inactive', 'locked', 'suspended'));
ALTER TABLE [dbo].[Users] ADD CONSTRAINT [CK_Users_LoginCount] CHECK ([login_count] >= 0);
ALTER TABLE [dbo].[Users] ADD CONSTRAINT [CK_Users_FailedLoginAttempts] CHECK ([failed_login_attempts] >= 0);

PRINT '✓ 数据完整性约束创建完成';

-- =====================================================================================
-- 7. 初始化基础数据
-- =====================================================================================

PRINT '开始初始化基础数据...';

-- 7.1 插入默认用户
INSERT INTO [dbo].[Users] ([username], [password], [name], [email], [role], [status], [created_at])
VALUES
    (@DefaultAdminUsername, HASHBYTES('sha256', @DefaultAdminPassword, 'salt123'), @DefaultAdminName, 'admin@healthsystem.com', 'admin', 'active', GETDATE());

-- 7.2 插入默认部门
INSERT INTO [dbo].[Departments] ([name], [description], [sort_order], [created_at])
VALUES
    ('内科', '内科部门', 1, GETDATE()),
    ('外科', '外科部门', 2, GETDATE()),
    ('妇产科', '妇产科部门', 3, GETDATE()),
    ('儿科', '儿科部门', 4, GETDATE()),
    ('影像科', '医学影像部门', 5, GETDATE()),
    ('检验科', '医学检验部门', 6, GETDATE()),
    ('功能科', '功能检查部门', 7, GETDATE()),
    ('骨科', '骨科部门', 8, GETDATE()),
    ('康复科', '康复医学部门', 9, GETDATE());

-- 7.3 插入默认疾病类型
INSERT INTO [dbo].[DiseaseTypes] ([name], [code], [description], [category])
VALUES
    ('糖尿病', 'DM001', '糖尿病', '内分泌科'),
    ('高血压', 'HT001', '高血压', '心血管科'),
    ('冠心病', 'CAD001', '冠心病', '心血管科'),
    ('脑梗塞', 'CVA001', '脑梗塞', '神经科'),
    ('肿瘤', 'CA001', '恶性肿瘤', '肿瘤科'),
    ('关节炎', 'AR001', '关节炎', '风湿免疫科'),
    ('肝炎', 'HEP001', '肝炎', '感染科'),
    ('肾病', 'KD001', '肾病', '肾内科'),
    ('肺病', 'PD001', '肺部疾病', '呼吸内科'),
    ('皮肤病', 'DERM001', '皮肤病', '皮肤科'),
    ('眼科疾病', 'EYE001', '眼科疾病', '眼科'),
    ('耳鼻喉科疾病', 'ENT001', '耳鼻喉科疾病', '耳鼻喉科'),
    ('消化系统疾病', 'GI001', '消化系统疾病', '消化科');

-- 7.4 插入默认治疗方案
INSERT INTO [dbo].[TreatmentPlans] ([name], [description], [duration_days], [cycle_count])
VALUES
    ('基础治疗计划', '干细胞基础治疗方案，适用于初次治疗', 30, 1),
    ('标准治疗计划', '干细胞标准治疗方案，适用于常规治疗', 90, 3),
    '强化治疗计划', '干细胞强化治疗方案，适用于重症患者', 180, 6),
    ('维持治疗计划', '干细胞维持治疗方案，适用于康复期', 365, 12);

-- 7.5 创建系统配置表（如果不存在）
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'SystemConfig' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[SystemConfig] (
        [Key] NVARCHAR(100) NOT NULL PRIMARY KEY,
        [Value] NVARCHAR(MAX) NOT NULL,
        [Description] NVARCHAR(500) NULL,
        [Category] NVARCHAR(50) NULL,
        [IsSystem] BIT NOT NULL DEFAULT 0,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [UpdatedAt] DATETIME2 NULL
    );

    -- 插入系统配置
    INSERT INTO [dbo].[SystemConfig] ([Key], [Value], [Description], [Category], [IsSystem])
    VALUES
        ('DB_VERSION', @DBVersion, '数据库版本号', 'system', 1),
        ('INITIALIZED_DATE', CONVERT(NVARCHAR, @InitDate, 120), '初始化日期', 'system', 1),
        ('DEFAULT_ADMIN_USERNAME', @DefaultAdminUsername, '默认管理员用户名', 'system', 1),
        ('DEFAULT_ADMIN_NAME', @DefaultAdminName, '默认管理员姓名', 'system', 1),
        ('ALLOW_REGISTRATION', 'true', '是否允许用户注册', 'system', 1),
        ('DEFAULT_USER_ROLE', 'user', '新用户默认角色', 'system', 1),
        ('SESSION_TIMEOUT_MINUTES', '480', '会话超时时间（分钟）', 'system', 1),
        ('MAX_LOGIN_ATTEMPTS', '5', '最大登录尝试次数', 'security', 1),
        ('LOCKOUT_DURATION_MINUTES', '30', '账户锁定时间（分钟）', 'security', 1),
        ('FILE_MAX_SIZE_MB', '10', '文件最大大小（MB）', 'system', 1),
        ('BACKUP_RETENTION_DAYS', '30', '备份保留天数', 'system', 1),
        ('LOG_LEVEL', 'info', '日志级别', 'system', 1);

    PRINT '✓ 系统配置表创建完成';
END

PRINT '✅ 基础数据初始化完成';

-- =====================================================================================
-- 8. 验证数据库初始化
-- =====================================================================================

PRINT '开始验证数据库初始化...';

-- 验证表创建
DECLARE @ExpectedTables TABLE = (
    'Users', 'Customers', 'HealthAssessments', 'StemCellPatients', 'InfusionSchedules',
    'Reports', 'MedicalImages', 'Departments', 'DiseaseTypes', 'TreatmentPlans',
    'TreatmentEffectiveness', 'TreatmentTypeStats', 'DiseaseStats', 'InfusionCountStats',
    'RadiologyRecords', 'Notifications'
);

DECLARE @VerificationResults TABLE (
    [TableName] NVARCHAR(100),
    [ExpectedCount] INT,
    [ActualCount] INT,
    [Status] NVARCHAR(20)
);

DECLARE @ExpectedCount INT = 18;
DECLARE @ActualCount INT;
DECLARE @Status NVARCHAR(20);

-- 验证每个表是否正确创建
DECLARE @TableCursor CURSOR FOR SELECT value FROM OPENJSON('["' + STRING_AGG('"' + CAST(table_name AS NVARCHAR) + '"', '', '') + '"]', '$') AS table_name) FROM @ExpectedTables;

OPEN @TableCursor;
FETCH NEXT FROM @TableCursor INTO @TableName;

WHILE @@FETCH_STATUS = 0
BEGIN
    SELECT @ActualCount = COUNT(*) FROM sys.tables WHERE name = @TableName AND schema_id = SCHEMA_ID('dbo');

    IF @ActualCount > 0
        SET @Status = '✅ 已创建';
    ELSE
        SET @Status = '❌ 未创建';

    INSERT INTO @VerificationResults VALUES (@TableName, 1, @ActualCount, @Status);

    FETCH NEXT FROM @TableCursor INTO @TableName;
END

CLOSE @TableCursor;
DEALLOCATE @TableCursor;

-- 显示验证结果
SELECT
    [TableName],
    [ExpectedCount],
    [ActualCount],
    [Status]
FROM @VerificationResults
ORDER BY [TableName];

-- 验证约束创建
DECLARE @ConstraintCount INT;
SELECT @ConstraintCount = COUNT(*) FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('Customers') OR parent_object_id = OBJECT_ID('Users');

-- 验证索引创建
DECLARE @IndexCount INT;
SELECT @IndexCount = COUNT(*) FROM sys.indexes WHERE object_id = OBJECT_ID('Customers') OR object_id = OBJECT_ID('Users');

-- 验证初始数据
DECLARE @UserCount INT, @DepartmentCount INT, @DiseaseTypeCount INT, @TreatmentPlanCount INT;

SELECT @UserCount = COUNT(*) FROM [dbo].[Users];
SELECT @DepartmentCount = COUNT(*) FROM [dbo].[Departments];
SELECT @DiseaseTypeCount = COUNT(*) FROM [dbo].[DiseaseTypes];
SELECT @TreatmentPlanCount = COUNT(*) FROM [dbo].[TreatmentPlans];

PRINT '=============================================';
PRINT '✅ 数据库初始化验证结果';
PRINT '=============================================';
PRINT '预期表数量: ' + CAST(@ExpectedCount AS NVARCHAR);
PRINT '实际表数量: ' + CAST(@ActualCount AS NVARCHAR);
PRINT '约束数量: ' + CAST(@ConstraintCount AS NVARCHAR);
PRINT '索引数量: ' CAST(@IndexCount AS NVARCHAR);
PRINT '用户数量: ' + CAST(@UserCount AS NVARCHAR);
PRINT '部门数量: ' + CAST(@DepartmentCount AS NVARCHAR);
PRINT '疾病类型数量: ' + CAST(@DiseaseTypeCount AS NVARCHAR);
PRINT '治疗方案数量: 'CAST(@TreatmentPlanCount AS NVARCHAR);

-- 显示详细验证信息
PRINT '';
PRINT '表创建状态详情:';
SELECT
    [TableName],
    [ExpectedCount],
    [ActualCount],
    [Status]
FROM @VerificationResults
ORDER BY [TableName];

PRINT '';
PRINT '=============================================';
PRINT '✅ 数据库初始化完成！';
PRINT '版本: ' + @DBVersion;
PRINT '完成时间: ' + CONVERT(NVARCHAR, GETDATE(), 120);
PRINT '=============================================';

-- 返回初始化状态总结
SELECT
    'Database' as Item,
    @DatabaseName as Value,
    'Created' as Status
UNION ALL

SELECT
    'Total Tables' as Item,
    CAST(@ExpectedCount AS NVARCHAR) as Value,
    'Successfully Created' as Status
UNION ALL

SELECT
    'Default Users' as Item,
    CAST(@UserCount AS NVARCHAR) as Value,
    'Initialized' as Status
UNION ALL

SELECT
    'Default Departments' as Item,
    CAST(@DepartmentCount AS NVARCHAR) as Value,
    'Initialized' as Status
UNION ALL

SELECT
    'Default Disease Types' as Item,
    CAST(@DiseaseTypeCount AS NVARCHAR) as Value,
    'Initialized' as Status
UNION ALL

SELECT
    'Default Treatment Plans' as Item,
    CAST(@TreatmentPlanCount AS NVARCHAR) as Value,
    'Initialized' as Status;

PRINT '';
PRINT '数据库初始化脚本执行完毕！';
PRINT '系统已准备好使用。';
PRINT '默认管理员账号: ' + @DefaultAdminUsername;
PRINT '默认密码: ' + @DefaultAdminPassword;

GO

-- 数据库初始化脚本执行完毕
PRINT '=============================================';
PRINT '✅ 干细胞治疗档案管理系统数据库初始化完成';
PRINT '版本: 1.0.0';
PRINT '执行时间: ' + CONVERT(NARCHAR, GETDATE(), 120);
PRINT '=============================================';
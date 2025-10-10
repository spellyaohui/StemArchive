-- =====================================================================================
-- 干细胞治疗档案管理系统 - 索引和约束优化
-- 版本: 1.0.0
-- 日期: 2025-10-05
-- 用途: 创建性能优化索引和数据完整性约束
-- =====================================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

USE [HealthRecordSystem];

PRINT '开始创建索引和约束...';

-- =====================================================================================
-- 1. 主键约束（在表创建时已包含，此处作为验证）
-- =====================================================================================

PRINT '验证主键约束...';

DECLARE @PKCount INT = 0;

SELECT @PKCount = COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
WHERE CONSTRAINT_TYPE = 'PRIMARY KEY';

PRINT '✓ 当前主键约束数量: ' + CAST(@PKCount AS NVARCHAR);

-- =====================================================================================
-- 2. 外键约束
-- =====================================================================================

PRINT '创建外键约束...';

-- 健康评估外键约束
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_HealthAssessments_Customers')
BEGIN
    ALTER TABLE [dbo].[HealthAssessments]
    ADD CONSTRAINT [FK_HealthAssessments_Customers]
    FOREIGN KEY (CustomerID) REFERENCES [dbo].[Customers](ID) ON DELETE CASCADE;
    PRINT '✓ 外键创建完成: FK_HealthAssessments_Customers';
END

-- 干细胞患者外键约束
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_StemCellPatients_Customers')
BEGIN
    ALTER TABLE [dbo].[StemCellPatients]
    ADD CONSTRAINT [FK_StemCellPatients_Customers]
    FOREIGN KEY (CustomerID) REFERENCES [dbo].[Customers](ID) ON DELETE CASCADE;
    PRINT '✓ 外键创建完成: FK_StemCellPatients_Customers';
END

-- 治疗计划外键约束
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_TreatmentPlans_Customers')
BEGIN
    ALTER TABLE [dbo].[TreatmentPlans]
    ADD CONSTRAINT [FK_TreatmentPlans_Customers]
    FOREIGN KEY (CustomerID) REFERENCES [dbo].[Customers](ID) ON DELETE CASCADE;
    PRINT '✓ 外键创建完成: FK_TreatmentPlans_Customers';
END

-- 输液计划外键约束
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_InfusionSchedules_Customers')
BEGIN
    ALTER TABLE [dbo].[InfusionSchedules]
    ADD CONSTRAINT [FK_InfusionSchedules_Customers]
    FOREIGN KEY (CustomerID) REFERENCES [dbo].[Customers](ID) ON DELETE CASCADE;
    PRINT '✓ 外键创建完成: FK_InfusionSchedules_Customers';
END

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_InfusionSchedules_TreatmentPlans')
BEGIN
    ALTER TABLE [dbo].[InfusionSchedules]
    ADD CONSTRAINT [FK_InfusionSchedules_TreatmentPlans]
    FOREIGN KEY (TreatmentPlanID) REFERENCES [dbo].[TreatmentPlans](ID) ON DELETE CASCADE;
    PRINT '✓ 外键创建完成: FK_InfusionSchedules_TreatmentPlans';
END

-- 报告外键约束
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Reports_Customers')
BEGIN
    ALTER TABLE [dbo].[Reports]
    ADD CONSTRAINT [FK_Reports_Customers]
    FOREIGN KEY (CustomerID) REFERENCES [dbo].[Customers](ID) ON DELETE CASCADE;
    PRINT '✓ 外键创建完成: FK_Reports_Customers';
END

-- 医学影像外键约束
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_MedicalImages_Customers')
BEGIN
    ALTER TABLE [dbo].[MedicalImages]
    ADD CONSTRAINT [FK_MedicalImages_Customers]
    FOREIGN KEY (CustomerID) REFERENCES [dbo].[Customers](ID) ON DELETE CASCADE;
    PRINT '✓ 外键创建完成: FK_MedicalImages_Customers';
END

-- 用户创建关系外键约束
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Customers_CreatedBy')
BEGIN
    ALTER TABLE [dbo].[Customers]
    ADD CONSTRAINT [FK_Customers_CreatedBy]
    FOREIGN KEY (CreatedBy) REFERENCES [dbo].[Users](ID);
    PRINT '✓ 外键创建完成: FK_Customers_CreatedBy';
END

-- =====================================================================================
-- 3. 唯一约束
-- =====================================================================================

PRINT '创建唯一约束...';

-- 客户身份证号唯一约束
IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_Customers_IdentityCard')
BEGIN
    ALTER TABLE [dbo].[Customers]
    ADD CONSTRAINT [UQ_Customers_IdentityCard] UNIQUE (IdentityCard);
    PRINT '✓ 唯一约束创建完成: UQ_Customers_IdentityCard';
END

-- 用户名唯一约束
IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_Users_Username')
BEGIN
    ALTER TABLE [dbo].[Users]
    ADD CONSTRAINT [UQ_Users_Username] UNIQUE (Username);
    PRINT '✓ 唯一约束创建完成: UQ_Users_Username';
END

-- 部门名称唯一约束
IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_Departments_Name')
BEGIN
    ALTER TABLE [dbo].[Departments]
    ADD CONSTRAINT [UQ_Departments_Name] UNIQUE (Name);
    PRINT '✓ 唯一约束创建完成: UQ_Departments_Name';
END

-- 疾病类型名称唯一约束
IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_DiseaseTypes_Name')
BEGIN
    ALTER TABLE [dbo].[DiseaseTypes]
    ADD CONSTRAINT [UQ_DiseaseTypes_Name] UNIQUE (Name);
    PRINT '✓ 唯一约束创建完成: UQ_DiseaseTypes_Name';
END

-- =====================================================================================
-- 4. CHECK约束
-- =====================================================================================

PRINT '创建CHECK约束...';

-- 客户年龄约束
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Customers_Age')
BEGIN
    ALTER TABLE [dbo].[Customers]
    ADD CONSTRAINT [CK_Customers_Age]
    CHECK (Age IS NULL OR (Age >= 0 AND Age <= 150));
    PRINT '✓ CHECK约束创建完成: CK_Customers_Age';
END

-- 性别约束
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Customers_Gender')
BEGIN
    ALTER TABLE [dbo].[Customers]
    ADD CONSTRAINT [CK_Customers_Gender]
    CHECK (Gender IN ('男', '女', '其他'));
    PRINT '✓ CHECK约束创建完成: CK_Customers_Gender';
END

-- 血型约束
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Customers_BloodType')
BEGIN
    ALTER TABLE [dbo].[Customers]
    ADD CONSTRAINT [CK_Customers_BloodType]
    CHECK (BloodType IN ('A', 'B', 'AB', 'O', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') OR BloodType IS NULL);
    PRINT '✓ CHECK约束创建完成: CK_Customers_BloodType';
END

-- 健康评估分数约束
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_HealthAssessments_OverallScore')
BEGIN
    ALTER TABLE [dbo].[HealthAssessments]
    ADD CONSTRAINT [CK_HealthAssessments_OverallScore]
    CHECK (OverallScore >= 0 AND OverallScore <= 100);
    PRINT '✓ CHECK约束创建完成: CK_HealthAssessments_OverallScore';
END

-- 输液状态约束
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_InfusionSchedules_Status')
BEGIN
    ALTER TABLE [dbo].[InfusionSchedules]
    ADD CONSTRAINT [CK_InfusionSchedules_Status]
    CHECK (InfusionStatus IN ('计划中', '已完成', '已取消'));
    PRINT '✓ CHECK约束创建完成: CK_InfusionSchedules_Status';
END

-- 用户角色约束
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Users_Role')
BEGIN
    ALTER TABLE [dbo].[Users]
    ADD CONSTRAINT [CK_Users_Role]
    CHECK (Role IN ('admin', 'manager', 'user'));
    PRINT '✓ CHECK约束创建完成: CK_Users_Role';
END

-- 用户状态约束
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Users_Status')
BEGIN
    ALTER TABLE [dbo].[Users]
    ADD CONSTRAINT [CK_Users_Status]
    CHECK (Status IN ('active', 'inactive', 'locked'));
    PRINT '✓ CHECK约束创建完成: CK_Users_Status';
END

-- =====================================================================================
-- 5. 性能优化索引
-- =====================================================================================

PRINT '创建性能优化索引...';

-- 客户表索引
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Customers_IdentityCard')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Customers_IdentityCard] ON [dbo].[Customers] ([IdentityCard]);
    PRINT '✓ 索引创建完成: IX_Customers_IdentityCard';
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Customers_Name')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Customers_Name] ON [dbo].[Customers] ([Name]);
    PRINT '✓ 索引创建完成: IX_Customers_Name';
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Customers_Phone')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Customers_Phone] ON [dbo].[Customers] ([Phone]);
    PRINT '✓ 索引创建完成: IX_Customers_Phone';
END

-- 健康评估表索引
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_HealthAssessments_CustomerID')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_HealthAssessments_CustomerID] ON [dbo].[HealthAssessments] ([CustomerID]);
    PRINT '✓ 索引创建完成: IX_HealthAssessments_CustomerID';
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_HealthAssessments_AssessmentDate')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_HealthAssessments_AssessmentDate] ON [dbo].[HealthAssessments] ([AssessmentDate]);
    PRINT '✓ 索引创建完成: IX_HealthAssessments_AssessmentDate';
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_HealthAssessments_CustomerID_Date')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_HealthAssessments_CustomerID_Date] ON [dbo].[HealthAssessments] ([CustomerID], [AssessmentDate]);
    PRINT '✓ 索引创建完成: IX_HealthAssessments_CustomerID_Date';
END

-- 干细胞患者表索引
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_StemCellPatients_CustomerID')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_StemCellPatients_CustomerID] ON [dbo].[StemCellPatients] ([CustomerID]);
    PRINT '✓ 索引创建完成: IX_StemCellPatients_CustomerID';
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_StemCellPatients_CreatedDate')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_StemCellPatients_CreatedDate] ON [dbo].[StemCellPatients] ([CreatedDate]);
    PRINT '✓ 索引创建完成: IX_StemCellPatients_CreatedDate';
END

-- 输液计划表索引
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_InfusionSchedules_CustomerID')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_InfusionSchedules_CustomerID] ON [dbo].[InfusionSchedules] ([CustomerID]);
    PRINT '✓ 索引创建完成: IX_InfusionSchedules_CustomerID';
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_InfusionSchedules_InfusionDate')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_InfusionSchedules_InfusionDate] ON [dbo].[InfusionSchedules] ([InfusionDate]);
    PRINT '✓ 索引创建完成: IX_InfusionSchedules_InfusionDate';
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_InfusionSchedules_Status')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_InfusionSchedules_Status] ON [dbo].[InfusionSchedules] ([InfusionStatus]);
    PRINT '✓ 索引创建完成: IX_InfusionSchedules_Status';
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_InfusionSchedules_CustomerID_Date_Status')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_InfusionSchedules_CustomerID_Date_Status] ON [dbo].[InfusionSchedules] ([CustomerID], [InfusionDate], [InfusionStatus]);
    PRINT '✓ 索引创建完成: IX_InfusionSchedules_CustomerID_Date_Status';
END

-- 报告表索引
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Reports_CustomerID')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Reports_CustomerID] ON [dbo].[Reports] ([CustomerID]);
    PRINT '✓ 索引创建完成: IX_Reports_CustomerID';
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Reports_ReportDate')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Reports_ReportDate] ON [dbo].[Reports] ([ReportDate]);
    PRINT '✓ 索引创建完成: IX_Reports_ReportDate';
END

-- 医学影像表索引
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_MedicalImages_CustomerID')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_MedicalImages_CustomerID] ON [dbo].[MedicalImages] ([CustomerID]);
    PRINT '✓ 索引创建完成: IX_MedicalImages_CustomerID';
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_MedicalImages_UploadDate')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_MedicalImages_UploadDate] ON [dbo].[MedicalImages] ([UploadDate]);
    PRINT '✓ 索引创建完成: IX_MedicalImages_UploadDate';
END

-- 用户表索引
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Users_Username')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Users_Username] ON [dbo].[Users] ([Username]);
    PRINT '✓ 索引创建完成: IX_Users_Username';
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Users_Status')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Users_Status] ON [dbo].[Users] ([Status]);
    PRINT '✓ 索引创建完成: IX_Users_Status';
END

-- =====================================================================================
-- 6. 全文索引（可选，用于文本搜索）
-- =====================================================================================

PRINT '创建全文索引...';

-- 启用全文搜索
IF NOT EXISTS (SELECT 1 FROM sys.fulltext_catalogs WHERE name = 'FT_HealthRecordSystem')
BEGIN
    CREATE FULLTEXT CATALOG [FT_HealthRecordSystem] AS DEFAULT;
    PRINT '✓ 全文目录创建完成: FT_HealthRecordSystem';
END

-- 客户表全文索引
IF NOT EXISTS (SELECT 1 FROM sys.fulltext_indexes WHERE object_id = OBJECT_ID('[dbo].[Customers]'))
BEGIN
    CREATE FULLTEXT INDEX ON [dbo].[Customers]([Name], [Address], [EmergencyContact])
    KEY INDEX PK_Customers;
    PRINT '✓ 全文索引创建完成: Customers';
END

-- 治疗计划全文索引
IF NOT EXISTS (SELECT 1 FROM sys.fulltext_indexes WHERE object_id = OBJECT_ID('[dbo].[TreatmentPlans]'))
BEGIN
    CREATE FULLTEXT INDEX ON [dbo].[TreatmentPlans]([PlanName], [PlanDetails])
    KEY INDEX PK_TreatmentPlans;
    PRINT '✓ 全文索引创建完成: TreatmentPlans';
END

-- 健康评估全文索引
IF NOT EXISTS (SELECT 1 FROM sys.fulltext_indexes WHERE object_id = OBJECT_ID('[dbo].[HealthAssessments]'))
BEGIN
    CREATE FULLTEXT INDEX ON [dbo].[HealthAssessments]([AssessmentDetails])
    KEY INDEX PK_HealthAssessments;
    PRINT '✓ 全文索引创建完成: HealthAssessments';
END

PRINT '✓ 所有索引和约束创建完成';

-- =====================================================================================
-- 7. 索引和约束验证
-- =====================================================================================

PRINT '验证索引和约束...';

DECLARE @TotalIndexes INT = (SELECT COUNT(*) FROM sys.indexes WHERE is_hypothetical = 0);
DECLARE @TotalConstraints INT = (
    SELECT COUNT(*) FROM sys.check_constraints
    UNION ALL
    SELECT COUNT(*) FROM sys.foreign_keys
    UNION ALL
    SELECT COUNT(*) FROM sys.key_constraints WHERE type = 'UQ'
);

PRINT '✓ 索引总数: ' + CAST(@TotalIndexes AS NVARCHAR);
PRINT '✓ 约束总数: ' + CAST(@TotalConstraints AS NVARCHAR);
PRINT '✓ 索引和约束验证完成';
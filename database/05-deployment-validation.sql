-- =====================================================================================
-- 干细胞治疗档案管理系统 - 部署验证脚本
-- 版本: 1.0.0
-- 日期: 2025-10-05
-- 用途: 验证数据库部署是否成功，检查所有组件完整性
-- =====================================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

USE [HealthRecordSystem];

PRINT '====================================================================================';
PRINT '干细胞治疗档案管理系统 - 部署验证开始';
PRINT '验证时间: ' + CONVERT(NVARCHAR, GETDATE(), 120);
PRINT '====================================================================================';

-- =====================================================================================
-- 1. 数据库基本信息验证
-- =====================================================================================

PRINT '1. 数据库基本信息验证...';

DECLARE @DBName NVARCHAR(100) = DB_NAME();
DECLARE @DBSize DECIMAL(10,2) = (
    SELECT SUM(size * 8.0 / 1024) FROM sys.master_files
    WHERE database_id = DB_ID()
);
DECLARE @DBCollation NVARCHAR(100) = DATABASEPROPERTYEX(@DBName, 'Collation');
DECLARE @DBRecoveryModel NVARCHAR(100) = DATABASEPROPERTYEX(@DBName, 'Recovery');

PRINT '✓ 数据库名称: ' + @DBName;
PRINT '✓ 数据库大小: ' + CAST(@DBSize AS NVARCHAR) + ' MB';
PRINT '✓ 数据库排序规则: ' + @DBCollation;
PRINT '✓ 数据库恢复模式: ' + @DBRecoveryModel;

-- 验证排序规则是否正确
IF @DBCollation = 'Chinese_PRC_CI_AS'
BEGIN
    PRINT '✓ 数据库排序规则正确';
END
ELSE
BEGIN
    PRINT '⚠ 警告: 数据库排序规则不是 Chinese_PRC_CI_AS，可能影响中文排序';
END

-- =====================================================================================
-- 2. 表结构验证
-- =====================================================================================

PRINT '';
PRINT '2. 表结构验证...';

-- 预期的核心表列表
DECLARE @ExpectedTables TABLE (TableName NVARCHAR(100), IsRequired BIT);
INSERT INTO @ExpectedTables VALUES
('Users', 1), ('Customers', 1), ('HealthAssessments', 1), ('StemCellPatients', 1),
('TreatmentPlans', 1), ('InfusionSchedules', 1), ('Reports', 1), ('MedicalImages', 1),
('Departments', 1), ('DiseaseTypes', 1), ('SystemConfigs', 1);

-- 检查表是否存在
DECLARE @MissingTables TABLE (TableName NVARCHAR(100));
DECLARE @ExtraTables TABLE (TableName NVARCHAR(100));

-- 查找缺失的表
INSERT INTO @MissingTables
SELECT et.TableName
FROM @ExpectedTables et
LEFT JOIN sys.tables t ON et.TableName = t.name
WHERE t.name IS NULL AND et.IsRequired = 1;

-- 查找多余的表
INSERT INTO @ExtraTables
SELECT t.name
FROM sys.tables t
LEFT JOIN @ExpectedTables et ON t.name = et.TableName
WHERE et.TableName IS NULL AND t.is_ms_shipped = 0;

-- 报告验证结果
IF EXISTS (SELECT 1 FROM @MissingTables)
BEGIN
    PRINT '❌ 发现缺失的核心表:';
    SELECT TableName AS '缺失的表' FROM @MissingTables;
END
ELSE
BEGIN
    PRINT '✓ 所有核心表都已创建';
END

IF EXISTS (SELECT 1 FROM @ExtraTables)
BEGIN
    PRINT 'ℹ 发现额外的表:';
    SELECT TableName AS '额外的表' FROM @ExtraTables;
END

-- 详细表结构检查
DECLARE @TableCount INT = (SELECT COUNT(*) FROM sys.tables WHERE is_ms_shipped = 0);
PRINT '✓ 总共创建了 ' + CAST(@TableCount AS NVARCHAR) + ' 个用户表';

-- =====================================================================================
-- 3. 约束验证
-- =====================================================================================

PRINT '';
PRINT '3. 约束验证...';

-- 主键约束验证
DECLARE @PKCount INT = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE CONSTRAINT_TYPE = 'PRIMARY KEY');
PRINT '✓ 主键约束数量: ' + CAST(@PKCount AS NVARCHAR);

-- 外键约束验证
DECLARE @FKCount INT = (SELECT COUNT(*) FROM sys.foreign_keys);
PRINT '✓ 外键约束数量: ' + CAST(@FKCount AS NVARCHAR);

-- 唯一约束验证
DECLARE @UQCount INT = (SELECT COUNT(*) FROM sys.key_constraints WHERE type = 'UQ');
PRINT '✓ 唯一约束数量: ' + CAST(@UQCount AS NVARCHAR);

-- CHECK约束验证
DECLARE @CheckCount INT = (SELECT COUNT(*) FROM sys.check_constraints);
PRINT '✓ CHECK约束数量: ' + CAST(@CheckCount AS NVARCHAR);

-- 验证关键约束是否存在
DECLARE @CriticalConstraints TABLE (ConstraintName NVARCHAR(100), ConstraintType NVARCHAR(50));
INSERT INTO @CriticalConstraints VALUES
('PK_Users', '主键'), ('PK_Customers', '主键'), ('UQ_Customers_IdentityCard', '唯一'),
('UQ_Users_Username', '唯一'), ('FK_HealthAssessments_Customers', '外键'),
('FK_StemCellPatients_Customers', '外键'), ('CK_Customers_Age', 'CHECK'),
('CK_Customers_Gender', 'CHECK'), ('CK_Users_Role', 'CHECK');

DECLARE @MissingConstraints TABLE (ConstraintName NVARCHAR(100), ConstraintType NVARCHAR(50));

INSERT INTO @MissingConstraints
SELECT cc.ConstraintName, cc.ConstraintType
FROM @CriticalConstraints cc
LEFT JOIN sys.objects o ON cc.ConstraintName = o.name
WHERE o.name IS NULL;

IF EXISTS (SELECT 1 FROM @MissingConstraints)
BEGIN
    PRINT '⚠ 发现缺失的关键约束:';
    SELECT ConstraintName AS '缺失的约束', ConstraintType AS '约束类型' FROM @MissingConstraints;
END
ELSE
BEGIN
    PRINT '✓ 所有关键约束都已创建';
END

-- =====================================================================================
-- 4. 索引验证
-- =====================================================================================

PRINT '';
PRINT '4. 索引验证...';

DECLARE @TotalIndexes INT = (SELECT COUNT(*) FROM sys.indexes WHERE is_hypothetical = 0);
DECLARE @ClusteredIndexes INT = (SELECT COUNT(*) FROM sys.indexes WHERE type = 1);
DECLARE @NonClusteredIndexes INT = (SELECT COUNT(*) FROM sys.indexes WHERE type = 2);

PRINT '✓ 索引总数: ' + CAST(@TotalIndexes AS NVARCHAR);
PRINT '✓ 聚集索引数量: ' + CAST(@ClusteredIndexes AS NVARCHAR);
PRINT '✓ 非聚集索引数量: ' + CAST(@NonClusteredIndexes AS NVARCHAR);

-- 验证关键索引是否存在
DECLARE @CriticalIndexes TABLE (IndexName NVARCHAR(100), TableName NVARCHAR(100));
INSERT INTO @CriticalIndexes VALUES
('IX_Customers_IdentityCard', 'Customers'), ('IX_Customers_Name', 'Customers'),
('IX_HealthAssessments_CustomerID', 'HealthAssessments'), ('IX_InfusionSchedules_CustomerID', 'InfusionSchedules'),
('IX_Users_Username', 'Users'), ('IX_Customers_Phone', 'Customers');

DECLARE @MissingIndexes TABLE (IndexName NVARCHAR(100), TableName NVARCHAR(100));

INSERT INTO @MissingIndexes
SELECT ci.IndexName, ci.TableName
FROM @CriticalIndexes ci
LEFT JOIN sys.indexes i ON ci.IndexName = i.name
WHERE i.name IS NULL;

IF EXISTS (SELECT 1 FROM @MissingIndexes)
BEGIN
    PRINT '⚠ 发现缺失的关键索引:';
    SELECT IndexName AS '缺失的索引', TableName AS '表名' FROM @MissingIndexes;
END
ELSE
BEGIN
    PRINT '✓ 所有关键索引都已创建';
END

-- =====================================================================================
-- 5. 视图和存储过程验证
-- =====================================================================================

PRINT '';
PRINT '5. 视图和存储过程验证...';

-- 视图验证
DECLARE @ViewCount INT = (SELECT COUNT(*) FROM sys.views);
PRINT '✓ 视图数量: ' + CAST(@ViewCount AS NVARCHAR);

-- 验证关键视图是否存在
DECLARE @CriticalViews TABLE (ViewName NVARCHAR(100));
INSERT INTO @CriticalViews VALUES
('CustomerProfileCompleteness'), ('CustomerActivityStats'), ('TreatmentPlanExecution');

DECLARE @MissingViews TABLE (ViewName NVARCHAR(100));

INSERT INTO @MissingViews
SELECT cv.ViewName
FROM @CriticalViews cv
LEFT JOIN sys.views v ON cv.ViewName = v.name
WHERE v.name IS NULL;

IF EXISTS (SELECT 1 FROM @MissingViews)
BEGIN
    PRINT '⚠ 发现缺失的关键视图:';
    SELECT ViewName AS '缺失的视图' FROM @MissingViews;
END
ELSE
BEGIN
    PRINT '✓ 所有关键视图都已创建';
END

-- 存储过程验证
DECLARE @ProcCount INT = (SELECT COUNT(*) FROM sys.procedures WHERE is_ms_shipped = 0);
PRINT '✓ 存储过程数量: ' + CAST(@ProcCount AS NVARCHAR);

-- 验证关键存储过程是否存在
DECLARE @CriticalProcs TABLE (ProcName NVARCHAR(100));
INSERT INTO @CriticalProcs VALUES
('CreateCustomer'), ('GetCustomerStatistics'), ('GetSystemStatistics'), ('CreateInfusionSchedule');

DECLARE @MissingProcs TABLE (ProcName NVARCHAR(100));

INSERT INTO @MissingProcs
SELECT cp.ProcName
FROM @CriticalProcs cp
LEFT JOIN sys.procedures p ON cp.ProcName = p.name
WHERE p.name IS NULL;

IF EXISTS (SELECT 1 FROM @MissingProcs)
BEGIN
    PRINT '⚠ 发现缺失的关键存储过程:';
    SELECT ProcName AS '缺失的存储过程' FROM @MissingProcs;
END
ELSE
BEGIN
    PRINT '✓ 所有关键存储过程都已创建';
END

-- =====================================================================================
-- 6. 数据完整性验证
-- =====================================================================================

PRINT '';
PRINT '6. 数据完整性验证...';

-- 验证用户数据
DECLARE @UsersCount INT = (SELECT COUNT(*) FROM [dbo].[Users]);
DECLARE @AdminUserExists BIT = CASE WHEN EXISTS (SELECT 1 FROM [dbo].[Users] WHERE Username = 'admin') THEN 1 ELSE 0 END;

PRINT '✓ 用户记录数量: ' + CAST(@UsersCount AS NVARCHAR);
IF @AdminUserExists = 1
    PRINT '✓ 默认管理员用户存在';
ELSE
    PRINT '❌ 默认管理员用户不存在';

-- 验证基础数据
DECLARE @DeptsCount INT = (SELECT COUNT(*) FROM [dbo].[Departments]);
DECLARE @DiseasesCount INT = (SELECT COUNT(*) FROM [dbo].[DiseaseTypes]);
DECLARE @PlansCount INT = (SELECT COUNT(*) FROM [dbo].[TreatmentPlans]);
DECLARE @ConfigsCount INT = (SELECT COUNT(*) FROM [dbo].[SystemConfigs]);

PRINT '✓ 部门数据数量: ' + CAST(@DeptsCount AS NVARCHAR);
PRINT '✓ 疾病类型数量: ' + CAST(@DiseasesCount AS NVARCHAR);
PRINT '✓ 治疗计划模板数量: ' + CAST(@PlansCount AS NVARCHAR);
PRINT '✓ 系统配置数量: ' + CAST(@ConfigsCount AS NVARCHAR);

-- 验证数据一致性
DECLARE @CustomersWithInvalidID INT = (
    SELECT COUNT(*) FROM [dbo].[Customers]
    WHERE IdentityCard IS NULL OR LEN(IdentityCard) != 18
);
DECLARE @UsersWithInvalidRole INT = (
    SELECT COUNT(*) FROM [dbo].[Users]
    WHERE Role NOT IN ('admin', 'manager', 'user')
);

IF @CustomersWithInvalidID = 0
    PRINT '✓ 所有客户身份证号格式正确';
ELSE
    PRINT '⚠ 发现 ' + CAST(@CustomersWithInvalidID AS NVARCHAR) + ' 个身份证号格式错误的客户记录';

IF @UsersWithInvalidRole = 0
    PRINT '✓ 所有用户角色有效';
ELSE
    PRINT '⚠ 发现 ' + CAST(@UsersWithInvalidRole AS NVARCHAR) + ' 个角色无效的用户记录';

-- =====================================================================================
-- 7. 权限验证
-- =====================================================================================

PRINT '';
PRINT '7. 权限验证...';

-- 检查数据库所有者
DECLARE @DBOwner NVARCHAR(100) = SUSER_NAME();
PRINT '✓ 数据库所有者: ' + @DBOwner;

-- 检查用户权限
DECLARE @UserPermissions TABLE (UserName NVARCHAR(100), PermissionType NVARCHAR(100));

INSERT INTO @UserPermissions
SELECT
    dp.name AS UserName,
    permission_name AS PermissionType
FROM sys.database_permissions p
JOIN sys.database_principals dp ON p.grantee_principal_id = dp.principal_id
WHERE dp.type = 'S' -- SQL用户
AND dp.name NOT IN ('dbo', 'guest', 'INFORMATION_SCHEMA', 'sys');

IF EXISTS (SELECT 1 FROM @UserPermissions)
BEGIN
    PRINT 'ℹ 用户权限配置:';
    SELECT UserName AS '用户名', PermissionType AS '权限类型' FROM @UserPermissions;
END
ELSE
BEGIN
    PRINT 'ℹ 未发现自定义用户权限配置，使用默认权限';
END

-- =====================================================================================
-- 8. 性能基准测试
-- =====================================================================================

PRINT '';
PRINT '8. 性能基准测试...';

-- 测试基本查询性能
DECLARE @StartTime DATETIME = GETDATE();

-- 测试客户查询
DECLARE @TestCustomerCount INT;
SELECT @TestCustomerCount = COUNT(*) FROM [dbo].[Customers];

DECLARE @CustomerQueryTime INT = DATEDIFF(MILLISECOND, @StartTime, GETDATE());

-- 测试连接查询
SET @StartTime = GETDATE();

DECLARE @TestJoinCount INT;
SELECT @TestJoinCount = COUNT(*)
FROM [dbo].[Customers] c
LEFT JOIN [dbo].[HealthAssessments] ha ON c.ID = ha.CustomerID
LEFT JOIN [dbo].[StemCellPatients] sc ON c.ID = sc.CustomerID;

DECLARE @JoinQueryTime INT = DATEDIFF(MILLISECOND, @StartTime, GETDATE());

-- 测试视图查询
SET @StartTime = GETDATE();

DECLARE @TestViewCount INT;
SELECT @TestViewCount = COUNT(*) FROM [dbo].[CustomerProfileCompleteness];

DECLARE @ViewQueryTime INT = DATEDIFF(MILLISECOND, @StartTime, GETDATE());

PRINT '✓ 客户表查询时间: ' + CAST(@CustomerQueryTime AS NVARCHAR) + ' 毫秒';
PRINT '✓ 连接查询时间: ' + CAST(@JoinQueryTime AS NVARCHAR) + ' 毫秒';
PRINT '✓ 视图查询时间: ' + CAST(@ViewQueryTime AS NVARCHAR) + ' 毫秒';

-- 性能评估
IF @CustomerQueryTime < 100 AND @JoinQueryTime < 500 AND @ViewQueryTime < 200
BEGIN
    PRINT '✓ 数据库性能良好';
END
ELSE
BEGIN
    PRINT '⚠ 数据库性能可能需要优化';
END

-- =====================================================================================
-- 9. 验证总结
-- =====================================================================================

PRINT '';
PRINT '====================================================================================';
PRINT '部署验证总结';
PRINT '====================================================================================';

-- 计算总体健康度评分
DECLARE @ValidationScore INT = 100;

-- 减分项
IF EXISTS (SELECT 1 FROM @MissingTables) SET @ValidationScore = @ValidationScore - 30;
IF EXISTS (SELECT 1 FROM @MissingConstraints) SET @ValidationScore = @ValidationScore - 20;
IF EXISTS (SELECT 1 FROM @MissingIndexes) SET @ValidationScore = @ValidationScore - 15;
IF EXISTS (SELECT 1 FROM @MissingViews) SET @ValidationScore = @ValidationScore - 10;
IF EXISTS (SELECT 1 FROM @MissingProcs) SET @ValidationScore = @ValidationScore - 10;
IF @AdminUserExists = 0 SET @ValidationScore = @ValidationScore - 15;
IF @DBCollation != 'Chinese_PRC_CI_AS' SET @ValidationScore = @ValidationScore - 5;

PRINT '验证评分: ' + CAST(@ValidationScore AS NVARCHAR) + '/100';

IF @ValidationScore >= 90
BEGIN
    PRINT '✅ 部署验证通过 - 系统可以正常使用';
END
ELSE IF @ValidationScore >= 70
BEGIN
    PRINT '⚠️  部署基本通过 - 建议修复发现的问题';
END
ELSE
BEGIN
    PRINT '❌ 部署验证失败 - 必须修复关键问题后重新验证';
END

PRINT '';
PRINT '验证完成时间: ' + CONVERT(NVARCHAR, GETDATE(), 120);

-- 输出关键信息
PRINT '';
PRINT '系统访问信息:';
PRINT '管理员账户: admin / admin123';
PRINT '数据库连接信息:';
PRINT '服务器: ' + @@SERVERNAME;
PRINT '数据库: ' + @DBName;
PRINT '排序规则: ' + @DBCollation;

PRINT '====================================================================================';
PRINT '验证脚本执行完成';
PRINT '====================================================================================';
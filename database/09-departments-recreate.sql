-- =============================================================================
-- 科室管理模块重建脚本
-- 创建全新的、更健全的科室数据库表结构
-- 日期: 2025-10-06
-- =============================================================================

-- 步骤1: 删除现有有问题的Departments表（如果存在）
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Departments')
BEGIN
    PRINT '正在删除现有的Departments表...'

    -- 先删除相关的外键约束（如果存在）
    DECLARE @sql NVARCHAR(MAX)
    DECLARE cur CURSOR FOR
        SELECT 'ALTER TABLE [' + OBJECT_SCHEMA_NAME(parent_object_id) + '].[' + OBJECT_NAME(parent_object_id) + '] DROP CONSTRAINT [' + name + ']' AS sql_cmd
        FROM sys.foreign_keys
        WHERE referenced_object_id = OBJECT_ID('Departments')

    OPEN cur
    FETCH NEXT FROM cur INTO @sql
    WHILE @@FETCH_STATUS = 0
    BEGIN
        EXEC (@sql)
        PRINT '删除外键约束: ' + @sql
        FETCH NEXT FROM cur INTO @sql
    END
    CLOSE cur
    DEALLOCATE cur

    -- 删除表
    DROP TABLE Departments
    PRINT 'Departments表已删除'
END
ELSE
BEGIN
    PRINT 'Departments表不存在，跳过删除步骤'
END

GO

-- 步骤2: 创建新的健全的Departments表结构
PRINT '正在创建新的Departments表...'

CREATE TABLE Departments (
    -- 主键：使用整数ID，避免uniqueidentifier的复杂性
    DepartmentID INT IDENTITY(1,1) PRIMARY KEY,

    -- 基本信息字段
    DepartmentCode NVARCHAR(20) NOT NULL UNIQUE,
    DepartmentName NVARCHAR(100) NOT NULL UNIQUE,
    DepartmentType NVARCHAR(20) NOT NULL DEFAULT 'general',

    -- 描述和备注
    Description NVARCHAR(500) NULL,
    Notes NVARCHAR(1000) NULL,

    -- 状态和排序
    Status NVARCHAR(20) NOT NULL DEFAULT 'active',
    SortOrder INT NOT NULL DEFAULT 0,

    -- 审计字段
    IsActive BIT NOT NULL DEFAULT 1,

    -- 时间戳字段
    CreatedAt DATETIME2(3) NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME2(3) NOT NULL DEFAULT GETDATE(),
    CreatedBy NVARCHAR(100) NULL,
    UpdatedBy NVARCHAR(100) NULL,

    -- 版本控制字段
    Version INT NOT NULL DEFAULT 1
)

GO

-- 步骤3: 创建索引以提高查询性能
PRINT '正在创建索引...'

-- 科室编码唯一索引（已在表定义中创建）
-- 科室名称唯一索引（已在表定义中创建）

-- 类型索引
CREATE INDEX IX_Departments_Type ON Departments(DepartmentType)
GO

-- 状态索引
CREATE INDEX IX_Departments_Status ON Departments(Status)
GO

-- 排序索引
CREATE INDEX IX_Departments_SortOrder ON Departments(SortOrder)
GO

-- 创建时间索引
CREATE INDEX IX_Departments_CreatedAt ON Departments(CreatedAt)
GO

-- 复合索引：类型+状态
CREATE INDEX IX_Departments_Type_Status ON Departments(DepartmentType, Status)
GO

-- 步骤4: 创建触发器以自动更新时间戳
PRINT '正在创建触发器...'

CREATE TRIGGER TR_Departments_Update
ON Departments
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Departments
    SET UpdatedAt = GETDATE(),
        UpdatedBy = SUSER_SNAME(),
        Version = Version + 1
    WHERE DepartmentID IN (SELECT DepartmentID FROM inserted);
END
GO

-- 步骤5: 插入默认数据
PRINT '正在插入默认科室数据...'

INSERT INTO Departments (DepartmentCode, DepartmentName, DepartmentType, Description, Status, SortOrder)
VALUES
    ('LAB_001', '检验科', 'laboratory', '负责各类检验检测工作', 'active', 1),
    ('LAB_002', '生化检验室', 'laboratory', '负责生化检验项目', 'active', 2),
    ('LAB_003', '免疫检验室', 'laboratory', '负责免疫检验项目', 'active', 3),
    ('GEN_001', '内科', 'general', '综合内科诊疗科室', 'active', 10),
    ('GEN_002', '外科', 'general', '综合外科诊疗科室', 'active', 11),
    ('GEN_003', '儿科', 'general', '儿童专科诊疗科室', 'active', 12),
    ('IMG_001', '放射科', 'imaging', '医学影像诊断科室', 'active', 20),
    ('IMG_002', '超声科', 'imaging', '超声诊断科室', 'active', 21),
    ('IMG_003', 'CT室', 'imaging', 'CT影像诊断科室', 'active', 22)

PRINT '默认科室数据插入完成'

GO

-- 步骤6: 验证表结构
PRINT '正在验证表结构...'

-- 显示表的基本信息
SELECT
    TABLE_NAME = 'Departments',
    TABLE_TYPE = CASE
        WHEN OBJECT_ID('dbo.Departments') IS NOT NULL THEN '用户表'
        ELSE '未知'
    END,
    CREATE_DATE = OBJECT_SCHEMA_NAME(OBJECT_ID('dbo.Departments')) + '.' + OBJECT_NAME(OBJECT_ID('dbo.Departments')),
    ROW_COUNT = (SELECT COUNT(*) FROM Departments)
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME = 'Departments'

GO

-- 显示表结构
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Departments'
ORDER BY ORDINAL_POSITION

GO

-- 显示插入的数据
SELECT TOP 10
    DepartmentID,
    DepartmentCode,
    DepartmentName,
    DepartmentType,
    Status,
    SortOrder,
    CreatedAt
FROM Departments
ORDER BY SortOrder, DepartmentName

GO

PRINT '============================================================================'
PRINT '科室管理模块重建完成！'
PRINT '新的Departments表已创建，包含健全的字段结构和索引'
PRINT '============================================================================'
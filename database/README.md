# 干细胞治疗档案管理系统 - 数据库初始化脚本

## 概述

本目录包含干细胞治疗档案管理系统的完整数据库初始化脚本，用于新项目的部署和配置。

## 脚本文件说明

### 1. 01-database-init.sql
**主要数据库初始化脚本**
- 创建数据库和基本配置
- 删除所有测试数据和历史表
- 创建核心业务表结构
- 实现数据完整性约束
- 插入基础初始化数据

**功能特点:**
- 支持完整重新初始化
- 自动错误处理和回滚
- 详细的执行日志
- 数据完整性验证

### 2. 02-views-and-procedures.sql
**视图和存储过程脚本**
- 创建业务统计视图
- 实现核心存储过程
- 提供数据分析功能
- 优化复杂查询

**主要组件:**
- `CustomerProfileCompleteness` - 客户档案完整度视图
- `CustomerActivityStats` - 客户活动统计视图
- `TreatmentPlanExecution` - 治疗计划执行视图
- `CreateCustomer` - 创建客户存储过程
- `GetCustomerStatistics` - 获取客户统计信息
- `GetSystemStatistics` - 系统统计信息
- `CreateInfusionSchedule` - 批量创建输液计划

### 3. 03-indexes-and-constraints.sql
**索引和约束优化脚本**
- 性能优化索引
- 数据完整性约束
- 外键关系定义
- 全文搜索索引

**优化内容:**
- 主键和外键约束
- 唯一性约束
- CHECK约束
- 非聚集索引
- 全文索引

### 4. 04-initial-data.sql
**基础数据初始化脚本**
- 系统用户数据
- 部门信息
- 疾病类型
- 治疗计划模板
- 系统配置参数

**初始化内容:**
- 默认管理员账户 (admin/admin123)
- 示例用户账户
- 12个标准部门
- 15种常见疾病类型
- 5个治疗计划模板
- 10项系统配置

### 5. 05-deployment-validation.sql
**部署验证脚本**
- 数据库结构完整性检查
- 约束和索引验证
- 数据一致性检查
- 性能基准测试
- 部署评分系统

## 部署说明

### 环境要求
- SQL Server 2016 或更高版本
- 至少 1GB 可用磁盘空间
- 具备 CREATE DATABASE 权限
- 支持中文排序规则 (Chinese_PRC_CI_AS)

### 部署步骤

1. **连接到 SQL Server**
   ```sql
   -- 使用 SQL Server Management Studio 或 sqlcmd
   ```

2. **执行主初始化脚本**
   ```sql
   -- 执行 01-database-init.sql
   -- 这将创建数据库并初始化基础结构
   ```

3. **创建视图和存储过程**
   ```sql
   -- 执行 02-views-and-procedures.sql
   ```

4. **优化索引和约束**
   ```sql
   -- 执行 03-indexes-and-constraints.sql
   ```

5. **初始化基础数据**
   ```sql
   -- 执行 04-initial-data.sql
   ```

6. **验证部署**
   ```sql
   -- 执行 05-deployment-validation.sql
   -- 检查验证结果，确保评分 ≥ 90
   ```

### 一次性完整部署
如果需要一次性完成所有部署，可以按顺序执行所有脚本：

```sql
-- 在 SQL Server Management Studio 中
-- 1. 打开 01-database-init.sql 并执行
-- 2. 打开 02-views-and-procedures.sql 并执行
-- 3. 打开 03-indexes-and-constraints.sql 并执行
-- 4. 打开 04-initial-data.sql 并执行
-- 5. 打开 05-deployment-validation.sql 并执行
```

## 默认账户信息

| 用户名 | 密码 | 角色 | 说明 |
|--------|------|------|------|
| admin | admin123 | admin | 系统管理员 |
| manager | manager123 | manager | 部门经理 |
| user | user123 | user | 普通用户 |

⚠️ **安全提示**: 部署后请立即修改默认密码

## 数据库架构

### 核心业务表
- `Users` - 系统用户
- `Customers` - 客户档案 (核心入口)
- `HealthAssessments` - 健康评估
- `StemCellPatients` - 干细胞患者
- `TreatmentPlans` - 治疗计划
- `InfusionSchedules` - 输液计划
- `Reports` - 报告
- `MedicalImages` - 医学影像

### 基础数据表
- `Departments` - 部门信息
- `DiseaseTypes` - 疾病类型
- `SystemConfigs` - 系统配置

### 关键特性
- **身份证号唯一绑定** - 所有业务数据通过身份证号关联
- **客户档案核心制** - 必须先建立客户档案才能进行其他操作
- **完整数据追踪** - 支持多次健康评估、干细胞治疗等记录
- **统计分析支持** - 以身份证号为基本统计单位

## 故障排除

### 常见问题

1. **排序规则错误**
   ```
   解决方案: 确保数据库使用 Chinese_PRC_CI_AS 排序规则
   ```

2. **权限不足**
   ```
   解决方案: 使用具有 sysadmin 权限的账户执行脚本
   ```

3. **磁盘空间不足**
   ```
   解决方案: 确保至少有 1GB 可用空间
   ```

4. **脚本执行失败**
   ```
   解决方案: 检查 SQL Server 版本，确保支持使用的功能
   ```

### 验证检查

执行 `05-deployment-validation.sql` 后，检查以下关键指标：

- 验证评分应 ≥ 90
- 所有核心表都应存在
- 默认管理员账户必须存在
- 关键约束和索引应正确创建
- 基础数据应正确初始化

## 维护说明

### 定期维护
- 执行数据库备份
- 更新统计信息
- 重建索引
- 清理日志文件

### 数据备份
```sql
-- 完整备份
BACKUP DATABASE [HealthRecordSystem]
TO DISK = 'C:\Backup\HealthRecordSystem.bak'
WITH FORMAT, INIT;

-- 差异备份
BACKUP DATABASE [HealthRecordSystem]
TO DISK = 'C:\Backup\HealthRecordSystem_diff.bak'
WITH DIFFERENTIAL;
```

### 性能监控
- 监控查询性能
- 检查索引使用情况
- 观察数据库大小增长
- 跟踪连接数量

## 版本历史

- **v1.0.0** (2025-10-05) - 初始版本
  - 完整数据库结构
  - 核心业务功能
  - 基础数据初始化
  - 部署验证脚本

## 联系信息

如有问题或建议，请联系系统管理员。

---
**注意**: 本脚本专用于干细胞治疗档案管理系统，未经授权不得用于其他项目。
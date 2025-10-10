# PDF转换服务配置指南

## 概述

系统支持两种方式配置PDF转换服务的IP和端口，以适应不同的部署环境和需求。

## 配置方式

### 方式1: 完整URL配置 (推荐)

在 `.env` 文件中设置：

```bash
PDF_CONVERT_URL=http://localhost:4000/convert
PDF_CONVERT_TIMEOUT=30000
```

**适用场景**:
- 单一PDF服务实例
- 开发环境快速配置
- 生产环境固定服务地址

### 方式2: 分别配置IP和端口

在 `.env` 文件中设置：

```bash
PDF_HOST=localhost
PDF_PORT=4000
PDF_CONVERT_TIMEOUT=30000
```

**适用场景**:
- 需要动态配置服务地址
- 容器化部署环境
- 多环境配置管理
- 服务发现集成

## 环境配置示例

### 开发环境 (Development)
```bash
# 本地开发
PDF_HOST=localhost
PDF_PORT=4000
PDF_CONVERT_TIMEOUT=30000
```

### 测试环境 (Testing)
```bash
# 测试服务器
PDF_CONVERT_URL=http://test-pdf-server:4000/convert
PDF_CONVERT_TIMEOUT=60000
```

### 生产环境 (Production)
```bash
# 生产服务器集群
PDF_HOST=pdf-service.prod.company.com
PDF_PORT=4000
PDF_CONVERT_TIMEOUT=120000
```

### Docker部署
```bash
# Docker容器间通信
PDF_HOST=pdf-service
PDF_PORT=4000
PDF_CONVERT_TIMEOUT=60000
```

### 负载均衡环境
```bash
# 负载均衡器
PDF_CONVERT_URL=https://pdf-loadbalancer.company.com/convert
PDF_CONVERT_TIMEOUT=120000
```

## 配置参数说明

| 参数 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| `PDF_CONVERT_URL` | 否 | `http://localhost:4000/convert` | PDF服务的完整URL |
| `PDF_HOST` | 否 | `localhost` | PDF服务的主机名或IP地址 |
| `PDF_PORT` | 否 | `4000` | PDF服务的端口号 |
| `PDF_CONVERT_TIMEOUT` | 否 | `30000` | 请求超时时间(毫秒) |

## 配置优先级

1. **高优先级**: `PDF_CONVERT_URL` - 如果设置了这个参数，将忽略 `PDF_HOST` 和 `PDF_PORT`
2. **低优先级**: `PDF_HOST` + `PDF_PORT` - 只有在没有设置 `PDF_CONVERT_URL` 时才生效

## 故障排除

### 1. 服务连接失败
检查配置的URL或IP端口是否正确：
```bash
# 测试连接
curl http://localhost:4000/convert
```

### 2. 超时问题
增加超时时间：
```bash
PDF_CONVERT_TIMEOUT=120000  # 2分钟
```

### 3. 容器环境
确保容器间网络连通性：
```bash
# 检查容器网络
docker network ls
docker network connect app-network pdf-service
```

## 安全注意事项

1. **HTTPS配置**: 生产环境建议使用HTTPS
   ```bash
   PDF_CONVERT_URL=https://pdf-service.company.com/convert
   ```

2. **访问控制**: 确保PDF服务只允许内部网络访问

3. **端口管理**: 避免使用默认端口，减少安全风险

## 监控和日志

PDF服务会自动记录以下信息：
- 服务可用性检查
- 请求响应时间
- 转换成功/失败状态
- 错误详情和堆栈信息

查看日志：
```bash
# 查看应用日志
tail -f logs/application.log | grep PDF
```

## 升级指南

从旧版本升级时：

1. 保持现有 `PDF_CONVERT_URL` 配置不变
2. 新版本将自动兼容现有配置
3. 如需使用新的配置方式，可参考上面的示例
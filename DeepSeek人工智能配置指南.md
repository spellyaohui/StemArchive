# DeepSeek API 配置指南

## 概述
本系统集成了DeepSeek AI API来生成智能健康评估报告。为了使用此功能，您需要正确配置DeepSeek API。

## 配置步骤

### 1. 获取API Key
1. 访问 [DeepSeek Platform](https://platform.deepseek.com/api_keys)
2. 注册/登录您的账户
3. 创建新的API Key
4. 复制生成的API Key

### 2. 配置环境变量
在 `backend` 目录下创建 `.env` 文件（如果不存在），并添加以下配置：

```env
# DeepSeek API配置
DEEPSEEK_API_KEY=sk-your-actual-api-key-here
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

**重要说明：**
- 将 `sk-your-actual-api-key-here` 替换为您从DeepSeek平台获取的真实API Key
- API Key通常以 `sk-` 开头
- 请勿将API Key提交到版本控制系统

### 3. 重启后端服务
```bash
cd backend
npm run dev
```

### 4. 验证配置
启动后端服务后，如果配置正确，您应该不会看到警告信息。如果看到以下警告，请检查配置：

```
DeepSeek API Key未配置，请在环境变量中设置DEEPSEEK_API_KEY
```

## 配置参数说明

| 参数 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| `DEEPSEEK_API_KEY` | ✅ | - | 您的DeepSeek API密钥 |
| `DEEPSEEK_BASE_URL` | ❌ | `https://api.deepseek.com` | API基础URL |
| `DEEPSEEK_MODEL` | ❌ | `deepseek-chat` | 使用的AI模型 |

## 可用模型

- `deepseek-chat` - 通用对话模型（推荐）
- `deepseek-reasoner` - 推理增强模型

## 使用功能

配置完成后，您可以：

1. 登录系统
2. 进入"报告查看"页面
3. 选择"健康评估"类型
4. 选择检客和体检报告
5. 点击"生成报告"开始AI健康评估

## 故障排除

### 问题1：API Key未配置
**症状：** 后端日志显示警告信息
**解决方案：** 确保在 `.env` 文件中正确设置了 `DEEPSEEK_API_KEY`

### 问题2：API调用失败
**症状：** 前端显示"生成健康评估失败"
**解决方案：**
1. 检查API Key是否有效
2. 确认网络连接正常
3. 查看后端日志获取详细错误信息

### 问题3：生成超时
**症状：** 长时间无响应
**解决方案：**
1. 检查网络连接
2. DeepSeek API可能响应较慢，请耐心等待
3. 系统支持异步处理，会自动轮询状态

## 安全提示

- 🔒 请勿将API Key暴露在客户端代码中
- 🔒 定期轮换您的API Key
- 🔒 监控API使用量，避免超限
- 🔒 在生产环境中使用环境变量管理敏感信息

## 费用说明

- DeepSeek API按token使用量计费
- 系统会记录每次API调用的token消耗
- 建议设置预算提醒以控制成本

## 技术支持

如遇到技术问题，请：
1. 检查后端日志文件
2. 确认配置参数正确性
3. 访问 [DeepSeek API文档](https://api-docs.deepseek.com/zh-cn/) 获取最新信息

---

*配置完成后，系统即可使用AI技术为检客生成专业的健康评估报告。*
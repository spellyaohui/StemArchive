# PDF 渲染说明

当前版本统一使用**系统内置渲染**（Puppeteer）完成 Markdown -> PDF。

## 结论

- 不再使用外部 PDF 转换 API。
- 不需要配置 `PDF_CONVERT_URL` / `PDF_HOST` / `PDF_PORT` / `PDF_CONVERT_TIMEOUT`。
- 健康评估、对比分析、治疗总结均走同一内置渲染流程。

## 运维提示

- 确保运行环境可启动 headless Chromium。
- 渲染异常时，优先查看后端日志中的 `PDF生成失败` 错误信息。
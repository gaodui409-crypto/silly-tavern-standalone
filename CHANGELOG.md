# 更新记录

## v2.0.0 (2026-03-08)

### 安全修复

- 删除前端硬编码的 API Key 和 CORS 代理地址
- 新建 apiProxy.ts 统一 AI 请求入口，支持 proxy/preset/direct 三种 API 模式
- API Key 改为存储在后端环境变量，前端通过 /api/presets 获取预设列表（不暴露 Key）

### 新功能：日记生成（合并 diary-weaver 项目）

- 新增聊天记录输入源：支持 SillyTavern JSONL 格式导入，自动解析角色名/用户名
- 新增任务类型选择：角色提取 / 分卷总结 / 角色日记 三种模式
- 角色日记：以角色第一人称视角生成日记，4 种风格预设（日常温馨/文学叙事/简洁备忘/自定义）
- NSFW 开关：控制是否在提示词中添加内容保留指令
- 日记结果持久化存储并可批量导出为 TXT

### 世界书导出增强

- 新增日记条目导出（position=At Depth, constant=true）
- 导出选项按内容类型分组：数据表类、总结类、日记类各自独立设置 depth/position/selective/constant
- 日记结果展示面板：预览、展开、单篇导出、批量导出

### Bug 修复

- 修复 ConcurrentQueue 错误跳过导致后续缓存结果丢失的问题（改为 null 占位 + 顺序 flush）
- 补全已有角色更新逻辑（status/relationship 变化时追加备注记录）
- 分卷总结改用 ConcurrentQueue，支持暂停和取消

### UI 调整

- 侧边栏精简为：导入 / 数据库 / 结果 / 设置
- 流程进度条步骤 ② 根据任务类型动态显示名称
- API 设置改为 proxy/preset/direct 三选一 RadioGroup

### 其他

- Dockerfile 统一使用 npm（删除 bun.lock/bun.lockb）
- ApiConfig 类型删除 corsProxy 字段

## [0.3.0] - 2026-03-08

### 新增
- **数据持久化**: Zustand persist 切换为 IndexedDB，支持大数据量，新增"清除所有数据"按钮
- **AI 角色提取**: 导入文本后逐块调用 AI 提取角色，支持并行处理（1-10并发），按顺序写入，暂停/继续
- **角色提取提示词**: 提示词设置新增"角色提取"标签页，支持自定义模板
- **世界书导出**: SillyTavern 格式 JSON 导出，支持表选择、预览、depth/selective 设置
- **工作流进度条**: 顶部 5 步引导（导入→提取→数据库→总结→导出）
- **导入增强**: 拖拽上传、粘贴文本、分块预览弹窗、错误记录面板
- **后端代理**: FastAPI 代理服务 + Dockerfile + docker-compose.yml（自部署用）

### 问题记录
- localStorage 容量限制 → 改用 IndexedDB + fallback
- 并行请求需顺序写入 → 基于 index 的缓冲队列
- AI 返回格式不稳定 → 自动清理 markdown 代码块包裹

## [0.2.0] - 2026-03-07

### 新增
- 集成公共 CORS 代理（corsproxy.io、allorigins）
- API 设置中新增代理选择器
- 分卷总结 API 调用支持 CORS 代理

### 问题记录
- 浏览器 CORS 限制 → 公共代理绕过
- 代理稳定性 → 多代理选项

## [0.1.0] - 2026-03-06

### 功能
- 小说文本导入与自动分块
- 基于阶段的角色追踪系统（9张默认表）
- 内置测试 API + 示例演示模式
- Zustand 状态管理 + 分卷总结 + 提示词模板

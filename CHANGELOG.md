# 更新记录

## [0.2.0] - 2026-03-08

### 新增
- **CORS代理功能**：集成公共CORS代理服务（corsproxy.io、allorigins），解决浏览器跨域限制
- **代理选择器**：在API设置中新增CORS代理下拉菜单，支持多个代理服务切换
- **代理支持的API调用**：体积总结API、自定义API端点现已支持通过代理转发

### 修复
- 修复了直接调用 `inference.canopywave.io` API 时因浏览器CORS策略被阻止的问题

### 技术细节
- `ApiConfig` 类型新增 `corsProxy` 字段
- `handleTestConnection` 函数更新，自动使用配置的代理包装URL
- `MergePanel` 组件的 `callSummaryAPI` 函数现支持代理转发

### 已知问题 & 限制
- 公共CORS代理可能存在速率限制，生产环境建议使用自己的代理或支持CORS的API服务
- 某些代理服务的稳定性可能不同，若遇到连接问题可切换至其他代理选项
- 通过代理转发会增加请求延迟

---

## [0.1.0] - 2026-03

### 初始版本功能
- ✨ 小说导入与拆分：支持长篇小说文本导入和按字符数智能拆分
- 👤 角色追踪系统：主角表、重要人物表，支持阶段标识和状态变化
- 📊 数据表格管理：可视化表格编辑器，支持多种数据表类型
- 🔗 世界书导出：一键导出为世界书格式，支持数据合并
- ⚙️ 提示词配置：自定义AI提示词模板、API设置、生成参数调整
- 🎨 现代UI设计：采用shadcn/ui组件库和Tailwind CSS

### 技术栈
- React 18 + TypeScript
- Vite 构建工具
- Tailwind CSS 样式
- shadcn/ui 组件库
- Zustand 状态管理
- Framer Motion 动画库

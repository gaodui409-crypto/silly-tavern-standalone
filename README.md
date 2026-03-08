# TavernDB — 小说角色提取 & SillyTavern 世界书生成工具

从小说文本或 SillyTavern 聊天记录中，用 AI 自动提取角色信息、生成分卷总结和角色日记，一键导出为 SillyTavern 世界书。

## ✨ 功能特性

- **双输入源**：小说文本（TXT/MD）和 SillyTavern 聊天记录（JSONL）
- **三种 AI 任务**：角色提取（结构化 JSON → 数据表）、分卷总结（剧情概要 + 角色图鉴）、角色日记（第一人称，4 种风格预设）
- **并行处理**：可配置并发数 1-10，请求并行但数据按顺序写入
- **9 张数据表**：全局数据、主角信息、重要人物、技能、背包、任务、总结表、总体大纲、选项表，均可自定义编辑
- **世界书导出**：符合 SillyTavern 世界书 JSON 格式，按内容类型分组设置 depth/position/selective/constant
- **数据持久化**：Zustand + IndexedDB，刷新不丢失
- **Docker 一键部署**：FastAPI 后端代理解决 CORS，API Key 存后端环境变量不暴露给前端

## 🚀 部署方式

### 方式一：Docker（推荐）

```bash
docker run -d --name taverndb -p 7892:7892 \
  -e TEST_API_URL=https://your-api-url/v1 \
  -e TEST_API_KEY=your-key \
  -e TEST_MODEL=your-model \
  --restart unless-stopped \
  ghcr.io/gaodui409-crypto/silly-tavern-standalone:latest
```

打开 `http://IP:7892`，在设置中选择"预设 API"模式即可使用。

### 方式二：Docker Compose

```yaml
version: "3.8"

services:
  taverndb:
    build: .
    ports:
      - "7892:7892"
    environment:
      - TEST_API_URL=https://your-api-url/v1
      - TEST_API_KEY=your-key
      - TEST_MODEL=your-model
    restart: unless-stopped
```

### 方式三：本地开发

```bash
git clone https://github.com/gaodui409-crypto/silly-tavern-standalone.git
cd silly-tavern-standalone
npm install
npm run dev          # 前端 localhost:8080

# 另一个终端
cd server
pip install -r requirements.txt
python main.py  # 后端 localhost:7892
```

## 📖 使用流程

打开页面后进入导入面板，选择输入源（小说文本或聊天记录），上传文件后系统自动分块。选择任务类型（角色提取/分卷总结/角色日记），点击开始。处理完成后到数据库面板查看和编辑提取的角色数据，到结果面板查看总结和日记。最后在世界书导出区域选择要导出的数据表和结果，设置参数后下载 JSON 文件，导入 SillyTavern 即可使用。

## ⚙️ API 模式说明

设置页面提供三种 API 模式。「预设 API」使用部署时通过环境变量配置的 API，Key 不暴露给前端。「后端代理」可填写任意 OpenAI 兼容 API 的地址和 Key，请求经后端转发避免 CORS 问题。「直连」适用于本地部署的 Ollama 等不存在 CORS 限制的模型。

## 🛠️ 技术栈

- **前端**：React 18 + TypeScript + Vite + Tailwind + shadcn/ui
- **后端代理**：Python FastAPI + httpx
- **持久化**：Zustand + IndexedDB
- **部署**：Docker 多阶段构建

## 📜 更新记录

详见 [CHANGELOG.md](./CHANGELOG.md)

## 📄 License

MIT

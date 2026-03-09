# ============================================
# TavernDB - 多阶段构建 Dockerfile
# ============================================

# Stage 1: 构建前端
FROM node:20-slim AS frontend-builder

WORKDIR /app
COPY package.json bun.lock* ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Python 后端 + 前端静态文件
FROM python:3.11-slim

WORKDIR /app

# 安装 Python 依赖
COPY server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制后端代码
COPY server/ .

# 从前端构建阶段复制产物
COPY --from=frontend-builder /app/dist ./dist

# 环境变量
ENV PORT=7892
ENV STATIC_DIR=./dist

EXPOSE $PORT

CMD ["python", "main.py"]

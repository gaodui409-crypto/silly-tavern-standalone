"""
TavernDB API Proxy Server
轻量后端代理，解决浏览器 CORS 限制问题

用法：
  pip install -r requirements.txt
  python main.py

或使用 Docker:
  docker-compose up -d
"""

import os
import json
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
import httpx

app = FastAPI(title="TavernDB Proxy", version="1.0.0")

# CORS 配置 - 允许前端访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 环境变量配置
PORT = int(os.getenv("PORT", "7892"))
TEST_API_URL = os.getenv("TEST_API_URL", "")
TEST_API_KEY = os.getenv("TEST_API_KEY", "")
TEST_MODEL = os.getenv("TEST_MODEL", "moonshotai/kimi-k2.5")


@app.post("/api/proxy/chat/completions")
async def proxy_chat(request: Request):
    """
    API 代理转发
    前端将目标 API 地址和密钥放在请求体中，
    后端提取后转发请求，返回结果
    """
    try:
        body = await request.json()
        
        # 从请求体中提取代理参数
        target_url = body.pop("target_url", None)
        api_key = body.pop("api_key", None)
        
        if not target_url:
            return JSONResponse(
                status_code=400,
                content={"error": "缺少 target_url 参数"}
            )
        
        if not api_key:
            return JSONResponse(
                status_code=400,
                content={"error": "缺少 api_key 参数"}
            )
        
        # 构建转发 URL
        forward_url = f"{target_url}/chat/completions"
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        
        async with httpx.AsyncClient(timeout=300.0) as client:
            resp = await client.post(
                forward_url,
                json=body,
                headers=headers,
            )
        
        return Response(
            content=resp.content,
            status_code=resp.status_code,
            headers={"Content-Type": "application/json"},
        )
        
    except json.JSONDecodeError:
        return JSONResponse(
            status_code=400,
            content={"error": "无效的 JSON 请求体"}
        )
    except httpx.TimeoutException:
        return JSONResponse(
            status_code=504,
            content={"error": "代理请求超时（300秒）"}
        )
    except Exception as e:
        return JSONResponse(
            status_code=502,
            content={"error": f"代理转发失败: {str(e)}"}
        )


@app.get("/api/presets")
async def get_presets():
    """
    获取可用的预设 API 列表（不暴露 Key）
    """
    presets = []
    
    if TEST_API_URL:
        presets.append({
            "id": "test",
            "name": "测试API",
            "url": TEST_API_URL,
            "model": TEST_MODEL,
            "available": True,
        })
    
    return {"presets": presets}


@app.post("/api/presets/{preset_id}/chat/completions")
async def preset_chat(preset_id: str, request: Request):
    """
    使用预设 API 配置进行请求（Key 存在后端环境变量中）
    """
    if preset_id != "test" or not TEST_API_URL or not TEST_API_KEY:
        return JSONResponse(
            status_code=404,
            content={"error": "预设不存在或未配置"}
        )
    
    try:
        body = await request.json()
        
        if "model" not in body:
            body["model"] = TEST_MODEL
        
        forward_url = f"{TEST_API_URL}/chat/completions"
        
        async with httpx.AsyncClient(timeout=300.0) as client:
            resp = await client.post(
                forward_url,
                json=body,
                headers={
                    "Authorization": f"Bearer {TEST_API_KEY}",
                    "Content-Type": "application/json",
                },
            )
        
        return Response(
            content=resp.content,
            status_code=resp.status_code,
            headers={"Content-Type": "application/json"},
        )
        
    except Exception as e:
        return JSONResponse(
            status_code=502,
            content={"error": f"预设 API 调用失败: {str(e)}"}
        )


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": "1.0.0"}


# 静态文件托管 - 前端构建产物
# 在 Docker 中，前端构建结果会被放在 /app/static 目录
STATIC_DIR = os.getenv("STATIC_DIR", "./dist")
if os.path.isdir(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=f"{STATIC_DIR}/assets"), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """SPA fallback - 所有未匹配的路由返回 index.html"""
        file_path = os.path.join(STATIC_DIR, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)

# ── Ensure .env is loaded as early as possible ──
import os
from pathlib import Path as _Path
from dotenv import load_dotenv as _load_dotenv

# Walk up to find .env in project root
_env_candidates = [
    _Path(__file__).resolve().parent.parent.parent / '.env',  # project root
    _Path.cwd() / '.env',
]
for _env_path in _env_candidates:
    if _env_path.exists():
        _load_dotenv(_env_path, override=True)
        break

# ── Guarantee critical env vars exist (protection against .env load failure) ──
for _key, _default in [
    ("OLLAMA_BASE_URL", "http://localhost:11434"),
    ("TAVILY_API_KEY", ""),
    ("DEEPSEEK_API_KEY", ""),
]:
    if _key not in os.environ:
        os.environ[_key] = _default

import json
from typing import Dict, List, Any
import time
import logging
import sys
import warnings
from pathlib import Path

# Suppress Pydantic V2 migration warnings
warnings.filterwarnings("ignore", message="Valid config keys have changed in V2")
warnings.filterwarnings("ignore", category=UserWarning, module="pydantic")

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, File, UploadFile, BackgroundTasks, HTTPException
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, HTMLResponse, Response
from pydantic import BaseModel, ConfigDict

# Add the parent directory to sys.path to make sure we can import from server
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

from server.websocket_manager import WebSocketManager
from server.server_utils import (
    get_config_dict, sanitize_filename,
    update_environment_variables, handle_file_upload, handle_file_deletion,
    execute_multi_agents, handle_websocket_communication
)
from server.agent_discovery import build_agent_discovery_document

from server.websocket_manager import run_agent
from utils import write_md_to_word, write_md_to_pdf
from gpt_researcher.utils.enum import Tone
from chat.chat import ChatAgentWithMemory

from server.report_store import ReportStore

# MongoDB services removed - no database persistence needed

# Setup logging
logger = logging.getLogger(__name__)

# Don't override parent logger settings
logger.propagate = True

# Silence uvicorn reload logs
logging.getLogger("uvicorn.supervisors.ChangeReload").setLevel(logging.WARNING)

# Models


class ResearchRequest(BaseModel):
    task: str
    report_type: str
    report_source: str
    tone: str
    headers: dict | None = None
    repo_name: str
    branch_name: str
    generate_in_background: bool = True


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="allow")  # Allow extra fields in the request
    
    report: str
    messages: List[Dict[str, Any]]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    os.makedirs("outputs", exist_ok=True)
    app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")
    
    # Mount frontend static files
    frontend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend")
    if os.path.exists(frontend_path):
        app.mount("/site", StaticFiles(directory=frontend_path), name="frontend")
        logger.debug(f"Frontend mounted from: {frontend_path}")
        
        # Also mount the static directory directly for assets referenced as /static/
        static_path = os.path.join(frontend_path, "static")
        if os.path.exists(static_path):
            app.mount("/static", StaticFiles(directory=static_path), name="static")
            logger.debug(f"Static assets mounted from: {static_path}")
    else:
        logger.warning(f"Frontend directory not found: {frontend_path}")
    
    logger.info("GPT Researcher API ready - local mode (no database persistence)")
    yield
    # Shutdown
    logger.info("Research API shutting down")

# App initialization
app = FastAPI(lifespan=lifespan)

# Configure allowed origins for CORS
allowed_origins_env = os.getenv("CORS_ALLOW_ORIGINS")
ALLOWED_ORIGINS = (
    [o.strip() for o in allowed_origins_env.split(",") if o.strip()]
    if allowed_origins_env
    else [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://app.gptr.dev",
    ]
)

# Standard JSON response - no custom MongoDB encoding needed

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Use default JSON response class

# Mount static files for frontend
# Get the absolute path to the frontend directory
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend"))

# Mount static directories
app.mount("/static", StaticFiles(directory=os.path.join(frontend_dir, "static")), name="static")
app.mount("/site", StaticFiles(directory=frontend_dir), name="site")

# WebSocket manager
manager = WebSocketManager()

report_store = ReportStore(Path(os.getenv('REPORT_STORE_PATH', os.path.join('data', 'reports.json'))))

# Constants
DOC_PATH = os.getenv("DOC_PATH", "./my-docs")

# Startup event


# Lifespan events now handled in the lifespan context manager above


# Routes
@app.get("/", response_class=HTMLResponse)
async def serve_frontend():
    """Serve the main frontend HTML page."""
    frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend"))
    index_path = os.path.join(frontend_dir, "index.html")
    
    if not os.path.exists(index_path):
        raise HTTPException(status_code=404, detail="Frontend index.html not found")
    
    with open(index_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    return HTMLResponse(content=content)


@app.get("/.well-known/agent-discovery.json")
async def agent_discovery(request: Request):
    """Advertise GPT Researcher services via the Agent Discovery Protocol."""
    origin = str(request.base_url).rstrip("/")
    domain = request.url.hostname or request.headers.get("host", "")
    contact = os.getenv("AGENT_DISCOVERY_CONTACT")

    document = build_agent_discovery_document(origin=origin, domain=domain, contact=contact)
    response = JSONResponse(content=document)
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response

@app.get("/report/{research_id}")
async def read_report(request: Request, research_id: str):
    docx_path = os.path.join('outputs', f"{research_id}.docx")
    if not os.path.exists(docx_path):
        return {"message": "Report not found."}
    return FileResponse(docx_path)


# Simplified API routes - no database persistence
@app.get("/api/reports")
async def get_all_reports(report_ids: str = None):
    report_ids_list = report_ids.split(",") if report_ids else None
    reports = await report_store.list_reports(report_ids_list)
    return {"reports": reports}


@app.get("/api/reports/{research_id}")
async def get_report_by_id(research_id: str):
    report = await report_store.get_report(research_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"report": report}


@app.post("/api/reports")
async def create_or_update_report(request: Request):
    try:
        data = await request.json()
        research_id = data.get("id", "temp_id")

        now_ms = int(time.time() * 1000)
        existing = await report_store.get_report(research_id)
        incoming_timestamp = data.get("timestamp")
        timestamp = incoming_timestamp if isinstance(incoming_timestamp, int) else now_ms
        if existing and isinstance(existing.get("timestamp"), int):
            timestamp = max(timestamp, existing["timestamp"])

        report = {
            "id": research_id,
            "question": data.get("question"),
            "answer": data.get("answer"),
            "orderedData": data.get("orderedData") or [],
            "chatMessages": data.get("chatMessages") or [],
            "timestamp": timestamp,
            "report_type": data.get("report_type") or (existing.get("report_type") if existing else None),
        }

        await report_store.upsert_report(research_id, report)
        return {"success": True, "id": research_id}
    except Exception as e:
        logger.error(f"Error processing report creation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/reports/{research_id}")
async def update_report(research_id: str, request: Request):
    existing = await report_store.get_report(research_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Report not found")

    data = await request.json()
    now_ms = int(time.time() * 1000)

    updated = {
        **existing,
        **{k: v for k, v in data.items() if v is not None},
        "id": research_id,
        "timestamp": now_ms,
    }

    await report_store.upsert_report(research_id, updated)
    return {"success": True, "id": research_id}


@app.delete("/api/reports/{research_id}")
async def delete_report(research_id: str):
    existed = await report_store.delete_report(research_id)
    if not existed:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"success": True}


@app.get("/api/reports/{research_id}/chat")
async def get_report_chat(research_id: str):
    report = await report_store.get_report(research_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"chatMessages": report.get("chatMessages") or []}


@app.post("/api/reports/{research_id}/chat")
async def add_report_chat_message(research_id: str, request: Request):
    report = await report_store.get_report(research_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")

    message = await request.json()
    chat_messages = report.get("chatMessages") or []
    if isinstance(chat_messages, list):
        chat_messages = [*chat_messages, message]
    else:
        chat_messages = [message]

    now_ms = int(time.time() * 1000)
    updated = {
        **report,
        "chatMessages": chat_messages,
        "timestamp": now_ms,
    }

    await report_store.upsert_report(research_id, updated)
    return {"success": True, "id": research_id}


async def write_report(research_request: ResearchRequest, research_id: str = None):
    report_information = await run_agent(
        task=research_request.task,
        report_type=research_request.report_type,
        report_source=research_request.report_source,
        source_urls=[],
        document_urls=[],
        tone=Tone[research_request.tone],
        websocket=None,
        stream_output=None,
        headers=research_request.headers,
        query_domains=[],
        config_path="",
        return_researcher=True
    )

    docx_path = await write_md_to_word(report_information[0], research_id)
    pdf_path = await write_md_to_pdf(report_information[0], research_id)
    if research_request.report_type != "multi_agents":
        report, researcher = report_information
        response = {
            "research_id": research_id,
            "research_information": {
                "source_urls": researcher.get_source_urls(),
                "research_costs": researcher.get_costs(),
                "visited_urls": list(researcher.visited_urls),
                "research_images": researcher.get_research_images(),
                # "research_sources": researcher.get_research_sources(),  # Raw content of sources may be very large
            },
            "report": report,
            "docx_path": docx_path,
            "pdf_path": pdf_path
        }
    else:
        response = { "research_id": research_id, "report": "", "docx_path": docx_path, "pdf_path": pdf_path }

    return response

@app.post("/report/")
async def generate_report(research_request: ResearchRequest, background_tasks: BackgroundTasks):
    research_id = sanitize_filename(f"task_{int(time.time())}_{research_request.task}")

    if research_request.generate_in_background:
        background_tasks.add_task(write_report, research_request=research_request, research_id=research_id)
        return {"message": "Your report is being generated in the background. Please check back later.",
                "research_id": research_id}
    else:
        response = await write_report(research_request, research_id)
        return response


@app.get("/files/")
async def list_files():
    if not os.path.exists(DOC_PATH):
        os.makedirs(DOC_PATH, exist_ok=True)

    # 尝试从 LibraryManager 获取带标签的文件列表
    try:
        from gpt_researcher.document_library import LibraryManager
        library = LibraryManager(DOC_PATH)
        docs = library.list_documents()
        # 同时返回 files（文件名列表，兼容旧前端）和 documents（带标签）
        files = [d["filename"] for d in docs]

        # 也包含目录中存在但未索引的文件
        all_files = [
            f for f in os.listdir(DOC_PATH)
            if os.path.isfile(os.path.join(DOC_PATH, f)) and not f.startswith(".")
        ]
        indexed_names = set(files)
        for f in all_files:
            if f not in indexed_names:
                docs.append({"filename": f, "primary_field": "", "subfields": [], "keywords": [], "summary": "", "chunks": 0, "status": "unindexed"})
                files.append(f)

        return {"files": files, "documents": docs}
    except Exception as e:
        logger.warning(f"LibraryManager 获取文件列表失败，降级: {e}")
        files = os.listdir(DOC_PATH)
        return {"files": files}


@app.post("/api/multi_agents")
async def run_multi_agents():
    return await execute_multi_agents(manager)


@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    return await handle_file_upload(file, DOC_PATH)


@app.delete("/files/{filename}")
async def delete_file(filename: str):
    return await handle_file_deletion(filename, DOC_PATH)


@app.get("/api/library/tags")
async def get_library_tags():
    """获取所有文献标签的聚合统计。"""
    try:
        from gpt_researcher.document_library import LibraryManager
        library = LibraryManager(DOC_PATH)
        tags = library.aggregate_tags()
        return tags
    except Exception as e:
        logger.error(f"获取标签统计失败: {e}")
        return {"primary_fields": {}, "subfields": {}, "keywords": {}}


@app.post("/api/library/reindex")
async def reindex_library(background_tasks: BackgroundTasks):
    """触发文献库全量重建（后台任务）。"""
    from gpt_researcher.document_library import LibraryManager

    async def _do_reindex():
        try:
            library = LibraryManager(DOC_PATH)
            await library.reindex_all()
            logger.info("文献库全量重建完成")
        except Exception as e:
            logger.error(f"文献库重建失败: {e}")

    background_tasks.add_task(_do_reindex)
    return {"message": "重建任务已启动，请稍后刷新查看结果"}


@app.get("/api/library/manifest/{filename}")
async def get_document_manifest(filename: str):
    """获取单篇文献的详细元信息。"""
    try:
        from gpt_researcher.document_library import LibraryManager
        library = LibraryManager(DOC_PATH)
        entry = library.list_documents()
        doc = next((d for d in entry if d.get("filename") == filename), None)
        if doc:
            return doc
        raise HTTPException(status_code=404, detail="文献未找到")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取文献详情失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── 文献库扩展接口 ──

@app.get("/api/library/documents")
async def get_library_documents():
    """获取全量文献元信息（含 user_tags）。"""
    try:
        from gpt_researcher.document_library import LibraryManager, UserTagsStore
        library = LibraryManager(DOC_PATH)
        docs = library.list_documents()

        # 同时包含目录中存在但未索引的文件
        all_files = [
            f for f in os.listdir(DOC_PATH)
            if os.path.isfile(os.path.join(DOC_PATH, f)) and not f.startswith(".")
        ] if os.path.isdir(DOC_PATH) else []
        indexed_names = {d["filename"] for d in docs}
        for f in all_files:
            if f not in indexed_names:
                docs.append({"filename": f, "primary_field": "", "subfields": [], "keywords": [], "summary": "", "chunks": 0, "status": "unindexed"})

        # 附加用户标签
        user_tags_store = UserTagsStore(DOC_PATH)
        all_assignments = user_tags_store.get_all_assignments()
        for doc in docs:
            doc["user_tags"] = all_assignments.get(doc["filename"], [])

        return {"documents": docs, "user_tags": user_tags_store.list_tags()}
    except Exception as e:
        logger.error(f"获取文献列表失败: {e}")
        return {"documents": [], "user_tags": []}


@app.patch("/api/library/documents/{filename}")
async def rename_document(filename: str, request: Request):
    """重命名文献。"""
    data = await request.json()
    new_name = data.get("new_name", "").strip()
    if not new_name:
        raise HTTPException(status_code=400, detail="新文件名不能为空")

    # 安全检查：防止路径穿越
    safe_old = os.path.basename(filename)
    safe_new = os.path.basename(new_name)
    if safe_new != new_name or ".." in new_name:
        raise HTTPException(status_code=400, detail="文件名不合法")

    old_path = os.path.join(DOC_PATH, safe_old)
    new_path = os.path.join(DOC_PATH, safe_new)
    if not os.path.isfile(old_path):
        raise HTTPException(status_code=404, detail="文件不存在")
    if os.path.exists(new_path):
        raise HTTPException(status_code=409, detail="目标文件名已存在")

    try:
        os.rename(old_path, new_path)
        # 更新 manifest
        from gpt_researcher.document_library import LibraryManager, UserTagsStore
        library = LibraryManager(DOC_PATH)
        entry = library._manifest.get(safe_old)
        if entry:
            library._manifest.remove(safe_old)
            entry["filename"] = safe_new
            library._manifest.upsert(entry)
        # 迁移用户标签
        UserTagsStore(DOC_PATH).rename_document(safe_old, safe_new)
        return {"message": "重命名成功", "old_name": safe_old, "new_name": safe_new}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"重命名失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/library/preview/{filename}")
async def preview_document(filename: str):
    """文件预览流（路径白名单防穿越）。"""
    safe_name = os.path.basename(filename)
    file_path = os.path.join(DOC_PATH, safe_name)
    # 安全检查：确保路径在 DOC_PATH 内
    real_doc = os.path.realpath(DOC_PATH)
    real_file = os.path.realpath(file_path)
    if not real_file.startswith(real_doc):
        raise HTTPException(status_code=403, detail="路径不合法")
    if not os.path.isfile(real_file):
        raise HTTPException(status_code=404, detail="文件不存在")

    # 根据扩展名选择 MIME
    ext = os.path.splitext(safe_name)[1].lower()
    mime_map = {
        ".pdf": "application/pdf",
        ".md": "text/markdown; charset=utf-8",
        ".txt": "text/plain; charset=utf-8",
        ".html": "text/html; charset=utf-8",
        ".csv": "text/csv; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }
    media_type = mime_map.get(ext, "application/octet-stream")
    return FileResponse(real_file, media_type=media_type, filename=safe_name)


class ExportRequest(BaseModel):
    filenames: List[str]
    format: str = "json"  # json | csv


@app.post("/api/library/export")
async def export_documents(req: ExportRequest):
    """导出选中文献的元信息为 JSON 或 CSV。"""
    try:
        from gpt_researcher.document_library import LibraryManager, UserTagsStore
        library = LibraryManager(DOC_PATH)
        all_docs = library.list_documents()
        user_tags_store = UserTagsStore(DOC_PATH)
        all_assignments = user_tags_store.get_all_assignments()

        selected = [d for d in all_docs if d["filename"] in req.filenames]
        for doc in selected:
            doc["user_tags"] = [t["name"] for t in all_assignments.get(doc["filename"], [])]

        if req.format == "csv":
            import csv
            import io
            output = io.StringIO()
            if selected:
                fieldnames = ["filename", "primary_field", "subfields", "keywords", "summary", "uploaded_at", "chunks", "status", "user_tags"]
                writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
                writer.writeheader()
                for doc in selected:
                    row = dict(doc)
                    row["subfields"] = "; ".join(row.get("subfields", []))
                    row["keywords"] = "; ".join(row.get("keywords", []))
                    row["user_tags"] = "; ".join(row.get("user_tags", []))
                    writer.writerow(row)
            csv_content = output.getvalue()
            return Response(
                content=csv_content,
                media_type="text/csv; charset=utf-8",
                headers={"Content-Disposition": "attachment; filename=library_export.csv"},
            )
        else:
            return {"documents": selected}
    except Exception as e:
        logger.error(f"导出失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── 用户标签 CRUD ──

@app.get("/api/library/user-tags")
async def list_user_tags():
    """列出所有用户标签。"""
    try:
        from gpt_researcher.document_library import UserTagsStore
        store = UserTagsStore(DOC_PATH)
        return {"tags": store.list_tags()}
    except Exception as e:
        logger.error(f"获取用户标签失败: {e}")
        return {"tags": []}


@app.post("/api/library/user-tags")
async def create_user_tag(request: Request):
    """创建用户标签。"""
    data = await request.json()
    name = data.get("name", "").strip()
    color = data.get("color")
    if not name:
        raise HTTPException(status_code=400, detail="标签名称不能为空")
    try:
        from gpt_researcher.document_library import UserTagsStore
        store = UserTagsStore(DOC_PATH)
        tag = store.create_tag(name, color)
        return {"tag": tag}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"创建用户标签失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/api/library/user-tags/{tag_id}")
async def update_user_tag(tag_id: str, request: Request):
    """更新用户标签。"""
    data = await request.json()
    try:
        from gpt_researcher.document_library import UserTagsStore
        store = UserTagsStore(DOC_PATH)
        tag = store.update_tag(tag_id, data.get("name"), data.get("color"))
        return {"tag": tag}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/api/library/user-tags/{tag_id}")
async def delete_user_tag(tag_id: str):
    """删除用户标签。"""
    from gpt_researcher.document_library import UserTagsStore
    store = UserTagsStore(DOC_PATH)
    ok = store.delete_tag(tag_id)
    if not ok:
        raise HTTPException(status_code=404, detail="标签不存在")
    return {"message": "已删除"}


@app.post("/api/library/user-tags/assign")
async def assign_user_tag(request: Request):
    """给文献贴/取消用户标签。"""
    data = await request.json()
    filename = data.get("filename", "")
    tag_id = data.get("tag_id", "")
    action = data.get("action", "assign")  # assign | unassign
    if not filename or not tag_id:
        raise HTTPException(status_code=400, detail="filename 和 tag_id 必填")
    try:
        from gpt_researcher.document_library import UserTagsStore
        store = UserTagsStore(DOC_PATH)
        if action == "unassign":
            store.unassign(filename, tag_id)
        else:
            store.assign(filename, tag_id)
        return {"message": "操作成功"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/library/taxonomy/fields")
async def extend_taxonomy(request: Request):
    """扩展系统词表（添加一级或二级领域）。"""
    data = await request.json()
    primary = data.get("primary_field", "").strip()
    subfield = data.get("subfield", "").strip()
    if not primary:
        raise HTTPException(status_code=400, detail="primary_field 必填")
    try:
        from gpt_researcher.document_library.taxonomy import load_taxonomy
        taxonomy = load_taxonomy(DOC_PATH)
        changed = False
        if primary not in taxonomy:
            taxonomy[primary] = []
            changed = True
        if subfield and subfield not in taxonomy[primary]:
            taxonomy[primary].append(subfield)
            changed = True
        if changed:
            import json as _json
            tax_path = os.path.join(DOC_PATH, ".index", "taxonomy.json")
            os.makedirs(os.path.dirname(tax_path), exist_ok=True)
            with open(tax_path, "w", encoding="utf-8") as f:
                _json.dump(taxonomy, f, ensure_ascii=False, indent=2)
        return {"message": "词表已更新", "taxonomy": taxonomy}
    except Exception as e:
        logger.error(f"更新词表失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        await handle_websocket_communication(websocket, manager)
    except WebSocketDisconnect as e:
        # Disconnect with more detailed logging about the WebSocket disconnect reason
        logger.info(f"WebSocket disconnected with code {e.code} and reason: '{e.reason}'")
        await manager.disconnect(websocket)
    except Exception as e:
        # More general exception handling
        logger.error(f"Unexpected WebSocket error: {str(e)}")
        await manager.disconnect(websocket)

@app.post("/api/chat")
async def chat(chat_request: ChatRequest):
    """Process a chat request with a report and message history.

    Args:
        chat_request: ChatRequest object containing report text and message history

    Returns:
        JSON response with the assistant's message and any tool usage metadata
    """
    try:
        logger.info(f"Received chat request with {len(chat_request.messages)} messages")

        # Create chat agent with the report
        chat_agent = ChatAgentWithMemory(
            report=chat_request.report,
            config_path="default",
            headers=None
        )

        # Process the chat and get response with metadata
        response_content, tool_calls_metadata = await chat_agent.chat(chat_request.messages, None)
        logger.info(f"response_content: {response_content}")
        logger.info(f"Got chat response of length: {len(response_content) if response_content else 0}")
        
        if tool_calls_metadata:
            logger.info(f"Tool calls used: {json.dumps(tool_calls_metadata)}")

        # Format response as a ChatMessage object with role, content, timestamp and metadata
        response_message = {
            "role": "assistant",
            "content": response_content,
            "timestamp": int(time.time() * 1000),  # Current time in milliseconds
            "metadata": {
                "tool_calls": tool_calls_metadata
            } if tool_calls_metadata else None
        }

        logger.info(f"Returning formatted response: {json.dumps(response_message)[:100]}...")
        return {"response": response_message}
    except Exception as e:
        logger.error(f"Error processing chat request: {str(e)}", exc_info=True)
        return {"error": str(e)}

@app.post("/api/reports/{research_id}/chat")
async def research_report_chat(research_id: str, request: Request):
    """Handle chat requests for a specific research report.
    Directly processes the raw request data to avoid validation errors.
    """
    try:
        # Get raw JSON data from request
        data = await request.json()
        
        # Create chat agent with the report
        chat_agent = ChatAgentWithMemory(
            report=data.get("report", ""),
            config_path="default",
            headers=None
        )

        # Process the chat and get response with metadata
        response_content, tool_calls_metadata = await chat_agent.chat(data.get("messages", []), None)
        
        if tool_calls_metadata:
            logger.info(f"Tool calls used: {json.dumps(tool_calls_metadata)}")

        # Format response as a ChatMessage object
        response_message = {
            "role": "assistant",
            "content": response_content,
            "timestamp": int(time.time() * 1000),
            "metadata": {
                "tool_calls": tool_calls_metadata
            } if tool_calls_metadata else None
        }

        return {"response": response_message}
    except Exception as e:
        logger.error(f"Error in research report chat: {str(e)}", exc_info=True)
        return {"error": str(e)}

@app.put("/api/reports/{research_id}")
async def update_report(research_id: str, request: Request):
    """Update a specific research report by ID - no database configured."""
    logger.debug(f"Update requested for report {research_id} - no database configured, not persisted")
    return {"success": True, "id": research_id}

@app.delete("/api/reports/{research_id}")
async def delete_report(research_id: str):
    """Delete a specific research report by ID - no database configured."""
    logger.debug(f"Delete requested for report {research_id} - no database configured, nothing to delete")
    return {"success": True, "id": research_id}

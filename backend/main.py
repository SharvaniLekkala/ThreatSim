import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv
from threats.threat_registry import get_threat_handler

# Always load .env from the same directory as this file
load_dotenv(dotenv_path=Path(__file__).parent / ".env")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"
    threat_id: str = "T1"

class PoisonRequest(BaseModel):
    text: str
    ttl_seconds: int = 0
    source: str = "user_injection"
    threat_id: str = "T1"

class MitigationRequest(BaseModel):
    enabled: bool
    threat_id: str = "T1"

class SnapshotRequest(BaseModel):
    snapshot_id: str
    threat_id: str = "T1"

class ThreatRequest(BaseModel):
    threat_id: str = "T1"

frontend_dir = Path(__file__).parent.parent / "frontend"

@app.post("/mitigation")
def toggle_mitigation(request: MitigationRequest):
    handler = get_threat_handler(request.threat_id)
    return handler.toggle_mitigation(request.enabled)

@app.post("/chat")
def chat_with_ai(request: ChatRequest):
    handler = get_threat_handler(request.threat_id)
    result = handler.chat(request.message, request.session_id)
    result["session_id"] = request.session_id
    result["threat_id"] = request.threat_id
    return result

@app.post("/poison")
def poison_memory(request: PoisonRequest):
    handler = get_threat_handler(request.threat_id)
    result = handler.inject_poison(request.text, request.source, request.ttl_seconds)
    if result.get("status") == "success":
        return result
    else:
        return JSONResponse(status_code=403, content=result)

@app.get("/status")
def get_memory_status(threat_id: str = "T1"):
    handler = get_threat_handler(threat_id)
    return handler.get_status()

@app.post("/clear")
def clear_memory(request: ThreatRequest):
    handler = get_threat_handler(request.threat_id)
    handler.clear()
    return {"status": "success", "message": f"Reset for {request.threat_id}"}

@app.post("/snapshot/create")
def create_snapshot(request: SnapshotRequest):
    handler = get_threat_handler(request.threat_id)
    handler.create_snapshot(request.snapshot_id)
    return {"status": "success", "message": f"Snapshot created."}

@app.post("/snapshot/restore")
def restore_snapshot(request: SnapshotRequest):
    handler = get_threat_handler(request.threat_id)
    if handler.restore_snapshot(request.snapshot_id):
        return {"status": "success", "message": f"Snapshot restored."}
    else:
        return JSONResponse(status_code=404, content={"status": "error", "message": "Snapshot not found."})

@app.post("/attack")
def run_attack(request: PoisonRequest):
    handler = get_threat_handler(request.threat_id)
    result = handler.inject_poison(request.text, request.source, request.ttl_seconds)
    result["threat_id"] = request.threat_id
    return result

@app.get("/chat")
def chat_ui():
    return FileResponse(frontend_dir / "chat.html")

@app.get("/attacker")
def attacker_ui():
    return FileResponse(frontend_dir / "attacker.html")

@app.get("/")
def home_ui():
    return FileResponse(frontend_dir / "index.html")

if frontend_dir.exists():
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

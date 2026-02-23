from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from .api import router
from .websocket import websocket_endpoint

app = FastAPI(
    title="AI Meishi API",
    description="AI-powered business card analysis and PDF generation",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router)

@app.websocket("/api/v1/preview/ws")
async def websocket_preview(websocket: WebSocket):
    await websocket_endpoint(websocket)

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/api/v1/health")
async def api_health_check():
    return {"status": "healthy", "version": "1.0.0"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

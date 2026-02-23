from fastapi import WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
import json
import asyncio
from typing import Dict

class WebSocketManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]

    async def send_personal_message(self, message: str, client_id: str):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections.values():
            await connection.send_text(message)

manager = WebSocketManager()

async def websocket_endpoint(websocket: WebSocket):
    client_id = f"client_{id(websocket)}"
    await manager.connect(websocket, client_id)
    
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            if message_data.get("type") == "preview":
                # プレビューHTMLを生成
                template = message_data["payload"]["template"]
                values = message_data["payload"]["values"]
                
                html = generate_preview_html(template, values)
                
                response = {
                    "type": "preview",
                    "html": html
                }
                
                await manager.send_personal_message(json.dumps(response), client_id)
                
    except WebSocketDisconnect:
        manager.disconnect(client_id)

def generate_preview_html(template: dict, values: dict) -> str:
    """名刺プレビューHTMLを生成"""
    width_mm = template.get("width_mm", 91)
    height_mm = template.get("height_mm", 55)
    
    # mmをpxに変換 (1mm = 3.7795px at 96dpi)
    width_px = int(width_mm * 3.7795)
    height_px = int(height_mm * 3.7795)
    
    html = f"""
    <div style="
        width: {width_px}px;
        height: {height_px}px;
        border: 1px solid #ccc;
        background: white;
        padding: 10px;
        font-family: Arial, sans-serif;
        position: relative;
    ">
    """
    
    # フィールドを配置
    for field in template.get("fields", []):
        key = field.get("key")
        if key in values and values[key]:
            x = field.get("x", 0)
            y = field.get("y", 0)
            font_size = field.get("fontSize", 12)
            font_weight = field.get("fontWeight", "normal")
            color = field.get("color", "#000000")
            
            html += f"""
            <div style="
                position: absolute;
                left: {x}px;
                top: {y}px;
                font-size: {font_size}px;
                font-weight: {font_weight};
                color: {color};
            ">
                {values[key]}
            </div>
            """
    
    html += "</div>"
    return html

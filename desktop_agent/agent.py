"""
desktop_agent/agent.py - JARVIS Local System Control Bridge

A lightweight local HTTP server running on port 5000 using only Python standard libraries.
Enables secure, allowlisted OS-level actions (Screen Lock, App Launch, System Diagnostics)
from the JARVIS web interface.
"""

import sys
import os
import json
import ctypes
import subprocess
from http.server import HTTPServer, BaseHTTPRequestHandler

PORT = 5000

# Allowlisted applications for safe launch
SAFE_APPS = {
    "notepad": ["notepad.exe"],
    "calculator": ["calc.exe"],
    "calc": ["calc.exe"],
    "explorer": ["explorer.exe"],
    "task manager": ["taskmgr.exe"],
    "taskmgr": ["taskmgr.exe"],
    "terminal": ["cmd.exe"],
    "cmd": ["cmd.exe"]
}

class JarvisBridgeHandler(BaseHTTPRequestHandler):
    def _set_cors_headers(self, status=200):
        self.send_response(status)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Type", "application/json")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_cors_headers(200)

    def do_GET(self):
        if self.path == "/api/system/status":
            self._set_cors_headers(200)
            response = {
                "status": "online",
                "bridge": "JARVIS Local PC Bridge",
                "platform": sys.platform,
                "version": "1.0.0"
            }
            self.wfile.write(json.dumps(response).encode("utf-8"))
        else:
            self._set_cors_headers(404)
            self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode("utf-8"))

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length) if content_length > 0 else b"{}"
        try:
            body = json.loads(post_data.decode("utf-8"))
        except Exception:
            body = {}

        # 1. Lock Workstation Endpoint
        if self.path == "/api/system/lock":
            try:
                if sys.platform == "win32":
                    ctypes.windll.user32.LockWorkStation()
                    self._set_cors_headers(200)
                    res = {"status": "success", "message": "Workstation locked successfully."}
                else:
                    self._set_cors_headers(400)
                    res = {"status": "error", "message": "Lock is currently supported on Windows."}
            except Exception as e:
                self._set_cors_headers(500)
                res = {"status": "error", "message": str(e)}
            self.wfile.write(json.dumps(res).encode("utf-8"))

        # 2. Launch Safe Application Endpoint
        elif self.path == "/api/system/app":
            app_key = str(body.get("app", "")).lower().strip()
            if app_key in SAFE_APPS:
                try:
                    subprocess.Popen(SAFE_APPS[app_key])
                    self._set_cors_headers(200)
                    res = {"status": "success", "message": f"Launched {app_key}."}
                except Exception as e:
                    self._set_cors_headers(500)
                    res = {"status": "error", "message": str(e)}
            else:
                self._set_cors_headers(400)
                res = {
                    "status": "error",
                    "message": f"App '{app_key}' is not in the safe allowlist ({', '.join(SAFE_APPS.keys())})."
                }
            self.wfile.write(json.dumps(res).encode("utf-8"))

        # 3. Volume Control Endpoint (Windows)
        elif self.path == "/api/system/volume":
            action = body.get("action", "mute") # mute, up, down
            try:
                if sys.platform == "win32":
                    # Virtual keycodes: 0xAD (Mute), 0xAE (Volume Down), 0xAF (Volume Up)
                    VK_VOLUME_MUTE = 0xAD
                    VK_VOLUME_DOWN = 0xAE
                    VK_VOLUME_UP = 0xAF
                    KEYEVENTF_EXTENDEDKEY = 0x0001
                    KEYEVENTF_KEYUP = 0x0002

                    vk_code = VK_VOLUME_MUTE
                    if action == "up":
                        vk_code = VK_VOLUME_UP
                    elif action == "down":
                        vk_code = VK_VOLUME_DOWN

                    ctypes.windll.user32.keybd_event(vk_code, 0, KEYEVENTF_EXTENDEDKEY, 0)
                    ctypes.windll.user32.keybd_event(vk_code, 0, KEYEVENTF_EXTENDEDKEY | KEYEVENTF_KEYUP, 0)

                    self._set_cors_headers(200)
                    res = {"status": "success", "message": f"Volume command '{action}' executed."}
                else:
                    self._set_cors_headers(400)
                    res = {"status": "error", "message": "Volume control is supported on Windows."}
            except Exception as e:
                self._set_cors_headers(500)
                res = {"status": "error", "message": str(e)}
            self.wfile.write(json.dumps(res).encode("utf-8"))

        else:
            self._set_cors_headers(404)
            self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode("utf-8"))

    def log_message(self, format, *args):
        # Clean server logging
        print(f"[JARVIS Bridge] {self.address_string()} - {format % args}")

def run_server():
    server_address = ("127.0.0.1", PORT)
    httpd = HTTPServer(server_address, JarvisBridgeHandler)
    print("==================================================")
    print("   JARVIS LOCAL PC CONTROL BRIDGE - ACTIVE")
    print("==================================================")
    print(f"   Listening on: http://127.0.0.1:{PORT}")
    print("   Endpoints:")
    print("   - GET  /api/system/status")
    print("   - POST /api/system/lock")
    print("   - POST /api/system/app (notepad, calc, etc.)")
    print("   - POST /api/system/volume (mute, up, down)")
    print("==================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[JARVIS Bridge] Shutting down...")
        httpd.server_close()

if __name__ == "__main__":
    run_server()

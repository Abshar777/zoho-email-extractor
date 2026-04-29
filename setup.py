"""
Zoho OAuth Setup Server
-----------------------
Works on LOCAL machine AND VPS (globally accessible).

Run: python3 setup.py

- Starts a FastAPI server on 0.0.0.0 (accessible from anywhere)
- Auto-detects your public IP
- Prints the Zoho auth URL — open it in your browser
- Catches the Zoho callback, exchanges for tokens
- Saves REFRESH_TOKEN + ACCESS_TOKEN to config.py automatically
"""
import re
import os
import socket
import urllib.parse
import webbrowser
import requests as http_requests
import uvicorn
import config

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse

app = FastAPI()

CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.py")

def get_public_ip():
    try:
        return http_requests.get("https://api.ipify.org", timeout=5).text.strip()
    except Exception:
        return None

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def build_auth_url(redirect_uri):
    params = {
        "scope": "ZohoMail.messages.READ,ZohoMail.accounts.READ",
        "client_id": config.CLIENT_ID,
        "response_type": "code",
        "access_type": "offline",
        "redirect_uri": redirect_uri,
    }
    return f"{config.ZOHO_ACCOUNTS_URL}/oauth/v2/auth?" + urllib.parse.urlencode(params)

@app.get("/api/v1/zoho/oauth/callback", response_class=HTMLResponse)
async def zoho_callback(request: Request):
    code = request.query_params.get("code")
    if not code:
        return HTMLResponse(
            "<h2 style='color:red;font-family:sans-serif'>❌ No code in callback URL</h2>",
            status_code=400
        )

    # Exchange code for tokens immediately
    resp = http_requests.post(f"{config.ZOHO_ACCOUNTS_URL}/oauth/v2/token", data={
        "code": code,
        "client_id": config.CLIENT_ID,
        "client_secret": config.CLIENT_SECRET,
        "redirect_uri": config.REDIRECT_URI,
        "grant_type": "authorization_code",
    })
    data = resp.json()

    access_token  = data.get("access_token", "")
    refresh_token = data.get("refresh_token", "")

    if not access_token:
        return HTMLResponse(
            f"<h2 style='color:red;font-family:sans-serif'>❌ Token exchange failed</h2><pre>{data}</pre>",
            status_code=400
        )

    # Save tokens to config.py
    with open(CONFIG_PATH, "r") as f:
        content = f.read()

    content = re.sub(r'ACCESS_TOKEN\s*=\s*".*?"',  f'ACCESS_TOKEN = "{access_token}"',  content)
    if refresh_token:
        content = re.sub(r'REFRESH_TOKEN\s*=\s*".*?"', f'REFRESH_TOKEN = "{refresh_token}"', content)

    with open(CONFIG_PATH, "w") as f:
        f.write(content)

    refresh_display = refresh_token if refresh_token else "(not returned — using access token)"

    return HTMLResponse(f"""
    <html><body style="font-family:sans-serif;padding:40px;max-width:700px">
        <h2 style="color:green">✅ Authentication successful!</h2>
        <p><b>Access Token</b> (saved):</p>
        <code style="background:#f0f0f0;padding:8px;display:block;word-break:break-all;font-size:12px">
            {access_token}
        </code>
        <p><b>Refresh Token</b> (saved):</p>
        <code style="background:#f0f0f0;padding:8px;display:block;word-break:break-all;font-size:12px">
            {refresh_display}
        </code>
        <br>
        <p>✅ Both tokens saved to <b>config.py</b> automatically.</p>
        <p>Now run: <code>python3 extractor.py</code></p>
    </body></html>
    """)

@app.get("/", response_class=HTMLResponse)
async def index():
    auth_url = build_auth_url(config.REDIRECT_URI)
    return HTMLResponse(f"""
    <html><body style="font-family:sans-serif;padding:40px;max-width:700px">
        <h2>Zoho Mail Extractor — OAuth Setup</h2>
        <p>Click the button below to authorize access to your Zoho Mail account:</p>
        <a href="{auth_url}" style="
            background:#1a73e8;color:white;padding:12px 24px;
            text-decoration:none;border-radius:6px;display:inline-block;font-size:16px
        ">🔐 Authorize Zoho Mail</a>
        <br><br>
        <p style="color:#888;font-size:13px">
            After authorizing, tokens will be saved to config.py automatically.
        </p>
    </body></html>
    """)

if __name__ == "__main__":
    port = int(config.REDIRECT_URI.split(":")[2].split("/")[0])
    public_ip = get_public_ip()
    local_ip  = get_local_ip()

    print("\n=== Zoho Mail Extractor — OAuth Setup Server ===\n")
    print(f"Server running on port {port} (0.0.0.0 — globally accessible)\n")

    if public_ip:
        print(f"🌐 Public URL  : http://{public_ip}:{port}/")
        print(f"🏠 Local URL   : http://localhost:{port}/")
    else:
        print(f"🏠 Local URL   : http://localhost:{port}/")
        print(f"🔌 Network URL : http://{local_ip}:{port}/")

    print("\n📌 Open one of the URLs above in your browser to start authorization.")
    print("   Tokens will be saved to config.py automatically after approval.\n")

    # Try to open browser (works on local, silently skips on VPS)
    try:
        webbrowser.open(f"http://localhost:{port}/")
    except Exception:
        pass

    uvicorn.run("setup:app", host="0.0.0.0", port=port, reload=False, log_level="warning")

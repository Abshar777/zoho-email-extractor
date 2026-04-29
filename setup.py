# oauth_server.py — run this on your VPS to catch the Zoho callback
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
import requests, re, os, uvicorn

app = FastAPI()

import config

@app.get("/api/v1/zoho/oauth/callback", response_class=HTMLResponse)
async def zoho_callback(request: Request):
    code = request.query_params.get("code")
    if not code:
        return HTMLResponse("<h2 style='color:red'>❌ No code in callback</h2>", status_code=400)

    # Exchange code for tokens
    resp = requests.post(f"{config.ZOHO_ACCOUNTS_URL}/oauth/v2/token", data={
        "code": code,
        "client_id": config.CLIENT_ID,
        "client_secret": config.CLIENT_SECRET,
        "redirect_uri": config.REDIRECT_URI,
        "grant_type": "authorization_code",
    })
    data = resp.json()

    if "refresh_token" not in data:
        return HTMLResponse(f"<h2 style='color:red'>❌ Error</h2><pre>{data}</pre>", status_code=400)

    refresh_token = data["refresh_token"]
    access_token = data.get("access_token", "")

    # Save tokens to config.py
    config_path = os.path.join(os.path.dirname(__file__), "config.py")
    with open(config_path, "r") as f:
        content = f.read()

    content = re.sub(r'REFRESH_TOKEN = ".*?"', f'REFRESH_TOKEN = "{refresh_token}"', content)
    if access_token:
        content = re.sub(r'ACCESS_TOKEN = ".*?"', f'ACCESS_TOKEN = "{access_token}"', content)

    with open(config_path, "w") as f:
        f.write(content)

    return HTMLResponse(f"""
    <html><body style="font-family:sans-serif;padding:40px">
    <h2 style="color:green">✅ Tokens saved to config.py!</h2>
    <p><b>Refresh Token:</b></p>
    <code style="background:#f0f0f0;padding:10px;display:block;word-break:break-all">{refresh_token}</code>
    <p>You can close this tab and run: <code>python3 extractor.py</code></p>
    </body></html>
    """)

if __name__ == "__main__":
    uvicorn.run("oauth_server:app", host="0.0.0.0", port=5001, reload=False)
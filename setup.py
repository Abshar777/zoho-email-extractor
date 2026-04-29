"""
Run this ONCE to get your Refresh Token.
It starts a local server, opens your browser automatically,
catches the redirect, and exchanges the code instantly.

Run: python3 setup.py
"""
import urllib.parse
import requests
import webbrowser
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
import config

refresh_token_result = {}

class CallbackHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)

        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.end_headers()

        code = params.get("code", [None])[0]
        if not code:
            self.wfile.write(b"<h2>Error: no code found in redirect.</h2>")
            return

        # Exchange code for tokens immediately
        resp = requests.post(f"{config.ZOHO_ACCOUNTS_URL}/oauth/v2/token", data={
            "code": code,
            "client_id": config.CLIENT_ID,
            "client_secret": config.CLIENT_SECRET,
            "redirect_uri": config.REDIRECT_URI,
            "grant_type": "authorization_code",
        })
        data = resp.json()

        if "access_token" in data:
            refresh_token_result["access_token"] = data["access_token"]
        if "refresh_token" in data:
            refresh_token_result["token"] = data["refresh_token"]
            html = f"""
            <html><body style="font-family:sans-serif;padding:40px">
            <h2 style="color:green">✅ Success! Refresh Token obtained.</h2>
            <p>Your refresh token:</p>
            <code style="background:#f0f0f0;padding:10px;display:block;word-break:break-all">
            {data['refresh_token']}
            </code>
            <p>You can close this tab. The token has been saved to config.py automatically.</p>
            </body></html>
            """.encode()
        else:
            html = f"""
            <html><body style="font-family:sans-serif;padding:40px">
            <h2 style="color:red">❌ Error exchanging code</h2>
            <pre>{data}</pre>
            </body></html>
            """.encode()

        self.wfile.write(html)
        # Stop server after handling
        threading.Thread(target=self.server.shutdown).start()

    def log_message(self, format, *args):
        pass  # suppress server logs

def main():
    print("\n=== Zoho Mail Extractor — One-Time Setup ===\n")

    auth_params = {
        "scope": "ZohoMail.messages.READ,ZohoMail.accounts.READ",
        "client_id": config.CLIENT_ID,
        "response_type": "code",
        "access_type": "offline",
        "redirect_uri": config.REDIRECT_URI,
    }
    auth_url = f"{config.ZOHO_ACCOUNTS_URL}/oauth/v2/auth?" + urllib.parse.urlencode(auth_params)

    port = int(config.REDIRECT_URI.split(":")[2].split("/")[0])
    print(f"Starting local server on port {port}...")
    server = HTTPServer(("localhost", port), CallbackHandler)

    print("Opening browser for Zoho authorization...")
    print(f"(If browser doesn't open, visit: {auth_url})\n")
    webbrowser.open(auth_url)

    print("Waiting for you to approve access in the browser...")
    server.serve_forever()

    if refresh_token_result:
        import re
        with open("config.py", "r") as f:
            content = f.read()

        if "token" in refresh_token_result:
            token = refresh_token_result["token"]
            content = re.sub(r'REFRESH_TOKEN = ".*?"', f'REFRESH_TOKEN = "{token}"', content)
            print(f"\n✅ Refresh Token: {token}")

        if "access_token" in refresh_token_result:
            at = refresh_token_result["access_token"]
            content = re.sub(r'ACCESS_TOKEN = ".*?"', f'ACCESS_TOKEN = "{at}"', content)
            print(f"✅ Access Token: {at[:30]}... (saved)")

        with open("config.py", "w") as f:
            f.write(content)

        print("\n✅ Tokens saved to config.py automatically!")
        print("Now run: python3 extractor.py")
    else:
        print("\n❌ Failed to get tokens. Try again.")

if __name__ == "__main__":
    main()

# Zoho Mail Extractor

Fetches your latest 1,000 Zoho emails and saves them to `zoho_emails.xlsx`.

## Setup

```bash
pip install -r requirements.txt
```

## Step 1 — Get Refresh Token (one-time)

```bash
python setup.py
```

- Open the URL in your browser
- Approve access
- Copy the `code` from the redirect URL
- Paste it into the terminal
- Copy the printed **Refresh Token**
- Open `config.py` and paste it into `REFRESH_TOKEN = "..."`

## Step 2 — Run the Extractor

```bash
python extractor.py
```

Output: `zoho_emails.xlsx` with columns:
- `#` — row number
- `Date` — sent date/time (UTC)
- `From` — sender address
- `To` — recipient(s)
- `CC` — CC recipients
- `Subject` — email subject
- `Body` — plain text body (first 5,000 chars)
- `Attachments` — attachment count

const ACCOUNTS_URL = "https://accounts.zoho.com";
const MAIL_API = "https://mail.zoho.com/api";

export interface ZohoCreds {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface ZohoEmail {
  messageId: string;
  subject: string;
  fromAddress: string;
  toAddress: string;
  ccAddress: string;
  sentDateInGMT: string;
  receivedTime: string;
  summary: string;
  hasAttachment: string;
  attachmentCount?: number;
  folderId: string;
  status: string;
  size: string;
}

export function getAuthUrl(creds: ZohoCreds) {
  const params = new URLSearchParams({
    scope: "ZohoMail.messages.READ,ZohoMail.accounts.READ",
    client_id: creds.clientId,
    response_type: "code",
    access_type: "offline",
    redirect_uri: creds.redirectUri,
  });
  return `${ACCOUNTS_URL}/oauth/v2/auth?${params}`;
}

export async function exchangeCode(creds: ZohoCreds, code: string) {
  const res = await fetch(`${ACCOUNTS_URL}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      redirect_uri: creds.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  return res.json();
}

export async function refreshAccessToken(creds: ZohoCreds, refreshToken: string) {
  const res = await fetch(`${ACCOUNTS_URL}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      grant_type: "refresh_token",
    }),
  });
  return res.json();
}

export async function getAccount(accessToken: string) {
  const res = await fetch(`${MAIL_API}/accounts`, {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
  });
  const data = await res.json();
  return data.data?.[0] ?? null;
}

export async function fetchEmailPage(
  accessToken: string,
  accountId: string,
  start: number,
  limit: number
): Promise<ZohoEmail[]> {
  const params = new URLSearchParams({
    start: String(start),
    limit: String(limit),
    sortorder: "false",
  });
  const res = await fetch(
    `${MAIL_API}/accounts/${accountId}/messages/view?${params}`,
    { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }
  );
  const data = await res.json();
  return (data.data as ZohoEmail[]) ?? [];
}

export async function fetchAllEmails(
  accessToken: string,
  accountId: string,
  onPage?: (count: number) => void
): Promise<ZohoEmail[]> {
  const all: ZohoEmail[] = [];
  let start = 1;
  const batch = 200;
  while (true) {
    const page = await fetchEmailPage(accessToken, accountId, start, batch);
    if (!page.length) break;
    all.push(...page);
    onPage?.(all.length);
    if (page.length < batch) break;
    start += batch;
  }
  return all;
}

export async function fetchEmailBody(
  accessToken: string,
  accountId: string,
  folderId: string,
  messageId: string,
  retries = 3
): Promise<string> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(
        `${MAIL_API}/accounts/${accountId}/folders/${folderId}/messages/${messageId}/content`,
        { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }
      );
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      const data = await res.json();
      const html = data.data?.content ?? "";
      return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 5000);
    } catch {
      if (attempt === retries - 1) return "";
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return "";
}

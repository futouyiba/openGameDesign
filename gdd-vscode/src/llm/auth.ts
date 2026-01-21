import * as vscode from 'vscode';
import * as http from 'http';
import * as crypto from 'crypto';

const CODEX_CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann';
const CODEX_ISSUER = 'https://auth.openai.com';
const CODEX_OAUTH_PORT = 1455;

export interface CodexTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  accountId?: string;
}

export type ProviderCredentials =
  | { type: 'apiKey'; apiKey: string }
  | { type: 'codex-oauth'; tokens: CodexTokens };

export async function getStoredCredentials(
  context: vscode.ExtensionContext,
  providerId: string
): Promise<ProviderCredentials | null> {
  const raw = await context.secrets.get(`gdd.llm.${providerId}.credentials`);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as ProviderCredentials;
  } catch {
    return null;
  }
}

export async function storeCredentials(
  context: vscode.ExtensionContext,
  providerId: string,
  credentials: ProviderCredentials
): Promise<void> {
  await context.secrets.store(`gdd.llm.${providerId}.credentials`, JSON.stringify(credentials));
}

export async function ensureApiKey(
  context: vscode.ExtensionContext,
  providerId: string,
  prompt: string
): Promise<string> {
  const existing = await getStoredCredentials(context, providerId);
  if (existing?.type === 'apiKey' && existing.apiKey) {
    return existing.apiKey;
  }

  const apiKey = await vscode.window.showInputBox({
    prompt,
    password: true,
    ignoreFocusOut: true
  });

  if (!apiKey) {
    throw new Error('需要配置 API Key 才能继续使用该模型');
  }

  await storeCredentials(context, providerId, { type: 'apiKey', apiKey });
  return apiKey;
}

export async function ensureCodexOAuth(
  context: vscode.ExtensionContext
): Promise<CodexTokens> {
  const stored = await getStoredCredentials(context, 'openai-codex');
  if (stored?.type === 'codex-oauth') {
    if (stored.tokens.expiresAt > Date.now() + 60_000) {
      return stored.tokens;
    }
    try {
      const refreshed = await refreshCodexToken(stored.tokens.refreshToken);
      await storeCredentials(context, 'openai-codex', { type: 'codex-oauth', tokens: refreshed });
      return refreshed;
    } catch {
      // fall through to re-auth
    }
  }

  const tokens = await startCodexOAuthFlow();
  await storeCredentials(context, 'openai-codex', { type: 'codex-oauth', tokens });
  return tokens;
}

interface PkceCodes {
  verifier: string;
  challenge: string;
}

function generatePkce(): PkceCodes {
  const verifier = base64UrlEncode(crypto.randomBytes(32));
  const challenge = base64UrlEncode(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function generateState(): string {
  return base64UrlEncode(crypto.randomBytes(32));
}

function buildAuthorizeUrl(redirectUri: string, pkce: PkceCodes, state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CODEX_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'openid profile email offline_access',
    code_challenge: pkce.challenge,
    code_challenge_method: 'S256',
    id_token_add_organizations: 'true',
    codex_cli_simplified_flow: 'true',
    state,
    originator: 'opencode'
  });

  return `${CODEX_ISSUER}/oauth/authorize?${params.toString()}`;
}

async function startCodexOAuthFlow(): Promise<CodexTokens> {
  const pkce = generatePkce();
  const state = generateState();
  const redirectUri = `http://localhost:${CODEX_OAUTH_PORT}/auth/callback`;

  const authUrl = buildAuthorizeUrl(redirectUri, pkce, state);

  const tokensPromise = waitForOAuthCallback(pkce, state, redirectUri);
  await vscode.env.openExternal(vscode.Uri.parse(authUrl));

  vscode.window.showInformationMessage('请在浏览器完成 ChatGPT Plus/Pro 授权。');
  return tokensPromise;
}

function waitForOAuthCallback(pkce: PkceCodes, state: string, redirectUri: string): Promise<CodexTokens> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        if (!req.url) {
          res.statusCode = 400;
          res.end('Missing URL');
          return;
        }

        const url = new URL(req.url, `http://localhost:${CODEX_OAUTH_PORT}`);
        if (url.pathname !== '/auth/callback') {
          res.statusCode = 404;
          res.end('Not found');
          return;
        }

        const error = url.searchParams.get('error');
        if (error) {
          res.statusCode = 400;
          res.end('Authorization failed');
          server.close();
          reject(new Error(error));
          return;
        }

        const code = url.searchParams.get('code');
        const incomingState = url.searchParams.get('state');

        if (!code || !incomingState || incomingState !== state) {
          res.statusCode = 400;
          res.end('Invalid authorization');
          server.close();
          reject(new Error('OAuth callback invalid'));
          return;
        }

        const tokens = await exchangeCodeForTokens(code, redirectUri, pkce);
        res.statusCode = 200;
        res.end('Authorization successful. You can close this window.');
        server.close();
        resolve(tokens);
      } catch (err) {
        res.statusCode = 500;
        res.end('Authorization failed');
        server.close();
        reject(err);
      }
    });

    server.listen(CODEX_OAUTH_PORT, 'localhost');

    const timeout = setTimeout(() => {
      server.close();
      reject(new Error('OAuth authorization timed out'));
    }, 5 * 60 * 1000);

    const originalResolve = resolve;
    resolve = (value: CodexTokens | PromiseLike<CodexTokens>) => {
      clearTimeout(timeout);
      originalResolve(value);
    };
  });
}

async function exchangeCodeForTokens(code: string, redirectUri: string, pkce: PkceCodes): Promise<CodexTokens> {
  const response = await fetch(`${CODEX_ISSUER}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: CODEX_CLIENT_ID,
      code_verifier: pkce.verifier
    }).toString()
  });

  if (!response.ok) {
    throw new Error(`OAuth token exchange failed: ${response.status}`);
  }

  const data = await response.json() as {
    access_token: string;
    refresh_token: string;
    expires_in?: number;
    id_token?: string;
  };

  const accountId = extractAccountId(data.id_token || data.access_token);
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    accountId
  };
}

async function refreshCodexToken(refreshToken: string): Promise<CodexTokens> {
  const response = await fetch(`${CODEX_ISSUER}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: CODEX_CLIENT_ID
    }).toString()
  });

  if (!response.ok) {
    throw new Error(`OAuth token refresh failed: ${response.status}`);
  }

  const data = await response.json() as {
    access_token: string;
    refresh_token: string;
    expires_in?: number;
    id_token?: string;
  };

  const accountId = extractAccountId(data.id_token || data.access_token);
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    accountId
  };
}

function extractAccountId(token?: string): string | undefined {
  if (!token) {
    return undefined;
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return undefined;
  }

  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    return (
      payload.chatgpt_account_id ||
      payload?.['https://api.openai.com/auth']?.chatgpt_account_id ||
      payload?.organizations?.[0]?.id
    );
  } catch {
    return undefined;
  }
}

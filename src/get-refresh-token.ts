#!/usr/bin/env node
import { google } from 'googleapis';
import * as http from 'http';
import { execFileSync } from 'child_process';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables first.');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const scopes = [
  'https://www.googleapis.com/auth/forms.body',
  'https://www.googleapis.com/auth/forms.responses.readonly',
  'https://www.googleapis.com/auth/drive.file',
];

const authorizeUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
  prompt: 'consent',
});

console.log('\nOpening browser for Google OAuth consent...\n');
console.log(`If it doesn't open automatically, visit:\n${authorizeUrl}\n`);

try {
  const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  execFileSync(opener, [authorizeUrl], { stdio: 'ignore' });
} catch {
  // Browser open failed silently; URL is already printed
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url || '', `http://localhost:3000`);
  if (parsedUrl.pathname !== '/oauth2callback') return;

  const code = parsedUrl.searchParams.get('code');
  if (!code) {
    res.writeHead(400);
    res.end('Missing authorization code');
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>Success!</h1><p>You can close this tab. Check your terminal for the refresh token.</p>');

    console.log('='.repeat(60));
    console.log('GOOGLE_REFRESH_TOKEN=' + tokens.refresh_token);
    console.log('='.repeat(60));
    console.log('\nAdd this to your .env file or MCP server configuration.\n');
  } catch (err) {
    res.writeHead(500);
    res.end('Failed to exchange code for tokens');
    console.error('Token exchange failed:', err);
  }

  server.close();
});

server.listen(3000, () => {
  console.log('Waiting for OAuth callback on http://localhost:3000...');
});

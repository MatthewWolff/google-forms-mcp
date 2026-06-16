import { google } from 'googleapis';
import { config } from 'dotenv';

config();

export function createOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing Google OAuth env vars. Ensure .env is populated.');
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

export function getFormsClient() {
  return google.forms({ version: 'v1', auth: createOAuth2Client() });
}

export function getDriveClient() {
  return google.drive({ version: 'v3', auth: createOAuth2Client() });
}

export type FormsClient = ReturnType<typeof getFormsClient>;

const createdFormIds: string[] = [];

export function trackFormForCleanup(formId: string) {
  createdFormIds.push(formId);
}

export async function cleanupForms() {
  const drive = getDriveClient();
  for (const formId of createdFormIds) {
    try {
      await drive.files.delete({ fileId: formId });
    } catch {
      // form may already be deleted
    }
  }
  createdFormIds.length = 0;
}

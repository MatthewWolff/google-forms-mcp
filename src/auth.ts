import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';

const oauthClients = new WeakMap<object, OAuth2Client>();

export function createFormsClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Missing required environment variables: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN'
    );
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const forms = google.forms({ version: 'v1', auth: oauth2Client });
  oauthClients.set(forms, oauth2Client);
  return forms;
}

export type FormsClient = ReturnType<typeof createFormsClient>;

export function getOAuthClient(client: FormsClient): OAuth2Client {
  const oauth = oauthClients.get(client as object);
  if (!oauth) throw new Error('No OAuth2 client found for this FormsClient');
  return oauth;
}

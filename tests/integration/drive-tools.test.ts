import { describe, it, expect, afterAll } from 'vitest';
import { google } from 'googleapis';
import { createFormsClient, getOAuthClient } from '../../src/auth.js';
import { trackFormForCleanup, cleanupForms } from './helpers.js';

const formsClient = createFormsClient();

afterAll(async () => {
  await cleanupForms();
});

describe('Drive-based tools (list_forms, delete_form)', () => {
  let testFormId: string;

  it('getOAuthClient returns a usable OAuth2 client from our FormsClient', () => {
    const oauth = getOAuthClient(formsClient);
    expect(oauth).toBeDefined();
    expect(oauth.credentials.refresh_token).toBeDefined();
  });

  it('list_forms: can list forms via Drive API using getOAuthClient', async () => {
    const drive = google.drive({ version: 'v3', auth: getOAuthClient(formsClient) });

    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.form' and trashed=false",
      fields: 'nextPageToken,files(id,name,createdTime,modifiedTime)',
      orderBy: 'modifiedTime desc',
      pageSize: 5,
    });

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('files');
    expect(Array.isArray(response.data.files)).toBe(true);
  });

  it('delete_form: can create then delete a form via Drive API using getOAuthClient', async () => {
    const createResp = await formsClient.forms.create({
      requestBody: {
        info: { title: 'Delete Test Form', documentTitle: 'Delete Test Form' },
      },
    });
    testFormId = createResp.data.formId!;
    trackFormForCleanup(testFormId);

    const drive = google.drive({ version: 'v3', auth: getOAuthClient(formsClient) });
    const deleteResp = await drive.files.delete({ fileId: testFormId });
    expect(deleteResp.status).toBe(204);

    // Verify it's gone (should 404)
    try {
      await drive.files.get({ fileId: testFormId });
      throw new Error('Expected 404 but file still exists');
    } catch (err: any) {
      expect(err.code).toBe(404);
    }
  });
});

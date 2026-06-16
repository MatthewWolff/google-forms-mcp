import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getFormsClient, trackFormForCleanup, cleanupForms } from './helpers.js';

const client = getFormsClient();
let formId: string;

beforeAll(async () => {
  const response = await client.forms.create({
    requestBody: {
      info: {
        title: 'Responses Integration Test',
        documentTitle: 'Responses Integration Test',
      },
    },
  });
  formId = response.data.formId!;
  trackFormForCleanup(formId);
});

afterAll(async () => {
  await cleanupForms();
});

describe('Responses', () => {
  it('should list responses (empty initially)', async () => {
    const response = await client.forms.responses.list({ formId });
    // A form with no submissions returns empty or no responses field
    expect(response.data.responses ?? []).toHaveLength(0);
  });

  it('should handle get response with invalid ID gracefully', async () => {
    try {
      await client.forms.responses.get({ formId, responseId: 'nonexistent' });
      expect.fail('Should have thrown');
    } catch (error: unknown) {
      const err = error as { code?: number };
      expect(err.code).toBe(404);
    }
  });
});

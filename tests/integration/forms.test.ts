import { describe, it, expect, afterAll } from 'vitest';
import { getFormsClient, trackFormForCleanup, cleanupForms } from './helpers.js';

const client = getFormsClient();

afterAll(async () => {
  await cleanupForms();
});

describe('Forms CRUD', () => {
  let testFormId: string;

  it('should create a form', async () => {
    const response = await client.forms.create({
      requestBody: {
        info: {
          title: 'Integration Test Form',
          documentTitle: 'Integration Test Form',
        },
      },
    });

    expect(response.data.formId).toBeDefined();
    testFormId = response.data.formId!;
    trackFormForCleanup(testFormId);
  });

  it('should get a form', async () => {
    const response = await client.forms.get({ formId: testFormId });
    expect(response.data.info?.title).toBe('Integration Test Form');
  });

  it('should update form info (title + description)', async () => {
    await client.forms.batchUpdate({
      formId: testFormId,
      requestBody: {
        requests: [
          {
            updateFormInfo: {
              info: {
                title: 'Updated Title',
                description: 'A test description',
              },
              updateMask: 'title,description',
            },
          },
        ],
      },
    });

    const response = await client.forms.get({ formId: testFormId });
    expect(response.data.info?.title).toBe('Updated Title');
    expect(response.data.info?.description).toBe('A test description');
  });

  it('should update form settings (quiz mode)', async () => {
    await client.forms.batchUpdate({
      formId: testFormId,
      requestBody: {
        requests: [
          {
            updateSettings: {
              settings: { quizSettings: { isQuiz: true } },
              updateMask: 'quizSettings.isQuiz',
            },
          },
        ],
      },
    });

    const response = await client.forms.get({ formId: testFormId });
    expect(response.data.settings?.quizSettings?.isQuiz).toBe(true);
  });
});

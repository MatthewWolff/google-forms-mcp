import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getFormsClient, trackFormForCleanup, cleanupForms } from './helpers.js';

const client = getFormsClient();
let formId: string;
let formData: any;

beforeAll(async () => {
  const response = await client.forms.create({
    requestBody: {
      info: {
        title: 'Composite Tools Test',
        documentTitle: 'Composite Tools Test',
      },
    },
  });
  formId = response.data.formId!;
  trackFormForCleanup(formId);

  await client.forms.batchUpdate({
    formId,
    requestBody: {
      requests: [
        {
          updateFormInfo: {
            info: { description: 'A test form for composite tools' },
            updateMask: 'description',
          },
        },
        {
          createItem: {
            item: {
              title: 'Favorite color',
              questionItem: {
                question: {
                  required: true,
                  choiceQuestion: {
                    type: 'RADIO',
                    options: [{ value: 'Red' }, { value: 'Blue' }, { value: 'Green' }],
                  },
                },
              },
            },
            location: { index: 0 },
          },
        },
        {
          createItem: {
            item: {
              title: 'Rate your experience',
              questionItem: {
                question: {
                  required: true,
                  scaleQuestion: { low: 1, high: 10, lowLabel: 'Bad', highLabel: 'Great' },
                },
              },
            },
            location: { index: 1 },
          },
        },
        {
          createItem: {
            item: {
              title: 'Additional comments',
              questionItem: {
                question: {
                  required: false,
                  textQuestion: { paragraph: true },
                },
              },
            },
            location: { index: 2 },
          },
        },
        {
          createItem: {
            item: {
              title: 'Section 2',
              description: 'More questions here',
              pageBreakItem: {},
            },
            location: { index: 3 },
          },
        },
        {
          createItem: {
            item: {
              title: 'Select topics',
              questionItem: {
                question: {
                  required: false,
                  choiceQuestion: {
                    type: 'CHECKBOX',
                    options: [{ value: 'Sports' }, { value: 'Music' }, { value: 'Tech' }],
                  },
                },
              },
            },
            location: { index: 4 },
          },
        },
      ],
    },
  });

  const form = await client.forms.get({ formId });
  formData = form.data;
});

afterAll(async () => {
  await cleanupForms();
});

describe('get_form_summary', () => {
  it('should return a simplified form structure', () => {
    const items = formData.items || [];

    expect(items.length).toBe(5);
    expect(items[0]?.title).toBe('Favorite color');
    expect(items[0]?.questionItem?.question?.choiceQuestion?.type).toBe('RADIO');
    expect(items[3]?.pageBreakItem).toBeDefined();
    expect(items[4]?.questionItem?.question?.choiceQuestion?.type).toBe('CHECKBOX');
  });
});

describe('build_form', () => {
  it('should create a complete form in one batch', async () => {
    const createResponse = await client.forms.create({
      requestBody: {
        info: { title: 'Build Form Test', documentTitle: 'Build Form Test' },
      },
    });
    const builtFormId = createResponse.data.formId!;
    trackFormForCleanup(builtFormId);

    await client.forms.batchUpdate({
      formId: builtFormId,
      requestBody: {
        requests: [
          {
            updateFormInfo: {
              info: { description: 'Built in one batch' },
              updateMask: 'description',
            },
          },
          {
            createItem: {
              item: {
                title: 'Name',
                questionItem: { question: { required: true, textQuestion: { paragraph: false } } },
              },
              location: { index: 0 },
            },
          },
          {
            createItem: {
              item: {
                title: 'Section B',
                pageBreakItem: {},
              },
              location: { index: 1 },
            },
          },
          {
            createItem: {
              item: {
                title: 'Rating',
                questionItem: {
                  question: { required: true, scaleQuestion: { low: 1, high: 5, lowLabel: 'Low', highLabel: 'High' } },
                },
              },
              location: { index: 2 },
            },
          },
        ],
      },
    });

    const form = await client.forms.get({ formId: builtFormId });
    expect(form.data.info?.description).toBe('Built in one batch');
    expect(form.data.items).toHaveLength(3);
    expect(form.data.items?.[0]?.title).toBe('Name');
    expect(form.data.items?.[1]?.pageBreakItem).toBeDefined();
    expect(form.data.items?.[2]?.questionItem?.question?.scaleQuestion).toBeDefined();
  });
});

describe('clone_form', () => {
  it('should duplicate a form with all its items', async () => {
    const originalItems = formData.items || [];

    const [, cloneResponse] = await Promise.all([
      Promise.resolve(),
      client.forms.create({
        requestBody: {
          info: { title: 'Clone of Composite Tools Test', documentTitle: 'Clone of Composite Tools Test' },
        },
      }),
    ]);
    const cloneId = cloneResponse.data.formId!;
    trackFormForCleanup(cloneId);

    const requests = originalItems.map((item: any, index: number) => {
      const clonedItem: Record<string, unknown> = { title: item.title };
      if (item.description) clonedItem.description = item.description;

      if (item.questionItem) {
        clonedItem.questionItem = { question: item.questionItem.question };
      } else if (item.pageBreakItem !== undefined) {
        clonedItem.pageBreakItem = {};
      } else if (item.textItem !== undefined) {
        clonedItem.textItem = {};
      }

      return { createItem: { item: clonedItem, location: { index } } };
    });

    await client.forms.batchUpdate({ formId: cloneId, requestBody: { requests } });

    const cloned = await client.forms.get({ formId: cloneId });
    expect(cloned.data.items?.length).toBe(originalItems.length);
    expect(cloned.data.items?.[0]?.title).toBe('Favorite color');
    expect(cloned.data.items?.[3]?.pageBreakItem).toBeDefined();
  });
});

describe('get_responses_table', () => {
  it('should return empty table for form with no responses', async () => {
    const response = await client.forms.responses.list({ formId });
    const responses = response.data.responses ?? [];
    expect(responses).toHaveLength(0);
  });
});

describe('export_responses_csv', () => {
  it('should produce valid CSV header from form structure', () => {
    const items = formData.items || [];

    const headers = ['Timestamp'];
    for (const item of items) {
      if (item.questionItem) {
        headers.push(item.title || 'Untitled');
      }
    }

    expect(headers).toContain('Timestamp');
    expect(headers).toContain('Favorite color');
    expect(headers).toContain('Rate your experience');
    expect(headers).toContain('Additional comments');
    expect(headers).toContain('Select topics');
    expect(headers).not.toContain('Section 2');
  });
});

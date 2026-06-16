import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getFormsClient, trackFormForCleanup, cleanupForms } from './helpers.js';

const client = getFormsClient();
let formId: string;

beforeAll(async () => {
  const response = await client.forms.create({
    requestBody: {
      info: {
        title: 'Questions Integration Test',
        documentTitle: 'Questions Integration Test',
      },
    },
  });
  formId = response.data.formId!;
  trackFormForCleanup(formId);
});

afterAll(async () => {
  await cleanupForms();
});

describe('Question types', () => {
  it('should add a radio (multiple choice) question', async () => {
    await client.forms.batchUpdate({
      formId,
      requestBody: {
        requests: [
          {
            createItem: {
              item: {
                title: 'Favorite color?',
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
        ],
      },
    });

    const form = await client.forms.get({ formId });
    const item = form.data.items?.[0];
    expect(item?.title).toBe('Favorite color?');
    const choiceQ = item?.questionItem?.question?.choiceQuestion;
    expect(choiceQ?.type).toBe('RADIO');
    expect(choiceQ?.options).toHaveLength(3);
  });

  it('should add a checkbox (multi-select) question', async () => {
    await client.forms.batchUpdate({
      formId,
      requestBody: {
        requests: [
          {
            createItem: {
              item: {
                title: 'Select hobbies',
                questionItem: {
                  question: {
                    required: false,
                    choiceQuestion: {
                      type: 'CHECKBOX',
                      options: [{ value: 'Reading' }, { value: 'Gaming' }, { value: 'Cooking' }],
                    },
                  },
                },
              },
              location: { index: 1 },
            },
          },
        ],
      },
    });

    const form = await client.forms.get({ formId });
    const item = form.data.items?.[1];
    expect(item?.questionItem?.question?.choiceQuestion?.type).toBe('CHECKBOX');
  });

  it('should add a dropdown question', async () => {
    await client.forms.batchUpdate({
      formId,
      requestBody: {
        requests: [
          {
            createItem: {
              item: {
                title: 'Pick a city',
                questionItem: {
                  question: {
                    required: true,
                    choiceQuestion: {
                      type: 'DROP_DOWN',
                      options: [{ value: 'NYC' }, { value: 'LA' }, { value: 'Chicago' }],
                    },
                  },
                },
              },
              location: { index: 2 },
            },
          },
        ],
      },
    });

    const form = await client.forms.get({ formId });
    const item = form.data.items?.[2];
    expect(item?.questionItem?.question?.choiceQuestion?.type).toBe('DROP_DOWN');
  });

  it('should add a short text question', async () => {
    await client.forms.batchUpdate({
      formId,
      requestBody: {
        requests: [
          {
            createItem: {
              item: {
                title: 'Your name',
                questionItem: {
                  question: {
                    required: true,
                    textQuestion: { paragraph: false },
                  },
                },
              },
              location: { index: 3 },
            },
          },
        ],
      },
    });

    const form = await client.forms.get({ formId });
    const item = form.data.items?.[3];
    expect(item?.title).toBe('Your name');
    expect(item?.questionItem?.question?.textQuestion?.paragraph).toBeFalsy();
  });

  it('should add a paragraph question', async () => {
    await client.forms.batchUpdate({
      formId,
      requestBody: {
        requests: [
          {
            createItem: {
              item: {
                title: 'Tell us more',
                questionItem: {
                  question: {
                    required: false,
                    textQuestion: { paragraph: true },
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
    const item = form.data.items?.[4];
    expect(item?.questionItem?.question?.textQuestion?.paragraph).toBe(true);
  });

  it('should add a scale question', async () => {
    await client.forms.batchUpdate({
      formId,
      requestBody: {
        requests: [
          {
            createItem: {
              item: {
                title: 'Rate 1-10',
                questionItem: {
                  question: {
                    required: true,
                    scaleQuestion: {
                      low: 1,
                      high: 10,
                      lowLabel: 'Bad',
                      highLabel: 'Great',
                    },
                  },
                },
              },
              location: { index: 5 },
            },
          },
        ],
      },
    });

    const form = await client.forms.get({ formId });
    const item = form.data.items?.[5];
    const scale = item?.questionItem?.question?.scaleQuestion;
    expect(scale?.low).toBe(1);
    expect(scale?.high).toBe(10);
  });

  it('should add a date question', async () => {
    await client.forms.batchUpdate({
      formId,
      requestBody: {
        requests: [
          {
            createItem: {
              item: {
                title: 'When is your birthday?',
                questionItem: {
                  question: {
                    required: false,
                    dateQuestion: { includeTime: false, includeYear: true },
                  },
                },
              },
              location: { index: 6 },
            },
          },
        ],
      },
    });

    const form = await client.forms.get({ formId });
    const item = form.data.items?.[6];
    expect(item?.questionItem?.question?.dateQuestion).toBeDefined();
  });

  it('should add a time question', async () => {
    await client.forms.batchUpdate({
      formId,
      requestBody: {
        requests: [
          {
            createItem: {
              item: {
                title: 'What time works best?',
                questionItem: {
                  question: {
                    required: false,
                    timeQuestion: { duration: false },
                  },
                },
              },
              location: { index: 7 },
            },
          },
        ],
      },
    });

    const form = await client.forms.get({ formId });
    const item = form.data.items?.[7];
    expect(item?.questionItem?.question?.timeQuestion).toBeDefined();
  });
});

describe('Sections and text items', () => {
  it('should add a page break (section)', async () => {
    await client.forms.batchUpdate({
      formId,
      requestBody: {
        requests: [
          {
            createItem: {
              item: {
                title: 'Section 2',
                description: 'This is a new section',
                pageBreakItem: {},
              },
              location: { index: 8 },
            },
          },
        ],
      },
    });

    const form = await client.forms.get({ formId });
    const item = form.data.items?.[8];
    expect(item?.title).toBe('Section 2');
    expect(item?.pageBreakItem).toBeDefined();
  });

  it('should add a text item', async () => {
    await client.forms.batchUpdate({
      formId,
      requestBody: {
        requests: [
          {
            createItem: {
              item: {
                title: 'Instructions',
                description: 'Please read carefully',
                textItem: {},
              },
              location: { index: 9 },
            },
          },
        ],
      },
    });

    const form = await client.forms.get({ formId });
    const item = form.data.items?.[9];
    expect(item?.title).toBe('Instructions');
    expect(item?.textItem).toBeDefined();
  });
});

describe('Item operations', () => {
  it('should move an item', async () => {
    const formBefore = await client.forms.get({ formId });
    const originalTitle = formBefore.data.items?.[0]?.title;

    await client.forms.batchUpdate({
      formId,
      requestBody: {
        requests: [
          {
            moveItem: {
              originalLocation: { index: 0 },
              newLocation: { index: 5 },
            },
          },
        ],
      },
    });

    const formAfter = await client.forms.get({ formId });
    expect(formAfter.data.items?.[5]?.title).toBe(originalTitle);
  });

  it('should delete an item', async () => {
    const formBefore = await client.forms.get({ formId });
    const countBefore = formBefore.data.items?.length ?? 0;

    await client.forms.batchUpdate({
      formId,
      requestBody: {
        requests: [{ deleteItem: { location: { index: 0 } } }],
      },
    });

    const formAfter = await client.forms.get({ formId });
    expect(formAfter.data.items?.length).toBe(countBefore - 1);
  });
});

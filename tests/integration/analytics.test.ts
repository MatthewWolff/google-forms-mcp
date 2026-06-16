import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getFormsClient, trackFormForCleanup, cleanupForms } from './helpers.js';

const client = getFormsClient();
let formId: string;
let questionIds: Record<string, string> = {};
let formData: any;

beforeAll(async () => {
  const response = await client.forms.create({
    requestBody: {
      info: {
        title: 'Analytics Test Form',
        documentTitle: 'Analytics Test Form',
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
          createItem: {
            item: {
              title: 'Source',
              questionItem: {
                question: {
                  required: true,
                  choiceQuestion: {
                    type: 'RADIO',
                    options: [{ value: 'Google' }, { value: 'Friend' }, { value: 'Ad' }],
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
              title: 'Plan',
              questionItem: {
                question: {
                  required: true,
                  choiceQuestion: {
                    type: 'RADIO',
                    options: [{ value: 'Free' }, { value: 'Pro' }, { value: 'Enterprise' }],
                  },
                },
              },
            },
            location: { index: 1 },
          },
        },
        {
          createItem: {
            item: {
              title: 'Satisfaction',
              questionItem: {
                question: {
                  required: true,
                  scaleQuestion: { low: 1, high: 10, lowLabel: 'Bad', highLabel: 'Great' },
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
  formData = form.data;
  for (const item of formData.items || []) {
    if (item.questionItem?.question?.questionId && item.title) {
      questionIds[item.title] = item.questionItem.question.questionId;
    }
  }
});

afterAll(async () => {
  await cleanupForms();
});

describe('Analytics - form structure for analysis', () => {
  it('should have question IDs mapped to titles', () => {
    expect(questionIds['Source']).toBeDefined();
    expect(questionIds['Plan']).toBeDefined();
    expect(questionIds['Satisfaction']).toBeDefined();
  });

  it('should identify choice questions vs scale questions', () => {
    const items = formData.items || [];
    const sourceQ = items[0]?.questionItem?.question;
    const satisfactionQ = items[2]?.questionItem?.question;

    expect(sourceQ?.choiceQuestion?.type).toBe('RADIO');
    expect(satisfactionQ?.scaleQuestion?.low).toBe(1);
    expect(satisfactionQ?.scaleQuestion?.high).toBe(10);
  });
});

describe('Analytics - empty response handling', () => {
  let emptyResponses: any[];

  beforeAll(async () => {
    const resp = await client.forms.responses.list({ formId });
    emptyResponses = resp.data.responses ?? [];
  });

  it('should handle frequency analysis with no responses', () => {
    expect(emptyResponses).toHaveLength(0);

    const frequencies: Record<string, number> = {};
    for (const r of emptyResponses) {
      const answer = r.answers?.[questionIds['Source']]?.textAnswers?.answers?.[0]?.value;
      if (answer) frequencies[answer] = (frequencies[answer] || 0) + 1;
    }
    expect(Object.keys(frequencies)).toHaveLength(0);
  });

  it('should handle cross-tabulation with no responses', () => {
    const matrix: Record<string, Record<string, number>> = {};
    for (const r of emptyResponses) {
      const a = r.answers?.[questionIds['Source']]?.textAnswers?.answers?.[0]?.value;
      const b = r.answers?.[questionIds['Plan']]?.textAnswers?.answers?.[0]?.value;
      if (a && b) {
        if (!matrix[a]) matrix[a] = {};
        matrix[a][b] = (matrix[a][b] || 0) + 1;
      }
    }
    expect(Object.keys(matrix)).toHaveLength(0);
  });

  it('should handle sankey data generation with no responses', () => {
    const flows: Record<string, number> = {};
    for (const r of emptyResponses) {
      const source = r.answers?.[questionIds['Source']]?.textAnswers?.answers?.[0]?.value;
      const target = r.answers?.[questionIds['Plan']]?.textAnswers?.answers?.[0]?.value;
      if (source && target) {
        const key = `${source}\0${target}`;
        flows[key] = (flows[key] || 0) + 1;
      }
    }

    const sankeyData = Object.entries(flows).map(([key, value]) => {
      const [source, target] = key.split('\0');
      return { source, target, value };
    });

    expect(sankeyData).toHaveLength(0);
  });

  it('should produce empty summary stats', () => {
    const items = formData.items || [];

    const summary = {
      totalResponses: emptyResponses.length,
      questions: items
        .filter((item: any) => item.questionItem)
        .map((item: any) => ({
          title: item.title,
          type: item.questionItem?.question?.choiceQuestion
            ? 'choice'
            : item.questionItem?.question?.scaleQuestion
              ? 'scale'
              : 'text',
          responseCount: 0,
        })),
    };

    expect(summary.totalResponses).toBe(0);
    expect(summary.questions).toHaveLength(3);
    expect(summary.questions[0].title).toBe('Source');
    expect(summary.questions[0].type).toBe('choice');
    expect(summary.questions[2].type).toBe('scale');
  });
});

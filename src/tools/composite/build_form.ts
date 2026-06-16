import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FormsClient } from '../../auth.js';

const questionSchema = z.object({
  title: z.string().describe('Question text'),
  type: z.enum(['radio', 'checkbox', 'dropdown', 'short_text', 'paragraph', 'scale', 'date', 'time', 'rating']),
  required: z.boolean().optional().default(true),
  options: z.array(z.string()).optional().describe('Choices for radio/checkbox/dropdown'),
  allowOther: z.boolean().optional().default(false),
  low: z.number().int().optional().default(1),
  high: z.number().int().optional().default(5),
  lowLabel: z.string().optional(),
  highLabel: z.string().optional(),
  includeTime: z.boolean().optional().default(false),
  includeYear: z.boolean().optional().default(true),
  duration: z.boolean().optional().default(false),
  ratingScale: z.number().int().min(3).max(10).optional().default(5),
  ratingIcon: z.enum(['STAR', 'HEART', 'THUMB_UP']).optional().default('STAR'),
});

const sectionSchema = z.object({
  title: z.string().describe('Section header'),
  description: z.string().optional(),
  questions: z.array(questionSchema).max(50).describe('Questions in this section (max 50 per section)'),
});

const inputSchema = {
  title: z.string().describe('Form title'),
  description: z.string().optional().describe('Form description shown below title'),
  sections: z.array(sectionSchema).max(20).describe('Ordered list of sections, each containing questions (max 20 sections)'),
};

function buildQuestionItem(q: z.infer<typeof questionSchema>): Record<string, unknown> {
  const question: Record<string, unknown> = { required: q.required };

  switch (q.type) {
    case 'radio':
    case 'checkbox':
    case 'dropdown': {
      const choiceType = q.type === 'radio' ? 'RADIO' : q.type === 'checkbox' ? 'CHECKBOX' : 'DROP_DOWN';
      const options: Record<string, unknown>[] = (q.options || []).map((value) => ({ value }));
      if (q.allowOther && (q.type === 'radio' || q.type === 'checkbox')) {
        options.push({ isOther: true });
      }
      question.choiceQuestion = { type: choiceType, options };
      break;
    }
    case 'short_text':
      question.textQuestion = { paragraph: false };
      break;
    case 'paragraph':
      question.textQuestion = { paragraph: true };
      break;
    case 'scale':
      question.scaleQuestion = { low: q.low, high: q.high, lowLabel: q.lowLabel || '', highLabel: q.highLabel || '' };
      break;
    case 'date':
      question.dateQuestion = { includeTime: q.includeTime, includeYear: q.includeYear };
      break;
    case 'time':
      question.timeQuestion = { duration: q.duration };
      break;
    case 'rating':
      question.ratingQuestion = { ratingScaleLevel: q.ratingScale, iconType: q.ratingIcon };
      break;
  }

  return question;
}

export function registerBuildForm(server: McpServer, client: FormsClient) {
  server.registerTool(
    'build_form',
    {
      title: 'Build Form',
      description:
        'Create an entire Google Form in one call. Specify title, description, sections, and all questions. Returns the form ID and URLs. This is the recommended way to create complete forms.',
      inputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ title, description, sections }) => {
      const createResponse = await client.forms.create({
        requestBody: {
          info: { title, documentTitle: title },
        },
      });

      const formId = createResponse.data.formId!;
      const requests: Record<string, unknown>[] = [];

      if (description) {
        requests.push({
          updateFormInfo: {
            info: { description },
            updateMask: 'description',
          },
        });
      }

      let index = 0;
      for (const section of sections) {
        if (index > 0) {
          requests.push({
            createItem: {
              item: {
                title: section.title,
                description: section.description || '',
                pageBreakItem: {},
              },
              location: { index },
            },
          });
          index++;
        }

        for (const q of section.questions) {
          requests.push({
            createItem: {
              item: {
                title: q.title,
                questionItem: { question: buildQuestionItem(q) },
              },
              location: { index },
            },
          });
          index++;
        }
      }

      if (requests.length > 0) {
        try {
          await client.forms.batchUpdate({
            formId,
            requestBody: { requests },
          });
        } catch (error: unknown) {
          const raw = error instanceof Error ? error.message : 'Unknown error';
          const message = raw.replace(/key=\S+/gi, 'key=***').substring(0, 200);
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  error: `Failed to populate form: ${message}`,
                  orphanFormId: formId,
                  editUrl: `https://docs.google.com/forms/d/${formId}/edit`,
                }, null, 2),
              },
            ],
            isError: true,
          };
        }
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                formId,
                editUrl: `https://docs.google.com/forms/d/${formId}/edit`,
                respondUrl: `https://docs.google.com/forms/d/${formId}/viewform`,
                title,
                sectionCount: sections.length,
                questionCount: sections.reduce((sum, s) => sum + s.questions.length, 0),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}

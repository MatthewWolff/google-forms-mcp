import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FormsClient } from '../../auth.js';

const inputSchema = {
  formId: z.string().describe('The Google Form ID'),
  title: z.string().describe('The question text displayed to respondents'),
  type: z
    .enum(['radio', 'checkbox', 'dropdown', 'short_text', 'paragraph', 'scale', 'date', 'time', 'rating'])
    .describe(
      'Question type. radio/checkbox/dropdown require options. scale requires low/high. rating uses icons.'
    ),
  required: z.boolean().optional().default(true).describe('Whether the question is required'),
  index: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Position to insert at (0-based). Omit to append at end.'),
  options: z
    .array(z.string())
    .optional()
    .describe('Answer choices for radio, checkbox, or dropdown questions'),
  allowOther: z
    .boolean()
    .optional()
    .default(false)
    .describe('Add an "Other" option (radio/checkbox only)'),
  low: z.number().int().optional().default(1).describe('Low end of scale (for scale type)'),
  high: z.number().int().optional().default(5).describe('High end of scale (for scale type)'),
  lowLabel: z.string().optional().describe('Label for the low end of the scale'),
  highLabel: z.string().optional().describe('Label for the high end of the scale'),
  includeTime: z.boolean().optional().default(false).describe('Include time in date question'),
  includeYear: z.boolean().optional().default(true).describe('Include year in date question'),
  duration: z
    .boolean()
    .optional()
    .default(false)
    .describe('If true, time question asks for elapsed duration instead of time of day'),
  ratingScale: z
    .number()
    .int()
    .min(3)
    .max(10)
    .optional()
    .default(5)
    .describe('Number of rating levels (3-10)'),
  ratingIcon: z
    .enum(['STAR', 'HEART', 'THUMB_UP'])
    .optional()
    .default('STAR')
    .describe('Icon type for rating question'),
};

function buildQuestion(args: Record<string, unknown>): Record<string, unknown> {
  const { type, required: isRequired, options, allowOther, low, high, lowLabel, highLabel, includeTime, includeYear, duration, ratingScale, ratingIcon } = args as {
    type: string;
    required: boolean;
    options?: string[];
    allowOther?: boolean;
    low?: number;
    high?: number;
    lowLabel?: string;
    highLabel?: string;
    includeTime?: boolean;
    includeYear?: boolean;
    duration?: boolean;
    ratingScale?: number;
    ratingIcon?: string;
  };

  const question: Record<string, unknown> = { required: isRequired };

  switch (type) {
    case 'radio':
    case 'checkbox':
    case 'dropdown': {
      const choiceType = type === 'radio' ? 'RADIO' : type === 'checkbox' ? 'CHECKBOX' : 'DROP_DOWN';
      const choiceOptions = (options || []).map((value) => ({ value }));
      if (allowOther && (type === 'radio' || type === 'checkbox')) {
        choiceOptions.push({ isOther: true } as unknown as { value: string });
      }
      question.choiceQuestion = { type: choiceType, options: choiceOptions };
      break;
    }
    case 'short_text':
      question.textQuestion = { paragraph: false };
      break;
    case 'paragraph':
      question.textQuestion = { paragraph: true };
      break;
    case 'scale':
      question.scaleQuestion = {
        low: low ?? 1,
        high: high ?? 5,
        lowLabel: lowLabel || '',
        highLabel: highLabel || '',
      };
      break;
    case 'date':
      question.dateQuestion = { includeTime: includeTime ?? false, includeYear: includeYear ?? true };
      break;
    case 'time':
      question.timeQuestion = { duration: duration ?? false };
      break;
    case 'rating':
      question.ratingQuestion = {
        ratingScaleLevel: ratingScale ?? 5,
        iconType: ratingIcon ?? 'STAR',
      };
      break;
  }

  return question;
}

export function registerAddQuestion(server: McpServer, client: FormsClient) {
  server.registerTool(
    'add_question',
    {
      title: 'Add Question',
      description:
        'Add a question to a Google Form. Supports all question types: radio, checkbox, dropdown, short_text, paragraph, scale, date, time, rating. Use options param for choice-based types. Use low/high/labels for scale type.',
      inputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (args) => {
      const { formId, title, index } = args;

      const question = buildQuestion(args);

      const item: Record<string, unknown> = {
        title,
        questionItem: { question },
      };

      let resolvedIndex: number;
      if (index !== undefined) {
        resolvedIndex = index;
      } else {
        const form = await client.forms.get({ formId });
        resolvedIndex = form.data.items?.length ?? 0;
      }
      const location = { index: resolvedIndex };

      const response = await client.forms.batchUpdate({
        formId,
        requestBody: {
          requests: [{ createItem: { item, location } }],
        },
      });

      const reply = response.data.replies?.[0];
      const createdItemId = (reply as Record<string, unknown>)?.createItem as Record<string, unknown> | undefined;

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: true,
                title,
                type: args.type,
                index: location.index,
                itemId: createdItemId?.itemId,
                questionId: createdItemId?.questionId,
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

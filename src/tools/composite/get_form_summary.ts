import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FormsClient } from '../../auth.js';

const inputSchema = {
  formId: z.string().describe('The Google Form ID'),
};

interface SummaryItem {
  index: number;
  type: string;
  title: string;
  description?: string;
  required?: boolean;
  options?: string[];
  scaleRange?: { low: number; high: number; lowLabel?: string; highLabel?: string };
}

function resolveQuestionType(question: Record<string, unknown>): string {
  if (question.choiceQuestion) {
    const choice = question.choiceQuestion as { type?: string };
    switch (choice.type) {
      case 'RADIO': return 'radio';
      case 'CHECKBOX': return 'checkbox';
      case 'DROP_DOWN': return 'dropdown';
      default: return 'radio';
    }
  }
  if (question.textQuestion) {
    const text = question.textQuestion as { paragraph?: boolean };
    return text.paragraph ? 'paragraph' : 'text';
  }
  if (question.scaleQuestion) return 'scale';
  if (question.dateQuestion) return 'date';
  if (question.timeQuestion) return 'time';
  if (question.ratingQuestion) return 'rating';
  if (question.fileUploadQuestion) return 'file_upload';
  return 'unknown';
}

function extractOptions(question: Record<string, unknown>): string[] | undefined {
  if (!question.choiceQuestion) return undefined;
  const choice = question.choiceQuestion as { options?: Array<{ value?: string; isOther?: boolean }> };
  if (!choice.options) return undefined;
  return choice.options.map((opt) => opt.isOther ? '(Other)' : (opt.value || ''));
}

function extractScaleRange(question: Record<string, unknown>): SummaryItem['scaleRange'] | undefined {
  if (!question.scaleQuestion) return undefined;
  const scale = question.scaleQuestion as { low?: number; high?: number; lowLabel?: string; highLabel?: string };
  return {
    low: scale.low ?? 1,
    high: scale.high ?? 5,
    lowLabel: scale.lowLabel || undefined,
    highLabel: scale.highLabel || undefined,
  };
}

export function registerGetFormSummary(server: McpServer, client: FormsClient) {
  server.registerTool(
    'get_form_summary',
    {
      title: 'Get Form Summary',
      description:
        'Returns a simplified, LLM-friendly view of a form\'s structure. Instead of the deeply nested raw API response, it returns a clean list of items with their type, title, options (if applicable), and required status.',
      inputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ formId }) => {
      const response = await client.forms.get({ formId });
      const form = response.data;

      const items: SummaryItem[] = [];

      for (const [idx, item] of (form.items || []).entries()) {
        if (item.questionItem) {
          const question = item.questionItem.question as Record<string, unknown> | undefined;
          if (!question) continue;

          const summaryItem: SummaryItem = {
            index: idx,
            type: resolveQuestionType(question),
            title: item.title || 'Untitled',
            required: (question.required as boolean) || false,
          };

          const options = extractOptions(question);
          if (options) summaryItem.options = options;

          const scaleRange = extractScaleRange(question);
          if (scaleRange) summaryItem.scaleRange = scaleRange;

          items.push(summaryItem);
        } else if (item.pageBreakItem !== undefined) {
          items.push({
            index: idx,
            type: 'section',
            title: item.title || 'Untitled Section',
            description: item.description || undefined,
          });
        } else if (item.textItem !== undefined) {
          items.push({
            index: idx,
            type: 'text_item',
            title: item.title || '',
            description: item.description || undefined,
          });
        } else if (item.imageItem !== undefined) {
          items.push({
            index: idx,
            type: 'image',
            title: item.title || '',
          });
        } else if (item.videoItem !== undefined) {
          items.push({
            index: idx,
            type: 'video',
            title: item.title || '',
          });
        }
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                formId: form.formId,
                title: form.info?.title || '',
                description: form.info?.description || '',
                itemCount: items.length,
                items,
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

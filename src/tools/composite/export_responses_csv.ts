import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FormsClient } from '../../auth.js';

const inputSchema = {
  formId: z.string().describe('The Google Form ID'),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(5000)
    .optional()
    .describe('Max responses to fetch (1-5000, default all)'),
};

interface FormItem {
  itemId?: string;
  title?: string;
  questionItem?: {
    question?: {
      questionId?: string;
    };
  };
}

interface Answer {
  textAnswers?: {
    answers?: Array<{ value?: string }>;
  };
}

interface FormResponse {
  createTime?: string;
  lastSubmittedTime?: string;
  answers?: Record<string, Answer>;
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function registerExportResponsesCsv(server: McpServer, client: FormsClient) {
  server.registerTool(
    'export_responses_csv',
    {
      title: 'Export Responses CSV',
      description:
        'Export all form responses as a CSV string. Header row uses question titles; multi-value answers (checkboxes) are joined with "; ".',
      inputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ formId, pageSize }) => {
      const formResponse = await client.forms.get({ formId });
      const formData = formResponse.data;

      const items = (formData.items || []) as FormItem[];
      const questionMap: Array<{ questionId: string; title: string }> = [];

      for (const item of items) {
        if (item.questionItem?.question?.questionId) {
          questionMap.push({
            questionId: item.questionItem.question.questionId,
            title: item.title || 'Untitled Question',
          });
        }
      }

      let allResponses: FormResponse[] = [];
      let nextPageToken: string | undefined;

      do {
        const params: Record<string, unknown> = { formId };
        if (pageSize) {
          const remaining = pageSize - allResponses.length;
          params.pageSize = Math.min(remaining, 5000);
        }
        if (nextPageToken) params.pageToken = nextPageToken;

        const listResponse = await client.forms.responses.list(params as { formId: string });
        const data = listResponse.data;

        if (data.responses) {
          allResponses.push(...(data.responses as FormResponse[]));
        }

        nextPageToken = data.nextPageToken || undefined;

        if (pageSize && allResponses.length >= pageSize) {
          allResponses = allResponses.slice(0, pageSize);
          break;
        }
      } while (nextPageToken);

      const headers = ['Timestamp', ...questionMap.map((q) => q.title)];
      const rows: string[] = [headers.map(escapeCsvField).join(',')];

      for (const response of allResponses) {
        const timestamp = response.lastSubmittedTime || response.createTime || '';
        const values: string[] = [timestamp];

        for (const { questionId } of questionMap) {
          const answer = response.answers?.[questionId];
          if (answer?.textAnswers?.answers) {
            const joined = answer.textAnswers.answers
              .map((a) => a.value || '')
              .join('; ');
            values.push(joined);
          } else {
            values.push('');
          }
        }

        rows.push(values.map(escapeCsvField).join(','));
      }

      const csv = rows.join('\n');

      return {
        content: [
          {
            type: 'text' as const,
            text: csv,
          },
        ],
      };
    }
  );
}

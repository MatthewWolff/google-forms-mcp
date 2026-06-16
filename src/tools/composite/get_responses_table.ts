import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FormsClient } from '../../auth.js';
import { getAllResponses } from '../analytics/utils.js';

const inputSchema = {
  formId: z.string().describe('The Google Form ID'),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(5000)
    .optional()
    .describe('Max responses to return (1-5000, default 100)'),
  timestampAfter: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/, 'Must be RFC3339 UTC format (e.g., 2024-01-01T00:00:00Z)')
    .optional()
    .describe('Only return responses submitted after this RFC3339 timestamp (e.g., 2024-01-01T00:00:00Z)'),
};

function extractAnswerText(answer: Record<string, unknown>): string {
  if (answer.textAnswers) {
    const textAnswers = answer.textAnswers as { answers?: Array<{ value?: string }> };
    return (textAnswers.answers || []).map((a) => a.value || '').join(', ');
  }
  if (answer.fileUploadAnswers) {
    const fileAnswers = answer.fileUploadAnswers as { answers?: Array<{ fileId?: string; fileName?: string }> };
    return (fileAnswers.answers || []).map((a) => a.fileName || a.fileId || '').join(', ');
  }
  return '';
}

export function registerGetResponsesTable(server: McpServer, client: FormsClient) {
  server.registerTool(
    'get_responses_table',
    {
      title: 'Get Responses Table',
      description:
        'Fetch form responses as a flat table with human-readable column names (question titles) instead of opaque question IDs. Returns an array of row objects where keys are question titles and values are answer texts.',
      inputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ formId, pageSize, timestampAfter }) => {
      // Get form structure to build questionId -> title mapping
      const formResponse = await client.forms.get({ formId });
      const form = formResponse.data;

      const questionIdToTitle: Record<string, string> = {};
      for (const item of form.items || []) {
        if (item.questionItem?.question?.questionId) {
          questionIdToTitle[item.questionItem.question.questionId] = item.title || 'Untitled';
        }
        if (item.questionGroupItem?.questions) {
          for (const q of item.questionGroupItem.questions) {
            if (q.questionId) {
              questionIdToTitle[q.questionId] = q.rowQuestion?.title || item.title || 'Untitled';
            }
          }
        }
      }

      let responses: any[];
      if (pageSize || timestampAfter) {
        const params: Record<string, unknown> = { formId };
        if (pageSize) params.pageSize = pageSize;
        if (timestampAfter) params.filter = `timestamp >= ${timestampAfter}`;
        const resp = await client.forms.responses.list(params as { formId: string });
        responses = resp.data.responses || [];
      } else {
        responses = await getAllResponses(client, formId);
      }

      // Transform each response into a title-keyed row
      const rows = responses.map((resp) => {
        const row: Record<string, string> = {};
        row['Response ID'] = resp.responseId || '';
        row['Submitted At'] = resp.lastSubmittedTime || '';

        if (resp.answers) {
          for (const [questionId, answer] of Object.entries(resp.answers)) {
            const title = questionIdToTitle[questionId] || questionId;
            row[title] = extractAnswerText(answer as Record<string, unknown>);
          }
        }

        return row;
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                formTitle: form.info?.title || '',
                responseCount: rows.length,
                columns: ['Response ID', 'Submitted At', ...Object.values(questionIdToTitle)],
                rows,
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

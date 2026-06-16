import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FormsClient } from '../../auth.js';
import { findQuestionIdByTitle, extractQuestionTitles, getAllResponses } from './utils.js';

const inputSchema = {
  formId: z.string().describe('The Google Form ID'),
  questionA: z.string().describe('Title of the first question (rows)'),
  questionB: z.string().describe('Title of the second question (columns)'),
};

export function registerCrossTabulate(server: McpServer, client: FormsClient) {
  server.registerTool(
    'cross_tabulate',
    {
      title: 'Cross Tabulate',
      description:
        'Create a cross-tabulation (contingency table) showing how answers to one question correlate with answers to another. Foundation for Sankey diagrams.',
      inputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ formId, questionA, questionB }) => {
      const formResponse = await client.forms.get({ formId });
      const form = formResponse.data;

      const idA = findQuestionIdByTitle(form, questionA);
      const idB = findQuestionIdByTitle(form, questionB);

      if (!idA || !idB) {
        const missing = [];
        if (!idA) missing.push(questionA);
        if (!idB) missing.push(questionB);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                error: `Question(s) not found: ${missing.map(q => `"${q}"`).join(', ')}`,
                availableQuestions: extractQuestionTitles(form),
              }, null, 2),
            },
          ],
        };
      }

      const responses = await getAllResponses(client, formId);
      const matrix: Record<string, Record<string, number>> = {};
      const rowTotals: Record<string, number> = {};
      const colTotals: Record<string, number> = {};
      let grandTotal = 0;

      for (const resp of responses) {
        const answersA = resp.answers?.[idA]?.textAnswers?.answers;
        const answersB = resp.answers?.[idB]?.textAnswers?.answers;
        if (!answersA || !answersB) continue;

        for (const a of answersA) {
          const valA = a.value ?? '(empty)';
          for (const b of answersB) {
            const valB = b.value ?? '(empty)';

            if (!matrix[valA]) matrix[valA] = {};
            matrix[valA][valB] = (matrix[valA][valB] || 0) + 1;
            rowTotals[valA] = (rowTotals[valA] || 0) + 1;
            colTotals[valB] = (colTotals[valB] || 0) + 1;
            grandTotal++;
          }
        }
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                questionA,
                questionB,
                totalResponses: responses.length,
                grandTotal,
                matrix,
                rowTotals,
                colTotals,
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


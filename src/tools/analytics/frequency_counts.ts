import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FormsClient } from '../../auth.js';
import { findQuestionIdByTitle, extractQuestionTitles, getAllResponses } from './utils.js';

const inputSchema = {
  formId: z.string().describe('The Google Form ID'),
  questionTitle: z.string().describe('The exact title of the question to analyze'),
};

export function registerAnalyzeFrequency(server: McpServer, client: FormsClient) {
  server.registerTool(
    'analyze_frequency',
    {
      title: 'Analyze Frequency',
      description:
        'Count the frequency of each answer value for a given question. Returns sorted frequency counts (highest first) with percentages.',
      inputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ formId, questionTitle }) => {
      const formResponse = await client.forms.get({ formId });
      const form = formResponse.data;

      const questionId = findQuestionIdByTitle(form, questionTitle);
      if (!questionId) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                error: `Question not found: "${questionTitle}"`,
                availableQuestions: extractQuestionTitles(form),
              }, null, 2),
            },
          ],
        };
      }

      const responses = await getAllResponses(client, formId);
      const counts: Record<string, number> = {};
      let totalAnswers = 0;

      for (const resp of responses) {
        const answers = resp.answers?.[questionId];
        if (!answers?.textAnswers?.answers) continue;

        for (const answer of answers.textAnswers.answers) {
          const value = answer.value ?? '(empty)';
          counts[value] = (counts[value] || 0) + 1;
          totalAnswers++;
        }
      }

      const sorted = Object.entries(counts)
        .map(([value, count]) => ({
          value,
          count,
          percentage: totalAnswers > 0 ? Math.round((count / totalAnswers) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.count - a.count);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                questionTitle,
                totalResponses: responses.length,
                totalAnswers,
                frequencies: sorted,
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

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FormsClient } from '../../auth.js';
import { findQuestionIdByTitle, extractQuestionTitles, getAllResponses } from './utils.js';

const inputSchema = {
  formId: z.string().describe('The Google Form ID'),
  stages: z
    .array(z.string())
    .min(2)
    .max(4)
    .describe('Question titles representing flow stages left-to-right'),
};

export function registerGenerateSankeyData(server: McpServer, client: FormsClient) {
  server.registerTool(
    'generate_sankey_data',
    {
      title: 'Generate Sankey Data',
      description:
        'Generate Sankey diagram data (source -> target -> value triples) from 2-4 questions representing flow stages. Output is compatible with SankeyMATIC and D3.',
      inputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ formId, stages }) => {
      const formResponse = await client.forms.get({ formId });
      const form = formResponse.data;

      const stageIds: { title: string; id: string }[] = [];
      const missing: string[] = [];

      for (const title of stages) {
        const id = findQuestionIdByTitle(form, title);
        if (id) {
          stageIds.push({ title, id });
        } else {
          missing.push(title);
        }
      }

      if (missing.length > 0) {
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
      const links: { source: string; target: string; value: number }[] = [];

      for (let i = 0; i < stageIds.length - 1; i++) {
        const fromStage = stageIds[i];
        const toStage = stageIds[i + 1];
        const flowCounts: Record<string, number> = {};

        for (const resp of responses) {
          const fromAnswers = resp.answers?.[fromStage.id]?.textAnswers?.answers;
          const toAnswers = resp.answers?.[toStage.id]?.textAnswers?.answers;
          if (!fromAnswers || !toAnswers) continue;

          for (const from of fromAnswers) {
            const fromVal = from.value ?? '(empty)';
            for (const to of toAnswers) {
              const toVal = to.value ?? '(empty)';
              const key = `${fromVal}\0${toVal}`;
              flowCounts[key] = (flowCounts[key] || 0) + 1;
            }
          }
        }

        for (const [key, value] of Object.entries(flowCounts)) {
          const [source, target] = key.split('\0');
          // Prefix with stage index to disambiguate identical labels across stages
          links.push({
            source: stageIds.length > 2 ? `[${fromStage.title}] ${source}` : source,
            target: stageIds.length > 2 ? `[${toStage.title}] ${target}` : target,
            value,
          });
        }
      }

      links.sort((a, b) => b.value - a.value);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                stages: stages,
                totalResponses: responses.length,
                links,
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


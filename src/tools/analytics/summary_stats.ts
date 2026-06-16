import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FormsClient } from '../../auth.js';
import { getAllResponses } from './utils.js';

const inputSchema = {
  formId: z.string().describe('The Google Form ID'),
};

export function registerResponseSummary(server: McpServer, client: FormsClient) {
  server.registerTool(
    'response_summary',
    {
      title: 'Response Summary',
      description:
        'Provide an overview of all responses: total count, and for each question either a frequency breakdown (choice questions) or basic stats like mean/median/min/max (scale questions).',
      inputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ formId }) => {
      const formResponse = await client.forms.get({ formId });
      const form = formResponse.data;
      const responses = await getAllResponses(client, formId);

      const questions: {
        questionId: string;
        title: string;
        type: string;
        isScale: boolean;
      }[] = [];

      for (const item of form.items || []) {
        if (item.questionItem?.question) {
          const q = item.questionItem.question;
          const type = getQuestionType(q);
          questions.push({
            questionId: q.questionId!,
            title: item.title ?? '(untitled)',
            type,
            isScale: type === 'SCALE',
          });
        }
        if (item.questionGroupItem?.questions) {
          for (const q of item.questionGroupItem.questions) {
            const type = getQuestionType(q);
            questions.push({
              questionId: q.questionId!,
              title: item.title ?? '(untitled)',
              type,
              isScale: type === 'SCALE',
            });
          }
        }
      }

      const summaries = questions.map((q) => {
        const values: string[] = [];
        for (const resp of responses) {
          const answers = resp.answers?.[q.questionId]?.textAnswers?.answers;
          if (answers) {
            for (const a of answers) {
              if (a.value) values.push(a.value);
            }
          }
        }

        if (q.isScale) {
          return {
            questionTitle: q.title,
            questionType: q.type,
            responseCount: values.length,
            stats: computeNumericStats(values),
          };
        }

        const freq: Record<string, number> = {};
        for (const v of values) {
          freq[v] = (freq[v] || 0) + 1;
        }
        const sorted = Object.entries(freq)
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => b.count - a.count);

        return {
          questionTitle: q.title,
          questionType: q.type,
          responseCount: values.length,
          frequencies: sorted,
        };
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                formTitle: form.info?.title ?? '(untitled)',
                totalResponses: responses.length,
                questionCount: questions.length,
                questions: summaries,
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

function getQuestionType(question: any): string {
  if (question.scaleQuestion) return 'SCALE';
  if (question.choiceQuestion) return 'CHOICE';
  if (question.textQuestion) return 'TEXT';
  if (question.dateQuestion) return 'DATE';
  if (question.timeQuestion) return 'TIME';
  if (question.fileUploadQuestion) return 'FILE_UPLOAD';
  if (question.rowQuestion) return 'ROW';
  return 'UNKNOWN';
}

function computeNumericStats(values: string[]): {
  mean: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
  count: number;
} {
  const nums = values.map(Number).filter((n) => !isNaN(n));
  if (nums.length === 0) {
    return { mean: null, median: null, min: null, max: null, count: 0 };
  }

  nums.sort((a, b) => a - b);
  const sum = nums.reduce((acc, n) => acc + n, 0);
  const mean = Math.round((sum / nums.length) * 100) / 100;
  const mid = Math.floor(nums.length / 2);
  const median =
    nums.length % 2 === 0
      ? Math.round(((nums[mid - 1] + nums[mid]) / 2) * 100) / 100
      : nums[mid];

  return {
    mean,
    median,
    min: nums[0],
    max: nums[nums.length - 1],
    count: nums.length,
  };
}


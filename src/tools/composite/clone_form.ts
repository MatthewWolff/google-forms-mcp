import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FormsClient } from '../../auth.js';

const inputSchema = {
  formId: z.string().describe('The form ID to clone'),
  newTitle: z.string().optional().describe('Title for the cloned form. Defaults to "Copy of [original title]"'),
};

interface FormItem {
  itemId?: string;
  title?: string;
  description?: string;
  questionItem?: {
    question?: {
      questionId?: string;
      required?: boolean;
      choiceQuestion?: Record<string, unknown>;
      textQuestion?: Record<string, unknown>;
      scaleQuestion?: Record<string, unknown>;
      dateQuestion?: Record<string, unknown>;
      timeQuestion?: Record<string, unknown>;
      ratingQuestion?: Record<string, unknown>;
    };
  };
  pageBreakItem?: Record<string, unknown>;
  textItem?: Record<string, unknown>;
}

function buildCreateItemRequest(item: FormItem, index: number): Record<string, unknown> {
  const newItem: Record<string, unknown> = {};

  if (item.title) newItem.title = item.title;
  if (item.description) newItem.description = item.description;

  if (item.questionItem?.question) {
    const originalQuestion = item.questionItem.question;
    const question: Record<string, unknown> = {};

    if (originalQuestion.required !== undefined) {
      question.required = originalQuestion.required;
    }

    if (originalQuestion.choiceQuestion) {
      question.choiceQuestion = originalQuestion.choiceQuestion;
    } else if (originalQuestion.textQuestion) {
      question.textQuestion = originalQuestion.textQuestion;
    } else if (originalQuestion.scaleQuestion) {
      question.scaleQuestion = originalQuestion.scaleQuestion;
    } else if (originalQuestion.dateQuestion) {
      question.dateQuestion = originalQuestion.dateQuestion;
    } else if (originalQuestion.timeQuestion) {
      question.timeQuestion = originalQuestion.timeQuestion;
    } else if (originalQuestion.ratingQuestion) {
      question.ratingQuestion = originalQuestion.ratingQuestion;
    }

    newItem.questionItem = { question };
  } else if (item.pageBreakItem) {
    newItem.pageBreakItem = {};
  } else if (item.textItem) {
    newItem.textItem = {};
  }

  return {
    createItem: {
      item: newItem,
      location: { index },
    },
  };
}

export function registerCloneForm(server: McpServer, client: FormsClient) {
  server.registerTool(
    'clone_form',
    {
      title: 'Clone Form',
      description:
        'Duplicate a Google Form by reading the original and recreating it with all items (questions, sections, text items). Returns the new form ID and URLs.',
      inputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ formId, newTitle }) => {
      const original = await client.forms.get({ formId });
      const originalData = original.data;

      const originalTitle = originalData.info?.title || 'Untitled Form';
      const clonedTitle = newTitle || `Copy of ${originalTitle}`;

      const createResponse = await client.forms.create({
        requestBody: {
          info: { title: clonedTitle, documentTitle: clonedTitle },
        },
      });

      const newFormId = createResponse.data.formId!;
      const requests: Record<string, unknown>[] = [];

      if (originalData.info?.description) {
        requests.push({
          updateFormInfo: {
            info: { description: originalData.info.description },
            updateMask: 'description',
          },
        });
      }

      const items = (originalData.items || []) as FormItem[];
      for (let i = 0; i < items.length; i++) {
        requests.push(buildCreateItemRequest(items[i], i));
      }

      if (requests.length > 0) {
        try {
          await client.forms.batchUpdate({
            formId: newFormId,
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
                  error: `Failed to populate cloned form: ${message}`,
                  orphanFormId: newFormId,
                  editUrl: `https://docs.google.com/forms/d/${newFormId}/edit`,
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
                originalFormId: formId,
                newFormId,
                editUrl: `https://docs.google.com/forms/d/${newFormId}/edit`,
                respondUrl: `https://docs.google.com/forms/d/${newFormId}/viewform`,
                title: clonedTitle,
                itemsCloned: items.length,
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

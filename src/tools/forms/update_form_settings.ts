import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FormsClient } from '../../auth.js';

const inputSchema = {
  formId: z.string().describe('The Google Form ID'),
  isQuiz: z.boolean().optional().describe('Enable or disable quiz mode (enables grading)'),
  emailCollection: z
    .enum(['DO_NOT_COLLECT', 'VERIFIED', 'RESPONDER_INPUT'])
    .optional()
    .describe(
      'Email collection setting. VERIFIED auto-collects from signed-in users. RESPONDER_INPUT adds a manual entry field.'
    ),
};

export function registerUpdateFormSettings(server: McpServer, client: FormsClient) {
  server.registerTool(
    'update_form_settings',
    {
      title: 'Update Form Settings',
      description: 'Update form settings such as quiz mode and email collection.',
      inputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ formId, isQuiz, emailCollection }) => {
      const updateFields: string[] = [];
      const settings: Record<string, unknown> = {};

      if (isQuiz !== undefined) {
        settings.quizSettings = { isQuiz };
        updateFields.push('quizSettings.isQuiz');
      }

      if (emailCollection !== undefined) {
        settings.emailCollectionType = emailCollection;
        updateFields.push('emailCollectionType');
      }

      if (updateFields.length === 0) {
        return {
          content: [{ type: 'text' as const, text: 'No settings to update.' }],
        };
      }

      await client.forms.batchUpdate({
        formId,
        requestBody: {
          requests: [
            {
              updateSettings: {
                settings,
                updateMask: updateFields.join(','),
              },
            },
          ],
        },
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `Updated form settings: ${updateFields.join(', ')}`,
          },
        ],
      };
    }
  );
}

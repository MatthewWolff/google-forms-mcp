import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FormsClient } from '../../auth.js';

const inputSchema = {
  title: z.string().describe('The title displayed to form respondents'),
  description: z.string().optional().describe('Optional description shown below the title'),
};

export function registerCreateForm(server: McpServer, client: FormsClient) {
  server.registerTool(
    'create_form',
    {
      title: 'Create Form',
      description:
        'Create a new Google Form. Returns the form ID and URLs. Add questions afterwards using add_question.',
      inputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ title, description }) => {
      const response = await client.forms.create({
        requestBody: {
          info: {
            title,
            documentTitle: title,
          },
        },
      });

      const formId = response.data.formId!;

      if (description) {
        await client.forms.batchUpdate({
          formId,
          requestBody: {
            requests: [
              {
                updateFormInfo: {
                  info: { description },
                  updateMask: 'description',
                },
              },
            ],
          },
        });
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                formId,
                editUrl: `https://docs.google.com/forms/d/${formId}/edit`,
                respondUrl: `https://docs.google.com/forms/d/${formId}/viewform`,
                title,
                description: description || '',
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

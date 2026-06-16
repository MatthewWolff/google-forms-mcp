import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FormsClient } from '../../auth.js';

const inputSchema = {
  formId: z
    .string()
    .describe("The Google Form ID (found in the form's URL between /d/ and /edit)"),
};

export function registerGetForm(server: McpServer, client: FormsClient) {
  server.registerTool(
    'get_form',
    {
      title: 'Get Form',
      description:
        'Retrieve full form details including all items, questions, settings, and metadata.',
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

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    }
  );
}

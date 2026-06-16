import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FormsClient } from '../../auth.js';

const inputSchema = {
  formId: z.string().describe('The Google Form ID'),
};

export function registerListWatches(server: McpServer, client: FormsClient) {
  server.registerTool(
    'list_watches',
    {
      title: 'List Watches',
      description: 'List all active watches on a form owned by the current project.',
      inputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ formId }) => {
      const response = await client.forms.watches.list({ formId });

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

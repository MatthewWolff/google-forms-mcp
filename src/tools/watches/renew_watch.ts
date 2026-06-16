import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FormsClient } from '../../auth.js';

const inputSchema = {
  formId: z.string().describe('The Google Form ID'),
  watchId: z.string().describe('The watch ID to renew'),
};

export function registerRenewWatch(server: McpServer, client: FormsClient) {
  server.registerTool(
    'renew_watch',
    {
      title: 'Renew Watch',
      description: 'Renew a watch for another 7 days before it expires.',
      inputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ formId, watchId }) => {
      const response = await client.forms.watches.renew({ formId, watchId });

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

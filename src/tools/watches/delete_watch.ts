import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FormsClient } from '../../auth.js';

const inputSchema = {
  formId: z.string().describe('The Google Form ID'),
  watchId: z.string().describe('The watch ID to delete'),
};

export function registerDeleteWatch(server: McpServer, client: FormsClient) {
  server.registerTool(
    'delete_watch',
    {
      title: 'Delete Watch',
      description: 'Delete a watch, stopping notifications for the associated event.',
      inputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ formId, watchId }) => {
      await client.forms.watches.delete({ formId, watchId });

      return {
        content: [
          {
            type: 'text' as const,
            text: `Deleted watch ${watchId}`,
          },
        ],
      };
    }
  );
}

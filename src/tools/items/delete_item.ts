import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FormsClient } from '../../auth.js';

const inputSchema = {
  formId: z.string().describe('The Google Form ID'),
  index: z.number().int().min(0).describe('The 0-based index of the item to delete'),
};

export function registerDeleteItem(server: McpServer, client: FormsClient) {
  server.registerTool(
    'delete_item',
    {
      title: 'Delete Item',
      description:
        'Delete a form item (question, section, text block) at the given index. This is irreversible.',
      inputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ formId, index }) => {
      await client.forms.batchUpdate({
        formId,
        requestBody: {
          requests: [{ deleteItem: { location: { index } } }],
        },
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `Deleted item at index ${index}`,
          },
        ],
      };
    }
  );
}

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FormsClient } from '../../auth.js';

const inputSchema = {
  formId: z.string().describe('The Google Form ID'),
  fromIndex: z.number().int().min(0).describe('Current 0-based index of the item'),
  toIndex: z.number().int().min(0).describe('Target 0-based index to move the item to'),
};

export function registerMoveItem(server: McpServer, client: FormsClient) {
  server.registerTool(
    'move_item',
    {
      title: 'Move Item',
      description: 'Move a form item from one position to another.',
      inputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ formId, fromIndex, toIndex }) => {
      await client.forms.batchUpdate({
        formId,
        requestBody: {
          requests: [
            {
              moveItem: {
                originalLocation: { index: fromIndex },
                newLocation: { index: toIndex },
              },
            },
          ],
        },
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `Moved item from index ${fromIndex} to ${toIndex}`,
          },
        ],
      };
    }
  );
}

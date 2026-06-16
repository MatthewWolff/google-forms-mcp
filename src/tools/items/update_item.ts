import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FormsClient } from '../../auth.js';

const inputSchema = {
  formId: z.string().describe('The Google Form ID'),
  index: z.number().int().min(0).describe('The 0-based index of the item to update'),
  title: z.string().optional().describe('New title for the item'),
  description: z.string().optional().describe('New description for the item'),
};

export function registerUpdateItem(server: McpServer, client: FormsClient) {
  server.registerTool(
    'update_item',
    {
      title: 'Update Item',
      description:
        'Update the title and/or description of an existing form item at the given index. To change question-specific properties, delete and re-add the item.',
      inputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ formId, index, title, description }) => {
      const form = await client.forms.get({ formId });
      const existingItem = form.data.items?.[index];

      if (!existingItem) {
        return {
          content: [{ type: 'text' as const, text: `No item found at index ${index}` }],
          isError: true,
        };
      }

      const updateFields: string[] = [];
      const updatedItem: Record<string, unknown> = { ...existingItem };

      if (title !== undefined) {
        updatedItem.title = title;
        updateFields.push('title');
      }
      if (description !== undefined) {
        updatedItem.description = description;
        updateFields.push('description');
      }

      if (updateFields.length === 0) {
        return {
          content: [{ type: 'text' as const, text: 'No fields to update.' }],
        };
      }

      await client.forms.batchUpdate({
        formId,
        requestBody: {
          requests: [
            {
              updateItem: {
                item: updatedItem,
                location: { index },
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
            text: `Updated item at index ${index}: ${updateFields.join(', ')}`,
          },
        ],
      };
    }
  );
}

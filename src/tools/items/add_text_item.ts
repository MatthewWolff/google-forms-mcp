import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FormsClient } from '../../auth.js';

const inputSchema = {
  formId: z.string().describe('The Google Form ID'),
  title: z.string().describe('Title/heading for the text block'),
  description: z.string().optional().describe('Body text content'),
  index: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Position to insert at (0-based). Omit to append at end.'),
};

export function registerAddTextItem(server: McpServer, client: FormsClient) {
  server.registerTool(
    'add_text_item',
    {
      title: 'Add Text Item',
      description:
        'Add a static text block (non-question) to the form. Useful for instructions or informational content between questions.',
      inputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ formId, title, description, index }) => {
      const location: Record<string, unknown> = {};
      if (index !== undefined) {
        location.index = index;
      } else {
        const form = await client.forms.get({ formId });
        location.index = form.data.items?.length ?? 0;
      }

      await client.forms.batchUpdate({
        formId,
        requestBody: {
          requests: [
            {
              createItem: {
                item: {
                  title,
                  description: description || '',
                  textItem: {},
                },
                location,
              },
            },
          ],
        },
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `Added text item "${title}" at index ${location.index}`,
          },
        ],
      };
    }
  );
}

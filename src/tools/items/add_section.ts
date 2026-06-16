import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FormsClient } from '../../auth.js';

const inputSchema = {
  formId: z.string().describe('The Google Form ID'),
  title: z.string().describe('Section header text'),
  description: z.string().optional().describe('Section description text'),
  index: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Position to insert at (0-based). Omit to append at end.'),
};

export function registerAddSection(server: McpServer, client: FormsClient) {
  server.registerTool(
    'add_section',
    {
      title: 'Add Section',
      description:
        'Add a page break / section header to the form. Creates a new page with a title and optional description.',
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
                  pageBreakItem: {},
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
            text: `Added section "${title}" at index ${location.index}`,
          },
        ],
      };
    }
  );
}

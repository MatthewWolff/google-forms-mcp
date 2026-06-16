import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FormsClient } from '../../auth.js';

const inputSchema = {
  formId: z.string().describe('The Google Form ID'),
  title: z.string().optional().describe('New title for the form'),
  description: z.string().optional().describe('New description for the form'),
};

export function registerUpdateFormInfo(server: McpServer, client: FormsClient) {
  server.registerTool(
    'update_form_info',
    {
      title: 'Update Form Info',
      description: 'Update the title and/or description of an existing form.',
      inputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ formId, title, description }) => {
      const updateFields: string[] = [];
      const info: Record<string, string> = {};

      if (title !== undefined) {
        info.title = title;
        updateFields.push('title');
      }
      if (description !== undefined) {
        info.description = description;
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
              updateFormInfo: {
                info,
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
            text: `Updated form info: ${updateFields.join(', ')}`,
          },
        ],
      };
    }
  );
}

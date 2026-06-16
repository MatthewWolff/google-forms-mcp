import { z } from 'zod';
import { google } from 'googleapis';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FormsClient } from '../../auth.js';

const inputSchema = {
  formId: z.string().describe('The Google Form ID to delete'),
};

export function registerDeleteForm(server: McpServer, client: FormsClient) {
  server.registerTool(
    'delete_form',
    {
      title: 'Delete Form',
      description:
        'Permanently delete a Google Form. This moves it to trash via the Drive API. This action is irreversible.',
      inputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ formId }) => {
      const drive = google.drive({ version: 'v3', auth: (client as any)._options.auth });

      await drive.files.delete({ fileId: formId });

      return {
        content: [
          {
            type: 'text' as const,
            text: `Deleted form ${formId}`,
          },
        ],
      };
    }
  );
}

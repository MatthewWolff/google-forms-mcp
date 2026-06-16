import { z } from 'zod';
import { google } from 'googleapis';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FormsClient } from '../../auth.js';

const inputSchema = {
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(20)
    .describe('Number of forms to return (1-100, default 20)'),
  pageToken: z.string().optional().describe('Pagination token from a previous response'),
};

export function registerListForms(server: McpServer, client: FormsClient) {
  server.registerTool(
    'list_forms',
    {
      title: 'List Forms',
      description:
        'List Google Forms owned by the authenticated user. Returns form IDs, titles, and edit/respond URLs.',
      inputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ pageSize, pageToken }) => {
      const drive = google.drive({ version: 'v3', auth: (client as any)._options.auth });

      const params: Record<string, unknown> = {
        q: "mimeType='application/vnd.google-apps.form' and trashed=false",
        fields: 'nextPageToken,files(id,name,createdTime,modifiedTime)',
        orderBy: 'modifiedTime desc',
        pageSize,
      };
      if (pageToken) params.pageToken = pageToken;

      const response = await drive.files.list(params as any);
      const files = response.data.files || [];

      const forms = files.map((f: any) => ({
        formId: f.id,
        title: f.name,
        editUrl: `https://docs.google.com/forms/d/${f.id}/edit`,
        respondUrl: `https://docs.google.com/forms/d/${f.id}/viewform`,
        createdTime: f.createdTime,
        modifiedTime: f.modifiedTime,
      }));

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                formCount: forms.length,
                nextPageToken: response.data.nextPageToken || null,
                forms,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}

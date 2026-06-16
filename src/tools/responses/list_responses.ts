import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FormsClient } from '../../auth.js';

const inputSchema = {
  formId: z.string().describe('The Google Form ID'),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(5000)
    .optional()
    .describe('Max responses to return (1-5000, default 100)'),
  pageToken: z.string().optional().describe('Pagination token from a previous response'),
  timestampAfter: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/, 'Must be RFC3339 UTC format (e.g., 2024-01-01T00:00:00Z)')
    .optional()
    .describe('Only return responses submitted after this RFC3339 timestamp (e.g., 2024-01-01T00:00:00Z)'),
};

export function registerListResponses(server: McpServer, client: FormsClient) {
  server.registerTool(
    'list_responses',
    {
      title: 'List Responses',
      description:
        'List form responses with optional pagination and timestamp filtering. Returns answers keyed by question ID.',
      inputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ formId, pageSize, pageToken, timestampAfter }) => {
      const params: Record<string, unknown> = { formId };

      if (pageSize) params.pageSize = pageSize;
      if (pageToken) params.pageToken = pageToken;
      if (timestampAfter) params.filter = `timestamp >= ${timestampAfter}`;

      const response = await client.forms.responses.list(params as { formId: string });

      const data = response.data;
      const responseCount = data.responses?.length ?? 0;

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                responseCount,
                nextPageToken: data.nextPageToken || null,
                responses: data.responses || [],
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

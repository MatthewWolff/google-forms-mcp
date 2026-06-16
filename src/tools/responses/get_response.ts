import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FormsClient } from '../../auth.js';

const inputSchema = {
  formId: z.string().describe('The Google Form ID'),
  responseId: z.string().describe('The specific response ID to retrieve'),
};

export function registerGetResponse(server: McpServer, client: FormsClient) {
  server.registerTool(
    'get_response',
    {
      title: 'Get Response',
      description: 'Retrieve a single form response by its ID.',
      inputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ formId, responseId }) => {
      const response = await client.forms.responses.get({ formId, responseId });

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    }
  );
}

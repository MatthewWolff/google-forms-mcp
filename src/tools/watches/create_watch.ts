import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FormsClient } from '../../auth.js';

const inputSchema = {
  formId: z.string().describe('The Google Form ID'),
  eventType: z
    .enum(['SCHEMA', 'RESPONSES'])
    .describe('SCHEMA fires on form structure changes. RESPONSES fires on new submissions.'),
  topicName: z
    .string()
    .regex(/^projects\/[a-z][a-z0-9-]{4,28}[a-z0-9]\/topics\/[a-zA-Z][a-zA-Z0-9._-]*$/, 'Must be a valid Pub/Sub topic: projects/{project}/topics/{topic}')
    .describe(
      'Full Cloud Pub/Sub topic name (e.g., projects/my-project/topics/my-topic). Must grant publish to forms-notifications@system.gserviceaccount.com'
    ),
};

export function registerCreateWatch(server: McpServer, client: FormsClient) {
  server.registerTool(
    'create_watch',
    {
      title: 'Create Watch',
      description:
        'Create a Pub/Sub watch on a form to receive notifications when the form structure changes or new responses are submitted. Watches expire after 7 days and must be renewed.',
      inputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ formId, eventType, topicName }) => {
      const response = await client.forms.watches.create({
        formId,
        requestBody: {
          watch: {
            target: {
              topic: { topicName },
            },
            eventType,
          },
        },
      });

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

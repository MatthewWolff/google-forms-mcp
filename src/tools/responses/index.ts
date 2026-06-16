import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FormsClient } from '../../auth.js';
import { registerListResponses } from './list_responses.js';
import { registerGetResponse } from './get_response.js';

export function registerResponsesTools(server: McpServer, client: FormsClient) {
  registerListResponses(server, client);
  registerGetResponse(server, client);
}

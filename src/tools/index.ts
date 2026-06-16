import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FormsClient } from '../auth.js';
import { registerFormsTools } from './forms/index.js';
import { registerItemsTools } from './items/index.js';
import { registerResponsesTools } from './responses/index.js';
import { registerWatchesTools } from './watches/index.js';
import { registerCompositeTools } from './composite/index.js';
import { registerAnalyticsTools } from './analytics/index.js';

export function registerAllTools(server: McpServer, client: FormsClient) {
  registerFormsTools(server, client);
  registerItemsTools(server, client);
  registerResponsesTools(server, client);
  registerWatchesTools(server, client);
  registerCompositeTools(server, client);
  registerAnalyticsTools(server, client);
}

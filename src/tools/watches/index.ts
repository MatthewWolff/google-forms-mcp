import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FormsClient } from '../../auth.js';
import { registerCreateWatch } from './create_watch.js';
import { registerListWatches } from './list_watches.js';
import { registerDeleteWatch } from './delete_watch.js';
import { registerRenewWatch } from './renew_watch.js';

export function registerWatchesTools(server: McpServer, client: FormsClient) {
  registerCreateWatch(server, client);
  registerListWatches(server, client);
  registerDeleteWatch(server, client);
  registerRenewWatch(server, client);
}

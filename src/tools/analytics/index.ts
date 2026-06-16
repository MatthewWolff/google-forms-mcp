import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FormsClient } from '../../auth.js';
import { registerAnalyzeFrequency } from './frequency_counts.js';
import { registerCrossTabulate } from './cross_tabulate.js';
import { registerGenerateSankeyData } from './sankey_data.js';
import { registerResponseSummary } from './summary_stats.js';

export function registerAnalyticsTools(server: McpServer, client: FormsClient) {
  registerAnalyzeFrequency(server, client);
  registerCrossTabulate(server, client);
  registerGenerateSankeyData(server, client);
  registerResponseSummary(server, client);
}

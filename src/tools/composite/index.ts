import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FormsClient } from '../../auth.js';
import { registerBuildForm } from './build_form.js';
import { registerGetFormSummary } from './get_form_summary.js';
import { registerGetResponsesTable } from './get_responses_table.js';
import { registerCloneForm } from './clone_form.js';
import { registerExportResponsesCsv } from './export_responses_csv.js';

export function registerCompositeTools(server: McpServer, client: FormsClient) {
  registerBuildForm(server, client);
  registerGetFormSummary(server, client);
  registerGetResponsesTable(server, client);
  registerCloneForm(server, client);
  registerExportResponsesCsv(server, client);
}

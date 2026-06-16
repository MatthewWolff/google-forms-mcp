import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FormsClient } from '../../auth.js';
import { registerCreateForm } from './create_form.js';
import { registerGetForm } from './get_form.js';
import { registerListForms } from './list_forms.js';
import { registerDeleteForm } from './delete_form.js';
import { registerUpdateFormInfo } from './update_form_info.js';
import { registerUpdateFormSettings } from './update_form_settings.js';

export function registerFormsTools(server: McpServer, client: FormsClient) {
  registerCreateForm(server, client);
  registerGetForm(server, client);
  registerListForms(server, client);
  registerDeleteForm(server, client);
  registerUpdateFormInfo(server, client);
  registerUpdateFormSettings(server, client);
}

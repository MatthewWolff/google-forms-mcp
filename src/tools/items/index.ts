import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FormsClient } from '../../auth.js';
import { registerAddQuestion } from './add_question.js';
import { registerAddSection } from './add_section.js';
import { registerAddTextItem } from './add_text_item.js';
import { registerUpdateItem } from './update_item.js';
import { registerDeleteItem } from './delete_item.js';
import { registerMoveItem } from './move_item.js';

export function registerItemsTools(server: McpServer, client: FormsClient) {
  registerAddQuestion(server, client);
  registerAddSection(server, client);
  registerAddTextItem(server, client);
  registerUpdateItem(server, client);
  registerDeleteItem(server, client);
  registerMoveItem(server, client);
}

#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createFormsClient } from './auth.js';
import { registerAllTools } from './tools/index.js';

const server = new McpServer({
  name: 'google-forms-mcp',
  version: '1.0.0',
});

const formsClient = createFormsClient();

registerAllTools(server, formsClient);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('Google Forms MCP server running on stdio');

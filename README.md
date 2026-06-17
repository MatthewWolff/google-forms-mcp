# Google Forms MCP Server

[![npm version](https://img.shields.io/npm/v/@matthewwolff/google-forms-mcp)](https://www.npmjs.com/package/@matthewwolff/google-forms-mcp)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A comprehensive [Model Context Protocol](https://modelcontextprotocol.io) server for the Google Forms API. Enables LLMs to create, manage, and analyze Google Forms.

## Install

```bash
npx @matthewwolff/google-forms-mcp
```

Or install globally:

```bash
npm install -g @matthewwolff/google-forms-mcp
google-forms-mcp
```

## Setup

### 1. Google Cloud project

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the **Google Forms API** and **Google Drive API**
3. Configure the OAuth consent screen (External, add your email as a test user)
4. Create an **OAuth 2.0 Client ID** (Application type: Desktop app)
5. Note your Client ID and Client Secret

### 2. Get a refresh token

```bash
GOOGLE_CLIENT_ID="your_id" GOOGLE_CLIENT_SECRET="your_secret" npx @matthewwolff/google-forms-mcp-auth
```

This opens a browser for OAuth consent and prints your refresh token.

### 3. Add to your MCP client

**Claude Code** (`~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "google-forms": {
      "command": "npx",
      "args": ["-y", "@matthewwolff/google-forms-mcp"],
      "env": {
        "GOOGLE_CLIENT_ID": "your_client_id",
        "GOOGLE_CLIENT_SECRET": "your_client_secret",
        "GOOGLE_REFRESH_TOKEN": "your_refresh_token"
      }
    }
  }
}
```

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "google-forms": {
      "command": "npx",
      "args": ["-y", "@matthewwolff/google-forms-mcp"],
      "env": {
        "GOOGLE_CLIENT_ID": "your_client_id",
        "GOOGLE_CLIENT_SECRET": "your_client_secret",
        "GOOGLE_REFRESH_TOKEN": "your_refresh_token"
      }
    }
  }
}
```

## Tools

| Category | Tools | Capability |
|----------|-------|------------|
| **Forms** | `create_form`, `get_form`, `list_forms`, `delete_form`, `update_form_info`, `update_form_settings` | Full form lifecycle |
| **Items** | `add_question`, `add_section`, `add_text_item`, `update_item`, `delete_item`, `move_item` | All question types: radio, checkbox, dropdown, text, paragraph, scale, date, time, rating |
| **Responses** | `list_responses`, `get_response` | Paginated retrieval with timestamp filtering |
| **Watches** | `create_watch`, `list_watches`, `delete_watch`, `renew_watch` | Pub/Sub notifications on submissions or schema changes |
| **Composite** | `build_form`, `get_form_summary`, `get_responses_table`, `clone_form`, `export_responses_csv` | High-level operations that would otherwise take multiple calls |
| **Analytics** | `analyze_frequency`, `cross_tabulate`, `generate_sankey_data`, `response_summary` | In-server data analysis |

## Examples

### Build an entire form in one call

```
Use build_form to create a feedback survey with:
- Section "About You": name (text), role (dropdown: Engineer/Designer/PM)
- Section "Feedback": rating (scale 1-10), comments (paragraph)
```

### Generate Sankey diagram data

```
Use generate_sankey_data on form XYZ with stages:
["How did you hear about us?", "Which plan did you choose?", "Are you still using it?"]
```

Returns source/target/value triples ready for SankeyMATIC or D3:

```json
[
  { "source": "Google Search", "target": "Free", "value": 12 },
  { "source": "Google Search", "target": "Pro", "value": 8 },
  { "source": "Friend referral", "target": "Pro", "value": 6 }
]
```

### Export responses as CSV

```
Use export_responses_csv on form XYZ
```

## Troubleshooting

**"Google Forms API has not been used in project..."**
Enable the Forms API (and Drive API) in your Google Cloud Console.

**Refresh token stops working after 7 days**
Your OAuth app is likely in "Testing" mode. Publish it in the consent screen settings, or re-run the auth flow.

**"Request had insufficient authentication scopes"**
Re-run `npx @matthewwolff/google-forms-mcp-auth` to get a new token with the correct scopes.

## Development

```bash
git clone https://github.com/MatthewWolff/google-forms-mcp
cd google-forms-mcp
npm install
npm run build
cp .env.example .env  # fill in your credentials
npm run test:integration
```

## Architecture

```
src/
  index.ts              # MCP server entry point (stdio transport)
  auth.ts               # OAuth2 client factory
  get-refresh-token.ts  # Token acquisition script
  tools/
    forms/              # CRUD on forms
    items/              # Questions, sections, text blocks
    responses/          # Submission retrieval
    watches/            # Pub/Sub notification management
    composite/          # High-level multi-step operations
    analytics/          # In-server data analysis
```

## License

MIT

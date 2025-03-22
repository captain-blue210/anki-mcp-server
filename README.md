# Anki MCP Server

An MCP (Model Context Protocol) server for Claude Desktop that connects to Anki via AnkiConnect and retrieves leech-tagged cards.

## Features

- Connects to Anki via AnkiConnect API
- Retrieves cards with "leech" tags
- Provides comprehensive card data for analysis by Claude
- Can be used with Claude Desktop

## Prerequisites

- [Anki](https://apps.ankiweb.net/) installed and running
- [AnkiConnect](https://ankiweb.net/shared/info/2055492159) add-on installed in Anki
- Node.js and npm

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/anki-mcp-server.git
   cd anki-mcp-server
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Build the project:
   ```
   npm run build
   ```

## Configuration

The server can be configured using environment variables. Copy the provided example file to create your own configuration:

```
cp .env.example .env
```

Then edit the `.env` file to customize your settings:

| Environment Variable   | Description                                | Default Value           |
| ---------------------- | ------------------------------------------ | ----------------------- |
| `ANKI_CONNECT_URL`     | The URL of the Anki Connect API            | `http://localhost:8765` |
| `ANKI_CONNECT_VERSION` | The version of the Anki Connect API to use | `6`                     |

If the environment variables are not set, the server will use the default values.

## Usage

1. Make sure Anki is running with AnkiConnect installed
2. Run the MCP server:
   ```
   npm start
   ```

## Configuring Claude Desktop

To use this MCP server with Claude Desktop:

1. Open Claude Desktop
2. Edit the Claude Desktop configuration file located at:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

3. Add the following configuration to the `mcpServers` section:

```json
{
  "mcpServers": {
    "anki": {
      "command": "node",
      "args": ["Users/captain-blue/GitHub/anki-mcp-server/dist/index.js"]
    }
  }
}
```

Replace `"path/to/anki-mcp-server"` with the actual path to where you cloned this repository.

## MCP Tool Usage

Once configured, you can use the `get_leech_cards` tool in Claude:

```
Could you analyze my Anki leech cards and suggest ways to improve my study?
```

Claude will use the MCP server to retrieve your leech cards and analyze them.

## Available Tools

### get_leech_cards

Retrieves cards tagged as leeches from Anki.

Parameters:
- `detailed` (optional, boolean, default: true): Whether to return comprehensive card data or just IDs
- `count` (optional, number): Number of random cards to return (defaults to all cards)

## Troubleshooting

- **"Could not connect to Anki"** - Make sure Anki is running and AnkiConnect is properly installed
- **"No leech cards found"** - You don't have any cards tagged as "leech" in Anki
- **Other connection issues** - Check that AnkiConnect is configured to allow connections from localhost/your local IP address (port 8765)

## License

MIT

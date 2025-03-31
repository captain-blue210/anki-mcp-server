# Anki MCP Server
[![smithery badge](https://smithery.ai/badge/@captain-blue210/anki-mcp-server)](https://smithery.ai/server/@captain-blue210/anki-mcp-server)

An MCP (Model Context Protocol) server for Claude Desktop that connects to Anki via AnkiConnect and retrieves leech-tagged cards.

## Features

- Connects to Anki via AnkiConnect API
- Retrieves cards with "leech" tags
- Adds date-stamped review tags to cards
- Provides comprehensive card data for analysis by Claude
- Can be used with Claude Desktop

## Prerequisites

- [Anki](https://apps.ankiweb.net/) installed and running
- [AnkiConnect](https://ankiweb.net/shared/info/2055492159) add-on installed in Anki
- Node.js and npm

## Installation

### Installing via Smithery

To install Anki MCP Server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@captain-blue210/anki-mcp-server):

```bash
npx -y @smithery/cli install @captain-blue210/anki-mcp-server --client claude
```

### Manual Installation
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
| `ANKI_MOCK_MODE`       | Enable mock mode for testing (true/false)  | `false`                 |

If the environment variables are not set, the server will use the default values.

### Finding Your Local IP Address for AnkiConnect

If connecting to `localhost` doesn't work, you'll need to use your computer's local IP address instead. Configure your `.env` file with:

```
ANKI_CONNECT_URL=http://YOUR_LOCAL_IP:8765
```

To find your local IP address:

- **macOS**: Open Terminal and run `ifconfig` or `ipconfig getifaddr en0` (for WiFi)
- **Windows**: Open Command Prompt and run `ipconfig`
- **Linux**: Open Terminal and run `ip addr show` or `hostname -I`

Look for IPv4 addresses like `192.168.x.x` or `10.x.x.x` in the output.

### Test Configuration

For testing, a separate configuration file `.env.test` is provided:

```
cp .env.example .env.test
```

Edit `.env.test` to set test-specific values:

```
ANKI_CONNECT_URL=http://localhost:8765
ANKI_CONNECT_VERSION=6
ANKI_MOCK_MODE=true
```

To run in test mode:

```
npm run start:test
```

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
      "args": ["path/to/anki-mcp-server/dist/index.js"]
    }
  }
}
```

Replace `"path/to/anki-mcp-server"` with the actual path to where you cloned this repository.

## MCP Tool Usage

Once configured, you can use the following tools in Claude:

### Example Usage

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

### tag_reviewed_cards

Adds a date-stamped "reviewed" tag to specified cards. This allows you to track which cards you've reviewed with Claude.

Parameters:
- `card_ids` (required, array of numbers): Array of card IDs to tag as reviewed
- `custom_tag_prefix` (optional, string, default: "見直し"): Custom prefix for the tag

The tag will be in the format `見直し::YYYYMMDD` (or your custom prefix if specified).

Example usage in Claude:
```
I've reviewed these cards, please tag them as reviewed: [1234567890, 1234567891]
```

## Troubleshooting

- **"Could not connect to Anki"** - Make sure Anki is running and AnkiConnect is properly installed
- **"No leech cards found"** - You don't have any cards tagged as "leech" in Anki
- **Connection issues with localhost** - If you're unable to connect using `localhost`:
  1. Find your local IP address as described in the Configuration section
  2. Update your `.env` file to use `ANKI_CONNECT_URL=http://YOUR_LOCAL_IP:8765`
  3. Make sure AnkiConnect is configured to allow connections from your IP address
  4. Restart the MCP server after making these changes
- **Tag not appearing** - Make sure you're providing valid card IDs to the `tag_reviewed_cards` tool

## Testing Mode

For testing without affecting actual Anki data, you can use the mock mode:

1. Set `ANKI_MOCK_MODE=true` in your `.env` file or use the provided `.env.test` file
2. Run the server with `npm run start:test`

In mock mode, the server will simulate all Anki operations without actually connecting to Anki. This is useful for testing Claude integrations without risking data changes.

## Development

To run the server in development mode with hot reloading:

```
npm run dev
```

For development with mock mode enabled:

```
npm run dev:test
```

## License

MIT

#!/usr/bin/env node

/**
 * Simple test script to verify the Anki MCP server is working correctly.
 * This simulates how Claude would interact with the MCP server.
 */

import { spawn } from "child_process";
import { dirname } from "path";
import { fileURLToPath } from "url";

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { join } from "path";

// Path to the compiled server
const serverPath = join(__dirname, "..", "dist", "index.js");

// Start the MCP server process
const serverProcess = spawn("node", [serverPath], {
  stdio: ["pipe", "pipe", process.stderr],
});

// Send a test request to list available tools
const listToolsRequest = {
  jsonrpc: "2.0",
  id: "1",
  method: "listTools",
  params: {},
};

console.log("Sending listTools request...");
serverProcess.stdin.write(JSON.stringify(listToolsRequest) + "\n");

// Send a test request to get random leech cards with count parameter
const getRandomLeechCardsRequest = {
  jsonrpc: "2.0",
  id: "2",
  method: "callTool",
  params: {
    name: "get_leech_cards",
    arguments: {
      detailed: true,
      count: 10,
    },
  },
};

// Send a test request for random leech card IDs only (no detailed info)
const getRandomLeechCardIdsRequest = {
  jsonrpc: "2.0",
  id: "3",
  method: "callTool",
  params: {
    name: "get_leech_cards",
    arguments: {
      detailed: false,
      count: 5,
    },
  },
};

// Wait before sending the second request
setTimeout(() => {
  console.log("\nSending get_leech_cards with random selection (count=10)...");
  serverProcess.stdin.write(JSON.stringify(getRandomLeechCardsRequest) + "\n");
}, 1000);

// Wait longer before sending the third request
setTimeout(() => {
  console.log(
    "\nSending get_leech_cards for IDs only with random selection (count=5)..."
  );
  serverProcess.stdin.write(
    JSON.stringify(getRandomLeechCardIdsRequest) + "\n"
  );
}, 3000);

// Handle server output
serverProcess.stdout.on("data", (data) => {
  const responseLines = data.toString().trim().split("\n");

  for (const line of responseLines) {
    try {
      const response = JSON.parse(line);
      console.log("\nReceived response:");
      console.log(JSON.stringify(response, null, 2));

      // If this was our last request, terminate the process
      if (response.id === "3") {
        console.log("\nTest completed. Terminating server.");
        serverProcess.kill();
        process.exit(0);
      }
    } catch (error) {
      console.error("Error parsing response:", error);
    }
  }
});

// Handle errors and process termination
serverProcess.on("error", (error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

serverProcess.on("close", (code) => {
  if (code !== 0 && code !== null) {
    console.error(`Server process exited with code ${code}`);
    process.exit(code);
  }
});

// Handle interrupt signal
process.on("SIGINT", () => {
  console.log("\nInterrupted. Terminating server.");
  serverProcess.kill();
  process.exit(0);
});

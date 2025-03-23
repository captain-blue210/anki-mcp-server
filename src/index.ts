#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import axios, { AxiosError } from "axios";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Get the root directory of the project
const rootDir = path.resolve(path.dirname(process.argv[1]), "..");
console.error(`Project root directory: ${rootDir}`);

// Load environment variables based on NODE_ENV
if (process.env.NODE_ENV === 'test') {
  const testEnvPath = path.join(rootDir, '.env.test');
  console.error(`Loading test environment from ${testEnvPath}`);
  
  if (fs.existsSync(testEnvPath)) {
    dotenv.config({ path: testEnvPath });
  } else {
    console.error(`Warning: Test environment file not found at ${testEnvPath}`);
    dotenv.config({ path: path.join(rootDir, '.env') });
  }
} else {
  const envPath = path.join(rootDir, '.env');
  console.error(`Loading standard environment from ${envPath}`);
  
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  } else {
    console.error(`Warning: Environment file not found at ${envPath}, using defaults`);
  }
}

// AnkiConnect configuration with fallback values
const ANKI_CONNECT_URL =
  process.env.ANKI_CONNECT_URL || "http://localhost:8765";
const ANKI_CONNECT_VERSION = process.env.ANKI_CONNECT_VERSION
  ? parseInt(process.env.ANKI_CONNECT_VERSION)
  : 6;
const ANKI_MOCK_MODE = process.env.ANKI_MOCK_MODE === 'true';

// Log the current configuration
console.error(`Starting anki-mcp-server with configuration:`);
console.error(`  ANKI_CONNECT_URL: ${ANKI_CONNECT_URL}`);
console.error(`  ANKI_CONNECT_VERSION: ${ANKI_CONNECT_VERSION}`);
console.error(`  ANKI_MOCK_MODE: ${ANKI_MOCK_MODE}`);

// Types for AnkiConnect responses and card data
interface AnkiConnectResponse<T> {
  result: T;
  error: string | null;
}

interface CardInfo {
  id: number;
  noteId: number;
  deck: string;
  modelName: string;
  fields: Record<string, { value: string; order: number }>;
  tags: string[];
  front: string;
  back: string;
  statistics: {
    ease: number;
    interval: number;
    reviews: number;
    lapses: number;
  };
}

/**
 * Client for interacting with AnkiConnect API
 */
class AnkiConnectClient {
  private readonly url: string;
  private readonly version: number;
  private readonly axiosInstance;
  private readonly mockMode: boolean;

  constructor(
    url: string = ANKI_CONNECT_URL,
    version: number = ANKI_CONNECT_VERSION,
    mockMode: boolean = ANKI_MOCK_MODE
  ) {
    this.url = url;
    this.version = version;
    this.mockMode = mockMode;

    // Configure axios with timeouts and retry settings
    this.axiosInstance = axios.create({
      timeout: 30000, // 30 second timeout
      maxContentLength: 50 * 1024 * 1024, // 50MB max response size
    });

    if (this.mockMode) {
      console.error("AnkiConnectClient initialized in MOCK MODE - no actual Anki operations will be performed");
    }
  }

  /**
   * Delay execution for specified milliseconds
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Send a request to AnkiConnect API or return mock response if in mock mode
   */
  async request<T>(
    action: string,
    params: Record<string, any> = {},
    retries = 3 // Allow for retries on network errors
  ): Promise<T> {
    // If in mock mode, return mock responses
    if (this.mockMode) {
      return this.getMockResponse<T>(action, params);
    }

    try {
      const response = await this.axiosInstance.post<AnkiConnectResponse<T>>(
        this.url,
        {
          action,
          version: this.version,
          params,
        }
      );

      if (response.data.error) {
        throw new Error(`AnkiConnect error: ${response.data.error}`);
      }

      // Success! Add a small delay to prevent overwhelming AnkiConnect
      await this.delay(50);

      return response.data.result;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        // Handle connection refused (Anki not running)
        if (axiosError.code === "ECONNREFUSED") {
          throw new Error(
            "Could not connect to Anki. Is Anki running with AnkiConnect installed?"
          );
        }

        // Handle connection reset errors with retry logic
        if (axiosError.code === "ECONNRESET" && retries > 0) {
          console.error(
            `Connection reset error, retrying (${retries} attempts left)...`
          );
          // Exponential backoff before retry (500ms, 1s, 2s)
          await this.delay(500 * Math.pow(2, 3 - retries));
          return this.request<T>(action, params, retries - 1);
        }

        throw new Error(
          `Network error: ${axiosError.code || axiosError.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Generate mock responses for testing
   */
  private getMockResponse<T>(action: string, params: Record<string, any> = {}): T {
    console.error(`[MOCK] AnkiConnect action: ${action}`);
    console.error(`[MOCK] Params: ${JSON.stringify(params, null, 2)}`);

    switch (action) {
      case "version":
        return "6" as unknown as T;
      
      case "findCards":
        // Mock finding leech cards - return 3 fake card IDs
        return [1234567890, 1234567891, 1234567892] as unknown as T;
      
      case "cardsInfo":
        // Mock card info
        const cardIds = params.cards || [];
        return cardIds.map((cardId: number) => ({
          cardId,
          note: cardId + 1000000,  // Mock note ID
          deckName: "Mock Deck",
          modelName: "Mock Model",
          interval: 10,
          factor: 2500,  // Anki stores this as factor*1000
          reps: 5,
          lapses: 2,
        })) as unknown as T;
      
      case "notesInfo":
        // Mock note info
        const noteIds = params.notes || [];
        return noteIds.map((noteId: number) => ({
          noteId,
          modelName: "Mock Model",
          tags: ["leech", "mock_tag"],
          fields: {
            Front: { value: "Mock front content", order: 0 },
            Back: { value: "Mock back content", order: 1 },
          },
        })) as unknown as T;
      
      case "addTags":
        // Mock adding tags
        console.error(`[MOCK] Would add tag "${params.tags}" to notes: ${params.notes.join(", ")}`);
        return true as unknown as T;
      
      default:
        console.error(`[MOCK] Unknown action: ${action}`);
        return null as unknown as T;
    }
  }

  /**
   * Find all cards with the leech tag
   */
  async findLeechCards(): Promise<number[]> {
    return this.request<number[]>("findCards", {
      query: "tag:leech",
    });
  }

  /**
   * Get card info with optimized batch processing
   */
  async getCardsInfo(cardIds: number[]): Promise<CardInfo[]> {
    if (cardIds.length === 0) {
      return [];
    }

    try {
      // Get basic card information for all cards at once
      const cardsInfo = await this.request<any[]>("cardsInfo", {
        cards: cardIds,
      });

      // Collect all noteIds to batch request note information
      const noteIds = cardsInfo.map((card) => card.note);
      const uniqueNoteIds = [...new Set(noteIds)]; // Remove duplicates

      // Get all notes information in one batch request
      const notesInfoArray = await this.request<any[]>("notesInfo", {
        notes: uniqueNoteIds,
      });

      // Create a map for faster note lookup
      const notesInfoMap = new Map();
      notesInfoArray.forEach((noteInfo) => {
        notesInfoMap.set(noteInfo.noteId, noteInfo);
      });

      // Process cards in smaller batches to avoid overwhelming AnkiConnect
      const result: CardInfo[] = [];
      const BATCH_SIZE = 5; // Small batch size to prevent connection issues

      for (let i = 0; i < cardsInfo.length; i += BATCH_SIZE) {
        const batch = cardsInfo.slice(i, i + BATCH_SIZE);

        // Process this batch sequentially to prevent overwhelming AnkiConnect
        for (const cardInfo of batch) {
          try {
            // Add a small delay between card processing within a batch
            if (i > 0 || batch.indexOf(cardInfo) > 0) {
              await this.delay(100);
            }
            // Set placeholder for front and back content
            // Based directly on card fields instead of using renderQA or guiBrowse
            const front = "[Basic card information only]";
            const back = "[Basic card information only]";

            const noteInfo = notesInfoMap.get(cardInfo.note);
            if (!noteInfo) {
              console.error(
                `Note info not found for note ID: ${cardInfo.note}`
              );
              continue;
            }

            // Combine information
            result.push({
              id: cardInfo.cardId,
              noteId: cardInfo.note,
              deck: cardInfo.deckName,
              modelName: noteInfo.modelName,
              fields: noteInfo.fields,
              tags: noteInfo.tags,
              front: front, // Use our captured front content
              back: back, // Use our captured back content
              statistics: {
                ease: cardInfo.factor / 1000, // Convert from Anki's internal representation
                interval: cardInfo.interval,
                reviews: cardInfo.reps,
                lapses: cardInfo.lapses,
              },
            });
          } catch (error) {
            console.error(`Error processing card ${cardInfo.cardId}:`, error);
            // Continue with other cards even if one fails
          }
        }

        // Add a longer delay between batches
        if (i + BATCH_SIZE < cardsInfo.length) {
          await this.delay(500);
        }
      }

      return result;
    } catch (error) {
      console.error("Error in getCardsInfo:", error);
      throw error;
    }
  }

  /**
   * Generate a tag with current date in format "見直し_yyyyMMdd"
   */
  private generateReviewedTag(customPrefix: string = "見直し"): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${customPrefix}_${year}${month}${day}`;
  }

  /**
   * Add "reviewed" tag to specified cards
   */
  async addTagsToCards(cardIds: number[], customTagPrefix?: string): Promise<boolean> {
    if (cardIds.length === 0) {
      console.error("No cards provided to tag");
      return false;
    }

    try {
      // First, get the note IDs for the specified cards
      const cardsInfo = await this.request<any[]>("cardsInfo", {
        cards: cardIds,
      });

      // Extract unique note IDs
      const noteIds = [...new Set(cardsInfo.map(card => card.note))];
      
      if (noteIds.length === 0) {
        console.error("Could not find note IDs for the provided card IDs");
        return false;
      }

      // Generate the tag with current date
      const reviewedTag = this.generateReviewedTag(customTagPrefix);
      
      // Add the tag to all notes
      const result = await this.request<boolean>("addTags", {
        notes: noteIds,
        tags: reviewedTag,
      });
      
      console.error(`Tag '${reviewedTag}' added to ${noteIds.length} notes (from ${cardIds.length} cards)`);
      return result;
    } catch (error) {
      console.error("Error adding tags to cards:", error);
      throw error;
    }
  }

  /**
   * Check if Anki is available by making a simple request
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.request<string>("version");
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * MCP Server implementation for Anki
 */
class AnkiMcpServer {
  private server: Server;
  private ankiClient: AnkiConnectClient;

  constructor() {
    this.ankiClient = new AnkiConnectClient();

    this.server = new Server(
      {
        name: "anki-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();

    // Error handling
    this.server.onerror = (error) => console.error("[MCP Error]", error);
    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  /**
   * Randomly select a subset of card IDs
   */
  private getRandomCardIds(cardIds: number[], count: number): number[] {
    // If count is greater than or equal to the total number of cards, return all cards
    if (count >= cardIds.length) {
      return cardIds;
    }

    // Fisher-Yates shuffle and take the first 'count' elements
    const shuffled = [...cardIds];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, count);
  }

  /**
   * Set up the tool handlers for the server
   */
  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "get_leech_cards",
          description: "Retrieve cards tagged as leeches from Anki",
          inputSchema: {
            type: "object",
            properties: {
              detailed: {
                type: "boolean",
                description:
                  "Whether to return detailed card information or just IDs",
              },
              count: {
                type: "number",
                description:
                  "Number of random cards to return (defaults to all)",
                minimum: 1,
              },
            },
          },
        },
        {
          name: "tag_reviewed_cards",
          description: "Add a 'reviewed on date' tag to specified cards",
          inputSchema: {
            type: "object",
            properties: {
              card_ids: {
                type: "array",
                items: {
                  type: "number"
                },
                description: "Array of card IDs to tag as reviewed",
              },
              custom_tag_prefix: {
                type: "string",
                description: "Custom prefix for the tag (default: '見直し')",
              },
            },
            required: ["card_ids"],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      // Check if Anki is available for all tools
      const isAvailable = await this.ankiClient.isAvailable();
      if (!isAvailable && !ANKI_MOCK_MODE) {
        return {
          content: [
            {
              type: "text",
              text: "Could not connect to Anki. Please make sure Anki is running and AnkiConnect is installed.",
            },
          ],
          isError: true,
        };
      }

      try {
        // Handle different tools
        switch (request.params.name) {
          case "get_leech_cards":
            return await this.handleGetLeechCards(request);
          
          case "tag_reviewed_cards":
            return await this.handleTagReviewedCards(request);
          
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        let errorMessage = "Unknown error occurred";
        if (error instanceof Error) {
          errorMessage = error.message;
        }

        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Handle get_leech_cards tool requests
   */
  private async handleGetLeechCards(request: any) {
    // Default to detailed = true if not specified
    const detailed = request.params.arguments?.detailed !== false;

    // Get the count parameter (optional)
    const count =
      typeof request.params.arguments?.count === "number"
        ? request.params.arguments.count
        : undefined;

    // Find all leech cards
    const allLeechCardIds = await this.ankiClient.findLeechCards();

    if (allLeechCardIds.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No leech cards found in Anki.",
          },
        ],
      };
    }

    // Select random subset if count is specified
    const leechCardIds = count
      ? this.getRandomCardIds(allLeechCardIds, count)
      : allLeechCardIds;

    // Add information about total vs. returned cards
    const cardCountInfo = count
      ? `Returning ${leechCardIds.length} random cards out of ${allLeechCardIds.length} total leech cards.`
      : `Returning all ${leechCardIds.length} leech cards.`;

    if (!detailed) {
      // Just return the IDs if detailed=false
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                message: cardCountInfo,
                count: leechCardIds.length,
                totalLeechCards: allLeechCardIds.length,
                cardIds: leechCardIds,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Get detailed information for each selected leech card
    const cardsInfo = await this.ankiClient.getCardsInfo(leechCardIds);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              message: cardCountInfo,
              count: cardsInfo.length,
              totalLeechCards: allLeechCardIds.length,
              cards: cardsInfo.map((card) => ({
                id: card.id,
                noteId: card.noteId,
                deck: card.deck,
                modelName: card.modelName,
                fields: Object.entries(card.fields).reduce(
                  (acc, [key, field]) => {
                    acc[key] = field.value;
                    return acc;
                  },
                  {} as Record<string, string>
                ),
                tags: card.tags,
                front: card.front,
                back: card.back,
                statistics: card.statistics,
              })),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  /**
   * Handle tag_reviewed_cards tool requests
   */
  private async handleTagReviewedCards(request: any) {
    const cardIds = request.params.arguments?.card_ids;
    const customTagPrefix = request.params.arguments?.custom_tag_prefix;

    // Validate card IDs
    if (!cardIds || !Array.isArray(cardIds) || cardIds.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "Error: No card IDs provided. Please provide an array of card IDs to tag.",
          },
        ],
        isError: true,
      };
    }

    // Add tags to cards
    const success = await this.ankiClient.addTagsToCards(cardIds, customTagPrefix);

    if (success) {
      const now = new Date();
      const tagDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      const tagPrefix = customTagPrefix || "見直し";
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                message: `Successfully tagged ${cardIds.length} cards with '${tagPrefix}_${tagDate}'`,
                tagged_cards: cardIds,
                tag_added: `${tagPrefix}_${tagDate}`,
                success: true,
              },
              null,
              2
            ),
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: "text",
            text: "Failed to add tags to cards. Please check if the card IDs are valid.",
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Start the MCP server
   */
  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Anki MCP server running on stdio");
  }
}

// Initialize and start the server
const server = new AnkiMcpServer();
server.run().catch(console.error);

/**
 * This file provides HTTP-based transport functionality for the Model Context Protocol (MCP).
 * It handles Server-Sent Events (SSE) connections and message processing for MCP communication.
 */

import { Injectable, Logger } from "@nestjs/common";
import { McpService } from "./mcp.service";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { Request, Response } from "express";

/**
 * Service responsible for handling HTTP communication for the Model Context Protocol.
 * Manages SSE (Server-Sent Events) connections and processes incoming messages.
 */
@Injectable()
export class McpHttpService {
  private readonly logger = new Logger(McpHttpService.name);
  /** Map of active SSE transport instances indexed by session ID */
  private transports: { [sessionId: string]: SSEServerTransport } = {};

  constructor(private readonly mcpService: McpService) {}

  /**
   * Handles a new Server-Sent Events (SSE) connection request.
   * Creates a new SSE transport, registers it, and connects it to the MCP server.
   *
   * @param res - Express Response object to establish the SSE connection
   * @returns Promise that resolves when the connection is established or rejected
   */
  async handleSSE(res: Response): Promise<void> {
    const transport = new SSEServerTransport("/api/mcp/messages", res);
    const sessionId = transport.sessionId;
    this.transports[sessionId] = transport;

    this.logger.log(`New SSE connection established: ${sessionId}`);

    res.on("close", () => {
      this.logger.log(`SSE connection closed: ${sessionId}`);
      delete this.transports[sessionId];

      transport
        .close()
        .catch((err) =>
          this.logger.error("Error closing transport on disconnect:", err)
        );
    });

    try {
      const server = this.mcpService.getServer();
      if (!server) {
        this.logger.error("MCP Server instance is not available.");
        if (!res.headersSent) {
          res.status(500).send("MCP Server not initialized");
        }
        return;
      }
      await server.connect(transport);
    } catch (error) {
      this.logger.error(
        `Error in SSE connection or during connect: ${error.message}`,
        error.stack
      );
      if (!res.headersSent) {
        res.status(500).send("Error establishing SSE connection");
      } else {
        res.end();
      }
    }
  }

  /**
   * Handles an incoming message request for an existing SSE connection.
   * Routes the message to the appropriate transport based on the sessionId.
   *
   * @param req - Express Request object containing the message and sessionId
   * @param res - Express Response object to send the response
   * @returns Promise that resolves when the message has been processed
   */
  async handleMessage(req: Request, res: Response): Promise<void> {
    const sessionId = req.query.sessionId as string;

    if (!sessionId) {
      this.logger.warn("Message received without sessionId");
      res.status(400).send("Missing sessionId parameter");
      return;
    }

    const transport = this.transports[sessionId];

    if (transport) {
      try {
        await transport.handlePostMessage(req, res);
      } catch (error) {
        this.logger.error(
          `Error handling message for session ${sessionId}: ${error.message}`,
          error.stack
        );
        if (!res.headersSent) {
          res.status(500).send("Error processing message");
        }
      }
    } else {
      this.logger.warn(`No active transport found for sessionId: ${sessionId}`);
      res.status(404).send("No connection found for this sessionId");
    }
  }
}

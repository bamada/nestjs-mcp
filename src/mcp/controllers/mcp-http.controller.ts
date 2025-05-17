import { Controller, Get, Post, Req, Res, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { McpHttpService } from '../services/mcp-http.service';

/**
 * Controller responsible for handling Model Context Protocol (MCP) HTTP endpoints.
 *
 * This controller manages the HTTP transport layer for MCP communication,
 * providing endpoints for SSE connections, message handling, and health checks.
 * It delegates the actual processing of MCP-related operations to the McpHttpService.
 */
@Controller('api/mcp')
export class McpHttpController {
  private readonly logger = new Logger(McpHttpController.name);

  constructor(private readonly mcpHttpService: McpHttpService) {}

  /**
   * Handles Server-Sent Events (SSE) connections from clients.
   *
   * This endpoint establishes a persistent connection for server-to-client push notifications,
   * allowing MCP to stream events to connected clients in real-time.
   *
   * @param res - Express Response object used to set up the SSE connection
   * @returns Promise resolving when the SSE connection is handled or terminated
   */
  @Get('sse')
  async handleSSE(@Res() res: Response): Promise<void> {
    this.logger.debug('SSE connection request received');
    return this.mcpHttpService.handleSSE(res);
  }

  /**
   * Processes incoming MCP messages from clients.
   *
   * This endpoint accepts JSON-formatted MCP messages and forwards them to the
   * appropriate handlers via the McpHttpService for processing.
   *
   * @param req - Express Request object containing the MCP message payload
   * @param res - Express Response object used to send the response back to the client
   * @returns Promise resolving when the message has been processed
   */
  @Post('messages')
  async handleMessages(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.debug('MCP message received');
    return this.mcpHttpService.handleMessage(req, res);
  }

  /**
   * Simple health check endpoint to verify the MCP controller is operational.
   *
   * @returns Object containing status information and current timestamp
   */
  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}

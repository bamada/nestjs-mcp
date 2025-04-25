import { MCP_TOOL_METADATA } from "./constants";
import { createMcpDecorator } from "./base.decorator";
import { ToolOptions } from "../interfaces/mcp-module-options.interface";

/**
 * Decorator that marks a method as an MCP Tool handler.
 *
 * @param options Options for the tool, including name, optional description,
 *                and optional Zod schema (as ZodRawShape) for parameters.
 */
export const McpTool = (options: ToolOptions): MethodDecorator =>
  createMcpDecorator(MCP_TOOL_METADATA, options);

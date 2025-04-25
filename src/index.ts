export * from "./mcp/mcp.module";
export * from "./mcp/interfaces/mcp-module-options.interface";
export * from "./mcp/decorators/resource.decorator";
export * from "./mcp/decorators/tool.decorator";
export * from "./mcp/decorators/prompt.decorator";
export * from "./stderr-logger";

export type {
  ReadResourceResult,
  CallToolResult,
  GetPromptResult,
} from "@modelcontextprotocol/sdk/types";
export type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
export type { Variables } from "@modelcontextprotocol/sdk/shared/uriTemplate.js";

import { ModuleMetadata, Type } from "@nestjs/common";
import { ServerOptions } from "@modelcontextprotocol/sdk/server/index.js";
import { Implementation, Resource } from "@modelcontextprotocol/sdk/types.js";
import {
  ResourceMetadata,
  ResourceTemplate as ResourceTemplateClass,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { ZodRawShape } from "zod";

/**
 * Configuration options for the MCP (Model Context Protocol) module.
 */
export interface McpModuleOptions {
  /**
   * Server implementation information including name, version, and vendor details.
   */
  serverInfo: Implementation;
  /**
   * Optional server configuration options.
   */
  serverOptions?: ServerOptions;
  /**
   * Transport type for communication.
   */
  transport?: TransportType;
}

/**
 * Factory interface for creating MCP module options.
 */
export interface McpOptionsFactory {
  /**
   * Creates and returns MCP module options either synchronously or as a Promise.
   * @returns MCP module configuration options
   */
  createMcpOptions(): Promise<McpModuleOptions> | McpModuleOptions;
}

/**
 * Configuration options for asynchronous MCP module initialization.
 * Supports various patterns for providing module options.
 */
export interface McpModuleAsyncOptions extends Pick<ModuleMetadata, "imports"> {
  /**
   * Existing provider to use for creating MCP options.
   */
  useExisting?: Type<McpOptionsFactory>;
  /**
   * Class to instantiate and use for creating MCP options.
   */
  useClass?: Type<McpOptionsFactory>;
  /**
   * Factory function to create MCP options.
   */
  useFactory?: (...args: any[]) => Promise<McpModuleOptions> | McpModuleOptions;
  /**
   * Dependencies to inject into the factory function.
   */
  inject?: any[];
}

/**
 * Configuration options for fixed (non-template) resources.
 * Extends the base Resource interface with optional metadata.
 */
export interface FixedResourceOptions extends Resource {
  /**
   * Optional metadata for the resource.
   */
  metadata?: ResourceMetadata;
}

/**
 * Configuration options for template-based resources.
 */
export interface TemplateResourceOptions {
  /**
   * Name of the resource template.
   */
  name: string;
  /**
   * URI template as a string or ResourceTemplate instance.
   */
  uriTemplate: string | ResourceTemplateClass;
  /**
   * Optional description of the resource template.
   */
  description?: string;
  /**
   * Optional metadata for the resource template.
   */
  metadata?: ResourceMetadata;
}

/**
 * Union type representing either fixed or template resource options.
 */
export type ResourceOptions = FixedResourceOptions | TemplateResourceOptions;

export interface ToolOptions {
  name: string;
  description?: string;
  paramsSchema?: ZodRawShape;
}

export enum TransportType {
  STDIO = "stdio",
  SSE = "sse",
  NONE = "none",
}

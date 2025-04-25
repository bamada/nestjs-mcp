import { MCP_RESOURCE_METADATA } from "./constants";
import { createMcpDecorator } from "./base.decorator";
import { ResourceOptions } from "../interfaces/mcp-module-options.interface";

/**
 * Decorator that marks a method as an MCP Resource handler.
 *
 * @param options Options for the resource, typically including its name and schema.
 *                For now, we'll just pass the name. The full definition might be needed later.
 *
 * @example
 * ```
 * @McpResource({
 *   name: 'myResource',
 *   uri: 'https://example.com/resource',
 *   description: 'A fixed URI resource'
 * })
 * ```
 *
 * @example
 * ```
 * @McpResource({
 *   name: 'templateResource',
 *   uriTemplate: 'https://example.com/{id}',
 *   description: 'A resource with a template pattern'
 * })
 * ```
 */
export const McpResource = (options: ResourceOptions): MethodDecorator =>
  createMcpDecorator(MCP_RESOURCE_METADATA, options);

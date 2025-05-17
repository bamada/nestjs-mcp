import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  McpServer,
  ResourceTemplate,
  ResourceMetadata,
  ReadResourceCallback,
  ReadResourceTemplateCallback,
  ToolCallback,
  PromptCallback,
} from '@modelcontextprotocol/sdk/server/mcp.js';

import {
  ZodRawShape,
  ZodType,
  ZodTypeDef,
  ZodOptional,
  z,
  ZodString,
} from 'zod';
import {
  McpModuleOptions,
  ResourceOptions,
  TemplateResourceOptions,
  ToolOptions,
} from '../interfaces/mcp-module-options.interface';
import { MCP_MODULE_OPTIONS } from '../mcp.constants';
import { Prompt as PromptType } from '@modelcontextprotocol/sdk/types.js';

// Define PromptArgsRawShape locally as it's not exported
type PromptArgsRawShape = {
  [k: string]:
    | ZodType<string, ZodTypeDef, string>
    | ZodOptional<ZodType<string, ZodTypeDef, string>>;
};

/**
 * Service responsible for managing the McpServer instance and registering
 * resources, prompts, and tools based on the provided module options.
 */
@Injectable()
export class McpService {
  private readonly logger = new Logger(McpService.name);
  private readonly server: McpServer;

  /**
   * Initializes the McpService with module options.
   * Creates the McpServer instance.
   *
   * @param moduleOptions The configuration options for the MCP module.
   */
  constructor(
    @Inject(MCP_MODULE_OPTIONS)
    private readonly moduleOptions: McpModuleOptions,
  ) {
    const { serverInfo, serverOptions } = moduleOptions;

    const info = serverInfo || {
      name: 'nestjs-mcp-server',
      version: '0.0.1',
    };

    const options = serverOptions;

    this.server = new McpServer(info, options);
    this.logger.log('McpServer instance created.');
  }

  /**
   * Retrieves the underlying McpServer instance.
   *
   * @returns The McpServer instance managed by this service.
   */
  getServer(): McpServer {
    return this.server;
  }

  /**
   * Registers a resource or a resource template with the McpServer.
   *
   * @param definition The resource definition, containing name, URI or URI template, and metadata.
   * @param handler The callback function to handle read requests for the resource.
   * @returns The McpServer instance for chaining, or void if registration skipped.
   */
  registerResource(
    definition: ResourceOptions,
    handler: ReadResourceCallback | ReadResourceTemplateCallback,
  ) {
    if (!definition.name) {
      this.logger.warn(
        'Resource missing required name. Skipping registration.',
      );
      return;
    }

    this.logger.log(`Registering resource: ${definition.name}`);
    const metadata: ResourceMetadata = definition.metadata || {};

    if (this.isTemplateResource(definition)) {
      if (typeof definition.uriTemplate === 'string') {
        const template = new ResourceTemplate(definition.uriTemplate, {
          list: undefined,
        });

        return this.server.resource(
          definition.name,
          template,
          metadata,
          handler as ReadResourceTemplateCallback,
        );
      } else if (definition.uriTemplate instanceof ResourceTemplate) {
        return this.server.resource(
          definition.name,
          definition.uriTemplate,
          metadata,
          handler as ReadResourceTemplateCallback,
        );
      } else {
        this.logger.error('Invalid uriTemplate type for template resource.');
        return;
      }
    } else {
      return this.server.resource(
        definition.name,
        definition.uri,
        metadata,
        handler as ReadResourceCallback,
      );
    }
  }

  /**
   * Registers a prompt with the McpServer.
   *
   * @param definition The prompt definition, including name, description, and arguments.
   * @param handler The callback function to handle prompt execution.
   * @returns The McpServer instance for chaining, or void if registration skipped.
   */
  registerPrompt(
    definition: PromptType,
    handler: PromptCallback<undefined> | PromptCallback<PromptArgsRawShape>,
  ) {
    if (!definition.name) {
      this.logger.warn('Prompt missing required name. Skipping registration.');
      return;
    }

    this.logger.log(`Registering prompt: ${definition.name}`);
    const description = definition.description || '';

    if (!definition.arguments || definition.arguments.length === 0) {
      return this.server.prompt(
        definition.name,
        description,
        handler as PromptCallback,
      );
    }

    const argsSchema: PromptArgsRawShape = {};
    for (const arg of definition.arguments) {
      if (!arg.name) {
        this.logger.warn(
          `Prompt "${definition.name}" has an argument without a name. Skipping argument.`,
        );
        continue;
      }
      let schema: ZodString | ZodOptional<ZodString> = z.string();
      if (arg.description) {
        schema = schema.describe(arg.description);
      }
      if (arg.required) {
        argsSchema[arg.name] = schema;
      } else {
        argsSchema[arg.name] = schema.optional();
      }
    }

    // Ensure the constructed schema is not empty if arguments were processed but resulted in no valid schema entries
    if (Object.keys(argsSchema).length === 0) {
      this.logger.warn(
        `Prompt "${definition.name}" arguments processing resulted in empty schema. Registering as no-argument prompt.`,
      );
      return this.server.prompt(
        definition.name,
        description,
        handler as PromptCallback,
      );
    }

    return this.server.prompt(
      definition.name,
      description,
      argsSchema,
      handler as PromptCallback<PromptArgsRawShape>,
    );
  }

  /**
   * Registers a tool with the McpServer.
   *
   * @param definition The tool definition, including name, description, and parameter schema.
   * @param handler The callback function to handle tool execution.
   * @returns The McpServer instance for chaining, or void if registration skipped.
   */
  registerTool(
    definition: ToolOptions,
    handler: ToolCallback | ToolCallback<ZodRawShape>,
  ) {
    if (!definition || !definition.name) {
      this.logger.warn(
        'Tool definition missing required name. Skipping registration.',
      );
      return;
    }

    this.logger.log(`Registering tool: ${definition.name}`);

    const description = definition.description;
    const paramsSchema = definition.paramsSchema; // This is now ZodRawShape | undefined

    if (paramsSchema && Object.keys(paramsSchema).length > 0) {
      const specificHandler = handler as ToolCallback<ZodRawShape>;

      if (description) {
        return this.server.tool(
          definition.name,
          description,
          paramsSchema,
          specificHandler,
        );
      } else {
        this.server.tool(definition.name, paramsSchema, specificHandler);
      }
    } else {
      const specificHandler = handler as ToolCallback;

      if (description) {
        this.server.tool(definition.name, description, specificHandler);
      } else {
        this.server.tool(definition.name, specificHandler);
      }
    }
  }

  /**
   * @private
   * Type guard function to determine if the provided options are for a template resource.
   *
   * @param options - Resource options to check
   * @returns True if the options are for a template resource, false otherwise
   */
  private isTemplateResource(
    options: ResourceOptions,
  ): options is TemplateResourceOptions {
    return 'uriTemplate' in options;
  }
}

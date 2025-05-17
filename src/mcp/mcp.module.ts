import {
  Module,
  DynamicModule,
  Provider,
  OnApplicationBootstrap,
  Inject,
  Logger,
  Type,
} from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { McpService } from './services/mcp.service';
import { ExplorerService } from './services/explorer.service';
import {
  McpModuleOptions,
  McpModuleAsyncOptions,
  McpOptionsFactory,
  TransportType,
} from './interfaces/mcp-module-options.interface';
import { MCP_MODULE_OPTIONS } from './mcp.constants';
import { McpHttpService } from './services/mcp-http.service';
import { McpHttpController } from './controllers/mcp-http.controller';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

/**
 * NestJS module responsible for integrating the Model Context Protocol (MCP).
 * It discovers and registers MCP handlers (resources, tools, prompts),
 * manages transport connections (like stdio or HTTP/SSE), and provides
 * configuration options (synchronous and asynchronous).
 */
@Module({
  imports: [DiscoveryModule],
  providers: [ExplorerService, McpService, McpHttpService],
  controllers: [McpHttpController],
  exports: [McpService],
})
export class McpModule implements OnApplicationBootstrap {
  private readonly logger = new Logger(McpModule.name);

  /**
   * Initializes the McpModule.
   * @param explorerService Service to discover MCP handlers.
   * @param mcpService Core MCP service for registration and server management.
   * @param options Configuration options injected for the module.
   */
  constructor(
    private readonly explorerService: ExplorerService,
    private readonly mcpService: McpService,
    @Inject(MCP_MODULE_OPTIONS) private readonly options: McpModuleOptions,
  ) {}

  /**
   * Lifecycle hook called once the application has fully started.
   * Registers discovered MCP handlers and connects the MCP server
   * to the configured transport if necessary (e.g., stdio).
   */
  async onApplicationBootstrap() {
    this.logger.log('Bootstrapping MCP Module...');

    this.registerMcpHandlers();

    this.logger.log('MCP Handlers registered.');

    if (
      'transport' in this.options &&
      this.options.transport === TransportType.STDIO
    ) {
      try {
        const transport = new StdioServerTransport();
        const server = this.mcpService.getServer();
        await server.connect(transport);
        this.logger.log('McpServer connected to stdio transport.');
      } catch (error) {
        this.logger.error(
          'Failed to connect McpServer to stdio transport:',
          error,
        );
      }
    } else {
      this.logger.log(
        'MCP Module configured for non-stdio transport (e.g., SSE/HTTP or custom). No automatic connection needed here.',
      );
    }

    this.logger.log('MCP Module bootstrapped successfully.');
  }

  /**
   * Discovers and registers all MCP handlers (resources, tools, prompts)
   * found within the application using the ExplorerService.
   */
  private registerMcpHandlers() {
    // Register Resources
    const resources = this.explorerService.exploreResources();
    resources.forEach(({ handler, metadata }) => {
      this.logger.debug(
        `Registering resource from handler: ${metadata.options?.name || metadata.methodName}`,
      );
      this.mcpService.registerResource(metadata.options, handler);
    });

    // Register Tools
    const tools = this.explorerService.exploreTools();
    tools.forEach(({ handler, metadata }) => {
      if (!metadata.options?.name) {
        this.logger.warn(
          `Tool handler ${
            (handler as any).name || metadata.methodName
          } is missing required 'name' in options. Skipping registration.`,
        );
        return;
      }
      this.logger.debug(
        `Registering tool from handler: ${metadata.options.name}`,
      );
      const definition = metadata.options;
      this.mcpService.registerTool(definition, handler);
    });

    // Register Prompts
    const prompts = this.explorerService.explorePrompts();
    prompts.forEach(({ handler, metadata }) => {
      if (!metadata.options?.name) {
        this.logger.warn(
          `Prompt handler ${
            (handler as any).name || metadata.methodName
          } is missing required 'name' in options. Skipping registration.`,
        );
        return;
      }
      this.logger.debug(
        `Registering prompt from handler: ${metadata.options.name}`,
      );
      const definition = metadata.options;
      this.mcpService.registerPrompt(definition, handler);
    });
  }

  /**
   * Registers the McpModule synchronously with the specified options.
   * Use this method when configuration options are available at compile time.
   *
   * @param options The configuration options for the McpModule.
   * @returns A DynamicModule configuration object.
   */
  static forRoot(options: McpModuleOptions): DynamicModule {
    const optionsProvider: Provider = {
      provide: MCP_MODULE_OPTIONS,
      useValue: options,
    };

    return {
      module: McpModule,
      providers: [optionsProvider, McpService, ExplorerService],
      exports: [McpService],
    };
  }

  /**
   * Registers the McpModule asynchronously.
   * Use this method when configuration depends on other asynchronous modules or services.
   *
   * @param options The asynchronous configuration options for the McpModule.
   * @returns A DynamicModule configuration object.
   */
  static forRootAsync(options: McpModuleAsyncOptions): DynamicModule {
    const asyncProviders = this.createAsyncProviders(options);

    return {
      module: McpModule,
      imports: [...(options.imports || []), DiscoveryModule],
      providers: [...asyncProviders, McpService, ExplorerService],
      exports: [McpService],
    };
  }

  /**
   * Creates the providers required for asynchronous module registration.
   * Handles different asynchronous configuration strategies (useFactory, useClass, useExisting).
   *
   * @param options The asynchronous module options.
   * @returns An array of NestJS Providers.
   */
  private static createAsyncProviders(
    options: McpModuleAsyncOptions,
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }
    const useClass = options.useClass as Type<McpOptionsFactory>;
    return [
      this.createAsyncOptionsProvider(options),
      {
        provide: useClass,
        useClass,
      },
    ];
  }

  /**
   * Creates the provider responsible for supplying the McpModuleOptions asynchronously.
   * Supports useFactory, useClass, and useExisting strategies.
   *
   * @param options The asynchronous module options.
   * @returns A NestJS Provider for the McpModuleOptions.
   */
  private static createAsyncOptionsProvider(
    options: McpModuleAsyncOptions,
  ): Provider {
    if (options.useFactory) {
      return {
        provide: MCP_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }

    const inject = [
      (options.useClass || options.useExisting) as Type<McpOptionsFactory>,
    ];
    return {
      provide: MCP_MODULE_OPTIONS,
      useFactory: async (optionsFactory: McpOptionsFactory) =>
        await optionsFactory.createMcpOptions(),
      inject,
    };
  }
}

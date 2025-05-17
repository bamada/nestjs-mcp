import { Injectable } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core/injector/modules-container';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { Reflector } from '@nestjs/core';
import {
  MCP_RESOURCE_METADATA,
  MCP_TOOL_METADATA,
  MCP_PROMPT_METADATA,
} from '../decorators/constants';
import { IMetadataBase } from '../interfaces/metadata-base.interface';
import {
  ResourceOptions,
  ToolOptions,
} from '../interfaces/mcp-module-options.interface';
import { Prompt as PromptType } from '@modelcontextprotocol/sdk/types.js';

/**
 * Represents a discovered decorated method with its associated metadata.
 *
 * @template T The type of options associated with the discovered item
 * @property instance The class instance containing the decorated method
 * @property handler The bound method function that will be called during execution
 * @property metadata The metadata extracted from the decorator, including options
 */
export interface DiscoveredItem<T = any> {
  instance: any;
  handler: (...args: any[]) => any;
  metadata: IMetadataBase & { options: T };
}

/**
 * Service responsible for discovering and exploring MCP-decorated methods
 * throughout the application.
 *
 * ExplorerService scans all modules and providers in the NestJS application
 * to find methods decorated with MCP-specific decorators (@URIResource, @TemplateResource, @Tool, @Prompt).
 * It extracts their metadata and provides methods to retrieve decorated items by type.
 */
@Injectable()
export class ExplorerService {
  /**
   * Creates an instance of ExplorerService.
   *
   * @param modulesContainer Container that holds all modules in the NestJS application
   * @param metadataScanner Utility to scan class prototypes for methods
   * @param reflector Utility to extract metadata from decorators
   */
  constructor(
    private readonly modulesContainer: ModulesContainer,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
  ) {}

  /**
   * Generic method to explore and discover methods decorated with a specific metadata key.
   * Scans all modules and their providers for methods that have the specified metadata.
   *
   * @template T The type of options expected in the metadata
   * @param metadataKey The key identifying the decorator metadata to look for
   * @returns An array of discovered items matching the metadata key
   */
  explore<T = any>(metadataKey: string): DiscoveredItem<T>[] {
    const modules = [...this.modulesContainer.values()];
    const components = modules
      .flatMap((module) => [...module.providers.values()])
      .filter((wrapper) => wrapper.instance);

    const discovered: DiscoveredItem<T>[] = [];

    components.forEach((wrapper: InstanceWrapper) => {
      const { instance } = wrapper;
      if (!instance || typeof instance !== 'object' || !instance.constructor) {
        return;
      }

      const prototype = Object.getPrototypeOf(instance);
      const methodNames = this.metadataScanner.getAllMethodNames(prototype);

      methodNames.forEach((methodName) => {
        const handler = instance[methodName];
        if (!handler) {
          return;
        }

        const metadata = this.reflector.get<IMetadataBase>(
          metadataKey,
          handler,
        );

        if (metadata) {
          discovered.push({
            instance,
            handler: handler.bind(instance),
            metadata: metadata as DiscoveredItem<T>['metadata'],
          });
        }
      });
    });

    return discovered;
  }

  /**
   * Discovers all methods decorated with @URIResource, or @TemplateResource.
   * These methods represent resources that the MCP server can expose.
   *
   * @returns An array of discovered resource handlers with their metadata
   */
  exploreResources(): DiscoveredItem<ResourceOptions>[] {
    return this.explore<ResourceOptions>(MCP_RESOURCE_METADATA);
  }

  /**
   * Discovers all methods decorated with @Tool.
   * These methods represent tools that the MCP server can expose.
   *
   * @returns An array of discovered tool handlers with their metadata
   */
  exploreTools(): DiscoveredItem<PromptType>[] {
    return this.explore<PromptType>(MCP_TOOL_METADATA);
  }

  /**
   * Discovers all methods decorated with @Prompt.
   * These methods represent prompts that the MCP server can expose.
   *
   * @returns An array of discovered prompt handlers with their metadata
   */
  explorePrompts(): DiscoveredItem<ToolOptions>[] {
    return this.explore<ToolOptions>(MCP_PROMPT_METADATA);
  }
}

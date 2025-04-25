import { SetMetadata } from "@nestjs/common";
import { IMetadataBase } from "../interfaces/metadata-base.interface";

/**
 * Helper function to create MCP decorators.
 * It applies metadata to the target method using the provided key.
 *
 * @param metadataKey The key under which to store the metadata.
 * @param options Additional options specific to the decorator.
 */
export const createMcpDecorator = <T = any>(
  metadataKey: string,
  options?: T
): MethodDecorator => {
  return (
    target: object,
    key: string | symbol,
    descriptor: PropertyDescriptor
  ) => {
    const metadata: IMetadataBase = {
      methodName: key as string,
      options,
    };
    SetMetadata(metadataKey, metadata)(target, key, descriptor);
  };
};

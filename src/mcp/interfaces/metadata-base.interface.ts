/**
 * Base interface for metadata stored by decorators.
 */
export interface IMetadataBase {
  /**
   * The name of the decorated method.
   */
  methodName: string;
  /**
   * Additional options specific to the decorator (e.g., resource name, tool schema).
   */
  options?: any;
}

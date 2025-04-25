import { ConsoleLogger, LogLevel } from "@nestjs/common";

/**
 * A custom NestJS logger that forces all output to stderr.
 * This is useful for CLI applications or scenarios like MCP over stdio
 * where stdout must be reserved for specific protocol communication.
 */
export class StderrLogger extends ConsoleLogger {
  /**
   * Overrides the default printMessages to force output to stderr.
   * Based on the internal implementation of ConsoleLogger's printMessages.
   */
  protected printMessages(
    messages: unknown[],
    context = "",
    logLevel: LogLevel = "log",
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    writeStreamType?: "stdout" | "stderr"
  ) {
    messages.forEach((message) => {
      const pidMessage = this.formatPid(process.pid);
      const contextMessage = this.formatContext(context);
      const timestampDiff = this.updateAndGetTimestampDiff();
      const formattedLogLevel = logLevel.toUpperCase().padStart(7, " ");
      const formattedMessage = this.formatMessage(
        logLevel,
        message,
        pidMessage,
        formattedLogLevel,
        contextMessage,
        timestampDiff
      );

      // *** Force output to stderr ***
      process.stderr.write(formattedMessage);
    });
  }

  log(message: any, context?: string): void;
  log(message: any, ...optionalParams: [...any, string?]): void;
  log(message: any, ...optionalParams: any[]) {
    super.log(message, ...optionalParams);
  }

  error(message: any, stack?: string, context?: string): void;
  error(message: any, ...optionalParams: [...any, string?, string?]): void;
  error(message: any, ...optionalParams: any[]) {
    super.error(message, ...optionalParams);
  }

  warn(message: any, context?: string): void;
  warn(message: any, ...optionalParams: [...any, string?]): void;
  warn(message: any, ...optionalParams: any[]) {
    super.warn(message, ...optionalParams);
  }

  debug(message: any, context?: string): void;
  debug(message: any, ...optionalParams: [...any, string?]): void;
  debug(message: any, ...optionalParams: any[]) {
    super.debug(message, ...optionalParams);
  }

  verbose(message: any, context?: string): void;
  verbose(message: any, ...optionalParams: [...any, string?]): void;
  verbose(message: any, ...optionalParams: any[]) {
    super.verbose(message, ...optionalParams);
  }
}

/**
 * Domain Service Interface: Logger
 *
 * Abstraction for logging to respect Dependency Inversion Principle.
 * Domain layer depends on this abstraction, infrastructure provides implementation.
 */

export interface ILogger {
  /**
   * Log debug message
   */
  debug(message: string, ...args: any[]): void;

  /**
   * Log informational message
   */
  info(message: string, ...args: any[]): void;

  /**
   * Log warning message
   */
  warn(message: string, ...args: any[]): void;

  /**
   * Log error message
   */
  error(message: string, ...args: any[]): void;

  /**
   * Log section header
   */
  section(title: string): void;

  /**
   * Log subsection header
   */
  subsection(title: string): void;
}

/**
 * Logger Utility
 *
 * Centralized logging system for the layout engine.
 * Allows enabling/disabling debug output globally.
 *
 * Implements ILogger interface from domain layer to respect DIP.
 */

import { ILogger } from '../../domain/services/ILogger';

export class Logger implements ILogger {
  private static debugEnabled: boolean = false;
  private static instance: Logger;

  /**
   * Get singleton instance
   */
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Enable or disable debug logging globally
   */
  static setDebugEnabled(enabled: boolean): void {
    Logger.debugEnabled = enabled;
  }

  /**
   * Check if debug logging is enabled
   */
  static isDebugEnabled(): boolean {
    return Logger.debugEnabled;
  }

  /**
   * Log a debug message (only if debug is enabled)
   */
  debug(message: string, ...args: any[]): void {
    if (Logger.debugEnabled) {
      console.log(message, ...args);
    }
  }

  /**
   * Log an info message (always shown)
   */
  info(message: string, ...args: any[]): void {
    console.log(message, ...args);
  }

  /**
   * Log a warning message (always shown)
   */
  warn(message: string, ...args: any[]): void {
    console.warn(message, ...args);
  }

  /**
   * Log an error message (always shown)
   */
  error(message: string, ...args: any[]): void {
    console.error(message, ...args);
  }

  /**
   * Log a separator line (only if debug is enabled)
   */
  separator(char: string = '=', length: number = 80): void {
    if (Logger.debugEnabled) {
      console.log(char.repeat(length));
    }
  }

  /**
   * Log a section header (only if debug is enabled)
   */
  section(title: string): void {
    if (Logger.debugEnabled) {
      console.log('\n' + '='.repeat(80));
      console.log(title);
      console.log('='.repeat(80));
    }
  }

  /**
   * Log a subsection header (only if debug is enabled)
   */
  subsection(title: string): void {
    if (Logger.debugEnabled) {
      console.log(`\n--- ${title} ---`);
    }
  }

  // Legacy static methods for backward compatibility
  static debug(...args: any[]): void {
    Logger.getInstance().debug(args.join(' '));
  }

  static info(...args: any[]): void {
    Logger.getInstance().info(args.join(' '));
  }

  static warn(...args: any[]): void {
    Logger.getInstance().warn(args.join(' '));
  }

  static error(...args: any[]): void {
    Logger.getInstance().error(args.join(' '));
  }

  static section(title: string): void {
    Logger.getInstance().section(title);
  }

  static subsection(title: string): void {
    Logger.getInstance().subsection(title);
  }
}

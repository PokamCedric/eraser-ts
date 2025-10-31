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
  static debug(...args: any[]): void {
    if (Logger.debugEnabled) {
      console.log(...args);
    }
  }

  /**
   * Log an info message (always shown)
   */
  static info(...args: any[]): void {
    console.log(...args);
  }

  /**
   * Log a warning message (always shown)
   */
  static warn(...args: any[]): void {
    console.warn(...args);
  }

  /**
   * Log an error message (always shown)
   */
  static error(...args: any[]): void {
    console.error(...args);
  }

  /**
   * Log a separator line (only if debug is enabled)
   */
  static separator(char: string = '=', length: number = 80): void {
    if (Logger.debugEnabled) {
      console.log(char.repeat(length));
    }
  }

  /**
   * Log a section header (only if debug is enabled)
   */
  static section(title: string): void {
    if (Logger.debugEnabled) {
      console.log('\n' + '='.repeat(80));
      console.log(title);
      console.log('='.repeat(80));
    }
  }

  /**
   * Log a subsection header (only if debug is enabled)
   */
  static subsection(title: string): void {
    if (Logger.debugEnabled) {
      console.log(`\n--- ${title} ---`);
    }
  }
}

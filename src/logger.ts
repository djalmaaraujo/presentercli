/**
 * Logging system
 * Writes logs to debug-presenter.log for analysis
 */

import * as fs from 'fs';
import * as path from 'path';

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export class Logger {
  private static instance: Logger;
  private logFile: string;

  private constructor() {
    this.logFile = path.join(process.cwd(), 'debug-presenter.log');
    this.initLogFile();
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private initLogFile(): void {
    // Create or truncate log file
    try {
      fs.writeFileSync(this.logFile, `=== Debug Presenter Log ===\nStarted: ${new Date().toISOString()}\n\n`);
    } catch (error) {
      // Silently fail if can't create log file
    }
  }

  private writeLog(level: LogLevel, message: string, context?: any): void {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | ${JSON.stringify(context)}` : '';
    const logLine = `[${timestamp}] [${level}] ${message}${contextStr}\n`;

    // Write to file synchronously for reliability
    try {
      fs.appendFileSync(this.logFile, logLine);
    } catch (error) {
      // Silently fail if can't write to log
    }

    // Also write errors to console in development
    if (level === 'ERROR' && process.env.DEBUG) {
      console.error(`[${level}] ${message}`, context || '');
    }
  }

  info(message: string, context?: any): void {
    this.writeLog('INFO', message, context);
  }

  warn(message: string, context?: any): void {
    this.writeLog('WARN', message, context);
  }

  error(message: string, context?: any): void {
    this.writeLog('ERROR', message, context);
  }

  debug(message: string, context?: any): void {
    this.writeLog('DEBUG', message, context);
  }

  close(): void {
    // No-op since we use synchronous writes now
  }
}

// Export singleton instance
export const logger = Logger.getInstance();
